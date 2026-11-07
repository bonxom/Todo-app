import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ChatField from "../chat/ChatField";
import ChatToolbar from "../chat/ChatToolbar";
import { categoryService } from "@/shared/services/categoryService";
import { projectService } from "@/shared/services/projectService";
import { aiService } from "@/shared/services/aiService";
import fixture from "@/test/fixtures/a2ui-task-proposal-v09.json";
beforeEach(() => {
  vi.spyOn(aiService, "listConversations").mockResolvedValue([]);
  vi.spyOn(categoryService, "getAllCategories").mockResolvedValue([
    { _id: fixture.proposal.items[0].categoryId, name: "Work" },
  ] as never);
  vi.spyOn(projectService, "getAllProjects").mockResolvedValue([]);
});

it("has no manual proposal mode even when capability is enabled", () => {
  render(
    <ChatToolbar
      disabled={false}
      onFiles={vi.fn()}
      onImages={vi.fn()}
      chat={{ mode: "auto", capabilities: { taskProposals: true } }}
    />,
  );
  expect(
    screen.queryByRole("button", { name: "Plan tasks" }),
  ).not.toBeInTheDocument();
});
it("sends ordinary text without forcing a proposal intent", async () => {
  const send = vi.fn().mockResolvedValue(true);
  render(
    <ChatField
      messages={[]}
      onSendMessage={send}
      chat={{ capabilities: { taskProposals: true } }}
    />,
  );
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Learn TypeScript" },
  });
  fireEvent.click(screen.getByRole("button", { name: /send message/i }));
  await waitFor(() => expect(send).toHaveBeenCalledWith("Learn TypeScript"));
});
it("wires confirmation to shared API and displays committed state", async () => {
  const created = structuredClone(fixture);
  const result = {
    ...created,
    proposal: {
      ...created.proposal,
      status: "created",
      revision: 2,
      createdTasks: [
        {
          itemId: created.proposal.items[0].id,
          taskId: "507f1f77bcf86cd799439019",
          title: "Study Vocabulary",
        },
      ],
    },
  };
  (
    result.a2ui.messages[2] as { updateDataModel: { value: unknown } }
  ).updateDataModel.value = result.proposal;
  vi.spyOn(aiService, "applyProposalAction").mockResolvedValue(result as never);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ChatField
        messages={[
          {
            id: "m",
            sender: "bot",
            text: fixture.text,
            timestamp: new Date().toISOString(),
            proposal: fixture.proposal,
            a2ui: fixture.a2ui,
          },
        ]}
        onSendMessage={vi.fn()}
        chat={{
          conversationId: fixture.proposal.conversationId,
          setProposalDirty: vi.fn(),
        }}
      />
    </QueryClientProvider>,
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: /Confirm/ })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: /Confirm/ }));
  await waitFor(() =>
    expect(
      screen.getByRole("textbox", { name: "Task 1 title" }),
    ).toBeDisabled(),
  );
  expect(aiService.applyProposalAction).toHaveBeenCalledTimes(1);
});
