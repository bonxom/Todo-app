import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { dashboardFixture } from "./dashboard.fixture";
import type {
  AgentInteraction,
  ChatPayload,
  ConversationSnapshot,
} from "../src/shared/types/domain";

test.use({ reducedMotion: "reduce" });

const shots = resolve("../docs/ui-audit/2026-11-03-chatbot/after");
const question: AgentInteraction = {
  id: "ask-question",
  kind: "clarification",
  status: "pending",
  question: "Bạn muốn học tiếng Anh theo hướng nào?",
  allowCustomAnswer: true,
  options: [
    {
      id: "daily",
      label: "Thói quen nhẹ mỗi ngày",
      description: "15 phút mỗi ngày, dễ duy trì khi bận rộn.",
    },
    {
      id: "speaking",
      label: "Tập trung giao tiếp",
      description: "30 phút luyện nói, ưu tiên phản xạ trong công việc.",
    },
    {
      id: "exam",
      label: "Luyện thi IELTS",
      description: "60 phút mỗi ngày, luyện theo mục tiêu điểm số.",
    },
  ],
};
const timestamp = "2026-11-03T12:00:00.000Z";
async function screenshot(page: Page, name: string) {
  await mkdir(shots, { recursive: true });
  await page.screenshot({
    path: resolve(shots, `${name}.png`),
    animations: "disabled",
  });
}
async function chatFixture(page: Page, pending = false) {
  await dashboardFixture(page);
  const requests: ChatPayload[] = [];
  let failure = 0;
  let snapshot: ConversationSnapshot | null = pending
    ? {
        conversationId: "existing-ask",
        title: "Học tiếng Anh",
        mode: "ask",
        pending: [],
        before: null,
        interaction: structuredClone(question),
        messages: [
          {
            id: "request",
            sender: "user",
            text: "Tôi muốn học tiếng Anh",
            timestamp,
          },
          {
            id: "question-message",
            sender: "bot",
            text: question.question,
            timestamp,
            interaction: structuredClone(question),
          },
        ],
      }
    : null;
  await page.route("**/api/ai/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith("/api/ai/")) return route.continue();
    if (path === "/api/ai/conversations") {
      if (route.request().method() === "POST") {
        const { conversationId } = route.request().postDataJSON();
        snapshot = {
          conversationId,
          title: "Hội thoại mới",
          mode: "auto",
          pending: [],
          before: null,
          messages: [],
        };
        return route.fulfill({ status: 201, json: { conversationId } });
      }
      return route.fulfill({
        json: {
          data: [
            {
              id: "earlier",
              title: "Kế hoạch tuần trước",
              updatedAt: timestamp,
            },
          ],
        },
      });
    }
    if (path.startsWith("/api/ai/conversations/"))
      return route.fulfill({ json: { data: snapshot } });
    if (path === "/api/ai/chat-mcp") {
      const payload = route.request().postDataJSON() as ChatPayload;
      requests.push(payload);
      if (failure)
        return route.fulfill({
          status: failure,
          json: { message: "Không gửi được câu trả lời. Vui lòng thử lại." },
        });
      if (!snapshot) throw new Error("Create a conversation before sending");
      snapshot.mode = payload.mode ?? "auto";
      if (snapshot.interaction) {
        const resolved: AgentInteraction = {
          ...snapshot.interaction,
          status:
            !payload.selection || payload.selection.cancel
              ? "cancelled"
              : "answered",
          answer:
            !payload.selection || payload.selection.cancel
              ? { optionId: "cancel" }
              : payload.selection,
        };
        snapshot.messages = snapshot.messages.map((message) =>
          message.interaction?.id === resolved.id
            ? { ...message, interaction: resolved }
            : message,
        );
        delete snapshot.interaction;
      }
      snapshot.messages.push({
        id: `${payload.requestId}:reply`,
        sender: "bot",
        text: "Đã nhận lựa chọn của bạn.",
        timestamp,
      });
      return route.fulfill({
        json: {
          status: "completed",
          conversationId: snapshot.conversationId,
          data: "Đã nhận lựa chọn của bạn.",
        },
      });
    }
    return route.fulfill({
      status: 404,
      json: { message: "Unknown mock route" },
    });
  });
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Open assistant" }).click();
  await expect(page.getByRole("region", { name: "Assistant chat" })).toHaveCSS(
    "transform",
    "none",
  );
  return {
    requests,
    fail: (status: number) => (failure = status),
    setSnapshot: (value: ConversationSnapshot) => {
      snapshot = value;
    },
  };
}

