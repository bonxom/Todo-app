import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("agent");

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
          t(
            "checkYourSkillLimitAndReviewTheUpdatedTemplateVersionBeforeTryingAgain",
          ),
        );
      } else
        setImportError(t("unableToAddTemplateCheckYourConnectionAndTryAgain"));
    }
  };
  if (!isOpen) return null;
  return (
    <div
      className="skill-modal-backdrop [&_:is(button,a):focus-visible]:[outline:2px_solid_var(--color-accent)]
        [&_:is(button,a):focus-visible]:outline-offset-[3px] [&_button:disabled]:cursor-not-allowed
        [&_button:disabled]:opacity-[0.5] fixed inset-[0] z-150 flex items-center justify-center p-[28px]
        [background:var(--color-overlay)] [backdrop-filter:blur(3px)]
        [@media(max-width:760px)]:p-[12px]"
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={t("skillTemplatesGallery")}
    >
      <div
        className={`skill-gallery flex flex-col w-[min(100%,1000px)] h-[min(740px,calc(100dvh_-_56px))] [border:1px_solid_var(--color-line)] rounded-[14px] [background:var(--color-surface)] text-[var(--color-text)] [box-shadow:var(--shadow-lg)] overflow-hidden [@media(max-width:760px)]:h-[calc(100dvh_-_24px)] [@media(max-width:760px)]:rounded-[12px] [@media(max-width:760px)]:[&:not(.skill-gallery--preview)_.skill-gallery-footer]:[display:none] ${showPreview ? "skill-gallery--preview" : ""}`}
      >
        <header
          className="skill-gallery-header flex items-center justify-between gap-[20px] p-[24px_28px]
          [border-bottom:1px_solid_var(--color-line)] [&_h2]:[font-weight:650] [&_h2]:[letter-spacing:-0.02em]
          [&_h2]:m-[5px_0_0] [@media(max-width:760px)]:p-[20px]"
        >
          <div>
            <span className="skill-eyebrow block [font-weight:550] text-[var(--color-text-muted)] [letter-spacing:0.02em]">
              {t("startFromAPreBuiltGuideline")}
            </span>
            <h2>{t("skillTemplatesGalleryLabel")}</h2>
          </div>
          <button
            className="skills-icon-button grid place-items-center w-[36px] h-[36px] p-[0] [border:0] rounded-[8px]
              [background:transparent] cursor-pointer shrink-0 [&:hover]:[background:var(--color-surface-muted)]"
            onClick={close}
            aria-label={t("closeTemplatesGallery")}
          >
            <X size={21} />
          </button>
        </header>
        <div className="skill-gallery-body flex flex-1 min-h-[0]">
          <aside
            className="skill-template-list flex-col gap-[12px] w-[300px] shrink-0 [background:var(--color-surface-muted)]
              [border-right:1px_solid_var(--color-line)] p-[24px_18px] overflow-y-auto [&_>_p]:text-[12px]
              [&_>_p]:[line-height:1.7] [&_>_p]:text-[var(--color-text-muted)] [&_>_p]:m-[0_6px_8px]
              [@media(max-width:760px)]:w-full [@media(max-width:760px)]:[border-right:0] [@media(max-width:760px)]:p-[20px]"
            aria-label={t("skillTemplates")}
          >
            <p>{t("selectATemplateThenCustomizeItToYourNeeds")}</p>
            {isLoading ? (
              <p role="status">
                <Loader2 className="animate-spin" size={20} />
                {t("loadingTemplates")}
              </p>
            ) : error ? (
              <div role="alert">
                <p>{t("unableToLoadTemplates")}</p>
                <button
                  className="ui-btn-secondary"
                  onClick={() => void reloadTemplates()}
                >
                  {t("tryAgain")}
                </button>
              </div>
            ) : (
              templates?.map((template) => (
                <button
                  className="skill-template-choice flex items-start text-left gap-[11px] p-[16px_12px] [border:1px_solid_transparent]
                    rounded-[9px] [background:transparent] cursor-pointer [&[aria-pressed=true]]:border-[var(--color-accent)]
                    [&[aria-pressed=true]]:[background:var(--color-surface)] [&[aria-pressed=true]]:[box-shadow:var(--shadow-xs)]
                    [&_>_span:nth-child(2)]:flex-1 [&_strong]:block [&_strong]:mb-[5px] [&_strong]:text-[14px]
                    [&_strong]:[font-weight:650] [&_span_span]:block [&_span_span]:text-[12px] [&_span_span]:[line-height:1.65]
                    [&_span_span]:text-[var(--color-text-muted)] [&_>_svg]:shrink-0 [&_>_svg]:text-[var(--color-text-muted)]
                    [&_>_svg]:mt-[2px]"
                  key={template.id}
                  aria-label={t("viewTemplate", { name: template.name })}
                  aria-pressed={activeId === template.id}
                  onClick={() => {
                    setSelectedId(template.id);
                    setShowPreview(true);
                    setImportError(null);
                  }}
                >
                  <span className="skill-template-symbol shrink-0 text-[var(--color-accent)] pt-[2px]">
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
            <div className="skill-template-note flex gap-[8px] p-[20px_6px_0] mt-auto text-[11px] [line-height:1.7] text-[var(--color-text-muted)] [&_svg]:shrink-0 [&_svg]:mt-[2px]">
              <Check size={16} />
              <span>{t("yourOwnPrivateCopyEditFreelyAfterAdding")}</span>
            </div>
          </aside>
          <section
            className="skill-template-preview flex-1 min-w-[0] overflow-y-auto p-[28px_32px] [@media(max-width:760px)]:p-[20px]"
            aria-label={t("templateContent")}
          >
            <button
              className="skill-back-link items-center gap-[8px] [border:0] [background:transparent] p-[8px_0] cursor-pointer skill-template-back [@media(max-width:760px)]:mb-[20px]"
              onClick={() => setShowPreview(false)}
            >
              <ArrowLeft size={16} />
              {t("backToTemplates")}
            </button>
            {loadingDetail ? (
              <div
                className="skills-empty min-h-[280px] p-[44px_24px] flex items-center justify-center flex-col gap-[12px] text-center
                [&_h3]:m-[6px_0_0] [&_h3]:text-[18px] [&_h3]:[font-weight:650] [&_p]:max-w-[45ch] [&_p]:m-[0]
                [&_p]:text-[14px] [&_p]:[line-height:1.7] [&_p]:text-[var(--color-text-muted)]"
                role="status"
              >
                <Loader2 className="animate-spin" />
                {t("loadingTemplateContent")}
              </div>
            ) : detailError ? (
              <div
                className="skills-empty min-h-[280px] p-[44px_24px] flex items-center justify-center flex-col gap-[12px] text-center
                [&_h3]:m-[6px_0_0] [&_h3]:text-[18px] [&_h3]:[font-weight:650] [&_p]:max-w-[45ch] [&_p]:m-[0]
                [&_p]:text-[14px] [&_p]:[line-height:1.7] [&_p]:text-[var(--color-text-muted)]"
                role="alert"
              >
                <p>{t("unableToLoadTemplateContent")}</p>
                <button
                  className="ui-btn-secondary"
                  onClick={() => void reloadDetail()}
                >
                  {t("tryAgain")}
                </button>
              </div>
            ) : detail ? (
              <>
                <div
                  className="skill-template-preview-heading pb-[22px] mb-[24px] [border-bottom:1px_solid_var(--color-line)]
                  [&_h3]:text-[25px] [&_h3]:[font-weight:650] [&_h3]:m-[9px_0] [&_h3]:[letter-spacing:-0.02em]
                  [&_p]:text-[var(--color-text-muted)] [&_p]:text-[13px] [&_p]:[line-height:1.7] [&_p]:m-[0]"
                >
                  <span className="skill-eyebrow block [font-weight:550] text-[var(--color-text-muted)] [letter-spacing:0.02em]">
                    {t("instructionPreview")}
                  </span>
                  <h3>{detail.name}</h3>
                  <p>{detail.description}</p>
                </div>
                <div className="skill-template-document text-[14px] [line-height:1.8] wrap-anywhere">
                  <MarkdownText text={detail.instructions} />
                </div>
              </>
            ) : (
              <div
                className="skills-empty min-h-[280px] p-[44px_24px] flex items-center justify-center flex-col gap-[12px] text-center
                [&_h3]:m-[6px_0_0] [&_h3]:text-[18px] [&_h3]:[font-weight:650] [&_p]:max-w-[45ch] [&_p]:m-[0]
                [&_p]:text-[14px] [&_p]:[line-height:1.7] [&_p]:text-[var(--color-text-muted)]"
              >
                <BookOpen />
                <p>{t("selectATemplateToViewInstructions")}</p>
              </div>
            )}
          </section>
        </div>
        {importError && (
          <p
            className="skill-gallery-error m-[0] p-[10px_28px] text-[var(--color-danger)] [background:var(--color-danger-soft)] text-[13px]"
            role="alert"
          >
            {importError}
          </p>
        )}
        <footer
          className="skill-gallery-footer items-center justify-between gap-[20px] [border-top:1px_solid_var(--color-line)]
          p-[18px_28px] [&_p]:max-w-[42ch] [&_p]:text-[var(--color-text-muted)] [&_p]:[line-height:1.6] [&_p]:m-[0]
          [@media(max-width:760px)]:p-[16px_20px] [@media(max-width:760px)]:flex-col
          [@media(max-width:760px)]:gap-[10px] [@media(max-width:760px)]:items-stretch"
        >
          <p>{t("templatesAreOnlyUsedAfterYouAddThemToYourLibrary")}</p>
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
            {t("addToMySkills")}
          </button>
        </footer>
      </div>
    </div>
  );
}
