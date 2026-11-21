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
        className="html-preview-frame block w-full h-[420px] [border:0] [background:white]"
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        allow={PREVIEW_PERMISSIONS}
        srcDoc={srcDoc}
      />
    ) : null;

  if (srcDoc === null)
    return (
      <div className="html-preview-fallback my-[0.75rem] min-w-[0] max-w-full">
        <p
          className="html-preview-note m-[0] text-[var(--color-text-muted)] text-[0.7rem]"
          role="status"
        >
          {t("htmlIsTooLargeToPreview128KibLimitYouCanStillCopyTheCode")}
        </p>
        <CodeBlock code={code} language="html" />
      </div>
    );

  return (
    <section
      className="html-preview my-[0.75rem] min-w-[0] max-w-full overflow-hidden [border:1px_solid_var(--color-line)]
      rounded-[0.75rem] [background:var(--color-surface)] [box-shadow:var(--shadow-xs)]"
      aria-label={t("htmlDocument")}
    >
      <div
        className="chat-rich-header html-preview-toolbar flex items-center justify-between p-[0.375rem_0.75rem]
        [border-bottom:1px_solid_var(--color-line)] [background:var(--color-surface-muted)]
        text-[var(--color-text-muted)] text-[0.75rem]"
      >
        <div
          role="tablist"
          aria-label={t("htmlView")}
          className="html-preview-tabs flex items-center gap-[0.25rem] [&_button]:inline-flex [&_button]:items-center
            [&_button]:gap-[0.375rem] [&_button]:rounded-[0.5rem] [&_button]:p-[0.25rem_0.625rem]
            [&_button]:cursor-pointer [&_button]:[transition:background-color_150ms_ease,color_150ms_ease]
            [&_button[aria-selected=true]]:[background:var(--color-surface)]
            [&_button[aria-selected=true]]:[box-shadow:var(--shadow-xs)]"
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
        <div className="html-preview-actions flex items-center gap-[0.5rem]">
          {tab === "preview" && (
            <button
              ref={expandButton}
              type="button"
              onClick={() => setExpanded(true)}
              aria-label={t("expandHtmlPreview")}
              className="ui-focus-ring html-preview-expand inline-flex items-center gap-[0.375rem] cursor-pointer
                [transition:background-color_150ms_ease,color_150ms_ease] [&:hover]:[background:var(--color-line)]"
            >
              <Maximize2 size={14} aria-hidden="true" />
              <span>{t("expand")}</span>
            </button>
          )}
          <span className="html-preview-lang [font-family:var(--font-mono,ui-monospace,SFMono-Regular,Menlo,monospace)] text-[0.6875rem] text-[var(--color-text-muted)] lowercase">
            html
          </span>
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? t("copied") : t("copyCode")}
            className="ui-focus-ring html-preview-copy inline-flex items-center gap-[0.375rem] cursor-pointer
              [transition:background-color_150ms_ease,color_150ms_ease] [&:hover]:[background:var(--color-line)]"
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
            <p className="html-preview-note m-[0] text-[var(--color-text-muted)] text-[0.7rem]">
              {t("selfContainedPreviewExternalResourcesAreDisabled")}
            </p>
            {!expanded && preview}
          </>
        ) : (
          <pre
            className="html-preview-code m-[0] overflow-x-auto p-[0.875rem]
            [font-family:var(--font-mono,ui-monospace,SFMono-Regular,Menlo,monospace)] text-[0.75rem] [line-height:1.625]
            text-[var(--color-text)]"
          >
            <code>{code}</code>
          </pre>
        )}
      </div>
      {createPortal(
        <dialog
          ref={dialog}
          aria-label={t("htmlPreview")}
          className="html-preview-dialog m-auto p-[0] w-[min(1200px,96vw)] max-w-[96vw] h-[90dvh] max-h-[90dvh]
            [border:1px_solid_var(--color-line)] rounded-[0.75rem] [background:var(--color-surface)]
            text-[var(--color-text)] overflow-hidden [&[open]]:flex [&[open]]:flex-col
            [&::backdrop]:[background:rgb(0_0_0_/_55%)] [&_.html-preview-frame]:flex-1 [&_.html-preview-frame]:min-h-[0]"
          // Portal events still bubble through React's chat tree. Keep the
          // dialog's Escape/Tab handling separate from the chat panel's trap.
          onKeyDown={(event) => event.stopPropagation()}
          onCancel={closeExpanded}
          onClose={closeExpanded}
        >
          <div
            className="html-preview-toolbar flex items-center justify-between p-[0.375rem_0.75rem]
            [border-bottom:1px_solid_var(--color-line)] [background:var(--color-surface-muted)]
            text-[var(--color-text-muted)] text-[0.75rem]"
          >
            <span>{t("htmlPreview")}</span>
            <button
              type="button"
              aria-label={t("closeHtmlPreview")}
              className="ui-focus-ring html-preview-expand inline-flex items-center gap-[0.375rem] cursor-pointer
                [transition:background-color_150ms_ease,color_150ms_ease] [&:hover]:[background:var(--color-line)]"
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
