import { test, expect } from "@playwright/test";
import { agentWorkspaceFixture } from "./agent-workspace.fixture";

for (const theme of ["light", "dark"]) {
  for (const width of [320, 390, 1440]) {
    test(`Two-mode glass chat at ${width}px in ${theme}`, async ({ page }) => {
      await agentWorkspaceFixture(page);
      await page.addInitScript(
        (theme) => localStorage.setItem("orbit-theme", theme),
        theme,
      );
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/v2/dashboard");
      const launcher = page.getByRole("button", {
        name: "Open assistant",
        exact: true,
      });
      await launcher.click();
      const panel = page.getByTestId("v2-assistant-panel");
      const shell = page.locator(".v2-assistant");
      await expect(
        panel.getByText(
          "I have prepared the plan and created the required tasks.",
        ),
      ).toBeVisible();
      await expect(shell).toHaveAttribute("data-mode", "compact");
      await expect(
        panel.getByRole("button", { name: "Expand chat", exact: true }),
      ).toHaveCount(0);
      const composer = panel.getByRole("textbox", {
        name: "Message",
        exact: true,
      });
      await composer.fill("Review the glass chat layout");
      for (const mode of ["compact", "docked"]) {
        if (mode === "docked")
          await panel
            .getByRole("button", { name: "Dock chat to the side", exact: true })
            .click();
        await expect(shell).toHaveAttribute("data-mode", mode);
        await expect(composer).toHaveValue("Review the glass chat layout");
        const box = (await panel.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        expect(box.y + box.height).toBeLessThanOrEqual(901);
        if (mode === "compact") {
          const inset = width < 768 ? 12 : 24;
          expect(box.x + box.width).toBeCloseTo(width - inset, 0);
          expect(box.y + box.height).toBeCloseTo(900 - inset, 0);
        }
        for (const button of await panel
          .locator(".v2-assistant-header button")
          .all()) {
          await expect(button).toBeInViewport();
          expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(
            44,
          );
        }
        expect(
          await panel.evaluate((el) => el.scrollWidth <= el.clientWidth),
        ).toBe(true);
        await page.screenshot({
          path: `/tmp/v2-chat-${theme}-${width}-${mode}.png`,
        });
      }
      await panel
        .getByRole("button", { name: "Compact chat", exact: true })
        .click();
      await expect(shell).toHaveAttribute("data-mode", "compact");
      await composer.press("Enter");
      await expect(
        panel.getByText(
          "Phản hồi mẫu từ Orbit Agent cho: Review the glass chat layout",
        ),
      ).toBeVisible();
      await panel.getByRole("button", { name: "History", exact: true }).click();
      await page.keyboard.press("Escape");
      await expect(panel).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(panel).not.toBeVisible();
      await expect(launcher).toBeFocused();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
  }
}

for (const width of [320, 1440]) {
  test(`Long messages, tools and a multiline draft stay contained at ${width}px`, async ({
    page,
  }) => {
    await agentWorkspaceFixture(page, {
      initialMessages: [
        {
          id: "rich-user",
          sender: "user",
          text:
            "Review the release notes and this very long reference: " +
            "workspace".repeat(20),
          timestamp: "2026-11-18T10:00:00Z",
        },
        {
          id: "rich-agent",
          sender: "bot",
          text:
            "## Layout notes\n\n- Keep controls visible.\n- Preserve the draft.\n\n```typescript\nconst reference = '" +
            "workspace".repeat(25) +
            "';\n```",
          timestamp: "2026-11-18T10:00:01Z",
        },
      ],
    });
    await page.addInitScript(() => localStorage.setItem("orbit-theme", "dark"));
    await page.setViewportSize({ width, height: width === 320 ? 568 : 900 });
    await page.goto("/v2/dashboard");
    await page
      .getByRole("button", { name: "Open assistant", exact: true })
      .click();
    const panel = page.getByTestId("v2-assistant-panel");
    await expect(
      panel.getByRole("heading", { name: "Layout notes", exact: true }),
    ).toBeVisible();
    const input = panel.getByRole("textbox", { name: "Message", exact: true });
    await input.fill(
      "Review the release\nPreserve my notes\nKeep controls visible\nAllow scrolling\nThis draft spans several lines\nFinal detail",
    );
    await panel
      .getByRole("button", { name: "Expand options", exact: true })
      .click();
    await expect(
      panel.getByRole("button", { name: "Send message", exact: true }),
    ).toBeInViewport();
    expect(
      await panel
        .locator(".chat-input-form")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    expect(
      await panel
        .locator(".chat-messages")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.screenshot({ path: `/tmp/v2-chat-rich-${width}.png` });
  });
}

test("Vietnamese controls and reduced transparency work on a narrow screen", async ({
  page,
  context,
}) => {
  await agentWorkspaceFixture(page);
  await page.addInitScript(() => localStorage.setItem("orbit.language", "vi"));
  await page.setViewportSize({ width: 320, height: 700 });
  const session = await context.newCDPSession(page);
  await session.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
  });
  await page.goto("/v2/dashboard");
  const launcher = page.getByTestId("v2-assistant-trigger");
  await launcher.click();
  const panel = page.getByTestId("v2-assistant-panel");
  await expect(panel).toHaveCSS("backdrop-filter", "none");
  await panel
    .getByRole("button", { name: "Ghim chat sang bên", exact: true })
    .click();
  await expect(page.locator(".v2-assistant")).toHaveAttribute(
    "data-mode",
    "docked",
  );
  await panel
    .getByRole("button", { name: "Thu nhỏ chat", exact: true })
    .click();
  await expect(page.locator(".v2-assistant")).toHaveAttribute(
    "data-mode",
    "compact",
  );
  expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await page.keyboard.press("Escape");
  await expect(launcher).toBeFocused();
});
