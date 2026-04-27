---
name: project_calibrated_targets
description: Data-calibrated calorie/macro targets per day type — tightened 2026-04-26 after first calibration came up short of plan rate
type: project
originSessionId: 0489599e-6d50-4105-8a8d-9d1f4b6e222c
---
## Current targets (tightened 2026-04-26)

| Day type | TDEE estimate | Calorie target | Protein | Carbs | Fat |
|----------|---------------|----------------|---------|-------|-----|
| Rest (Low) | 1,860 | **1,400** | 153g | 75g | 55g |
| Push (Low) | 2,320 | **1,800** | 153g | 100g | 88g |
| Pull (Low) | 2,355 | **1,800** | 153g | 100g | 88g |
| Legs (High) | 2,445 | **2,000** | 153g | 250g | 43g |

Cycle-weighted average target: ~1,744 kcal/day → ~490 kcal/day deficit vs 2,234 maintenance → ~0.98 lb/week (closer to plan's 0.81 with margin for refeed overshoots).

## Why this iteration (2026-04-26)

User asked "am I behind plan or faster" on Apr 26. Data: 7-day rolling weight 152.83 vs plan target 151.10 = **−1.73 lb behind** at week 2.7. Real loss rate over 19 days was 0.33 lb/week vs plan 0.81 lb/week (41% of plan pace). At previous pace user would land at 149.7 lb on Jun 30 (3.7 lb short of 146 goal).

**Decision:** trim 100 kcal/day across all day types (cut from fat — protein and carbs unchanged). User chose tightening over cardio for first iteration; cardio reserved for week 2 if hunger/HRV stay manageable.

## History

**2026-04-26 (current):** tightened targets above, after the initial calibration produced 41% of plan loss rate.

**2026-04-25 (previous):**
| Day | kcal | P | C | F |
|-----|------|---|---|---|
| Rest | 1,500 | 153 | 75 | 65 |
| Push | 1,900 | 153 | 100 | 100 |
| Pull | 1,900 | 153 | 100 | 100 |
| Legs | 2,100 | 153 | 250 | 50 |

Replaced Notion's formula-derived targets (rest 1,600 / push 2,100 / pull 2,100 / legs 2,200) which assumed maintenance ~2,393 kcal/day. Real maintenance from 18 days of cutting data was ~2,234 kcal/day due to adaptive thermogenesis + NEAT suppression.

## How to apply

- Use current targets when creating new daily_log rows or evaluating intake from Apr 26 forward
- Do NOT retroactively change targets on Apr 7–25 logs (preserves historical record showing the calibration progression)
- Apr 26 daily_log targets already updated to the tightened values

## Recalibrate again if

- Loss rate stays below 0.5 lb/week for 2+ weeks at the tightened targets (deficit still too small or further adaptation)
- Loss rate exceeds 1.2 lb/week (overshoot, risk LBM loss — back off)
- Bodyweight crosses 148 lb (sub-2,200 maintenance regime probably; recalculate)
- Hunger becomes unmanageable / refeed urges spike (back off slightly, add cardio instead)
- HRV stays below 70 for 3+ consecutive days (over-stress, deload)

## Cardio (deferred — re-evaluate Week 2)

If tightened targets alone don't restore plan rate within 7 days, add cardio:
- 2 sessions/week, 25–30 min, zone 2 (60–70% max HR)
- Best placement: rest day mornings, 24h+ post-legs, 24h+ pre-next-training
- Avoid: high-intensity intervals, pre-legs day, evening sessions
