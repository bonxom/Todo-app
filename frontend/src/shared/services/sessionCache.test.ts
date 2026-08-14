import { describe, expect, it, vi } from "vitest";
import { registerUserCacheReset, resetUserCache } from "./sessionCache";

describe("sessionCache", () => {
  it("calls registered reset handler when resetUserCache is invoked", async () => {
    const handler = vi.fn();
    const unregister = registerUserCacheReset(handler);

    await resetUserCache();
    expect(handler).toHaveBeenCalledTimes(1);

    unregister();
    await resetUserCache();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
