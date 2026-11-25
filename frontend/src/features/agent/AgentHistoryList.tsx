import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { MessageSquare, Plus, Search, Loader2 } from "lucide-react";
import {
  useDebouncedValue,
  useInfiniteConversations,
  useScrollSentinel,
} from "./useInfiniteConversations";

interface AgentHistoryListProps {
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  disabled?: boolean;
}

export function AgentHistoryList({
  activeConversationId,
  onSelectConversation,
  onNewChat,
  disabled = false,
}: AgentHistoryListProps) {
  const { t } = useTranslation("agent");

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 250);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const lastRefreshedConversationRef = useRef<string | undefined>(undefined);

  const {
    conversations,
    hasMore,
    isPending,
    isError,
    isFetchNextPageError,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteConversations({ search: debouncedSearch });

  useEffect(() => {
    if (
      activeConversationId &&
      activeConversationId !== lastRefreshedConversationRef.current &&
      !isPending &&
      !conversations.some((item) => item.id === activeConversationId)
    ) {
      lastRefreshedConversationRef.current = activeConversationId;
      void refetch();
    }
  }, [activeConversationId, conversations, isPending, refetch]);

  useScrollSentinel({
    containerRef: scrollContainerRef,
    sentinelRef,
    enabled: !isPending && !isError,
    hasMore,
    isFetching: isFetchingNextPage,
    isError: isFetchNextPageError,
    onLoadMore: () => {
      void fetchNextPage();
    },
    itemCount: conversations.length,
  });

  const loading = isPending && conversations.length === 0;
  const filtered = conversations.filter((c) =>
    (c.title || t("newConversation"))
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase()),
  );

  return (
    <div className="agent-history-list flex h-full min-h-0 flex-col">
      <div className="p-3">
        <button
          type="button"
          onClick={onNewChat}
          disabled={disabled}
          className="ui-btn-primary agent-new-chat-button w-full"
        >
          <Plus className="h-4 w-4" />
          <span>{t("newConversation")}</span>
        </button>

        <div className="relative mt-3">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchConversations")}
            aria-label={t("searchConversationsLabel")}
            className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] py-1.5 pl-8 pr-3 text-xs
              text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-accent)]
              focus:outline-hidden"
          />
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-2 pb-3"
      >
        {loading ? (
          <div
            role="status"
            aria-label={t("loadingConversations")}
            className="flex justify-center py-6 text-[var(--color-text-muted)]"
          >
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : isError && conversations.length === 0 ? (
          <div
            role="alert"
            className="agent-history-error space-y-3 px-2 py-4 text-xs text-[var(--color-text-muted)]"
          >
            <p>{t("unableToLoadPreviousConversations")}</p>
            <button
              type="button"
              className="ui-btn-secondary"
              disabled={loading}
              onClick={() => {
                void refetch();
              }}
            >
              {t("tryAgain")}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-6 text-center text-xs text-[var(--color-text-muted)]">
            {searchQuery ? t("noConversationsFound") : t("noConversationsYet")}
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((item) => {
              const isActive = item.id === activeConversationId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectConversation(item.id)}
                  disabled={disabled}
                  aria-current={isActive ? "true" : undefined}
                  title={item.title || t("newConversation")}
                  className={`agent-history-item flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                    isActive
                      ? "bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent)]"
                      : "text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <span className="truncate">
                    {item.title || t("newConversation")}
                  </span>
                </button>
              );
            })}
            {isFetchNextPageError ? (
              <div
                role="alert"
                className="space-y-2 px-2.5 py-3 text-xs text-[var(--color-text-muted)]"
              >
                <p>{t("unableToLoadMoreConversations")}</p>
                <button
                  type="button"
                  className="ui-btn-secondary"
                  onClick={() => {
                    void fetchNextPage();
                  }}
                >
                  {t("tryAgain")}
                </button>
              </div>
            ) : isFetchingNextPage ? (
              <div
                role="status"
                aria-label={t("loadingMoreConversations")}
                className="flex items-center justify-center gap-2 px-2.5 py-3 text-xs text-[var(--color-text-muted)]"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{t("loadingMoreConversations")}</span>
              </div>
            ) : hasMore ? (
              <div
                ref={sentinelRef}
                aria-hidden="true"
                className="h-1 w-full"
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
