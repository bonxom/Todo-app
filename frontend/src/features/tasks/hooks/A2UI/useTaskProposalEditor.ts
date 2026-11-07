import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ProposalAction,
  ProposalItem,
  ProposalView,
} from "@/shared/types/A2UI/taskProposal";
import { categoryService } from "@/shared/services/categoryService";
import { projectService } from "@/shared/services/projectService";
import type { Category, Project } from "@/shared/types/domain";
import { generateUUID } from "@/shared/utils/id";

export type TaskProposalEditorProps = {
  proposal: ProposalView;
  draft?: ProposalView;
  onChange?: (draft: ProposalView) => void;
  onAction?: (action: ProposalAction) => Promise<unknown>;
  onDirtyChange?: (dirty: boolean) => void;
  onOpenTask?: (id: string) => void;
  disabled?: boolean;
};

export function isMatchingProposalDraft(
  draft: ProposalView | undefined,
  proposal: ProposalView | undefined,
): draft is ProposalView {
  return Boolean(
    draft &&
    proposal &&
    proposal.status === "draft" &&
    draft.id === proposal.id &&
    draft.revision === proposal.revision &&
    draft.status === proposal.status,
  );
}

export function useTaskProposalEditor(
  {
    proposal,
    draft: controlledDraft,
    onChange,
    onAction,
    onDirtyChange,
    onOpenTask,
    disabled,
  }: TaskProposalEditorProps,
  enabled = true,
) {
  const validControlledDraft = isMatchingProposalDraft(
    controlledDraft,
    proposal,
  )
    ? controlledDraft
    : undefined;

  const [localDraft, setLocalDraft] = useState<ProposalView>(
    () => validControlledDraft ?? proposal,
  );
  const prevBaselineKeyRef = useRef(
    `${proposal?.id}:${proposal?.revision}:${proposal?.status}`,
  );
  const prevProposalRef = useRef(proposal);
  const hadControlledDraftRef = useRef(Boolean(validControlledDraft));

  useEffect(() => {
    const baselineKey = `${proposal?.id}:${proposal?.revision}:${proposal?.status}`;
    const proposalChanged = prevProposalRef.current !== proposal;
    prevProposalRef.current = proposal;
    const hasControlledDraft = Boolean(validControlledDraft);

    if (prevBaselineKeyRef.current !== baselineKey) {
      prevBaselineKeyRef.current = baselineKey;
      hadControlledDraftRef.current = hasControlledDraft;
      setLocalDraft(validControlledDraft ?? proposal);
      setError("");
    } else if (validControlledDraft) {
      hadControlledDraftRef.current = true;
      setLocalDraft(validControlledDraft);
    } else if (hadControlledDraftRef.current || proposalChanged) {
      hadControlledDraftRef.current = false;
      setLocalDraft(proposal);
      setError("");
    }
  }, [validControlledDraft, proposal]);

  const draft =
    validControlledDraft ??
    (isMatchingProposalDraft(localDraft, proposal) ? localDraft : proposal);

  const setDraft = useCallback(
    (nextDraft: ProposalView) => {
      setLocalDraft(nextDraft);
      onChange?.(nextDraft);
    },
    [onChange],
  );

  const [choices, setChoices] = useState<{
    categories: Category[];
    projects: Project[];
    loaded: boolean;
  }>({ categories: [], projects: [], loaded: false });
  const [choiceError, setChoiceError] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const busy = useRef(false);
  const terminal = proposal?.status !== "draft";
  const locked = terminal || Boolean(disabled) || submitting;
  const draftItems = Array.isArray(draft?.items) ? draft.items : [];
  const draftSelectedIds = Array.isArray(draft?.selectedItemIds)
    ? draft.selectedItemIds
    : [];
  const proposalItems = Array.isArray(proposal?.items) ? proposal.items : [];
  const proposalSelectedIds = Array.isArray(proposal?.selectedItemIds)
    ? proposal.selectedItemIds
    : [];

  const dirty =
    !terminal &&
    JSON.stringify({
      items: draftItems,
      selected: [...draftSelectedIds].sort(),
    }) !==
      JSON.stringify({
        items: proposalItems,
        selected: [...proposalSelectedIds].sort(),
      });

  useEffect(() => {
    if (!enabled) return;
    onDirtyChange?.(dirty);
  }, [dirty, enabled, onDirtyChange]);

  useEffect(() => {
    if (!enabled || terminal) return;
    let active = true;
    Promise.all([
      categoryService.getAllCategories(),
      projectService.getAllProjects(),
    ])
      .then(([categories, projects]) => {
        if (active) setChoices({ categories, projects, loaded: true });
      })
      .catch(() => {
        if (active)
          setChoiceError(
            "Không thể tải danh mục và dự án. Hãy tải lại đề xuất.",
          );
      });
    return () => {
      active = false;
    };
  }, [enabled, terminal]);

  const validation = draftItems.map((item) => {
    if (!item.title.trim() || item.title.length > 200)
      return "Tiêu đề cần từ 1 đến 200 ký tự.";
    if ((item.description?.length ?? 0) > 1000)
      return "Mô tả tối đa 1000 ký tự.";
    if (
      item.startDate &&
      item.dueDate &&
      new Date(item.startDate) > new Date(item.dueDate)
    )
      return "Ngày bắt đầu phải trước hạn hoàn thành.";
    if (
      choices.loaded &&
      item.categoryId &&
      !choices.categories.some((category) => category._id === item.categoryId)
    )
      return "Danh mục không còn khả dụng. Hãy chọn lại.";
    if (
      choices.loaded &&
      item.projectId &&
      !choices.projects.some(
        (project) =>
          project._id === item.projectId && project.status !== "completed",
      )
    )
      return "Dự án không còn nhận công việc. Hãy chọn lại.";
    return "";
  });

  const invalid =
    validation.some(Boolean) ||
    Boolean(choiceError) ||
    (!terminal && !choices.loaded);

  const updateItem = (id: string, changes: Partial<ProposalItem>) => {
    if (!locked) {
      setDraft({
        ...draft,
        items: draftItems.map((item) =>
          item.id === id ? { ...item, ...changes } : item,
        ),
      });
    }
  };

  const toggleItemSelection = (id: string) => {
    if (!locked) {
      setDraft({
        ...draft,
        selectedItemIds: draftSelectedIds.includes(id)
          ? draftSelectedIds.filter((selectedId) => selectedId !== id)
          : [...draftSelectedIds, id],
      });
    }
  };

  const submit = async (
    action: "save" | "confirm" | "cancel",
    customDispatch?: (actionPayload: ProposalAction) => Promise<unknown>,
  ) => {
    if (
      locked ||
      busy.current ||
      (action !== "cancel" && invalid) ||
      (action === "confirm" && !draftSelectedIds.length)
    )
      return;
    busy.current = true;
    setSubmitting(true);
    setError("");
    const base = { requestId: generateUUID(), revision: proposal.revision };
    const payload: ProposalAction =
      action === "cancel"
        ? { ...base, action }
        : {
            ...base,
            action,
            items: draftItems,
            selectedItemIds: draftSelectedIds,
          };
    try {
      const handler = customDispatch ?? onAction;
      if (!handler) {
        throw new Error("Thao tác hiện không khả dụng.");
      }
      await handler(payload);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Không thể lưu. Hãy thử lại.",
      );
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };

  return {
    proposal,
    draft,
    setDraft,
    onChange: setDraft,
    onAction,
    onDirtyChange,
    onOpenTask,
    disabled,
    choices,
    choiceError,
    error,
    setError,
    submitting,
    terminal,
    locked,
    dirty,
    validation,
    invalid,
    updateItem,
    toggleItemSelection,
    submit,
  };
}
