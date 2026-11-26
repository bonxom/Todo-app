import { expect, test } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";

const SEED_METADATA_PATH = "/tmp/orbit_ui_action_live_seed.json";
const DEFAULT_TEST_CREDENTIAL = "Orbit-Local-Playwright-Only-Pass#2026";

interface SeedMetadata {
  baseUrl: string;
  dbName: string;
  users: {
    primary: { id: string; email: string };
    foreign: { id: string; email: string };
  };
  tasks: {
    inProgressId: string;
    pendingId: string;
    alreadyCompletedId: string;
    retryId: string;
    staleId: string;
    switchAId: string;
    switchBId: string;
    foreignId: string;
  };
  conversations: Record<
    string,
    {
      conversationId: string;
      turnId: string;
      surfaceId: string;
      bindings: Array<{
        id: string;
        key: string;
        name: string;
        taskId: string;
      }>;
    }
  >;
}

function loadSeed(): SeedMetadata | null {
  if (!existsSync(SEED_METADATA_PATH)) return null;
  try {
    return JSON.parse(
      readFileSync(SEED_METADATA_PATH, "utf-8"),
    ) as SeedMetadata;
  } catch {
    return null;
  }
}

const seed = loadSeed();

test.describe("Live Interactive A2UI Task Actions", () => {
  test.skip(
    !seed,
    "Live seed server metadata missing at /tmp/orbit_ui_action_live_seed.json",
  );

  let token = "";
  let primaryUser: Record<string, unknown> = {};

  test.beforeAll(async ({ request }) => {
    if (!seed) return;
    const credential =
      process.env.ORBIT_UI_ACTION_TEST_SECRET || DEFAULT_TEST_CREDENTIAL;
    const res = await request.post(`${seed.baseUrl}/api/auth/login`, {
      data: {
        email: seed.users.primary.email,
        password: credential,
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    token = body.accessToken || body.token;
    primaryUser = body.user;
    expect(token).toBeTruthy();
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      ({ authToken, userObj }) => {
        localStorage.clear();
        localStorage.setItem("token", authToken);
        localStorage.setItem("user", JSON.stringify(userObj));
        localStorage.setItem("orbit-theme", "light");
        localStorage.setItem("orbit.language", "en");
        localStorage.setItem("orbit.ui-version", "v1");
      },
      { authToken: token, userObj: primaryUser },
    );
  });

  async function openConversation(
    page: import("@playwright/test").Page,
    title: string,
  ) {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Open assistant" }).click();
    await page.getByRole("button", { name: "Chat history" }).click();
    await page.getByRole("button", { name: new RegExp(title) }).click();
  }

  test("completes task via keyboard against live backend, updates dashboard/stats/calendar, and keeps state on reload", async ({
    page,
    request,
  }) => {
    if (!seed) return;
    const statsBeforeRes = await request.get(`${seed.baseUrl}/api/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(statsBeforeRes.ok()).toBeTruthy();
    const statsBefore = await statsBeforeRes.json();

    await openConversation(page, "01 Complete Slide");
    const completeBtn = page.getByRole("button", {
      name: "Complete slide deck",
      exact: true,
    });
    await expect(completeBtn).toBeEnabled();
    await completeBtn.focus();
    await completeBtn.press("Enter");

    await expect(completeBtn).toBeDisabled();
    await expect(page.getByRole("status")).toContainText(/Completed/i);

    await expect
      .poll(async () => {
        const res = await request.get(
          `${seed.baseUrl}/api/tasks/${seed.tasks.inProgressId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const task = await res.json();
        return task.status;
      })
      .toBe("completed");

    await expect
      .poll(async () => {
        const res = await request.get(`${seed.baseUrl}/api/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const stats = await res.json();
        return stats.completedTasks;
      })
      .toBe((statsBefore.completedTasks ?? 0) + 1);

    // Verify completed badge or reload retains completed disabled button
    await page.reload();
    await page.getByRole("button", { name: "Open assistant" }).click();
    await page.getByRole("button", { name: "Chat history" }).click();
    await page.getByRole("button", { name: /01 Complete Slide/ }).click();
    await expect(
      page.getByRole("button", { name: "Complete slide deck", exact: true }),
    ).toBeDisabled();

    // Check Calendar page renders updated completed task cleanly
    await page.goto("/calendar");
    await expect(
      page
        .locator('[data-cal-task-name="true"]')
        .filter({ hasText: "Chuẩn bị slide demo" })
        .first(),
    ).toBeVisible();
  });

  test("disables pending and already-completed task buttons after real API reads", async ({
    page,
  }) => {
    await openConversation(page, "02 Pending & Done");
    const chat = page.getByRole("region", { name: "Assistant chat" });
    await expect(
      chat.getByRole("heading", { name: "Gửi biên bản họp" }),
    ).toBeVisible();
    await expect(
      chat.getByRole("heading", { name: "Dọn dẹp tài liệu" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Already done", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Unavailable pending", exact: true }),
    ).toBeDisabled();
  });

  test("renders comfortably on 390px narrow mobile viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openConversation(page, "03 Dropped Retry");
    const btn = page.getByRole("button", {
      name: "Complete build check",
      exact: true,
    });
    await expect(btn).toBeEnabled();
    const box = await btn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });

  test("handles dropped network response after real commit with exact idempotent retry", async ({
    page,
    request,
  }) => {
    if (!seed) return;
    const submittedPayloads: Array<{ requestId: string; actionId: string }> =
      [];
    let droppedOnce = false;

    await page.route("**/actions", async (route) => {
      const payload = route.request().postDataJSON() as {
        requestId: string;
        actionId: string;
      };
      submittedPayloads.push(payload);
      if (!droppedOnce) {
        droppedOnce = true;
        // Let the real backend execute and commit, then simulate dropped network response
        await route.fetch();
        return route.abort("failed");
      }
      return route.continue();
    });

    await openConversation(page, "03 Dropped Retry");
    const btn = page.getByRole("button", {
      name: "Complete build check",
      exact: true,
    });
    await expect(btn).toBeEnabled();
    await btn.click();

    const retryBtn = page.getByRole("button", { name: /Retry/i });
    await expect(retryBtn).toBeVisible();
    await expect(btn).toBeDisabled();

    await retryBtn.click();
    await expect(page.getByRole("status")).toContainText(/Completed/i);
    await expect(retryBtn).toHaveCount(0);
    expect(submittedPayloads).toHaveLength(2);
    expect(submittedPayloads[1]).toEqual(submittedPayloads[0]);

    const taskRes = await request.get(
      `${seed.baseUrl}/api/tasks/${seed.tasks.retryId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect((await taskRes.json()).status).toBe("completed");
  });

  test("handles stale task modified outside chat before click (422 + reload)", async ({
    page,
    request,
  }) => {
    if (!seed) return;
    await openConversation(page, "04 Stale Task");
    const btn = page.getByRole("button", {
      name: "Complete stale task",
      exact: true,
    });
    await expect(btn).toBeEnabled();

    // External state mutation before user clicks Button: give up task so completed transition fails (422)
    const giveUpRes = await request.put(
      `${seed.baseUrl}/api/tasks/${seed.tasks.staleId}/give-up`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    expect(giveUpRes.ok()).toBeTruthy();

    await btn.click();
    await expect(btn).toBeDisabled();
    await expect(page.getByRole("alert")).toBeVisible();
  });

  test("blocks forged foreign task action on both frontend read and backend execution", async ({
    page,
    request,
  }) => {
    if (!seed) return;
    await openConversation(page, "05 Foreign Target");
    const btn = page.getByRole("button", {
      name: "Attempt foreign complete",
      exact: true,
    });
    await expect(btn).toBeDisabled();

    const conv = seed.conversations.foreign;
    const directRes = await request.post(
      `${seed.baseUrl}/api/ai/conversations/${conv.conversationId}/turns/${conv.turnId}/surfaces/${conv.surfaceId}/actions`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          actionId: conv.bindings[0].id,
        },
      },
    );
    expect(directRes.status()).toBe(403);

    // Also verify foreign user accessing userA's conversation receives uniform 404
    const credential =
      process.env.ORBIT_UI_ACTION_TEST_SECRET || DEFAULT_TEST_CREDENTIAL;
    const foreignLoginRes = await request.post(
      `${seed.baseUrl}/api/auth/login`,
      {
        data: {
          email: seed.users.foreign.email,
          password: credential,
        },
      },
    );
    expect(foreignLoginRes.ok()).toBeTruthy();
    const foreignToken = (await foreignLoginRes.json()).accessToken;
    const ownedConv = seed.conversations.complete;
    const crossUserRes = await request.post(
      `${seed.baseUrl}/api/ai/conversations/${ownedConv.conversationId}/turns/${ownedConv.turnId}/surfaces/${ownedConv.surfaceId}/actions`,
      {
        headers: { Authorization: `Bearer ${foreignToken}` },
        data: {
          requestId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          actionId: ownedConv.bindings[0].id,
        },
      },
    );
    expect(crossUserRes.status()).toBe(404);
  });

  test("isolates conversation switch while action request is delayed", async ({
    page,
  }) => {
    await page.route("**/actions", async (route) => {
      await new Promise((r) => setTimeout(r, 350));
      await route.continue();
    });

    await openConversation(page, "06 Switch Source A");
    const btnA = page.getByRole("button", {
      name: "Complete task A",
      exact: true,
    });
    await expect(btnA).toBeEnabled();
    await btnA.click();

    await page.getByRole("button", { name: "Chat history" }).click();
    await page.getByRole("button", { name: /07 Switch Target B/ }).click();

    const btnB = page.getByRole("button", {
      name: "Complete task B",
      exact: true,
    });
    await expect(btnB).toBeEnabled();
  });
});
