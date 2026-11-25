import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { taskService } from "@/shared/services/taskService";
import type { Task } from "@/shared/types/domain";
import CalendarTimeline from "../components/CalendarTimeline";
import {
  createDeferred,
  renderWithProviders,
  resetTestSession,
} from "./testSupport";

vi.mock("@/shared/services/taskService", () => ({
  taskService: {
    getAllTasks: vi.fn(),
  },
}));

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  elements: Element[] = [];
  disconnected = false;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe = (element: Element) => {
    this.elements.push(element);
  };

  unobserve = (element: Element) => {
    this.elements = this.elements.filter((item) => item !== element);
  };

  disconnect = () => {
    this.disconnected = true;
    this.elements = [];
  };

  trigger(isIntersecting: boolean) {
    if (this.disconnected || this.elements.length === 0) return;
    const entry = {
      isIntersecting,
      target: this.elements[0],
    } as IntersectionObserverEntry;
    this.callback([entry], this as unknown as IntersectionObserver);
  }
}

const makeTask = (
  id: string,
  title: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  overrides: Partial<Task> = {},
): Task => ({
  _id: id,
  title,
  description: "",
  status: "pending",
  priority: "Medium",
  categoryId: null,
  projectId: null,
  startDate: "",
  dueDate: new Date(year, month, day, hour, 0, 0).toISOString(),
  ...overrides,
});

