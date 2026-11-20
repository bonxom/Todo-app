import { useTranslation } from "react-i18next";
import { useEffect, useId, useRef, useState } from "react";
import {
  Paperclip,
  Image,
  ChevronRight,
  Bot,
  Zap,
  MessageCircleQuestion,
} from "lucide-react";

export default function ChatToolbar({ chat, disabled, onFiles, onImages }) {
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
  return (
    <div
      className="chat-inline-tools self-center [&_.chat-mode-toggle]:relative
      [&_.chat-mode-toggle]:[transition:background-color_160ms,border-color_160ms,color_160ms]
      [&_.chat-mode-toggle--ask]:text-[var(--color-accent-strong)]
      [&_.chat-mode-toggle--ask]:[background:var(--color-accent-soft)]
      [&_.chat-mode-toggle--ask]:border-[var(--color-accent)]"
    >
      <div className="chat-toolbar flex items-center gap-[4px] justify-between">
        <div
          className="chat-toolbar-actions flex items-center gap-[4px] static"
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
            className="chat-tool inline-flex items-center justify-center gap-[5px] min-h-[36px] cursor-pointer [&:disabled]:opacity-[0.5] ui-focus-ring"
            aria-label={open ? t("collapseOptions") : t("expandOptions")}
            aria-expanded={open}
            aria-controls={open ? optionsId : undefined}
            disabled={disabled}
            onClick={() => setOpen(!open)}
            title={open ? t("hideTools") : t("showTools")}
          >
            <ChevronRight
              size={18}
              className={open ? "rotate-180" : ""}
              aria-hidden="true"
            />
          </button>
          {open && (
            <div
              id={optionsId}
              className="chat-expanded-icons flex items-center gap-[4px]"
              role="group"
              aria-label={t("chatTools")}
            >
              <button
                type="button"
                className="chat-tool inline-flex items-center justify-center gap-[5px] min-h-[36px] cursor-pointer [&:disabled]:opacity-[0.5] ui-focus-ring"
                title={t("attachImage")}
                aria-label={t("attachImage")}
                onClick={() => {
                  onImages();
                  setOpen(false);
                  toggle.current?.focus();
                }}
              >
                <Image size={16} />
              </button>
              <button
                type="button"
                className="chat-tool inline-flex items-center justify-center gap-[5px] min-h-[36px] cursor-pointer [&:disabled]:opacity-[0.5] ui-focus-ring"
                title={t("attachFile")}
                aria-label={t("attachFile")}
                onClick={() => {
                  onFiles();
                  setOpen(false);
                  toggle.current?.focus();
                }}
              >
                <Paperclip size={16} />
              </button>
              {chat && (
                <button
                  type="button"
                  className={`chat-tool inline-flex items-center justify-center gap-[5px] min-h-[36px] cursor-pointer [&:disabled]:opacity-[0.5] chat-mode-toggle ui-focus-ring chat-mode-toggle--${chat.mode}`}
                  aria-pressed={chat.mode === "ask"}
                  aria-label={t("agentMode", {
                    mode: t(
                      chat.mode === "auto" ? "autoModeValue" : "askModeValue",
                    ),
                  })}
                  title={t("switchMode", {
                    mode: t(chat.mode === "auto" ? "auto" : "ask"),
                  })}
                  disabled={chat.locked}
                  onClick={() =>
                    chat.setMode(chat.mode === "auto" ? "ask" : "auto")
                  }
                >
                  <Bot size={17} />
                  <span
                    className="chat-mode-indicator absolute right-[-3px] bottom-[-3px] grid place-items-center w-[15px] h-[15px] rounded-[50%] [background:inherit] [border:1px_solid_currentColor]"
                    aria-hidden="true"
                  >
                    {chat.mode === "ask" ? (
                      <MessageCircleQuestion size={10} />
                    ) : (
                      <Zap size={10} />
                    )}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
