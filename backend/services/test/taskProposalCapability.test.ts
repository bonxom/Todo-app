import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";
import User from "../../models/User.js";
import { isTaskProposalsEnabled } from "../../config/A2UI/a2ui.js";

vi.mock("../../config/db.js", () => ({
  connectDB: vi.fn().mockResolvedValue({}),
}));

describe("Task Proposal Capability", () => {
  beforeEach(() => {
    vi.stubEnv("MONGO_URI", "mongodb://test.invalid/todo");
    vi.stubEnv("JWT_SECRET", "test-access-secret");
    vi.stubEnv("JWT_REFRESH_SECRET", "test-refresh-secret");
    vi.stubEnv("JWT_ACCESS_EXPIRES_IN", "15m");
    vi.stubEnv("JWT_REFRESH_EXPIRES_IN", "7d");
    vi.stubEnv("SALT_ROUNDS", "10");
    vi.spyOn(User, "findById").mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: new Types.ObjectId("507f1f77bcf86cd799439011"),
        role: "USER",
      }),
    } as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("evaluates isTaskProposalsEnabled from environment variable", () => {
    vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", undefined);
    expect(isTaskProposalsEnabled()).toBe(true);

    vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", "false");
    expect(isTaskProposalsEnabled()).toBe(false);

    vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", "true");
    expect(isTaskProposalsEnabled()).toBe(true);
  });

  it("handles GET /api/ai/conversations/capabilities before :conversationId", async () => {
    const { default: app } = await import("../../app.js");
    const jwt = await import("jsonwebtoken");
    const token = jwt.default.sign(
      { id: "507f1f77bcf86cd799439011", email: "user@example.com" },
      process.env.JWT_SECRET!,
    );

    vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", "true");
    const res = await request(app)
      .get("/api/ai/conversations/capabilities")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ taskProposals: true });
  });

  it("requires authentication for capabilities endpoint", async () => {
    const { default: app } = await import("../../app.js");
    const res = await request(app).get("/api/ai/conversations/capabilities");
    expect(res.status).toBe(401);
  });
});