describe("CalendarTimeline", () => {
  const anchorDate = new Date(2026, 10, 25, 0, 0, 0, 0);

  beforeEach(() => {
    resetTestSession();
    MockIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    vi.mocked(taskService.getAllTasks).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders relative labels, task metadata, and auto-loads next window when sentinel is visible", async () => {
    vi.mocked(taskService.getAllTasks)
      .mockResolvedValueOnce({
        data: [
          makeTask("t1", "Submit report", 2026, 10, 25, 9, {
            status: "in-progress",
            priority: "High",
            description: "Include weekly metrics",
          }),
          makeTask("t2", "Prep slides", 2026, 10, 26, 14),
          makeTask("t3", "Monthly close", 2026, 10, 30, 16, {
            status: "completed",
          }),
        ],
        pageInfo: { pageNo: 1, pageSize: 100, totalCount: 3, totalPage: 1 },
      })
      .mockResolvedValueOnce({
        data: [makeTask("t4", "Window two task", 2026, 11, 10, 11)],
        pageInfo: { pageNo: 1, pageSize: 100, totalCount: 1, totalPage: 1 },
      });

    const onOpenTask = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <CalendarTimeline anchorDate={anchorDate} onOpenTask={onOpenTask} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Submit report")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: "Load more days" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Tomorrow")).toBeInTheDocument();
    expect(screen.getByText("Include weekly metrics")).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /November 25, 2026/i }),
    ).toBeInTheDocument();

    // Sentinel visible on screen automatically fetches the next window without a button.
    const observer = MockIntersectionObserver.instances.at(-1)!;
    act(() => {
      observer.trigger(true);
      observer.trigger(false);
    });
    await waitFor(() => {
      expect(screen.getByText("Window two task")).toBeInTheDocument();
    });
    expect(taskService.getAllTasks).toHaveBeenCalledTimes(2);

    // Activating a task row opens the task details callback.
    await user.click(screen.getByRole("button", { name: /Submit report/i }));
    expect(onOpenTask).toHaveBeenCalledWith("t1");
  });

  it("loads once on scroll into view and ignores duplicate triggers while in-flight", async () => {
    const secondWindow = createDeferred<{
      data: Task[];
      pageInfo: {
        pageNo: number;
        pageSize: number;
        totalCount: number;
        totalPage: number;
      };
    }>();

    vi.mocked(taskService.getAllTasks)
      .mockResolvedValueOnce({
        data: [makeTask("t1", "Initial task", 2026, 10, 25, 9)],
        pageInfo: { pageNo: 1, pageSize: 100, totalCount: 1, totalPage: 1 },
      })
      .mockImplementationOnce(() => secondWindow.promise);

    renderWithProviders(
      <CalendarTimeline anchorDate={anchorDate} onOpenTask={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Initial task")).toBeInTheDocument();
    });

    const observer = MockIntersectionObserver.instances.at(-1)!;
    act(() => {
      observer.trigger(false);
    });
    expect(taskService.getAllTasks).toHaveBeenCalledTimes(1);

    // Scrolling sentinel into view schedules exactly one load and shows loading status.
    act(() => {
      observer.trigger(true);
    });
    expect(taskService.getAllTasks).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(screen.getByText("Loading more days…")).toBeInTheDocument();
    });

    // Duplicate intersection events while fetching do not schedule another request.
    act(() => {
      observer.trigger(false);
      observer.trigger(true);
    });
    expect(taskService.getAllTasks).toHaveBeenCalledTimes(2);

    // Simulate list growing out of view as new tasks render.
    act(() => {
      observer.trigger(false);
    });

    await act(async () => {
      secondWindow.resolve({
        data: [makeTask("t2", "Appended task", 2026, 11, 12, 10)],
        pageInfo: { pageNo: 1, pageSize: 100, totalCount: 1, totalPage: 1 },
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Appended task")).toBeInTheDocument();
    });
    expect(screen.getByText("Initial task")).toBeInTheDocument();
    expect(MockIntersectionObserver.instances).toHaveLength(1);
  });

  it("keeps prior rows on continuation failure and retries the exact failed interval", async () => {
    vi.mocked(taskService.getAllTasks)
      .mockResolvedValueOnce({
        data: [makeTask("t1", "Kept task", 2026, 10, 25, 9)],
        pageInfo: { pageNo: 1, pageSize: 100, totalCount: 1, totalPage: 1 },
      })
      .mockRejectedValueOnce(new Error("Continuation network error"))
      .mockResolvedValueOnce({
        data: [makeTask("t2", "Recovered next window", 2026, 11, 11, 10)],
        pageInfo: { pageNo: 1, pageSize: 100, totalCount: 1, totalPage: 1 },
      });

    const user = userEvent.setup();
    renderWithProviders(
      <CalendarTimeline anchorDate={anchorDate} onOpenTask={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Kept task")).toBeInTheDocument();
    });

    const observer = MockIntersectionObserver.instances.at(-1)!;
    act(() => {
      observer.trigger(true);
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /Could not load more days/i,
      );
    });
    expect(screen.getByText("Kept task")).toBeInTheDocument();

    // Error state pauses auto-load until user clicks Retry.
    act(() => {
      observer.trigger(false);
      observer.trigger(true);
    });
    expect(taskService.getAllTasks).toHaveBeenCalledTimes(2);

    const failedStartDate = vi.mocked(taskService.getAllTasks).mock.calls[1][0]
      ?.startDate;

    act(() => {
      observer.trigger(false);
    });
    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(screen.getByText("Recovered next window")).toBeInTheDocument();
    });
    expect(vi.mocked(taskService.getAllTasks).mock.calls[2][0]?.startDate).toBe(
      failedStartDate,
    );
  });

  it("retains rows on background refresh failure and retries loaded data", async () => {
    vi.mocked(taskService.getAllTasks)
      .mockResolvedValueOnce({
        data: [makeTask("t1", "Loaded task", 2026, 10, 25, 9)],
        pageInfo: { pageNo: 1, pageSize: 100, totalCount: 1, totalPage: 1 },
      })
      .mockRejectedValueOnce(new Error("Refresh failed"))
      .mockResolvedValueOnce({
        data: [makeTask("t1", "Loaded task refreshed", 2026, 10, 25, 9)],
        pageInfo: { pageNo: 1, pageSize: 100, totalCount: 1, totalPage: 1 },
      });

    const user = userEvent.setup();
    const { queryClient } = renderWithProviders(
      <CalendarTimeline anchorDate={anchorDate} onOpenTask={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Loaded task")).toBeInTheDocument();
    });

    await act(async () => {
      await queryClient.invalidateQueries();
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /Could not refresh timeline/i,
      );
    });
    expect(screen.getByText("Loaded task")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(screen.getByText("Loaded task refreshed")).toBeInTheDocument();
    });
  });

  it("auto-advances across empty windows up to the safety limit and supports scroll fallback without IntersectionObserver", async () => {
    vi.mocked(taskService.getAllTasks)
      .mockRejectedValueOnce(new Error("Initial failure"))
      .mockResolvedValueOnce({
        data: [],
        pageInfo: { pageNo: 1, pageSize: 100, totalCount: 0, totalPage: 1 },
      })
      .mockResolvedValueOnce({
        data: [makeTask("t3", "Future task", 2026, 11, 15, 10)],
        pageInfo: { pageNo: 1, pageSize: 100, totalCount: 1, totalPage: 1 },
      })
      .mockResolvedValue({
        data: [],
        pageInfo: { pageNo: 1, pageSize: 100, totalCount: 0, totalPage: 1 },
      });

    vi.stubGlobal("IntersectionObserver", undefined);

    const user = userEvent.setup();
    renderWithProviders(
      <CalendarTimeline anchorDate={anchorDate} onOpenTask={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    // Retry initial failure -> window 1 is empty -> scroll fallback auto-advances to window 2 ("Future task"),
    // then stops after 3 consecutive empty windows without an infinite loop.
    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(screen.getByText("Future task")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(
        screen.getByText(/No more scheduled tasks through/i),
      ).toBeVisible();
    });

    fireEvent.scroll(window);
    expect(taskService.getAllTasks).toHaveBeenCalledTimes(6);

    const firstStart = new Date(
      String(vi.mocked(taskService.getAllTasks).mock.calls[1][0]?.startDate),
    );
    const secondStart = new Date(
      String(vi.mocked(taskService.getAllTasks).mock.calls[2][0]?.startDate),
    );
    expect(secondStart.getTime()).toBeGreaterThan(firstStart.getTime());
  });
});
