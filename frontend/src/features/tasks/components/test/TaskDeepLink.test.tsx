import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/services/apiError";
import TaskDeepLink from "../TaskDeepLink";
import { taskService } from "@/shared/services/taskService";
vi.mock("../TaskDetailButton", () => ({
  default: ({
    task,
    onClose,
    onProjectCreated,
  }: {
    task: { title: string };
    onClose: () => void;
    onProjectCreated: () => void;
  }) => (
    <div role="dialog">
      {task.title}
      <input aria-label="Task title" defaultValue={task.title} />
      <button onClick={onProjectCreated}>Project created</button>
      <button onClick={onClose}>Close task</button>
    </div>
  ),
}));
const id = "507f1f77bcf86cd799439011";
afterEach(() => vi.restoreAllMocks());
function Location() {
  const location = useLocation();
  return <output>{location.search}</output>;
}
function mount(taskId = id) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={[`/dashboard?keep=yes&taskId=${taskId}`]}>
        <TaskDeepLink />
        <Location />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
it("loads task independently of list and removes only its param on close", async () => {
  vi.spyOn(taskService, "getTaskById").mockResolvedValue({
    _id: id,
    title: "Outside current page",
    status: "pending",
    priority: "Medium",
    categoryId: null,
    projectId: null,
    startDate: "2026-11-09",
  });
  const user = userEvent.setup();
  mount();
  expect(await screen.findByRole("dialog")).toHaveTextContent(
    "Outside current page",
  );
  await user.click(screen.getByRole("button", { name: "Close task" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("?keep=yes");
});
it("does not fetch malformed IDs", async () => {
  const fetch = vi.spyOn(taskService, "getTaskById");
  mount("bad");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "This task is no longer available",
  );
  expect(fetch).not.toHaveBeenCalled();
});
it("shows unavailable for 404 and retry for network errors", async () => {
  vi.spyOn(taskService, "getTaskById").mockRejectedValue(
    new ApiError("Not found", 404),
  );
  mount();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "This task is no longer available",
  );
  expect(
    screen.queryByRole("button", { name: "Try again" }),
  ).not.toBeInTheDocument();
});

it("preserves unsaved fields while nested project creation refetches the task", async () => {
  const task = {
    _id: id,
    title: "Original",
    status: "pending" as const,
    priority: "Medium" as const,
    categoryId: null,
    projectId: null,
    startDate: "2026-11-09",
  };
  let resolve!: (value: typeof task) => void;
  vi.spyOn(taskService, "getTaskById")
    .mockResolvedValueOnce(task)
    .mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
  const user = userEvent.setup();
  mount();
  const input = await screen.findByRole("textbox", { name: "Task title" });
  await user.clear(input);
  await user.type(input, "Unsaved changes");
  await user.click(screen.getByRole("button", { name: "Project created" }));
  expect(screen.getByRole("textbox", { name: "Task title" })).toHaveValue(
    "Unsaved changes",
  );
  await act(async () => resolve(task));
  expect(screen.getByRole("textbox", { name: "Task title" })).toHaveValue(
    "Unsaved changes",
  );
});
