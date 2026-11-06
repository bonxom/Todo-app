import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { ApiError } from "@/shared/services/apiError";
import { useModalKeyboard } from "@/shared/hooks/useModalKeyboard";
import {
  useSkillTemplates,
  useSkillTemplate,
  useImportTemplateMutation,
  useSessionKey,
  currentSessionKey,
} from "./useSkillQueries";
import MarkdownText from "@/features/tasks/components/chat/MarkdownText";

export function TemplateGallery({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const sessionKey = useSessionKey();
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalKeyboard(isOpen, dialogRef, onClose);
  const {
    data: templates,
    isLoading,
    error,
    refetch: reloadTemplates,
  } = useSkillTemplates(isOpen);
  const [selectedId, setSelectedId] = useState<string>();
  const [showPreview, setShowPreview] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const activeId = selectedId ?? templates?.[0]?.id;
  const {
    data: detail,
    isLoading: loadingDetail,
    error: detailError,
    refetch: reloadDetail,
  } = useSkillTemplate(isOpen ? activeId : undefined);
  const importing = useImportTemplateMutation();
  const close = () => {
    setShowPreview(false);
    setImportError(null);
    onClose();
  };
  const handleImport = async () => {
    if (!detail || importing.isPending) return;
    setImportError(null);
    try {
      const created = await importing.mutateAsync({
        templateId: detail.id,
        expectedTemplateVersion: detail.version,
      });
      if (currentSessionKey() !== sessionKey) return;
      close();
      navigate(`/agent/skills/${created.id}`);
    } catch (err) {
      if (currentSessionKey() !== sessionKey) return;
      if (err instanceof ApiError && err.status === 409) {
        await reloadTemplates();
        await reloadDetail();
        setImportError(
          "Check your skill limit and review the updated template version before trying again.",
        );
      } else
        setImportError("Unable to add template. Check your connection and try again.");
    }
  };
  if (!isOpen) return null;
  return (
    <div
      className="skill-modal-backdrop"
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Skill templates gallery"
    >
      <div
        className={`skill-gallery ${showPreview ? "skill-gallery--preview" : ""}`}
      >
        <header className="skill-gallery-header">
          <div>
            <span className="skill-eyebrow">
              Start from a pre-built guideline
            </span>
            <h2>Skill Templates Gallery</h2>
          </div>
          <button
            className="skills-icon-button"
            onClick={close}
            aria-label="Close templates gallery"
          >
            <X size={21} />
          </button>
        </header>
        <div className="skill-gallery-body">
          <aside className="skill-template-list" aria-label="Skill templates">
            <p>Select a template, then customize it to your needs.</p>
            {isLoading ? (
              <p role="status">
                <Loader2 className="animate-spin" size={20} />
                Loading templates…
              </p>
            ) : error ? (
              <div role="alert">
                <p>Unable to load templates.</p>
                <button
                  className="ui-btn-secondary"
                  onClick={() => void reloadTemplates()}
                >
                  Try again
                </button>
              </div>
            ) : (
              templates?.map((template) => (
                <button
                  className="skill-template-choice"
                  key={template.id}
                  aria-label={`View template ${template.name}`}
                  aria-pressed={activeId === template.id}
                  onClick={() => {
                    setSelectedId(template.id);
                    setShowPreview(true);
                    setImportError(null);
                  }}
                >
                  <span className="skill-template-symbol">
                    <BookOpen size={21} />
                  </span>
                  <span>
                    <strong>{template.name}</strong>
                    <span>{template.description}</span>
                  </span>
                  <ChevronRight size={17} />
                </button>
              ))
            )}
            <div className="skill-template-note">
              <Check size={16} />
              <span>Your own private copy. Edit freely after adding.</span>
            </div>
          </aside>
          <section className="skill-template-preview" aria-label="Template content">
            <button
              className="skill-back-link skill-template-back"
              onClick={() => setShowPreview(false)}
            >
              <ArrowLeft size={16} />
              Back to templates
            </button>
            {loadingDetail ? (
              <div className="skills-empty" role="status">
                <Loader2 className="animate-spin" />
                Loading template content…
              </div>
            ) : detailError ? (
              <div className="skills-empty" role="alert">
                <p>Unable to load template content.</p>
                <button
                  className="ui-btn-secondary"
                  onClick={() => void reloadDetail()}
                >
                  Try again
                </button>
              </div>
            ) : detail ? (
              <>
                <div className="skill-template-preview-heading">
                  <span className="skill-eyebrow">Instruction preview</span>
                  <h3>{detail.name}</h3>
                  <p>{detail.description}</p>
                </div>
                <div className="skill-template-document">
                  <MarkdownText text={detail.instructions} />
                </div>
              </>
            ) : (
              <div className="skills-empty">
                <BookOpen />
                <p>Select a template to view instructions.</p>
              </div>
            )}
          </section>
        </div>
        {importError && (
          <p className="skill-gallery-error" role="alert">
            {importError}
          </p>
        )}
        <footer className="skill-gallery-footer">
          <p>Templates are only used after you add them to your library.</p>
          <button
            className="ui-btn-primary"
            onClick={() => void handleImport()}
            disabled={!detail || !!detailError || importing.isPending}
          >
            {importing.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={17} />
            )}
            Add to my skills
          </button>
        </footer>
      </div>
    </div>
  );
}