test("mode is visible, welcome fills the draft, and new chat retains Ask", async ({
  page,
}) => {
  const api = await chatFixture(page);
  await page
    .getByRole("button", { name: "Expand options", exact: true })
    .click();
  const autoColor = await page
    .getByRole("button", { name: "Agent mode: auto" })
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  await screenshot(page, "14-desktop-auto-robot");
  await page
    .getByRole("button", { name: "Agent mode: auto", exact: true })
    .click();
  // The label updates before the CSS background transition finishes.
  await expect
    .poll(() =>
      page
        .getByRole("button", { name: "Agent mode: ask" })
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    )
    .not.toBe(autoColor);
  await expect(page.getByRole("combobox", { name: "Agent mode" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "Choose skill" })).toHaveCount(
    0,
  );
  await expect(page.locator(".chat-mode-hint")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Agent mode: ask" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Plan my day", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Message", exact: true });
  await expect(input).not.toHaveValue("");
  expect(api.requests).toHaveLength(0);
  await screenshot(page, "01-desktop-welcome");
  await page
    .getByRole("button", { name: "Expand options", exact: true })
    .click();
  const tools = page.getByRole("group", { name: "Chat tools" });
  const toolsBox = (await tools.boundingBox())!;
  const inputBox = (await input.boundingBox())!;
  expect(toolsBox.x + toolsBox.width).toBeLessThanOrEqual(inputBox.x);
  expect(toolsBox.y).toBeGreaterThanOrEqual(inputBox.y);
  for (const name of ["Attach image", "Attach file", "Agent mode: ask"]) {
    await expect(tools.getByRole("button", { name, exact: true })).toHaveText(
      "",
    );
  }
  await screenshot(page, "13-desktop-inline-tools");
  await page
    .getByRole("button", { name: "Collapse options", exact: true })
    .click();
  await page.getByRole("button", { name: "New chat", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Bỏ thay đổi và tiếp tục" }).click();
  await expect(input).toHaveValue("");
  await page
    .getByRole("button", { name: "Expand options", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Agent mode: ask" }),
  ).toHaveAttribute("aria-pressed", "true");
  await input.fill("Lập kế hoạch hôm nay");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect.poll(() => api.requests.length).toBe(1);
  expect(api.requests[0].mode).toBe("ask");
});

test("header history preserves the current draft and attachments", async ({
  page,
}) => {
  await chatFixture(page);
  const input = page.getByRole("textbox", { name: "Message", exact: true });
  await input.fill("Bản nháp của tôi");
  await page.getByLabel("Choose files", { exact: true }).setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Notes"),
  });
  await page.getByRole("button", { name: "Chat history", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Kế hoạch tuần trước/ }),
  ).toBeVisible();
  await screenshot(page, "02-history");
  await page
    .getByRole("button", { name: "Back to conversation", exact: true })
    .click();
  await expect(input).toHaveValue("Bản nháp của tôi");
  await expect(page.getByText("notes.txt", { exact: true })).toBeVisible();
});

test("422 answer stays unresolved and can be edited after reloading", async ({
  page,
}) => {
  const api = await chatFixture(page, true);
  const selected = page.getByRole("radio", {
    name: "Thói quen nhẹ mỗi ngày",
    exact: true,
  });
  await selected.check();
  api.fail(422);
  await page.getByRole("button", { name: "Send answer", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText("You selected", { exact: true })).toHaveCount(0);
  await expect(selected).toBeChecked();
  await screenshot(page, "03-ask-validation-error");
  api.fail(0);
  await page
    .getByRole("button", { name: "Reload conversation", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(selected).toBeEnabled();
  await page
    .getByRole("radio", { name: "Tập trung giao tiếp", exact: true })
    .check();
  await page.getByRole("button", { name: "Send answer", exact: true }).click();
  await expect(
    page.getByText("Đã nhận lựa chọn của bạn.", { exact: true }),
  ).toBeVisible();
  expect(api.requests.at(-1)?.selection?.optionId).toBe("speaking");
  await screenshot(page, "04-ask-recovered");
});

test("503 retry keeps its request ID and only confirms after success", async ({
  page,
}) => {
  const api = await chatFixture(page, true);
  await page
    .getByRole("radio", { name: "Thói quen nhẹ mỗi ngày", exact: true })
    .check();
  api.fail(503);
  await page.getByRole("button", { name: "Send answer", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText("You selected", { exact: true })).toHaveCount(0);
  const original = structuredClone(api.requests[0]);
  api.fail(0);
  await page
    .getByRole("button", { name: "Retry message", exact: true })
    .click();
  await expect(
    page.getByText("Đã nhận lựa chọn của bạn.", { exact: true }),
  ).toBeVisible();
  expect(api.requests[1]).toEqual(original);
});

for (const width of [390, 320]) {
  test(`mobile ${width}px keeps full-width input when tools open`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await chatFixture(page);
    const input = page.getByRole("textbox", { name: "Message", exact: true });
    await expect(input).toHaveAttribute("placeholder", "Message Orbit…");
    const before = (await input.boundingBox())!;
    expect(before.height).toBeLessThanOrEqual(50);
    expect(before.width).toBeGreaterThan(width * 0.55);
    await page
      .getByRole("button", { name: "Expand options", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Attach file", exact: true }),
    ).toBeVisible();
    const after = (await input.boundingBox())!;
    expect(after.height).toBeLessThanOrEqual(50);
    expect(after.width).toBeGreaterThanOrEqual(before.width);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    const panel = await page
      .getByRole("region", { name: "Assistant chat" })
      .boundingBox();
    expect(panel!.height).toBeGreaterThan(800);
    await screenshot(page, `05-mobile-${width}-attachments`);
    await input.click();
    await input.fill("/gym");
    await expect(
      page.getByRole("listbox", { name: "Suggested skills" }),
    ).toBeVisible();
    await screenshot(page, `06-mobile-${width}-skills`);
  });
}

test("mobile keyboard stays in chat and close restores the launcher", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 500 });
  await chatFixture(page);
  await page.getByRole("button", { name: "Expand options" }).focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() =>
      Boolean(document.activeElement?.closest(".ui-assistant-panel")),
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Close chat" }).click();
  await expect(
    page.getByRole("button", { name: "Open assistant" }),
  ).toBeFocused();
});

test("Ask custom answer, cancel and replacement retain distinct payloads", async ({
  page,
}) => {
  const api = await chatFixture(page, true);
  await page.getByRole("button", { name: "Other answer", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Other answer" })
    .fill("Tôi chỉ có 10 phút mỗi ngày");
  await screenshot(page, "07-ask-custom-desktop");
  await page.getByRole("button", { name: "Send answer", exact: true }).click();
  await expect.poll(() => api.requests.length).toBe(1);
  expect(api.requests[0].selection?.customAnswer).toBe(
    "Tôi chỉ có 10 phút mỗi ngày",
  );
  expect(api.requests[0].selection?.optionId).toBeUndefined();
  const resetQuestion = async () => {
    api.setSnapshot({
      conversationId: "existing-ask",
      title: "Học tiếng Anh",
      mode: "ask",
      pending: [],
      before: null,
      interaction: structuredClone(question),
      messages: [],
    });
    await page.reload();
    await page.getByRole("button", { name: "Open assistant" }).click();
    await expect(
      page.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeVisible();
  };
  await resetQuestion();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect.poll(() => api.requests.length).toBe(2);
  expect(api.requests[1].selection?.cancel).toBe(true);
  await resetQuestion();
  await page.getByRole("button", { name: "Change request" }).click();
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Đổi sang học tiếng Nhật");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect.poll(() => api.requests.length).toBe(3);
  expect(api.requests[2].selection).toBeUndefined();
  expect(api.requests[2].mode).toBe("ask");
  await expect(page.getByRole("radio")).toHaveCount(0);
});

test("short mobile Ask keeps custom input and submit reachable in dark mode", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 500 });
  await chatFixture(page, true);
  await page.getByRole("button", { name: "Close chat" }).click();
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.getByRole("button", { name: "Open assistant" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Other answer", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Other answer" })
    .fill("20 phút vào buổi sáng");
  const send = page.getByRole("button", { name: "Send answer", exact: true });
  await expect(send).toBeEnabled();
  const box = (await send.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(500);
  await screenshot(page, "08-mobile-short-dark-ask");
  await send.click();
  await expect(page.getByText("Đã nhận lựa chọn của bạn.")).toBeVisible();
});

test("rich content stays readable in expanded, docked and mobile dark chat", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const api = await chatFixture(page);
  const text =
    "## Kế hoạch tuần này\n\n| Ngày | Công việc | Kết quả |\n|---|---|---|\n| Thứ hai | Review giao diện chatbot | Tổng hợp các điểm cần sửa |\n| Thứ ba | Kiểm thử phiên bản mới | Kiểm tra trên mobile |\n\n```mermaid\nflowchart LR\n A[Lên kế hoạch] --> B[Thực hiện] --> C[Đánh giá]\n```";
  api.setSnapshot({
    conversationId: "rich",
    title: "Kế hoạch tuần này",
    mode: "ask",
    pending: [],
    before: null,
    messages: [{ id: "rich-reply", sender: "bot", timestamp, text }],
  });
  await page.reload();
  await page.getByRole("button", { name: "Open assistant" }).click();
  await expect(page.locator(".chat-diagram-canvas svg")).toBeVisible();
  await page.getByRole("button", { name: "Expand chat" }).click();
  await screenshot(page, "09-expanded-rich-content");
  await page.getByRole("button", { name: "Dock chat to right" }).click();
  await screenshot(page, "10-docked-rich-content");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Zoom in diagram" }).click();
  await expect(
    page.getByRole("button", { name: "Reset diagram zoom" }),
  ).toHaveText("125%");
  await expect(page.locator(".chat-diagram-canvas svg")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page
    .getByRole("button", { name: "Close chat" })
    .click({ trial: true, timeout: 3000 });
  const panelLayer = await page
    .locator(".ui-assistant-panel")
    .evaluate((el) => Number(getComputedStyle(el).zIndex));
  const topbarLayer = await page
    .locator(".ui-topbar")
    .evaluate((el) => Number(getComputedStyle(el).zIndex));
  expect(panelLayer).toBeGreaterThan(topbarLayer);
  await screenshot(page, "11-mobile-dark-rich-content");
});

test("short mobile error keeps recovery actions reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 500 });
  const api = await chatFixture(page, true);
  await page.getByRole("radio", { name: "Thói quen nhẹ mỗi ngày" }).check();
  api.fail(503);
  await page.getByRole("button", { name: "Send answer" }).click();
  const retry = page.getByRole("button", { name: "Retry message" });
  await expect(retry).toBeVisible();
  await screenshot(page, "12-mobile-short-error");
  await retry.click({ trial: true });
  await expect(
    page.getByRole("button", { name: "Send answer" }),
  ).toBeInViewport({ ratio: 1 });
  await screenshot(page, "12-mobile-short-error");
  api.fail(0);
  await retry.click();
  await expect(page.getByText("Đã nhận lựa chọn của bạn.")).toBeVisible();
});
