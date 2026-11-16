import { useRef, useState } from "react";
import {
  useBeforeUnload,
  useBlocker,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
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
      <SkillEditorShell isNew initialSkill={null} heading={tAgent("createNewSkill")} />
    );
  }

  if (isLoading) {
    return (
      <div className="v2-skills">
        <V2AgentTabs />
        <p className="v2-skills-status" role="status">
          <Loader2 size={18} className="v2-spin" aria-hidden="true" />
          {tAgent("loadingSkills")}
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="v2-skills">
        <V2AgentTabs />
        <div className="v2-skills-status" role="alert">
          <p>
            {error instanceof Error
              ? error.message
              : tAgent("anErrorOccurredWhileSavingTheSkill")}
          </p>
          <button type="button" className="v2-btn" onClick={() => void refetch()}>
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

function SkillEditorShell({ isNew, initialSkill, heading }: SkillEditorShellProps) {
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
    <div className="v2-skills v2-skill-editor" data-testid="v2-skill-editor">
      <header className="v2-agents-heading">
        <div>
          <button
            type="button"
            className="v2-btn v2-skill-back"
            onClick={() => navigate("/v2/agents/skills")}
          >
            <ArrowLeft size={15} aria-hidden="true" />
            <span>{tAgent("backToSkills")}</span>
          </button>
          <h1>{heading}</h1>
        </div>
        <div className="v2-agents-heading-actions">
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
            className="v2-btn v2-btn-primary"
            onClick={() => void handleSave()}
            disabled={!isValid || isSaving || deleteMutation.isPending}
          >
            {isSaving && (
              <Loader2 size={15} className="v2-spin" aria-hidden="true" />
            )}
            <span>{isSaving ? t("savingSkill") : t("saveSkill")}</span>
          </button>
        </div>
      </header>

      <V2AgentTabs />

      {conflictError && (
        <p className="v2-form-error" role="alert">
          {conflictError}
        </p>
      )}
      {generalError && (
        <p className="v2-form-error" role="alert">
          {generalError}
        </p>
      )}

      <div className="v2-agent-panel v2-skill-form">
        <div className="v2-form-fields">
          <label htmlFor="v2-skill-name">
            <span>{t("skillName")}</span>
            <input
              id="v2-skill-name"
              className="v2-input"
              aria-label={t("skillName")}
              value={form.name}
              maxLength={LIMITS.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
            <small>{tAgent("helpsAgentKnowWhenToUseThisSkill")}</small>
          </label>

          <label htmlFor="v2-skill-description">
            <span>{t("skillDescription")}</span>
            <textarea
              id="v2-skill-description"
              className="v2-textarea"
              aria-label={t("skillDescription")}
              value={form.description}
              maxLength={LIMITS.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </label>

          <div className="v2-skill-instructions">
            <div className="v2-skill-instructions-head">
              <span>{t("skillInstructions")}</span>
              <button
                type="button"
                className="v2-btn"
                aria-pressed={preview}
                onClick={() => setPreview((value) => !value)}
              >
                {tAgent("preview")}
              </button>
            </div>
            {preview ? (
              form.instructions.trim() ? (
                <div className="v2-skill-preview">
                  <MarkdownText text={form.instructions} />
                </div>
              ) : (
                <p className="v2-skill-preview-empty">
                  {tAgent("previewContentWillAppearOnceYouAddInstructions")}
                </p>
              )
            ) : (
              <textarea
                id="v2-skill-instructions"
                className="v2-textarea v2-skill-instructions-input"
                aria-label={t("skillInstructions")}
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
            <small>
              {tAgent("agentWillFollowTheseInstructionsWhenReadingTheSkill")}
            </small>
          </div>

          <label className="v2-skill-enabled" htmlFor="v2-skill-enabled">
            <input
              id="v2-skill-enabled"
              type="checkbox"
              checked={form.enabled}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  enabled: event.target.checked,
                }))
              }
            />
            <span>
              {form.enabled
                ? tAgent("agentWillFollowTheseInstructionsWhenReadingTheSkill")
                : tAgent("agentWillNotReadThisSkill")}
            </span>
          </label>
        </div>
      </div>

      <V2Dialog
        open={blocker.state === "blocked"}
        title={tAgent("discardUnsavedChanges")}
        onClose={() => blocker.reset?.()}
      >
        <p>{tAgent("discardUnsavedChanges")}</p>
        <div className="v2-form-actions">
          <button
            type="button"
            className="v2-btn"
            onClick={() => blocker.reset?.()}
          >
            {tAgent("keepEditing")}
          </button>
          <button
            type="button"
            className="v2-btn v2-btn-primary"
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
        <div className="v2-form-actions">
          <button
            type="button"
            className="v2-btn"
            onClick={() => setDeleteOpen(false)}
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            className="v2-btn v2-btn-primary"
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
