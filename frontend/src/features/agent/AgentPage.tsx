import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  History,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  BookOpen,
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
  "Lập kế hoạch hôm nay",
  "Chia nhỏ công việc",
  "Xem việc cần ưu tiên",
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
    ? "Đang gửi tin nhắn..."
    : chat.loading
      ? "Đang tải hội thoại..."
      : chat.pending
        ? "Đang xử lý..."
        : chat.error
          ? `Lỗi: ${chat.error}`
          : "";

  const handleSelectStarter = (text: string) => {
    setDraft((prev) => ({ ...prev, text }));
  };

  const isUnavailable = Boolean(
    chat.error &&
    (chat.error.includes("không khả dụng") ||
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
          <div className="border-b border-[var(--color-border)] p-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Lịch sử hội thoại
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
          aria-label="Lịch sử hội thoại"
          ref={historyDialogRef}
          className="fixed inset-0 z-50 flex bg-black/50"
        >
          <div className="flex h-full w-4/5 max-w-xs flex-col bg-[var(--color-bg-primary)] shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] p-3">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">
                Lịch sử hội thoại
              </h2>
              <button
                type="button"
                onClick={() => {
                  setHistoryDrawerOpen(false);
                  historyTriggerRef.current?.focus();
                }}
                className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]"
                aria-label="Đóng lịch sử"
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
      <section aria-label="Hội thoại Agent" className="agent-center-col">
        {/* Workspace Sub-header */}
        <header className="flex h-14 items-center justify-between border-b border-[var(--color-border)] px-4">
          <div className="flex items-center gap-2">
            {isMobile && (
              <button
                ref={historyTriggerRef}
                type="button"
                onClick={() => setHistoryDrawerOpen(true)}
                className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]"
                aria-label="Mở lịch sử hội thoại"
              >
                <History className="h-5 w-5" />
              </button>
            )}
            <Sparkles className="h-5 w-5 text-[var(--color-primary)]" />
            <span className="font-semibold text-[var(--color-text)]">
              Orbit Agent
            </span>

            <nav
              aria-label="Điều hướng Agent"
              className="ml-3 flex items-center rounded-lg border border-[var(--color-border)] p-0.5 bg-[var(--color-bg-secondary)]"
            >
              <Link
                to="/agent"
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold bg-[var(--color-bg-primary)] text-[var(--color-text)] shadow-xs"
              >
                <span>Trò chuyện</span>
              </Link>
              <Link
                to="/agent/skills"
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Kỹ năng</span>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {isDesktop ? (
              <button
                type="button"
                onClick={() => setDesktopRightPanelOpen((open) => !open)}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text)]"
                aria-label={
                  desktopRightPanelOpen
                    ? "Đóng bảng ngữ cảnh"
                    : "Mở bảng ngữ cảnh"
                }
              >
                {desktopRightPanelOpen ? (
                  <>
                    <PanelRightClose className="h-4 w-4" />
                    <span>Thu gọn</span>
                  </>
                ) : (
                  <>
                    <PanelRightOpen className="h-4 w-4" />
                    <span>Ngữ cảnh & Thao tác</span>
                  </>
                )}
              </button>
            ) : (
              <button
                ref={contextTriggerRef}
                type="button"
                onClick={() => setContextDrawerOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]"
                aria-label="Mở bảng ngữ cảnh và kết quả"
              >
                <PanelRightOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Ngữ cảnh & Thao tác</span>
              </button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {chat.loading && !chat.conversationId ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : isUnavailable ? (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-[var(--color-text)]">
                Hội thoại không khả dụng
              </h3>
              <p className="mt-1 max-w-sm text-sm text-[var(--color-text-muted)]">
                Hội thoại bạn đang cố truy cập không tồn tại, đã bị xóa hoặc bạn
                không có quyền xem.
              </p>
              <button
                type="button"
                onClick={startNewChat}
                className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                <span>Bắt đầu cuộc trò chuyện mới</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Empty state starters when no messages yet */}
              {chat.messages.length === 0 && !chat.loading && (
                <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-xs">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-[var(--color-text)]">
                    Xin chào! Tôi có thể giúp gì cho bạn?
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                    Chọn gợi ý dưới đây hoặc nhập yêu cầu để bắt đầu:
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {STARTER_SUGGESTIONS.map((starter) => (
                      <button
                        key={starter}
                        type="button"
                        onClick={() => handleSelectStarter(starter)}
                        className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-1.5 text-xs font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-hover)]"
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
          <div className="mb-4 border-b border-[var(--color-border)] pb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Ngữ cảnh & Thao tác
            </h2>
          </div>
          <div className="space-y-6">
            <AgentContextPanel chat={chat} />
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Kết quả thao tác
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
          aria-label="Ngữ cảnh và kết quả thao tác"
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
          <div className="flex h-full w-4/5 max-w-sm flex-col bg-[var(--color-bg-primary)] p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">
                Ngữ cảnh & Thao tác
              </h2>
              <button
                type="button"
                onClick={() => {
                  setContextDrawerOpen(false);
                  contextTriggerRef.current?.focus();
                }}
                className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]"
                aria-label="Đóng bảng ngữ cảnh"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto pt-4">
              <AgentContextPanel chat={chat} />
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Kết quả thao tác
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
