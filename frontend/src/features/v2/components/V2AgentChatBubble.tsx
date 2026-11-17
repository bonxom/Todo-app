import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowUpRight,
  History,
  Sparkles,
  PanelRightClose,
  PanelRight,
  Plus,
  X,
} from "lucide-react";
import { useAgentSession } from "@/features/agent/agentSessionContext";
import ChatField from "@/features/tasks/components/chat/ChatField";
import RecentConversations from "@/features/tasks/components/chat/RecentConversations";
import "@/styles/chat.css";

type DisplayMode = "compact" | "docked";

const MIN_DOCK_WIDTH = 320;
const DEFAULT_DOCK_WIDTH = 420;
const DOCK_STEP = 32;

const modeIcon: Record<DisplayMode, typeof PanelRight> = {
  compact: PanelRight,
  docked: PanelRightClose,
};

export interface V2AgentChatBubbleProps {
  triggerContainer?: HTMLElement | null;
  onDockChange?: (open: boolean, width: number) => void;
}

export default function V2AgentChatBubble({
  onDockChange,
  triggerContainer,
}: V2AgentChatBubbleProps = {}) {
  const { t } = useTranslation("v2");
  const navigate = useNavigate();
  const location = useLocation();
  const { chat } = useAgentSession();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<DisplayMode>("compact");
  const [dockWidth, setDockWidth] = useState(DEFAULT_DOCK_WIDTH);
  const [historyOpen, setHistoryOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const wasOpen = useRef(false);

  const focusComposer = () => {
    panelRef.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
  };

  useEffect(() => {
    if (isOpen) {
      const id = requestAnimationFrame(focusComposer);
      return () => cancelAnimationFrame(id);
    }
    if (wasOpen.current) triggerRef.current?.focus();
    wasOpen.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) wasOpen.current = true;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (historyOpen) {
        setHistoryOpen(false);
        return;
      }
      setIsOpen(false);
      setMode("compact");
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, historyOpen]);

  const cycleMode = () => {
    setMode((current) => (current === "compact" ? "docked" : "compact"));
  };

  const close = () => {
    setIsOpen(false);
    setHistoryOpen(false);
    setMode("compact");
  };

  const handleNewChat = async () => {
    const created = await chat.newConversation();
    if (!created) return;
    setHistoryOpen(false);
    requestAnimationFrame(focusComposer);
  };

  const handleOpenConversation = async (id: string) => {
    if (!(await chat.openConversation(id))) return;
    setHistoryOpen(false);
    requestAnimationFrame(focusComposer);
  };

  const resizeTo = (width: number) => {
    if (width <= MIN_DOCK_WIDTH - DOCK_STEP) {
      dragRef.current = null;
      close();
      return;
    }
    setDockWidth(
      Math.min(Math.max(width, MIN_DOCK_WIDTH), window.innerWidth / 2),
    );
  };

  useEffect(() => {
    onDockChange?.(mode === "docked" && isOpen, dockWidth);
  }, [onDockChange, mode, isOpen, dockWidth]);

  const modeLabel = {
    compact: t("dockChat"),
    docked: t("compactChat"),
  }[mode];
  const ModeIcon = modeIcon[mode];
  const busy = chat.loading || chat.sending || Boolean(chat.pending);

  const isFullChatPage =
    Boolean(triggerContainer) && location.pathname === "/v2/agents";
  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      className="v2-assistant-trigger"
      onClick={() => {
        if (isFullChatPage) {
          document
            .querySelector<HTMLTextAreaElement>(".v2-agent-center textarea")
            ?.focus();
          return;
        }
        if (isOpen) close();
        else setIsOpen(true);
      }}
      aria-label={t("openAssistant")}
      aria-expanded={isFullChatPage ? undefined : isOpen}
      aria-haspopup={isFullChatPage ? undefined : "dialog"}
      aria-controls={isFullChatPage ? undefined : "v2-assistant-panel"}
      data-testid="v2-assistant-trigger"
    >
      <Sparkles size={18} strokeWidth={1.7} aria-hidden="true" />
      <span className="v2-assistant-trigger-label">{t("assistant")}</span>
      {chat.sending && <span className="v2-assistant-pulse" />}
    </button>
  );

  return (
    <div
      className="v2-assistant"
      data-mode={mode}
      data-open={isOpen}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      {!triggerContainer && !isOpen && trigger}
      {triggerContainer && createPortal(trigger, triggerContainer)}

      <div
        ref={panelRef}
        id="v2-assistant-panel"
        className="v2-assistant-panel"
        hidden={!isOpen}
        role="dialog"
        aria-modal="false"
        aria-label={t("agents")}
        data-testid="v2-assistant-panel"
        style={
          mode === "docked"
            ? ({ "--v2-dock-width": `${dockWidth}px` } as CSSProperties)
            : undefined
        }
      >
        {mode === "docked" && (
          <div
            className="v2-assistant-resize"
            role="separator"
            aria-orientation="vertical"
            aria-label={t("resizeChat")}
            aria-valuemin={MIN_DOCK_WIDTH}
            aria-valuemax={Math.floor(window.innerWidth / 2)}
            aria-valuenow={Math.round(dockWidth)}
            tabIndex={0}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              dragRef.current = {
                startX: event.clientX,
                startWidth:
                  panelRef.current?.getBoundingClientRect().width ?? dockWidth,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!dragRef.current) return;
              resizeTo(
                dragRef.current.startWidth +
                  dragRef.current.startX -
                  event.clientX,
              );
            }}
            onPointerUp={() => {
              dragRef.current = null;
            }}
            onPointerCancel={() => {
              dragRef.current = null;
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                resizeTo(dockWidth + DOCK_STEP);
              } else if (event.key === "ArrowRight") {
                event.preventDefault();
                resizeTo(dockWidth - DOCK_STEP);
              }
            }}
          />
        )}

        <header className="v2-assistant-header">
          <div className="v2-assistant-heading">
            <div className="v2-assistant-identity">
              <span className="v2-assistant-brand">
                <Sparkles size={20} aria-hidden="true" />
              </span>
              <div>
                <p className="v2-assistant-title">{t("assistant")}</p>
                <p className="v2-assistant-subtitle">
                  {t("assistantSubtitle")}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="v2-btn v2-assistant-close"
              onClick={close}
              aria-label={t("closeAssistant")}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="v2-assistant-toolbar">
            <button
              type="button"
              className="v2-btn v2-assistant-new"
              onClick={() => void handleNewChat()}
              disabled={busy}
              aria-label={t("newChat")}
            >
              <Plus size={16} aria-hidden="true" />
              <span>{t("newChat")}</span>
            </button>
            <div className="v2-assistant-actions">
              <button
                type="button"
                className="v2-btn v2-assistant-action"
                onClick={() => setHistoryOpen((open) => !open)}
                aria-expanded={historyOpen}
                aria-controls="v2-assistant-history"
                aria-label={t("chatHistory")}
                title={t("chatHistory")}
              >
                <History size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="v2-btn v2-assistant-action"
                onClick={() => {
                  close();
                  navigate(
                    chat.conversationId
                      ? `/v2/agents?conversation=${chat.conversationId}`
                      : "/v2/agents",
                  );
                }}
                aria-label={t("openInAgents")}
                title={t("openInAgents")}
              >
                <ArrowUpRight size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="v2-btn v2-assistant-action"
                onClick={cycleMode}
                aria-label={modeLabel}
                aria-pressed={mode === "docked"}
                title={modeLabel}
              >
                <ModeIcon size={17} aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        {historyOpen && (
          <div
            id="v2-assistant-history"
            className="v2-assistant-history"
            role="group"
            aria-label={t("chatHistory")}
          >
            <RecentConversations
              onOpen={(id: string) => void handleOpenConversation(id)}
              disabled={busy}
              onClose={() => setHistoryOpen(false)}
            />
          </div>
        )}

        <div className="v2-assistant-body">
          <ChatField
            chat={chat}
            messages={chat.messages}
            onSendMessage={chat.send}
            isTyping={chat.sending}
            disabled={chat.locked}
          />
        </div>
      </div>
    </div>
  );
}
