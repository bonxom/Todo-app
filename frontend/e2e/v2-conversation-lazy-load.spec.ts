import { test, expect, type Page } from "@playwright/test";
import { agentWorkspaceFixture } from "./agent-workspace.fixture";

function buildConversations(count: number) {
  const base = Date.UTC(2026, 10, 25, 12, 0, 0);
  return Array.from({ length: count }, (_, index) => {
    const label = String(index + 1).padStart(2, "0");
    return {
      id: index === 0 ? "conv-e2e-1" : `conv-page-${label}`,
      title: `Conversation ${label} Planning`,
      createdAt: new Date(base - index * 3600_000).toISOString(),
      updatedAt: new Date(base - index * 3600_000).toISOString(),
      projectId: null,
    };
  });
}

async function setupPaginatedConversations(page: Page, total = 35) {
  const items = buildConversations(total);
  const requests: Array<{
    cursor: string | null;
    limit: number;
    search: string;
  }> = [];

  await page.route("**/api/ai/conversations*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (
      request.method() !== "GET" ||
      url.pathname !== "/api/ai/conversations"
    ) {
      return route.fallback();
    }

    const cursor = url.searchParams.get("cursor");
    const limitParam = Number(url.searchParams.get("limit") || "20");
    const limit =
      Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 20;
    const search = (url.searchParams.get("search") || "").trim();

    requests.push({ cursor, limit, search });

    const filtered = search
      ? items.filter((item) =>
          item.title.toLowerCase().includes(search.toLowerCase()),
        )
      : items;
    const startIndex = cursor ? Number.parseInt(cursor, 10) : 0;
    const safeStart =
      Number.isFinite(startIndex) && startIndex >= 0 ? startIndex : 0;
    const slice = filtered.slice(safeStart, safeStart + limit);
    const nextOffset = safeStart + slice.length;
    const hasMore = nextOffset < filtered.length;

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: slice,
        pageInfo: {
          nextCursor: hasMore ? String(nextOffset) : null,
          hasMore,
        },
      }),
    });
  });

  return requests;
}

test("Agents sidebar lazy loads next conversation page on scroll and filters via search", async ({
  page,
}) => {
  await agentWorkspaceFixture(page);
  const requests = await setupPaginatedConversations(page, 35);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/v2/agents?conversation=conv-e2e-1");

  const history = page.locator(".v2-agent-history");
  await expect(
    history.getByRole("button", { name: "Conversation 01 Planning" }),
  ).toBeVisible();
  await expect(
    history.getByRole("button", { name: /Load more|Tải thêm/i }),
  ).toHaveCount(0);
  await expect(
    history.getByRole("button", { name: "Conversation 25 Planning" }),
  ).toHaveCount(0);

  const scrollContainer = history.locator("div.overflow-y-auto").first();
  await scrollContainer.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
    el.dispatchEvent(new Event("scroll"));
  });

  await expect(
    history.getByRole("button", { name: "Conversation 35 Planning" }),
  ).toBeVisible();
  expect(requests.some((req) => req.cursor === "20")).toBe(true);

  await page.screenshot({
    path: "/tmp/v2-conversation-lazy/agents-desktop-loaded.png",
    fullPage: true,
  });

  await history
    .getByRole("textbox", { name: /search conversations/i })
    .fill("Conversation 33");
  await expect(
    history.getByRole("button", { name: "Conversation 33 Planning" }),
  ).toBeVisible();
  await expect(
    history.getByRole("button", { name: "Conversation 01 Planning" }),
  ).toHaveCount(0);
  await expect
    .poll(() => requests.some((req) => req.search === "Conversation 33"))
    .toBe(true);

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("Assistant bubble history lazy loads more conversations on scroll", async ({
  page,
}) => {
  await agentWorkspaceFixture(page);
  const requests = await setupPaginatedConversations(page, 35);
  await page.addInitScript(() => localStorage.setItem("orbit-theme", "dark"));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/v2/dashboard");

  await page
    .getByRole("button", { name: "Open assistant", exact: true })
    .click();
  const panel = page.getByTestId("v2-assistant-panel");
  await panel.getByRole("button", { name: "History", exact: true }).click();

  const history = page.locator("#v2-assistant-history");
  await expect(
    history.getByRole("button", { name: /Conversation 01 Planning/ }),
  ).toBeVisible();
  await expect(
    history.getByRole("button", { name: /Load more|Tải thêm/i }),
  ).toHaveCount(0);

  await history.getByRole("button", { name: "View all (20+)" }).click();
  await expect(
    history.getByRole("button", { name: /Conversation 20 Planning/ }),
  ).toBeVisible();
  await expect(
    history.getByRole("button", { name: /Conversation 35 Planning/ }),
  ).toHaveCount(0);

  const list = history.locator("ul").first();
  await list.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
    el.dispatchEvent(new Event("scroll"));
  });

  await expect(
    history.getByRole("button", { name: /Conversation 35 Planning/ }),
  ).toBeVisible();
  expect(requests.some((req) => req.cursor === "20")).toBe(true);
  await list.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });

  await page.screenshot({
    path: "/tmp/v2-conversation-lazy/bubble-mobile-dark.png",
    fullPage: true,
  });

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
