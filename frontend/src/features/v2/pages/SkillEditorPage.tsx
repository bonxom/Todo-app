import { useRef, useState } from "react";
import {
  useBeforeUnload,
  useBlocker,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Eye,
  FileText,
  Loader2,
  PencilLine,
  Save,
  Trash2,
} from "lucide-react";
import {
  currentSessionKey,
  useCreateSkillMutation,
  useDeleteSkillMutation,
  useSessionKey,
  useSkill,
  useUpdateSkillMutation,
} from "@/features/agent/skills/useSkillQueries";
import type { SkillDetail } from "@/shared/types/skill";
import { ApiError } from "@/shared/services/apiError";
import MarkdownText from "@/features/tasks/components/chat/MarkdownText";
import V2AgentTabs from "../components/V2AgentTabs";
import V2Dialog from "../components/V2Dialog";

const LIMITS = { name: 80, description: 500, instructions: 10000 };

interface SkillFormState {
  name: string;
  description: string;
  instructions: string;
  enabled: boolean;
}

const EMPTY_FORM: SkillFormState = {
  name: "",
  description: "",
  instructions: "",
  enabled: true,
};

export default function SkillEditorPage() {
  const { t } = useTranslation("v2");
  const { t: tAgent } = useTranslation("agent");
  const { skillId } = useParams<{ skillId?: string }>();
  const isNew = !skillId || skillId === "new";
  const { data, isLoading, error, refetch } = useSkill(
    isNew ? undefined : skillId,
  );

  if (isNew) {
    return (
      <SkillEditorShell
        isNew
        initialSkill={null}
        heading={tAgent("createNewSkill")}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="v2-skills flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <V2AgentTabs />
        </div>
        <div
          className="v2-glass-panel flex flex-col items-center justify-center gap-3 p-10 text-sm text-[var(--v2-muted)] text-center"
          role="status"
        >
          <Loader2
            size={20}
            className="v2-spin animate-[v2-spin_900ms_linear_infinite] [@media(prefers-reduced-motion:reduce)]:animate-none"
            aria-hidden="true"
          />
          <span>{tAgent("loadingSkills")}</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="v2-skills flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <V2AgentTabs />
        </div>
        <div
          className="v2-glass-panel flex flex-col items-center justify-center gap-3 p-10 text-sm text-[var(--v2-muted)] text-center"
          role="alert"
        >
          <p className="m-0">
            {error instanceof Error
              ? error.message
              : tAgent("anErrorOccurredWhileSavingTheSkill")}
          </p>
          <button
            type="button"
            className="v2-btn"
            onClick={() => void refetch()}
          >
            {t("retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <SkillEditorShell
      key={data.id}
      isNew={false}
      initialSkill={data}
      heading={tAgent("editSkill")}
    />
  );
}

interface SkillEditorShellProps {
  isNew: boolean;
  initialSkill: SkillDetail | null;
  heading: string;
}

function SkillEditorShell({
  isNew,
  initialSkill,
  heading,
}: SkillEditorShellProps) {
  const { t } = useTranslation("v2");
  const { t: tAgent } = useTranslation("agent");
  const navigate = useNavigate();
  const sessionKey = useSessionKey();
  const isCurrent = () => currentSessionKey() === sessionKey;
  const bypass = useRef(false);

  const [baseline, setBaseline] = useState<SkillDetail | null>(initialSkill);
  const [form, setForm] = useState<SkillFormState>(
    initialSkill
      ? {
          name: initialSkill.name,
          description: initialSkill.description,
          instructions: initialSkill.instructions,
          enabled: initialSkill.enabled,
        }
      : EMPTY_FORM,
  );
  const [preview, setPreview] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isDirty = isNew
    ? Boolean(
        form.name.trim() || form.description.trim() || form.instructions.trim(),
      )
    : Boolean(
        baseline &&
        (form.name !== baseline.name ||
          form.description !== baseline.description ||
          form.instructions !== baseline.instructions ||
          form.enabled !== baseline.enabled),
      );

  const blocker = useBlocker(() => isCurrent() && isDirty && !bypass.current);
  useBeforeUnload((event) => {
    if (isDirty && !bypass.current) {
      event.preventDefault();
      event.returnValue = "";
    }
  });

  const isValid =
    form.name.trim().length >= 1 &&
    form.name.trim().length <= LIMITS.name &&
    form.description.trim().length >= 1 &&
    form.description.trim().length <= LIMITS.description &&
    form.instructions.trim().length >= 1 &&
    form.instructions.trim().length <= LIMITS.instructions;

  const createMutation = useCreateSkillMutation();
  const updateMutation = useUpdateSkillMutation();
  const deleteMutation = useDeleteSkillMutation();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const draftStatusLabel = isSaving
    ? tAgent("saving")
    : isDirty
      ? tAgent("unsavedChanges")
      : isNew
        ? tAgent("newDraft")
        : tAgent("saved");

  const handleSave = async () => {
    if (!isValid || isSaving || deleteMutation.isPending) return;
    setConflictError(null);
    setGeneralError(null);
    try {
      if (isNew) {
        const created = await createMutation.mutateAsync({
          name: form.name.trim(),
          description: form.description.trim(),
          instructions: form.instructions.trim(),
          enabled: form.enabled,
        });
        if (!isCurrent()) return;
        bypass.current = true;
        navigate(`/v2/agents/skills/${created.id}`, { replace: true });
        return;
      }
      if (!baseline) return;
      const updated = await updateMutation.mutateAsync({
        id: baseline.id,
        input: {
          expectedVersion: baseline.version,
          name: form.name.trim(),
          description: form.description.trim(),
          instructions: form.instructions.trim(),
          enabled: form.enabled,
        },
      });
      if (!isCurrent()) return;
      setBaseline(updated);
      setForm({
        name: updated.name,
        description: updated.description,
        instructions: updated.instructions,
        enabled: updated.enabled,
      });
    } catch (err) {
      if (!isCurrent()) return;
      if (err instanceof ApiError && err.status === 409) {
        setConflictError(
          tAgent("skillVersionHasChangedOnTheServerByAnotherSession"),
        );
      } else {
        setGeneralError(
          err instanceof Error
            ? err.message
            : tAgent("anErrorOccurredWhileSavingTheSkill"),
        );
      }
    }
  };

  const handleDelete = async () => {
    if (!baseline || isSaving || deleteMutation.isPending) return;
    try {
      await deleteMutation.mutateAsync({
        id: baseline.id,
        expectedVersion: baseline.version,
      });
      if (!isCurrent()) return;
      bypass.current = true;
      setDeleteOpen(false);
      navigate("/v2/agents/skills", { replace: true });
    } catch (err) {
      if (!isCurrent()) return;
      setDeleteOpen(false);
      if (err instanceof ApiError && err.status === 409)
        setConflictError(
          tAgent("skillVersionHasChangedOnTheServerByAnotherSession"),
        );
      setGeneralError(
        err instanceof Error ? err.message : tAgent("unableToDeleteSkill"),
      );
    }
  };

  return (
    <div
      className="v2-skill-editor flex flex-col gap-5 min-w-0"
      data-testid="v2-skill-editor"
    >
      <h1 className="sr-only">{heading}</h1>

      {/* Unified V2 Action Bar — matches SkillsPage header rhythm */}
      <header className="v2-page-actions v2-skills-header flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 max-sm:w-full">
          <V2AgentTabs />
          <button
            type="button"
            className="v2-btn min-h-[44px] rounded-[var(--v2-radius-pill)] px-3.5 text-xs sm:text-[13px] whitespace-nowrap"
            onClick={() => navigate("/v2/agents/skills")}
          >
            <ArrowLeft size={15} aria-hidden="true" />
            <span>{tAgent("backToSkills")}</span>
          </button>
        </div>

        <div className="v2-agents-heading-actions flex flex-wrap items-center justify-between sm:justify-end gap-2.5 max-sm:w-full">
          <span
            className="inline-flex items-center gap-2 rounded-full border border-[var(--v2-border)] bg-[var(--v2-shell-fill)] px-3 py-1.5 text-xs font-medium text-[var(--v2-muted)]"
            aria-live="polite"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isDirty
                  ? "bg-[var(--v2-warning)]"
                  : isNew
                    ? "bg-[var(--v2-muted)]"
                    : "bg-[var(--v2-success)]"
              }`}
              aria-hidden="true"
            />
            <span>{draftStatusLabel}</span>
          </span>

          {!isNew && baseline && (
            <button
              type="button"
              className="v2-btn"
              onClick={() => setDeleteOpen(true)}
              disabled={isSaving || deleteMutation.isPending}
            >
              <Trash2 size={15} aria-hidden="true" />
              <span>{tAgent("deleteSkill")}</span>
            </button>
          )}

          <button
            type="button"
            className="v2-btn v2-btn-primary [&:hover]:filter-[brightness(1.06)]"
            onClick={() => void handleSave()}
            disabled={!isValid || isSaving || deleteMutation.isPending}
          >
            {isSaving ? (
              <Loader2
                size={15}
                className="v2-spin animate-[v2-spin_900ms_linear_infinite] [@media(prefers-reduced-motion:reduce)]:animate-none"
                aria-hidden="true"
              />
            ) : (
              <Save size={15} aria-hidden="true" />
            )}
            <span>{isSaving ? t("savingSkill") : t("saveSkill")}</span>
          </button>
        </div>
      </header>

      {(conflictError || generalError) && (
        <div
          className="rounded-[16px] border border-[rgb(190_68_62_/_35%)] bg-[rgb(190_68_62_/_12%)] px-4 py-3 text-sm font-medium text-[var(--v2-ink)]"
          role="alert"
        >
          {conflictError || generalError}
        </div>
      )}

      {/* Two-Column Liquid Glass Workspace */}
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
        {/* Left Panel: Skill Identity & Availability */}
        <section className="v2-glass-panel flex min-w-0 flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--v2-border)] pb-4">
            <div className="min-w-0 space-y-1">
              <h2 className="m-0 [font-family:var(--v2-font-heading)] text-lg font-semibold tracking-tight text-[var(--v2-ink)]">
                {heading}
              </h2>
              <p className="m-0 text-xs sm:text-sm leading-relaxed text-[var(--v2-muted)]">
                {tAgent("helpsAgentKnowWhenToUseThisSkill")}
              </p>
            </div>
            {!isNew && baseline && (
              <span className="shrink-0 rounded-full border border-[var(--v2-border)] bg-[var(--v2-shell-fill)] px-2.5 py-1 text-xs font-semibold tabular-nums text-[var(--v2-muted)]">
                v{baseline.version}
              </span>
            )}
          </div>

          {/* Skill Name */}
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <label
                htmlFor="v2-skill-name"
                className="text-sm font-semibold text-[var(--v2-ink)]"
              >
                {t("skillName")}
              </label>
              <span className="text-xs tabular-nums text-[var(--v2-muted)]">
                {form.name.length} / {LIMITS.name}
              </span>
            </div>
            <input
              id="v2-skill-name"
              type="text"
              className="v2-input [&:focus]:[outline:2px_solid_var(--v2-accent)] [&:focus]:outline-offset-[2px]"
              aria-label={t("skillName")}
              placeholder={tAgent("eGIeltsWriting")}
              value={form.name}
              maxLength={LIMITS.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <label
                htmlFor="v2-skill-description"
                className="text-sm font-semibold text-[var(--v2-ink)]"
              >
                {t("skillDescription")}
              </label>
              <span className="text-xs tabular-nums text-[var(--v2-muted)]">
                {form.description.length} / {LIMITS.description}
              </span>
            </div>
            <textarea
              id="v2-skill-description"
              rows={4}
              className="min-h-[112px] w-full resize-y rounded-[12px] border border-[var(--v2-border)] bg-[var(--v2-input-fill)] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-[var(--v2-ink)] placeholder:text-[var(--v2-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-accent)]"
              aria-label={t("skillDescription")}
              placeholder={tAgent(
                "eGWhenINeedFeedbackAndImprovementSuggestionsOnIeltsTask2Writing",
              )}
              value={form.description}
              maxLength={LIMITS.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
            <p className="m-0 text-xs leading-relaxed text-[var(--v2-muted)]">
              {tAgent("whenShouldAgentUseThisGuidance")}
            </p>
          </div>

          {/* Enable Skill Toggle Row */}
          <div className="flex items-center justify-between gap-4 border-t border-[var(--v2-border)] pt-4">
            <div className="min-w-0 space-y-0.5">
              <label
                htmlFor="v2-skill-enabled"
                className="block cursor-pointer text-sm font-semibold text-[var(--v2-ink)]"
              >
                {tAgent("enableSkill")}
              </label>
              <p className="m-0 text-xs leading-relaxed text-[var(--v2-muted)]">
                {form.enabled
                  ? tAgent("readyForYourNextConversation")
                  : tAgent("agentWillNotReadThisSkill")}
              </p>
            </div>
            <button
              id="v2-skill-enabled"
              type="button"
              role="switch"
              aria-checked={form.enabled}
              aria-label={tAgent("enableSkill")}
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  enabled: !current.enabled,
                }))
              }
              className="inline-flex min-h-[44px] min-w-[52px] shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-1"
            >
              <span
                className={`relative inline-flex h-7 w-12 items-center rounded-full border p-0.5 transition-colors duration-150 ${
                  form.enabled
                    ? "border-transparent bg-[var(--v2-accent)]"
                    : "border-[var(--v2-border)] bg-[var(--v2-input-fill)]"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full shadow-sm transition-transform duration-150 ${
                    form.enabled
                      ? "translate-x-5 bg-[var(--v2-accent-ink)]"
                      : "translate-x-0 bg-[var(--v2-muted)]"
                  }`}
                />
              </span>
            </button>
          </div>
        </section>

        {/* Right Panel: Markdown Instructions Editor */}
        <section className="v2-glass-panel flex min-w-0 flex-col gap-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--v2-border)] pb-4">
            <div className="min-w-0 space-y-0.5">
              <label
                htmlFor="v2-skill-instructions"
                className="block [font-family:var(--v2-font-heading)] text-base sm:text-lg font-semibold tracking-tight text-[var(--v2-ink)]"
              >
                {t("skillInstructions")}
              </label>
              <p className="m-0 text-xs sm:text-sm leading-relaxed text-[var(--v2-muted)]">
                {tAgent("agentWillFollowTheseInstructionsWhenReadingTheSkill")}
              </p>
            </div>

            <div
              role="group"
              aria-label={tAgent("editorMode")}
              className="inline-flex items-center gap-1 rounded-[14px] border border-[var(--v2-border)] bg-[var(--v2-shell-fill)] p-1"
            >
              <button
                type="button"
                aria-pressed={!preview}
                onClick={() => setPreview(false)}
                className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-[10px] border-0 px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors duration-150 ${
                  !preview
                    ? "bg-[var(--v2-accent)] !text-[var(--v2-accent-ink)] shadow-xs"
                    : "bg-transparent !text-[var(--v2-ink)] hover:bg-[var(--v2-input-fill)]"
                }`}
              >
                <PencilLine size={14} aria-hidden="true" />
                <span>{tAgent("edit")}</span>
              </button>
              <button
                type="button"
                aria-pressed={preview}
                onClick={() => setPreview(true)}
                className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-[10px] border-0 px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors duration-150 ${
                  preview
                    ? "bg-[var(--v2-accent)] !text-[var(--v2-accent-ink)] shadow-xs"
                    : "bg-transparent !text-[var(--v2-ink)] hover:bg-[var(--v2-input-fill)]"
                }`}
              >
                <Eye size={14} aria-hidden="true" />
                <span>{tAgent("preview")}</span>
              </button>
            </div>
          </div>

          {preview ? (
            form.instructions.trim() ? (
              <div className="min-h-[280px] sm:min-h-[360px] lg:min-h-[400px] overflow-auto rounded-[16px] border border-[var(--v2-border)] bg-[var(--v2-input-fill)] p-5 text-sm leading-relaxed text-[var(--v2-ink)]">
                <MarkdownText text={form.instructions} />
              </div>
            ) : (
              <div className="flex min-h-[280px] sm:min-h-[360px] lg:min-h-[400px] flex-col items-center justify-center gap-2 rounded-[16px] border border-dashed border-[var(--v2-border)] bg-[var(--v2-shell-fill)] p-8 text-center">
                <FileText
                  size={24}
                  className="text-[var(--v2-muted)] opacity-70"
                  aria-hidden="true"
                />
                <p className="m-0 max-w-[34ch] text-sm text-[var(--v2-muted)]">
                  {tAgent("previewContentWillAppearOnceYouAddInstructions")}
                </p>
              </div>
            )
          ) : (
            <textarea
              id="v2-skill-instructions"
              rows={14}
              className="min-h-[280px] sm:min-h-[360px] lg:min-h-[400px] w-full resize-y rounded-[16px] border border-[var(--v2-border)] bg-[var(--v2-input-fill)] p-4 [font-family:var(--font-mono)] text-[13.5px] leading-relaxed text-[var(--v2-ink)] placeholder:text-[var(--v2-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-accent)]"
              aria-label={t("skillInstructions")}
              placeholder={tAgent(
                "describeHowYouWantAgentToAssistForExamplePreserveOriginalMeaningWhenEditingBrieflyExplainEachChangeConcludeWithAnActionablePracticePrompt",
              )}
              value={form.instructions}
              maxLength={LIMITS.instructions}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  instructions: event.target.value,
                }))
              }
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--v2-muted)]">
            <span>
              {tAgent("markdownSupported")} ·{" "}
              {tAgent("changesApplyFromTheNextChatTurn")}
            </span>
            <span className="tabular-nums font-medium">
              {form.instructions.length.toLocaleString()}{" "}
              {tAgent("10000Characters")}
            </span>
          </div>
        </section>
      </div>

      <V2Dialog
        open={blocker.state === "blocked"}
        title={tAgent("discardUnsavedChanges")}
        onClose={() => blocker.reset?.()}
      >
        <p>{tAgent("discardUnsavedChanges")}</p>
        <div className="v2-form-actions flex flex-wrap justify-end gap-[10px] [border-top:1px_solid_var(--v2-border)] pt-[18px]">
          <button
            type="button"
            className="v2-btn"
            onClick={() => blocker.reset?.()}
          >
            {tAgent("keepEditing")}
          </button>
          <button
            type="button"
            className="v2-btn v2-btn-primary [&:hover]:filter-[brightness(1.06)]"
            onClick={() => blocker.proceed?.()}
          >
            {tAgent("discardChanges")}
          </button>
        </div>
      </V2Dialog>

      <V2Dialog
        open={deleteOpen}
        title={tAgent("deleteSkill")}
        onClose={() => setDeleteOpen(false)}
      >
        <p>{tAgent("confirmSkillDeletion")}</p>
        <div className="v2-form-actions flex flex-wrap justify-end gap-[10px] [border-top:1px_solid_var(--v2-border)] pt-[18px]">
          <button
            type="button"
            className="v2-btn"
            onClick={() => setDeleteOpen(false)}
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            className="v2-btn v2-btn-primary [&:hover]:filter-[brightness(1.06)]"
            onClick={() => void handleDelete()}
            disabled={deleteMutation.isPending}
          >
            {tAgent("deleteThisSkill")}
          </button>
        </div>
      </V2Dialog>
    </div>
  );
}
