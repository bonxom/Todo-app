import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { toISOStringLocal } from "@/shared/utils/dateTime";
import userEvent from "@testing-library/user-event";
import CalendarPage from "../pages/CalendarPage";
import { renderWithProviders, resetTestSession } from "./testSupport";

const mocks = vi.hoisted(() => {
  const makeTask = (id: string, title: string, day: number, hour: number) => ({
    _id: id,
    title,
    status: "pending" as const,
    priority: "Medium" as const,
    dueDate: new Date(2026, 10, day, hour, 0, 0).toISOString(),
    startDate: null,
    description: "",
    categoryId: null,
    projectId: null,
    completedAt: null,
    createdAt: new Date(2026, 10, 1).toISOString(),
    updatedAt: new Date(2026, 10, 1).toISOString(),
  });
  return {
    makeTask,
    tasks: [
      makeTask("t1", "Ship calendar", 10, 9),
      makeTask("t2", "Review spec", 10, 14),
      makeTask("t3", "Plan week", 17, 11),
    ],
    refetch: vi.fn(),
    query: vi.fn(),
    move: vi.fn(),
    resize: vi.fn(),
    start: vi.fn(),
    finish: vi.fn(),
    giveUp: vi.fn(),
    restore: vi.fn(),
    remove: vi.fn(),
  };
});

vi.mock("@/features/tasks/api/taskMutations", () => ({
  useStartTaskMutation: () => ({ mutateAsync: mocks.start, isPending: false }),
  useFinishTaskMutation: () => ({
    mutateAsync: mocks.finish,
    isPending: false,
  }),
  useGiveUpTaskMutation: () => ({
    mutateAsync: mocks.giveUp,
    isPending: false,
  }),
  useRestoreTaskMutation: () => ({
    mutateAsync: mocks.restore,
    isPending: false,
  }),
  useDeleteTaskMutation: () => ({
    mutateAsync: mocks.remove,
    isPending: false,
  }),
  useCreateTaskMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateTaskMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/features/calendar/api/useCalendarMutations", () => ({
  useCalendarMutations: () => ({
    changeTaskDueDate: mocks.move,
    changeTaskDates: mocks.resize,
    isMutating: false,
  }),
}));

vi.mock("@/features/tasks/api/taskQueries", () => ({
  useCalendarTasksQuery: (range: { startDate: string; endDate: string }) => {
    mocks.query(range);
    return {
      data: mocks.tasks,
      isLoading: false,
      isError: false,
      error: null,
      refetch: mocks.refetch,
    };
  },
}));

vi.mock("../components/TaskDetailsDialog", () => ({
  default: ({ taskId, onClose }: { taskId: string; onClose: () => void }) => (
    <div data-testid="task-details">
      {taskId}
      <button type="button" onClick={onClose}>
        close details
      </button>
    </div>
  ),
}));

vi.mock("../components/TaskEditor", () => ({
  default: ({ onCancel }: { onCancel: () => void }) => (
    <div data-testid="task-editor">
      <button type="button" onClick={onCancel}>
        cancel editor
      </button>
    </div>
  ),
}));

