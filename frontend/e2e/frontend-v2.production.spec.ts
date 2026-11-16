import { test, expect } from "@playwright/test";
import { installV2Fixture } from "./frontend-v2.fixture";

test.describe("Frontend V2 Production Bundles and Chunk Boundaries", () => {
  test("Cold load to /v2/dashboard serves SPA fallback and renders V2 layout", async ({
    page,
  }) => {
    await installV2Fixture(page, {
      authenticated: true,
      preferredVersion: "v2",
    });

    const response = await page.goto("/v2/dashboard");
    expect(response?.status()).toBe(200);

    const v2App = page.getByTestId("v2-layout");
    await expect(v2App).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Task Item 1", exact: true }),
    ).toBeVisible();
  });

  test("Cold load to /v2/missing renders V2 404 with the version switcher", async ({
    page,
  }) => {
    await installV2Fixture(page, {
      authenticated: true,
    });

    const response = await page.goto("/v2/missing");
    expect(response?.status()).toBe(200);

    await expect(page.getByTestId("v2-not-found-page")).toBeVisible();
    const backToV1 = page.getByRole("button", { name: /Back to V1/i });
    await expect(backToV1).toBeVisible();
  });

  test("Recovers gracefully when a V2 chunk fails to load", async ({
    page,
  }) => {
    await installV2Fixture(page, {
      authenticated: true,
    });

    // Start on V1 dashboard
    await page.goto("/dashboard");
    await expect(page.getByRole("button", { name: "Try V2" })).toBeVisible();

    // Abort subsequent V2 chunk imports
    await page.route("**/*V2Layout*.js", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/javascript",
        body: "throw new Error('Chunk load failed');",
      }),
    );
    await page.route("**/*DashboardPage*.js", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/javascript",
        body: "throw new Error('Chunk load failed');",
      }),
    );

    // Attempt to switch to V2
    await page.getByRole("button", { name: "Try V2" }).click();

    // Error boundary renders
    const errorAlert = page.getByRole("alert");
    await expect(errorAlert).toBeVisible();
    await expect(page.getByRole("button", { name: /Reload/i })).toBeVisible();

    const escapeLink = page.getByRole("link", { name: /Back to V1/i });
    await expect(escapeLink).toBeVisible();
    expect(await escapeLink.getAttribute("href")).toBe("/dashboard");

    // Unroute and click escape link
    await page.unroute("**/*V2Layout*.js");
    await page.unroute("**/*DashboardPage*.js");
    await escapeLink.click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
