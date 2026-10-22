import { useEffect, useRef, useState } from "react";
import { X, Maximize2, Minimize2, PanelRight, Plus } from "lucide-react";
import { useConversationChat } from "../../hooks/useConversationChat";
import ChatField from "./ChatField";

const SmallChat = ({ onClose }) => {
  const [displayMode, setDisplayMode] = useState("compact");
  const panelRef = useRef(null);
  const dragRef = useRef(null);
  const [dockWidth, setDockWidth] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const minimumDockWidth = 280;

  useEffect(() => {
    const workspace = panelRef.current?.closest(".ui-workspace-layout");
    if (!workspace || dockWidth === null) return;
    workspace.style.setProperty("--assistant-dock-preferred-width", `${dockWidth}px`);
    return () => workspace.style.removeProperty("--assistant-dock-preferred-width");
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
  const nextDisplayMode = { compact: "expanded", expanded: "docked", docked: "compact" };
  const resizeLabel = { compact: "Expand chat", expanded: "Dock chat to right", docked: "Restore chat size" }[displayMode];
  const chat = useConversationChat();
  const [chatRevision, setChatRevision] = useState(0);

  const handleNewChat = async () => {
    if (await chat.newConversation()) {
      setChatRevision((revision) => revision + 1);
    }
  };

  return (
    <div
      ref={panelRef}
      className={`ui-assistant-panel ui-assistant-panel--${displayMode}`}
      data-resizing={isResizing}
      style={dockWidth === null ? undefined : { "--assistant-dock-preferred-width": `${dockWidth}px` }}
      role="region"
      aria-label="Assistant chat"
    >
      {displayMode === "docked" && <div
        className="ui-assistant-resize-handle ui-focus-ring"
        role="separator"
        aria-label="Resize chat sidebar"
        aria-orientation="vertical"
        aria-valuemin={minimumDockWidth}
        aria-valuemax={Math.floor(window.innerWidth / 2)}
        aria-valuenow={Math.round(Math.min(dockWidth ?? window.innerWidth * 0.32, window.innerWidth / 2))}
        tabIndex={0}
        title="Kéo để đổi chiều rộng. Kéo hẹp hết để đóng chat."
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          dragRef.current = { x: event.clientX, width: panelRef.current.getBoundingClientRect().width };
          event.currentTarget.setPointerCapture(event.pointerId);
          setIsResizing(true);
        }}
        onPointerMove={(event) => {
          if (!dragRef.current) return;
          resizeDock(dragRef.current.width + dragRef.current.x - event.clientX);
        }}
        onPointerUp={stopResize}
        onPointerCancel={stopResize}
        onLostPointerCapture={stopResize}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          resizeDock(panelRef.current.getBoundingClientRect().width + (event.key === "ArrowLeft" ? 24 : -24));
        }}
      />}
      <div className="ui-assistant-header">
        <div className="flex items-center justify-between gap-3">
          <div className="ui-assistant-status">
            <div className="ui-assistant-status-dot" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-text)]">
                Assistant
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleNewChat}
              disabled={chat.loading || chat.sending}
              className="ui-icon-button ui-focus-ring h-8 w-8 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="New chat"
              title="New chat"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode((current) => nextDisplayMode[current])}
              className="ui-icon-button ui-focus-ring h-8 w-8"
              aria-label={resizeLabel}
              title={resizeLabel}
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
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-[var(--color-canvas)]">
        <ChatField
          key={chatRevision}
          chat={chat}
          messages={chat.messages}
          onSendMessage={chat.send}
          isTyping={chat.sending}
          disabled={chat.locked || Boolean(chat.error)}
        />
      </div>
    </div>
  );
};

export default SmallChat;
