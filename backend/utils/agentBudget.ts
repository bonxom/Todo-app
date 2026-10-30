export interface AgentBudget {
  remainingMs(): number;
  elapsedMs(): number;
  canStartAction(): boolean;
  providerTimeoutMs(finalOnly: boolean): number;
}

const FINAL_RESERVE_MS = 10_000;
const PERSISTENCE_RESERVE_MS = 2_000;
const PROVIDER_CAP_MS = 45_000;

/** Limits starting work; does not claim to cancel an in-flight database write. */
export function createAgentBudget(
  now: () => number = () => performance.now(),
  totalMs = 50_000,
): AgentBudget {
  if (!Number.isFinite(totalMs) || totalMs < 0) {
    throw new RangeError("Agent budget must be a finite non-negative duration");
  }
  const startedAt = now();
  const elapsedMs = () => Math.max(0, Math.round(now() - startedAt));
  const remainingMs = () => Math.max(0, Math.round(totalMs - elapsedMs()));
  return Object.freeze({
    elapsedMs,
    remainingMs,
    canStartAction: () =>
      remainingMs() > FINAL_RESERVE_MS + PERSISTENCE_RESERVE_MS,
    providerTimeoutMs: (finalOnly: boolean) =>
      Math.floor(
        Math.min(
          PROVIDER_CAP_MS,
          Math.max(
            0,
            remainingMs() -
              PERSISTENCE_RESERVE_MS -
              (finalOnly ? 0 : FINAL_RESERVE_MS),
          ),
        ),
      ),
  });
}
