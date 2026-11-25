import { notificationService } from "@/shared/services/notificationService";
import type { PushPreferences } from "@/shared/types/notification";

export const DEFAULT_PUSH_PREFS: PushPreferences = {
  taskDeadlines: true,
  agentReplies: true,
};

export type BrowserPushStatus =
  | "loading"
  | "unsupported"
  | "unconfigured"
  | "denied"
  | "disabled"
  | "enabled";

export interface BrowserPushState {
  status: BrowserPushStatus;
  permission: NotificationPermission | "unsupported";
  serverSupported: boolean;
  subscribed: boolean;
  endpoint: string | null;
  prefs: PushPreferences;
}

export function isPushEnvironmentSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function urlBase64ToUint8Array(
  base64String: string,
): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

async function getActiveRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushEnvironmentSupported()) return null;
  const sw = navigator.serviceWorker;
  const existing =
    (await sw.getRegistration("/sw.js")) ?? (await sw.getRegistration());
  return existing ?? null;
}

export async function loadBrowserPushState(): Promise<BrowserPushState> {
  if (!isPushEnvironmentSupported()) {
    return {
      status: "unsupported",
      permission: "unsupported",
      serverSupported: false,
      subscribed: false,
      endpoint: null,
      prefs: DEFAULT_PUSH_PREFS,
    };
  }

  const permission = Notification.permission;
  const config = await notificationService.getPushConfig();

  const registration = await getActiveRegistration();
  const subscription = registration
    ? await registration.pushManager.getSubscription()
    : null;

  if (subscription) {
    const serverStatus = await notificationService.getCurrentPushSubscription(
      subscription.endpoint,
    );
    if (serverStatus.subscribed) {
      return {
        status: permission === "denied" ? "denied" : "enabled",
        permission,
        serverSupported: config.supported,
        subscribed: true,
        endpoint: subscription.endpoint,
        prefs: serverStatus.prefs ?? DEFAULT_PUSH_PREFS,
      };
    }
  }

  if (!config.supported || !config.publicKey) {
    return {
      status: "unconfigured",
      permission,
      serverSupported: false,
      subscribed: false,
      endpoint: null,
      prefs: DEFAULT_PUSH_PREFS,
    };
  }

  if (permission === "denied") {
    return {
      status: "denied",
      permission,
      serverSupported: true,
      subscribed: false,
      endpoint: null,
      prefs: DEFAULT_PUSH_PREFS,
    };
  }

  return {
    status: "disabled",
    permission,
    serverSupported: true,
    subscribed: false,
    endpoint: null,
    prefs: DEFAULT_PUSH_PREFS,
  };
}

export async function enableBrowserPush(
  prefs?: Partial<PushPreferences>,
): Promise<{ endpoint: string; prefs: PushPreferences }> {
  if (!isPushEnvironmentSupported()) {
    throw new Error("push_unsupported");
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("push_permission_denied");
  }

  const config = await notificationService.getPushConfig();
  if (!config.supported || !config.publicKey) {
    throw new Error("push_not_configured");
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  const readyRegistration =
    (await navigator.serviceWorker.ready) ?? registration;

  let subscription = await readyRegistration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await readyRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.publicKey),
    });
  }

  const serialized = subscription.toJSON();
  const p256dh = serialized.keys?.p256dh ?? "";
  const auth = serialized.keys?.auth ?? "";
  if (!p256dh || !auth) {
    throw new Error("push_keys_unavailable");
  }

  const saved = await notificationService.savePushSubscription({
    endpoint: subscription.endpoint,
    keys: { p256dh, auth },
    prefs,
    userAgent: navigator.userAgent,
  });

  return {
    endpoint: subscription.endpoint,
    prefs: saved.prefs ?? { ...DEFAULT_PUSH_PREFS, ...prefs },
  };
}

export async function updateBrowserPushPrefs(
  endpoint: string,
  prefs: Partial<PushPreferences>,
) {
  return notificationService.updatePushPreferences({ endpoint, prefs });
}

export async function disableBrowserPush(
  existingEndpoint?: string | null,
): Promise<{ endpoint: string | null; removed: boolean }> {
  const registration = await getActiveRegistration();
  const subscription = registration
    ? await registration.pushManager.getSubscription()
    : null;
  const endpoint = subscription?.endpoint ?? existingEndpoint ?? null;

  if (subscription) {
    await subscription.unsubscribe();
  }

  if (endpoint) {
    const result = await notificationService.deletePushSubscription(endpoint);
    return { endpoint, removed: result.removed };
  }

  return { endpoint: null, removed: false };
}
