import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { conversationService } from "../../services/conversationService.js";
import { chatStreamRepository } from "../../repositories/chatStreamRepository.js";
import { chatRunService } from "../../services/chatRunService.js";
import { chatEventStreamService } from "../../services/chatEventStreamService.js";
import { errorHandler, requestContext } from "../../error/index.js";
import { AppError } from "../../error/AppError.js";
import { AI_ERROR } from "../../error/definitions/aiErrors.js";
import type { TurnSnapshot } from "../../types/IChatStream.js";
import aiRoutes from "../../routes/aiRoutes.js";

// Mock auth middleware to supply a fixed test user without DB lookups
vi.mock("../../middlewares/auth.js", () => ({
  protect: (req: any, _res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return next(
        new AppError({
          code: "AUTH_0001",
          message: "Token missing",
          statusCode: 401,
        }),
      );
    }
    if (authHeader === "Bearer invalid") {
      return next(
        new AppError({
          code: "AUTH_0002",
          message: "Token invalid",
          statusCode: 401,
        }),
      );
    }
    req.user = {
      _id: "507f1f77bcf86cd799439011",
      role: "USER",
      name: "Stream Test User",
    };
    next();
  },
  authorize: () => (_req: any, _res: any, next: any) => next(),
}));

describe("chatStreamController HTTP API", () => {
  const app = express();
  app.use(requestContext);
  app.use(express.json());
  app.use("/api/ai", aiRoutes);
  app.use(errorHandler);

  const authHeader = `Bearer ${jwt.sign({}, "stream-test-secret", { expiresIn: "1h" })}`;
  const conversationId = "550e8400-e29b-41d4-a716-446655440000";
  const turnId = "550e8400-e29b-41d4-a716-446655440001";
  const requestId = "550e8400-e29b-41d4-a716-446655440002";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /conversations/:conversationId/turns", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await request(app)
        .post(`/api/ai/conversations/${conversationId}/turns`)
        .send({
          userInput: "Test",
          requestId,
        });
      expect(res.status).toBe(401);
    });

    it("returns 202 when starting a new processing turn", async () => {
      const snapshot: TurnSnapshot = {
        turnId,
        conversationId,
        requestId,
        status: "processing",
        partialResponse: "",
        lastEventSeq: 1,
        toolProgress: [],
        deadlineAt: new Date().toISOString(),
      };

      vi.spyOn(conversationService, "startStreamTurn").mockResolvedValue({
        snapshot,
        isNew: true,
      });

      const res = await request(app)
        .post(`/api/ai/conversations/${conversationId}/turns`)
        .set("Authorization", authHeader)
        .send({
          userInput: "Làm việc",
          requestId,
        });

      expect(res.status).toBe(202);
      expect(conversationService.startStreamTurn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ scopes: ["tasks:write"] }),
      );
      expect(res.body).toEqual({ data: snapshot });
    });

    it("returns 200 when duplicate request for completed turn", async () => {
      const snapshot: TurnSnapshot = {
        turnId,
        conversationId,
        requestId,
        status: "completed",
        partialResponse: "Xong",
        lastEventSeq: 3,
        toolProgress: [],
        deadlineAt: new Date().toISOString(),
      };

      vi.spyOn(conversationService, "startStreamTurn").mockResolvedValue({
        snapshot,
        isNew: false,
      });

      const res = await request(app)
        .post(`/api/ai/conversations/${conversationId}/turns`)
        .set("Authorization", authHeader)
        .send({
          userInput: "Làm việc",
          requestId,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("completed");
    });

    it("returns 409 when requestId was reused with different body", async () => {
      vi.spyOn(conversationService, "startStreamTurn").mockRejectedValue(
        new AppError(AI_ERROR.CHAT_REQUEST_CONFLICT),
      );

      const res = await request(app)
        .post(`/api/ai/conversations/${conversationId}/turns`)
        .set("Authorization", authHeader)
        .send({
          userInput: "Different",
          requestId,
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe(AI_ERROR.CHAT_REQUEST_CONFLICT.code);
    });

    it("returns 409 when conversation is already busy", async () => {
      vi.spyOn(conversationService, "startStreamTurn").mockRejectedValue(
        new AppError(AI_ERROR.CONVERSATION_BUSY),
      );

      const res = await request(app)
        .post(`/api/ai/conversations/${conversationId}/turns`)
        .set("Authorization", authHeader)
        .send({
          userInput: "Test",
          requestId,
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe(AI_ERROR.CONVERSATION_BUSY.code);
    });

    it("returns 429 when concurrency limit of 3 runs reached", async () => {
      vi.spyOn(conversationService, "startStreamTurn").mockRejectedValue(
        new AppError(AI_ERROR.CHAT_CONCURRENCY_LIMIT),
      );

      const res = await request(app)
        .post(`/api/ai/conversations/${conversationId}/turns`)
        .set("Authorization", authHeader)
        .send({
          userInput: "Test",
          requestId,
        });

      expect(res.status).toBe(429);
      expect(res.body.code).toBe(AI_ERROR.CHAT_CONCURRENCY_LIMIT.code);
    });
  });

  describe("GET /conversations/:conversationId/turns/:turnId", () => {
    it("returns 200 with turn snapshot", async () => {
      const snapshot: TurnSnapshot = {
        turnId,
        conversationId,
        requestId,
        status: "processing",
        partialResponse: "Đang làm",
        lastEventSeq: 2,
        toolProgress: [],
        deadlineAt: new Date().toISOString(),
      };

      vi.spyOn(chatStreamRepository, "getSnapshot").mockResolvedValue(snapshot);

      const res = await request(app)
        .get(`/api/ai/conversations/${conversationId}/turns/${turnId}`)
        .set("Authorization", authHeader);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ data: snapshot });
    });

    it("returns 404 when turn is not found or not owned", async () => {
      vi.spyOn(chatStreamRepository, "getSnapshot").mockRejectedValue(
        new AppError(AI_ERROR.TURN_NOT_FOUND),
      );

      const res = await request(app)
        .get(`/api/ai/conversations/${conversationId}/turns/${turnId}`)
        .set("Authorization", authHeader);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(AI_ERROR.TURN_NOT_FOUND.code);
    });
  });

  describe("POST /conversations/:conversationId/turns/:turnId/cancel", () => {
    it("returns 202 when stop is requested and run is stopping", async () => {
      const snapshot: TurnSnapshot = {
        turnId,
        conversationId,
        requestId,
        status: "stopping",
        partialResponse: "Tạm dừng",
        lastEventSeq: 3,
        toolProgress: [],
        deadlineAt: new Date().toISOString(),
      };

      vi.spyOn(chatRunService, "cancel").mockResolvedValue(snapshot);

      const res = await request(app)
        .post(`/api/ai/conversations/${conversationId}/turns/${turnId}/cancel`)
        .set("Authorization", authHeader)
        .send();

      expect(res.status).toBe(202);
      expect(res.body).toEqual({ data: snapshot });
    });

    it("returns 200 when cancelling already terminal turn", async () => {
      const snapshot: TurnSnapshot = {
        turnId,
        conversationId,
        requestId,
        status: "cancelled",
        partialResponse: "",
        lastEventSeq: 4,
        toolProgress: [],
        deadlineAt: new Date().toISOString(),
      };

      vi.spyOn(chatRunService, "cancel").mockResolvedValue(snapshot);

      const res = await request(app)
        .post(`/api/ai/conversations/${conversationId}/turns/${turnId}/cancel`)
        .set("Authorization", authHeader)
        .send();

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ data: snapshot });
    });
  });

  describe("GET /conversations/:conversationId/turns/:turnId/events", () => {
    it("returns 400 when after query is invalid", async () => {
      const res = await request(app)
        .get(
          `/api/ai/conversations/${conversationId}/turns/${turnId}/events?after=-1`,
        )
        .set("Authorization", authHeader);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(AI_ERROR.CHAT_CURSOR_INVALID.code);
    });

    it("returns 400 when Last-Event-ID header is invalid and after is absent", async () => {
      const res = await request(app)
        .get(`/api/ai/conversations/${conversationId}/turns/${turnId}/events`)
        .set("Authorization", authHeader)
        .set("Last-Event-ID", "not-a-number");

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(AI_ERROR.CHAT_CURSOR_INVALID.code);
    });

    it("prioritizes query after over Last-Event-ID", async () => {
      vi.spyOn(chatStreamRepository, "getSnapshot").mockResolvedValue({
        turnId,
        conversationId,
        requestId,
        status: "completed",
        partialResponse: "",
        lastEventSeq: 5,
        toolProgress: [],
        deadlineAt: new Date().toISOString(),
      });

      const streamEventsSpy = vi
        .spyOn(chatEventStreamService, "streamEvents")
        .mockResolvedValue();

      const res = await request(app)
        .get(
          `/api/ai/conversations/${conversationId}/turns/${turnId}/events?after=3`,
        )
        .set("Authorization", authHeader)
        .set("Last-Event-ID", "1");

      expect(res.status).toBe(200);
      expect(streamEventsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          after: 3,
        }),
      );
    });

    it("returns 400 when cursor exceeds lastEventSeq", async () => {
      vi.spyOn(chatStreamRepository, "getSnapshot").mockResolvedValue({
        turnId,
        conversationId,
        requestId,
        status: "processing",
        partialResponse: "",
        lastEventSeq: 2,
        toolProgress: [],
        deadlineAt: new Date().toISOString(),
      });

      const res = await request(app)
        .get(
          `/api/ai/conversations/${conversationId}/turns/${turnId}/events?after=5`,
        )
        .set("Authorization", authHeader);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(AI_ERROR.CHAT_CURSOR_INVALID.code);
    });

    it("returns 200 with SSE headers on successful connection", async () => {
      vi.spyOn(chatStreamRepository, "getSnapshot").mockResolvedValue({
        turnId,
        conversationId,
        requestId,
        status: "completed",
        partialResponse: "",
        lastEventSeq: 1,
        toolProgress: [],
        deadlineAt: new Date().toISOString(),
      });

      vi.spyOn(chatEventStreamService, "streamEvents").mockImplementation(
        async ({ write }) => {
          write(
            'id: 1\nevent: turn.finished\ndata: {"status":"completed"}\n\n',
          );
        },
      );

      const res = await request(app)
        .get(
          `/api/ai/conversations/${conversationId}/turns/${turnId}/events?after=0`,
        )
        .set("Authorization", authHeader);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("text/event-stream");
      expect(res.headers["cache-control"]).toBe("no-store, no-transform");
      expect(res.headers["x-accel-buffering"]).toBe("no");
      expect(res.text).toContain("event: turn.finished\n");
    });
  });
});
