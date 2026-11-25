import http from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { generateVAPIDKeys } from "web-push";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { webPushTransport } from "../../config/webPush.js";
import notificationRouter from "../../routes/notificationRoute.js";
import User from "../../models/User.js";
import { errorHandler, requestContext } from "../../error/index.js";
import { pushSubscriptionRepository } from "../../repositories/pushSubscriptionRepository.js";
import { pushDispatchService } from "../pushDispatchService.js";

function listen(server: http.Server): Promise<string> {
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as import("node:net").AddressInfo;
      resolve(`http://127.0.0.1:${address.port}`);
    }),
  );
}

describe("Web Push API & dispatch service", () => {
  const originalEnv = { ...process.env };
  const vapidKeys = generateVAPIDKeys();
  const aliceId = new mongoose.Types.ObjectId();

  let server: http.Server;
  let baseUrl = "";
  let authHeader = "";

  beforeAll(async () => {
    process.env.JWT_SECRET = "test-push-secret";

    const app = express();
    app.use(requestContext);
    app.use(express.json());
    app.use("/api/notifications", notificationRouter);
    app.use(errorHandler);

    server = http.createServer(app);
    baseUrl = await listen(server);

    const token = jwt.sign({ id: aliceId.toString() }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    authHeader = `Bearer ${token}`;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv, JWT_SECRET: "test-push-secret" };
  });

  afterAll(async () => {
    process.env = originalEnv;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  function mockAuthUser(userId = aliceId) {
    vi.spyOn(User, "findById").mockReturnValue({
      select: vi.fn().mockResolvedValue({ _id: userId, role: "user" }),
    } as never);
  }

  it("GET /push/config returns supported: false when VAPID keys are absent and publicKey when configured", async () => {
    mockAuthUser();
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;

    const unconfiguredRes = await fetch(
      `${baseUrl}/api/notifications/push/config`,
      {
        headers: { Authorization: authHeader },
      },
    );
    expect(unconfiguredRes.status).toBe(200);
    expect(await unconfiguredRes.json()).toEqual({
      supported: false,
      publicKey: null,
    });

    process.env.VAPID_PUBLIC_KEY = vapidKeys.publicKey;
    process.env.VAPID_PRIVATE_KEY = vapidKeys.privateKey;
    process.env.VAPID_SUBJECT = "mailto:test@orbit.local";

    const configuredRes = await fetch(
      `${baseUrl}/api/notifications/push/config`,
      {
        headers: { Authorization: authHeader },
      },
    );
    expect(configuredRes.status).toBe(200);
    expect(await configuredRes.json()).toEqual({
      supported: true,
      publicKey: vapidKeys.publicKey,
    });
  });

  it("rejects non-https non-loopback endpoints on POST /push/subscriptions", async () => {
    mockAuthUser();
    process.env.VAPID_PUBLIC_KEY = vapidKeys.publicKey;
    process.env.VAPID_PRIVATE_KEY = vapidKeys.privateKey;

    const res = await fetch(`${baseUrl}/api/notifications/push/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        endpoint: "http://evil.example.com/push/123",
        keys: { p256dh: "p256dh-key", auth: "auth-key" },
      }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 503 PUSH_NOT_CONFIGURED when subscribing while VAPID is unset", async () => {
    mockAuthUser();
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;

    const res = await fetch(`${baseUrl}/api/notifications/push/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        endpoint: "https://fcm.googleapis.com/fcm/send/abc",
        keys: { p256dh: "p256dh-key", auth: "auth-key" },
      }),
    });

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe("NOTIFICATION_0002");
  });

  it("scopes GET /current, POST, PATCH, and DELETE strictly to req.user._id", async () => {
    mockAuthUser();
    process.env.VAPID_PUBLIC_KEY = vapidKeys.publicKey;
    process.env.VAPID_PRIVATE_KEY = vapidKeys.privateKey;

    const findSpy = vi
      .spyOn(pushSubscriptionRepository, "findByUserAndEndpoint")
      .mockResolvedValueOnce(null);

    const currentEmpty = await fetch(
      `${baseUrl}/api/notifications/push/subscriptions/current?endpoint=${encodeURIComponent(
        "https://fcm.googleapis.com/fcm/send/abc",
      )}`,
      { headers: { Authorization: authHeader } },
    );
    expect(currentEmpty.status).toBe(200);
    expect(await currentEmpty.json()).toEqual({
      subscribed: false,
      prefs: null,
    });
    expect(findSpy).toHaveBeenCalledWith(
      aliceId.toString(),
      "https://fcm.googleapis.com/fcm/send/abc",
    );

    const upsertSpy = vi
      .spyOn(pushSubscriptionRepository, "upsert")
      .mockResolvedValueOnce({
        subscribed: true,
        prefs: { taskDeadlines: true, agentReplies: false },
      });

    const createRes = await fetch(
      `${baseUrl}/api/notifications/push/subscriptions`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: "https://fcm.googleapis.com/fcm/send/abc",
          keys: { p256dh: "p256dh-key", auth: "auth-key" },
          prefs: { taskDeadlines: true, agentReplies: false },
        }),
      },
    );
    expect(createRes.status).toBe(200);
    expect(await createRes.json()).toEqual({
      subscribed: true,
      prefs: { taskDeadlines: true, agentReplies: false },
    });
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: aliceId.toString(),
        endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      }),
    );

    const updateMissingSpy = vi
      .spyOn(pushSubscriptionRepository, "updatePrefs")
      .mockResolvedValueOnce(null);

    const patchMissingRes = await fetch(
      `${baseUrl}/api/notifications/push/subscriptions`,
      {
        method: "PATCH",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: "https://fcm.googleapis.com/fcm/send/missing",
          prefs: { agentReplies: true },
        }),
      },
    );
    expect(patchMissingRes.status).toBe(404);
    expect((await patchMissingRes.json()).code).toBe("NOTIFICATION_0003");
    expect(updateMissingSpy).toHaveBeenCalledWith(
      aliceId.toString(),
      "https://fcm.googleapis.com/fcm/send/missing",
      { agentReplies: true },
    );

    const deleteSpy = vi
      .spyOn(pushSubscriptionRepository, "deleteByUserAndEndpoint")
      .mockResolvedValueOnce(true);

    const delRes = await fetch(
      `${baseUrl}/api/notifications/push/subscriptions`,
      {
        method: "DELETE",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: "https://fcm.googleapis.com/fcm/send/abc",
        }),
      },
    );
    expect(delRes.status).toBe(200);
    expect(await delRes.json()).toEqual({ removed: true });
    expect(deleteSpy).toHaveBeenCalledWith(
      aliceId.toString(),
      "https://fcm.googleapis.com/fcm/send/abc",
    );
  });

  it("dispatches by category and prunes 404/410 stale subscriptions without throwing", async () => {
    process.env.VAPID_PUBLIC_KEY = vapidKeys.publicKey;
    process.env.VAPID_PRIVATE_KEY = vapidKeys.privateKey;
    process.env.VAPID_SUBJECT = "mailto:test@orbit.local";

    vi.spyOn(
      pushSubscriptionRepository,
      "findEnabledForCategory",
    ).mockResolvedValueOnce([
      {
        endpoint: "https://push.example/ok",
        keys: { p256dh: "k1", auth: "a1" },
        prefs: { taskDeadlines: true, agentReplies: true },
      },
      {
        endpoint: "https://push.example/gone",
        keys: { p256dh: "k2", auth: "a2" },
        prefs: { taskDeadlines: true, agentReplies: true },
      },
      {
        endpoint: "https://push.example/transient",
        keys: { p256dh: "k3", auth: "a3" },
        prefs: { taskDeadlines: true, agentReplies: true },
      },
    ]);

    const sendMock = vi
      .spyOn(webPushTransport, "sendNotification")
      .mockResolvedValueOnce({ statusCode: 201, headers: {}, body: "" })
      .mockRejectedValueOnce(
        Object.assign(new Error("Gone"), { statusCode: 410 }),
      )
      .mockRejectedValueOnce(
        Object.assign(new Error("Gateway timeout"), { statusCode: 504 }),
      );

    const deleteMock = vi
      .spyOn(pushSubscriptionRepository, "deleteByUserAndEndpoint")
      .mockResolvedValue(true);
    const touchMock = vi
      .spyOn(pushSubscriptionRepository, "touchLastUsed")
      .mockResolvedValue(undefined);
    const warnMock = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await pushDispatchService.sendToUser(
      aliceId.toString(),
      "taskDeadlines",
      {
        kind: "due_soon",
        title: "Task due soon",
        body: "Finish report",
        url: "/v2/dashboard?taskId=1",
        tag: "orbit-deadline-1",
      },
    );

    expect(result).toEqual({ sent: 1, removed: 1, failed: 1 });
    expect(sendMock).toHaveBeenCalledTimes(3);
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledWith(
      aliceId.toString(),
      "https://push.example/gone",
    );
    expect(touchMock).toHaveBeenCalledWith(aliceId.toString(), [
      "https://push.example/ok",
    ]);
    expect(warnMock).toHaveBeenCalled();
  });

  it("returns no-op result cleanly when VAPID is unconfigured", async () => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;

    const findMock = vi.spyOn(
      pushSubscriptionRepository,
      "findEnabledForCategory",
    );
    const result = await pushDispatchService.notifyAgentReply({
      userId: aliceId.toString(),
      conversationId: "conv-1",
      conversationTitle: "Sprint planning",
    });

    expect(result).toEqual({ sent: 0, removed: 0, failed: 0 });
    expect(findMock).not.toHaveBeenCalled();
  });
});
