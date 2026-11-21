import { useContext, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CalendarDays,
  ListChecks,
  ListTree,
  Send,
  Sparkles,
} from "lucide-react";
import { AgentSessionContext } from "@/features/agent/agentSessionContext";
import ChatAvatar from "@/features/tasks/components/chat/ChatAvatar";
import GlassPanel from "./GlassPanel";

export interface DashboardChatNowProps {
  selectedProjectId?: string;
}

export default function DashboardChatNow({
  selectedProjectId,
}: DashboardChatNowProps) {
  const { t } = useTranslation("v2");
  const navigate = useNavigate();
  const agentSession = useContext(AgentSessionContext);
  const [message, setMessage] = useState("");
  const [isZooming, setIsZooming] = useState(false);

  const starters = [
    {
      id: "plan",
      icon: CalendarDays,
      label: t("chatNowStarterPlan"),
    },
    {
      id: "overdue",
      icon: ListChecks,
      label: t("chatNowStarterOverdue"),
    },
    {
      id: "breakdown",
      icon: ListTree,
      label: t("chatNowStarterBreakdown"),
    },
  ];

  const handoffToAgents = (rawPrompt: string) => {
    const trimmed = rawPrompt.trim();
    if (!trimmed || isZooming) return;

    setIsZooming(true);
    setMessage("");

    if (agentSession?.chat) {
      agentSession.chat.resetConversation?.(selectedProjectId || undefined);
      void agentSession.chat.send(trimmed);
    }

    const targetUrl = selectedProjectId
      ? `/v2/agents?project=${encodeURIComponent(selectedProjectId)}`
      : "/v2/agents";

    navigate(targetUrl, {
      state: {
        assistantHandoff: true,
        entryTransition: "zoom-out",
      },
    });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    handoffToAgents(message);
  };

  return (
    <GlassPanel
      as="section"
      data-testid="v2-dashboard-chat-now"
      data-zooming={isZooming ? "true" : "false"}
      aria-label={t("chatNowTitle")}
      className="v2-chat-now relative overflow-hidden p-4 sm:p-5"
    >
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <ChatAvatar isUser={false} />
              <span
                aria-hidden="true"
                className="absolute -right-1 -bottom-1 grid h-4 w-4 place-items-center rounded-full bg-[var(--v2-accent)] text-[var(--v2-accent-ink)] shadow-xs"
              >
                <Sparkles size={10} />
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold tracking-tight text-[var(--v2-ink)] truncate">
                {t("chatNowTitle")}
              </h2>
              <p className="text-xs text-[var(--v2-muted)] truncate">
                {t("chatNowSubtitle")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {starters.map((starter) => {
              const Icon = starter.icon;
              return (
                <button
                  key={starter.id}
                  type="button"
                  onClick={() => handoffToAgents(starter.label)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--v2-border)] bg-[var(--v2-shell-fill)] px-3 py-1.5 text-xs font-medium text-[var(--v2-ink)] transition-colors hover:border-[var(--v2-accent)] hover:bg-[var(--v2-input-fill)] cursor-pointer"
                >
                  <Icon
                    size={13}
                    className="text-[var(--v2-accent)]"
                    aria-hidden="true"
                  />
                  <span>{starter.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 rounded-2xl border border-[var(--v2-border)] bg-[var(--v2-input-fill)] p-1.5 pl-3.5 shadow-xs focus-within:border-[var(--v2-accent)] transition-all"
        >
          <input
            type="text"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={t("chatNowPlaceholder")}
            aria-label={t("chatNowTitle")}
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-[var(--v2-ink)] placeholder:text-[var(--v2-muted)] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="v2-btn v2-btn-primary min-h-[40px] rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-50"
          >
            <Send size={14} aria-hidden="true" />
            <span>{t("chatNowSend")}</span>
          </button>
        </form>
      </div>
    </GlassPanel>
  );
}
