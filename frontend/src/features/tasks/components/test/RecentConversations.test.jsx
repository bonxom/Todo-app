import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import RecentConversations from "../chat/RecentConversations";
import { aiService } from "@/shared/services/aiService";

vi.mock("@/shared/services/aiService", () => ({
  aiService: {
    listConversations: vi.fn(),
    listConversationsPage: vi.fn(),
  },
}));

it("shows three recent conversations, expands the list and opens the selected ID", async () => {
  const user = userEvent.setup();
  const onOpen = vi.fn();
  aiService.listConversationsPage.mockResolvedValue({
    items: Array.from({ length: 5 }, (_, index) => ({
      id: `id-${index}`,
      title: `Conversation ${index}`,
      updatedAt: new Date().toISOString(),
    })),
    nextCursor: null,
    hasMore: false,
  });
  render(<RecentConversations onOpen={onOpen} />);
  await screen.findByText("Conversation 0");
  expect(screen.queryByText("Conversation 3")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "View all (5)" }));
  const search = screen.getByRole("searchbox", { name: "Search recent chats" });
  expect(search).toHaveFocus();
  await user.type(search, "Conversation 4");
  expect(screen.queryByText("Conversation 0")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /Conversation 4/ }));
  expect(onOpen).toHaveBeenCalledWith("id-4");
  await user.clear(search);
  await user.type(search, "No such title");
  expect(screen.getByText("No conversations found")).toBeVisible();
  await user.keyboard("{Escape}");
  expect(screen.queryByText("Conversation 4")).not.toBeInTheDocument();
  expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
});

it("allows retry after a failed history request", async () => {
  aiService.listConversationsPage
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({ items: [], nextCursor: null, hasMore: false });
  const user = userEvent.setup();
  render(<RecentConversations expanded onOpen={vi.fn()} />);
  await user.click(await screen.findByRole("button", { name: "Try again" }));
  expect(await screen.findByText("No conversations yet.")).toBeVisible();
});

it("lazy loads more conversations when scrolling expanded history", async () => {
  class MockObserver {
    static instances = [];
    constructor(callback) {
      this.callback = callback;
      this.elements = [];
      MockObserver.instances.push(this);
    }
    observe = (el) => {
      this.elements.push(el);
    };
    disconnect = () => {
      this.elements = [];
    };
    trigger(isIntersecting) {
      if (this.elements.length === 0) return;
      this.callback([{ isIntersecting, target: this.elements[0] }], this);
    }
  }
  vi.stubGlobal("IntersectionObserver", MockObserver);

  aiService.listConversationsPage
    .mockResolvedValueOnce({
      items: [
        {
          id: "p1-1",
          title: "Page 1 chat",
          updatedAt: new Date().toISOString(),
        },
      ],
      nextCursor: "cursor-2",
      hasMore: true,
    })
    .mockResolvedValueOnce({
      items: [
        {
          id: "p2-1",
          title: "Page 2 chat",
          updatedAt: new Date().toISOString(),
        },
      ],
      nextCursor: null,
      hasMore: false,
    });

  try {
    render(<RecentConversations expanded onOpen={vi.fn()} />);
    await screen.findByText("Page 1 chat");

    await waitFor(() => {
      expect(MockObserver.instances.at(-1)?.elements.length).toBeGreaterThan(0);
    });
    const observer = MockObserver.instances.at(-1);
    act(() => {
      observer.trigger(true);
    });

    await waitFor(() => {
      expect(screen.getByText("Page 2 chat")).toBeInTheDocument();
    });
  } finally {
    vi.unstubAllGlobals();
  }
});
