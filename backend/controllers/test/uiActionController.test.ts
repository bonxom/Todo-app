import { randomUUID } from "node:crypto";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../error/AppError.js";
import { UI_ACTION_ERROR } from "../../error/definitions/A2UI/uiActionErrors.js";
import { TASK_ERROR } from "../../error/definitions/taskErrors.js";
import { errorHandler } from "../../error/errorHandler.js";
import { requestContext } from "../../error/requestContext.js";
import User from "../../models/User.js";
import aiRoutes from "../../routes/aiRoutes.js";
import { uiActionService } from "../../services/A2UI/uiActionService.js";

describe("POST /api/ai/conversations/:conversationId/turns/:turnId/surfaces/:surfaceId/actions", () => {
  const secret = "test-ui-action-secret";
  const userId = new mongoose.Types.ObjectId().toString();
  const conversationId = randomUUID();
  const turnId = "turn-1";
  const surfaceId = randomUUID();
  const actionId = randomUUID();
  const requestId = randomUUID();

  const app = express();
  app.use(requestContext);
  app.use(express.json());
  app.use("/api/ai", aiRoutes);
  app.use(errorHandler);

  const token = `Bearer ${jwt.sign({ id: userId }, secret, { expiresIn: "1h" })}`;
  const url = `/api/ai/conversations/${conversationId}/turns/${turnId}/surfaces/${surfaceId}/actions`;

  beforeEach(() => {
    vi.stubEnv("JWT_SECRET", secret);
    vi.stubEnv("A2UI_COMPOSITION_ENABLED", "true");
    vi.stubEnv("A2UI_INTERACTIVE_ENABLED", "true");
    vi.spyOn(User, "findById").mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(userId),
        role: "USER",
      }),
    } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns 401 when unauthenticated", async () => {
    const res = await request(app).post(url).send({ requestId, actionId });
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid UUID params or forged body fields", async () => {
    const executeSpy = vi.spyOn(uiActionService, "execute");

    const badConv = await request(app)
      .post(
        `/api/ai/conversations/not-a-uuid/turns/${turnId}/surfaces/${surfaceId}/actions`,
      )
      .set("Authorization", token)
      .send({ requestId, actionId });
    expect(badConv.status).toBe(400);

    const badSurface = await request(app)
      .post(
        `/api/ai/conversations/${conversationId}/turns/${turnId}/surfaces/not-a-uuid/actions`,
      )
      .set("Authorization", token)
      .send({ requestId, actionId });
    expect(badSurface.status).toBe(400);

    const forged = await request(app)
      .post(url)
      .set("Authorization", token)
      .send({
        requestId,
        actionId,
        taskId: "0123456789abcdef01234567",
        actionName: "task.complete",
        userId: "other",
      });
    expect(forged.status).toBe(400);
    expect(executeSpy).not.toHaveBeenCalled();
  });

  it.each([
    [403, new AppError(UI_ACTION_ERROR.USER_ACCOUNT_ONLY)],
    [404, new AppError(UI_ACTION_ERROR.NOT_FOUND)],
    [409, new AppError(UI_ACTION_ERROR.DISABLED)],
    [409, new AppError(UI_ACTION_ERROR.TURN_NOT_COMPLETED)],
    [409, new AppError(UI_ACTION_ERROR.REQUEST_CONFLICT)],
    [422, new AppError(TASK_ERROR.CANNOT_FINISH)],
    [503, new AppError(UI_ACTION_ERROR.TRANSACTION_UNAVAILABLE)],
  ])("maps domain/adapter errors to HTTP %i", async (expectedStatus, err) => {
    vi.spyOn(uiActionService, "execute").mockRejectedValueOnce(err);
    const res = await request(app)
      .post(url)
      .set("Authorization", token)
      .send({ requestId, actionId });

    expect(res.status).toBe(expectedStatus);
    expect(res.body.code).toBe(err.code);
  });

  it("returns 200 with UiActionResult on valid dispatch", async () => {
    const result = {
      requestId,
      actionId,
      outcome: "succeeded" as const,
      task: {
        id: "0123456789abcdef01234567",
        title: "Demo",
        description: null,
        status: "completed" as const,
        priority: "Medium" as const,
        categoryId: String(new mongoose.Types.ObjectId()),
        projectId: null,
        startDate: null,
        dueDate: null,
        completedAt: "2026-11-27T01:00:00.000Z",
        createdAt: "2026-11-26T01:00:00.000Z",
        updatedAt: "2026-11-27T01:00:00.000Z",
      },
    };
    const executeSpy = vi
      .spyOn(uiActionService, "execute")
      .mockResolvedValue(result);

    const res = await request(app)
      .post(url)
      .set("Authorization", token)
      .send({ requestId, actionId });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(result);
    expect(executeSpy).toHaveBeenCalledWith(
      { conversationId, turnId, surfaceId },
      { requestId, actionId },
      expect.objectContaining({ role: "USER" }),
    );
  });
});
