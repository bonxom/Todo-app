import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { notificationService } from "@/shared/services/notificationService";
import {
  disableBrowserPush,
  enableBrowserPush,
  loadBrowserPushState,
  updateBrowserPushPrefs,
  urlBase64ToUint8Array,
} from "../lib/pushSubscription";

describe("pushSubscription helper", () => {
  const originalNavigator = globalThis.navigator;
  const originalNotification = globalThis.Notification;
  const originalPushManager = (globalThis as { PushManager?: unknown })
    .PushManager;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function setupBrowserPushMocks(options: {
    permission?: NotificationPermission;
    requestPermissionResult?: NotificationPermission;
    existingSubscription?: {
      endpoint: string;
      toJSON: () => {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      unsubscribe: ReturnType<typeof vi.fn>;
    } | null;
    newSubscription?: {
      endpoint: string;
      toJSON: () => {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      unsubscribe: ReturnType<typeof vi.fn>;
    };
  }) {
    const getSubscription = vi
      .fn()
      .mockResolvedValue(options.existingSubscription ?? null);
    const subscribe = vi.fn().mockResolvedValue(
      options.newSubscription ?? {
        endpoint: "https://push.example/sub-1",
        toJSON: () => ({
          endpoint: "https://push.example/sub-1",
          keys: { p256dh: "p256dh-val", auth: "auth-val" },
        }),
        unsubscribe: vi.fn().mockResolvedValue(true),
      },
    );

    const registration = {
      pushManager: {
        getSubscription,
        subscribe,
      },
    };

    Object.defineProperty(globalThis, "PushManager", {
      value: function PushManager() {},
      configurable: true,
    });

    Object.defineProperty(globalThis, "Notification", {
      value: {
        permission: options.permission ?? "default",
        requestPermission: vi
          .fn()
          .mockResolvedValue(options.requestPermissionResult ?? "granted"),
      },
      configurable: true,
    });

    Object.defineProperty(globalThis, "navigator", {
      value: {
        userAgent: "OrbitTestBrowser/1.0",
        serviceWorker: {
          register: vi.fn().mockResolvedValue(registration),
          getRegistration: vi.fn().mockResolvedValue(registration),
          ready: Promise.resolve(registration),
        },
      },
      configurable: true,
    });

    return { registration, getSubscription, subscribe };
  }

  afterEach(() => {
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      configurable: true,
    });
    if (originalNotification === undefined) {
      delete (globalThis as { Notification?: unknown }).Notification;
    } else {
      Object.defineProperty(globalThis, "Notification", {
        value: originalNotification,
        configurable: true,
      });
    }
    if (originalPushManager === undefined) {
      delete (globalThis as { PushManager?: unknown }).PushManager;
    } else {
      Object.defineProperty(globalThis, "PushManager", {
        value: originalPushManager,
        configurable: true,
      });
    }
  });

  it("decodes URL-safe base64 VAPID keys into Uint8Array", () => {
    // "orbit" in base64url is "b3JiaXQ"
    const bytes = urlBase64ToUint8Array("b3JiaXQ");
    expect(Array.from(bytes)).toEqual([111, 114, 98, 105, 116]);
  });

  it("reports unconfigured when server returns supported: false", async () => {
    setupBrowserPushMocks({ permission: "default" });
    vi.spyOn(notificationService, "getPushConfig").mockResolvedValueOnce({
      supported: false,
      publicKey: null,
    });

    const state = await loadBrowserPushState();
    expect(state.status).toBe("unconfigured");
    expect(state.serverSupported).toBe(false);
    expect(state.subscribed).toBe(false);
  });

  it("loads enabled state and category prefs for an existing server-backed subscription", async () => {
    setupBrowserPushMocks({
      permission: "granted",
      existingSubscription: {
        endpoint: "https://push.example/existing",
        toJSON: () => ({
          endpoint: "https://push.example/existing",
          keys: { p256dh: "k", auth: "a" },
        }),
        unsubscribe: vi.fn().mockResolvedValue(true),
      },
    });
    vi.spyOn(notificationService, "getPushConfig").mockResolvedValueOnce({
      supported: true,
      publicKey: "b3JiaXQ",
    });
    vi.spyOn(
      notificationService,
      "getCurrentPushSubscription",
    ).mockResolvedValueOnce({
      subscribed: true,
      prefs: { taskDeadlines: true, agentReplies: false },
    });

    const state = await loadBrowserPushState();
    expect(state).toMatchObject({
      status: "enabled",
      subscribed: true,
      endpoint: "https://push.example/existing",
      prefs: { taskDeadlines: true, agentReplies: false },
    });
  });

  it("requests permission, subscribes to PushManager, and saves subscription on server", async () => {
    const { subscribe } = setupBrowserPushMocks({
      permission: "default",
      requestPermissionResult: "granted",
    });
    vi.spyOn(notificationService, "getPushConfig").mockResolvedValueOnce({
      supported: true,
      publicKey: "b3JiaXQ",
    });
    const saveSpy = vi
      .spyOn(notificationService, "savePushSubscription")
      .mockResolvedValueOnce({
        subscribed: true,
        prefs: { taskDeadlines: true, agentReplies: true },
      });

    const res = await enableBrowserPush();
    expect(subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(Uint8Array),
    });
    expect(saveSpy).toHaveBeenCalledWith({
      endpoint: "https://push.example/sub-1",
      keys: { p256dh: "p256dh-val", auth: "auth-val" },
      prefs: undefined,
      userAgent: "OrbitTestBrowser/1.0",
    });
    expect(res).toEqual({
      endpoint: "https://push.example/sub-1",
      prefs: { taskDeadlines: true, agentReplies: true },
    });
  });

  it("throws push_permission_denied when user denies permission prompt", async () => {
    setupBrowserPushMocks({
      permission: "default",
      requestPermissionResult: "denied",
    });

    await expect(enableBrowserPush()).rejects.toThrow("push_permission_denied");
  });

  it("updates category prefs and unsubscribes + deletes server subscription", async () => {
    const unsubscribe = vi.fn().mockResolvedValue(true);
    setupBrowserPushMocks({
      permission: "granted",
      existingSubscription: {
        endpoint: "https://push.example/existing",
        toJSON: () => ({
          endpoint: "https://push.example/existing",
          keys: { p256dh: "k", auth: "a" },
        }),
        unsubscribe,
      },
    });
    const updateSpy = vi
      .spyOn(notificationService, "updatePushPreferences")
      .mockResolvedValueOnce({
        subscribed: true,
        prefs: { taskDeadlines: false, agentReplies: true },
      });
    const deleteSpy = vi
      .spyOn(notificationService, "deletePushSubscription")
      .mockResolvedValueOnce({ removed: true });

    const updated = await updateBrowserPushPrefs(
      "https://push.example/existing",
      { taskDeadlines: false },
    );
    expect(updateSpy).toHaveBeenCalledWith({
      endpoint: "https://push.example/existing",
      prefs: { taskDeadlines: false },
    });
    expect(updated.prefs?.taskDeadlines).toBe(false);

    const disabled = await disableBrowserPush("https://push.example/existing");
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(deleteSpy).toHaveBeenCalledWith("https://push.example/existing");
    expect(disabled).toEqual({
      endpoint: "https://push.example/existing",
      removed: true,
    });
  });
});