describe("V2 calendar", () => {
  beforeEach(() => {
    resetTestSession();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 10, 15, 10, 0, 0));
    mocks.query.mockReset();
    mocks.refetch.mockReset();
  });

  it("renders whole month weeks with task chips", () => {
    renderWithProviders(<CalendarPage />, { initialEntries: ["/v2/calendar"] });

    const grid = screen.getByRole("grid");
    const cells = within(grid).getAllByRole("gridcell");
    expect(cells.length % 7).toBe(0);
    expect(cells.length).toBeGreaterThanOrEqual(35);
    expect(screen.getByText("Ship calendar")).toBeInTheDocument();
    expect(screen.getByText("Review spec")).toBeInTheDocument();
    expect(screen.getByText("Plan week")).toBeInTheDocument();
    expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
  });

  it("exposes completed and given-up statuses on month, week, and day task cards", async () => {
    const original = mocks.tasks;
    (mocks as { tasks: unknown[] }).tasks = [
      { ...mocks.makeTask("done", "Send report", 17, 9), status: "completed" },
      {
        ...mocks.makeTask("skipped", "Review notes", 17, 14),
        status: "given-up",
      },
    ];
    try {
      const user = userEvent.setup();
      renderWithProviders(<CalendarPage />, {
        initialEntries: ["/v2/calendar"],
      });
      const getCompleted = () =>
        screen.getByRole("button", { name: /Send report.*Completed/ });
      const getGivenUp = () =>
        screen.getByRole("button", { name: /Review notes.*Given up/ });

      expect(getCompleted()).toHaveClass("v2-calendar-chip");
      expect(getGivenUp()).toHaveClass("v2-calendar-chip");

      await user.click(screen.getByRole("button", { name: "Week" }));
      expect(getCompleted()).toHaveClass("v2-timeline-block");
      expect(getGivenUp()).toHaveClass("v2-timeline-block");

      await user.click(screen.getByRole("button", { name: "Agenda" }));
      expect(within(getCompleted()).getByText("Completed")).not.toHaveClass(
        "sr-only",
      );
      expect(within(getGivenUp()).getByText("Given up")).not.toHaveClass(
        "sr-only",
      );

      await user.click(
        screen.getByRole("button", { name: /November 17, 2026/ }),
      );
      const day = screen.getByRole("complementary", {
        name: /November 17, 2026/,
      });
      expect(
        within(day).getByRole("button", { name: /Send report.*Completed/ }),
      ).toHaveClass("v2-calendar-day-task");
      expect(
        within(day).getByRole("button", { name: /Review notes.*Given up/ }),
      ).toHaveClass("v2-calendar-day-task");
    } finally {
      mocks.tasks = original;
    }
  });

  it("opens the week detail timeline and can switch to the agenda", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<CalendarPage />, {
      initialEntries: ["/v2/calendar"],
    });

    await user.click(screen.getByRole("button", { name: "Week" }));

    expect(screen.getByTestId("v2-week-detail")).toBeInTheDocument();
    expect(container.querySelectorAll(".v2-timeline-day")).toHaveLength(7);
    expect(container.querySelectorAll(".v2-timeline-slot")).toHaveLength(48);
    expect(container.querySelectorAll(".v2-timeline-block")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Agenda" }));

    expect(screen.queryByTestId("v2-week-detail")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".v2-calendar-week-col")).toHaveLength(7);
    expect(screen.getByText("Plan week")).toBeInTheDocument();
  });

  it("places a due-only task in a single slot ending at its due time", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<CalendarPage />, {
      initialEntries: ["/v2/calendar"],
    });

    await user.click(screen.getByRole("button", { name: "Week" }));

    const block = container.querySelector<HTMLElement>(".v2-timeline-event");
    // t3 is due at 11:00: 660 minutes * 1.2px/min - one 36px slot.
    expect(block).toHaveStyle({ top: "756px", height: "36px" });
  });

  it("treats a midnight start as a point in time instead of a full-night block", async () => {
    const original = mocks.tasks;
    const withMidnightStart = {
      ...mocks.tasks[2],
      startDate: new Date(2026, 10, 17, 0, 0, 0).toISOString(),
    };
    (mocks as { tasks: unknown[] }).tasks = [withMidnightStart];

    const user = userEvent.setup();
    const { container } = renderWithProviders(<CalendarPage />, {
      initialEntries: ["/v2/calendar"],
    });
    await user.click(screen.getByRole("button", { name: "Week" }));

    const block = container.querySelector<HTMLElement>(".v2-timeline-event");
    expect(block).toHaveStyle({ top: "756px", height: "36px" });

    (mocks as { tasks: unknown[] }).tasks = original;
  });

  it("opens task details from a timeline block", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />, { initialEntries: ["/v2/calendar"] });

    await user.click(screen.getByRole("button", { name: "Week" }));
    await user.click(screen.getByRole("button", { name: /Plan week/i }));

    expect(screen.getByTestId("task-details")).toHaveTextContent("t3");
  });

  it("moves the queried range when navigating periods", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />, { initialEntries: ["/v2/calendar"] });

    const initialRange = mocks.query.mock.calls.at(-1)?.[0];
    const initialLabel = screen.getByRole("heading", { level: 2 }).textContent;

    await user.click(screen.getByRole("button", { name: "Next period" }));

    const nextRange = mocks.query.mock.calls.at(-1)?.[0];
    expect(nextRange.startDate).not.toBe(initialRange.startDate);
    expect(screen.getByRole("heading", { level: 2 }).textContent).not.toBe(
      initialLabel,
    );
  });

  it("opens a day panel and then the task details dialog", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />, { initialEntries: ["/v2/calendar"] });

    await user.click(screen.getByRole("button", { name: /Ship calendar/i }));

    expect(screen.getByTestId("task-details")).toHaveTextContent("t1");
    await user.click(screen.getByRole("button", { name: "close details" }));
    expect(screen.queryByTestId("task-details")).not.toBeInTheDocument();
  });

  it("lists a selected day's tasks and opens the editor for a new task", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />, { initialEntries: ["/v2/calendar"] });

    const dayCell = screen.getByRole("button", {
      name: /November 10, 2026.*2 Tasks/i,
    });
    await user.click(dayCell);

    const panel = screen.getByRole("complementary", {
      name: /November 10, 2026/,
    });
    expect(within(panel).getByText("Ship calendar")).toBeInTheDocument();
    expect(within(panel).getByText("Review spec")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "New task" }));
    expect(screen.getByTestId("task-editor")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "cancel editor" }));
    expect(screen.queryByTestId("task-editor")).not.toBeInTheDocument();
  });
});

