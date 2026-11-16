import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaskRow from "../components/TaskRow";
import {
  renderWithProviders,
  resetTestSession,
  createDeferred,
} from "./testSupport";
import { taskService } from "@/shared/services/taskService";
import type { Task } from "@/shared/types/domain";

vi.mock("@/shared/services/taskService");

const pendingTask: Task = {
  _id: "507f1f77bcf86cd799439011",
  title: "Pending Task",
  status: "pending",
  priority: "Medium",
  categoryId: null,
  projectId: null,
  startDate: "2026-11-14T08:00:00.000Z",
};

const inProgressTask: Task = {
  _id: "507f1f77bcf86cd799439012",
  title: "In-Progress Task",
  status: "in-progress",
  priority: "High",
  categoryId: null,
  projectId: null,
  startDate: "2026-11-14T08:00:00.000Z",
};

const completedTask: Task = {
  _id: "507f1f77bcf86cd799439013",
  title: "Completed Task",
  status: "completed",
  priority: "Low",
  categoryId: null,
  projectId: null,
  startDate: "2026-11-14T08:00:00.000Z",
};

describe("TaskActions in TaskRow", () => {
  beforeEach(() => {
    resetTestSession();
    vi.clearAllMocks();
  });

  it("renders 'Start' action for pending task and calls startTask", async () => {
    vi.mocked(taskService.startTask).mockResolvedValueOnce({
      ...pendingTask,
      status: "in-progress",
    });
    const user = userEvent.setup();

    renderWithProviders(<TaskRow task={pendingTask} onOpen={vi.fn()} />);

    const startBtn = screen.getByRole("button", { name: /^Start$/i });
    expect(startBtn).toBeInTheDocument();

    await user.click(startBtn);

    await waitFor(() => {
      expect(taskService.startTask).toHaveBeenCalledWith(pendingTask._id);
    });
  });

  it("renders 'Finish' action for in-progress task and calls finishTask", async () => {
    vi.mocked(taskService.finishTask).mockResolvedValueOnce({
      ...inProgressTask,
      status: "completed",
    });
    const user = userEvent.setup();

    renderWithProviders(<TaskRow task={inProgressTask} onOpen={vi.fn()} />);

    const finishBtn = screen.getByRole("button", { name: /^Finish$/i });
    expect(finishBtn).toBeInTheDocument();

    await user.click(finishBtn);

    await waitFor(() => {
      expect(taskService.finishTask).toHaveBeenCalledWith(inProgressTask._id);
    });
  });

  it("does not render action buttons for completed or given-up tasks", () => {
    renderWithProviders(<TaskRow task={completedTask} onOpen={vi.fn()} />);

    expect(
      screen.queryByRole("button", { name: /^Start$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Finish$/i }),
    ).not.toBeInTheDocument();
  });

  it("prevents duplicate requests on rapid double clicks", async () => {
    const { promise, resolve } = createDeferred<Task>();
    vi.mocked(taskService.startTask).mockReturnValueOnce(promise);
    const user = userEvent.setup();

    renderWithProviders(<TaskRow task={pendingTask} onOpen={vi.fn()} />);

    const startBtn = screen.getByRole("button", { name: /^Start$/i });

    // Double click rapidly
    const firstClick = user.click(startBtn);
    const secondClick = user.click(startBtn);

    await Promise.all([firstClick, secondClick]);

    expect(taskService.startTask).toHaveBeenCalledTimes(1);

    resolve({ ...pendingTask, status: "in-progress" });
  });

  it("displays inline error on mutation failure without throwing uncaught error", async () => {
    vi.mocked(taskService.startTask).mockRejectedValueOnce(
      new Error("Failed to start task"),
    );
    const user = userEvent.setup();

    renderWithProviders(<TaskRow task={pendingTask} onOpen={vi.fn()} />);

    const startBtn = screen.getByRole("button", { name: /^Start$/i });
    await user.click(startBtn);

    await waitFor(() => {
      expect(screen.getByText(/Failed to start task/i)).toBeInTheDocument();
    });
  });
});
