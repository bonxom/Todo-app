import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "./testSupport";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  render,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaskEditor from "../components/TaskEditor";
import {
  createDeferred,
  renderWithProviders,
  resetTestSession,
} from "./testSupport";
import { taskService } from "@/shared/services/taskService";
import { categoryService } from "@/shared/services/categoryService";
import { projectService } from "@/shared/services/projectService";
import type { Task } from "@/shared/types/domain";
vi.mock("@/shared/services/taskService");
vi.mock("@/shared/services/categoryService");
vi.mock("@/shared/services/projectService");
const task: Task = {
  _id: "task1",
  title: "Existing",
  description: "",
  status: "in-progress",
  priority: "High",
  categoryId: "missing-category",
  projectId: "missing-project",
  startDate: "2026-11-15T08:00:00Z",
  dueDate: "2026-11-16T08:00:00Z",
};
const save = () =>
  screen.getByRole("button", { name: /Create task|Save changes/ });
async function ready() {
  await waitFor(() => expect(save()).toBeEnabled());
}
describe("TaskEditor", () => {
  beforeEach(() => {
    resetTestSession();
    vi.resetAllMocks();
    vi.mocked(categoryService.getAllCategories).mockResolvedValue([]);
    vi.mocked(projectService.getAllProjects).mockResolvedValue([]);
    vi.mocked(taskService.createTask).mockResolvedValue(task);
    vi.mocked(taskService.updateTask).mockResolvedValue(task);
  });
  it("creates trimmed input with omitted optional assignments and no invented status", async () => {
    const onSaved = vi.fn();
    renderWithProviders(<TaskEditor onSaved={onSaved} onCancel={vi.fn()} />);
    await ready();
    await userEvent.type(screen.getByLabelText("Title"), "  New work  ");
    await userEvent.click(save());
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(taskService.createTask).toHaveBeenCalledWith({
      title: "New work",
      description: "",
      priority: "Medium",
    });
  });
  it("rejects whitespace titles and oversized descriptions", async () => {
    renderWithProviders(<TaskEditor onSaved={vi.fn()} onCancel={vi.fn()} />);
    await ready();
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "   " },
    });
    await userEvent.click(save());
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(taskService.createTask).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Valid" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "x".repeat(1001) },
    });
    await userEvent.click(save());
    expect(taskService.createTask).not.toHaveBeenCalled();
  });
  it("sends only changed edit fields and explicit nulls while preserving absent category and status", async () => {
    renderWithProviders(
      <TaskEditor task={task} onSaved={vi.fn()} onCancel={vi.fn()} />,
    );
    await ready();
    expect(screen.getByLabelText("Category")).toHaveValue("missing-category");
    await userEvent.selectOptions(screen.getByLabelText("Project"), "");
    fireEvent.change(screen.getByLabelText("Start date"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Due date"), {
      target: { value: "" },
    });
    await userEvent.click(save());
    await waitFor(() =>
      expect(taskService.updateTask).toHaveBeenCalledWith("task1", {
        projectId: null,
        startDate: null,
        dueDate: null,
      }),
    );
  });
  it("retains draft on API failure", async () => {
    vi.mocked(taskService.createTask).mockRejectedValue(
      new Error("Save failed"),
    );
    renderWithProviders(<TaskEditor onSaved={vi.fn()} onCancel={vi.fn()} />);
    await ready();
    await userEvent.type(screen.getByLabelText("Title"), "Keep me");
    await userEvent.click(save());
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Title")).toHaveValue("Keep me");
    expect(save()).toBeEnabled();
  });
  it("blocks duplicate saves and all closing during pending save", async () => {
    const deferred = createDeferred<Task>();
    vi.mocked(taskService.createTask).mockReturnValue(deferred.promise);
    const onCancel = vi.fn();
    renderWithProviders(<TaskEditor onSaved={vi.fn()} onCancel={onCancel} />);
    await ready();
    await userEvent.type(screen.getByLabelText("Title"), "Save once");
    await userEvent.dblClick(save());
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: /^close$/i }));
    expect(onCancel).not.toHaveBeenCalled();
    expect(taskService.createTask).toHaveBeenCalledOnce();
    deferred.resolve(task);
  });
  it("requires explicit discard for dirty close", async () => {
    const onCancel = vi.fn();
    renderWithProviders(<TaskEditor onSaved={vi.fn()} onCancel={onCancel} />);
    await ready();
    await userEvent.type(screen.getByLabelText("Title"), "Draft");
    await userEvent.keyboard("{Escape}");
    expect(onCancel).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.getByLabelText("Title")).toHaveValue("Draft");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Discard changes" }),
    );
    expect(onCancel).toHaveBeenCalledOnce();
  });
  it("blocks save while choices load and retries failed choices", async () => {
    const deferred = createDeferred<[]>();
    vi.mocked(categoryService.getAllCategories)
      .mockReturnValueOnce(deferred.promise)
      .mockResolvedValue([]);
    renderWithProviders(<TaskEditor onSaved={vi.fn()} onCancel={vi.fn()} />);
    expect(save()).toBeDisabled();
    deferred.reject(new Error("Offline"));
    await screen.findByRole("alert");
    expect(save()).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    await ready();
  });
  it("preserves missing original references and unsaved draft through query refetch", async () => {
    const { queryClient } = renderWithProviders(
      <TaskEditor task={task} onSaved={vi.fn()} onCancel={vi.fn()} />,
    );
    await ready();
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Changed" },
    });
    await queryClient.refetchQueries();
    expect(screen.getByLabelText("Title")).toHaveValue("Changed");
    expect(screen.getByLabelText("Project")).toHaveValue("missing-project");
    await userEvent.click(save());
    await waitFor(() =>
      expect(taskService.updateTask).toHaveBeenCalledWith("task1", {
        title: "Changed",
      }),
    );
  });
  it("rejects oversized title and converts optional dates without creating status", async () => {
    renderWithProviders(<TaskEditor onSaved={vi.fn()} onCancel={vi.fn()} />);
    await ready();
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "x".repeat(201) },
    });
    await userEvent.click(save());
    expect(taskService.createTask).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Schedule" },
    });
    fireEvent.change(screen.getByLabelText("Start date"), {
      target: { value: "2026-11-15T09:30" },
    });
    await userEvent.click(save());
    await waitFor(() =>
      expect(taskService.createTask).toHaveBeenCalledWith({
        title: "Schedule",
        description: "",
        priority: "Medium",
        startDate: expect.stringMatching(
          /^2026-11-15T09:30:00[+-]\d{2}:\d{2}$/,
        ),
      }),
    );
  });
  it("offers active projects while retaining the task's completed project", async () => {
    vi.mocked(projectService.getAllProjects).mockResolvedValue([
      {
        _id: "active",
        name: "Active project",
        description: "",
        color: "#123456",
        status: "active",
      },
      {
        _id: "done",
        name: "Other completed project",
        description: "",
        color: "#123456",
        status: "completed",
      },
      {
        _id: "missing-project",
        name: "Original completed project",
        description: "",
        color: "#123456",
        status: "completed",
      },
    ] as Awaited<ReturnType<typeof projectService.getAllProjects>>);
    renderWithProviders(
      <TaskEditor task={task} onSaved={vi.fn()} onCancel={vi.fn()} />,
    );
    await ready();
    expect(
      screen.getByRole("option", { name: "Active project" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Other completed project" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Project")).toHaveValue("missing-project");
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Changed" },
    });
    await userEvent.click(save());
    await waitFor(() =>
      expect(taskService.updateTask).toHaveBeenCalledWith("task1", {
        title: "Changed",
      }),
    );
  });
  it("blocks browser Back for dirty drafts until explicit discard", async () => {
    const router = createMemoryRouter(
      [
        { path: "/before", element: <p>Previous page</p> },
        {
          path: "/edit",
          element: <TaskEditor onSaved={vi.fn()} onCancel={vi.fn()} />,
        },
      ],
      { initialEntries: ["/before", "/edit"] },
    );
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    await ready();
    await userEvent.type(screen.getByLabelText("Title"), "Draft");
    await act(() => router.navigate(-1));
    expect(screen.getByLabelText("Title")).toHaveValue("Draft");
    await userEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(router.state.location.pathname).toBe("/edit");
    await act(() => router.navigate(-1));
    await userEvent.click(
      screen.getByRole("button", { name: "Discard changes" }),
    );
    await screen.findByText("Previous page");
  });
  it("cancels pending navigation and never replays it after save", async () => {
    const deferred = createDeferred<Task>();
    vi.mocked(taskService.createTask).mockReturnValue(deferred.promise);
    const onSaved = vi.fn();
    const router = createMemoryRouter(
      [
        { path: "/before", element: <p>Previous page</p> },
        {
          path: "/edit",
          element: <TaskEditor onSaved={onSaved} onCancel={vi.fn()} />,
        },
      ],
      { initialEntries: ["/before", "/edit"] },
    );
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    await ready();
    await userEvent.type(screen.getByLabelText("Title"), "Draft");
    await userEvent.click(save());
    await act(() => router.navigate(-1));
    expect(router.state.location.pathname).toBe("/edit");
    expect(
      screen.queryByRole("button", { name: "Discard changes" }),
    ).not.toBeInTheDocument();
    await act(() => deferred.resolve(task));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(router.state.location.pathname).toBe("/edit");
  });
  it("prevents browser refresh while dirty", async () => {
    renderWithProviders(<TaskEditor onSaved={vi.fn()} onCancel={vi.fn()} />);
    await ready();
    const clean = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);
    await userEvent.type(screen.getByLabelText("Title"), "Draft");
    const dirty = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });

  it("pre-fills default start and due dates without marking clean draft dirty", async () => {
    const onSaved = vi.fn();
    const onCancel = vi.fn();
    renderWithProviders(
      <TaskEditor
        initialStartDate={new Date(2026, 10, 26, 0, 0, 0, 0)}
        initialDueDate={new Date(2026, 10, 26, 23, 59, 59, 999)}
        onSaved={onSaved}
        onCancel={onCancel}
      />,
    );
    await ready();

    expect(screen.getByLabelText("Start date")).toHaveValue("2026-11-26T00:00");
    expect(screen.getByLabelText("Due date")).toHaveValue("2026-11-26T23:59");

    // Closing immediately without edits does not ask for discard confirmation.
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledOnce();

    // Submitting sends both default startDate and dueDate.
    await userEvent.type(screen.getByLabelText("Title"), "Full day task");
    await userEvent.click(save());
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(taskService.createTask).toHaveBeenCalledWith({
      title: "Full day task",
      description: "",
      priority: "Medium",
      startDate: expect.stringMatching(/^2026-11-26T00:00:00[+-]\d{2}:\d{2}$/),
      dueDate: expect.stringMatching(/^2026-11-26T23:59:00[+-]\d{2}:\d{2}$/),
    });
  });
});
