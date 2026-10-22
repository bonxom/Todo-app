import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CalendarTaskDetailCard from "../CalendarTaskDetailCard";

const task = {
  _id: "task-compact-1",
  title: "Prepare a detailed launch checklist for the Orbit release",
  description:
    "Review owners, deadlines, dependencies, and launch-day communication.",
  status: "in-progress",
  priority: "High",
  dueDate: "2026-08-23T09:00:00.000Z",
  projectId: { _id: "project-1", name: "Orbit launch" },
  categoryId: { _id: "category-1", name: "Work" },
};

describe("CalendarTaskDetailCard compact layout", () => {
  it.each([
    ["given-up", "#ef4444"],
    ["in-progress", "#3b82f6"],
    ["completed", "#22c55e"],
  ])("runs the shared two-second border effect for %s", (status, color) => {
    const initial = { ...task, status: "pending" };
    const { container, rerender } = render(<CalendarTaskDetailCard task={initial} />);
    const animate = vi.fn(() => ({ cancel: vi.fn() }));
    container.querySelector("article").animate = animate;
    rerender(<CalendarTaskDetailCard task={{ ...task, status }} />);
    expect(animate).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ boxShadow: `inset 0 0 0 2px ${color}` }),
    ]), { duration: 2000, easing: "linear" });
  });
  it("keeps title and description to one line before secondary details", () => {
    render(
      <CalendarTaskDetailCard
        task={task}
        compact
        onClick={() => {}}
        onTaskStatusChange={() => {}}
        onTaskDelete={() => {}}
      />,
    );

    const title = screen.getByRole("heading", { name: task.title });
    const description = screen.getByText(task.description);
    const status = screen.getByText("In Progress");
    const levelDot = screen.getByLabelText("Task level: Hard");
    const metadataGrid = screen
      .getByText("Orbit launch")
      .closest("[data-compact-metadata-grid]");

    expect(title).toHaveClass("truncate");
    expect(description).toHaveClass("truncate");
    expect(
      title.compareDocumentPosition(description) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      description.compareDocumentPosition(status) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(levelDot).toHaveStyle({ background: "var(--color-danger)" });
    expect(screen.queryByText("High")).not.toBeInTheDocument();
    expect(metadataGrid).toHaveClass(
      "grid",
      "grid-cols-[minmax(0,1fr)_minmax(0,7rem)]",
    );
    expect(metadataGrid.children[0]).toContainElement(status);
    expect(metadataGrid.children[1]).toContainElement(
      screen.getByText("Orbit launch"),
    );
    expect(metadataGrid.children[3]).toContainElement(screen.getByText("Work"));
  });
});