class TestDataTransfer {
  data: Record<string, string> = {};
  effectAllowed = "move";
  dropEffect = "move";
  setData(key: string, value: string) {
    this.data[key] = value;
  }
  getData(key: string) {
    return this.data[key] ?? "";
  }
}

const fireDrag = (
  element: Element,
  type: "dragstart" | "dragover" | "dragleave" | "drop",
  dataTransfer: TestDataTransfer,
  clientY = 0,
) => {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientY,
  });
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  fireEvent(element, event);
};

const dragBlock = (element: Element) => {
  const dataTransfer = new TestDataTransfer();
  fireDrag(element, "dragstart", dataTransfer);
  return dataTransfer;
};

const dropAt = (
  element: Element,
  dataTransfer: TestDataTransfer,
  clientY: number,
) => {
  fireDrag(element, "dragover", dataTransfer, clientY);
  fireDrag(element, "drop", dataTransfer, clientY);
};

describe("V2 calendar drag and drop", () => {
  beforeEach(() => {
    resetTestSession();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 10, 15, 10, 0, 0));
    mocks.move.mockReset().mockResolvedValue({});
    mocks.resize.mockReset().mockResolvedValue({});
  });

  it("updates only the selected endpoint when adjusting a Week Detail handle", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />, { initialEntries: ["/v2/calendar"] });
    await user.click(screen.getByRole("button", { name: "Week" }));
    const start = screen.getByRole("slider", {
      name: "Adjust start time of Plan week",
    });
    const end = screen.getByRole("slider", {
      name: "Adjust end time of Plan week",
    });

    fireEvent.keyDown(start, { key: "ArrowUp" });
    await waitFor(() =>
      expect(start).toHaveAttribute("aria-disabled", "false"),
    );
    fireEvent.keyDown(end, { key: "ArrowDown" });
    await waitFor(() => expect(end).toHaveAttribute("aria-disabled", "false"));

    expect(mocks.resize.mock.calls).toEqual([
      [
        expect.objectContaining({ _id: "t3" }),
        { startDate: new Date(2026, 10, 17, 10, 15).toISOString() },
      ],
      [
        expect.objectContaining({ _id: "t3" }),
        { dueDate: new Date(2026, 10, 17, 11, 15).toISOString() },
      ],
    ]);
    expect(mocks.move).not.toHaveBeenCalled();
    expect(screen.queryByTestId("task-details")).not.toBeInTheDocument();
  });

  it("reschedules a task to the dropped day and snapped minute", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<CalendarPage />, {
      initialEntries: ["/v2/calendar"],
    });
    await user.click(screen.getByRole("button", { name: "Week" }));

    const block = container.querySelector(".v2-timeline-block");
    const columns = container.querySelectorAll(".v2-timeline-day");
    // Column index 2 is Tuesday 17 Nov in the 15–21 Nov week; y 576px → 08:00.
    dropAt(columns[2], dragBlock(block!), 576);

    await waitFor(() => expect(mocks.move).toHaveBeenCalledTimes(1));
    expect(mocks.move.mock.calls[0][1]).toBe(
      toISOStringLocal(new Date(2026, 10, 17, 8, 0, 0)),
    );
  });

  it("paints a drop indicator while hovering a day column", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<CalendarPage />, {
      initialEntries: ["/v2/calendar"],
    });
    await user.click(screen.getByRole("button", { name: "Week" }));

    const block = container.querySelector(".v2-timeline-block");
    const columns = container.querySelectorAll(".v2-timeline-day");
    const dataTransfer = dragBlock(block!);
    fireDrag(columns[2], "dragover", dataTransfer, 576);

    expect(container.querySelector(".v2-timeline-drop")).toBeInTheDocument();
  });

  it("moves a month chip to another day, keeping its time", async () => {
    renderWithProviders(<CalendarPage />, { initialEntries: ["/v2/calendar"] });

    const chip = screen.getByRole("button", { name: /Ship calendar/i });
    const targetDay = screen.getByRole("button", {
      name: /November 12, 2026/i,
    });
    const cell = targetDay.closest('[role="gridcell"]');
    expect(cell).not.toBeNull();

    dropAt(cell!, dragBlock(chip), 0);

    await waitFor(() => expect(mocks.move).toHaveBeenCalledTimes(1));
    expect(mocks.move.mock.calls[0][1]).toBe(
      toISOStringLocal(new Date(2026, 10, 12, 9, 0, 0)),
    );
  });

  it.each(["Month", "Week detail", "Week agenda"])(
    "reschedules a day panel card through the %s view",
    async (view) => {
      const user = userEvent.setup();
      const { container } = renderWithProviders(<CalendarPage />, {
        initialEntries: ["/v2/calendar"],
      });
      if (view !== "Month") {
        await user.click(screen.getByRole("button", { name: "Week" }));
        if (view === "Week agenda")
          await user.click(screen.getByRole("button", { name: "Agenda" }));
      }

      let target: Element;
      let expected: Date;
      if (view === "Week detail") {
        await user.click(
          container.querySelectorAll(".v2-timeline-day-head")[2],
        );
        target = container.querySelectorAll(".v2-timeline-day")[3];
        expected = new Date(2026, 10, 18, 8);
      } else if (view === "Week agenda") {
        await user.click(
          screen.getByRole("button", { name: /November 17, 2026/ }),
        );
        target = container.querySelectorAll(".v2-calendar-week-col")[3];
        expected = new Date(2026, 10, 18, 11);
      } else {
        await user.click(
          screen.getByRole("button", { name: /November 17, 2026/ }),
        );
        target = screen
          .getByRole("button", { name: /November 18, 2026/ })
          .closest('[role="gridcell"]')!;
        expected = new Date(2026, 10, 18, 11);
      }
      const panel = screen.getByRole("complementary", {
        name: /November 17, 2026/,
      });
      const card = within(panel).getByRole("button", { name: /Plan week/ });
      expect(card).toHaveAttribute("draggable", "true");
      dropAt(target, dragBlock(card), 576);

      expect(mocks.move).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ _id: "t3" }),
        toISOStringLocal(expected),
      );
    },
  );

  it("surfaces a move failure without losing the task", async () => {
    mocks.move.mockRejectedValueOnce(new Error("Server said no"));
    const user = userEvent.setup();
    const { container } = renderWithProviders(<CalendarPage />, {
      initialEntries: ["/v2/calendar"],
    });
    await user.click(screen.getByRole("button", { name: "Week" }));

    const block = container.querySelector(".v2-timeline-block");
    const columns = container.querySelectorAll(".v2-timeline-day");
    dropAt(columns[1], dragBlock(block!), 576);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Server said no",
    );
    expect(screen.getByText("Plan week")).toBeInTheDocument();
  });
});

