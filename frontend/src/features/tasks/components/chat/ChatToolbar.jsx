import { useEffect, useId, useRef, useState } from "react";
import {
  Paperclip,
  Image,
  ChevronRight,
  Bot,
  Zap,
  MessageCircleQuestion,
  ListTodo,
} from "lucide-react";

export default function ChatToolbar({ chat, disabled, onFiles, onImages }) {
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
    <div className="chat-inline-tools">
      <div className="chat-toolbar">
        <div
          className="chat-toolbar-actions"
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
            className="chat-tool ui-focus-ring"
            aria-label={open ? "Collapse options" : "Expand options"}
            aria-expanded={open}
            aria-controls={open ? optionsId : undefined}
            disabled={disabled}
            onClick={() => setOpen(!open)}
            title={open ? "Hide tools" : "Show tools"}
          >
            <ChevronRight
              size={18}
              className={open ? "rotate-180" : ""}
              aria-hidden="true"
            />
          </button>
          {Boolean(chat?.capabilities?.taskProposals) && (
            <button
              type="button"
              className={`chat-tool ui-focus-ring ${chat?.intent === "task_proposal" ? "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 font-medium" : ""}`}
              title="Plan tasks"
              aria-label="Plan tasks"
              aria-pressed={chat?.intent === "task_proposal"}
              disabled={disabled || chat?.locked}
              onClick={() =>
                chat?.setIntent?.(
                  chat?.intent === "task_proposal"
                    ? undefined
                    : "task_proposal",
                )
              }
            >
              <ListTodo size={17} />
            </button>
          )}
          {open && (
            <div
              id={optionsId}
              className="chat-expanded-icons"
              role="group"
              aria-label="Chat tools"
            >
              <button
                type="button"
                className="chat-tool ui-focus-ring"
                title="Attach image"
                aria-label="Attach image"
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
                className="chat-tool ui-focus-ring"
                title="Attach file"
                aria-label="Attach file"
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
                  className={`chat-tool chat-mode-toggle ui-focus-ring chat-mode-toggle--${chat.mode}`}
                  aria-pressed={chat.mode === "ask"}
                  aria-label={`Agent mode: ${chat.mode}`}
                  title={`${chat.mode === "auto" ? "Auto" : "Ask"} mode — click to switch`}
                  disabled={chat.locked}
                  onClick={() =>
                    chat.setMode(chat.mode === "auto" ? "ask" : "auto")
                  }
                >
                  <Bot size={17} />
                  <span className="chat-mode-indicator" aria-hidden="true">
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
