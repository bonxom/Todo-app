import { afterEach, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useAgenticChatMutation } from "../aiMutations";
import { aiService } from "@/shared/services/aiService";
import { taskKeys } from "../taskKeys";
import { statKeys } from "@/features/statistics/api/statKeys";

afterEach(() => vi.restoreAllMocks());

it.each([false, true])(
  "refreshes workspace after chat settles (provider failure: %s)",
  async (fails) => {
    const client = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    client.setQueryData(taskKeys.all, []);
    client.setQueryData(statKeys.all, {});
    const response = vi.spyOn(aiService, "getAgenticChatResponse");
    if (fails)
      response.mockRejectedValueOnce(
        new Error("provider failed after tool commit"),
      );
    else
      response.mockResolvedValueOnce({
        success: true,
        message: "OK",
        data: "Task created",
      });
    const callback = vi.fn();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result, unmount } = renderHook(
      () => useAgenticChatMutation({ onSettled: callback }),
      { wrapper },
    );
    await act(async () => {
      const pending = result.current.mutateAsync({
        userInput: "Create a task",
      });
      if (fails) await expect(pending).rejects.toThrow("provider failed");
      else await pending;
    });
    expect(client.getQueryState(taskKeys.all)?.isInvalidated).toBe(true);
    expect(client.getQueryState(statKeys.all)?.isInvalidated).toBe(true);
    expect(callback).toHaveBeenCalledTimes(1);
    unmount();
    client.clear();
  },
);
