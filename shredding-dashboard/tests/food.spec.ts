import { test, expect } from '@playwright/test';

test.describe('Food page', () => {
  test('loads with calendar and header', async ({ page }) => {
    await page.goto('/food', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Food', exact: true })).toBeVisible();
    await expect(page.locator('text=Apr 2026').first()).toBeVisible();
  });

  test('Apr 13 shows full meal breakdown with day-type chip', async ({ page }) => {
    await page.goto('/food', { waitUntil: 'networkidle' });
    await page.locator('button', { hasText: /^13$/ }).click();

    // Day type chip
    await expect(page.locator('text=/push.*low/i').first()).toBeVisible();

    // Meal sections — Breakfast, Lunch, Pre-workout, Post-workout all present
    await expect(page.getByText('Breakfast', { exact: true })).toBeVisible();
    await expect(page.getByText('Lunch', { exact: true })).toBeVisible();
    await expect(page.getByText('Pre-workout', { exact: true })).toBeVisible();
    await expect(page.getByText('Post-workout', { exact: true })).toBeVisible();

    // Known items
    await expect(page.getByText('Chicken thigh').first()).toBeVisible();
    await expect(page.getByText('卤牛肉').first()).toBeVisible();
    await expect(page.getByText('Walnuts').first()).toBeVisible();

    // Daily total row exists
    await expect(page.getByText('Daily total', { exact: true })).toBeVisible();
  });

  test('Apr 9 shows empty state (no food logged)', async ({ page }) => {
    await page.goto('/food', { waitUntil: 'networkidle' });
    await page.locator('button', { hasText: /^9$/ }).click();
    await expect(page.getByText(/No food logged for 2026-04-09/)).toBeVisible();
  });

  test('target % chips render and call out over-target days', async ({ page }) => {
    // Apr 17 = BBQ blowout, calories 2500 vs target 2100 (119%)
    await page.goto('/food', { waitUntil: 'networkidle' });
    await page.locator('button', { hasText: /^17$/ }).click();
    await expect(page.getByText('烧烤 (mixed BBQ skewers)')).toBeVisible();
    // Should show "over" somewhere (fat almost certainly over)
    await expect(page.locator('text=/over/i').first()).toBeVisible();
  });
});