describe("V2 calendar task actions", () => {
  beforeEach(() => {
    resetTestSession();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 10, 15, 10, 0, 0));
    for (const fn of [
      mocks.start,
      mocks.finish,
      mocks.giveUp,
      mocks.restore,
      mocks.remove,
    ]) {
      fn.mockReset().mockResolvedValue({});
    }
  });

  const openDayPanel = async () => {
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />, { initialEntries: ["/v2/calendar"] });
    await user.click(screen.getByRole("button", { name: /November 10, 2026/ }));
    return user;
  };

  it("starts and gives up a pending task from the day panel", async () => {
    const user = await openDayPanel();

    await user.click(screen.getAllByRole("button", { name: "Start" })[0]);
    expect(mocks.start).toHaveBeenCalledWith("t1");

    await user.click(screen.getAllByRole("button", { name: "Give up" })[0]);
    expect(mocks.giveUp).toHaveBeenCalledWith("t1");
  });

  it("finishes an in-progress task", async () => {
    const original = mocks.tasks;
    (mocks as { tasks: unknown[] }).tasks = [
      { ...mocks.tasks[0], status: "in-progress" },
    ];
    const user = await openDayPanel();

    await user.click(screen.getByRole("button", { name: "Finish" }));
    expect(mocks.finish).toHaveBeenCalledWith("t1");

    (mocks as { tasks: unknown[] }).tasks = original;
  });

  it("reopens a completed task", async () => {
    const original = mocks.tasks;
    (mocks as { tasks: unknown[] }).tasks = [
      { ...mocks.tasks[0], status: "completed" },
    ];
    const user = await openDayPanel();

    await user.click(screen.getByRole("button", { name: "Reopen" }));
    expect(mocks.restore).toHaveBeenCalledWith("t1");

    (mocks as { tasks: unknown[] }).tasks = original;
  });

  it("deletes a task after confirmation", async () => {
    const user = await openDayPanel();

    await user.click(screen.getAllByRole("button", { name: "Delete task" })[0]);
    const dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: "Delete task" }),
    );

    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith("t1"));
  });
});
