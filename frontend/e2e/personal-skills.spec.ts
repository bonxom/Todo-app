import { expect, test } from "@playwright/test";
import { agentWorkspaceFixture } from "./agent-workspace.fixture";
import { personalSkillsFixture } from "./personal-skills.fixture";

test.describe("Personal Skills E2E", () => {
  test("imports an editable IELTS copy from template gallery", async ({
    page,
  }) => {
    await personalSkillsFixture(page);

    await page.goto("/agent/skills");
    await page
      .getByRole("button", { name: /Thêm từ mẫu/i })
      .first()
      .click();

    // Preview IELTS
    await page.getByRole("button", { name: /preview IELTS/i }).click();
    await expect(page.getByText(/Hướng dẫn ôn thi IELTS/i)).toBeVisible();

    // Add to my skills
    await page
      .getByRole("button", { name: /add to my skills/i })
      .first()
      .click();

    // Navigates to editor
    await expect(page).toHaveURL(/\/agent\/skills\/imported-/);
    await expect(page.getByLabel(/Tên kỹ năng/i)).toHaveValue("IELTS");
  });

  test("full CRUD lifecycle: create, edit, toggle and delete a skill", async ({
    page,
  }) => {
    await personalSkillsFixture(page);

    // 1. Create
    await page.goto("/agent/skills");
    await page
      .getByRole("link", { name: /Tạo kỹ năng/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/agent\/skills\/new$/);

    await page.getByLabel(/Tên kỹ năng/i).fill("Writing Guide");
    await page.getByLabel(/Mô tả kỹ năng/i).fill("Short concise guide");
    await page
      .getByLabel(/Hướng dẫn chi tiết/i)
      .fill("Write with clarity and simplicity.");
    await page.getByRole("button", { name: /Lưu kỹ năng/i }).click();

    await expect(page).toHaveURL(/\/agent\/skills\/skill-/);

    // 2. Edit
    await page.getByLabel(/Mô tả kỹ năng/i).fill("Updated concise guide");
    await page.getByRole("button", { name: /Lưu thay đổi/i }).click();
    await expect(page.getByText(/Phiên bản hiện tại: v2/i)).toBeVisible();

    // 3. Return to list and check toggle
    await page.getByRole("button", { name: /Quay lại danh sách/i }).click();
    await expect(page).toHaveURL(/\/agent\/skills$/);
    await expect(page.getByText("Writing Guide")).toBeVisible();

    const switchBtn = page.getByRole("switch", {
      name: /Bật\/tắt Writing Guide/i,
    });
    await expect(switchBtn).toHaveAttribute("aria-checked", "true");
    await switchBtn.click();
    await expect(switchBtn).toHaveAttribute("aria-checked", "false");
    await expect(
      page.getByText("Thay đổi áp dụng từ lượt chat tiếp theo"),
    ).toBeVisible();

    // 4. Delete
    await page.getByText("Writing Guide").click();
    await page.getByRole("button", { name: /Xóa kỹ năng/i }).click();
    await page.getByRole("button", { name: /Xác nhận xóa/i }).click();

    await expect(page).toHaveURL(/\/agent\/skills$/);
    await expect(page.getByText("Writing Guide")).not.toBeVisible();
  });

  test("mobile view at 390px has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await personalSkillsFixture(page);

    await page.goto("/agent/skills");
    await expect(
      page.getByRole("heading", { name: "Kỹ năng cá nhân", exact: true }),
    ).toBeVisible();

    const isWithinBounds = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(isWithinBounds).toBe(true);
  });
  test("mobile template preview is visible and Escape returns focus", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await personalSkillsFixture(page);
    await page.goto("/agent/skills");
    const trigger = page.getByRole("button", { name: /Thêm từ mẫu/i }).first();
    await trigger.click();
    await page.getByRole("button", { name: /preview IELTS/i }).click();
    await expect(
      page.getByRole("heading", { name: "Hướng dẫn ôn thi IELTS" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });

  test("browser Back prompts before discarding an editor draft", async ({
    page,
  }) => {
    await personalSkillsFixture(page);
    await page.goto("/agent/skills");
    await page
      .getByRole("link", { name: /Tạo kỹ năng/i })
      .first()
      .click();
    await page.getByLabel(/Tên kỹ năng/i).fill("Unsaved");
    await page.goBack();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Tiếp tục chỉnh sửa" }).click();
    await expect(page.getByLabel(/Tên kỹ năng/i)).toHaveValue("Unsaved");
    await page.getByRole("button", { name: "Quay lại danh sách" }).click();
    await page
      .getByRole("button", { name: "Bỏ thay đổi", exact: true })
      .click();
    await expect(page).toHaveURL(/\/agent\/skills$/);
  });
  test("conflict keeps the draft and reload requires explicit discard", async ({
    page,
  }) => {
    const original = {
      id: "skill-existing",
      name: "Writing",
      description: "Desc",
      instructions: "Original",
      version: 1,
      enabled: true,
      updatedAt: "2026-11-06T00:00:00.000Z",
    };
    const { skills } = await personalSkillsFixture(page, {
      initialSkills: [original],
    });
    await page.goto(`/agent/skills/${original.id}`);
    await page.getByLabel(/Hướng dẫn chi tiết/i).fill("My unsaved draft");
    skills.set(original.id, {
      ...original,
      version: 2,
      instructions: "Remote revision",
    });
    await page.getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(
      page.getByText(/Phiên bản kỹ năng đã thay đổi trên máy chủ/),
    ).toBeVisible();
    await expect(page.getByLabel(/Hướng dẫn chi tiết/i)).toHaveValue(
      "My unsaved draft",
    );
    await page.getByRole("button", { name: "Tải bản mới" }).click();
    await page
      .getByRole("button", { name: "Bỏ thay đổi", exact: true })
      .click();
    await expect(page.getByLabel(/Hướng dẫn chi tiết/i)).toHaveValue(
      "Remote revision",
    );
    await expect(page.getByText("Phiên bản hiện tại: v2")).toBeVisible();
  });

  test("history read badge links to skill and explains an old version", async ({
    page,
  }) => {
    const id = "11111111-1111-4111-8111-111111111111";
    await agentWorkspaceFixture(page, {
      initialMessages: [
        {
          id: "answer",
          sender: "bot",
          text: "Finished",
          timestamp: "2026-11-06T00:00:00.000Z",
          skillsRead: [{ id, name: "Writing", version: 1 }],
        },
      ],
    });
    await page.route(`**/api/ai/skills/${id}`, (route) =>
      route.fulfill({
        json: {
          data: {
            id,
            name: "Writing",
            description: "Desc",
            instructions: "New advice",
            enabled: true,
            version: 2,
            updatedAt: "2026-11-06T00:00:00.000Z",
          },
        },
      }),
    );
    await page.goto("/agent");
    const badge = page.getByRole("link", { name: "Đã đọc: Writing" });
    await badge.hover();
    await expect(page.getByRole("tooltip")).toContainText(
      "Hội thoại dùng phiên bản 1",
    );
    await badge.click();
    await expect(page.getByLabel(/Tên kỹ năng/i)).toHaveValue("Writing");
  });
});
