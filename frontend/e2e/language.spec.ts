import { expect, test } from "@playwright/test";
import { dashboardFixture } from "./dashboard.fixture";

async function chooseVietnamese(page: import("@playwright/test").Page) {
  const selector = page.getByRole("combobox", {
    name: "Language",
    exact: true,
  });
  await selector.focus();
  await page.keyboard.press("Enter");
  await page
    .getByRole("listbox")
    .getByRole("option", { name: "Tiếng Việt", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
}

test("public language selection preserves login input and survives reload", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("draft@example.com");
  await chooseVietnamese(page);
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
    "draft@example.com",
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(
    page.getByRole("combobox", { name: "Ngôn ngữ", exact: true }),
  ).toHaveValue("vi");
  await page.goto("/");
  await expect(
    page.getByRole("combobox", { name: "Ngôn ngữ", exact: true }),
  ).toHaveValue("vi");
});

for (const width of [1440, 390, 320]) {
  test(`workspace language control fits ${width}px and preserves task search`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await dashboardFixture(page);
    await page.goto("/dashboard");
    await expect(
      page.getByRole("button", {
        name: "Explore directions for the homepage",
        exact: true,
      }),
    ).toBeVisible();
    await chooseVietnamese(page);
    await expect(
      page.getByRole("button", {
        name: "Explore directions for the homepage",
        exact: true,
      }),
    ).toBeVisible();
    const overflow = await page
      .locator(".ui-topbar")
      .evaluate((element) => element.scrollWidth > element.clientWidth);
    expect(overflow).toBe(false);
    await page.screenshot({
      path: `/tmp/todo-language-${width}.png`,
      fullPage: false,
    });
    await page
      .getByRole("combobox", { name: "Ngôn ngữ", exact: true })
      .selectOption("en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
}
