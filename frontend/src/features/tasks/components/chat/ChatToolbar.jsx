import { useTranslation } from "react-i18next";
import { useEffect, useId, useRef, useState } from "react";
import {
  Paperclip,
  Image,
  Plus,
  Bot,
  Zap,
  MessageCircleQuestion,
} from "lucide-react";

const inlineToolClass =
  "chat-tool ui-focus-ring inline-flex min-h-[36px] cursor-pointer items-center justify-center gap-[5px] disabled:opacity-50";

export default function ChatToolbar({
  chat,
  disabled,
  onFiles,
  onImages,
  workspace = false,
}) {
  const { t } = useTranslation("agent");
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const toggle = useRef(null);
  const optionsId = useId();

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
    };
  }, [open]);

  const ask = chat?.mode === "ask";
  const modeName = t(ask ? "askModeValue" : "autoModeValue");
  const toolClass = workspace
    ? "v2-btn v2-glass-pill v2-glass-pill-icon ui-focus-ring disabled:opacity-50"
    : inlineToolClass;

  function attachment(label, Icon, openPicker) {
    return (
      <button
        type="button"
        className={toolClass}
        title={t(label)}
        aria-label={t(label)}
        disabled={disabled}
        onClick={() => {
          openPicker();
          if (!workspace) {
            setOpen(false);
            toggle.current?.focus();
          }
        }}
      >
        <Icon size={workspace ? 18 : 16} aria-hidden="true" />
      </button>
    );
  }

  const mode = chat && (
    <button
      type="button"
      className={
        workspace
          ? "v2-btn v2-glass-pill ui-focus-ring min-w-0 px-2.5! aria-pressed:border-[var(--v2-accent)]! disabled:opacity-50"
          : `${inlineToolClass} chat-mode-toggle chat-mode-toggle--${chat.mode}`
      }
      aria-pressed={ask}
      aria-label={t("agentMode", { mode: modeName })}
      title={t("switchMode", { mode: modeName })}
      disabled={disabled || chat.locked}
      onClick={() => chat.setMode(ask ? "auto" : "ask")}
    >
      <Bot size={17} className="shrink-0" aria-hidden="true" />
      {workspace ? (
        <span className="truncate first-letter:uppercase">{modeName}</span>
      ) : (
        <span
          className="chat-mode-indicator absolute -right-[3px] -bottom-[3px] grid size-[15px] place-items-center rounded-full [background:inherit] [border:1px_solid_currentColor]"
          aria-hidden="true"
        >
          {ask ? <MessageCircleQuestion size={10} /> : <Zap size={10} />}
        </span>
      )}
    </button>
  );

  if (workspace) {
    return (
      <div
        role="group"
        aria-label={t("chatTools")}
        className="flex min-w-0 flex-wrap items-center gap-1.5"
      >
        {attachment("attachFile", Paperclip, onFiles)}
        {attachment("attachImage", Image, onImages)}
        {mode}
      </div>
    );
  }

  return (
    <div
      className="chat-inline-tools self-center [&_.chat-mode-toggle]:relative
      [&_.chat-mode-toggle]:[transition:background-color_160ms,border-color_160ms,color_160ms]
      [&_.chat-mode-toggle--ask]:text-[var(--color-accent-strong)]
      [&_.chat-mode-toggle--ask]:[background:var(--color-accent-soft)]
      [&_.chat-mode-toggle--ask]:border-[var(--color-accent)]"
    >
      <div className="chat-toolbar flex items-center justify-between gap-1">
        <div
          className="chat-toolbar-actions static flex items-center gap-1"
          ref={root}
          onKeyDown={(event) => {
            if (event.key === "Escape" && open) {
              event.stopPropagation();
              setOpen(false);
              toggle.current?.focus();
            }
          }}
        >
          <button
            ref={toggle}
            type="button"
            className={inlineToolClass}
            aria-label={t(open ? "collapseOptions" : "expandOptions")}
            aria-expanded={open}
            aria-controls={open ? optionsId : undefined}
            disabled={disabled}
            onClick={() => setOpen(!open)}
            title={t(open ? "hideTools" : "showTools")}
          >
            <Plus
              size={18}
              className={`transition-transform duration-150 ${open ? "rotate-45" : ""}`}
              aria-hidden="true"
            />
          </button>
          {open && (
            <div
              id={optionsId}
              className="chat-expanded-icons flex items-center gap-1"
              role="group"
              aria-label={t("chatTools")}
            >
              {attachment("attachImage", Image, onImages)}
              {attachment("attachFile", Paperclip, onFiles)}
              {mode}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
