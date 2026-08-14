import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { taskKeys } from "../taskKeys";

describe("query cancellation", () => {
  it("aborts the signal when query is cancelled", async () => {
    const client = new QueryClient();
    let capturedSignal: AbortSignal | undefined;

    const promise = client.fetchQuery({
      queryKey: taskKeys.list({}),
      queryFn: ({ signal }) => {
        capturedSignal = signal;
        return new Promise((resolve) => setTimeout(resolve, 1000));
      },
    });

    client.cancelQueries({ queryKey: taskKeys.all });

    expect(capturedSignal?.aborted).toBe(true);
    await expect(promise).rejects.toThrow();
  });
});
