import { afterEach, describe, expect, it, vi } from "vitest";
import axiosInstance from "../httpClient";
import { uiActionService } from "../uiActionService";

describe("uiActionService", () => {
  const location = {
    conversationId: "conversation-1",
    turnId: "turn-1",
    surfaceId: "11111111-1111-4111-8111-111111111111",
  };
  const input = {
    requestId: "22222222-2222-4222-8222-222222222222",
    actionId: "33333333-3333-4333-8333-333333333333",
  };
  const validResult = {
    requestId: input.requestId,
    actionId: input.actionId,
    outcome: "succeeded" as const,
    task: {
      id: "0123456789abcdef01234567",
      title: "Demo task",
      description: null,
      status: "completed" as const,
      priority: "Medium" as const,
      categoryId: "aaaaaaaaaaaaaaaaaaaaaaaa",
      projectId: null,
      startDate: null,
      dueDate: null,
      completedAt: "2026-11-27T01:00:00.000Z",
      createdAt: "2026-11-26T01:00:00.000Z",
      updatedAt: "2026-11-27T01:00:00.000Z",
    },
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts only requestId and actionId to the surface action endpoint and validates TaskDto", async () => {
    const postSpy = vi
      .spyOn(axiosInstance, "post")
      .mockResolvedValue({ data: validResult });

    const result = await uiActionService.submit(location, input);

    expect(postSpy).toHaveBeenCalledWith(
      `/api/ai/conversations/${location.conversationId}/turns/${location.turnId}/surfaces/${location.surfaceId}/actions`,
      input,
    );
    expect(result).toEqual(validResult);
  });

  it("rejects malformed or non-TaskDto response payloads", async () => {
    vi.spyOn(axiosInstance, "post").mockResolvedValue({
      data: {
        ...validResult,
        task: {
          ...validResult.task,
          _id: validResult.task.id,
          id: undefined,
        },
      },
    });

    await expect(uiActionService.submit(location, input)).rejects.toThrow();
  });
});
