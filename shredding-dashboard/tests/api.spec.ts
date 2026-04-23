import { test, expect } from '@playwright/test';

test.describe('API: date validation', () => {
  test('food API accepts valid YYYY-MM-DD', async ({ request }) => {
    const res = await request.get('/api/food/2026-04-13');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.date).toBe('2026-04-13');
    expect(body.items.length).toBeGreaterThan(0);
  });

  test('food API rejects malformed date', async ({ request }) => {
    const res = await request.get('/api/food/not-a-date');
    expect(res.status()).toBe(400);
  });

  test('workout API accepts valid YYYY-MM-DD', async ({ request }) => {
    const res = await request.get('/api/workout/2026-04-21');
    expect(res.status()).toBe(200);
  });

  test('workout API rejects malformed date', async ({ request }) => {
    const res = await request.get('/api/workout/bad');
    expect(res.status()).toBe(400);
  });
});

test.describe('API: input validation', () => {
  test('exercises search rejects query > 100 chars', async ({ request }) => {
    const longQuery = 'x'.repeat(150);
    const res = await request.get(`/api/exercises?search=${longQuery}`);
    expect(res.status()).toBe(400);
  });

  test('exercises search under 100 chars works', async ({ request }) => {
    const res = await request.get('/api/exercises?search=bench');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('workout PUT rejects non-array exercises', async ({ request }) => {
    const res = await request.put('/api/workout/2026-04-21', {
      data: { exercises: 'not an array' },
    });
    expect(res.status()).toBe(400);
  });

  test('workout PUT rejects invalid weightLbs', async ({ request }) => {
    const res = await request.put('/api/workout/2026-04-21', {
      data: {
        exercises: [
          {
            exerciseId: 1,
            sortOrder: 0,
            sets: [{ setNumber: 1, weightLbs: 99999, reps: 5 }],
          },
        ],
      },
    });
    expect(res.status()).toBe(400);
  });

  test('workout PUT rejects reps out of range', async ({ request }) => {
    const res = await request.put('/api/workout/2026-04-21', {
      data: {
        exercises: [
          {
            exerciseId: 1,
            sortOrder: 0,
            sets: [{ setNumber: 1, weightLbs: 70, reps: -5 }],
          },
        ],
      },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe('API: data shape', () => {
  test('food API returns expected shape', async ({ request }) => {
    const res = await request.get('/api/food/2026-04-13');
    const body = await res.json();
    expect(body).toMatchObject({
      date: expect.any(String),
      dayType: expect.any(String),
      carbType: expect.any(String),
      targets: {
        calories: expect.any(Number),
        proteinG: expect.any(Number),
      },
      items: expect.any(Array),
    });
  });

  test('exercise history endpoint returns sorted recent sessions', async ({ request }) => {
    const res = await request.get('/api/exercises/1/history?limit=5');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    // Dates should be in descending order if any returned
    if (body.length >= 2) {
      expect(body[0].date >= body[1].date).toBe(true);
    }
  });

  // Regression: daily_logs.caloriesActual must reflect food_plan_items sums.
  // Previously, calories_actual was a manual column that drifted from logged items.
  test('logs API caloriesActual matches sum of food_plan_items for the day', async ({ request }) => {
    const date = '2026-04-13';
    const foodRes = await request.get(`/api/food/${date}`);
    const food = await foodRes.json();
    if (!food.items || food.items.length === 0) return;
    const expectedCals = food.items.reduce(
      (acc: number, it: { calories: number | null }) => acc + (it.calories ?? 0),
      0
    );

    const logsRes = await request.get(`/api/logs?from=${date}&to=${date}`);
    const logs = await logsRes.json();
    expect(logs.length).toBe(1);
    expect(logs[0].caloriesActual).toBe(expectedCals);
  });
});
