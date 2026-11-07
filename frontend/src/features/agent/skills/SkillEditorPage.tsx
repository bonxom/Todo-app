import { useTranslation } from "react-i18next";
import { useState, useMemo, useRef } from "react";
import {
  useNavigate,
  useParams,
  useBlocker,
  useBeforeUnload,
} from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Save,
  Trash2,
  Loader2,
  AlertCircle,
  Eye,
  Edit3,
  RotateCcw,
} from "lucide-react";
import {
  useSkill,
  useSessionKey,
  currentSessionKey,
  useCreateSkillMutation,
  useUpdateSkillMutation,
  useDeleteSkillMutation,
} from "./useSkillQueries";
import MarkdownText from "@/features/tasks/components/chat/MarkdownText";
import { AgentDiscardDialog } from "../AgentDiscardDialog";
import "./skills.css";
import type { SkillDetail } from "@/shared/types/skill";
import { ApiError } from "@/shared/services/apiError";
import { useModalKeyboard } from "@/shared/hooks/useModalKeyboard";

export function SkillEditorPage() {
  const { skillId } = useParams();
  const sessionKey = useSessionKey();
  return <SkillEditorForm key={`${sessionKey}:${skillId ?? "new"}`} />;
}

function SkillEditorForm() {
  const { t } = useTranslation("agent");

  const sessionKey = useSessionKey();
  const isCurrent = () => currentSessionKey() === sessionKey;
  const bypass = useRef(false);
  const deleteRef = useRef<HTMLDivElement>(null);
  const [baseline, setBaseline] = useState<SkillDetail | null>(null);
  const { skillId } = useParams<{ skillId?: string }>();
  const isNew = !skillId || skillId === "new";
  const navigate = useNavigate();

  const {
    data: initialSkill,
    isLoading: isLoadingSkill,
    error: loadError,
    refetch,
  } = useSkill(isNew ? undefined : skillId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);

  const [conflictError, setConflictError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [reloadRequested, setReloadRequested] = useState(false);
  useModalKeyboard(isDeleteDialogOpen, deleteRef, () =>
    setIsDeleteDialogOpen(false),
  );

  // Adopt fresh server data only while the form is pristine.
  if (
    initialSkill &&
    initialSkill !== baseline &&
    (!baseline ||
      (name === baseline.name &&
        description === baseline.description &&
        instructions === baseline.instructions &&
        enabled === baseline.enabled))
  ) {
    setBaseline(initialSkill);
    setName(initialSkill.name);
    setDescription(initialSkill.description);
    setInstructions(initialSkill.instructions);
    setEnabled(initialSkill.enabled);
  }

  const isDirty = useMemo(() => {
    if (isNew) {
      return Boolean(name.trim() || description.trim() || instructions.trim());
    }
    if (!baseline) return false;
    return (
      name !== baseline.name ||
      description !== baseline.description ||
      instructions !== baseline.instructions ||
      enabled !== baseline.enabled
    );
  }, [isNew, baseline, name, description, instructions, enabled]);

  const blocker = useBlocker(() => isCurrent() && isDirty && !bypass.current);
  useBeforeUnload((event) => {
    if (isDirty && !bypass.current) {
      event.preventDefault();
      event.returnValue = "";
    }
  });

  const isValid =
    name.trim().length >= 1 &&
    name.trim().length <= 80 &&
    description.trim().length >= 1 &&
    description.trim().length <= 500 &&
    instructions.trim().length >= 1 &&
    instructions.trim().length <= 10000;

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
          name: name.trim(),
          description: description.trim(),
          instructions: instructions.trim(),
          enabled,
        });
        if (!isCurrent()) return;
        bypass.current = true;
        navigate(`/agent/skills/${created.id}`);
      } else {
        const updated = await updateMutation.mutateAsync({
          id: skillId!,
          input: {
            expectedVersion: baseline!.version,
            name: name.trim(),
            description: description.trim(),
            instructions: instructions.trim(),
            enabled,
          },
        });
        if (isCurrent()) {
          setBaseline(updated);
          setName(updated.name);
          setDescription(updated.description);
          setInstructions(updated.instructions);
          setEnabled(updated.enabled);
        }
      }
    } catch (err: unknown) {
      if (!isCurrent()) return;
      if (err instanceof ApiError && err.status === 409) {
        setConflictError(
          t("skillVersionHasChangedOnTheServerByAnotherSession"),
        );
      } else {
        setGeneralError(
          err instanceof Error
            ? err.message
            : t("anErrorOccurredWhileSavingTheSkill"),
        );
      }
    }
  };

  const handleDelete = async () => {
    if (isNew || !baseline || isSaving || deleteMutation.isPending) return;
    try {
      await deleteMutation.mutateAsync({
        id: baseline.id,
        expectedVersion: baseline.version,
      });
      if (!isCurrent()) return;
      bypass.current = true;
      setIsDeleteDialogOpen(false);
      navigate("/agent/skills");
    } catch (err: unknown) {
      if (!isCurrent()) return;
      setIsDeleteDialogOpen(false);
      if (err instanceof ApiError && err.status === 409)
        setConflictError(
          t("skillVersionHasChangedOnTheServerByAnotherSession"),
        );
      setGeneralError(
        err instanceof Error ? err.message : t("unableToDeleteSkill"),
      );
    }
  };

  const handleBack = () => navigate("/agent/skills");
  const handleReloadServerVersion = () => setReloadRequested(true);
  const reloadServerVersion = async () => {
    setReloadRequested(false);
    const result = await refetch();
    if (!isCurrent()) return;
    if (result.error || !result.data) {
      setGeneralError(t("unableToLoadLatestVersionYourDraftIsPreserved"));
      return;
    }
    const latest = result.data;
    setBaseline(latest);
    setName(latest.name);
    setDescription(latest.description);
    setInstructions(latest.instructions);
    setEnabled(latest.enabled);
    setConflictError(null);
  };

  if (!isNew && isLoadingSkill) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" />
      </div>
    );
  }

  if (!isNew && loadError && !baseline)
    return (
      <div role="alert" className="p-6">
        {t("skillIsNotAvailable")}{" "}
        <button onClick={handleBack}>{t("backToList")}</button>
      </div>
    );

  return (
    <div className="ui-page-shell skills-page skill-editor-page">
      <AgentDiscardDialog
        isOpen={
          discardDialogOpen || reloadRequested || blocker.state === "blocked"
        }
        onConfirm={() => {
          setDiscardDialogOpen(false);
          if (reloadRequested) void reloadServerVersion();
          else if (blocker.state === "blocked") blocker.proceed();
        }}
        onCancel={() => {
          setDiscardDialogOpen(false);
          setReloadRequested(false);
          if (blocker.state === "blocked") blocker.reset();
        }}
      />
      {isDeleteDialogOpen && (
        <div
          className="skill-modal-backdrop"
          ref={deleteRef}
          role="dialog"
          aria-modal="true"
          aria-label={t("confirmSkillDeletion")}
        >
          <div className="skill-delete-dialog">
            <span className="skill-delete-icon">
              <Trash2 size={23} />
            </span>
            <h2>{t("deleteThisSkill")}</h2>
            <p>
              <strong>{name}</strong>{" "}
              {t(
                "willBeRemovedFromYourLibraryPastConversationResponsesRemainUnchanged",
              )}
            </p>
            <div className="skills-actions">
              <button
                className="ui-btn-secondary"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                {t("cancel")}
              </button>
              <button
                className="skill-danger-button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                {t("confirmDelete")}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="skills-section-bar">
        <button
          className="skill-back-link"
          onClick={handleBack}
          aria-label={t("backToSkills")}
        >
          <ArrowLeft size={17} />
          {t("personalSkills")}
        </button>
        <span className="skill-editor-status">
          {isSaving
            ? t("saving")
            : isDirty
              ? t("unsavedChanges")
              : isNew
                ? t("newDraft")
                : t("saved")}
        </span>
      </div>
      <header className="skills-heading skill-editor-heading">
        <div>
          <h1 className="ui-page-title">
            {isNew ? t("createNewSkill") : name || t("editSkill")}
          </h1>
          <p className="ui-page-description">
            {t("clearGuidanceForBetterConversations")}
          </p>
        </div>
        <button
          className="ui-btn-primary skill-save-button"
          onClick={handleSave}
          disabled={!isValid || isSaving || deleteMutation.isPending}
        >
          {isSaving ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <Save size={17} />
          )}
          {isNew ? t("saveSkill") : t("saveChanges")}
        </button>
      </header>
      {conflictError && (
        <div className="skills-notice skills-notice--warning" role="alert">
          <AlertCircle size={19} />
          <div>
            <strong>{conflictError}</strong>
            <p>
              {t(
                "yourDraftIsPreservedCopyYourChangesOrReloadTheLatestVersionToContinue",
              )}
            </p>
          </div>
          <button
            className="ui-btn-secondary"
            onClick={handleReloadServerVersion}
          >
            <RotateCcw size={15} />
            {t("reloadLatest")}
          </button>
        </div>
      )}
      {generalError && (
        <div className="skills-notice skills-notice--error" role="alert">
          <AlertCircle size={18} />
          <span>{generalError}</span>
        </div>
      )}
      <div className="skill-editor-grid">
        <section
          className="skill-info-panel"
          aria-labelledby="skill-info-heading"
        >
          <div className="skill-panel-heading">
            <h2 id="skill-info-heading">{t("skillInformation")}</h2>
            <p>{t("helpsAgentKnowWhenToUseThisSkill")}</p>
          </div>
          <div className="skill-field">
            <div className="skill-field-label">
              <label htmlFor="skill-name">
                {t("skillName")}
                <span>*</span>
              </label>
              <span>{name.length}/80</span>
            </div>
            <input
              className="ui-input"
              id="skill-name"
              value={name}
              maxLength={80}
              disabled={isSaving || deleteMutation.isPending}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("eGIeltsWriting")}
            />
          </div>
          <div className="skill-field">
            <div className="skill-field-label">
              <label htmlFor="skill-description">
                {t("skillDescription")}
                <span>*</span>
              </label>
              <span>{description.length}/500</span>
            </div>
            <textarea
              className="ui-input skill-description-input"
              id="skill-description"
              rows={4}
              value={description}
              maxLength={500}
              disabled={isSaving || deleteMutation.isPending}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("whenShouldAgentUseThisGuidance")}
            />
            <p className="skill-field-hint">
              {t(
                "eGWhenINeedFeedbackAndImprovementSuggestionsOnIeltsTask2Writing",
              )}
            </p>
          </div>
          <div className="skill-enabled-setting">
            <div>
              <label id="skill-enabled-label">{t("enableSkill")}</label>
              <p>
                {enabled
                  ? t("readyForYourNextConversation")
                  : t("agentWillNotReadThisSkill")}
              </p>
            </div>
            <button
              className="skill-switch"
              role="switch"
              aria-labelledby="skill-enabled-label"
              aria-checked={enabled}
              onClick={() => setEnabled((value) => !value)}
              disabled={isSaving || deleteMutation.isPending}
            >
              <span />
            </button>
          </div>
          <div className="skill-editor-help">
            <BookOpen size={17} />
            <p>
              {t(
                "theMoreSpecificTheInstructionsTheBetterAgentCanApplyThemWriteAsIfGuidingACollaborator",
              )}
            </p>
          </div>
          {!isNew && (
            <div className="skill-editor-danger-zone">
              <span>
                {t("currentVersionV")}
                {baseline?.version}
              </span>
              <button
                className="skill-text-action skill-text-danger"
                disabled={isSaving || deleteMutation.isPending}
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 size={15} />
                {t("deleteSkill")}
              </button>
            </div>
          )}
        </section>
        <section className="skill-instructions-panel">
          <div className="skill-instructions-header">
            <div>
              <label id="skill-instructions-label" htmlFor="skill-instructions">
                {t("instructions")}
                <span>*</span>
              </label>
              <p>{t("agentWillFollowTheseInstructionsWhenReadingTheSkill")}</p>
            </div>
            <div className="skill-editor-tabs" aria-label={t("editorMode")}>
              <button
                aria-pressed={!previewMode}
                onClick={() => setPreviewMode(false)}
              >
                <Edit3 size={14} />
                {t("edit")}
              </button>
              <button
                aria-pressed={previewMode}
                onClick={() => setPreviewMode(true)}
              >
                <Eye size={14} />
                {t("preview")}
              </button>
            </div>
          </div>
          {previewMode ? (
            <div className="skill-markdown-preview">
              {instructions.trim() ? (
                <MarkdownText text={instructions} />
              ) : (
                <p className="skill-preview-empty">
                  {t("previewContentWillAppearOnceYouAddInstructions")}
                </p>
              )}
            </div>
          ) : (
            <textarea
              id="skill-instructions"
              className="skill-instructions-input"
              value={instructions}
              maxLength={10000}
              disabled={isSaving || deleteMutation.isPending}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={t(
                "describeHowYouWantAgentToAssistForExamplePreserveOriginalMeaningWhenEditingBrieflyExplainEachChangeConcludeWithAnActionablePracticePrompt",
              )}
            />
          )}
          <div className="skill-instructions-footer">
            <span>{t("markdownSupported")}</span>
            <span>{t("characterCount", { count: instructions.length })}</span>
          </div>
        </section>
      </div>
      <p className="skill-editor-footnote">
        {t("changesApplyFromTheNextChatTurn")}
      </p>
    </div>
  );
}
