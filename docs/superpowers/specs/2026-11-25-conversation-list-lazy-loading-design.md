# Chat Conversation List Lazy Loading

## Goal

Load the chat conversation list incrementally in batches using cursor-based pagination and automatic scroll continuation across Orbit's chat surfaces (`/v2/agents`, `/agent`, and the assistant chat bubble history drawer), so users with many conversations do not fetch or render the entire history upfront.

## Architecture & API Contract

- **Endpoint:** `GET /api/ai/conversations`
- **Query parameters (Zod-validated):**
  - `limit`: integer `1..100` (defaults to `20`)
  - `cursor`: opaque cursor string encoding `(updatedAt, _id)` of the last item returned on the previous page
  - `search`: optional substring filter (up to 100 chars, case-insensitive regex-escaped match against `title`)
- **Response:**
  ```json
  {
    "data": [
      { "id": "...", "title": "...", "updatedAt": "...", "projectId": "..." }
    ],
    "pageInfo": {
      "nextCursor": "opaque-cursor-or-null",
      "hasMore": true
    }
  }
  ```
- **Authorization & Ordering:** Preserves `protect` authentication and `userId` scoping (`sequence: { $gt: 0 }`), sorted strictly by `{ updatedAt: -1, _id: -1 }`. Cursor pagination prevents duplicates or skipped rows if new turns update `updatedAt` while the user scrolls.
- **Backwards Compatibility:** `data` keeps the exact array shape (`id`, `title`, `updatedAt`, `projectId`). Frontend normalization treats responses without `pageInfo` (e.g., legacy fixtures) as `{ items, nextCursor: null, hasMore: false }`.

## Frontend Behavior

1. **Shared Service & Infinite Query (`aiService.ts` + `useInfiniteConversations.ts`):**
   - `aiService.listConversationsPage({ cursor, limit, search, signal })` fetches a single page and normalizes `ConversationPage`.
   - `useInfiniteConversations` wraps TanStack `useInfiniteQuery` under `["agent", "conversations", { search }]`, deduplicates items by `id`, exposes `conversations`, `hasMore`, `isFetchingNextPage`, `isFetchNextPageError`, `fetchNextPage`, and `refetch`.
   - Falls back cleanly when tests only mock `aiService.listConversations`.
2. **Scroll-triggered Lazy Loading (`useIntersectionLoadMore`):**
   - Observes a bottom sentinel inside the scrollable conversation list container (`root: containerRef.current`, `rootMargin: "0px 0px 120px 0px"`), with a `scroll` listener fallback if `IntersectionObserver` is unavailable.
   - Automatically triggers `fetchNextPage({ cancelRefetch: false })` when the user scrolls near the bottom and `!isFetching && !isError && hasMore`.
3. **Affected UI Consumers:**
   - **V2 Agents Sidebar** ([AgentProjectSidebar.tsx](../../../frontend/src/features/v2/components/AgentProjectSidebar.tsx) via [AgentsPage.tsx](../../../frontend/src/features/v2/pages/AgentsPage.tsx)): loads 20 items initially, auto-loads more on scroll in both Recent and Projects views, searches via query + client instant filter, shows inline loading indicator while fetching more, and shows inline Retry on continuation error without losing loaded items.
   - **V1 Agent History** ([AgentHistoryList.tsx](../../../frontend/src/features/agent/AgentHistoryList.tsx)): uses the same paginated `listConversationsPage` + scroll sentinel so V1 `/agent` shares lazy loading.
   - **Assistant Bubble Recent History** ([RecentConversations.jsx](../../../frontend/src/features/tasks/components/chat/RecentConversations.jsx)): fetches the initial batch for the top-3 preview and expands to lazy-loaded infinite scroll when `View all` / `expanded` is active.

## Acceptance Criteria

1. `GET /api/ai/conversations` validates `limit`, `cursor`, and `search`, scopes to `req.user._id`, returns `pageInfo: { nextCursor, hasMore }`, and rejects invalid cursors with 400.
2. Cursor pagination fetches `limit + 1` rows sorted `{ updatedAt: -1, _id: -1 }`, handles equal `updatedAt` timestamps via `_id` tie-breaking without duplicates or gaps.
3. All three chat history surfaces (`AgentProjectSidebar`, `AgentHistoryList`, `RecentConversations`) render the first page immediately, automatically load subsequent pages on scroll without a manual "Load more" button, deduplicate items, and recover from continuation errors via Retry while retaining already loaded rows.
4. Sending a message or starting a new conversation refreshes the list cleanly without duplicating rows.
5. Backend build + tests, frontend Vitest + lint + format + build, and Playwright E2E pass.
