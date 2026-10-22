import { render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import TodoTaskCard from "../TodoTaskCard";

afterEach(() => { vi.restoreAllMocks(); });

it.each([
  ["given-up", "#ef4444"],
  ["in-progress", "#3b82f6"],
  ["completed", "#22c55e"],
])("animates a transition to %s for two seconds, but not initial render", (status, color) => {
  const cancel = vi.fn();
  const animate = vi.fn(() => ({ cancel }));
  const task = { _id: "task", title: "Task", status: "pending" };
  const { container, rerender, unmount } = render(<TodoTaskCard task={task} />);
  container.querySelector("article").animate = animate;
  rerender(<TodoTaskCard task={{ ...task }} />);
  expect(animate).not.toHaveBeenCalled();
  rerender(<TodoTaskCard task={{ ...task, status }} />);
  expect(animate).toHaveBeenCalledWith(
    expect.arrayContaining([expect.objectContaining({ boxShadow: `inset 0 0 0 2px ${color}` })]),
    { duration: 2000, easing: "linear" },
  );
  rerender(<TodoTaskCard task={{ ...task, status, title: "Renamed" }} />);
  expect(animate).toHaveBeenCalledTimes(1);
  unmount();
  expect(cancel).toHaveBeenCalled();
});
