import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  History,
  PanelRightOpen,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { useAgentSession } from "@/features/agent/agentSessionContext";
import { useAgentNavigation } from "@/features/agent/useAgentNavigation";
import { AgentHistoryList } from "@/features/agent/AgentHistoryList";
import { AgentContextPanel } from "@/features/agent/AgentContextPanel";
import { AgentActivityList } from "@/features/agent/AgentActivityList";
import { AgentDiscardDialog } from "@/features/agent/AgentDiscardDialog";
import V2AgentTabs from "../components/V2AgentTabs";
import ChatField from "@/features/tasks/components/chat/ChatField";

const STARTER_KEYS = [
  "planTodaySSchedule",
  "breakDownTasks",
  "reviewPriorityTasks",
] as const;

export default function AgentsPage() {
  const { t } = useTranslation("v2");
  const { t: tAgent } = useTranslation("agent");
  const { chat, setDraft } = useAgentSession();
  const {
    activeConversationId,
    selectConversation,
    startNewChat,
    discardPromptOpen,
    confirmDiscard,
    cancelDiscard,
  } = useAgentNavigation();

  const [showHistory, setShowHistory] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const chatfield = useRef<HTMLDivElement>(null);
  const historyToggle = useRef<HTMLButtonElement>(null);
  const contextToggle = useRef<HTMLButtonElement>(null);
  const historyPanel = useRef<HTMLElement>(null);
  const contextPanel = useRef<HTMLElement>(null);
  const closeHistory = () => {
    setShowHistory(false);
    historyToggle.current?.focus();
  };
  const closeContext = () => {
    setShowContext(false);
    contextToggle.current?.focus();
  };
  useEffect(() => {
    const panel = showHistory
      ? historyPanel.current
      : showContext
        ? contextPanel.current
        : null;
    panel
      ?.querySelector<HTMLElement>(
        'input, button:not(:disabled), [tabindex="0"]',
      )
      ?.focus();
  }, [showHistory, showContext]);

  const busy = chat.loading || chat.sending || Boolean(chat.pending);
  const conversationUnavailable = Boolean(
    chat.error && !chat.messages.length && !chat.loading,
  );

  const liveStatus = chat.sending
    ? tAgent("sendingMessage")
    : chat.loading
      ? tAgent("loadingConversation")
      : chat.error
        ? tAgent("errorMessage", { message: chat.error })
        : "";

  return (
    <div
      className="v2-agents"
      data-testid="v2-agents-page"
      onKeyDown={(event) => {
        if (
          !event.defaultPrevented &&
          event.key === "Escape" &&
          (showHistory || showContext)
        ) {
          event.preventDefault();
          event.stopPropagation();
          if (showHistory) closeHistory();
          else closeContext();
        }
      }}
    >
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveStatus}
      </div>

      <AgentDiscardDialog
        isOpen={discardPromptOpen || chat.discardRequest}
        onConfirm={
          chat.discardRequest ? () => chat.resolveDiscard(true) : confirmDiscard
        }
        onCancel={
          chat.discardRequest ? () => chat.resolveDiscard(false) : cancelDiscard
        }
      />

      <h1 className="sr-only">{t("agents")}</h1>
      <header className="v2-agent-mobile-tools">
        <div className="v2-agents-heading-actions flex gap-[10px] flex-wrap">
          <button
            type="button"
            className="v2-btn v2-agent-toggle"
            ref={historyToggle}
            onClick={() => {
              setShowHistory((open) => !open);
              setShowContext(false);
            }}
            aria-expanded={showHistory}
            aria-controls="v2-agents-history"
          >
            <History size={16} aria-hidden="true" />
            <span>{t("conversationHistory")}</span>
          </button>
          <button
            type="button"
            className="v2-btn v2-agent-toggle"
            ref={contextToggle}
            onClick={() => {
              setShowContext((open) => !open);
              setShowHistory(false);
            }}
            aria-expanded={showContext}
            aria-controls="v2-agents-context"
          >
            <PanelRightOpen size={16} aria-hidden="true" />
            <span>{t("contextActions")}</span>
          </button>
        </div>
      </header>

      <V2AgentTabs />

      <div
        className="v2-agents-workspace grid gap-[18px] h-[clamp(520px,calc(100dvh_-_200px),880px)] [@media(max-width:899px)]:h-auto"
        data-history={showHistory}
        data-context={showContext}
      >
        <aside
          ref={historyPanel}
          id="v2-agents-history"
          className="v2-agent-panel [border:1px_solid_var(--v2-glass-border)] rounded-[var(--v2-radius-card)] flex-col min-w-[0] min-h-[0] v2-agent-history"
          aria-label={t("conversationHistory")}
        >
          <div
            className="v2-agent-panel-head flex items-center justify-between gap-[10px] mb-[12px] pb-[12px]
            [border-bottom:1px_solid_var(--v2-border)] [&_h2]:text-[12px] [&_h2]:[font-weight:600]
            [&_h2]:[letter-spacing:0.08em] [&_h2]:uppercase [&_h2]:text-[var(--v2-muted)]"
          >
            <h2>{t("conversationHistory")}</h2>
            <button
              type="button"
              className="v2-btn v2-agent-panel-close"
              onClick={closeHistory}
              aria-label={tAgent("closeHistory")}
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
          <div className="v2-agent-panel-body flex-1 min-h-[0] flex flex-col">
            <AgentHistoryList
              activeConversationId={chat.conversationId || activeConversationId}
              onSelectConversation={(id: string) => {
                selectConversation(id);
                setShowHistory(false);
              }}
              onNewChat={() => {
                startNewChat();
                setShowHistory(false);
              }}
              disabled={busy}
            />
          </div>
        </aside>

        <section
          className="v2-agent-panel [border:1px_solid_var(--v2-glass-border)] rounded-[var(--v2-radius-card)] flex-col min-w-[0] min-h-[0] v2-agent-center [@media(max-width:899px)]:h-[68dvh]"
          aria-label={t("agentConversation")}
        >
          <div
            className="v2-agent-panel-head flex items-center justify-between gap-[10px] mb-[12px] pb-[12px]
            [border-bottom:1px_solid_var(--v2-border)] [&_h2]:text-[12px] [&_h2]:[font-weight:600]
            [&_h2]:[letter-spacing:0.08em] [&_h2]:uppercase [&_h2]:text-[var(--v2-muted)]"
          >
            <span className="v2-agent-identity inline-flex items-center gap-[8px] text-[var(--v2-accent)]">
              <Sparkles size={17} aria-hidden="true" />
              <h2>{tAgent("orbitAgent")}</h2>
            </span>
          </div>

          <div className="v2-agent-panel-body flex-1 min-h-[0] flex flex-col">
            {chat.loading && !chat.conversationId ? (
              <p
                className="v2-agent-status flex flex-col items-center gap-[12px] m-auto p-[24px] text-[var(--v2-muted)] text-[13px] text-center"
                role="status"
              >
                {tAgent("loadingConversation")}
              </p>
            ) : conversationUnavailable ? (
              <div
                className="v2-agent-status flex flex-col items-center gap-[12px] m-auto p-[24px] text-[var(--v2-muted)] text-[13px] text-center"
                role="alert"
              >
                <AlertCircle size={20} aria-hidden="true" />
                <p>{t("conversationUnavailable")}</p>
                <button
                  type="button"
                  className="v2-btn v2-btn-primary [&:hover]:filter-[brightness(1.08)]"
                  onClick={() => void startNewChat()}
                >
                  <Plus size={15} aria-hidden="true" />
                  <span>{t("startNewConversation")}</span>
                </button>
              </div>
            ) : (
              <>
                {chat.messages.length === 0 && !chat.loading && (
                  <div className="v2-agent-starters p-[16px_2px_4px] [&_p]:text-[14px] [&_p]:text-[var(--v2-muted)] [&_>_div]:flex [&_>_div]:flex-wrap [&_>_div]:gap-[8px] [&_>_div]:mt-[10px]">
                    <p>{tAgent("helloHowCanIHelpYouToday")}</p>
                    <div>
                      {STARTER_KEYS.map((key) => (
                        <button
                          key={key}
                          type="button"
                          className="v2-agent-starter p-[8px_14px] min-h-[36px] [border:1px_solid_var(--v2-border)] rounded-[var(--v2-radius-pill)]
                            [background:var(--v2-input-fill)] [transition:border-color_140ms_ease,color_140ms_ease]
                            [&:hover]:border-[var(--v2-accent)] [@media(prefers-reduced-motion:reduce)]:[transition:none]"
                          onClick={() => {
                            setDraft((previous) => ({
                              ...previous,
                              text: tAgent(key),
                            }));
                            chatfield.current
                              ?.querySelector("textarea")
                              ?.focus();
                          }}
                        >
                          {tAgent(key)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div
                  ref={chatfield}
                  className="v2-agent-chatfield flex-1 min-h-[0] flex flex-col [&_>_*]:flex-1 [&_>_*]:min-h-[0]"
                >
                  <ChatField
                    showWelcome={false}
                    avatarAppearance="orbit"
                    chat={chat}
                    messages={chat.messages}
                    onSendMessage={chat.send}
                    isTyping={chat.sending}
                    disabled={chat.locked}
                  />
                </div>
              </>
            )}
          </div>
        </section>

        <aside
          ref={contextPanel}
          id="v2-agents-context"
          className="v2-agent-panel [border:1px_solid_var(--v2-glass-border)] rounded-[var(--v2-radius-card)] flex-col min-w-[0] min-h-[0] v2-agent-context"
          aria-label={t("contextActions")}
        >
          <div
            className="v2-agent-panel-head flex items-center justify-between gap-[10px] mb-[12px] pb-[12px]
            [border-bottom:1px_solid_var(--v2-border)] [&_h2]:text-[12px] [&_h2]:[font-weight:600]
            [&_h2]:[letter-spacing:0.08em] [&_h2]:uppercase [&_h2]:text-[var(--v2-muted)]"
          >
            <h2>{t("contextActions")}</h2>
            <button
              type="button"
              className="v2-btn v2-agent-panel-close"
              onClick={closeContext}
              aria-label={tAgent("closeContextPanel")}
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
          <div
            className="v2-agent-panel-body flex-1 min-h-[0] flex flex-col v2-agent-context-body [&_h3]:text-[12px]
            [&_h3]:[font-weight:600] [&_h3]:[letter-spacing:0.08em] [&_h3]:uppercase [&_h3]:text-[var(--v2-muted)]
            [&_h3]:mb-[10px]"
          >
            <AgentContextPanel chat={chat} />
            <div>
              <h3>{t("verifiedActivities")}</h3>
              <AgentActivityList
                key={chat.conversationId}
                activities={chat.activities}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
