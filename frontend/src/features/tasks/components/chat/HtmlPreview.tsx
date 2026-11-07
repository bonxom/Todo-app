import { useTranslation } from "react-i18next";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Check, Code, Copy, Eye, Maximize2, X } from "lucide-react";
import CodeBlock from "./CodeBlock";
import {
  buildHtmlPreviewDocument,
  PREVIEW_PERMISSIONS,
} from "./htmlPreviewDocument";
import "./htmlPreview.css";

export default function HtmlPreview({ code }: { code: string }) {
  const { t } = useTranslation("agent");

  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  const previewTab = useRef<HTMLButtonElement>(null);
  const codeTab = useRef<HTMLButtonElement>(null);
  const srcDoc = useMemo(() => buildHtmlPreviewDocument(code), [code]);

  useEffect(() => {
    if (expanded && srcDoc !== null) dialog.current?.showModal();
    else if (dialog.current?.open) dialog.current.close();
  }, [expanded, srcDoc]);

  async function handleCopy() {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore copy error
    }
  }

  function closeExpanded() {
    setExpanded(false);
    expandButton.current?.focus();
  }
  function onTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? "preview"
        : event.key === "End"
          ? "code"
          : tab === "preview"
            ? "code"
            : "preview";
    setTab(next);
    (next === "preview" ? previewTab : codeTab).current?.focus();
  }
  const preview =
    srcDoc !== null ? (
      <iframe
        title={t("htmlPreview")}
        className="html-preview-frame"
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        allow={PREVIEW_PERMISSIONS}
        srcDoc={srcDoc}
      />
    ) : null;

  if (srcDoc === null)
    return (
      <div className="html-preview-fallback">
        <p className="html-preview-note" role="status">
          {t("htmlIsTooLargeToPreview128KibLimitYouCanStillCopyTheCode")}
        </p>
        <CodeBlock code={code} language="html" />
      </div>
    );

  return (
    <section className="html-preview" aria-label={t("htmlDocument")}>
      <div className="chat-rich-header html-preview-toolbar">
        <div
          role="tablist"
          aria-label={t("htmlView")}
          className="html-preview-tabs"
        >
          <button
            ref={previewTab}
            type="button"
            role="tab"
            id={`${id}-preview`}
            aria-controls={`${id}-panel`}
            aria-selected={tab === "preview"}
            tabIndex={tab === "preview" ? 0 : -1}
            onKeyDown={onTabKey}
            onClick={() => setTab("preview")}
            className="ui-focus-ring"
          >
            <Eye size={14} aria-hidden="true" />
            <span>{t("preview")}</span>
          </button>
          <button
            ref={codeTab}
            type="button"
            role="tab"
            id={`${id}-code`}
            aria-controls={`${id}-panel`}
            aria-selected={tab === "code"}
            tabIndex={tab === "code" ? 0 : -1}
            onKeyDown={onTabKey}
            onClick={() => setTab("code")}
            className="ui-focus-ring"
          >
            <Code size={14} aria-hidden="true" />
            <span>{t("code")}</span>
          </button>
        </div>
        <div className="html-preview-actions">
          {tab === "preview" && (
            <button
              ref={expandButton}
              type="button"
              onClick={() => setExpanded(true)}
              aria-label={t("expandHtmlPreview")}
              className="ui-focus-ring html-preview-expand"
            >
              <Maximize2 size={14} aria-hidden="true" />
              <span>{t("expand")}</span>
            </button>
          )}
          <span className="html-preview-lang">html</span>
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? t("copied") : t("copyCode")}
            className="ui-focus-ring html-preview-copy"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-500" />
                <span className="text-emerald-500 font-medium">
                  {t("copied")}
                </span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>{t("copy")}</span>
              </>
            )}
          </button>
        </div>
      </div>
      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-${tab}`}
        tabIndex={0}
        className="ui-focus-ring"
      >
        {tab === "preview" ? (
          <>
            <p className="html-preview-note">
              {t("selfContainedPreviewExternalResourcesAreDisabled")}
            </p>
            {!expanded && preview}
          </>
        ) : (
          <pre className="html-preview-code">
            <code>{code}</code>
          </pre>
        )}
      </div>
      {createPortal(
        <dialog
          ref={dialog}
          aria-label={t("htmlPreview")}
          className="html-preview-dialog"
          // Portal events still bubble through React's chat tree. Keep the
          // dialog's Escape/Tab handling separate from the chat panel's trap.
          onKeyDown={(event) => event.stopPropagation()}
          onCancel={closeExpanded}
          onClose={closeExpanded}
        >
          <div className="html-preview-toolbar">
            <span>{t("htmlPreview")}</span>
            <button
              type="button"
              aria-label={t("closeHtmlPreview")}
              className="ui-focus-ring html-preview-expand"
              onClick={() => dialog.current?.close()}
            >
              <X size={18} aria-hidden="true" /> {t("close")}
            </button>
          </div>
          {expanded && preview}
        </dialog>,
        document.body,
      )}
    </section>
  );
}
