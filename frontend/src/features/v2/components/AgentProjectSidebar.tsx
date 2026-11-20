import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  MessageSquare,
  Plus,
  Search,
} from "lucide-react";
import type { ConversationSummary } from "@/shared/services/aiService";
import type { Project } from "@/shared/types/domain";
import { getProjectColor } from "@/shared/utils/projectColor";

interface AgentProjectSidebarProps {
  projects: Project[];
  conversations: ConversationSummary[];
  activeConversationId?: string;
  activeProjectId?: string;
  conversationStatus: "pending" | "error" | "success";
  projectStatus: "pending" | "error" | "success";
  retryConversations: () => void;
  retryProjects: () => void;
  onSelectConversation: (id: string) => void;
  onSelectProject: (id: string) => void;
  onNewChat: () => void;
  onAllProjects: () => void;
  onCreateProject: () => void;
  disabled: boolean;
}

export default function AgentProjectSidebar({
  projects,
  conversations,
  activeConversationId,
  activeProjectId,
  conversationStatus,
  projectStatus,
  retryConversations,
  retryProjects,
  onSelectConversation,
  onSelectProject,
  onNewChat,
  onAllProjects,
  onCreateProject,
  disabled,
}: AgentProjectSidebarProps) {
  const { t } = useTranslation("agent");
  const { t: tWorkspace } = useTranslation("workspace");
  const [view, setView] = useState<"recent" | "projects">(
    activeProjectId ? "projects" : "recent",
  );
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const id = useId();
  const showProjects = view === "projects";
  const listStatus = showProjects ? projectStatus : conversationStatus;
  const projectError = showProjects && projectStatus === "error";
  const historyError =
    conversationStatus === "error" &&
    (!showProjects || projectStatus === "success");
  const query = search.trim().toLocaleLowerCase();
  const matches = (text: string) => text.toLocaleLowerCase().includes(query);
  const filtered = conversations.filter((item) =>
    matches(item.title || t("newConversation")),
  );
  const visibleProjects = projects.filter(
    (project) =>
      matches(project.name) ||
      filtered.some((item) => item.projectId === project._id),
  );

  function renderConversation(item: ConversationSummary) {
    const title = item.title || t("newConversation");
    return (
      <li key={item.id} className="min-w-0">
        <button
          type="button"
          onClick={() => onSelectConversation(item.id)}
          disabled={disabled}
          aria-current={activeConversationId === item.id ? "true" : undefined}
          title={title}
          className="agent-history-item ui-focus-ring flex min-h-11 w-full min-w-0 items-center gap-2.5 rounded-full px-3 text-left text-sm text-[var(--v2-ink)] hover:bg-[var(--v2-input-fill)] aria-[current=true]:bg-[var(--color-accent-soft)] aria-[current=true]:font-semibold aria-[current=true]:text-[var(--v2-accent)] disabled:cursor-not-allowed"
        >
          <MessageSquare
            size={15}
            className="shrink-0 text-[var(--v2-muted)]"
            aria-hidden="true"
          />
          <span className="line-clamp-2 py-1 text-sm leading-snug wrap-anywhere">
            {title}
          </span>
        </button>
      </li>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div
        aria-label={t("chatHistory")}
        role="group"
        className="grid grid-cols-2 gap-2"
      >
        {(["recent", "projects"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            aria-pressed={view === tab}
            onClick={() => setView(tab)}
            className="v2-btn v2-glass-pill ui-focus-ring min-w-0 px-2! aria-pressed:border-[var(--v2-accent)]! aria-pressed:font-semibold!"
          >
            {tab === "recent" ? t("recentChats") : tWorkspace("projects")}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <label className="relative flex min-w-0 flex-1 items-center">
          <Search
            size={16}
            className="pointer-events-none absolute left-2.5 text-[var(--v2-muted)]"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setExpanded({});
            }}
            placeholder={t("searchChatsCompact")}
            aria-label={t("searchConversationsLabel")}
            className="ui-focus-ring h-11 w-full rounded-full border border-[var(--v2-border)] bg-[var(--v2-input-fill)] pl-8 pr-2 text-sm text-[var(--v2-ink)] placeholder:text-[var(--v2-muted)] max-sm:text-base"
          />
        </label>
        <button
          type="button"
          onClick={onNewChat}
          disabled={disabled}
          aria-label={t("newConversation")}
          title={t("newConversation")}
          className="ui-focus-ring grid size-11 shrink-0 place-items-center rounded-full bg-[var(--v2-accent)] text-[var(--v2-accent-ink)] hover:brightness-110 disabled:opacity-50"
        >
          <Plus
            size={20}
            className="text-[var(--v2-accent-ink)]"
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
        {view === "projects" && (
          <div className="mb-1.5 flex items-center justify-between gap-2 px-2">
            <h2 className="text-[11px] font-semibold tracking-wider text-[var(--v2-muted)] uppercase">
              {tWorkspace("projects")}
            </h2>
            <button
              type="button"
              onClick={onCreateProject}
              disabled={disabled}
              aria-label={tWorkspace("addProjectCasedAddproject")}
              title={tWorkspace("addProjectCasedAddproject")}
              className="v2-btn v2-glass-pill v2-glass-pill-icon ui-focus-ring shrink-0"
            >
              <Plus size={17} aria-hidden="true" />
            </button>
          </div>
        )}

        {(projectError || historyError) && (
          <div
            role="alert"
            className="space-y-2 px-2.5 py-3 text-sm text-[var(--v2-muted)]"
          >
            <p>
              {projectError
                ? tWorkspace("failedToLoadProjects")
                : t("unableToLoadPreviousConversations")}
            </p>
            <button
              type="button"
              className="v2-btn v2-glass-pill ui-focus-ring"
              onClick={projectError ? retryProjects : retryConversations}
            >
              {t("tryAgain")}
            </button>
          </div>
        )}
        {listStatus === "error" ? null : listStatus === "pending" ? (
          <p
            role="status"
            className="px-2.5 py-3 text-sm text-[var(--v2-muted)]"
          >
            {t(
              view === "projects"
                ? "loadingChatProjects"
                : "loadingConversations",
            )}
          </p>
        ) : view === "recent" ? (
          filtered.length ? (
            <ul className="space-y-0.5">{filtered.map(renderConversation)}</ul>
          ) : (
            <p className="px-2.5 py-3 text-sm text-[var(--v2-muted)]">
              {t(query ? "noConversationsFound" : "noConversationsYet")}
            </p>
          )
        ) : visibleProjects.length ? (
          <ul className="space-y-1">
            {visibleProjects.map((project) => {
              const selected = project._id === activeProjectId;
              const chats = (
                matches(project.name) ? conversations : filtered
              ).filter((item) => item.projectId === project._id);
              const isExpanded =
                expanded[project._id] ?? (selected || Boolean(query));
              const groupId = `${id}-${project._id}`;
              return (
                <li key={project._id}>
                  <div
                    className="flex min-w-0 items-center rounded-full data-[selected=true]:bg-[var(--color-accent-soft)] hover:bg-[var(--v2-input-fill)]"
                    data-selected={selected}
                  >
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={isExpanded ? groupId : undefined}
                      aria-label={t(
                        isExpanded
                          ? "collapseChatProject"
                          : "expandChatProject",
                        { project: project.name },
                      )}
                      onClick={() =>
                        setExpanded((previous) => ({
                          ...previous,
                          [project._id]: !isExpanded,
                        }))
                      }
                      className="ui-focus-ring grid size-11 shrink-0 place-items-center rounded-full text-[var(--v2-muted)]"
                    >
                      <ChevronRight
                        size={15}
                        className={isExpanded ? "rotate-90" : ""}
                        aria-hidden="true"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExpanded((previous) => ({
                          ...previous,
                          [project._id]: true,
                        }));
                        onSelectProject(project._id);
                      }}
                      disabled={disabled}
                      aria-current={selected ? "true" : undefined}
                      title={project.name}
                      className="ui-focus-ring flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full pr-2 text-left text-sm font-medium text-[var(--v2-ink)] disabled:cursor-not-allowed"
                    >
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--v2-surface-solid)] ring-1 ring-[var(--v2-border)]">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: getProjectColor(project) }}
                          aria-hidden="true"
                        />
                      </span>
                      <span className="line-clamp-2 py-1 text-sm leading-snug wrap-anywhere">
                        {project.name}
                      </span>
                    </button>
                  </div>
                  {isExpanded && (
                    <ul
                      id={groupId}
                      className="ml-5 space-y-0.5 border-l border-[var(--v2-border)] pl-2"
                    >
                      {chats.length ? (
                        chats.map(renderConversation)
                      ) : conversationStatus === "pending" ? (
                        <li className="px-2.5 py-2 text-xs text-[var(--v2-muted)]">
                          {t("loadingConversations")}
                        </li>
                      ) : conversationStatus === "success" ? (
                        <li className="px-2.5 py-2 text-xs text-[var(--v2-muted)]">
                          {t("noConversationsYet")}
                        </li>
                      ) : null}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-2.5 py-3 text-sm text-[var(--v2-muted)]">
            {tWorkspace(query ? "noMatchingProjects" : "noProjectsAvailable")}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          setView("projects");
          setSearch("");
          setExpanded({});
          onAllProjects();
        }}
        disabled={disabled && Boolean(activeProjectId)}
        className="v2-btn v2-glass-pill ui-focus-ring w-full! justify-start! disabled:opacity-50"
      >
        {view === "projects" ? (
          <FolderOpen size={17} aria-hidden="true" />
        ) : (
          <Folder size={17} aria-hidden="true" />
        )}
        {tWorkspace("allProjects")}
      </button>
    </div>
  );
}
