import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { runNotificationLoop } from "../notificationWorkerLoop.js";
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
it("runs immediately, waits between runs and aborts sleep", async () => {
  const controller = new AbortController();
  const run = vi.fn().mockResolvedValue(undefined);
  const running = runNotificationLoop(run, controller.signal);
  await vi.advanceTimersByTimeAsync(0);
  expect(run).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(59_999);
  expect(run).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(run).toHaveBeenCalledTimes(2);
  controller.abort();
  await running;
  await vi.advanceTimersByTimeAsync(60_000);
  expect(run).toHaveBeenCalledTimes(2);
});
it("does not overlap and waits for active run on shutdown", async () => {
  const controller = new AbortController();
  let finish!: () => void;
  const run = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const running = runNotificationLoop(run, controller.signal);
  await vi.advanceTimersByTimeAsync(120_000);
  expect(run).toHaveBeenCalledTimes(1);
  controller.abort();
  finish();
  await running;
});
it("retries after failure without exposing error payload", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const controller = new AbortController();
  const run = vi
    .fn()
    .mockRejectedValueOnce(new Error("secret"))
    .mockResolvedValue(undefined);
  const running = runNotificationLoop(run, controller.signal);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(run).toHaveBeenCalledTimes(2);
  expect(JSON.stringify(log.mock.calls)).not.toContain("secret");
  controller.abort();
  await running;
  log.mockRestore();
});
