import { expect, test, type Page, type Route } from "@playwright/test";

const SCREENSHOT_DIR = "/tmp/v2-push-notifications";
const TEST_VAPID_PUBLIC_KEY =
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8";

interface PushFixtureState {
  supported: boolean;
  subscribed: boolean;
  endpoint: string | null;
  prefs: { taskDeadlines: boolean; agentReplies: boolean };
  postCalls: unknown[];
  patchCalls: unknown[];
  deleteCalls: unknown[];
}

async function setupPushSettingsFixture(
  page: Page,
  options: {
    version?: "v1" | "v2";
    theme?: "light" | "dark";
    language?: "en" | "vi";
    permission?: NotificationPermission;
    serverSupported?: boolean;
  } = {},
) {
  const {
    version = "v2",
    theme = "light",
    language = "en",
    permission = "default",
    serverSupported = true,
  } = options;

  const state: PushFixtureState = {
    supported: serverSupported,
    subscribed: false,
    endpoint: null,
    prefs: { taskDeadlines: true, agentReplies: true },
    postCalls: [],
    patchCalls: [],
    deleteCalls: [],
  };

  const user = {
    _id: "507f1f77bcf86cd799439000",
    id: "507f1f77bcf86cd799439000",
    name: "Minh Nguyen",
    email: "minh@orbit.test",
    role: "USER",
    createdAt: "2026-01-10T00:00:00.000Z",
    updatedAt: "2026-11-25T10:00:00.000Z",
  };

  await page.addInitScript(
    ({ usr, ver, th, lang, initialPermission }) => {
      localStorage.setItem("token", "valid-push-e2e-token");
      localStorage.setItem("user", JSON.stringify(usr));
      localStorage.setItem("orbit.ui-version", ver);
      localStorage.setItem("orbit-theme", th);
      localStorage.setItem("orbit.language", lang);

      let currentSubscription: {
        endpoint: string;
        toJSON: () => {
          endpoint: string;
          keys: { p256dh: string; auth: string };
        };
        unsubscribe: () => Promise<boolean>;
      } | null = null;

      let currentPermission: NotificationPermission = initialPermission;

      const registration = {
        pushManager: {
          getSubscription: async () => currentSubscription,
          subscribe: async () => {
            currentSubscription = {
              endpoint: "https://fcm.googleapis.com/fcm/send/orbit-e2e-sub",
              toJSON: () => ({
                endpoint: "https://fcm.googleapis.com/fcm/send/orbit-e2e-sub",
                keys: { p256dh: "e2e-p256dh-key", auth: "e2e-auth-key" },
              }),
              unsubscribe: async () => {
                currentSubscription = null;
                return true;
              },
            };
            return currentSubscription;
          },
        },
      };

      const defineSafe = (
        target: object,
        key: PropertyKey,
        descriptor: PropertyDescriptor,
      ) => {
        try {
          Object.defineProperty(target, key, descriptor);
          return true;
        } catch {
          return false;
        }
      };

      defineSafe(window, "PushManager", {
        value: function PushManager() {},
        configurable: true,
      });

      defineSafe(window, "Notification", {
        value: {
          get permission() {
            return currentPermission;
          },
          requestPermission: async () => {
            if (currentPermission !== "denied") {
              currentPermission = "granted";
            }
            return currentPermission;
          },
        },
        configurable: true,
      });

      const swMock = {
        register: async () => registration,
        getRegistration: async () => registration,
        ready: Promise.resolve(registration),
        addEventListener: () => {},
        removeEventListener: () => {},
      };
      if (
        !defineSafe(navigator, "serviceWorker", {
          value: swMock,
          configurable: true,
        })
      ) {
        defineSafe(Navigator.prototype, "serviceWorker", {
          get: () => swMock,
          configurable: true,
        });
      }
    },
    {
      usr: user,
      ver: version,
      th: theme,
      lang: language,
      initialPermission: permission,
    },
  );

  await page.route("**/api/**", async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const pathname = url.pathname;
    const method = req.method();
    if (!pathname.startsWith("/api/")) {
      return route.continue();
    }

    if (pathname === "/api/auth/me" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(user),
      });
    }

    if (pathname === "/api/notifications/unread-count" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ count: 2 }),
      });
    }

    if (pathname === "/api/notifications/push/config" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          supported: state.supported,
          publicKey: state.supported ? TEST_VAPID_PUBLIC_KEY : null,
        }),
      });
    }

    if (
      pathname === "/api/notifications/push/subscriptions/current" &&
      method === "GET"
    ) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          subscribed: state.subscribed,
          prefs: state.subscribed ? state.prefs : null,
        }),
      });
    }

    if (
      pathname === "/api/notifications/push/subscriptions" &&
      method === "POST"
    ) {
      const body = req.postDataJSON() as {
        endpoint: string;
        prefs?: Partial<typeof state.prefs>;
      };
      state.postCalls.push(body);
      state.subscribed = true;
      state.endpoint = body.endpoint;
      state.prefs = {
        taskDeadlines: body.prefs?.taskDeadlines ?? true,
        agentReplies: body.prefs?.agentReplies ?? true,
      };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ subscribed: true, prefs: state.prefs }),
      });
    }

    if (
      pathname === "/api/notifications/push/subscriptions" &&
      method === "PATCH"
    ) {
      const body = req.postDataJSON() as {
        endpoint: string;
        prefs: Partial<typeof state.prefs>;
      };
      state.patchCalls.push(body);
      state.prefs = { ...state.prefs, ...body.prefs };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ subscribed: true, prefs: state.prefs }),
      });
    }

    if (
      pathname === "/api/notifications/push/subscriptions" &&
      method === "DELETE"
    ) {
      const body = req.postDataJSON() as { endpoint: string };
      state.deleteCalls.push(body);
      state.subscribed = false;
      state.endpoint = null;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ removed: true }),
      });
    }

    if (pathname === "/api/categories") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }

    if (pathname === "/api/projects") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }

    if (pathname === "/api/tasks") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [],
          pageInfo: { pageNo: 1, pageSize: 10, totalCount: 0, totalPage: 0 },
        }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });

  return state;
}

