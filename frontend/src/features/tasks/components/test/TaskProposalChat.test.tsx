import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ChatField from "../chat/ChatField";
import ChatToolbar from "../chat/ChatToolbar";
import { categoryService } from "@/shared/services/categoryService";
import { projectService } from "@/shared/services/projectService";
import { aiService } from "@/shared/services/aiService";
import fixture from "../../../../../../docs/superpowers/fixtures/a2ui-task-proposal-v09.json";
beforeEach(() => {
  vi.spyOn(categoryService, "getAllCategories").mockResolvedValue([
    { _id: fixture.proposal.items[0].categoryId, name: "Work" },
  ] as never);
  vi.spyOn(projectService, "getAllProjects").mockResolvedValue([]);
});
it("shows Plan tasks only with backend capability", () => {
  const base = { mode: "auto", setIntent: vi.fn() };
  const props = { disabled: false, onFiles: vi.fn(), onImages: vi.fn() };
  const { rerender } = render(
    <ChatToolbar
      {...props}
      chat={{ ...base, capabilities: { taskProposals: false } }}
    />,
  );
  expect(
    screen.queryByRole("button", { name: "Plan tasks" }),
  ).not.toBeInTheDocument();
  rerender(
    <ChatToolbar
      {...props}
      chat={{ ...base, capabilities: { taskProposals: true } }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Plan tasks" }));
  expect(base.setIntent).toHaveBeenCalledWith("task_proposal");
});
it("sends a string to the real chat hook contract with intent separately", async () => {
  const send = vi.fn().mockResolvedValue(true);
  render(
    <ChatField
      messages={[]}
      onSendMessage={send}
      chat={{ intent: "task_proposal", capabilities: { taskProposals: true } }}
    />,
  );
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Learn TypeScript" },
  });
  fireEvent.click(screen.getByRole("button", { name: /send message/i }));
  await waitFor(() =>
    expect(send).toHaveBeenCalledWith(
      "Learn TypeScript",
      undefined,
      [],
      "task_proposal",
    ),
  );
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
    expect(screen.getByRole("button", { name: /Xác nhận/ })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: /Xác nhận/ }));
  await waitFor(() =>
    expect(
      screen.getByRole("textbox", { name: "Task 1 title" }),
    ).toBeDisabled(),
  );
  expect(aiService.applyProposalAction).toHaveBeenCalledTimes(1);
});
