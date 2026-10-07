import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
