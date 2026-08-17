import { describe, expect, it, vi, afterEach } from "vitest";
import { generateOptimisticId } from "../id";

describe("generateOptimisticId", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses crypto.randomUUID when available in secure context", () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "12345678-1234-4234-8234-123456789abc",
    });

    const id = generateOptimisticId("optimistic");
    expect(id).toBe("optimistic-12345678-1234-4234-8234-123456789abc");
  });

  it("falls back gracefully when crypto is undefined", () => {
    vi.stubGlobal("crypto", undefined);

    const id1 = generateOptimisticId("optimistic");
    const id2 = generateOptimisticId("optimistic");

    expect(id1.startsWith("optimistic-")).toBe(true);
    expect(id2.startsWith("optimistic-")).toBe(true);
    expect(id1).not.toBe(id2);
  });

  it("falls back gracefully when crypto.randomUUID is not a function (e.g. non-HTTPS/insecure origin)", () => {
    vi.stubGlobal("crypto", {});

    const id = generateOptimisticId("optimistic");
    expect(id.startsWith("optimistic-")).toBe(true);
    expect(id.length).toBeGreaterThan("optimistic-".length);
  });

  it("falls back gracefully when crypto.getRandomValues is available but randomUUID is not", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = i;
        }
        return arr;
      },
    });

    const id = generateOptimisticId("optimistic");
    expect(id.startsWith("optimistic-")).toBe(true);
    expect(id.length).toBeGreaterThan(15);
  });
});
