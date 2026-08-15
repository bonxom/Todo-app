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
    await expect(page.getByRole('heading', { name: /control the day/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /start your orbit/i })).toHaveAttribute('href', '/register');
    await page.locator('#focus').scrollIntoViewIfNeeded();
    await expect(page.getByRole('heading', { name: /turn progress into momentum/i })).toBeVisible();
    await page.locator('.launch-cta').scrollIntoViewIfNeeded();
    await expect(page.getByRole('link', { name: /launch your workspace/i })).toBeVisible();

    assertNoConsoleErrors();
  });

  test('stacks the guest landing on mobile without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /control the day/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /start your orbit/i })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test('keeps narrative content visible with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /bring work into orbit/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /shape the workspace/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /turn progress into momentum/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /start with a clear orbit/i })).toBeVisible();
    await expect(page.getByText('68%').first()).toBeVisible();
  });
});
