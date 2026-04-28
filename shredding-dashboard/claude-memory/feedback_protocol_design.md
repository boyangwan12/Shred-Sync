---
name: feedback_protocol_design
description: User's protocol-design preferences for the daily cutting-phase coaching workflow — decisions made during the deep-interview revision on 2026-04-27, intended to prevent reopening settled questions
type: feedback
---

User established these protocol design preferences during the deep-interview revision on 2026-04-27. Each was tested and confirmed in conversation; treat them as durable design rules.

## 1. Real-life logistics drive the schedule, not theoretical optimization

Locked schedule: wake 7 AM, breakfast 7:30, coffee 10:30, lunch 12:30, pre-workout carbs 4:00 PM, **workout 5:00 PM**, dinner 7:00 PM (single meal = post-workout refuel + dinner combined, finish by 7:30 PM, hard cutoff 7:45 PM), tomorrow planning 9 PM, predictions 9:30 PM, sleep 11 PM.

**Why:** earlier draft used 4:30 PM workout for "optimal" recovery timing — user pushed back: gym opens at 5, drive-home + heat-food makes 6:00 PM dinner impossible. Schedule had to match reality.

**How to apply:** when locking or revising any timing, ask about real-world constraints (gym hours, commute, meal prep, work meetings) BEFORE proposing optimal times. Adherence > theoretical perfection.

## 2. Don't re-run analytical work twice in the same day

The 7:15 AM morning adjustment uses HRV + sleep + weight + energy to classify the day (green/yellow/red) and revise the workout. The 4:00 PM touchpoint is **lightweight** (recap + carb reminder + optional subjective check), NOT a fresh analysis.

**Why:** by 4:00 PM no new objective data has come in (HRV is wake-only). Re-running the same analysis at 4 PM would produce identical output — wasted compute + push notification fatigue.

**How to apply:** when adding analytical touchpoints, verify there's NEW data feeding them. If no new objective input has arrived since the previous analytical pass, the new touchpoint is at most a reminder/recap. Subjective re-evaluation is fine but should be opt-in (user-triggered), not auto.

## 3. Food logging happens once at 9 PM, not per-meal

Meals are planned the night before via the 9 PM tomorrow-planning session — written to `mealPlan` AND auto-created as `foodItem` rows for tomorrow with status "planned". User eats silently throughout the day. Deviations (rare) get reported anytime, OR consolidated at the 9 PM end-of-day confirm step.

**Why:** decision fatigue minimization, fewer notifications, faster day. Food deviations are ~1-2 per week, so per-meal touchpoints are mostly redundant. Total daily phone time target: <15 min.

**How to apply:** never push a "log your lunch" or "log your dinner" notification. Default state of `foodItem` rows IS the logged intake; only update on user-reported deviation. The 9 PM session does double duty: end-of-day confirm + tomorrow planning.

## 4. Falsifiable predictions are the legitimacy gate

Every evening at 9:30 PM, Claude produces tomorrow's forecast (weight, HRV, training plan). Every morning at 7:15 AM, the actual data is compared against the prediction and the delta is written to a `prediction` ledger.

**Target accuracy:**
- Next-morning weight: ±0.5 lb on 5 of 7 days
- 7-day rolling weight: ±0.3 lb at end of week
- HRV directional: correct direction on 6 of 7 days
- Workout performance: hit-your-reps rate ≥80% on Claude-prescribed sets

**Why:** without a measurable test, the analysis is unfalsifiable. With it, user can independently verify the model is calibrated. The user added this criterion explicitly during the deep interview — treat it as the most important success criterion.

**How to apply:** never skip generating tomorrow's prediction. If accuracy drops below 60% over a 7-day window, recalibrate the model (don't paper over). Surface accuracy delta visibly so the user can audit.

## 5. Three interaction modes — don't conflate them

- **Pure auto** (no user input): server cron fires headless `claude -p`, reads/writes Turso, pushes summary. Examples: 7:15 AM morning adjustment (after data is logged), 9:30 PM tomorrow predictions + workout pre-log.
- **User-prompted** (cron pushes notification, user taps and inputs): morning checkin (7 AM), pre-workout reminder (4 PM, optional), tomorrow planning + day wrap (9 PM).
- **Reactive only** (no cron, user-initiated): ad-hoc questions, mid-day deviation reports, debugging, education.

**Why:** automation budget is finite, and notification fatigue is real. Auto-trigger only what truly needs no input.

**How to apply:** when adding any new touchpoint, explicitly classify the mode. If user input is required, justify why and consider batching with an existing user-prompted touchpoint.

## 6. The workout pre-log is part of the 9:30 PM cron

Tomorrow's `workoutExercise` + `workoutSet` rows are auto-generated at 9:30 PM by the same cron that produces the prediction. Logic:
- Read tomorrow's `day_type` from cycle (rest/push/pull/legs)
- Pull last session of same day_type
- Apply progression rules: RPE ≤8 → +1 rep target; RPE 9-10 → match; missed reps → drop 5%
- Pull strength baselines from `project_strength_baselines.md` memory
- Generate warmup ramp + working sets + back-off set
- Write to DB + briefing to `daily_log.notes`

**Why:** previous manual pattern (Claude running `prepopulate-{date}.ts` scripts) was the right logic but required human invocation. The cron formalizes it. The morning adjustment can revise these rows if signal warrants.

**How to apply:** when generating a workout, ALWAYS reference the strength baselines memory file for working weights. Never invent weights. If a baseline is missing, fall back to the last actual session's data.

## 7. Don't pre-fill meal plans — show macro budget remaining instead

When the user asks to plan tomorrow's food, **do not generate a full per-meal grams breakdown unless they explicitly ask for one**. Their actual meal composition depends on:
- What's physically in the fridge that day
- What they feel like eating
- Logistics (cooking time, work schedule)
- Leftovers that need finishing

**What to give instead:** the **macro budget remaining** after committing to known foods (like leftovers they want to use up).

Example flow:
```
User: "I have 262g raw pork ribs to use tomorrow"
Claude: "Tomorrow REST day target is 153P / 75C / 55F / 1400 kcal.
         262g raw ribs cooked ≈ 32P / 24F / 340 kcal.
         Remaining: 121P / 31F / 75C / 1060 kcal."
```

That's it. User picks the rest based on fridge contents.

**Why:** the user pushed back on pre-filled plans on 2026-04-27 ("i dont want you to fill up preload the food plan, it highly depends on what i want to eat and what are in the fridge, just tell me the left of macros"). They want Claude as an optimizer / accountant, not a meal designer.

**How to apply:**
- Default response to "plan food" = show remaining macro budget after known commitments
- Only generate full per-meal plans when user explicitly says "give me grams for X, Y, Z" with specific ingredients
- Even when generating per-meal plans, present them as suggestions to verify against the fridge, not as commitments

## When to revisit these preferences

- After 4 weeks of protocol use, if any criterion is failing (e.g., adherence dropping, prediction accuracy <60%), reopen the relevant preference for revision
- If user says "this isn't working" or proposes a structural change, treat as a signal to recalibrate this memory
- If the protocol scales beyond 12 weeks (i.e., user wants to keep using it post-cut), revisit goal #4 — the success criteria may need to shift from "lose weight" to "maintain composition"
