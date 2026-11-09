import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestContext } from "../error/requestContext.js";
import { errorHandler } from "../error/index.js";
const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  unreadCount: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
}));
vi.mock("../repositories/notificationRepository.js", () => ({
  notificationRepository: mocks,
}));
vi.mock("../middlewares/auth.js", () => ({
  protect: (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (!req.headers["x-user"]) {
      res.sendStatus(401);
      return;
    }
    req.user = {
      _id: req.headers["x-user"],
      role: req.headers["x-role"] ?? "USER",
    } as unknown as NonNullable<express.Request["user"]>;
    next();
  },
}));
import router from "../routes/notificationRoute.js";
const app = express();
app.use(requestContext);
app.use(express.json());
let insertedDuringReadiness: Date;
app.use(async (req, _res, next) => {
  if (req.headers["x-delay-readiness"]) {
    await new Promise((resolve) => setTimeout(resolve, 20));
    insertedDuringReadiness = new Date();
  }
  next();
});
app.use("/api/notifications", router);
app.use(errorHandler);
const id = "507f1f77bcf86cd799439011";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockResolvedValue({ data: [], pageInfo: {} });
  mocks.unreadCount.mockResolvedValue(2);
  mocks.markRead.mockResolvedValue(null);
  mocks.markAllRead.mockResolvedValue(1);
});
describe("notification routes", () => {
  it("requires authentication", async () => {
    expect((await request(app).get("/api/notifications")).status).toBe(401);
  });
  it.each(["?pageSize=101", "?pageNo=0", "?pageNo=1.5", "?filter=other"])(
    "rejects query %s",
    async (q) => {
      expect(
        (await request(app).get(`/api/notifications${q}`).set("x-user", id))
          .status,
      ).toBe(400);
    },
  );
  it("scopes list and count to authenticated user, including admin", async () => {
    expect(
      (
        await request(app)
          .get("/api/notifications")
          .set("x-user", id)
          .set("x-role", "ADMIN")
      ).status,
    ).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith(id, {
      pageNo: 1,
      pageSize: 20,
      filter: "all",
    });
    const response = await request(app)
      .get("/api/notifications/unread-count")
      .set("x-user", id);
    expect(response.body).toEqual({ count: 2 });
    expect(mocks.unreadCount).toHaveBeenCalledWith(id);
  });
  it("rejects bad IDs and recipient spoofing", async () => {
    expect(
      (
        await request(app)
          .patch("/api/notifications/bad/read")
          .set("x-user", id)
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .patch("/api/notifications/read-all")
          .set("x-user", id)
          .send({ recipientId: id })
      ).status,
    ).toBe(400);
  });
  it("returns 404 for missing or foreign notification", async () => {
    expect(
      (
        await request(app)
          .patch(`/api/notifications/${id}/read`)
          .set("x-user", id)
      ).status,
    ).toBe(404);
    expect(mocks.markRead).toHaveBeenCalledWith(id, id, expect.any(Date));
  });
  it("marks only caller's notifications using cutoff", async () => {
    const result = await request(app)
      .patch("/api/notifications/read-all")
      .set("x-user", id);
    expect(result.body).toEqual({ modifiedCount: 1 });
    expect(mocks.markAllRead).toHaveBeenCalledWith(id, expect.any(Date));
  });
});

it("excludes notifications created while readiness is pending", async () => {
  mocks.markAllRead.mockImplementation(async (_id: string, cutoff: Date) =>
    cutoff < insertedDuringReadiness ? 0 : 1,
  );
  const response = await request(app)
    .patch("/api/notifications/read-all")
    .set("x-user", id)
    .set("x-delay-readiness", "true");
  expect(response.body).toEqual({ modifiedCount: 0 });
});
