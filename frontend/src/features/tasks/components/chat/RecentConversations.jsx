import { getLocale } from "@/shared/i18n";
import { useTranslation } from "react-i18next";
import i18n from "@/shared/i18n";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import {
  CONVERSATION_PAGE_SIZE,
  fetchConversationPage,
  useDebouncedValue,
  useScrollSentinel,
} from "@/features/agent/useInfiniteConversations";

function mergeConversationPages(existing, incoming) {
  const seen = new Set(existing.map((item) => item.id));
  const merged = [...existing];
  for (const item of incoming) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }
  return merged;
}

function relativeTime(value) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60000),
  );
  if (minutes < 1) return i18n.t("agent:justNow");
  const formatter = new Intl.RelativeTimeFormat(getLocale(), {
    numeric: "auto",
  });
  if (minutes < 60) return formatter.format(-minutes, "minute");
  if (minutes < 1440)
    return formatter.format(-Math.floor(minutes / 60), "hour");
  return formatter.format(-Math.floor(minutes / 1440), "day");
}

export default function RecentConversations({
  onOpen,
  disabled,
  expanded = false,
  onClose,
}) {
  const { t } = useTranslation("agent");

  const [conversations, setConversations] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [hasMoreUnfiltered, setHasMoreUnfiltered] = useState(false);
  const [activeServerSearch, setActiveServerSearch] = useState("");
  const [loadedKey, setLoadedKey] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [showAll, setShowAll] = useState(expanded);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 250);
  const serverSearch =
    debouncedQuery && (hasMoreUnfiltered || activeServerSearch !== "")
      ? debouncedQuery
      : "";
  const fetchKey = `${attempt}:${serverSearch}`;
  const loading = loadedKey !== fetchKey && !error;

  const viewAllRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const sentinelRef = useRef(null);
  const loadingMoreRef = useRef(false);
  const activeQueryRef = useRef("");
  const closeHistory = () => {
    if (expanded) {
      onClose?.();
      return;
    }
    setShowAll(false);
    setQuery("");
    requestAnimationFrame(() => viewAllRef.current?.focus());
  };
  useEffect(() => {
    if (showAll && !loading) searchRef.current?.focus();
  }, [showAll, loading]);

  useEffect(() => {
    activeQueryRef.current = activeServerSearch;
  }, [activeServerSearch]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    fetchConversationPage({
      cursor: null,
      limit: CONVERSATION_PAGE_SIZE,
      search: serverSearch,
      signal: controller.signal,
    })
      .then((page) => {
        if (!active) return;
        const hasNext = Boolean(page.hasMore && page.nextCursor);
        activeQueryRef.current = serverSearch;
        setConversations(page.items ?? []);
        setNextCursor(page.nextCursor ?? null);
        setHasMore(hasNext);
        setError(false);
        setLoadMoreError(false);
        setActiveServerSearch(serverSearch);
        if (serverSearch === "") {
          setHasMoreUnfiltered(hasNext);
        }
        setLoadedKey(fetchKey);
      })
      .catch(() => {
        if (active && !controller.signal.aborted) {
          setError(true);
          setLoadedKey(fetchKey);
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [fetchKey, serverSearch]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || !nextCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadMoreError(false);

    const requestQuery = activeQueryRef.current;
    fetchConversationPage({
      cursor: nextCursor,
      limit: CONVERSATION_PAGE_SIZE,
      search: requestQuery,
    })
      .then((page) => {
        if (requestQuery !== activeQueryRef.current) return;
        setConversations((prev) =>
          mergeConversationPages(prev, page.items ?? []),
        );
        setNextCursor(page.nextCursor ?? null);
        setHasMore(Boolean(page.hasMore && page.nextCursor));
      })
      .catch(() => {
        if (requestQuery === activeQueryRef.current) setLoadMoreError(true);
      })
      .finally(() => {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, [hasMore, nextCursor]);

  useScrollSentinel({
    containerRef: listRef,
    sentinelRef,
    enabled: showAll && !loading && !error,
    hasMore,
    isFetching: loadingMore,
    isError: loadMoreError,
    onLoadMore: handleLoadMore,
    itemCount: conversations.length,
  });

  if (loading)
    return (
      <p role="status" className="py-4 text-sm text-[var(--color-text-muted)]">
        {t("loadingConversations")}
      </p>
    );
  if (error)
    return (
      <div className="space-y-2 py-4 text-sm text-[var(--color-text-muted)]">
        <p>{t("unableToLoadPreviousConversations")}</p>
        <button
          type="button"
          className="ui-focus-ring rounded text-[var(--color-accent)]"
          onClick={() => {
            setError(false);
            setAttempt((value) => value + 1);
          }}
        >
          {t("tryAgain")}
        </button>
      </div>
    );
  if (!conversations.length && !activeServerSearch && !debouncedQuery)
    return expanded ? (
      <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-muted)]">
        {t("noConversationsYetLabel")}
      </div>
    ) : null;

  const filteredConversations = showAll
    ? conversations.filter((item) =>
        item.title
          .toLocaleLowerCase()
          .includes(query.trim().toLocaleLowerCase()),
      )
    : conversations.slice(0, 3);

  return (
    <section
      aria-label={t("recentConversations")}
      className={`flex min-h-0 flex-col py-2 ${expanded ? "flex-1" : `${showAll ? "flex-1 " : ""}chat-recent mt-[24px] [border-top:1px_solid_var(--color-line)] pt-[16px]`}`}
      onKeyDown={(event) => {
        if (showAll && event.key === "Escape") {
          event.stopPropagation();
          closeHistory();
        }
      }}
    >
      <h2 className="ui-chat-history-label p-[0_0.5rem] [border:0] [background:transparent] text-left mb-2">
        {t("recentConversations")}
      </h2>
      <div
        className={
          showAll
            ? "flex min-h-0 flex-1 flex-col rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface-muted)] p-2"
            : ""
        }
      >
        {showAll && (
          <>
            <div className="mx-1 flex shrink-0 items-center gap-2 border-b border-[var(--color-line)] px-2 py-3">
              <Search
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]"
              />
              <input
                ref={searchRef}
                type="search"
                aria-label={t("searchRecentChats")}
                placeholder={t("searchConversationsLabel")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="ui-focus-ring min-w-0 flex-1 rounded bg-transparent px-1 py-1 text-sm text-[var(--color-text)] outline-none"
              />
            </div>
            <div className="flex shrink-0 items-center justify-between px-3 py-2">
              <span className="text-xs font-medium text-[var(--color-text-muted)]">
                {t("allConversations")}
              </span>
              <button
                type="button"
                onClick={closeHistory}
                aria-label={t("closeChatHistory")}
                title={t("closeChatHistory")}
                className="ui-focus-ring rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
        <ul
          ref={listRef}
          className={
            showAll
              ? "min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]"
              : "space-y-1"
          }
        >
          {filteredConversations.map((conversation) => (
            <li key={conversation.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onOpen(conversation.id)}
                className="ui-focus-ring flex w-full items-center gap-4 rounded-lg px-2 py-2.5 text-left text-sm text-[var(--color-text)]
                  transition-colors hover:bg-[var(--color-surface-muted)] disabled:opacity-50"
              >
                <span
                  className="min-w-0 flex-1 truncate"
                  title={conversation.title}
                >
                  {conversation.title}
                </span>
                <time
                  dateTime={conversation.updatedAt}
                  title={new Date(conversation.updatedAt).toLocaleString(
                    getLocale(),
                  )}
                  className="shrink-0 text-xs text-[var(--color-text-muted)]"
                >
                  {relativeTime(conversation.updatedAt)}
                </time>
              </button>
            </li>
          ))}
          {showAll && loadMoreError && (
            <li
              role="alert"
              className="flex items-center justify-between gap-2 px-2 py-2 text-xs text-[var(--color-text-muted)]"
            >
              <span>{t("unableToLoadMoreConversations")}</span>
              <button
                type="button"
                onClick={handleLoadMore}
                className="ui-focus-ring rounded px-2 py-1 font-medium text-[var(--color-accent)]"
              >
                {t("tryAgain")}
              </button>
            </li>
          )}
          {showAll && loadingMore && (
            <li
              role="status"
              className="px-2 py-2 text-center text-xs text-[var(--color-text-muted)]"
            >
              {t("loadingMoreConversations")}
            </li>
          )}
          {showAll && hasMore && !loadingMore && !loadMoreError && (
            <li ref={sentinelRef} aria-hidden="true" className="h-1 w-full" />
          )}
        </ul>
        {showAll && filteredConversations.length === 0 && (
          <p
            role="status"
            className="px-3 py-6 text-center text-sm text-[var(--color-text-muted)]"
          >
            {t("noConversationsFound")}
          </p>
        )}
      </div>
      {!showAll && (conversations.length > 3 || hasMore) && (
        <button
          ref={viewAllRef}
          aria-label={t(hasMore ? "viewAllPlus" : "viewAll", {
            count: conversations.length,
          })}
          type="button"
          className="ui-chat-history-label p-[0_0.5rem] [border:0] [background:transparent] text-left ui-focus-ring mt-2 self-start"
          onClick={() => setShowAll(true)}
        >
          {t(hasMore ? "viewAllPlus" : "viewAll", {
            count: conversations.length,
          })}
        </button>
      )}
    </section>
  );
}
