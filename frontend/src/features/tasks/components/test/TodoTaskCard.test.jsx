import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TodoTaskCard from "../TodoTaskCard";

describe("TodoTaskCard", () => {
  const baseTask = {
    _id: "task-1",
    title: "Complete monthly expense report",
    description: "Gather receipts and submit by EOD.",
    status: "in-progress",
    priority: "High",
    dueDate: "2026-10-15T12:00:00.000Z",
    projectId: {
      _id: "project-1",
      name: "Finance",
      color: "#6c8060",
    },
    categoryId: {
      _id: "cat-1",
      name: "Work",
    },
  };

  it("renders category name and icon when categoryId object is present", () => {
    render(<TodoTaskCard task={baseTask} />);

    const categoryElement = screen.getByText("Work");
    expect(categoryElement).toBeInTheDocument();
    expect(categoryElement.closest(".todo-task-category")).toBeInTheDocument();

    const projectElement = screen.getByText("Finance");
    expect(projectElement).toBeInTheDocument();

    const priorityElement = screen.getByText("High");
    expect(priorityElement).toBeInTheDocument();
  });

  it("renders category name when category is provided as an object or string", () => {
    const taskWithCategoryObj = {
      ...baseTask,
      categoryId: null,
      category: { name: "Personal" },
    };
    const { rerender } = render(<TodoTaskCard task={taskWithCategoryObj} />);
    expect(screen.getByText("Personal")).toBeInTheDocument();

    const taskWithCategoryStr = {
      ...baseTask,
      categoryId: null,
      category: "Health",
    };
    rerender(<TodoTaskCard task={taskWithCategoryStr} />);
    expect(screen.getByText("Health")).toBeInTheDocument();
  });

  it("does not render category section when category is null or undefined", () => {
    const taskWithoutCategory = {
      ...baseTask,
      categoryId: null,
      category: null,
    };
    const { container } = render(<TodoTaskCard task={taskWithoutCategory} />);

    expect(container.querySelector(".todo-task-category")).not.toBeInTheDocument();
  });

  it("triggers onEdit when task title is clicked", async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();
    render(<TodoTaskCard task={baseTask} onEdit={handleEdit} />);

    await user.click(screen.getByRole("button", { name: baseTask.title }));
    expect(handleEdit).toHaveBeenCalledWith(baseTask);
  });
});
