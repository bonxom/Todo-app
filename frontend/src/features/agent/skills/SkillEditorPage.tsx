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
    <div
      className="ui-page-shell mx-auto skills-page max-w-[1120px]
      [&_:is(button,a):focus-visible]:[outline:2px_solid_var(--color-accent)]
      [&_:is(button,a):focus-visible]:outline-offset-[3px] [&_button:disabled]:cursor-not-allowed
      [&_button:disabled]:opacity-[0.5] skill-editor-page"
    >
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
          className="skill-modal-backdrop [&_:is(button,a):focus-visible]:[outline:2px_solid_var(--color-accent)]
            [&_:is(button,a):focus-visible]:outline-offset-[3px] [&_button:disabled]:cursor-not-allowed
            [&_button:disabled]:opacity-[0.5] fixed inset-[0] z-150 flex items-center justify-center p-[28px]
            [background:var(--color-overlay)] [backdrop-filter:blur(3px)]
            [@media(max-width:760px)]:p-[12px]"
          ref={deleteRef}
          role="dialog"
          aria-modal="true"
          aria-label={t("confirmSkillDeletion")}
        >
          <div
            className="skill-delete-dialog w-[min(100%,420px)] [border:1px_solid_var(--color-line)] [background:var(--color-surface)]
            text-[var(--color-text)] rounded-[12px] [box-shadow:var(--shadow-lg)] p-[28px] [&_h2]:text-[20px]
            [&_h2]:m-[16px_0_8px] [&_h2]:[font-weight:650] [&_p]:text-[var(--color-text-muted)] [&_p]:text-[14px]
            [&_p]:[line-height:1.7] [&_.skills-actions]:mt-[24px]"
          >
            <span className="skill-delete-icon inline-flex p-[12px] rounded-[10px] text-[var(--color-danger)] [background:var(--color-danger-soft)]">
              <Trash2 size={23} />
            </span>
            <h2>{t("deleteThisSkill")}</h2>
            <p>
              <strong>{name}</strong>{" "}
              {t(
                "willBeRemovedFromYourLibraryPastConversationResponsesRemainUnchanged",
              )}
            </p>
            <div className="skills-actions flex items-center gap-[10px] shrink-0 [@media(max-width:760px)]:[&_>_:is(a,button)]:flex-1">
              <button
                className="ui-btn-secondary"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                {t("cancel")}
              </button>
              <button
                className="skill-danger-button inline-flex items-center justify-center gap-[8px] min-h-[44px] p-[0_16px]
                  [border:1px_solid_var(--color-danger)] rounded-[9px] [background:var(--color-danger)] cursor-pointer"
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
      <div
        className="skills-section-bar flex items-center justify-between gap-[16px] min-h-[44px]
        [@media(max-width:760px)]:[&_.agent-navigation_a]:p-[0_9px]
        [@media(max-width:760px)]:[&_.agent-navigation_svg]:[display:none]"
      >
        <button
          className="skill-back-link items-center gap-[8px] [border:0] [background:transparent] p-[8px_0] cursor-pointer"
          onClick={handleBack}
          aria-label={t("backToSkills")}
        >
          <ArrowLeft size={17} />
          {t("personalSkills")}
        </button>
        <span className="skill-editor-status text-[12px] text-[var(--color-text-muted)]">
          {isSaving
            ? t("saving")
            : isDirty
              ? t("unsavedChanges")
              : isNew
                ? t("newDraft")
                : t("saved")}
        </span>
      </div>
      <header
        className="skills-heading flex items-center justify-between gap-[24px]
        [@media(max-width:1000px)]:items-start [@media(max-width:1000px)]:[&_.skills-actions]:flex-wrap
        [@media(max-width:760px)]:flex-col [@media(max-width:760px)]:gap-[18px]
        [@media(max-width:760px)]:[&_.skills-actions]:w-full skill-editor-heading [&_h1]:wrap-anywhere"
      >
        <div>
          <h1 className="ui-page-title m-[0] text-[var(--color-text)] [font-weight:650] text-balance">
            {isNew ? t("createNewSkill") : name || t("editSkill")}
          </h1>
          <p className="ui-page-description max-w-[68ch] text-[var(--color-text-muted)] [line-height:1.6] text-pretty">
            {t("clearGuidanceForBetterConversations")}
          </p>
        </div>
        <button
          className="ui-btn-primary skill-save-button [@media(max-width:760px)]:self-stretch"
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
        <div
          className="skills-notice flex items-center gap-[10px] p-[14px_16px] [border:1px_solid_var(--color-line)] rounded-[9px]
          text-[13px] [&_>_svg]:shrink-0 [&_>_span]:flex-1 [&_>_div]:flex-1 [&_p]:m-[5px_0_0]
          [@media(max-width:760px)]:flex-wrap skills-notice--warning"
          role="alert"
        >
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
        <div
          className="skills-notice flex items-center gap-[10px] p-[14px_16px] [border:1px_solid_var(--color-line)] rounded-[9px]
          text-[13px] [&_>_svg]:shrink-0 [&_>_span]:flex-1 [&_>_div]:flex-1 [&_p]:m-[5px_0_0]
          [@media(max-width:760px)]:flex-wrap skills-notice--error"
          role="alert"
        >
          <AlertCircle size={18} />
          <span>{generalError}</span>
        </div>
      )}
      <div className="skill-editor-grid grid gap-[24px] [align-items:start] [@media(max-width:1000px)]:gap-[16px]">
        <section
          className="skill-info-panel [background:var(--color-surface)] [border:1px_solid_var(--color-line)] rounded-[12px] overflow-hidden p-[24px] [@media(max-width:760px)]:p-[20px]"
          aria-labelledby="skill-info-heading"
        >
          <div className="skill-panel-heading [&_h2]:text-[15px] [&_h2]:m-[0] [&_h2]:[font-weight:650] [&_p]:m-[6px_0_0] [&_p]:text-[var(--color-text-muted)] [&_p]:text-[12px] [&_p]:[line-height:1.6]">
            <h2 id="skill-info-heading">{t("skillInformation")}</h2>
            <p>{t("helpsAgentKnowWhenToUseThisSkill")}</p>
          </div>
          <div className="skill-field mt-[25px]">
            <div
              className="skill-field-label flex justify-between items-baseline gap-[10px] mb-[8px] [&_label]:text-[13px]
              [&_label]:[font-weight:600] [&_>_span]:text-[11px] [&_>_span]:text-[var(--color-text-muted)]
              [&_label_span]:text-[var(--color-text-muted)]"
            >
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
          <div className="skill-field mt-[25px]">
            <div
              className="skill-field-label flex justify-between items-baseline gap-[10px] mb-[8px] [&_label]:text-[13px]
              [&_label]:[font-weight:600] [&_>_span]:text-[11px] [&_>_span]:text-[var(--color-text-muted)]
              [&_label_span]:text-[var(--color-text-muted)]"
            >
              <label htmlFor="skill-description">
                {t("skillDescription")}
                <span>*</span>
              </label>
              <span>{description.length}/500</span>
            </div>
            <textarea
              className="ui-input skill-description-input [resize:vertical]"
              id="skill-description"
              rows={4}
              value={description}
              maxLength={500}
              disabled={isSaving || deleteMutation.isPending}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("whenShouldAgentUseThisGuidance")}
            />
            <p className="skill-field-hint text-[11px] [line-height:1.65] text-[var(--color-text-muted)] m-[8px_0_0]">
              {t(
                "eGWhenINeedFeedbackAndImprovementSuggestionsOnIeltsTask2Writing",
              )}
            </p>
          </div>
          <div
            className="skill-enabled-setting flex items-center justify-between gap-[14px] [border-top:1px_solid_var(--color-line)]
            [border-bottom:1px_solid_var(--color-line)] p-[20px_0] mt-[24px] [&_label]:text-[13px]
            [&_label]:[font-weight:600] [&_p]:m-[5px_0_0] [&_p]:text-[var(--color-text-muted)] [&_p]:text-[11px]
            [&_p]:[line-height:1.6]"
          >
            <div>
              <label id="skill-enabled-label">{t("enableSkill")}</label>
              <p>
                {enabled
                  ? t("readyForYourNextConversation")
                  : t("agentWillNotReadThisSkill")}
              </p>
            </div>
            <button
              className="skill-switch inline-flex items-center w-[38px] h-[23px] [border:1px_solid_var(--color-line)] p-[2px]
                [background:var(--color-line)] rounded-[99px] shrink-0 cursor-pointer [&_span]:w-[17px] [&_span]:h-[17px]
                [&_span]:rounded-[50%] [&_span]:[background:#fff] [&_span]:[box-shadow:0_1px_3px_#0002]
                [&[aria-checked=true]]:[background:var(--color-accent)] [&[aria-checked=true]]:border-[var(--color-accent)]
                [&[aria-checked=true]_span]:[transform:translateX(15px)]"
              role="switch"
              aria-labelledby="skill-enabled-label"
              aria-checked={enabled}
              onClick={() => setEnabled((value) => !value)}
              disabled={isSaving || deleteMutation.isPending}
            >
              <span />
            </button>
          </div>
          <div
            className="skill-editor-help flex items-start gap-[9px] mt-[20px] text-[var(--color-text-muted)] [&_svg]:shrink-0
            [&_svg]:mt-[2px] [&_p]:m-[0] [&_p]:text-[12px] [&_p]:[line-height:1.7]
            [@media(max-width:760px)]:[display:none]"
          >
            <BookOpen size={17} />
            <p>
              {t(
                "theMoreSpecificTheInstructionsTheBetterAgentCanApplyThemWriteAsIfGuidingACollaborator",
              )}
            </p>
          </div>
          {!isNew && (
            <div className="skill-editor-danger-zone flex justify-between items-center flex-wrap gap-[8px] mt-[24px] text-[11px] text-[var(--color-text-muted)]">
              <span>
                {t("currentVersionV")}
                {baseline?.version}
              </span>
              <button
                className="skill-text-action inline-flex items-center justify-center gap-[7px] p-[8px_0] [border:0] [background:none] cursor-pointer skill-text-danger"
                disabled={isSaving || deleteMutation.isPending}
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 size={15} />
                {t("deleteSkill")}
              </button>
            </div>
          )}
        </section>
        <section className="skill-instructions-panel [background:var(--color-surface)] [border:1px_solid_var(--color-line)] rounded-[12px] overflow-hidden">
          <div
            className="skill-instructions-header [&_p]:m-[6px_0_0] [&_p]:text-[var(--color-text-muted)] [&_p]:text-[12px]
            [&_p]:[line-height:1.6] [&_label_span]:text-[var(--color-text-muted)] p-[22px_24px]
            [border-bottom:1px_solid_var(--color-line)] flex flex-wrap items-center justify-between gap-[16px]
            [&_label]:text-[15px] [&_label]:[font-weight:650] [@media(max-width:760px)]:p-[20px]"
          >
            <div>
              <label id="skill-instructions-label" htmlFor="skill-instructions">
                {t("instructions")}
                <span>*</span>
              </label>
              <p>{t("agentWillFollowTheseInstructionsWhenReadingTheSkill")}</p>
            </div>
            <div
              className="skill-editor-tabs inline-flex gap-[3px] [background:var(--color-surface-muted)] p-[3px] rounded-[7px]
              [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center [&_button]:gap-[6px]
              [&_button]:p-[7px_10px] [&_button]:[border:0] [&_button]:rounded-[5px] [&_button]:[background:transparent]
              [&_button]:cursor-pointer [&_button[aria-pressed=true]]:[background:var(--color-surface)]
              [&_button[aria-pressed=true]]:[box-shadow:var(--shadow-xs)]"
              aria-label={t("editorMode")}
            >
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
            <div className="skill-markdown-preview min-h-[420px] p-[24px] text-[14px] [line-height:1.8] wrap-anywhere [@media(max-width:760px)]:p-[20px] [@media(max-width:760px)]:min-h-[320px]">
              {instructions.trim() ? (
                <MarkdownText text={instructions} />
              ) : (
                <p className="skill-preview-empty text-[var(--color-text-muted)]">
                  {t("previewContentWillAppearOnceYouAddInstructions")}
                </p>
              )}
            </div>
          ) : (
            <textarea
              id="skill-instructions"
              className="skill-instructions-input block w-full min-h-[420px] p-[24px] [resize:vertical] [border:0] rounded-[0]
                [background:var(--color-surface)] outline-offset-[-3px] [&::placeholder]:opacity-[0.8]
                [&:focus-visible]:[outline:2px_solid_var(--color-accent)]
                [@media(max-width:760px)]:p-[20px] [@media(max-width:760px)]:min-h-[320px]"
              value={instructions}
              maxLength={10000}
              disabled={isSaving || deleteMutation.isPending}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={t(
                "describeHowYouWantAgentToAssistForExamplePreserveOriginalMeaningWhenEditingBrieflyExplainEachChangeConcludeWithAnActionablePracticePrompt",
              )}
            />
          )}
          <div className="skill-instructions-footer flex justify-between gap-[16px] [border-top:1px_solid_var(--color-line)] p-[13px_24px] text-[var(--color-text-muted)] text-[11px]">
            <span>{t("markdownSupported")}</span>
            <span>{t("characterCount", { count: instructions.length })}</span>
          </div>
        </section>
      </div>
      <p className="skill-editor-footnote m-[-12px_0_0] text-[var(--color-text-muted)] text-[12px] text-right [@media(max-width:760px)]:text-left [@media(max-width:760px)]:mt-[-8px]">
        {t("changesApplyFromTheNextChatTurn")}
      </p>
    </div>
  );
}
