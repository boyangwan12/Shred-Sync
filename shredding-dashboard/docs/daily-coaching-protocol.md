# Deep Interview Spec: Daily Cutting-Phase Coaching Protocol

## Metadata

- **Interview ID:** dcp-2026-04-27
- **Rounds:** 6
- **Final Ambiguity Score:** 11.5%
- **Type:** brownfield (existing shred-sync dashboard, memory system, conversational coaching pattern)
- **Generated:** 2026-04-27
- **Threshold:** 20%
- **Status:** PASSED

## Clarity Breakdown

| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.95 | 0.35 | 0.3325 |
| Constraint Clarity | 0.85 | 0.25 | 0.2125 |
| Success Criteria | 0.85 | 0.25 | 0.2125 |
| Context Clarity | 0.85 | 0.15 | 0.1275 |
| **Total Clarity** | | | **0.885** |
| **Ambiguity** | | | **0.115** |

---

## Goal

Standardize the daily interaction between the user (Boyang, mid-cut) and Claude into a fixed, multi-device, data-backed coaching protocol that runs autonomously across the remaining 9 weeks of the 12-week cut (Apr 27 – Jun 30, 2026).

The protocol must:
1. Lock the daily timeline so circadian/hormonal/training rhythms are stable
2. Define what data flows where, when, and via which surface (server, dashboard, mobile, conversation)
3. Make Claude's role purely high-leverage (analysis, optimization, prediction) — not data clerking
4. Make every training and nutrition adjustment data-backed, not vibes-based
5. Provide a falsifiable accuracy gate (next-morning weight prediction) so the user can independently verify the analysis is legitimate
6. Run from a single persistent Claude session on the home Ubuntu server, accessible from Macbook + phone, with native push notifications for reminders

---

## Locked Daily Schedule

| Time | Event | Touchpoint | Surface |
|------|-------|------------|---------|
| 7:00 AM | Wake + morning checkin | Push: log weight + HRV + sleep + energy | Phone |
| 7:15 AM | Morning adjustment round | Auto: Claude reads actuals vs last night's forecast, revises today's plan if signal warrants, pushes summary | Phone (push) |
| 7:30 AM | Breakfast (P/F, no carbs) | Auto-log via prior plan or quick prompt | Phone |
| 10:30 AM | Coffee #1 (with food) | — | — |
| 12:30 PM | Lunch (P/F) | Eat planned meal silently — no touchpoint | — |
| 4:00 PM | Pre-workout reminder + carbs | Push: recap today's plan (already revised at 7:15 AM), reminder to eat 30g carbs, optional subjective energy check | Phone |
| 5:00 PM | Workout | Workout page open | Dashboard (Phone or Macbook) |
| 6:30 PM | Workout ends, drive home + heat food | — | — |
| 7:00 PM | **Dinner (post-workout + dinner combined, single meal)** | Eat planned meal silently; finish by 7:30 PM | — |
| 9:00 PM | Tomorrow food planning | Push: "what ingredients tomorrow? I'll plan grams" | Phone |
| 9:30 PM | Tomorrow predictions + workout pre-log | Claude generates weight/HRV forecast AND writes tomorrow's full workout to `workoutExercise` rows | Server (auto) |
| 11:00 PM | Sleep | — | — |

**Tolerance bands:** sleep ±30 min, meals ±60 min, workout ±2 hours.

**Deviation handling:** if the user signals "today is different" (travel, illness, social event), the protocol relaxes constraints for the day, logs the deviation reason in the daily_log, and resumes normal the next day. Deviations are NOT failures — they're tracked data.

---

## Constraints

- **No Anthropic API billing.** Must use Claude Max subscription only.
- **Multi-device access.** Mobile (phone) + laptop (Macbook) + server (Ubuntu) all see the same conversation.
- **24/7 server availability.** Home Ubuntu server runs the persistent Claude session.
- **Image input required** (food photos via phone camera).
- **Push notifications required** for reminders so user doesn't forget to log.
- **Data adjustments throughout the cut** — protocol must support weekly recalibration of targets/baselines/predictions based on accumulating data.
- **Existing infrastructure must be respected:**
  - Turso production DB (single source of truth)
  - shred-sync Next.js dashboard (Render-deployed)
  - Memory system at `~/.claude/projects/-Users-wanby-my-files-projects-shred-sync/memory/`
  - Notion hub as external reference
