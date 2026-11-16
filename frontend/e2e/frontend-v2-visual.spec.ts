import { test, expect } from "@playwright/test";
import { installV2Fixture } from "./frontend-v2.fixture";

const viewports = [
  { name: "mobile", width: 360, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

test.describe("Frontend V2 Liquid Glass Visual & Responsive Contracts", () => {
  for (const vp of viewports) {
    for (const theme of ["light", "dark"] as const) {
      test(`Responsive layout and no horizontal overflow on ${vp.name} in ${theme} theme`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await installV2Fixture(page, {
          authenticated: true,
          preferredVersion: "v2",
          theme,
        });

        await page.goto("/v2/dashboard");

        // Verify root has V2 data attribute
        const v2App = page.getByTestId("v2-layout");
        await expect(v2App).toBeVisible();

        // Check no horizontal overflow
        const hasOverflow = await page.evaluate(() => {
          return (
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth
          );
        });
        expect(hasOverflow).toBe(false);

        // Version switcher must remain visible
        const switcher = page.getByRole("button", { name: /Back to V1/i });
        await expect(switcher).toBeVisible();
      });
    }
  }

  test("Vietnamese localization displays cleanly without layout breakage", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await installV2Fixture(page, {
      authenticated: true,
      preferredVersion: "v2",
      language: "vi",
    });

    await page.goto("/v2/dashboard");

    // Vietnamese switcher and headings
    await expect(page.getByRole("button", { name: "Về V1" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Công việc", exact: true }),
    ).toBeVisible();

    const hasOverflow = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
      );
    });
    expect(hasOverflow).toBe(false);
  });

  test("V1 -> V2 -> V1 round trip preserves V1 styling without leakage", async ({
    page,
  }) => {
    await installV2Fixture(page, {
      authenticated: true,
      preferredVersion: "v1",
    });

    // Start on V1
    await page.goto("/dashboard");
    await expect(page.getByRole("button", { name: "Try V2" })).toBeVisible();

    // Switch to V2
    await page.getByRole("button", { name: "Try V2" }).click();
    await expect(page).toHaveURL(/\/v2\/dashboard$/);
    await expect(page.getByTestId("v2-layout")).toBeVisible();

    // Switch back to V1
    await page.getByRole("button", { name: "Back to V1" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // Verify V1 layout remains intact
    const v1Content = page.locator(".ui-main-content");
    await expect(v1Content).toBeVisible();
  });
});
