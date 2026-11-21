import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskProposalSurface } from "../chat/A2UI/TaskProposalSurface";
import { categoryService } from "@/shared/services/categoryService";
import { projectService } from "@/shared/services/projectService";
import type {
  ProposalEnvelope,
  ProposalItem,
  ProposalView,
} from "@/shared/types/A2UI/taskProposal";
import legacyFixture from "@/test/fixtures/a2ui-task-proposal-v09.json";

const CAT_WORK_ID = "507f1f77bcf86cd799439011";
const CAT_STUDY_ID = "507f1f77bcf86cd799439012";
const PROJ_IELTS_ID = "507f1f77bcf86cd799439021";

function makeItemId(index: number): string {
  const hex = (index + 1).toString(16).padStart(12, "0");
  return `33333333-3333-4333-8333-${hex}`;
}

function buildProposalEnvelope(
  items: ProposalItem[],
  overrides: Partial<ProposalView> = {},
): ProposalEnvelope {
  const base = structuredClone(legacyFixture) as ProposalEnvelope;
  const proposal: ProposalView = {
    ...base.proposal,
    items,
    selectedItemIds: items.map((item) => item.id),
    ...overrides,
  };
  (base.a2ui!.messages[2].updateDataModel as { value: unknown }).value =
    proposal;
  return {
    ...base,
    proposal,
  };
}

function makeTwentyItems(): ProposalItem[] {
  const priorities: Array<"High" | "Medium" | "Low"> = [
    "High",
    "Medium",
    "Low",
  ];
  return Array.from({ length: 20 }, (_, i) => ({
    id: makeItemId(i),
    title: `Proposed task ${i + 1}`,
    description:
      i % 2 === 0 ? `Detailed notes for proposed task ${i + 1}.` : "",
    priority: priorities[i % 3],
    categoryId: i % 2 === 0 ? CAT_STUDY_ID : CAT_WORK_ID,
    projectId: i % 3 === 0 ? PROJ_IELTS_ID : null,
    startDate: i === 0 ? "2026-11-22T09:00:00.000Z" : null,
    dueDate:
      i < 5 ? `2026-11-${String(22 + i).padStart(2, "0")}T17:00:00.000Z` : null,
  }));
}

