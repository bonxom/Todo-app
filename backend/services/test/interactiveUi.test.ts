import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import mongoose from "mongoose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../error/AppError.js";
import { TASK_ERROR } from "../../error/definitions/taskErrors.js";
import { UI_INTERACTIVE_CATALOG_ID } from "../../types/A2UI/IUiAction.js";
import type { IUserDocument } from "../../types/IUser.js";
import { interactiveUiService } from "../A2UI/interactiveUiService.js";
import { taskCommandService } from "../taskCommandService.js";
import { taskService } from "../taskService.js";

const fixturePath = resolve(
  process.cwd(),
  "../frontend/src/test/fixtures/a2ui-interactive-v09.json",
);
const fixture = JSON.parse(readFileSync(fixturePath, "utf-8"));

describe("interactiveUiService", () => {
  const user = {
    _id: new mongoose.Types.ObjectId(),
    role: "USER",
  } as IUserDocument;

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("compiles the canonical stored interactive surface to the exact v0.9 fixture", () => {
    expect(interactiveUiService.compile(fixture.stored)).toEqual(
      fixture.envelope,
    );
  });

  it("prepares server UUIDs, deduplicates task ownership checks, and never executes task commands", async () => {
    const readSpy = vi
      .spyOn(taskService, "getReadableById")
      .mockResolvedValue({ _id: fixture.taskId, status: "pending" } as never);
    const commandUpdateSpy = vi.spyOn(taskCommandService, "update");
    const finishSpy = vi.spyOn(taskService, "finish");

    const specWithDuplicateTaskTarget = {
      fallbackText: "Two actions same task",
      components: [
        {
          id: "root",
          component: "Column" as const,
          children: ["btn1", "btn2"],
          gap: "sm" as const,
        },
        {
          id: "btn1",
          component: "Button" as const,
          label: "Complete A",
          actionKey: "actA",
        },
        {
          id: "btn2",
          component: "Button" as const,
          label: "Complete B",
          actionKey: "actB",
        },
      ],
      displayData: {},
      actions: {
        actA: { name: "task.complete" as const, taskId: fixture.taskId },
        actB: { name: "task.complete" as const, taskId: fixture.taskId },
      },
    };

    const stored = await interactiveUiService.prepare(
      specWithDuplicateTaskTarget,
      user,
    );

    expect(readSpy).toHaveBeenCalledTimes(1);
    expect(readSpy).toHaveBeenCalledWith(fixture.taskId, user);
    expect(commandUpdateSpy).not.toHaveBeenCalled();
    expect(finishSpy).not.toHaveBeenCalled();

    expect(stored.catalogId).toBe(UI_INTERACTIVE_CATALOG_ID);
    expect(stored.surfaceId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(stored.actionBindings).toHaveLength(2);
    expect(stored.actionBindings[0].id).not.toBe(stored.actionBindings[1].id);
    expect(stored.actionBindings.map((b) => b.key)).toEqual(["actA", "actB"]);
  });

  it("rejects preparation when the target task is missing or unreadable", async () => {
    vi.spyOn(taskService, "getReadableById").mockRejectedValue(
      new AppError(TASK_ERROR.NOT_FOUND),
    );

    await expect(
      interactiveUiService.prepare(fixture.spec, user),
    ).rejects.toMatchObject({
      code: TASK_ERROR.NOT_FOUND.code,
      statusCode: 404,
    });
  });

  it("rejects compilation when stored actionBindings do not match spec actions", () => {
    const tampered = structuredClone(fixture.stored);
    tampered.actionBindings[0].taskId = "aaaaaaaaaaaaaaaaaaaaaaaa";
    expect(() => interactiveUiService.compile(tampered)).toThrow();
  });
});
