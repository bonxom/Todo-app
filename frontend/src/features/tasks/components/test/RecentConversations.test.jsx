import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import RecentConversations from "../chat/RecentConversations";
import { aiService } from "@/shared/services/aiService";

vi.mock("@/shared/services/aiService", () => ({ aiService: { listConversations: vi.fn() } }));

it("shows three recent conversations, expands the list and opens the selected ID", async () => {
  const user = userEvent.setup();
  const onOpen = vi.fn();
  aiService.listConversations.mockResolvedValue(Array.from({ length: 5 }, (_, index) => ({
    id: `id-${index}`, title: `Conversation ${index}`, updatedAt: new Date().toISOString(),
  })));
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
  expect(screen.getByText("No matching chats")).toBeVisible();
  await user.keyboard("{Escape}");
  expect(screen.queryByText("Conversation 4")).not.toBeInTheDocument();
  expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
});

it("allows retry after a failed history request", async () => {
  aiService.listConversations.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce([]);
  const user = userEvent.setup();
  render(<RecentConversations onOpen={vi.fn()} />);
  await user.click(await screen.findByRole("button", { name: "Thử lại" }));
  expect(await screen.findByText("No messages yet. Start a conversation!")).toBeVisible();
});
