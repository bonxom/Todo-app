import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaskDetailsDialog from "../components/TaskDetailsDialog";
import { renderWithProviders, resetTestSession } from "./testSupport";
import { taskService } from "@/shared/services/taskService";
import type { Task } from "@/shared/types/domain";

vi.mock("@/shared/services/taskService");

const validTaskId = "507f1f77bcf86cd799439011";

const mockTaskDetail: Task = {
  _id: validTaskId,
  title: "Launch Liquid Glass",
  description: "Finish all V2 dashboard requirements and verification.",
  status: "in-progress",
  priority: "High",
  categoryId: { _id: "cat1", name: "Engineering" },
  projectId: {
    _id: "proj1",
    name: "Orbit V2",
    description: "",
    color: "#0284c7",
    status: "active",
  },
  startDate: "2026-11-14T08:00:00.000Z",
  dueDate: "2026-11-20T18:00:00.000Z",
};

describe("TaskDetailsDialog", () => {
  beforeEach(() => {
    resetTestSession();
    vi.clearAllMocks();
  });

  it("fetches and renders task details for valid 24-hex ObjectId", async () => {
    vi.mocked(taskService.getTaskById).mockResolvedValueOnce(mockTaskDetail);
    const onClose = vi.fn();

    renderWithProviders(
      <TaskDetailsDialog taskId={validTaskId} onClose={onClose} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Launch Liquid Glass")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Finish all V2 dashboard requirements and verification.",
        ),
      ).toBeInTheDocument();
      expect(screen.getByText("Orbit V2")).toBeInTheDocument();
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });

    expect(taskService.getTaskById).toHaveBeenCalledWith(
      validTaskId,
      expect.anything(),
    );

    expect(screen.queryByRole("link", { name: /V1/i })).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Edit task" }),
    ).toBeInTheDocument();
  });

  it("renders unavailable message and never calls service for invalid ObjectId", () => {
    const onClose = vi.fn();

    renderWithProviders(
      <TaskDetailsDialog taskId="invalid-id-123" onClose={onClose} />,
    );

    expect(screen.getByText(/This task is unavailable/i)).toBeInTheDocument();
    expect(taskService.getTaskById).not.toHaveBeenCalled();
  });

  it("renders unavailable message for 403 or 404 response", async () => {
    const error404 = Object.assign(new Error("Task not found"), {
      status: 404,
    });
    vi.mocked(taskService.getTaskById).mockRejectedValueOnce(error404);
    const onClose = vi.fn();

    renderWithProviders(
      <TaskDetailsDialog taskId={validTaskId} onClose={onClose} />,
    );

    await waitFor(() => {
      expect(screen.getByText(/This task is unavailable/i)).toBeInTheDocument();
    });
  });

  it("renders error state with retry button on network/500 failure", async () => {
    vi.mocked(taskService.getTaskById).mockRejectedValueOnce(
      new Error("Server error 500"),
    );
    const onClose = vi.fn();

    renderWithProviders(
      <TaskDetailsDialog taskId={validTaskId} onClose={onClose} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to load task details/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Retry/i }),
      ).toBeInTheDocument();
    });
  });

  it("calls onClose when close button is clicked", async () => {
    vi.mocked(taskService.getTaskById).mockResolvedValueOnce(mockTaskDetail);
    const onClose = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <TaskDetailsDialog taskId={validTaskId} onClose={onClose} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Launch Liquid Glass")).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole("button", { name: /Close/i });
    await user.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
