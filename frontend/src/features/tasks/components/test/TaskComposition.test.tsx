import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TaskProposalSurface } from "../chat/A2UI/TaskProposalSurface";
import { TaskProposalMessage } from "../chat/A2UI/TaskProposalMessage";
import { useTaskProposalEditor } from "../../hooks/A2UI/useTaskProposalEditor";
import { AgentSessionProvider } from "@/features/agent/AgentSessionProvider";
import { aiService } from "@/shared/services/aiService";
import { ApiError } from "@/shared/services/apiError";
import { categoryService } from "@/shared/services/categoryService";
import { projectService } from "@/shared/services/projectService";
import type {
  ProposalEnvelope,
  ProposalView,
} from "@/shared/types/A2UI/taskProposal";
import type { UiSurfaceEnvelope } from "@/shared/types/A2UI/uiSurface";
import legacyFixture from "@/test/fixtures/a2ui-task-proposal-v09.json";
import composedFixture from "@/test/fixtures/a2ui-composition-v09.json";

const makeComposedEnvelope = (): ProposalEnvelope & {
  surface: UiSurfaceEnvelope;
} => {
  const surface = structuredClone(
    composedFixture.proposal,
  ) as UiSurfaceEnvelope;
  const proposal = structuredClone(
    (
      surface.a2ui.messages[2].updateDataModel as {
        value: { proposal: ProposalEnvelope["proposal"] };
      }
    ).value.proposal,
  );
  return {
    proposal,
    text: surface.text,
    surface,
    a2ui: structuredClone(legacyFixture.a2ui) as ProposalEnvelope["a2ui"],
  };
};