- **No bot bridges** (Discord/WhatsApp via tmux piping) — fragile and likely violates ToS.

---

## Non-Goals

- Building a Discord/WhatsApp/iMessage bot bridge.
- Replacing the existing dashboard with a mobile-native app.
- Automating food logging without human confirmation (food entry is the user's only "data clerk" task; everything else Claude does).
- Real-time HRV/heart-rate integration with Apple Watch (out of scope for v1; Apple Health export.xml stays read-only).
- A fully fixed schedule with zero deviation allowance — the protocol explicitly accommodates real life.

---

## Acceptance Criteria

### Adherence (4 criteria)

- [ ] Zero missed daily logs for 7 consecutive days. Every day has: morning weight, sleep duration + deep sleep + HRV, food intake (with macros), workout completed (or rest noted), evening energy/satiety.
- [ ] Every training adjustment (load, reps, exercise selection, deload decision) was data-backed by HRV + sleep + glycogen state + prior performance — not by gut feel that morning.
- [ ] Daily macros land within tolerance: protein hit always; carbs/fat within ±5% on training days, ±10% on rest days.
- [ ] Total daily user friction (logging weight, sleep, food, exercise, reading analysis) stays under 15 min/day.

### Falsifiable accuracy (1 criterion — the legitimacy gate)

- [ ] **Next-morning weight prediction accuracy:** ±0.5 lb on 5 of 7 days.
- [ ] **7-day rolling-average forecast accuracy:** ±0.3 lb at end of week.
- [ ] **HRV directional prediction:** correct direction (up/flat/down) on 6 of 7 days.
- [ ] **Workout performance prediction:** "hit your reps at this weight" rate ≥ 80% on Claude-prescribed sets.

### System operational (3 criteria)

- [ ] One persistent Claude session runs on the Ubuntu server, accessible from Macbook + phone.
- [ ] Push notifications fire reliably at the scheduled touchpoints.
- [ ] When a session restarts, the new Claude reads `BOOTSTRAP-CLAUDE.md` + `MEMORY.md` + `PROTOCOL.md` and has full context within one prompt.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Ubuntu Home Server (24/7)                               │
│   ─ `claude remote-control` (one persistent session)    │
│   ─ Logged into Max subscription                        │
│   ─ shred-sync repo cloned                              │
│   ─ ~/.claude/projects/.../memory/ synced from Macbook  │
│   ─ .env with Turso credentials                         │
│   ─ cron jobs for scheduled push reminders              │
│   ─ cron jobs for nightly auto-prediction generation    │
└────────┬───────────────────────────────────┬────────────┘
         │                                   │
         ↓ (Claude Code Remote Control)      ↓
┌────────────────────┐               ┌────────────────────┐
│ Phone — Claude     │               │ Macbook — SSH or   │
│ mobile app         │               │ claude.ai/code     │
│                    │               │                    │
│ • Native chat UI   │               │ • Full CLI / web   │
│ • Food photos      │               │ • Long-form work   │
│ • Push reminders   │               │ • Weekly reviews   │
└────────────────────┘               └────────────────────┘

         ↓ both surfaces feed into the same Claude ↓

┌─────────────────────────────────────────────────────────┐
│ shred-sync dashboard (Render)                           │
│   ─ Reads/writes Turso                                  │
│   ─ Direct logging surface (sets/reps, weight, HRV)     │
│   ─ Today's checklist + macro progress                  │
│   ─ Briefings rendered from daily_log.notes             │
│   ─ Per-muscle glycogen visualization                   │
│   ─ Forecast-vs-actual accuracy panel (NEW)             │
└─────────────────────────────────────────────────────────┘
```

---

## Touchpoint Specifications

### 7:00 AM — Morning Check-in (Phone push → 60 sec)

**Push notification:** "Morning checkin — weight, sleep, HRV, energy."

**User taps notification → opens phone Claude → I prompt:**
- Morning weight (lb)
- Sleep duration (hours)
- Deep sleep (min, from AutoSleep)
- HRV (ms, SDNN)
- wkBPM (waking heart rate)
- Energy (1-5)
- Anything off?

**Claude action:**
1. Write to Turso `daily_log` for today
2. Read last night's `prediction` row for today, compute deltas (weight, HRV, sleep)
3. Write predicted-vs-actual to the prediction ledger for accuracy tracking
4. Confirm receipt with one-line read of state and trigger the 7:15 AM adjustment round

### 7:15 AM — Morning Adjustment Round (auto, no user input)

**Trigger:** Fires automatically once morning checkin data is written. Conceptually a "second planning round" that uses real morning actuals instead of last night's projections.

**Why this exists:** Last night's plan was made with last night's data. By morning, the body has produced new signal — HRV, weight after fluid balance settled, deep sleep architecture, subjective energy. Ignoring that signal until 3:30 PM pre-workout adjustment wastes 8 hours where macros, hydration strategy, and workout intensity could already be tuned.

**Claude action:**
1. Read this morning's actuals (weight, HRV, sleep, energy) and yesterday-evening's `prediction` row for today
2. Read today's planned workout (`workoutExercise` rows) and meal plan (`mealPlan` rows)
3. Evaluate signal:
   - **Green** (HRV ≥120 AND sleep ≥7h AND energy ≥4): planned progression confirmed. If a heavy lift was deferred from last session, promote it to today.
   - **Yellow** (HRV 70-119 OR mixed signals): keep planned weights, hold off on rep/weight progressions. Match-only philosophy.
   - **Red** (HRV <70 OR sleep <5h OR energy ≤2 OR cumulative load high): cut top set load 5-10%, drop one accessory exercise, treat session as recovery work.
4. Apply adjustments to `workoutExercise` rows if change is warranted (preserve original plan in a `notes` field for audit)
5. Adjust today's macro targets if weight is significantly off-forecast:
   - Actual >1 lb above forecast → trim 50-100 kcal from today's fat (water-bounce day, no need to overeat)
   - Actual >1 lb below forecast on a non-refeed day → maintain (loss is real)
   - Actual matches forecast within ±0.5 lb → no change
6. Push summary to phone:
   ```
   Morning data: 151.9 (-0.1 vs forecast), HRV 152 (+22),
   sleep 6.8h (-0.2). Signal: GREEN. Today: squat plan
   confirmed, 一边100×4 PR target stays. No macro change.
   Tone: trust the plan, execute clean.
   ```

**Outputs to log:**
- Updated workout (if changed)
- Updated macro targets (if changed)
- Prediction-vs-actual delta written to `prediction` ledger (feeds tomorrow's forecast model — over time we learn whether the model systematically under- or over-predicts in different regimes)

### 12:30 PM — Lunch (no Claude touchpoint)

You eat the meal that was planned at 9 PM yesterday. No push notification, no logging session, no prompt. The `foodItem` rows for today's lunch were auto-created from `mealPlan` last night with status "planned" — they get treated as actual intake unless you report a deviation.

**If you eat something different than planned:** open the chat anytime ("ate 200g rice instead of 150g, no greens") and Claude updates the specific `foodItem` rows. Otherwise the planned meal is the logged meal.

### 4:00 PM — Pre-workout reminder + carbs (Phone push → 30 sec)

**Push notification:** "Pre-workout: {today's revised plan from 7:15 AM, 1-line summary}. Eat 30g carbs now. Energy 1-5? Tap if anything's off."

**Why this is lightweight (not a re-adjustment):** The analytical work using HRV, sleep, weight, and energy already happened at 7:15 AM. By 4:00 PM no new *objective* data has come in (HRV is measured at wake only, not mid-day). The 4:00 PM touchpoint exists primarily to:

1. Remind you to eat the carbs at the right time (60 min before workout)
2. Recap today's revised plan so you know what's queued without opening the dashboard
3. Capture *subjective* state change if energy crashed during the day (afternoon slump, food crash, work stress, unplanned cardio)

**Default behavior (no user input):** server cron pushes the summary, you eat the sweet potato, lift at 5 PM. Done in 30 sec total.

**Conditional re-evaluation:** if you report energy ≤2 or flag "feeling off" in response to the push, Claude re-evaluates using the new subjective signal:
- Drop top-set load 5%
- Skip 1 accessory
- Push revised plan back

**Cron action at 3:30 PM:** read today's already-revised workout (from 7:15 AM round), format the recap, schedule the 4:00 PM push. **No analytical work** — that already happened in the morning.

**Carb timing reasoning:** eat the 30g sweet potato (or other low-GI carb) at 4:00 PM exactly so blood glucose peaks during heavy compound sets at ~5:00-5:30 PM. 60-min lead time is the sweet spot for low-GI carb sources — see the digestion timeline analysis in conversation history.

### 5:00 PM — Workout (Dashboard — phone or laptop)

User logs sets/reps directly on the workout page (existing UX, already works). Claude does NOT need to be in the loop during the workout itself.

### 7:00 PM — Dinner = post-workout refuel (single meal)

The user's logistics: workout ends 6:30 PM → 20 min drive home → heat food → start eating ~7:00 PM. This single meal is **both** the post-workout refuel AND dinner — there is no separate post-workout snack.

**Timing math:**
- Workout ends 6:30 PM → eating starts 7:00 PM = 30-min post-workout delay. Still well within the 60-120 min GLUT4 elevation window. Glycogen refill is still preferential.
- Eating ends ~7:30 PM → 3.5 hours before 11 PM sleep. Acceptable for clean sleep.
- Hard cutoff: stop eating by 7:45 PM. Past that, sleep quality drops.

**No Claude touchpoint at the eating moment.** You eat the planned meal silently. If it deviates from plan, you'll report it during the 9:00 PM end-of-day confirm.

**Macro composition:** this meal carries the bulk of the day's carbs (because the rest of the day was P/F-dominant) and a full dinner protein portion + remaining fat budget.

For a push/pull day (1800 kcal target, 100g carbs, 88g fat, 153g protein):
- Breakfast already used: ~25g protein, ~20g fat, 0 carbs
- Lunch already used: ~50g protein, ~35g fat, 0 carbs
- Pre-workout used: ~30g carbs (sweet potato)
- **Dinner remaining target: ~78g protein, ~33g fat, ~70g carbs**

For a legs day (2000 kcal, 250g carbs, 43g fat, 153g protein):
- Breakfast: ~25g protein, ~10g fat, 0 carbs
- Lunch: ~50g protein, ~15g fat, ~30g carbs
- Pre-workout: ~30g carbs
- **Dinner remaining target: ~78g protein, ~18g fat, ~190g carbs** (this is the big refeed-style meal)

**End-of-day confirm flow:** at 9:00 PM, the tomorrow-planning session also asks "Today eaten as planned?" — if yes, the day's `foodItem` rows stay as auto-copies of `mealPlan`. If you report a deviation now, specific rows get updated.

### 9:00 PM — End-of-day food confirm + tomorrow planning (Phone → 5 min)

**Push notification:** "Day wrap. Today eaten as planned? + tomorrow's ingredients?"

This is the **only food touchpoint of the day**. Everything else (breakfast, lunch, pre-workout snack, dinner) was planned last night and the user eats it silently. This 9 PM session both closes today's books and opens tomorrow's plan.

**Step 1 — End-of-day confirm (~30 sec):**
1. Default: "today's foodItem rows stay as planned" (you eat what was planned)
2. If you report deviations now ("ate 200g rice instead of 150g, skipped the greens, added 1 boiled egg"), Claude updates the specific `foodItem` rows for today
3. Claude recomputes today's actual macros and writes the day's totals to `daily_log`

**Step 2 — Tomorrow planning (~3-4 min):**
1. You list available ingredients (proteins, carbs, veggies, fats)
2. Claude reads tomorrow's day_type (rest/push/pull/legs) from the cycle
3. Solves constrained-optimization: hit calories/P/C/F targets given available ingredients + locked schedule
4. Writes planned meals to `mealPlan` AND auto-creates corresponding `foodItem` rows for tomorrow with status "planned"
5. Displays: per-meal grams + macros + timing

**Why this combined flow:** food deviations are rare (~1-2 per week). Most days the end-of-day confirm is just "yes, ate as planned" — adds ~5 sec to the planning session. Combining keeps both food touchpoints in one phone session and reduces total daily notifications from 5 to 4.

### 9:30 PM — Auto-prediction + workout pre-log (Server cron, no user input)

This single cron job does **two things**: produces tomorrow's prediction AND writes tomorrow's workout plan to `workoutExercise` rows so the dashboard's `/workout` page is ready when you open it in the morning.

**Step 1 — Prediction:** server-side Claude reads today's data + last 7 days of trend, produces tomorrow's forecast:
- Predicted morning weight (lb, ±0.5)
- Predicted HRV range
- Predicted morning sleep state
- Writes to Turso `prediction` table keyed by tomorrow's date

**Step 2 — Workout pre-log:** if tomorrow is a training day, Claude writes the planned workout to `workoutExercise` rows:
1. Read tomorrow's `day_type` from the cycle (rest/push/pull/legs)
2. If `rest` → skip workout pre-log entirely
3. Else: pull the last session of the same day_type and analyze:
   - Top set weight × reps × RPE
   - Whether the user hit the planned target last time
4. Apply progression rules:
   - Last session hit reps cleanly (RPE ≤8): **+1 rep target** at same weight, OR step up to next weight if at rep ceiling
   - Last session was RPE 9-10: **match** (no progression)
   - Last session missed reps: **drop weight 5%** and rebuild
5. Pull strength baselines from `claude-memory/project_strength_baselines.md` to anchor working weights
6. Generate full warmup ramp (40% / 55% / 70% / working) appropriate to top-set load
7. Write `workoutExercise` rows + nested `workoutSet` rows for each exercise
8. Write a 1-paragraph briefing to `daily_log.notes` (renders as Session Briefing on the workout page)

**Step 3 — Combined push:**
```
Tomorrow forecast: 151.5 lb (-0.4 vs today), HRV 110-130,
push day. Plan ready: bench 一边70×6×3 + DB incline 45×8×3 +
shoulder press 一边50×8×3. Top set 一边70 chases +1 rep.
```

**This is the same job I (Claude) currently do manually via `scripts/prepopulate-{date}.ts` files.** Once Phase 4 lands, the cron + script does it automatically based on the same logic.

**If user wants to review/override before bed:** they can ask "what's tomorrow's workout?" during the 9 PM food planning session and Claude pre-generates it interactively. The 9:30 PM cron then sees rows already exist and skips Step 2.

**If 9:30 PM cron fails (e.g., DB hiccup):** the 7:15 AM morning adjustment detects the missing rows and generates the workout on-demand before the user opens the workout page.

### 11:00 PM — Sleep (no touchpoint — just hard cutoff for caffeine/food/screens)

---

## Data Flows (where each piece of data lives)

| Data | Source | Storage | Surface |
|------|--------|---------|---------|
| Morning weight, HRV, sleep | User → phone Claude | Turso `daily_log` | Dashboard |
| Food intake | User → phone Claude (photos OK) | Turso `foodItem` | Dashboard |
| Workout sets/reps | User → dashboard directly | Turso `workoutSet` | Dashboard |
| Briefings | Claude → Turso `daily_log.notes` | Turso | Dashboard |
| Predictions | Claude (cron) → Turso `prediction` (new table) | Turso | Dashboard accuracy panel |
| Memory (facts) | Claude → memory/*.md | Filesystem (synced to server) | Read by every Claude session |
| Schedule + protocol rules | This doc | `PROTOCOL.md` in repo | Reference |
| Bootstrap | Auto-loaded | `BOOTSTRAP-CLAUDE.md` in repo | Read by new Claude sessions |

---

## Implementation Phases

### Phase 1 — Server bootstrap (one-time, ~30-60 min)

1. SSH into Ubuntu server.
2. Install Node, claude CLI, git (if not present).
3. Clone shred-sync repo to `~/projects/shred-sync`.
4. Copy `.env` (Turso creds) from Macbook to server.
5. `claude /login` with Max subscription on the server.
6. Test: `cd shred-sync && claude` → confirm session works, can read Turso.
7. rsync `~/.claude/projects/-Users-wanby-my-files-projects-shred-sync/memory/` from Macbook to server.

### Phase 2 — Remote Control + mobile (one-time, ~10 min)

1. On server: `claude /config` → enable Remote Control.
2. On phone: install Claude mobile app, sign in with Max account, connect to server's session.
3. Test: send a message from phone → verify it appears in server's session → verify response gets push notified.

### Phase 3 — Protocol artifacts (this spec → durable docs)

1. Write `PROTOCOL.md` at repo root (this spec, condensed).
2. Write `BOOTSTRAP-CLAUDE.md` at repo root (loader for new sessions).
3. Add new Turso tables: `prediction`, `mealPlan`.
4. Add forecast-vs-actual accuracy panel to dashboard.

### Phase 4 — Cron automation (one-time, ~30 min)

Server cron jobs:
- 7:00 AM: push notification "morning checkin"
- 12:30 PM: push notification "lunch logging"
- 3:00 PM: run pre-workout adjustment script + push at 3:30 PM
- 6:00 PM: push notification "dinner logging"
- 9:00 PM: push notification "tomorrow planning"
- 9:30 PM: run auto-prediction script + push summary

Each cron task wakes the Claude session with a structured prompt that follows the touchpoint spec.

### Phase 5 — Validation week (Apr 28 – May 4)

Run protocol for 7 days. Track:
- All 4 adherence criteria
- All 4 prediction accuracy criteria
- Friction time logged daily

End of week: review with Claude → adjust protocol if any criterion failed.

---

## Assumptions Exposed & Resolved

| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| User wanted a Discord/WhatsApp bot | Subscription doesn't expose API; bot bridges are fragile | Use Claude Code Remote Control instead — official, supported, no API |
| User wanted markdown reference doc | User said "set up Discord or WhatsApp, push notifications" | Doc is one of three layers (memory + doc + bootstrap), not the whole solution |
| Variable schedule was acceptable | User asked "is fixed ideal?" — implicit confirmation that they want fixed | Lock the schedule with tolerance bands and explicit deviation handling |
| Logging-only success criteria were enough | User added "next-morning prediction accuracy" as a legitimacy gate | Added 4 falsifiable prediction accuracy criteria; this is the most important success criterion |
| One Claude session per device | User asked "how does server-Claude pick up our conversation?" | Use Remote Control: ONE session on server, multiple surfaces — no handoff needed |
| Push notifications need ntfy/Pushover | Per Anthropic docs, Claude mobile app has native push for Remote Control sessions | No third-party push needed for v1 |

---

## Technical Context

**Brownfield findings:**

- **Existing dashboard:** Next.js 16 (Turbopack), Prisma 7 with libsql adapter, Render-deployed, fully functional. Don't rebuild — add a forecast-accuracy panel.
- **Existing DB:** Turso (libsql) production, single source of truth. Adding tables (`prediction`, `mealPlan`) requires Prisma migration.
- **Existing memory system:** Already has `MEMORY.md` index + 7 memory files. Sync to server via rsync.
- **Existing constants:** `src/constants/targets.ts` already encodes day-type macros and tolerance philosophy. Protocol references this — no changes needed there.
- **Existing scripts:** `scripts/prepopulate-*.ts` pattern is the right shape for the touchpoint cron jobs. Reuse the pattern.
- **Server has another app running:** user is deployment-savvy, can self-execute Phase 1-4. Need to confirm port conflicts and resource availability before adding cron + claude session.

---

## Ontology (Final)

| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| User | core | profile, schedule, goals | follows Daily Protocol |
| Daily Protocol | core | timeline, touchpoints, success criteria | governs User and Claude interaction |
| Touchpoint | core | time, surface, action, push notification | belongs-to Daily Protocol |
| Claude Session | core | runs on Ubuntu Server | accessed-by Macbook + Phone |
| Ubuntu Server | infrastructure | runs claude remote-control + cron | hosts Claude Session |
| Mobile App | client | native chat + push + camera | connects-to Claude Session |
| Macbook Client | client | SSH / claude.ai/code | connects-to Claude Session |
| Dashboard | system | Next.js + Turso | reads/writes daily_log, mealPlan, prediction |
| Turso DB | infrastructure | daily_log, foodItem, workoutSet, prediction (new), mealPlan (new) | source of truth |
| Memory System | persistence | MEMORY.md + 7 typed memories | read-by Claude Session |
| Bootstrap Doc | persistence | session-start loader | read-by new Claude Session |
| Prediction Artifact | core | tomorrow's weight/HRV/workout forecast | falsifiable success criterion |
| Forecast Ledger | analytics | predicted vs actual table | drives accuracy KPI |
| Cron Reminders | automation | push at 7AM, 12:30PM, 3PM, 6PM, 9PM, 9:30PM | trigger Touchpoints |

## Ontology Convergence

| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|--------------|-----|---------|--------|-----------------|
| 1 | 8 | 8 | 0 | 0 | N/A |
| 2 | 11 | 4 | 0 | 7 | 64% |
| 3 | 14 | 3 | 0 | 11 | 79% |
| 4 | 14 | 0 | 0 | 14 | 100% (no entity change, schedule meta) |
| 5 | 14 | 0 | 0 | 14 | 100% |
| 6 | 19 | 5 | 0 | 14 | 74% |

Ontology stabilized between rounds 3-5, then expanded in round 6 with server-context entities (Bootstrap Doc, Cron Reminders, etc.) — these are implementation primitives, not new conceptual entities, so this is a healthy expansion not domain instability.

---

## Interview Transcript

<details>
<summary>Full Q&A (6 rounds)</summary>

### Round 1
**Q:** What form should this protocol take? (md doc / skill / dashboard checklist / hybrid)
**A:** "im chatting with you on my macbook, my personal computer, but i have a linux server sitting at home that runs 24/7, make to set up a discord or whatsapp thing, or remote control with you, i still want claude subscription not calling apis, in that case, i can talk with you on my phone, use the camera to shoot pics of food and you can also push notification for me to log things so i dont forget?"
**Ambiguity:** 73.5% (Goal 0.4, Constraints 0.5, Criteria 0.0, Context 0.0)

### Round 2
**Q:** Given no-API constraint, which channel architecture? (claude.ai/code mobile / Claude app / SSH / bot bridge)
**A:** "are you talking about remote control?" — clarification request, prompted research into Claude Code Remote Control feature.
**Ambiguity:** 52% (architecture pivoted to Remote Control after research; Goal 0.7, Constraints 0.7, Criteria 0.0, Context 0.4)

### Round 3
**Q:** What does success look like at end of week 1? (multi-select)
**A:** All four selected (zero missed logs, data-backed adjustments, macros within tolerance, <15 min friction) PLUS user added prediction accuracy criterion + asked about default push notifications.
**Ambiguity:** 29% (Goal 0.75, Constraints 0.7, Criteria 0.85, Context 0.4)

### Round 4
**Q:** Walk through your typical day so we can map touchpoints to clock times.
**A:** "is it ideal to have everything fixed, for myself too like i sleep and wake up the same time everyday" — meta-question affirming desire for fixed schedule.
**Ambiguity:** 28% (Goal 0.78, Constraints 0.7, Criteria 0.85, Context 0.4)

### Round 5
**Q:** Lock the schedule? (proposed / optimized / hybrid / defer)
**A:** "Lock optimized schedule (7 wake, 11 PM bed)"
**Ambiguity:** 22% (Goal 0.92, Constraints 0.75, Criteria 0.85, Context 0.4)

### Round 6
**Q:** Tell me about your home Linux server.
**A:** "it is just a linux ubantu computer that runs all the time, it has everything there, i have another app running there. but in order for the linux claude to pickup our conversation, may be i need a handoff doc?"
**Ambiguity:** 11.5% — BELOW THRESHOLD ✅

</details>
