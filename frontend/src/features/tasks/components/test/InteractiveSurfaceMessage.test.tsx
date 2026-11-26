import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/services/apiError";
import { taskService } from "@/shared/services/taskService";
import { uiActionService } from "@/shared/services/uiActionService";
import type { UiActionBinding } from "@/shared/types/A2UI/uiAction";
import type { UiSurfaceEnvelope } from "@/shared/types/A2UI/uiSurface";
import interactiveFixture from "@/test/fixtures/a2ui-interactive-v09.json";
import { InteractiveSurfaceMessage } from "../chat/A2UI/InteractiveSurfaceMessage";

describe("InteractiveSurfaceMessage", () => {
  const surface = structuredClone(
    interactiveFixture.envelope,
  ) as UiSurfaceEnvelope;
  const bindings = structuredClone(
    interactiveFixture.stored.actionBindings,
  ) as UiActionBinding[];
  const location = {
    conversationId: "11111111-1111-4111-8111-111111111111",
    turnId: "turn-1",
    surfaceId: interactiveFixture.surfaceId,
  };

  const renderWithQuery = (ui: React.ReactElement) =>
    render(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        {ui}
      </QueryClientProvider>,
    );

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders interactive button, completes task via backend adapter, and handles uncertain retry", async () => {
    const user = userEvent.setup();
    vi.spyOn(taskService, "getTaskById").mockResolvedValue({
      _id: interactiveFixture.taskId,
      title: "Chuẩn bị slide demo",
      status: "in-progress",
      priority: "Medium",
      categoryId: "aaaaaaaaaaaaaaaaaaaaaaaa",
      projectId: null,
      startDate: "2026-11-26T00:00:00.000Z",
    });

    const submitSpy = vi
      .spyOn(uiActionService, "submit")
      .mockRejectedValueOnce(
        new ApiError("Network error", undefined, "network"),
      )
      .mockImplementationOnce(async (_loc, input) => ({
        requestId: input.requestId,
        actionId: input.actionId,
        outcome: "succeeded",
        task: {
          id: interactiveFixture.taskId,
          title: "Chuẩn bị slide demo",
          description: null,
          status: "completed",
          priority: "Medium",
          categoryId: "aaaaaaaaaaaaaaaaaaaaaaaa",
          projectId: null,
          startDate: null,
          dueDate: null,
          completedAt: "2026-11-27T01:00:00.000Z",
          createdAt: "2026-11-26T01:00:00.000Z",
          updatedAt: "2026-11-27T01:00:00.000Z",
        },
      }));

    renderWithQuery(
      <InteractiveSurfaceMessage
        surface={surface}
        location={location}
        bindings={bindings}
      />,
    );

    const actionButton = await screen.findByRole("button", {
      name: "Hoàn thành",
    });
    await waitFor(() => {
      expect(actionButton).toBeEnabled();
    });

    await user.click(actionButton);

    const retryButton = await screen.findByRole("button", {
      name: /Retry/i,
    });
    expect(actionButton).toBeDisabled();

    await user.click(retryButton);

    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalledTimes(2);
    });
    expect(submitSpy.mock.calls[0]![1]).toEqual(submitSpy.mock.calls[1]![1]);
    expect(screen.getByRole("status")).toHaveTextContent(/completed/i);
  });

  it("falls back safely to text when bindings are missing", async () => {
    renderWithQuery(
      <InteractiveSurfaceMessage
        surface={surface}
        location={location}
        bindings={[]}
      />,
    );

    expect(await screen.findByText(/Chuẩn bị slide demo/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Hoàn thành" }),
    ).not.toBeInTheDocument();
  });
});
