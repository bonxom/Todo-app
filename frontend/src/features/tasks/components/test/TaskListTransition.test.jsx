import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import TaskList from "../TaskList";
import { notifyTaskStatus } from "../../hooks/taskStatusTransitions";

afterEach(() => vi.useRealTimers());

it.each(["completed", "given-up"])("keeps a %s card visible for its effect when the server filters it out", (status) => {
  vi.useFakeTimers();
  const task = { _id: "filtered-task", title: "Filtered task", status: "in-progress" };
  const { container, rerender } = render(<TaskList tasks={[task]} />);
  const animate = vi.fn(() => ({ cancel: vi.fn() }));
  container.querySelector("article").animate = animate;
  act(() => notifyTaskStatus(task._id, status));
  rerender(<TaskList tasks={[]} />);
  expect(screen.getByRole("button", { name: task.title })).toBeVisible();
  expect(container.querySelector("article")).toHaveAttribute("data-status", status);
  expect(animate).toHaveBeenCalledTimes(1);
  act(() => vi.advanceTimersByTime(1999));
  expect(screen.getByRole("button", { name: task.title })).toBeVisible();
  act(() => vi.advanceTimersByTime(1));
  expect(screen.queryByRole("button", { name: task.title })).not.toBeInTheDocument();
  expect(screen.getByText("No tasks found")).toBeVisible();
});

it("waits for the Give up confirmation to close before starting the two-second effect", async () => {
  vi.useFakeTimers();
  const task = { _id: "confirmed-task", title: "Confirmed task", status: "in-progress" };
  const view = (tasks, modal) => <><TaskList tasks={tasks} />{modal && <div role="dialog" aria-modal="true">Saving</div>}</>;
  const { container, rerender } = render(view([task], true));
  const animate = vi.fn(() => ({ cancel: vi.fn() }));
  container.querySelector("article").animate = animate;
  act(() => notifyTaskStatus(task._id, "given-up"));
  rerender(view([], true));
  act(() => vi.advanceTimersByTime(3000));
  expect(animate).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: task.title })).toBeVisible();
  await act(async () => rerender(view([], false)));
  expect(animate).toHaveBeenCalledTimes(1);
  act(() => vi.advanceTimersByTime(1999));
  expect(screen.getByRole("button", { name: task.title })).toBeVisible();
  act(() => vi.advanceTimersByTime(1));
  expect(screen.queryByRole("button", { name: task.title })).not.toBeInTheDocument();
});

it("animates restoring to in-progress even while the previous status is retained", () => {
  vi.useFakeTimers();
  const task = { _id: "restore-task", title: "Restore task", status: "in-progress" };
  const { container } = render(<TaskList tasks={[task]} />);
  const animate = vi.fn(() => ({ cancel: vi.fn() }));
  container.querySelector("article").animate = animate;
  act(() => notifyTaskStatus(task._id, "given-up"));
  act(() => notifyTaskStatus(task._id, "in-progress"));
  expect(container.querySelector("article")).toHaveAttribute("data-status", "in-progress");
  expect(animate).toHaveBeenCalledTimes(2);
  expect(animate.mock.calls[1][0]).toEqual(expect.arrayContaining([
    expect.objectContaining({ boxShadow: "inset 0 0 0 2px #3b82f6" }),
  ]));
});
