import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../error/errorHandler.js";
import { requestContext } from "../../error/requestContext.js";

const mockFind = vi.hoisted(() => vi.fn());
const mockUserFindById = vi.hoisted(() => vi.fn());

vi.mock("../../models/Conversation.js", () => ({
  default: {
    find: mockFind,
    create: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock("../../models/User.js", () => ({
  default: {
    findById: mockUserFindById,
  },
}));

import aiRoutes from "../../routes/aiRoutes.js";
import {
  conversationRepository,
  decodeConversationCursor,
  encodeConversationCursor,
} from "../../repositories/conversationRepository.js";
import { listConversationsQuerySchema } from "../../validations/aiValidation.js";

function makeLeanChain(rows: unknown[]) {
  const lean = vi.fn().mockResolvedValue(rows);
  const limit = vi.fn().mockReturnValue({ lean });
  const sort = vi.fn().mockReturnValue({ limit });
  const select = vi.fn().mockReturnValue({ sort });
  return { select, sort, limit, lean };
}

describe("conversation list pagination", () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const secret = "conv-pagination-test-secret";

  const app = express();
  app.use(requestContext);
  app.use(express.json());
  app.use("/api/ai", aiRoutes);
  app.use(errorHandler);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("JWT_SECRET", secret);
    mockUserFindById.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: userId,
        email: "user@example.com",
        name: "Test User",
        role: "USER",
      }),
    });
  });

  it("validates query params via listConversationsQuerySchema", () => {
    expect(listConversationsQuerySchema.parse({})).toEqual({});
    expect(
      listConversationsQuerySchema.parse({
        limit: "25",
        cursor: "abc",
        search: "  sprint  ",
      }),
    ).toEqual({
      limit: 25,
      cursor: "abc",
      search: "sprint",
    });

    expect(() => listConversationsQuerySchema.parse({ limit: "0" })).toThrow();
    expect(() =>
      listConversationsQuerySchema.parse({ limit: "101" }),
    ).toThrow();
    expect(() =>
      listConversationsQuerySchema.parse({ limit: "abc" }),
    ).toThrow();
  });

  it("encodes and decodes cursors and rejects malformed cursors", () => {
    const updatedAt = new Date("2026-11-25T10:30:00.000Z");
    const encoded = encodeConversationCursor(updatedAt, "conv-42");
    expect(decodeConversationCursor(encoded)).toEqual({
      updatedAt,
      id: "conv-42",
    });

    expect(() => decodeConversationCursor("not-valid-cursor")).toThrow();
    expect(() =>
      decodeConversationCursor(
        Buffer.from(JSON.stringify({ u: "bad-date", i: "c1" })).toString(
          "base64url",
        ),
      ),
    ).toThrow();
  });

  it("returns limit items, sets hasMore and nextCursor, and applies tie-break cursor filter", async () => {
    const t1 = new Date("2026-11-25T12:00:00.000Z");
    const t2 = new Date("2026-11-25T12:00:00.000Z");
    const t3 = new Date("2026-11-25T11:00:00.000Z");

    const page1Chain = makeLeanChain([
      { _id: "c-3", title: "Newest", updatedAt: t1, contextProjectId: null },
      { _id: "c-2", title: "Second", updatedAt: t2, contextProjectId: null },
      { _id: "c-1", title: "Third", updatedAt: t3, contextProjectId: null },
    ]);
    mockFind.mockReturnValueOnce(page1Chain);

    const page1 = await conversationRepository.list(userId, { limit: 2 });
    expect(page1Chain.sort).toHaveBeenCalledWith({ updatedAt: -1, _id: -1 });
    expect(page1Chain.limit).toHaveBeenCalledWith(3);
    expect(page1.items.map((item) => item._id)).toEqual(["c-3", "c-2"]);
    expect(page1.hasMore).toBe(true);
    expect(page1.nextCursor).toBe(encodeConversationCursor(t2, "c-2"));

    const page2Chain = makeLeanChain([
      { _id: "c-1", title: "Third", updatedAt: t3, contextProjectId: null },
    ]);
    mockFind.mockReturnValueOnce(page2Chain);

    const page2 = await conversationRepository.list(userId, {
      limit: 2,
      cursor: decodeConversationCursor(page1.nextCursor!),
      search: "plan (v2)+",
    });

    expect(mockFind).toHaveBeenNthCalledWith(2, {
      userId,
      sequence: { $gt: 0 },
      title: { $regex: "plan \\(v2\\)\\+", $options: "i" },
      $or: [
        { updatedAt: { $lt: t2 } },
        { updatedAt: t2, _id: { $lt: "c-2" } },
      ],
    });
    expect(page2.items.map((item) => item._id)).toEqual(["c-1"]);
    expect(page2.hasMore).toBe(false);
    expect(page2.nextCursor).toBeNull();
  });

  it("serves paginated GET /api/ai/conversations and rejects invalid cursor or limit", async () => {
    const token = `Bearer ${jwt.sign({ id: userId }, secret, { expiresIn: "1h" })}`;
    const updatedAt = new Date("2026-11-25T10:00:00.000Z");
    const chain = makeLeanChain([
      {
        _id: "c-10",
        title: "Sprint chat",
        updatedAt,
        contextProjectId: new mongoose.Types.ObjectId("507f1f77bcf86cd799439090"),
      },
      {
        _id: "c-09",
        title: "Older chat",
        updatedAt: new Date("2026-11-24T10:00:00.000Z"),
        contextProjectId: null,
      },
    ]);
    mockFind.mockReturnValueOnce(chain);

    const res = await request(app)
      .get("/api/ai/conversations?limit=1")
      .set("Authorization", token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [
        {
          id: "c-10",
          title: "Sprint chat",
          updatedAt: updatedAt.toISOString(),
          projectId: "507f1f77bcf86cd799439090",
        },
      ],
      pageInfo: {
        hasMore: true,
        nextCursor: encodeConversationCursor(updatedAt, "c-10"),
      },
    });

    const invalidLimit = await request(app)
      .get("/api/ai/conversations?limit=500")
      .set("Authorization", token);
    expect(invalidLimit.status).toBe(400);

    const invalidCursor = await request(app)
      .get("/api/ai/conversations?cursor=invalid-cursor")
      .set("Authorization", token);
    expect(invalidCursor.status).toBe(400);
  });
});
