import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarDays,
  Folder,
  ListChecks,
  ListTree,
  PanelLeft,
  Plus,
} from "lucide-react";
import { useAgentSession } from "@/features/agent/agentSessionContext";
import { useAgentNavigation } from "@/features/agent/useAgentNavigation";
import { AgentDiscardDialog } from "@/features/agent/AgentDiscardDialog";
import { useProjectsQuery } from "@/features/tasks/api/projectQueries";
import ChatField from "@/features/tasks/components/chat/ChatField";
import AddProjectForm from "@/features/tasks/components/Form/AddProjectForm";
import { aiService } from "@/shared/services/aiService";
import type { Project } from "@/shared/types/domain";
import AgentProjectSidebar from "../components/AgentProjectSidebar";
import V2AgentTabs from "../components/V2AgentTabs";
import V2Dialog from "../components/V2Dialog";

const STARTERS = [
  [CalendarDays, "planTodaySSchedule"],
  [ListTree, "breakDownTasks"],
  [ListChecks, "reviewPriorityTasks"],
] as const;

const CONVERSATIONS_QUERY_KEY = ["agent", "conversations"] as const;

export default function AgentsPage() {
  const { t } = useTranslation("v2");
  const { t: tAgent } = useTranslation("agent");
  const { t: tWorkspace } = useTranslation("workspace");
  const { chat, setDraft } = useAgentSession();
  const {
    activeConversationId,
    activeProjectId,
    resolving,
    selectConversation,
    startNewChat,
    discardPromptOpen,
    confirmDiscard,
    cancelDiscard,
  } = useAgentNavigation();

  const [compact, setCompact] = useState(false);
  const [historyPreference, setHistoryPreference] = useState<boolean | null>(
    null,
  );
  const [showCreateProject, setShowCreateProject] = useState(false);
  const workspace = useRef<HTMLDivElement>(null);
  const center = useRef<HTMLElement>(null);
  const historyToggle = useRef<HTMLButtonElement>(null);
  const historyPanel = useRef<HTMLElement>(null);
  const showHistory = historyPreference ?? !compact;

  useLayoutEffect(() => {
    const element = workspace.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const measure = () => setCompact(element.clientWidth < 720);
    const observer = new ResizeObserver(measure);
    measure();
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const projects = useProjectsQuery();
  const { refetch: refetchConversations, ...conversations } = useQuery({
    queryKey: CONVERSATIONS_QUERY_KEY,
    queryFn: aiService.listConversations,
  });
  const historyVersion = chat.rawMessages?.length ?? chat.messages.length;
  const previousHistoryVersion = useRef(historyVersion);
  useEffect(() => {
    if (previousHistoryVersion.current !== historyVersion && !chat.sending) {
      previousHistoryVersion.current = historyVersion;
      void refetchConversations();
    }
  }, [chat.sending, historyVersion, refetchConversations]);

  const project = projects.data?.find((item) => item._id === activeProjectId);
  const conversation = conversations.data?.find(
    (item) => item.id === activeConversationId,
  );
  const busy =
    resolving || chat.loading || chat.sending || Boolean(chat.pending);
  const newChat =
    !activeConversationId &&
    !chat.messages.length &&
    !chat.sending &&
    !chat.interaction;
  const projectUnavailable =
    newChat && activeProjectId && projects.isSuccess && !project;
  const conversationUnavailable = Boolean(
    chat.error &&
    !chat.messages.length &&
    !chat.loading &&
    activeConversationId,
  );

  const closeHistory = () => {
    setHistoryPreference(false);
    historyToggle.current?.focus();
  };
  const selectProject = (id: string) => {
    startNewChat(id);
    if (compact) closeHistory();
  };
  const title =
    project?.name ??
    conversation?.title ??
    tAgent(newChat ? "newChat" : "orbitAgent");

  return (
    <div
      className="v2-agents flex min-w-0 flex-col gap-3"
      data-testid="v2-agents-page"
      onKeyDown={(event) => {
        if (
          event.defaultPrevented ||
          event.key !== "Escape" ||
          showCreateProject ||
          discardPromptOpen ||
          chat.discardRequest
        )
          return;
        if (compact && showHistory) {
          event.stopPropagation();
          closeHistory();
        }
      }}
    >
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {chat.sending
          ? tAgent("sendingMessage")
          : resolving || chat.loading
            ? tAgent("loadingConversation")
            : chat.error
              ? tAgent("errorMessage", { message: chat.error })
              : ""}
      </div>
      <h1 className="sr-only">{t("agents")}</h1>
      <AgentDiscardDialog
        isOpen={discardPromptOpen || chat.discardRequest}
        onConfirm={
          chat.discardRequest ? () => chat.resolveDiscard(true) : confirmDiscard
        }
        onCancel={
          chat.discardRequest ? () => chat.resolveDiscard(false) : cancelDiscard
        }
      />
      <V2Dialog
        open={showCreateProject}
        title={tWorkspace("addProjectCasedAddproject")}
        onClose={() => setShowCreateProject(false)}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto p-5"
      >
        <AddProjectForm
          onClose={() => setShowCreateProject(false)}
          onProjectCreated={(created: Project) => selectProject(created._id)}
          onProjectSaved={undefined}
        />
      </V2Dialog>

      <header className="flex min-w-0 flex-wrap items-center justify-between gap-2 [&_.v2-agent-tab]:whitespace-nowrap max-sm:[&_.v2-agent-tab]:px-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            className="v2-btn v2-glass-pill v2-glass-pill-icon ui-focus-ring shrink-0"
            aria-label={tAgent(showHistory ? "hideChats" : "showChats")}
            title={tAgent(showHistory ? "hideChats" : "showChats")}
            aria-expanded={showHistory}
            aria-controls="v2-agents-history"
            ref={historyToggle}
            onClick={() => {
              if (showHistory) closeHistory();
              else {
                setHistoryPreference(true);
                if (compact)
                  requestAnimationFrame(() =>
                    historyPanel.current?.querySelector("input")?.focus(),
                  );
              }
            }}
          >
            <PanelLeft size={18} aria-hidden="true" />
          </button>
          <V2AgentTabs />
        </div>
      </header>

      <div
        ref={workspace}
        className={`relative flex min-w-0 gap-3 h-[max(470px,calc(100dvh_-_var(--v2-current-topbar-height,76px)_-_98px))] [@container_workspace_(width<720px)]:h-[max(var(--agent-workspace-min-height,430px),calc(100dvh_-_var(--v2-current-topbar-height,76px)_-_144px))] ${chat.interaction ? "[--agent-workspace-min-height:260px]" : ""}`}
      >
        <aside
          ref={historyPanel}
          id="v2-agents-history"
          aria-label={t("conversationHistory")}
          hidden={!showHistory}
          className="v2-agent-panel v2-agent-history z-20 flex h-full w-[clamp(224px,22vw,252px)] shrink-0 flex-col rounded-[var(--v2-radius-card)] border border-[var(--v2-glass-border)] p-3 [&[hidden]]:hidden [@container_workspace_(width<720px)]:absolute [@container_workspace_(width<720px)]:top-0 [@container_workspace_(width<720px)]:left-0 [@container_workspace_(width<720px)]:w-[min(282px,100%)] [@container_workspace_(width<720px)]:[background:var(--v2-surface-solid)]!"
        >
          <AgentProjectSidebar
            projects={projects.data ?? []}
            conversations={conversations.data ?? []}
            activeConversationId={activeConversationId}
            activeProjectId={activeProjectId}
            projectStatus={projects.status}
            conversationStatus={conversations.status}
            retryProjects={() => void projects.refetch()}
            retryConversations={() => void refetchConversations()}
            onSelectProject={selectProject}
            onSelectConversation={(id) => {
              selectConversation(id);
              if (compact) closeHistory();
            }}
            onNewChat={() => {
              startNewChat();
              if (compact) closeHistory();
            }}
            onAllProjects={() => {
              if (activeProjectId) startNewChat(null);
            }}
            onCreateProject={() => setShowCreateProject(true)}
            disabled={busy}
          />
        </aside>

        <section
          ref={center}
          inert={compact && showHistory}
          data-chat-stage={newChat ? "starter" : "active"}
          className={`v2-agent-center relative flex h-full min-h-0 min-w-0 flex-1 flex-col rounded-[var(--v2-radius-card)] border [transition:background-color_260ms_cubic-bezier(0.22,1,0.36,1),border-color_260ms_cubic-bezier(0.22,1,0.36,1),box-shadow_260ms_cubic-bezier(0.22,1,0.36,1)] ${
            newChat
              ? "border-transparent bg-transparent"
              : "border-[var(--v2-border)] bg-[color-mix(in_srgb,var(--v2-surface-solid)_55%,transparent)] [@media(prefers-reduced-transparency:reduce)]:bg-[var(--v2-surface-solid)]"
          }`}
          aria-label={t("agentConversation")}
        >
          <div
            className={`flex min-h-11 items-center gap-2 px-3 text-sm font-semibold text-[var(--v2-ink)] sm:px-4 ${newChat ? "" : "border-b border-[var(--v2-border)]"}`}
          >
            {project && (
              <Folder
                size={16}
                aria-hidden="true"
                className="shrink-0 text-[var(--v2-accent)]"
              />
            )}
            <h2 className="truncate" title={title}>
              {title}
            </h2>
          </div>
          {resolving ||
          (chat.loading && !chat.conversationId) ||
          (newChat && activeProjectId && projects.isPending) ? (
            <p
              className="m-auto px-4 text-center text-sm text-[var(--v2-muted)]"
              role="status"
            >
              {tAgent("loadingConversation")}
            </p>
          ) : conversationUnavailable ||
            projectUnavailable ||
            (newChat && activeProjectId && projects.isError) ? (
            <div
              className="m-auto flex flex-col items-center gap-3 p-4 text-center text-sm text-[var(--v2-muted)]"
              role="alert"
            >
              <AlertCircle size={20} aria-hidden="true" />
              <p>
                {conversationUnavailable
                  ? t("conversationUnavailable")
                  : projects.isError
                    ? tWorkspace("failedToLoadProjects")
                    : tAgent("chatProjectUnavailable")}
              </p>
              {newChat && projects.isError ? (
                <button
                  type="button"
                  className="v2-btn"
                  onClick={() => void projects.refetch()}
                >
                  {tAgent("tryAgain")}
                </button>
              ) : (
                <button
                  type="button"
                  className="v2-btn v2-btn-primary"
                  onClick={() => startNewChat(null)}
                >
                  <Plus size={16} aria-hidden="true" />
                  {t("startNewConversation")}
                </button>
              )}
            </div>
          ) : (
            <div
              className={`flex min-h-0 flex-1 flex-col ${newChat ? "" : "px-2 pb-2 sm:px-4 sm:pb-3"}`}
            >
              <ChatField
                showWelcome={false}
                chat={chat}
                messages={chat.messages}
                onSendMessage={chat.send}
                isTyping={chat.sending}
                disabled={chat.locked}
                workspaceComposer
                startHeading={newChat ? tAgent("startChatHeading") : undefined}
                starters={
                  newChat ? (
                    <div className="v2-agent-starters mx-auto grid w-full max-w-[808px] grid-cols-3 gap-2.5 [@container_workspace_(width<600px)]:grid-cols-1">
                      {STARTERS.map(([Icon, key]) => (
                        <button
                          key={key}
                          type="button"
                          disabled={busy || chat.locked}
                          className="ui-focus-ring flex min-h-20 min-w-0 flex-col items-start gap-2 rounded-[var(--v2-radius-card)] border border-[var(--v2-border)] bg-[var(--v2-shell-fill)] p-3 text-left text-sm font-medium text-[var(--v2-ink)] hover:border-[var(--v2-accent)] hover:bg-[var(--v2-input-fill)] disabled:opacity-50 [@container_workspace_(width<600px)]:min-h-11 [@container_workspace_(width<600px)]:flex-row [@container_workspace_(width<600px)]:items-center [@container_workspace_(width<600px)]:py-2"
                          onClick={() => {
                            setDraft((previous) => ({
                              ...previous,
                              text: tAgent(key),
                            }));
                            center.current?.querySelector("textarea")?.focus();
                          }}
                        >
                          <Icon
                            size={18}
                            aria-hidden="true"
                            className="shrink-0 text-[var(--v2-accent)]"
                          />
                          {tAgent(key)}
                        </button>
                      ))}
                    </div>
                  ) : undefined
                }
              />
            </div>
          )}
        </section>

        {compact && showHistory && (
          <div
            aria-hidden="true"
            onClick={closeHistory}
            className="absolute inset-0 z-10 rounded-[var(--v2-radius-card)] bg-[var(--v2-ink)]/10"
          />
        )}
      </div>
    </div>
  );
}
