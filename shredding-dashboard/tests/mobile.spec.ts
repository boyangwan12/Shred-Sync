import { test, expect, type Page } from '@playwright/test';

// These assertions pass trivially on wide desktop viewports and are meaningful
// on the mobile project. No skip guard needed.

async function noHorizontalScroll(page: Page) {
  // body shouldn't be wider than the viewport — horizontal scroll = bad mobile UX
  const overflow = await page.evaluate(() => {
    return {
      doc: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    };
  });
  expect(overflow.doc).toBeLessThanOrEqual(overflow.client + 1); // +1 for rounding
}

test.describe('Mobile — layout + tap targets', () => {
  test('dashboard: no horizontal overflow', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await noHorizontalScroll(page);
  });

  test('food page: no horizontal overflow, calendar + tables fit', async ({ page }) => {
    await page.goto('/food', { waitUntil: 'networkidle' });
    await noHorizontalScroll(page);
    // Calendar visible
    await expect(page.locator('text=Apr 2026').first()).toBeVisible();
    // Pick a seeded date
    await page.locator('button', { hasText: /^13$/ }).click();
    await page.waitForTimeout(500);
    await noHorizontalScroll(page);
  });

  test('workout page: no horizontal overflow', async ({ page }) => {
    await page.goto('/workout', { waitUntil: 'networkidle' });
    await noHorizontalScroll(page);
    await page.locator('button', { hasText: /^21$/ }).click();
    await page.waitForTimeout(1000);
    await noHorizontalScroll(page);
  });

  test('nav links are reachable on mobile', async ({ page }) => {
    await page.goto('/food', { waitUntil: 'networkidle' });
    // The nav should be visible or accessible (may hide behind a hamburger if you add one)
    const foodLink = page.getByRole('link', { name: 'Food' });
    await expect(foodLink).toBeVisible();
    const workoutLink = page.getByRole('link', { name: 'Workout' });
    await expect(workoutLink).toBeVisible();
  });

  test('calendar day buttons are at least 40px tall on mobile', async ({ page, viewport }) => {
    test.skip(!viewport || viewport.width >= 640, 'desktop uses a compact calendar');
    await page.goto('/food', { waitUntil: 'networkidle' });
    const dayButton = page.locator('button', { hasText: /^13$/ }).first();
    const box = await dayButton.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeGreaterThanOrEqual(40);
  });

  test('add-exercise button keeps 44px tap target on mobile', async ({ page }) => {
    await page.goto('/workout', { waitUntil: 'networkidle' });
    await page.locator('button', { hasText: /^21$/ }).click();
    await page.waitForTimeout(500);
    const addBtn = page.getByRole('button', { name: /Add Exercise/ });
    const box = await addBtn.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe('Mobile — visual smoke (screenshots)', () => {
  test('capture dashboard, food, workout', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500); // chart render
    await page.screenshot({ path: 'tests/screenshots/mobile-dashboard.png', fullPage: true });

    await page.goto('/food', { waitUntil: 'networkidle' });
    await page.locator('button', { hasText: /^13$/ }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/mobile-food-apr13.png', fullPage: true });

    await page.goto('/workout', { waitUntil: 'networkidle' });
    await page.locator('button', { hasText: /^21$/ }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'tests/screenshots/mobile-workout-apr21.png', fullPage: true });
  });
});
