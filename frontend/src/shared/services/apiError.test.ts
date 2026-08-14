import { describe, expect, it } from "vitest";
import { ApiError, getApiErrorMessage } from "./apiError";

describe("ApiError", () => {
  it("creates an ApiError instance with properties", () => {
    const err = new ApiError("Not found", 404, "http", "ERR_BAD_REQUEST");
    expect(err.message).toBe("Not found");
    expect(err.status).toBe(404);
    expect(err.kind).toBe("http");
    expect(err.code).toBe("ERR_BAD_REQUEST");
    expect(err.name).toBe("ApiError");
    expect(err instanceof ApiError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });

  describe("getApiErrorMessage", () => {
    it("extracts message from ApiError", () => {
      const err = new ApiError("Custom backend error", 400);
      expect(getApiErrorMessage(err)).toBe("Custom backend error");
    });

    it("extracts message from standard Error", () => {
      const err = new Error("Standard error");
      expect(getApiErrorMessage(err)).toBe("Standard error");
    });

    it("returns fallback for unknown error shapes", () => {
      expect(getApiErrorMessage(null, "Default msg")).toBe("Default msg");
      expect(getApiErrorMessage(undefined, "Default msg")).toBe("Default msg");
      expect(getApiErrorMessage({}, "Default msg")).toBe("Default msg");
    });
  });
});
