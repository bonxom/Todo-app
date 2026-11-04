import { useEffect, useRef, useState } from "react";
import {
  X,
  Maximize2,
  Minimize2,
  PanelRight,
  Plus,
  History,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { useConversationChat } from "../../hooks/useConversationChat";
import ChatField from "./ChatField";
import RecentConversations from "./RecentConversations";
import "@/styles/chat.css";

const SmallChat = ({ onClose, isOpen = true }) => {
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyButton = useRef(null);
  const [displayMode, setDisplayMode] = useState("compact");
  const panelRef = useRef(null);
  const dragRef = useRef(null);
  useEffect(() => {
    if (!isOpen) return;
    const id = requestAnimationFrame(() => {
      const field = panelRef.current?.querySelector("textarea:not([disabled])");
      if (field && !field.closest("[hidden]")) field.focus();
      else panelRef.current?.querySelector("button:not([disabled])")?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    const workspace = panel?.closest(".ui-workspace-layout");
    const background = [...(workspace?.children ?? [])]
      .filter((element) => !element.contains(panel))
      .map((element) => ({ element, inert: element.hasAttribute("inert") }));
    const originalOverflow = document.body.style.overflow;
    const update = () => {
      const mobile = window.innerWidth <= 640;
      for (const { element, inert } of background)
        element.toggleAttribute("inert", mobile || inert);
      document.body.style.overflow = mobile ? "hidden" : originalOverflow;
    };
    update();
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      for (const { element, inert } of background)
        element.toggleAttribute("inert", inert);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);
  const [dockWidth, setDockWidth] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const minimumDockWidth = 280;

  useEffect(() => {
    const workspace = panelRef.current?.closest(".ui-workspace-layout");
    if (!workspace || dockWidth === null) return;
    workspace.style.setProperty(
      "--assistant-dock-preferred-width",
      `${dockWidth}px`,
    );
    return () =>
      workspace.style.removeProperty("--assistant-dock-preferred-width");
  }, [dockWidth]);

  const stopResize = () => {
    dragRef.current = null;
    setIsResizing(false);
  };
  const resizeDock = (width) => {
    if (width <= minimumDockWidth) {
      stopResize();
      onClose();
      return;
    }
    setDockWidth(Math.min(width, window.innerWidth / 2));
  };
  const nextDisplayMode = {
    compact: "expanded",
    expanded: "docked",
    docked: "compact",
  };
  const resizeLabel = {
    compact: "Expand chat",
    expanded: "Dock chat to right",
    docked: "Restore chat size",
  }[displayMode];
  const chat = useConversationChat();
  const [chatRevision, setChatRevision] = useState(0);

  const handleOpenConversation = async (id) => {
    if (!(await chat.openConversation(id))) return;
    if (id !== chat.conversationId) setChatRevision((revision) => revision + 1);
    setHistoryOpen(false);
    requestAnimationFrame(() => {
      const input = panelRef.current?.querySelector("textarea");
      if (input && !input.closest("[hidden]")) input.focus();
      else historyButton.current?.focus();
    });
  };

  const handleNewChat = async () => {
    if (await chat.newConversation()) {
      setChatRevision((revision) => revision + 1);
      setHistoryOpen(false);
      requestAnimationFrame(() =>
        panelRef.current?.querySelector("textarea")?.focus(),
      );
    }
  };

  return (
    <div
      ref={panelRef}
      className={`ui-assistant-panel ui-assistant-panel--${displayMode}`}
      data-resizing={isResizing}
      style={
        dockWidth === null
          ? undefined
          : { "--assistant-dock-preferred-width": `${dockWidth}px` }
      }
      role="region"
      aria-label="Assistant chat"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented) {
          if (historyOpen) {
            setHistoryOpen(false);
            historyButton.current?.focus();
          } else onClose();
          event.stopPropagation();
        }
        if (event.key === "Tab" && window.innerWidth <= 640) {
          const focusable = [
            ...panelRef.current.querySelectorAll(
              "button, input, textarea, select, a[href], [tabindex]",
            ),
          ].filter(
            (element) =>
              !element.disabled &&
              element.tabIndex >= 0 &&
              element.getClientRects().length > 0 &&
              !element.closest("[hidden]"),
          );
          const first = focusable[0],
            last = focusable.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      {displayMode === "docked" && (
        <div
          className="ui-assistant-resize-handle ui-focus-ring"
          role="separator"
          aria-label="Resize chat sidebar"
          aria-orientation="vertical"
          aria-valuemin={minimumDockWidth}
          aria-valuemax={Math.floor(window.innerWidth / 2)}
          aria-valuenow={Math.round(
            Math.min(
              dockWidth ?? window.innerWidth * 0.32,
              window.innerWidth / 2,
            ),
          )}
          tabIndex={0}
          title="Drag to resize. Drag all the way closed to close chat."
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            dragRef.current = {
              x: event.clientX,
              width: panelRef.current.getBoundingClientRect().width,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
            setIsResizing(true);
          }}
          onPointerMove={(event) => {
            if (!dragRef.current) return;
            resizeDock(
              dragRef.current.width + dragRef.current.x - event.clientX,
            );
          }}
          onPointerUp={stopResize}
          onPointerCancel={stopResize}
          onLostPointerCapture={stopResize}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            resizeDock(
              panelRef.current.getBoundingClientRect().width +
                (event.key === "ArrowLeft" ? 24 : -24),
            );
          }}
        />
      )}
      <div className="ui-assistant-header">
        <div className="flex items-center justify-between gap-3">
          <div className="ui-assistant-status">
            <span className="chat-brand-icon" aria-hidden="true">
              <Sparkles size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-text)]">
                Orbit Assistant
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              ref={historyButton}
              type="button"
              className="ui-icon-button ui-focus-ring"
              aria-label="Chat history"
              title="Chat history"
              aria-expanded={historyOpen}
              disabled={chat.loading || chat.sending || Boolean(chat.pending)}
              onClick={() => setHistoryOpen((open) => !open)}
            >
              <History size={18} />
            </button>
            <button
              type="button"
              onClick={handleNewChat}
              disabled={chat.loading || chat.sending}
              className="ui-icon-button ui-focus-ring h-8 w-8 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="New chat"
              title="New conversation"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                setDisplayMode((current) => nextDisplayMode[current])
              }
              className="chat-display-mode ui-icon-button ui-focus-ring h-8 w-8"
              aria-label={resizeLabel}
              title={
                {
                  compact: "Expand",
                  expanded: "Dock to the right",
                  docked: "Compact view",
                }[displayMode]
              }
            >
              {displayMode === "docked" ? (
                <Minimize2 className="h-4 w-4" />
              ) : displayMode === "expanded" ? (
                <PanelRight className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ui-icon-button ui-focus-ring h-8 w-8"
              aria-label="Close chat"
              title="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="chat-body">
        {historyOpen && (
          <div className="chat-history-view">
            <button
              type="button"
              className="chat-history-back ui-focus-ring"
              aria-label="Back to conversation"
              onClick={() => {
                setHistoryOpen(false);
                historyButton.current?.focus();
              }}
            >
              <ArrowLeft size={16} /> Back to conversation
            </button>
            {chat.error && (
              <p role="alert" className="chat-error">
                {chat.error}
              </p>
            )}
            <RecentConversations
              expanded
              onClose={() => {
                setHistoryOpen(false);
                historyButton.current?.focus();
              }}
              onOpen={handleOpenConversation}
              disabled={chat.loading || chat.sending}
            />
          </div>
        )}
        <div hidden={historyOpen} className="chat-field-container">
          <ChatField
            key={chatRevision}
            chat={{ ...chat, openConversation: handleOpenConversation }}
            messages={chat.messages}
            onSendMessage={chat.send}
            isTyping={chat.sending}
            disabled={chat.locked || Boolean(chat.error)}
          />
        </div>
      </div>
    </div>
  );
};

export default SmallChat;
