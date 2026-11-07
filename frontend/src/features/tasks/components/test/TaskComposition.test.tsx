import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskProposalSurface } from "../chat/A2UI/TaskProposalSurface";
import { categoryService } from "@/shared/services/categoryService";
import { projectService } from "@/shared/services/projectService";
import type { ProposalEnvelope } from "@/shared/types/A2UI/taskProposal";
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
});
