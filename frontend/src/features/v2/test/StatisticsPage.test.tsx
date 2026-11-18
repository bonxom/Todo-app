import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StatisticsPage from "../pages/StatisticsPage";
import { statService } from "@/shared/services/statService";
import {
  renderWithProviders,
  resetTestSession,
  createDeferred,
} from "./testSupport";
import type { Stat } from "@/shared/types/domain";

let capturedChartProps: {
  data: { labels: unknown[] };
  [key: string]: unknown;
} | null = null;
vi.mock("react-chartjs-2", () => ({
  Line: (props: { data: { labels: unknown[] }; [key: string]: unknown }) => {
    capturedChartProps = props;
    return (
      <div
        data-testid="trend-line-chart"
        role="img"
        aria-label={String(props["aria-label"] || "")}
      />
    );
  },
}));

vi.mock("@/shared/services/statService", () => ({
  statService: {
    getUserStats: vi.fn(),
    getCompletedTasksByDate: vi.fn(),
  },
}));

describe("StatisticsPage integration", () => {
  beforeEach(() => {
    resetTestSession();
    vi.clearAllMocks();
  });

  it("renders the all-time completion rate from the API", async () => {
    vi.mocked(statService.getUserStats).mockResolvedValue({
      totalTasks: 128,
      completedTasks: 96,
      inProgressTasks: 18,
      pendingTasks: 10,
      givenUpTasks: 4,
      dailyStats: [],
    });

    renderWithProviders(<StatisticsPage />, {
      initialEntries: ["/v2/statistics"],
    });

    expect(
      await screen.findByRole("heading", { name: "Statistics", level: 1 }),
    ).toBeVisible();

    await waitFor(() =>
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "75",
      ),
    );

    expect(screen.getAllByText("128").length).toBeGreaterThan(0);
    expect(screen.getAllByText("96").length).toBeGreaterThan(0);
  });

  it("displays loading skeleton while query is pending and keeps heading visible", async () => {
    const deferred = createDeferred<Stat>();
    vi.mocked(statService.getUserStats).mockReturnValue(deferred.promise);

    renderWithProviders(<StatisticsPage />, {
      initialEntries: ["/v2/statistics"],
    });

    expect(
      screen.getByRole("heading", { name: "Statistics", level: 1 }),
    ).toBeVisible();
    expect(
      screen.getByTestId("statistics-loading-skeleton"),
    ).toBeInTheDocument();

    deferred.resolve({
      totalTasks: 10,
      completedTasks: 5,
      inProgressTasks: 2,
      pendingTasks: 2,
      givenUpTasks: 1,
      dailyStats: [],
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId("statistics-loading-skeleton"),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "50",
    );
  });

  it("renders error panel on initial query failure and supports retry", async () => {
    const user = userEvent.setup();
    vi.mocked(statService.getUserStats).mockRejectedValueOnce(
      new Error("Network disconnect"),
    );

    renderWithProviders(<StatisticsPage />, {
      initialEntries: ["/v2/statistics"],
    });

    expect(
      await screen.findByRole("heading", { name: "Statistics", level: 1 }),
    ).toBeVisible();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Network disconnect");

    const retryBtn = screen.getByRole("button", { name: /retry/i });
    expect(retryBtn).toBeEnabled();

    vi.mocked(statService.getUserStats).mockResolvedValueOnce({
      totalTasks: 50,
      completedTasks: 50,
      inProgressTasks: 0,
      pendingTasks: 0,
      givenUpTasks: 0,
      dailyStats: [],
    });

    await user.click(retryBtn);

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "100",
      );
    });
  });

  it("handles zero total tasks gracefully", async () => {
    vi.mocked(statService.getUserStats).mockResolvedValue({
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      pendingTasks: 0,
      givenUpTasks: 0,
      dailyStats: [],
    });

    renderWithProviders(<StatisticsPage />, {
      initialEntries: ["/v2/statistics"],
    });

    await waitFor(() =>
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "0",
      ),
    );

    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getAllByText(/no data/i).length).toBeGreaterThan(0);
  });

  it("renders category breakdown with repeated names, sort order and legends", async () => {
    vi.mocked(statService.getUserStats).mockResolvedValue({
      totalTasks: 20,
      completedTasks: 10,
      inProgressTasks: 5,
      pendingTasks: 3,
      givenUpTasks: 2,
      dailyStats: [
        {
          date: "2026-11-17",
          completedTasks: 6,
          givenUpTasks: 0,
          completedOfEachCategory: [
            { categoryId: "c1", categoryName: "Work Project Alpha", count: 4 },
            { categoryId: "c2", categoryName: "Personal Life", count: 2 },
          ],
          givenUpOfEachCategory: [],
        },
        {
          date: "2026-11-18",
          completedTasks: 4,
          givenUpTasks: 0,
          completedOfEachCategory: [
            { categoryId: "c1", categoryName: "Work Project Alpha", count: 2 },
            { categoryId: "c3", categoryName: "Fitness & Health", count: 2 },
          ],
          givenUpOfEachCategory: [],
        },
      ],
    });

    renderWithProviders(<StatisticsPage />, {
      initialEntries: ["/v2/statistics"],
    });

    // Work: 6 (60%), Personal: 2 (20%), Fitness: 2 (20%)
    expect(await screen.findByText("Work Project Alpha")).toBeVisible();
    expect(screen.getByText("Personal Life")).toBeVisible();
    expect(screen.getByText("Fitness & Health")).toBeVisible();
    expect(screen.getByText(/60%/)).toBeInTheDocument();
  });

  it("keeps panels visible and displays nonblocking alert when background refresh fails with cached data", async () => {
    vi.mocked(statService.getUserStats).mockResolvedValueOnce({
      totalTasks: 40,
      completedTasks: 20,
      inProgressTasks: 10,
      pendingTasks: 8,
      givenUpTasks: 2,
      dailyStats: [],
    });

    const { queryClient } = renderWithProviders(<StatisticsPage />, {
      initialEntries: ["/v2/statistics"],
    });

    await waitFor(() =>
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "50",
      ),
    );

    // Now mock a failure for subsequent refetch
    vi.mocked(statService.getUserStats).mockRejectedValueOnce(
      new Error("Background fetch error"),
    );

    // Trigger refetch
    await queryClient.refetchQueries({ queryKey: ["stats", "summary"] });

    // Progress bar and cached data should remain
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "50",
    );

    // Nonblocking banner should appear
    const banner = await screen.findByRole("alert");
    expect(banner).toHaveTextContent("Background fetch error");
  });

  it("handles trend range presets, custom draft inputs and preserves valid chart on invalid inputs", async () => {
    const user = userEvent.setup();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-11-18T12:00:00Z"));

    vi.mocked(statService.getUserStats).mockResolvedValue({
      totalTasks: 10,
      completedTasks: 5,
      inProgressTasks: 2,
      pendingTasks: 2,
      givenUpTasks: 1,
      dailyStats: [
        {
          date: "2026-11-18",
          completedTasks: 3,
          givenUpTasks: 1,
          completedOfEachCategory: [],
          givenUpOfEachCategory: [],
        },
        {
          date: "2026-11-15",
          completedTasks: 2,
          givenUpTasks: 0,
          completedOfEachCategory: [],
          givenUpOfEachCategory: [],
        },
      ],
    });

    renderWithProviders(<StatisticsPage />, {
      initialEntries: ["/v2/statistics"],
    });

    expect(
      await screen.findByRole("heading", { name: "Statistics", level: 1 }),
    ).toBeVisible();

    // Default 30-day preset
    const preset30 = screen.getByRole("button", { name: "30 days" });
    expect(preset30).toHaveAttribute("aria-pressed", "true");
    expect(capturedChartProps!.data.labels).toHaveLength(30);

    // Switch to 7 days preset
    const preset7 = screen.getByRole("button", { name: "7 days" });
    await user.click(preset7);
    expect(preset7).toHaveAttribute("aria-pressed", "true");
    expect(preset30).toHaveAttribute("aria-pressed", "false");
    expect(capturedChartProps!.data.labels).toHaveLength(7);

    // Clear start date -> invalid draft
    const fromInput = screen.getByLabelText(/from/i);
    await user.clear(fromInput);
    const errorAlert = await screen.findByRole("alert");
    expect(errorAlert).toHaveTextContent(/both/i);

    // Assert captured Line data still shows the 7-day range
    expect(capturedChartProps!.data.labels).toHaveLength(7);

    // Click 14-day preset -> should clear error and update range
    const preset14 = screen.getByRole("button", { name: "14 days" });
    await user.click(preset14);
    expect(screen.queryByText(/both/i)).not.toBeInTheDocument();
    expect(preset14).toHaveAttribute("aria-pressed", "true");
    expect(capturedChartProps!.data.labels).toHaveLength(14);

    vi.useRealTimers();
  });

  it("gates activity query on heatmap day selection and handles task details with focus restoration", async () => {
    const user = userEvent.setup();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-11-18T12:00:00Z"));

    vi.mocked(statService.getUserStats).mockResolvedValue({
      totalTasks: 10,
      completedTasks: 5,
      inProgressTasks: 2,
      pendingTasks: 2,
      givenUpTasks: 1,
      dailyStats: [
        {
          date: "2026-11-18",
          completedTasks: 2,
          givenUpTasks: 0,
          completedOfEachCategory: [],
          givenUpOfEachCategory: [],
        },
      ],
    });

    vi.mocked(statService.getCompletedTasksByDate).mockResolvedValue([
      {
        _id: "task-1",
        title: "Submit Q3 Report",
        status: "completed",
        priority: "High",
        categoryId: { _id: "cat-1", name: "Work" },
        projectId: {
          _id: "proj-1",
          name: "Finances",
          description: "",
          color: "#14675f",
          status: "active",
        },
        startDate: "2026-11-18",
        completedAt: "2026-11-18T10:00:00Z",
      },
    ]);

    renderWithProviders(<StatisticsPage />, {
      initialEntries: ["/v2/statistics"],
    });

    expect(
      await screen.findByRole("heading", { name: "Statistics", level: 1 }),
    ).toBeVisible();

    // Verify activity query has NOT been called before selection
    expect(statService.getCompletedTasksByDate).not.toHaveBeenCalled();

    // Find the cell for 2026-11-18
    const cell = screen.getByRole("button", { name: /2026-11-18/i });
    expect(cell).toBeInTheDocument();
    expect(cell).toHaveAttribute("aria-pressed", "false");

    // Click to select the day
    await user.click(cell);

    // Verify activity query called with date
    expect(statService.getCompletedTasksByDate).toHaveBeenCalledWith(
      "2026-11-18",
      expect.anything(),
    );
    expect(cell).toHaveAttribute("aria-pressed", "true");

    // Details panel should render task details
    expect(await screen.findByText("Submit Q3 Report")).toBeVisible();
    expect(screen.getByText("Work")).toBeVisible();
    expect(screen.getByText("Finances")).toBeVisible();

    // Close details panel
    const closeBtn = screen.getByRole("button", { name: /close day details/i });
    await user.click(closeBtn);

    // Assert details panel closed and focus restored to the cell
    expect(screen.queryByText("Submit Q3 Report")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(cell);

    vi.useRealTimers();
  });
});
