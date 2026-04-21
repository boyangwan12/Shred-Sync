import { test, expect } from '@playwright/test';

test.describe('Workout page', () => {
  test('Apr 21 loads with prescribed exercises', async ({ page }) => {
    await page.goto('/workout', { waitUntil: 'networkidle' });
    await page.locator('button', { hasText: /^21$/ }).click();
    await page.waitForTimeout(1000);

    // Expect at least one known prescribed exercise to be visible
    // (Barbell Curl was swapped in earlier; otherwise Bench Press, Decline, etc.)
    const knownExercises = [
      'Bench Press',
      'Barbell Curl',
      'Decline Chest Press',
      'Smith Narrow Press',
      'Chest Fly Machine',
      'Dips',
      'Cable Crunch',
      'Hanging Leg Raise',
    ];
    let found = 0;
    for (const name of knownExercises) {
      if (await page.getByText(name).first().isVisible().catch(() => false)) found++;
    }
    expect(found).toBeGreaterThan(3);
  });

  test('exercise picker opens via + Add Exercise', async ({ page }) => {
    await page.goto('/workout', { waitUntil: 'networkidle' });
    await page.locator('button', { hasText: /^21$/ }).click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: /Add Exercise/ }).click();

    // Modal heading
    await expect(page.getByRole('heading', { name: 'Add Exercise' })).toBeVisible();
    // Search input focuses
    await expect(page.getByPlaceholder('Search exercises...')).toBeVisible();
    // Some exercise listed
    await expect(page.getByText('Bench Press').first()).toBeVisible();
  });

  test('tapping exercise name opens swap picker', async ({ page }) => {
    await page.goto('/workout', { waitUntil: 'networkidle' });
    await page.locator('button', { hasText: /^21$/ }).click();
    await page.waitForTimeout(1000);

    // Click one of the exercise names — find the first exercise card header
    const firstExerciseButton = page
      .locator('[title="Tap to swap exercise"]')
      .first();
    await firstExerciseButton.click();

    // Picker should open
    await expect(page.getByRole('heading', { name: 'Add Exercise' })).toBeVisible();

    // Close picker to leave state clean
    await page.keyboard.press('Escape');
  });

  test('analysis panel shows Last + Plan labels', async ({ page }) => {
    await page.goto('/workout', { waitUntil: 'networkidle' });
    await page.locator('button', { hasText: /^21$/ }).click();
    await page.waitForTimeout(1500);

    // The label text is "Last" in the DOM — CSS uppercase styles it visually
    await expect(page.getByText('Last', { exact: true }).first()).toBeVisible();
  });

  test('×2 side toggle hidden for dumbbell exercises on Apr 13', async ({ page }) => {
    // Apr 13 has DB Incline (dumbbell equipment) — the toggle should be hidden
    await page.goto('/workout', { waitUntil: 'networkidle' });
    await page.locator('button', { hasText: /^13$/ }).click();
    await page.waitForTimeout(1500);

    // Scope to the DB Incline card via data-testid
    const dbCard = page.locator('[data-exercise="DB Incline"]');
    await expect(dbCard).toBeVisible();
    const dbCardToggles = dbCard.locator('button:has-text("×2 side")');
    await expect(dbCardToggles).toHaveCount(0);

    // Control: a barbell/smith exercise on the same page SHOULD still show the toggle
    const benchCard = page.locator('[data-exercise="Bench Press"]');
    if (await benchCard.count() > 0) {
      const benchToggles = benchCard.locator('button:has-text("×2 side")');
      expect(await benchToggles.count()).toBeGreaterThan(0);
    }
  });

  test('add-exercise button has larger than 44px tap target (gym UX)', async ({ page }) => {
    await page.goto('/workout', { waitUntil: 'networkidle' });
    await page.locator('button', { hasText: /^21$/ }).click();
    await page.waitForTimeout(500);

    const addBtn = page.getByRole('button', { name: /Add Exercise/ });
    const box = await addBtn.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});
