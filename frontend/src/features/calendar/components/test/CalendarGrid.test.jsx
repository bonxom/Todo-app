import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CalendarGrid from "../CalendarGrid";

describe("CalendarGrid", () => {
  it("uses the shared select alongside Week controls in the main toolbar", () => {
    const { container } = render(
      <CalendarGrid
        currentDate={new Date(2026, 10, 11)}
        selectedDate={new Date(2026, 10, 11)}
        viewMode="week"
        tasksByDate={{}}
      />,
    );
    const toolbar = container.querySelector(".calendar-board-toolbar");
    expect(toolbar.querySelector(".ui-custom-select")).not.toBeNull();
    expect(toolbar).toContainElement(
      screen.getByRole("button", { name: "Detailed", exact: true }),
    );
  });
  it("shows an in-place loading indicator while a new calendar range is loading", () => {
    render(
      <CalendarGrid
        currentDate={new Date(2026, 7, 16)}
        selectedDate={new Date(2026, 7, 16)}
        onDateSelect={() => {}}
        onNavigate={() => {}}
        onResetToToday={() => {}}
        tasksByDate={{}}
        onTaskUpdated={() => {}}
        onTaskDueDateChange={() => {}}
        onTaskCopy={() => {}}
        viewMode="week"
        isRangeLoading
      />,
    );

    expect(
      screen.getByRole("status", { name: "Loading calendar range" }),
    ).toBeVisible();
  });

  const timelineProps = {
    currentDate: new Date(2026, 10, 11),
    selectedDate: new Date(2026, 10, 11),
    onDateSelect: () => {},
    onNavigate: () => {},
    onResetToToday: () => {},
    viewMode: "week",
    tasksByDate: {
      "2026-11-11": Array.from({ length: 4 }, (_, i) => ({
        _id: String(i),
        title: `Task ${i}`,
        dueDate: "2026-11-11T17:30:00",
        status: "pending",
      })),
    },
  };

  it("shows a full-day timeline and all tasks with the display-only midnight fallback", () => {
    render(<CalendarGrid {...timelineProps} />);
    expect(screen.getByRole("combobox", { name: "Time detail" })).toHaveValue(
      "30",
    );
    expect(screen.getByText("00:00")).toBeVisible();
    expect(screen.getByText("23:30")).toBeVisible();
    expect(screen.getAllByText("00:01 – 17:30")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Edit Task 3" })).toBeVisible();
    expect(
      timelineProps.tasksByDate["2026-11-11"][0].startDate,
    ).toBeUndefined();
  });

  it("changes time detail without removing tasks and hides the control in Month", () => {
    const { rerender } = render(<CalendarGrid {...timelineProps} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Time detail" }), {
      target: { value: "15" },
    });
    expect(screen.getByText("09:15")).toBeVisible();
    fireEvent.change(screen.getByRole("combobox", { name: "Time detail" }), {
      target: { value: "60" },
    });
    expect(screen.queryByText("09:15")).not.toBeInTheDocument();
    expect(screen.getByText("23:00")).toBeVisible();
    expect(screen.getByRole("button", { name: "Edit Task 3" })).toBeVisible();
    rerender(<CalendarGrid {...timelineProps} viewMode="month" />);
    expect(
      screen.queryByRole("combobox", { name: "Time detail" }),
    ).not.toBeInTheDocument();
  });
  it("switches between detailed and original compact Week without mutating dates", () => {
    const onDateSelect = vi.fn();
    const onTaskDueDateChange = vi.fn();
    const { container, rerender } = render(
      <CalendarGrid
        {...timelineProps}
        onDateSelect={onDateSelect}
        onTaskDueDateChange={onTaskDueDateChange}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Detailed", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.change(screen.getByRole("combobox", { name: "Time detail" }), {
      target: { value: "15" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Compact", exact: true }),
    );
    expect(
      screen.queryByRole("combobox", { name: "Time detail" }),
    ).not.toBeInTheDocument();
    expect(
      container.querySelectorAll(".calendar-days > .calendar-day"),
    ).toHaveLength(7);
    expect(
      screen.queryByRole("button", { name: "Edit Task 3" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/\+1/)).toBeVisible();
    rerender(<CalendarGrid {...timelineProps} viewMode="month" />);
    expect(
      screen.queryByRole("button", { name: "Compact", exact: true }),
    ).not.toBeInTheDocument();
    rerender(<CalendarGrid {...timelineProps} />);
    expect(
      screen.getByRole("button", { name: "Compact", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(
      screen.getByRole("button", { name: "Detailed", exact: true }),
    );
    expect(screen.getByRole("combobox", { name: "Time detail" })).toHaveValue(
      "15",
    );
    expect(screen.getByRole("button", { name: "Edit Task 3" })).toBeVisible();
    expect(onDateSelect).not.toHaveBeenCalled();
    expect(onTaskDueDateChange).not.toHaveBeenCalled();
  });
});
