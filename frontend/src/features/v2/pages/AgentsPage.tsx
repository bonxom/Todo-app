import { useState } from "react";
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
import "@/styles/chat.css";

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
    <div className="v2-agents" data-testid="v2-agents-page">
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
        <div className="v2-agents-heading-actions">
          <button
            type="button"
            className="v2-btn v2-agent-toggle"
            onClick={() => setShowHistory((open) => !open)}
            aria-expanded={showHistory}
            aria-controls="v2-agents-history"
          >
            <History size={16} aria-hidden="true" />
            <span>{t("conversationHistory")}</span>
          </button>
          <button
            type="button"
            className="v2-btn v2-agent-toggle"
            onClick={() => setShowContext((open) => !open)}
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
        className="v2-agents-workspace"
        data-history={showHistory}
        data-context={showContext}
      >
        <aside
          id="v2-agents-history"
          className="v2-agent-panel v2-agent-history"
          aria-label={t("conversationHistory")}
        >
          <div className="v2-agent-panel-head">
            <h2>{t("conversationHistory")}</h2>
            <button
              type="button"
              className="v2-btn v2-agent-panel-close"
              onClick={() => setShowHistory(false)}
              aria-label={t("closeAssistant")}
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
          <div className="v2-agent-panel-body">
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
          className="v2-agent-panel v2-agent-center"
          aria-label={t("agentConversation")}
        >
          <div className="v2-agent-panel-head">
            <span className="v2-agent-identity">
              <Sparkles size={17} aria-hidden="true" />
              <h2>{tAgent("orbitAgent")}</h2>
            </span>
          </div>

          <div className="v2-agent-panel-body">
            {chat.loading && !chat.conversationId ? (
              <p className="v2-agent-status" role="status">
                {tAgent("loadingConversation")}
              </p>
            ) : conversationUnavailable ? (
              <div className="v2-agent-status" role="alert">
                <AlertCircle size={20} aria-hidden="true" />
                <p>{t("conversationUnavailable")}</p>
                <button
                  type="button"
                  className="v2-btn v2-btn-primary"
                  onClick={() => void startNewChat()}
                >
                  <Plus size={15} aria-hidden="true" />
                  <span>{t("startNewConversation")}</span>
                </button>
              </div>
            ) : (
              <>
                {chat.messages.length === 0 && !chat.loading && (
                  <div className="v2-agent-starters">
                    <p>{tAgent("helloHowCanIHelpYouToday")}</p>
                    <div>
                      {STARTER_KEYS.map((key) => (
                        <button
                          key={key}
                          type="button"
                          className="v2-agent-starter"
                          onClick={() =>
                            setDraft((previous) => ({
                              ...previous,
                              text: tAgent(key),
                            }))
                          }
                        >
                          {tAgent(key)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="v2-agent-chatfield">
                  <ChatField
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
          id="v2-agents-context"
          className="v2-agent-panel v2-agent-context"
          aria-label={t("contextActions")}
        >
          <div className="v2-agent-panel-head">
            <h2>{t("contextActions")}</h2>
            <button
              type="button"
              className="v2-btn v2-agent-panel-close"
              onClick={() => setShowContext(false)}
              aria-label={t("closeAssistant")}
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
          <div className="v2-agent-panel-body v2-agent-context-body">
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
