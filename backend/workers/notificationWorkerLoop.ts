export async function runNotificationLoop(
  run: () => Promise<unknown>,
  signal: AbortSignal,
  intervalMs = 60_000,
): Promise<void> {
  while (!signal.aborted) {
    try {
      await run();
    } catch {
      console.error("Notification scan failed; retrying on next interval");
    }
    if (signal.aborted) break;
    await new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timer);
        signal.removeEventListener("abort", done);
        resolve();
      };
      const timer = setTimeout(done, intervalMs);
      signal.addEventListener("abort", done, { once: true });
      if (signal.aborted) done();
    });
  }
}
