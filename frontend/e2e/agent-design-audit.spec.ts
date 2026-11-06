import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { dashboardFixture } from "./dashboard.fixture";
import { agentWorkspaceFixture } from "./agent-workspace.fixture";
import { personalSkillsFixture } from "./personal-skills.fixture";

const out = resolve(
  process.env.AGENT_UI_AUDIT_DIR || "../docs/ui-audit/2026-11-06-agent/after",
);
const sampleSkills = [
  {
    id: "writing",
    name: "IELTS Writing",
    description:
      "Nhận xét bài viết theo bốn tiêu chí IELTS và gợi ý cách diễn đạt tự nhiên hơn.",
    instructions:
      "## Khi sửa bài viết\n\n- Giữ nguyên ý của người viết.\n- Giải thích ba điểm cần cải thiện.\n- Đưa ra ví dụ ngắn, rõ ràng.",
    enabled: true,
    version: 2,
    updatedAt: "2026-11-06T00:00:00Z",
    sourceTemplateId: "ielts",
  },
  {
    id: "gym",
    name: "Lịch tập cá nhân",
    description:
      "Lên lịch tập phù hợp với ba buổi mỗi tuần, ưu tiên phục hồi và duy trì thói quen.",
    instructions: "Hỏi về thời gian và thiết bị có sẵn trước khi lên lịch.",
    enabled: true,
    version: 1,
    updatedAt: "2026-11-05T00:00:00Z",
    sourceTemplateId: "gym",
  },
  {
    id: "work",
    name: "Cách tôi lên kế hoạch",
    description:
      "Chia việc lớn thành các bước nhỏ. Mỗi ngày chỉ chọn ba việc quan trọng nhất.",
    instructions: "Ưu tiên ba việc quan trọng nhất.",
    enabled: false,
    version: 3,
    updatedAt: "2026-11-04T00:00:00Z",
  },
];
test.beforeAll(() => mkdirSync(out, { recursive: true }));

test("design reference: dashboard", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await dashboardFixture(page);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("button", {
      name: "Explore directions for the homepage",
      exact: true,
    }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.mouse.move(1000, 900);
  await page.screenshot({
    path: resolve(out, "00-dashboard.png"),
    fullPage: true,
    animations: "disabled",
  });
});

test("design walkthrough: agent workspace", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await agentWorkspaceFixture(page);
  await page.goto("/agent");
  await page.waitForLoadState("networkidle");
  await page.mouse.move(1000, 900);
  await page.screenshot({
    path: resolve(out, "01-agent-desktop.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: resolve(out, "02-agent-mobile.png"),
    fullPage: false,
    animations: "disabled",
  });
});

test("design walkthrough: skill library, template and editor", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await personalSkillsFixture(page, { initialSkills: sampleSkills });
  await page.goto("/agent/skills");
  await page.waitForLoadState("networkidle");
  await page.mouse.move(1000, 900);
  await page.screenshot({
    path: resolve(out, "03-skills-desktop.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Thêm từ mẫu", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: /Xem mẫu IELTS/i }).click();
  await expect(page.getByText("Hướng dẫn ôn thi IELTS")).toBeVisible();
  await page.screenshot({
    path: resolve(out, "04-template-desktop.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await page.getByText("IELTS Writing", { exact: true }).click();
  await expect(page.getByLabel(/Tên kỹ năng/i)).toHaveValue("IELTS Writing");
  await page.screenshot({
    path: resolve(out, "05-editor-desktop.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: resolve(out, "06-editor-mobile.png"),
    fullPage: false,
    animations: "disabled",
  });
  await page
    .getByLabel("Hướng dẫn chi tiết", { exact: false })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: resolve(out, "06b-editor-mobile-writing.png"),
    fullPage: false,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Quay lại danh sách", exact: true })
    .click();
  await expect(page.getByText("IELTS Writing", { exact: true })).toBeVisible();
  await page.screenshot({
    path: resolve(out, "07-skills-mobile.png"),
    fullPage: false,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Thêm từ mẫu", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: /Xem mẫu IELTS/i }).click();
  await page.screenshot({
    path: resolve(out, "08-template-mobile.png"),
    fullPage: false,
    animations: "disabled",
  });
});

test("design walkthrough: empty library and dark theme", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await personalSkillsFixture(page);
  await page.goto("/agent/skills");
  await page.waitForLoadState("networkidle");
  await page.mouse.move(1000, 900);
  await page.screenshot({
    path: resolve(out, "09-skills-empty.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("link", { name: "Tạo kỹ năng", exact: true })
    .first()
    .click();
  await page.screenshot({
    path: resolve(out, "10-editor-new.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", {
      name: /Switch to dark mode|Use dark theme|Dark mode/i,
    })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.waitForLoadState("networkidle");
  await page.mouse.move(1000, 900);
  await page.screenshot({
    path: resolve(out, "11-editor-dark.png"),
    fullPage: true,
    animations: "disabled",
  });
});
