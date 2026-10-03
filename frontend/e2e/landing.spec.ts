import { expect, test, type Page } from '@playwright/test';

const collectConsoleErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  return () => expect(errors).toEqual([]);
};

test.describe('Orbit Control landing', () => {
  test('shows the guest desktop story without console errors', async ({ page }) => {
    const assertNoConsoleErrors = collectConsoleErrors(page);

    await page.goto('/');
    await expect(page.getByRole('heading', { name: /know what needs doing/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /create your workspace/i })).toHaveAttribute('href', '/register');
    await page.locator('#focus').scrollIntoViewIfNeeded();
    await expect(page.getByRole('heading', { name: /see what’s done and what’s next/i })).toBeVisible();
    await page.locator('.launch-cta').scrollIntoViewIfNeeded();
    await expect(page.getByRole('link', { name: /create an account/i })).toBeVisible();

    assertNoConsoleErrors();
  });

  test('stacks the guest landing on mobile without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /know what needs doing/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /create your workspace/i })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test('keeps narrative content visible with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /add tasks while they’re fresh/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /keep related work together/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /see what’s done and what’s next/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /start with your first task/i })).toBeVisible();
    await expect(page.getByText('68%').first()).toBeVisible();
  });
});
