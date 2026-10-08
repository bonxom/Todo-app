import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CalendarView from "../CalendarView";

vi.mock("../CalendarGrid", () => ({
  default: () => <div>Calendar grid</div>,
}));

vi.mock("../ProjectFocusPanel", () => ({
  default: () => <section>Project filters panel</section>,
}));

vi.mock("../ProjectFocusWeekAgenda", () => ({
  default: ({ compact }) => (
    <section data-compact={compact}>
      <span>All Tasks Day</span>
    </section>
  ),
}));

vi.mock("../DetailRequestModal", () => ({ default: () => null }));
vi.mock("@/features/tasks/components/dialogs/AddTaskModal", () => ({
  default: () => null,
}));
vi.mock("@/features/tasks/components/Form/AddProjectForm", () => ({
  default: () => null,
}));

describe("CalendarView project filters", () => {
  it("toggles project filters without moving or hiding the day agenda", async () => {
    const user = userEvent.setup();
    render(
      <CalendarView
        tasks={[]}
        projects={[]}
        currentDate={new Date(2026, 7, 23)}
        viewMode="week"
      />,
    );
    expect(screen.getByText("All Tasks Day")).toBeVisible();
    expect(screen.queryByText("Project filters panel")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Show project filters" }),
    );
    expect(screen.getByText("Project filters panel")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Hide project filters" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("All Tasks Day")).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Hide project filters" }),
    );
    expect(screen.queryByText("Project filters panel")).not.toBeInTheDocument();
    expect(screen.getByText("All Tasks Day")).toBeVisible();
  });
});
