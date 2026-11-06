import { AgentNavigation } from "./AgentNavigation";
import { useEffect, useRef, useState } from "react";
import {
  History,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  X,
  AlertCircle,
  Plus,
  Loader2,
} from "lucide-react";
import { useAgentSession } from "./agentSessionContext";
import { useAgentNavigation } from "./useAgentNavigation";
import { AgentHistoryList } from "./AgentHistoryList";
import { AgentContextPanel } from "./AgentContextPanel";
import { AgentActivityList } from "./AgentActivityList";
import { useModalKeyboard } from "@/shared/hooks/useModalKeyboard";
import { AgentDiscardDialog } from "./AgentDiscardDialog";
import ChatField from "@/features/tasks/components/chat/ChatField";
import "@/styles/chat.css";
import "./agentWorkspace.css";

const DESKTOP_BP = 1280;
const TABLET_BP = 768;
const isMobileWidth = (width: number) => width < TABLET_BP;

const STARTER_SUGGESTIONS = [
  "Plan today's schedule",
  "Break down tasks",
  "Review priority tasks",
];

export default function AgentPage() {
  const { chat, setDraft } = useAgentSession();
  const {
    activeConversationId,
    selectConversation,
    startNewChat,
    discardPromptOpen,
    confirmDiscard,
    cancelDiscard,
  } = useAgentNavigation();

  // Responsive state
  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1440,
  );
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [contextDrawerOpen, setContextDrawerOpen] = useState(false);
  const [desktopRightPanelOpen, setDesktopRightPanelOpen] = useState(true);

  const historyDialogRef = useRef<HTMLDivElement>(null);
  const contextDialogRef = useRef<HTMLDivElement>(null);
  useModalKeyboard(
    isMobileWidth(windowWidth) && historyDrawerOpen,
    historyDialogRef,
    () => setHistoryDrawerOpen(false),
  );
  useModalKeyboard(
    windowWidth < DESKTOP_BP && contextDrawerOpen,
    contextDialogRef,
    () => setContextDrawerOpen(false),
  );
  // Trigger buttons refs for focus return
  const historyTriggerRef = useRef<HTMLButtonElement>(null);
  const contextTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isDesktop = windowWidth >= DESKTOP_BP;
  const isMobile = windowWidth < TABLET_BP;

  // Accessible live status text
  const liveStatus = chat.sending
    ? "Sending message..."
    : chat.loading
      ? "Loading conversation..."
      : chat.pending
        ? "Processing..."
        : chat.error
          ? `Error: ${chat.error}`
          : "";

  const handleSelectStarter = (text: string) => {
    setDraft((prev) => ({ ...prev, text }));
  };

  const isUnavailable = Boolean(
    chat.error &&
    (chat.error.includes("không khả dụng") ||
      chat.error.includes("unavailable") ||
      chat.error.includes("Unable to load")),
  );

  return (
    <div className="agent-workspace">
      {/* Live region for accessibility */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveStatus}
      </div>

      {/* Discard confirmation dialog */}
      <AgentDiscardDialog
        isOpen={discardPromptOpen || chat.discardRequest}
        onConfirm={
          chat.discardRequest ? () => chat.resolveDiscard(true) : confirmDiscard
        }
        onCancel={
          chat.discardRequest ? () => chat.resolveDiscard(false) : cancelDiscard
        }
      />

      {/* Desktop / Tablet Left Column: Conversation History */}
      {!isMobile && (
        <aside className="agent-history-col flex flex-col">
          <div className="border-b border-[var(--color-line)] p-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Conversation History
            </h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <AgentHistoryList
              activeConversationId={chat.conversationId || activeConversationId}
              onSelectConversation={selectConversation}
              onNewChat={startNewChat}
              disabled={chat.loading || chat.sending || Boolean(chat.pending)}
            />
          </div>
        </aside>
      )}

      {/* Mobile Drawer: Conversation History */}
      {isMobile && historyDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Conversation history"
          ref={historyDialogRef}
          className="fixed inset-0 z-50 flex bg-black/50"
        >
          <div className="flex h-full w-4/5 max-w-xs flex-col bg-[var(--color-surface)] shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--color-line)] p-3">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">
                Conversation History
              </h2>
              <button
                type="button"
                onClick={() => {
                  setHistoryDrawerOpen(false);
                  historyTriggerRef.current?.focus();
                }}
                className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"
                aria-label="Close history"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <AgentHistoryList
                activeConversationId={
                  chat.conversationId || activeConversationId
                }
                onSelectConversation={(id) => {
                  selectConversation(id);
                  setHistoryDrawerOpen(false);
                }}
                onNewChat={() => {
                  startNewChat();
                  setHistoryDrawerOpen(false);
                }}
                disabled={chat.loading || chat.sending || Boolean(chat.pending)}
              />
            </div>
          </div>
          <div
            className="flex-1"
            onClick={() => {
              setHistoryDrawerOpen(false);
              historyTriggerRef.current?.focus();
            }}
          />
        </div>
      )}

      {/* Center Column: Chat Field & Messages */}
      <section aria-label="Agent conversation" className="agent-center-col">
        {/* Workspace Sub-header */}
        <header className="agent-chat-header">
          <div className="agent-chat-identity">
            {isMobile && (
              <button
                ref={historyTriggerRef}
                type="button"
                onClick={() => setHistoryDrawerOpen(true)}
                className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"
                aria-label="Open conversation history"
              >
                <History className="h-5 w-5" />
              </button>
            )}
            <Sparkles className="h-5 w-5 text-[var(--color-accent)]" />
            <span className="font-semibold text-[var(--color-text)]">
              Orbit Agent
            </span>
          </div>

          <AgentNavigation active="chat" />
          <div className="agent-chat-context-toggle">
            {isDesktop ? (
              <button
                type="button"
                onClick={() => setDesktopRightPanelOpen((open) => !open)}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
                aria-label={
                  desktopRightPanelOpen
                    ? "Close context panel"
                    : "Open context panel"
                }
              >
                {desktopRightPanelOpen ? (
                  <>
                    <PanelRightClose className="h-4 w-4" />
                    <span>Collapse</span>
                  </>
                ) : (
                  <>
                    <PanelRightOpen className="h-4 w-4" />
                    <span>Context & Actions</span>
                  </>
                )}
              </button>
            ) : (
              <button
                ref={contextTriggerRef}
                type="button"
                onClick={() => setContextDrawerOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
                aria-label="Open context and actions panel"
              >
                <PanelRightOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Context & Actions</span>
              </button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {chat.loading && !chat.conversationId ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" />
            </div>
          ) : isUnavailable ? (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-[var(--color-text)]">
                Conversation unavailable
              </h3>
              <p className="mt-1 max-w-sm text-sm text-[var(--color-text-muted)]">
                The conversation you are trying to access does not exist, was deleted, or you do not have permission to view it.
              </p>
              <button
                type="button"
                onClick={startNewChat}
                className="ui-btn-primary mt-4"
              >
                <Plus className="h-4 w-4" />
                <span>Start new conversation</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Empty state starters when no messages yet */}
              {chat.messages.length === 0 && !chat.loading && (
                <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] shadow-xs">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-[var(--color-text)]">
                    Hello! How can I help you today?
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                    Choose a prompt below or type your request to get started:
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {STARTER_SUGGESTIONS.map((starter) => (
                      <button
                        key={starter}
                        type="button"
                        onClick={() => handleSelectStarter(starter)}
                        className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface-muted)] px-4 py-1.5 text-xs font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-muted)]"
                      >
                        {starter}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ChatField handles messages, attachments, proposals, and composer */}
              <div className="flex-1 overflow-hidden">
                <ChatField
                  chat={chat}
                  messages={chat.messages}
                  onSendMessage={chat.send}
                  isTyping={chat.sending}
                  disabled={chat.locked}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Desktop Right Column: Project Context & Verified Activity List */}
      {isDesktop && desktopRightPanelOpen && (
        <aside className="agent-right-col flex flex-col p-4">
          <div className="mb-4 border-b border-[var(--color-line)] pb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Context & Actions
            </h2>
          </div>
          <div className="space-y-6">
            <AgentContextPanel chat={chat} />
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Verified Activities
              </h3>
              <AgentActivityList
                key={chat.conversationId}
                activities={chat.activities}
              />
            </div>
          </div>
        </aside>
      )}

      {/* Tablet / Mobile Drawer: Project Context & Verified Activity List */}
      {!isDesktop && contextDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Context and verified activities"
          ref={contextDialogRef}
          className="fixed inset-0 z-50 flex justify-end bg-black/50"
        >
          <div
            className="flex-1"
            onClick={() => {
              setContextDrawerOpen(false);
              contextTriggerRef.current?.focus();
            }}
          />
          <div className="flex h-full w-4/5 max-w-sm flex-col bg-[var(--color-surface)] p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">
                Context & Actions
              </h2>
              <button
                type="button"
                onClick={() => {
                  setContextDrawerOpen(false);
                  contextTriggerRef.current?.focus();
                }}
                className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"
                aria-label="Close context panel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto pt-4">
              <AgentContextPanel chat={chat} />
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Verified Activities
                </h3>
                <AgentActivityList
                  key={chat.conversationId}
                  activities={chat.activities}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
