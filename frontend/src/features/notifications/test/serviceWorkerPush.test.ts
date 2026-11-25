import { describe, expect, it, vi } from "vitest";
import swSource from "../../../../public/sw.js?raw";

interface MockWindowClient {
  id: string;
  url: string;
  focused: boolean;
  postMessage: ReturnType<typeof vi.fn>;
  focus: ReturnType<typeof vi.fn>;
  navigate: ReturnType<typeof vi.fn>;
}

function loadServiceWorkerHarness(initialClients: MockWindowClient[] = []) {
  const listeners = new Map<string, (event: unknown) => void>();
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const matchAll = vi.fn().mockResolvedValue(initialClients);
  const openWindow = vi.fn().mockResolvedValue(null);
  const skipWaiting = vi.fn().mockResolvedValue(undefined);
  const claim = vi.fn().mockResolvedValue(undefined);

  const selfScope = {
    location: { origin: "https://orbit-todo.click" },
    skipWaiting,
    registration: { showNotification },
    clients: {
      matchAll,
      openWindow,
      claim,
    },
    addEventListener(type: string, handler: (event: unknown) => void) {
      listeners.set(type, handler);
    },
  };

  const evaluateSw = new Function("self", "URL", "Promise", swSource);
  evaluateSw(selfScope, URL, Promise);

  return {
    listeners,
    showNotification,
    matchAll,
    openWindow,
    skipWaiting,
    claim,
  };
}

function makeClient(
  overrides: Partial<MockWindowClient> = {},
): MockWindowClient {
  return {
    id: "client-1",
    url: "https://orbit-todo.click/v2",
    focused: false,
    postMessage: vi.fn(),
    focus: vi.fn().mockResolvedValue(undefined),
    navigate: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("public/sw.js Web Push handler", () => {
  it("suppresses OS notification when at least one Orbit window is focused while notifying open windows", async () => {
    const focusedClient = makeClient({ id: "focused", focused: true });
    const bgClient = makeClient({ id: "bg", focused: false });
    const { listeners, showNotification, matchAll } = loadServiceWorkerHarness([
      focusedClient,
      bgClient,
    ]);

    const waitPromises: Promise<unknown>[] = [];
    listeners.get("push")?.({
      data: {
        json: () => ({
          kind: "due_soon",
          title: "Task due soon",
          body: "Prepare slides",
          url: "/v2/tasks",
          tag: "orbit-deadline-1",
        }),
      },
      waitUntil: (promise: Promise<unknown>) => waitPromises.push(promise),
    });

    await Promise.all(waitPromises);

    expect(matchAll).toHaveBeenCalledWith({
      type: "window",
      includeUncontrolled: true,
    });
    expect(focusedClient.postMessage).toHaveBeenCalledWith({
      type: "ORBIT_PUSH_RECEIVED",
      kind: "due_soon",
    });
    expect(bgClient.postMessage).toHaveBeenCalledWith({
      type: "ORBIT_PUSH_RECEIVED",
      kind: "due_soon",
    });
    expect(showNotification).not.toHaveBeenCalled();
  });

  it("displays OS notification when no window client is focused", async () => {
    const blurredClient = makeClient({ focused: false });
    const { listeners, showNotification } = loadServiceWorkerHarness([
      blurredClient,
    ]);

    const waitPromises: Promise<unknown>[] = [];
    listeners.get("push")?.({
      data: {
        json: () => ({
          kind: "agent_reply",
          title: "Orbit Agent replied",
          body: 'Response ready in "Sprint"',
          url: "/v2/agents/conv-9",
          tag: "orbit-agent-conv-9",
        }),
      },
      waitUntil: (promise: Promise<unknown>) => waitPromises.push(promise),
    });

    await Promise.all(waitPromises);

    expect(blurredClient.postMessage).toHaveBeenCalledWith({
      type: "ORBIT_PUSH_RECEIVED",
      kind: "agent_reply",
    });
    expect(showNotification).toHaveBeenCalledWith("Orbit Agent replied", {
      body: 'Response ready in "Sprint"',
      tag: "orbit-agent-conv-9",
      icon: "/icons/orbit-192.png",
      badge: "/icons/orbit-192.png",
      data: {
        url: "/v2/agents/conv-9",
        kind: "agent_reply",
      },
    });
  });

  it("navigates and focuses an existing Orbit window on notificationclick", async () => {
    const existingClient = makeClient({
      url: "https://orbit-todo.click/v2/tasks",
      focused: false,
    });
    const { listeners, openWindow } = loadServiceWorkerHarness([
      existingClient,
    ]);

    const close = vi.fn();
    const waitPromises: Promise<unknown>[] = [];
    listeners.get("notificationclick")?.({
      notification: {
        close,
        data: { url: "/v2/agents/conv-9" },
      },
      waitUntil: (promise: Promise<unknown>) => waitPromises.push(promise),
    });

    await Promise.all(waitPromises);

    expect(close).toHaveBeenCalledTimes(1);
    expect(existingClient.navigate).toHaveBeenCalledWith(
      "https://orbit-todo.click/v2/agents/conv-9",
    );
    expect(existingClient.focus).toHaveBeenCalledTimes(1);
    expect(openWindow).not.toHaveBeenCalled();
  });

  it("opens a new window on notificationclick when no Orbit client exists", async () => {
    const { listeners, openWindow } = loadServiceWorkerHarness([]);

    const close = vi.fn();
    const waitPromises: Promise<unknown>[] = [];
    listeners.get("notificationclick")?.({
      notification: {
        close,
        data: { url: "/v2/tasks" },
      },
      waitUntil: (promise: Promise<unknown>) => waitPromises.push(promise),
    });

    await Promise.all(waitPromises);

    expect(close).toHaveBeenCalledTimes(1);
    expect(openWindow).toHaveBeenCalledWith(
      "https://orbit-todo.click/v2/tasks",
    );
  });
});