describe("TaskComposition (split TaskList + TaskProposalActions & legacy TaskProposalForm)", () => {
  beforeEach(() => {
    vi.spyOn(categoryService, "getAllCategories").mockResolvedValue([
      { _id: "507f1f77bcf86cd799439011", name: "Work" },
      { _id: "507f1f77bcf86cd799439012", name: "Study" },
    ] as never);
    vi.spyOn(projectService, "getAllProjects").mockResolvedValue([
      {
        _id: "507f1f77bcf86cd799439021",
        name: "IELTS Prep",
        status: "active",
      },
      {
        _id: "507f1f77bcf86cd799439022",
        name: "Archived Project",
        status: "completed",
      },
    ] as never);
    vi.spyOn(aiService, "getConversationCapabilities").mockResolvedValue({
      taskProposals: true,
      uiComposition: true,
    });
    vi.spyOn(aiService, "getConversation").mockResolvedValue(null);
  });

  it("preserves legacy TaskProposalForm behavior when no composed surface is present", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn().mockResolvedValue(undefined);
    const envelope = structuredClone(legacyFixture) as ProposalEnvelope;

    render(<TaskProposalSurface envelope={envelope} onAction={onAction} />);
    await screen.findByRole("option", { name: "Work" });

    const titleInput = screen.getByLabelText("Task 1 title");
    await user.clear(titleInput);
    expect(screen.getByRole("button", { name: /Xác nhận/ })).toBeDisabled();
    await user.type(titleInput, "Read chapter 1");
    await user.click(screen.getByRole("button", { name: /Xác nhận/ }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "confirm",
        items: [expect.objectContaining({ title: "Read chapter 1" })],
      }),
    );
  });

  it("synchronizes split TaskList and TaskProposalActions across cards for editing, validation, selection, save, confirm, and cancel", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn().mockResolvedValue(undefined);
    const onDirtyChange = vi.fn();
    const envelope = makeComposedEnvelope();

    render(
      <TaskProposalSurface
        envelope={envelope}
        onAction={onAction}
        onDirtyChange={onDirtyChange}
      />,
    );

    // Introductory Text from presentation catalog renders alongside task nodes
    expect(
      await screen.findByText(
        "Review and confirm the proposed study tasks below.",
      ),
    ).toBeInTheDocument();
    await screen.findByRole("option", { name: "Study" });

    // Clear title -> disables Confirm and Save in separate TaskProposalActions node
    await user.clear(screen.getByLabelText("Task 1 title"));
    expect(screen.getByRole("button", { name: /Xác nhận/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Lưu bản nháp" })).toBeDisabled();

    // Type new title -> enables Confirm and Save and reports dirty state
    await user.type(screen.getByLabelText("Task 1 title"), "Read chapter 1");
    expect(onDirtyChange).toHaveBeenCalledWith(true);
    expect(screen.getByText("Chưa lưu thay đổi")).toBeInTheDocument();

    // Edit category, project, and dates
    await user.selectOptions(
      screen.getByLabelText("Task 1 category"),
      "507f1f77bcf86cd799439012",
    );
    await user.selectOptions(
      screen.getByLabelText("Task 1 project"),
      "507f1f77bcf86cd799439021",
    );

    // Toggle selection off -> Confirm disabled, Save still enabled
    const checkbox = screen.getByRole("checkbox", {
      name: /Chọn công việc/i,
    });
    await user.click(checkbox);
    expect(screen.getByRole("button", { name: /Xác nhận/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Lưu bản nháp" })).toBeEnabled();

    // Save draft with 0 selected items
    await user.click(screen.getByRole("button", { name: "Lưu bản nháp" }));
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "save",
        selectedItemIds: [],
        items: [
          expect.objectContaining({
            title: "Read chapter 1",
            categoryId: "507f1f77bcf86cd799439012",
            projectId: "507f1f77bcf86cd799439021",
          }),
        ],
      }),
    );

    // Re-select and confirm
    onAction.mockClear();
    await user.click(checkbox);
    await user.click(screen.getByRole("button", { name: /Xác nhận/ }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "confirm",
        selectedItemIds: [envelope.proposal.items[0].id],
      }),
    );

    // Cancel action
    onAction.mockClear();
    await user.click(screen.getByRole("button", { name: "Hủy" }));
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "cancel",
        revision: envelope.proposal.revision,
      }),
    );
  });

  it("blocks confirm when referenced category or project is unavailable and prevents duplicate clicks while submitting", async () => {
    const user = userEvent.setup();
    const envelope = makeComposedEnvelope();
    envelope.proposal.items[0].categoryId = "507f1f77bcf86cd799439099"; // unavailable
    (
      envelope.surface.a2ui.messages[2].updateDataModel as {
        value: { proposal: unknown };
      }
    ).value.proposal = envelope.proposal;

    let resolveAction!: () => void;
    const onAction = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveAction = resolve;
        }),
    );

    render(<TaskProposalSurface envelope={envelope} onAction={onAction} />);
    await screen.findByRole("option", { name: "Work" });

    expect(
      screen.getByText("Danh mục không còn khả dụng. Hãy chọn lại."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Xác nhận/ })).toBeDisabled();

    // Fix category to valid Work
    await user.selectOptions(
      screen.getByLabelText("Task 1 category"),
      "507f1f77bcf86cd799439011",
    );
    expect(screen.getByRole("button", { name: /Xác nhận/ })).toBeEnabled();

    // Click confirm twice while pending -> only 1 call
    const confirmBtn = screen.getByRole("button", { name: /Xác nhận/ });
    await user.click(confirmBtn);
    await user.click(confirmBtn);
    expect(onAction).toHaveBeenCalledTimes(1);
    resolveAction();
  });

  it("locks both TaskList and TaskProposalActions in terminal created state and opens created tasks", async () => {
    const user = userEvent.setup();
    const onOpenTask = vi.fn();
    const envelope = makeComposedEnvelope();
    envelope.proposal.status = "created";
    envelope.proposal.createdTasks = [
      {
        itemId: envelope.proposal.items[0].id,
        taskId: "task-created-123",
        title: "Study Vocabulary",
      },
    ];
    (
      envelope.surface.a2ui.messages[2].updateDataModel as {
        value: { proposal: unknown };
      }
    ).value.proposal = envelope.proposal;

    render(<TaskProposalSurface envelope={envelope} onOpenTask={onOpenTask} />);

    expect(await screen.findByLabelText("Task 1 title")).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /Xác nhận/ }),
    ).not.toBeInTheDocument();

    const openBtn = screen.getByRole("button", {
      name: "Đã tạo: Study Vocabulary",
    });
    await user.click(openBtn);
    expect(onOpenTask).toHaveBeenCalledWith("task-created-123");
  });

  it("falls back to legacy complete form with the same editor state when composed surface fails validation", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn().mockResolvedValue(undefined);
    const envelope = makeComposedEnvelope();
    // Corrupt composed surface graph so A2uiHost triggers fallback, while proposal remains valid
    (
      envelope.surface.a2ui.messages[1].updateComponents as {
        components: Record<string, unknown>[];
      }
    ).components = [{ id: "root", component: "Card", children: ["missing"] }];

    render(<TaskProposalSurface envelope={envelope} onAction={onAction} />);
    await screen.findByRole("option", { name: "Work" });

    // Legacy form is rendered as fallback and remains interactive
    const titleInput = screen.getByLabelText("Task 1 title");
    await user.clear(titleInput);
    await user.type(titleInput, "Fallback edited task");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Xác nhận/ })).toBeEnabled(),
    );
    await user.click(screen.getByRole("button", { name: /Xác nhận/ }));
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "confirm",
        items: [expect.objectContaining({ title: "Fallback edited task" })],
      }),
    );
  });

  it("resets editor draft to new server revision when baseline advances even if controlledDraft is momentarily stale", () => {
    const rev1 = structuredClone(legacyFixture.proposal) as ProposalView;
    const staleDraft: ProposalView = {
      ...rev1,
      items: [{ ...rev1.items[0], title: "Edited in rev 1" }],
    };
    const rev2: ProposalView = {
      ...rev1,
      revision: 2,
      items: [{ ...rev1.items[0], title: "Edited in rev 1" }],
    };

    const { result, rerender } = renderHook(
      ({ proposal, draft }: { proposal: ProposalView; draft?: ProposalView }) =>
        useTaskProposalEditor({ proposal, draft }),
      {
        initialProps: {
          proposal: rev1,
          draft: staleDraft as ProposalView | undefined,
        },
      },
    );

    expect(result.current.draft.revision).toBe(1);

    // Server returns revision 2 while parent still passes staleDraft (revision 1) for one render
    rerender({ proposal: rev2, draft: staleDraft });
    expect(result.current.draft.revision).toBe(2);

    // Parent effect then clears stale draft to undefined
    rerender({ proposal: rev2, draft: undefined });
    expect(result.current.draft.revision).toBe(2);
  });

  it("saves a draft and immediately confirms without reloading the page when wrapped in AgentSessionProvider", async () => {
    const user = userEvent.setup();
    const initial = makeComposedEnvelope();

    const applyAction = vi
      .spyOn(aiService, "applyProposalAction")
      .mockImplementation(async (_convId, _propId, action) => {
        const nextProposal: ProposalView = {
          ...initial.proposal,
          revision: action.revision + 1,
          status: action.action === "confirm" ? "created" : "draft",
          items:
            action.action === "cancel"
              ? initial.proposal.items
              : (action.items ?? initial.proposal.items),
          selectedItemIds:
            action.action === "cancel"
              ? initial.proposal.selectedItemIds
              : (action.selectedItemIds ?? initial.proposal.selectedItemIds),
          createdTasks:
            action.action === "confirm"
              ? [
                  {
                    itemId: initial.proposal.items[0].id,
                    taskId: "task-created-after-save",
                    title:
                      action.items?.[0]?.title ??
                      initial.proposal.items[0].title,
                  },
                ]
              : [],
        };
        const nextSurface = structuredClone(initial.surface);
        (
          nextSurface.a2ui.messages[2].updateDataModel as {
            value: { proposal: ProposalView };
          }
        ).value.proposal = nextProposal;
        return {
          proposal: nextProposal,
          text: nextSurface.text,
          a2ui: initial.a2ui,
          surface: nextSurface,
        };
      });

    render(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <AgentSessionProvider skipInitialLoad>
          <TaskProposalMessage envelope={initial} />
        </AgentSessionProvider>
      </QueryClientProvider>,
    );

    await screen.findByRole("option", { name: "Work" });
    const titleInput = screen.getByLabelText("Task 1 title");
    await user.clear(titleInput);
    await user.type(titleInput, "Saved then confirmed");

    await user.click(screen.getByRole("button", { name: "Lưu bản nháp" }));
    await waitFor(() =>
      expect(screen.getByText("Đã lưu bản nháp")).toBeInTheDocument(),
    );

    // Immediately confirm without page reload
    await user.click(screen.getByRole("button", { name: /Xác nhận/ }));
    await waitFor(() => expect(applyAction).toHaveBeenCalledTimes(2));
    expect(applyAction.mock.calls[0][2]).toEqual(
      expect.objectContaining({ action: "save", revision: 1 }),
    );
    expect(applyAction.mock.calls[1][2]).toEqual(
      expect.objectContaining({
        action: "confirm",
        revision: 2,
        items: [expect.objectContaining({ title: "Saved then confirmed" })],
      }),
    );
    expect(await screen.findByLabelText("Task 1 title")).toBeDisabled();
  });

  it("discards stale session draft when reloading after a 409 conflict and allows confirming the reloaded revision", async () => {
    const user = userEvent.setup();
    const initial = makeComposedEnvelope();

    const applyAction = vi
      .spyOn(aiService, "applyProposalAction")
      .mockRejectedValueOnce(new ApiError("Conflict", 409))
      .mockImplementationOnce(async (_convId, _propId, action) => {
        const items =
          action.action === "cancel" ? initial.proposal.items : action.items;
        const selectedItemIds =
          action.action === "cancel"
            ? initial.proposal.selectedItemIds
            : action.selectedItemIds;
        const confirmedProposal: ProposalView = {
          ...initial.proposal,
          revision: action.revision + 1,
          status: "created",
          items,
          selectedItemIds,
          createdTasks: [
            {
              itemId: initial.proposal.items[0].id,
              taskId: "task-after-reload",
              title: items[0]?.title ?? initial.proposal.items[0].title,
            },
          ],
        };
        const nextSurface = structuredClone(initial.surface);
        (
          nextSurface.a2ui.messages[2].updateDataModel as {
            value: { proposal: ProposalView };
          }
        ).value.proposal = confirmedProposal;
        return {
          proposal: confirmedProposal,
          text: nextSurface.text,
          a2ui: initial.a2ui,
          surface: nextSurface,
        };
      });

    const reloadedProposal: ProposalView = {
      ...initial.proposal,
      revision: 2,
      items: [{ ...initial.proposal.items[0], title: "Server latest title" }],
    };
    const reloadedSurface = structuredClone(initial.surface);
    (
      reloadedSurface.a2ui.messages[2].updateDataModel as {
        value: { proposal: ProposalView };
      }
    ).value.proposal = reloadedProposal;

    vi.spyOn(aiService, "getConversation").mockResolvedValue({
      conversationId: initial.proposal.conversationId,
      title: "Study",
      before: null,
      mode: "auto",
      pending: [],
      messages: [
        {
          id: "msg-reloaded",
          sender: "bot",
          text: reloadedSurface.text,
          timestamp: new Date().toISOString(),
          proposal: reloadedProposal,
          a2ui: initial.a2ui,
          surface: reloadedSurface,
        },
      ],
    });

    render(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <AgentSessionProvider skipInitialLoad>
          <TaskProposalMessage envelope={initial} />
        </AgentSessionProvider>
      </QueryClientProvider>,
    );

    await screen.findByRole("option", { name: "Work" });
    const titleInput = screen.getByLabelText("Task 1 title");
    await user.clear(titleInput);
    await user.type(titleInput, "Stale local edit");

    // Attempt confirm -> 409 Conflict
    await user.click(screen.getByRole("button", { name: /Xác nhận/ }));
    const reloadBtn = await screen.findByRole("button", {
      name: "Tải lại đề xuất",
    });
    await user.click(reloadBtn);

    // Confirm discarding dirty edits
    const discardAndReloadBtn = await screen.findByRole("button", {
      name: "Bỏ thay đổi và tải lại",
    });
    await user.click(discardAndReloadBtn);

    await waitFor(() =>
      expect(screen.getByLabelText("Task 1 title")).toHaveValue(
        "Server latest title",
      ),
    );

    // Confirm now sends revision 2 with the reloaded items
    await user.click(screen.getByRole("button", { name: /Xác nhận/ }));
    await waitFor(() => expect(applyAction).toHaveBeenCalledTimes(2));
    expect(applyAction.mock.calls[1][2]).toEqual(
      expect.objectContaining({
        action: "confirm",
        revision: 2,
        items: [expect.objectContaining({ title: "Server latest title" })],
      }),
    );
  });
});
