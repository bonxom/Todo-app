import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { aiService } from "@/shared/services/aiService";
import { createTestQueryClient } from "@/features/v2/test/testSupport";
import { useInfiniteConversations } from "../useInfiniteConversations";

vi.mock("@/shared/services/aiService", () => ({
  aiService: {
    listConversations: vi.fn(),
    listConversationsPage: vi.fn(),
  },
}));

describe("useInfiniteConversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads cursor pages, deduplicates by ID, and fetches next batch", async () => {
    vi.mocked(aiService.listConversationsPage)
      .mockResolvedValueOnce({
        items: [
          {
            id: "c1",
            title: "First chat",
            updatedAt: "2026-11-25T10:00:00.000Z",
            projectId: null,
          },
          {
            id: "c2",
            title: "Second chat",
            updatedAt: "2026-11-25T09:00:00.000Z",
            projectId: null,
          },
        ],
        nextCursor: "cursor-page-2",
        hasMore: true,
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: "c2",
            title: "Second chat",
            updatedAt: "2026-11-25T09:00:00.000Z",
            projectId: null,
          },
          {
            id: "c3",
            title: "Third chat",
            updatedAt: "2026-11-25T08:00:00.000Z",
            projectId: null,
          },
        ],
        nextCursor: null,
        hasMore: false,
      });

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () => useInfiniteConversations({ limit: 2 }),
      {
        wrapper,
      },
    );

    await waitFor(() => {
      expect(result.current.conversations.map((c) => c.id)).toEqual([
        "c1",
        "c2",
      ]);
    });
    expect(result.current.hasMore).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.conversations.map((c) => c.id)).toEqual([
        "c1",
        "c2",
        "c3",
      ]);
    });
    expect(result.current.hasMore).toBe(false);
    expect(aiService.listConversationsPage).toHaveBeenNthCalledWith(1, {
      cursor: null,
      limit: 2,
      search: "",
      signal: expect.any(AbortSignal),
    });
    expect(aiService.listConversationsPage).toHaveBeenNthCalledWith(2, {
      cursor: "cursor-page-2",
      limit: 2,
      search: "",
      signal: expect.any(AbortSignal),
    });
  });
});
