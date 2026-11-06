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
          "Skill version has changed on the server by another session.",
        );
      } else {
        setGeneralError(
          err instanceof Error ? err.message : "An error occurred while saving the skill.",
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
          "Skill version has changed on the server by another session.",
        );
      setGeneralError(
        err instanceof Error ? err.message : "Unable to delete skill.",
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
      setGeneralError("Unable to load latest version. Your draft is preserved.");
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
        Skill is not available.{" "}
        <button onClick={handleBack}>Back to list</button>
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
          aria-label="Confirm skill deletion"
        >
          <div className="skill-delete-dialog">
            <span className="skill-delete-icon">
              <Trash2 size={23} />
            </span>
            <h2>Delete this skill?</h2>
            <p>
              <strong>{name}</strong> will be removed from your library. Past
              conversation responses remain unchanged.
            </p>
            <div className="skills-actions">
              <button
                className="ui-btn-secondary"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                className="skill-danger-button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                Confirm delete
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="skills-section-bar">
        <button
          className="skill-back-link"
          onClick={handleBack}
          aria-label="Back to skills"
        >
          <ArrowLeft size={17} />
          Personal Skills
        </button>
        <span className="skill-editor-status">
          {isSaving
            ? "Saving…"
            : isDirty
              ? "Unsaved changes"
              : isNew
                ? "New draft"
                : "Saved"}
        </span>
      </div>
      <header className="skills-heading skill-editor-heading">
        <div>
          <h1 className="ui-page-title">
            {isNew ? "Create new skill" : name || "Edit skill"}
          </h1>
          <p className="ui-page-description">
            Clear guidance for better conversations.
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
          {isNew ? "Save skill" : "Save changes"}
        </button>
      </header>
      {conflictError && (
        <div className="skills-notice skills-notice--warning" role="alert">
          <AlertCircle size={19} />
          <div>
            <strong>{conflictError}</strong>
            <p>
              Your draft is preserved. Copy your changes or reload the latest
              version to continue.
            </p>
          </div>
          <button
            className="ui-btn-secondary"
            onClick={handleReloadServerVersion}
          >
            <RotateCcw size={15} />
            Reload latest
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
            <h2 id="skill-info-heading">Skill Information</h2>
            <p>Helps Agent know when to use this skill.</p>
          </div>
          <div className="skill-field">
            <div className="skill-field-label">
              <label htmlFor="skill-name">
                Skill name <span>*</span>
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
              placeholder="e.g. IELTS Writing"
            />
          </div>
          <div className="skill-field">
            <div className="skill-field-label">
              <label htmlFor="skill-description">
                Skill description <span>*</span>
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
              placeholder="When should Agent use this guidance?"
            />
            <p className="skill-field-hint">
              e.g. When I need feedback and improvement suggestions on IELTS Task 2 writing.
            </p>
          </div>
          <div className="skill-enabled-setting">
            <div>
              <label id="skill-enabled-label">Enable skill</label>
              <p>
                {enabled
                  ? "Ready for your next conversation."
                  : "Agent will not read this skill."}
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
              The more specific the instructions, the better Agent can apply
              them. Write as if guiding a collaborator.
            </p>
          </div>
          {!isNew && (
            <div className="skill-editor-danger-zone">
              <span>Current version: v{baseline?.version}</span>
              <button
                className="skill-text-action skill-text-danger"
                disabled={isSaving || deleteMutation.isPending}
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 size={15} />
                Delete skill
              </button>
            </div>
          )}
        </section>
        <section className="skill-instructions-panel">
          <div className="skill-instructions-header">
            <div>
              <label id="skill-instructions-label" htmlFor="skill-instructions">
                Instructions <span>*</span>
              </label>
              <p>Agent will follow these instructions when reading the skill.</p>
            </div>
            <div className="skill-editor-tabs" aria-label="Editor mode">
              <button
                aria-pressed={!previewMode}
                onClick={() => setPreviewMode(false)}
              >
                <Edit3 size={14} />
                Edit
              </button>
              <button
                aria-pressed={previewMode}
                onClick={() => setPreviewMode(true)}
              >
                <Eye size={14} />
                Preview
              </button>
            </div>
          </div>
          {previewMode ? (
            <div className="skill-markdown-preview">
              {instructions.trim() ? (
                <MarkdownText text={instructions} />
              ) : (
                <p className="skill-preview-empty">
                  Preview content will appear once you add instructions.
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
              placeholder={
                "Describe how you want Agent to assist…\n\nFor example:\n- Preserve original meaning when editing.\n- Briefly explain each change.\n- Conclude with an actionable practice prompt."
              }
            />
          )}
          <div className="skill-instructions-footer">
            <span>Markdown supported</span>
            <span>
              {instructions.length.toLocaleString("en-US")} / 10,000 characters
            </span>
          </div>
        </section>
      </div>
      <p className="skill-editor-footnote">
        Changes apply from the next chat turn.
      </p>
    </div>
  );
}
