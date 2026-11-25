import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  aiService,
  type ConversationPage,
  type ConversationSummary,
  type ListConversationsParams,
} from "@/shared/services/aiService";

export const CONVERSATION_PAGE_SIZE = 20;

export const conversationKeys = {
  all: ["agent", "conversations"] as const,
  list: (search?: string) =>
    [...conversationKeys.all, { search: search?.trim() ?? "" }] as const,
};

/**
 * Fetches one page of conversations using the paginated endpoint when mocked or available,
 * falling back cleanly to `aiService.listConversations()` for legacy test mocks.
 */
export async function fetchConversationPage(
  params: ListConversationsParams = {},
): Promise<ConversationPage> {
  if (typeof aiService.listConversationsPage === "function") {
    return aiService.listConversationsPage(params);
  }
  const items = await aiService.listConversations();
  return {
    items: Array.isArray(items) ? items : [],
    nextCursor: null,
    hasMore: false,
  };
}

interface UseInfiniteConversationsOptions {
  search?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * React Query infinite loader for user chat conversations ordered most-recently updated first.
 */
export function useInfiniteConversations({
  search = "",
  limit = CONVERSATION_PAGE_SIZE,
  enabled = true,
}: UseInfiniteConversationsOptions = {}) {
  const normalizedSearch = search.trim();
  const query = useInfiniteQuery({
    queryKey: conversationKeys.list(normalizedSearch),
    initialPageParam: null as string | null,
    enabled,
    queryFn: ({ pageParam, signal }) =>
      fetchConversationPage({
        cursor: pageParam,
        limit,
        search: normalizedSearch,
        signal,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined,
  });

  const conversations = useMemo(() => {
    const seen = new Set<string>();
    const items: ConversationSummary[] = [];
    for (const page of query.data?.pages ?? []) {
      for (const item of page.items) {
        if (!item?.id || seen.has(item.id)) continue;
        seen.add(item.id);
        items.push(item);
      }
    }
    return items;
  }, [query.data]);

  const hasLoadedPages = (query.data?.pages.length ?? 0) > 0;
  const status =
    hasLoadedPages && query.isFetchNextPageError ? "success" : query.status;
  const isError = query.isError && !hasLoadedPages;

  return {
    conversations,
    hasMore: Boolean(query.hasNextPage),
    status,
    isPending: query.isPending,
    isError,
    isFetchNextPageError: query.isFetchNextPageError,
    isFetchingNextPage: query.isFetchingNextPage,
    isFetching: query.isFetching,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}

interface UseScrollSentinelOptions {
  containerRef: RefObject<HTMLElement | null>;
  sentinelRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  hasMore: boolean;
  isFetching: boolean;
  isError: boolean;
  onLoadMore: () => void;
  itemCount?: number;
}

/**
 * Debounces rapid input changes without synchronous effect state updates.
 */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        setDebounced(value);
      },
      value === "" ? 0 : delayMs,
    );
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

/**
 * Triggers automatic pagination when the bottom sentinel approaches or enters the scroll container viewport.
 */
export function useScrollSentinel({
  containerRef,
  sentinelRef,
  enabled,
  hasMore,
  isFetching,
  isError,
  onLoadMore,
  itemCount = 0,
}: UseScrollSentinelOptions) {
  const loadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    loadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    const container = containerRef.current;
    const sentinel = sentinelRef.current;
    if (
      !enabled ||
      !hasMore ||
      isFetching ||
      isError ||
      !container ||
      !sentinel
    ) {
      return;
    }

    const triggerLoad = () => {
      loadMoreRef.current();
    };

    const checkScrollBounds = () => {
      if (container.clientHeight <= 0) return;
      const remaining =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      if (remaining <= 120) {
        triggerLoad();
        return;
      }
      const containerRect = container.getBoundingClientRect();
      const sentinelRect = sentinel.getBoundingClientRect();
      if (
        containerRect.height > 0 &&
        sentinelRect.top <= containerRect.bottom + 120
      ) {
        triggerLoad();
      }
    };

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            triggerLoad();
          }
        },
        {
          root: container,
          rootMargin: "0px 0px 120px 0px",
          threshold: 0,
        },
      );
      observer.observe(sentinel);
    }

    checkScrollBounds();
    container.addEventListener("scroll", checkScrollBounds, { passive: true });
    window.addEventListener("resize", checkScrollBounds, { passive: true });

    return () => {
      observer?.disconnect();
      container.removeEventListener("scroll", checkScrollBounds);
      window.removeEventListener("resize", checkScrollBounds);
    };
  }, [
    containerRef,
    sentinelRef,
    enabled,
    hasMore,
    isFetching,
    isError,
    itemCount,
  ]);
}
