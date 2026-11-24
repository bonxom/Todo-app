import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";

let token = process.env.ORBIT_AGENT_BROWSER_TOKEN;
let userJson = process.env.ORBIT_AGENT_BROWSER_USER;

if (!token && existsSync("/tmp/orbit_agent_browser_harness.json")) {
  try {
    const saved = JSON.parse(
      readFileSync("/tmp/orbit_agent_browser_harness.json", "utf-8"),
    );
    token = saved.token;
    userJson = JSON.stringify(saved.user);
  } catch {
    // ignore
  }
}

const serverUrl = process.env.VITE_SERVER_URL || "http://127.0.0.1:3011";

test.describe("Live Agent Task Creation & Clarification Smoke", () => {
  test.skip(
    !token,
    "ORBIT_AGENT_BROWSER_TOKEN not set; skipping live browser smoke test",
  );

  const user = userJson
    ? JSON.parse(userJson)
    : {
        _id: "seeded-user",
        email: "user@example.test",
        name: "Seeded User",
        role: "USER",
      };

  test.beforeEach(async ({ page }) => {
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith("/api/")) {
        const targetUrl = new URL(url.pathname + url.search, serverUrl);
        return route.continue({ url: targetUrl.href });
      }
      return route.continue();
    });

    await page.addInitScript(
      ({ token, user }) => {
        localStorage.clear();
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("orbit-theme", "light");
        localStorage.setItem("orbit.language", "en");
        localStorage.setItem("orbit.ui-version", "v1");
      },
      { token, user },
    );
  });

  test("auto task creation, auto clarification, ask proposal, partial confirm and follow-up", async ({
    page,
    request,
  }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Open assistant" }).click();
    const chat = page.getByRole("region", { name: "Assistant chat" });
    await chat.getByRole("button", { name: "New chat", exact: true }).click();

    const mode = chat.locator("button.chat-mode-toggle");
    if (!(await mode.isVisible())) {
      await chat.getByRole("button", { name: "Expand options" }).click();
    }
    if (await chat.locator("button.chat-mode-toggle--ask").isVisible()) {
      await mode.click();
    }
    await expect(chat.locator("button.chat-mode-toggle--auto")).toBeVisible();

    const countTasks = async (title: string) => {
      const response = await request.get(`${serverUrl}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      const tasks: { title: string }[] = data.tasks ?? data.data;
      return tasks.filter((task) => task.title === title).length;
    };
    const reportCount = await countTasks("Gửi báo cáo");
    const exerciseCount = await countTasks("Tập thể dục buổi sáng");

    const composer = chat.getByRole("textbox", { name: "Message" });
    await expect(composer).toBeVisible();

    await composer.fill("Create a task to send the report by Friday");
    await chat.getByRole("button", { name: "Send message" }).click();
    const creationReplies = chat.getByText("Đã tạo công việc thành công.", {
      exact: true,
    });
    await expect(creationReplies).toHaveCount(1, { timeout: 15000 });
    await expect.poll(() => countTasks("Gửi báo cáo")).toBe(reportCount + 1);

    // 2. Auto clarification continuation
    await composer.fill("Tập thể dục");
    await page.getByRole("button", { name: "Send message" }).click();

    // Question card should appear
    await expect(
      page.getByRole("heading", { name: "Bạn muốn tập vào lúc nào?" }),
    ).toBeVisible({ timeout: 15000 });

    // Select "Buổi sáng" radio
    await page.getByRole("radio", { name: "Buổi sáng" }).click();

    // Click Send answer
    await page.getByRole("button", { name: "Send answer" }).click();

    await expect(creationReplies).toHaveCount(2, { timeout: 15000 });
    await expect(
      chat.getByRole("status").filter({ hasText: "You selected" }),
    ).toContainText("Buổi sáng");
    await expect
      .poll(() => countTasks("Tập thể dục buổi sáng"))
      .toBe(exerciseCount + 1);

    // 3. Switch to Ask mode and submit creation request for a proposal
    const modeBtn = page.locator("button.chat-mode-toggle");
    if (!(await modeBtn.isVisible())) {
      await page.getByRole("button", { name: "Expand options" }).click();
    }
    await modeBtn.click();
    await expect(page.locator("button.chat-mode-toggle--ask")).toBeVisible();

    await composer.fill("Lên kế hoạch dự án");
    await page.getByRole("button", { name: "Send message" }).click();

    // Proposal card should appear with tasks
    const proposalIntro = chat.getByText(
      "Mình bắt đầu bằng khảo sát yêu cầu vì kết quả đó sẽ giúp chốt kiến trúc và dự toán.",
      { exact: true },
    );
    await expect(proposalIntro).toBeVisible();
    await expect(chat.getByText("Khảo sát yêu cầu khách hàng")).toBeVisible({
      timeout: 15000,
    });

    // Navigate to slide 3 or find checkbox
    const nextBtn = page.getByRole("button", {
      name: "Next task",
      exact: true,
    });
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await nextBtn.click();
    }
    const budgetCheckbox = page.getByRole("checkbox", {
      name: "Select task: Lập ngân sách dự án",
    });
    if (await budgetCheckbox.isVisible()) {
      await budgetCheckbox.uncheck();
    }

    // Confirm proposal
    const confirmBtn = page.getByRole("button", {
      name: /Confirm \(\d+\)/,
    });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();
    const confirmFeedback = chat.getByText("Created 2 of 3 proposed tasks.", {
      exact: true,
    });
    await expect(confirmFeedback).toBeVisible();

    // 4. Follow-up: Ask which tasks were confirmed
    await composer.fill("Which tasks did I just confirm?");
    await page.getByRole("button", { name: "Send message" }).click();

    // Verify model response names exactly the confirmed subset
    await expect(
      page.getByText(
        "Bạn vừa xác nhận 2 công việc: Khảo sát yêu cầu khách hàng và Thiết kế kiến trúc hệ thống.",
      ),
    ).toBeVisible({ timeout: 15000 });

    await composer.fill("Hỏi thêm rồi đề xuất bước tiếp theo");
    await chat.getByRole("button", { name: "Send message" }).click();
    await chat.getByRole("radio", { name: "Kiểm thử nghiệm thu" }).check();
    await chat.getByRole("button", { name: "Send answer" }).click();
    await expect(
      chat.locator("summary").filter({ hasText: "Kiểm thử nghiệm thu" }),
    ).toBeVisible();
    await expect(
      chat.getByText("Bạn muốn ưu tiên bước nào tiếp theo?", { exact: true }),
    ).toBeHidden();
    await expect(
      chat.getByText("Viết kịch bản kiểm thử nghiệm thu", { exact: true }),
    ).toBeVisible();
    await expect(
      chat.getByRole("button", { name: "Confirm (1)", exact: true }),
    ).toBeVisible();
    await chat.getByRole("button", { name: "Cancel", exact: true }).click();
    const cancelFeedback = chat.getByText(
      "Proposal cancelled. No tasks were created.",
      { exact: true },
    );
    await expect(cancelFeedback).toBeVisible();
    await composer.fill("What happened to the cancelled proposal?");
    await chat.getByRole("button", { name: "Send message" }).click();
    await expect(
      chat.getByText(
        "You cancelled the testing proposal before creating any tasks.",
        {
          exact: true,
        },
      ),
    ).toBeVisible();

    await composer.fill("Compare my study hours by skill");
    await chat.getByRole("button", { name: "Send message" }).click();
    const chartIntro = chat.getByText(
      "You spent twice as much time on reading as on listening this week.",
      { exact: true },
    );
    const chart = chat.getByRole("img", {
      name: "Study hours by skill",
      exact: true,
    });
    await expect(chartIntro).toBeVisible();
    await expect(chart).toBeVisible();
    expect((await chartIntro.boundingBox())!.y).toBeLessThan(
      (await chart.boundingBox())!.y,
    );

    await page.reload();
    await page.getByRole("button", { name: "Open assistant" }).click();
    await expect(proposalIntro).toBeVisible();
    await expect(confirmFeedback).toBeVisible();
    await expect(cancelFeedback).toBeVisible();
    await expect(chartIntro).toBeVisible();
    await expect(chart).toBeVisible();
  });
});
