import { expect, it } from "vitest";
import { toolFailure, toolSuccess } from "../tools/shared.js";
import { AppError } from "../../error/AppError.js";
import { TASK_ERROR } from "../../error/definitions/taskErrors.js";
import { COMMON_ERROR } from "../../error/definitions/commonErrors.js";
it("sanitizes failures and preserves structured success", () => {
  expect(toolFailure(new AppError(TASK_ERROR.NOT_FOUND))).toEqual(
    toolFailure(new AppError(TASK_ERROR.ACCESS_DENIED)),
  );
  expect(
    JSON.stringify(toolFailure(new AppError(COMMON_ERROR.INVALID_PAYLOAD))),
  ).toContain("INVALID_ARGUMENT");
  expect(
    JSON.stringify(toolFailure(new Error("mongodb://secret"))),
  ).not.toContain("secret");
  expect(
    JSON.stringify(
      toolFailure(
        Object.assign(new Error("secret"), { name: "MongoNetworkError" }),
      ),
    ),
  ).toContain("SERVICE_UNAVAILABLE");
  expect(toolFailure(new Error()).isError).toBe(true);
  expect(toolSuccess({ ok: true })).toMatchObject({
    structuredContent: { ok: true },
    content: [{ type: "text", text: '{"ok":true}' }],
  });
});