describe("TaskProposal Slide Deck & Compact List", () => {
  beforeEach(() => {
    vi.spyOn(categoryService, "getAllCategories").mockResolvedValue([
      { _id: CAT_WORK_ID, name: "Work" },
      { _id: CAT_STUDY_ID, name: "Study" },
    ] as never);
    vi.spyOn(projectService, "getAllProjects").mockResolvedValue([
      { _id: PROJ_IELTS_ID, name: "IELTS Prep", status: "active" },
    ] as never);
  });

  it("renders a single-task proposal in preview mode without slide chrome until edit icon is clicked", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn().mockResolvedValue(undefined);
    const envelope = buildProposalEnvelope([
      {
        id: makeItemId(0),
        title: "Review essay structure",
        description: "Focus on Task 2 body paragraphs",
        priority: "High",
        categoryId: CAT_STUDY_ID,
        projectId: PROJ_IELTS_ID,
        startDate: null,
        dueDate: "2026-11-25T10:00:00.000Z",
      },
    ]);

    render(<TaskProposalSurface envelope={envelope} onAction={onAction} />);

    // Preview card renders text and metadata chips, no expanded textbox by default
    expect(await screen.findByText("Review essay structure")).toBeVisible();
    expect(screen.getByText("Focus on Task 2 body paragraphs")).toBeVisible();
    expect(screen.getByText("IELTS Prep")).toBeVisible();
    expect(screen.getByText("Study")).toBeVisible();
    expect(
      screen.queryByRole("textbox", { name: "Task 1 title" }),
    ).not.toBeInTheDocument();

    // Single-task hides slide nav, view switcher, and select-all
    expect(
      screen.queryByRole("button", { name: "Next task" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "List view" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", {
        name: /Select all tasks|Deselect all tasks/i,
      }),
    ).not.toBeInTheDocument();

    // Clicking pencil edit icon opens inline edit form
    await user.click(screen.getByRole("button", { name: "Edit task 1" }));
    const titleInput = screen.getByRole("textbox", { name: "Task 1 title" });
    await user.clear(titleInput);
    await user.type(titleInput, "Updated essay plan");

    // Clicking done check icon returns to preview with updated title
    await user.click(
      screen.getByRole("button", { name: "Done editing task 1" }),
    );
    expect(
      screen.queryByRole("textbox", { name: "Task 1 title" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Updated essay plan")).toBeVisible();
  });

  it("navigates a 20-task proposal one slide at a time with Prev/Next and preserves edits across slides", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn().mockResolvedValue(undefined);
    const envelope = buildProposalEnvelope(makeTwentyItems());

    render(<TaskProposalSurface envelope={envelope} onAction={onAction} />);

    expect(await screen.findByText("Proposed task 1")).toBeVisible();
    expect(screen.queryByText("Proposed task 2")).not.toBeInTheDocument();
    expect(screen.getByText("1 / 20")).toBeVisible();

    const prevBtn = screen.getByRole("button", { name: "Previous task" });
    const nextBtn = screen.getByRole("button", { name: "Next task" });
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeEnabled();

    // Edit task 1, then advance to task 2 (auto-exits edit mode while keeping draft)
    await user.click(screen.getByRole("button", { name: "Edit task 1" }));
    const titleInput = screen.getByRole("textbox", { name: "Task 1 title" });
    await user.clear(titleInput);
    await user.type(titleInput, "Edited slide one");

    await user.click(nextBtn);
    expect(screen.getByText("Proposed task 2")).toBeVisible();
    expect(screen.getByText("2 / 20")).toBeVisible();
    expect(
      screen.queryByRole("textbox", { name: /title/i }),
    ).not.toBeInTheDocument();

    // Navigate back to slide 1 -> edited title is preserved in preview
    await user.click(prevBtn);
    expect(screen.getByText("Edited slide one")).toBeVisible();
    expect(screen.getByText("1 / 20")).toBeVisible();
  });

  it("supports bulk select-all / deselect-all with indeterminate state and live Confirm count", async () => {
    const user = userEvent.setup();
    const envelope = buildProposalEnvelope(makeTwentyItems());

    render(<TaskProposalSurface envelope={envelope} onAction={vi.fn()} />);

    await screen.findByText("Proposed task 1");
    expect(screen.getByRole("button", { name: "Confirm (20)" })).toBeEnabled();

    // Deselect all
    const selectAll = screen.getByRole("checkbox", {
      name: "Deselect all tasks",
    }) as HTMLInputElement;
    expect(selectAll.checked).toBe(true);
    expect(selectAll.indeterminate).toBe(false);

    await user.click(selectAll);
    expect(screen.getByRole("button", { name: "Confirm (0)" })).toBeDisabled();
    expect(screen.getByText("0/20")).toBeVisible();

    // Select single item -> select-all becomes indeterminate
    await user.click(
      screen.getByRole("checkbox", { name: "Select task: Proposed task 1" }),
    );
    const partialSelectAll = screen.getByRole("checkbox", {
      name: "Select all tasks",
    }) as HTMLInputElement;
    expect(partialSelectAll.indeterminate).toBe(true);
    expect(screen.getByRole("button", { name: "Confirm (1)" })).toBeEnabled();

    // Click indeterminate select-all -> selects all 20 again
    await user.click(partialSelectAll);
    expect(screen.getByRole("button", { name: "Confirm (20)" })).toBeEnabled();
    expect(screen.getByText("20/20")).toBeVisible();
  });

  it("switches to compact list view, toggles checkboxes in place, jumps to slide preview, or jumps straight to edit", async () => {
    const user = userEvent.setup();
    const envelope = buildProposalEnvelope(makeTwentyItems());

    render(<TaskProposalSurface envelope={envelope} onAction={vi.fn()} />);
    await screen.findByText("Proposed task 1");

    // Switch to List view
    await user.click(screen.getByRole("button", { name: "List view" }));
    expect(screen.getByText("Proposed task 20")).toBeVisible();

    // Unchecking task 3 stays in List view
    await user.click(
      screen.getByRole("checkbox", { name: "Select task: Proposed task 3" }),
    );
    expect(screen.getByText("Proposed task 20")).toBeVisible();
    expect(screen.getByRole("button", { name: "Confirm (19)" })).toBeEnabled();

    // Clicking task 5 row jumps to Slide 5 in preview mode
    await user.click(screen.getByRole("button", { name: /Proposed task 5/ }));
    expect(screen.getByText("5 / 20")).toBeVisible();
    expect(
      screen.queryByRole("textbox", { name: "Task 5 title" }),
    ).not.toBeInTheDocument();

    // Back to List view, click Pencil on task 12 -> jumps to Slide 12 directly in Edit mode
    await user.click(screen.getByRole("button", { name: "List view" }));
    await user.click(screen.getByRole("button", { name: "Edit task 12" }));
    expect(screen.getByText("12 / 20")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Task 12 title" })).toHaveValue(
      "Proposed task 12",
    );
  });

  it("surfaces hidden-slide validation errors in the toolbar and jumps directly to the first invalid task in edit mode", async () => {
    const user = userEvent.setup();
    const items = makeTwentyItems();
    items[14].categoryId = "507f1f77bcf86cd799439099"; // invalid on Task 15
    const envelope = buildProposalEnvelope(items);

    render(<TaskProposalSurface envelope={envelope} onAction={vi.fn()} />);

    await screen.findByText("Proposed task 1");
    const issueBtn = await screen.findByRole("button", {
      name: /Jump to first task with an issue/i,
    });
    expect(issueBtn).toHaveTextContent("1 issue");
    expect(screen.getByRole("button", { name: "Confirm (20)" })).toBeDisabled();

    await user.click(issueBtn);
    expect(screen.getByText("15 / 20")).toBeVisible();
    expect(screen.getByLabelText("Task 15 category")).toBeVisible();
    expect(
      screen.getByText("Category is no longer available. Choose again."),
    ).toBeVisible();
  });

  it("renders terminal created state with read-only cards and scrollable created tasks list", async () => {
    const user = userEvent.setup();
    const onOpenTask = vi.fn();
    const items = makeTwentyItems();
    const envelope = buildProposalEnvelope(items, {
      status: "created",
      createdTasks: items.map((item, idx) => ({
        itemId: item.id,
        taskId: `created-task-${idx + 1}`,
        title: item.title,
      })),
    });

    render(<TaskProposalSurface envelope={envelope} onOpenTask={onOpenTask} />);

    expect(await screen.findByText("Created 20 tasks")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /Edit task/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: /Select all|Deselect all/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Select task: Proposed task 1" }),
    ).toBeDisabled();

    const createdList = screen.getByRole("list");
    const openBtn = within(createdList).getByRole("button", {
      name: "Created: Proposed task 20",
    });
    await user.click(openBtn);
    expect(onOpenTask).toHaveBeenCalledWith("created-task-20");
  });
});