test.describe("Web Push Notifications & PWA Manifest", () => {
  test("serves valid PWA manifest, PNG icons, and service worker script", async ({
    request,
    page,
  }) => {
    const manifestRes = await request.get("/manifest.webmanifest");
    expect(manifestRes.status()).toBe(200);
    const manifest = await manifestRes.json();
    expect(manifest.name).toBe("Orbit");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: "/icons/orbit-192.png",
          sizes: "192x192",
        }),
        expect.objectContaining({
          src: "/icons/orbit-512.png",
          sizes: "512x512",
        }),
      ]),
    );

    const [icon192, icon512, swRes] = await Promise.all([
      request.get("/icons/orbit-192.png"),
      request.get("/icons/orbit-512.png"),
      request.get("/sw.js"),
    ]);
    expect(icon192.status()).toBe(200);
    expect(icon512.status()).toBe(200);
    expect(swRes.status()).toBe(200);
    expect(await swRes.text()).toContain("ORBIT_PUSH_RECEIVED");

    await setupPushSettingsFixture(page, { version: "v2", theme: "light" });
    await page.goto("/v2/settings?section=notifications");
    const manifestHref = await page
      .locator('link[rel="manifest"]')
      .getAttribute("href");
    expect(manifestHref).toBe("/manifest.webmanifest");
  });

  test("toggles push subscription and categories in V2 desktop light mode", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const state = await setupPushSettingsFixture(page, {
      version: "v2",
      theme: "light",
      language: "en",
    });

    await page.goto("/v2/settings?section=notifications");

    const section = page.getByTestId("settings-push-section");
    await expect(section).toBeVisible();
    await expect(page.getByTestId("settings-push-status-badge")).toHaveText(
      "Disabled",
    );

    const masterSwitch = page.locator("#settings-notif-push-master");
    await expect(masterSwitch).toBeEnabled();
    const box = await masterSwitch.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);

    await masterSwitch.click();
    await expect(page.getByTestId("settings-push-status-badge")).toHaveText(
      "Enabled",
    );
    expect(state.postCalls).toHaveLength(1);

    const deadlineSwitch = page.locator("#settings-notif-push-deadlines");
    await expect(deadlineSwitch).toBeEnabled();
    await deadlineSwitch.click();
    await expect(deadlineSwitch).toHaveAttribute("aria-checked", "false");
    await expect(deadlineSwitch).toBeEnabled();
    expect(state.patchCalls).toEqual([
      {
        endpoint: "https://fcm.googleapis.com/fcm/send/orbit-e2e-sub",
        prefs: { taskDeadlines: false },
      },
    ]);

    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/v2-desktop-light.png`,
      fullPage: false,
    });

    await masterSwitch.click();
    await expect(page.getByTestId("settings-push-status-badge")).toHaveText(
      "Disabled",
    );
    expect(state.deleteCalls).toEqual([
      { endpoint: "https://fcm.googleapis.com/fcm/send/orbit-e2e-sub" },
    ]);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
  });

  test("renders blocked status in Vietnamese mobile dark V2 and enabled controls in V1", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setupPushSettingsFixture(page, {
      version: "v2",
      theme: "dark",
      language: "vi",
      permission: "denied",
    });

    await page.goto("/v2/settings?section=notifications");
    const mobilePushSection = page.getByTestId("settings-push-section");
    await expect(mobilePushSection).toBeVisible();
    await mobilePushSection.scrollIntoViewIfNeeded();
    await expect(page.getByTestId("settings-push-status-badge")).toHaveText(
      "Đang chặn",
    );
    await expect(page.locator("#settings-notif-push-master")).toBeDisabled();
    const mobileOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(mobileOverflow).toBe(false);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/v2-mobile-dark-vi.png`,
      fullPage: false,
    });

    // V1 Settings parity check on desktop
    const v1Page = await page.context().newPage();
    await v1Page.setViewportSize({ width: 1280, height: 800 });
    await setupPushSettingsFixture(v1Page, {
      version: "v1",
      theme: "light",
      language: "en",
    });
    await v1Page.goto("/settings?section=notifications");
    const v1Section = v1Page.getByTestId("settings-push-section");
    await expect(v1Section).toBeVisible();
    await expect(v1Page.locator("#settings-notif-push-master")).toBeEnabled();
    await v1Section.scrollIntoViewIfNeeded();
    await v1Page.screenshot({
      path: `${SCREENSHOT_DIR}/v1-desktop-light.png`,
      fullPage: false,
    });
    await v1Page.close();
  });
});
