# ShredSync Architecture

System design for a 12-week (Apr 7 – Jun 30, 2026) data-backed cutting-phase coaching loop.

## Goal

Run a single persistent Claude session on a 24/7 home Ubuntu server, accessible from Macbook + phone, that drives a fixed daily protocol (food planning, training adjustments, prediction, recalibration) backed by a production Turso database and a Render-deployed Next.js dashboard.

## Components

### 1. Compute layer — Ubuntu home server (24/7)

- Runs `claude remote-control` as one persistent Claude Code session
- Logged into the user's Claude Max subscription (no API billing)
- Has the `Shred-Sync` repo cloned at `~/projects/Shred-Sync`
- Has its own `.env` (gitignored, manually created) with Turso credentials
- Has cron jobs that fire push notifications and run scheduled `claude` invocations at protocol times
- Has the `claude-memory/` directory symlinked into `~/.claude/projects/<project-hash>/memory/` so Claude's auto-memory reads the repo's tracked memory files

### 2. Client layer — Mobile + Macbook

| Surface | Use case | Connection |
|---------|----------|------------|
| **Phone (Claude mobile app)** | Daily check-ins, food photos, push reminders, mid-day quick interactions | Connects to server's `claude remote-control` session |
| **Macbook (CLI or claude.ai/code)** | Long-form work, weekly reviews, codebase changes, deployments | SSH to server OR claude.ai/code in browser |

Both surfaces talk to the **same** Claude session running on the server. There is no per-device session — switching from phone to laptop mid-conversation is transparent.

### 3. Data layer — Turso (production libsql)

- URL: `libsql://shred-sync-boyangwan12.aws-us-east-1.turso.io`
- Single source of truth for all logged data
- Schema: `daily_log`, `foodItem`, `workoutExercise`, `workoutSet`, `exercise`, plus new tables `prediction` and `mealPlan` (to be added in Phase 3 of the protocol rollout)
- Local dev.db was retired 2026-04-23 — both local `npm run dev` and the deployed Render app read/write the same Turso DB

### 4. Display layer — Next.js dashboard (Render-deployed)

- **Framework:** Next.js 16 (Turbopack), Prisma 7 with libsql adapter
- **Hosting:** Render — auto-deploys on push to `main`
- **Routes:**
  - `/` — daily summary
  - `/workout` — exercise logging (sets/reps/weights)
  - `/food` — food entry display
  - `/charts` — trend visualizations (weight, macros, glycogen, HRV)
  - `/api/workout/[date]` — Workout REST endpoint (used by the workout page)
- **Key feature:** `daily_log.notes` is rendered as a collapsible "Session Briefing" on the workout page — this is where Claude's pre-training analysis lives

### 5. Knowledge layer — three persistence stores

| Layer | Location | Purpose |
|-------|----------|---------|
| **Auto-memory** | `claude-memory/*.md` (in repo, symlinked to `~/.claude/projects/<hash>/memory/`) | Durable facts about user, project, calibration. Loaded automatically every Claude session. |
| **Bootstrap doc** | `BOOTSTRAP-CLAUDE.md` (repo root) | Loader for fresh sessions — tells new Claude what to read first. |
| **Protocol spec** | `docs/daily-coaching-protocol.md` | The full deep-interview spec defining timeline, touchpoints, success criteria. |

## Topology

```
                     ┌──────────────────────────┐
                     │  GitHub                  │
                     │  github.com/boyangwan12/ │
                     │  Shred-Sync              │
                     │                          │
                     │  ─ Source code           │
                     │  ─ claude-memory/*.md    │
                     │  ─ ARCHITECTURE.md       │
                     │  ─ BOOTSTRAP-CLAUDE.md   │
                     └─────────┬────────────────┘
                               │ git push / pull
                               ↓
       ┌───────────────────────┴─────────────────────────┐
       │                                                 │
       ↓                                                 ↓
┌──────────────────┐                          ┌──────────────────────────┐
│  Macbook         │                          │  Home Ubuntu Server      │
│  (this laptop)   │                          │  (24/7)                  │
│                  │                          │                          │
│  ─ Repo cloned   │                          │  ─ Repo cloned           │
│  ─ .env (local)  │                          │  ─ .env (manual setup)   │
│  ─ Claude CLI    │                          │  ─ Claude CLI w/ login   │
│                  │                          │  ─ `claude remote-       │
│                  │                          │    control` session 24/7 │
│                  │                          │  ─ cron jobs for         │
│                  │                          │    reminders +           │
│                  │                          │    nightly predictions   │
│                  │ SSH or claude.ai/code    │                          │
│                  │─────────────────────────▶│                          │
└──────────────────┘                          └────────┬─────────────────┘
                                                       │
                                              Claude Code Remote Control
                                                       │
                                                       ↓
                                              ┌──────────────────┐
                                              │  Phone           │
                                              │  Claude app      │
                                              │                  │
                                              │  ─ Native chat   │
                                              │  ─ Food photos   │
                                              │  ─ Push          │
                                              │    notifications │
                                              └──────────────────┘
                          ↓
              ┌────────────────────────┐
              │  Turso (libsql)        │
              │  shred-sync DB         │
              │                        │
              │  All clients read/     │
              │  write here            │
              └─────────┬──────────────┘
                        │ Render auto-deploy
                        ↓
              ┌────────────────────────┐
              │  Render: shred-sync    │
              │  Next.js dashboard     │
              │                        │
              │  Public URL — also     │
              │  used from phone for   │
              │  direct exercise       │
              │  logging               │
              └────────────────────────┘
```

## Data flows

| Flow | Trigger | Path |
|------|---------|------|
| Morning weight log | 7 AM push | Phone → Claude (server) → Turso `daily_log` → Dashboard |
| Food photo log | User-initiated | Phone (image) → Claude (server) → macros computed → Turso `foodItem` → Dashboard |
| Workout sets/reps | During workout | Phone/Macbook → Dashboard `/workout` page → Turso `workoutSet` directly (no Claude in the loop) |
| Morning adjustment | ~7:15 AM (after checkin) | Claude reads actuals vs last night's prediction → green/yellow/red signal → revises workout + macros if signal warrants → push summary to phone |
| Pre-workout reminder | 3:30 PM cron | Server cron → format recap of today's already-revised plan (from 7:15 AM round) → push at 4:00 PM with carb reminder + optional energy check; only re-evaluate if user reports new subjective signal |
| Tomorrow food planning | 9 PM push | Phone (ingredients) → Claude solves macros → Turso `mealPlan` → Dashboard |
| Tomorrow prediction | 9:30 PM cron | Server cron → Claude analyzes 7-day trend → writes to Turso `prediction` → push summary to phone |
| Briefings | Claude → DB | Server-side Claude writes `daily_log.notes` → Dashboard renders it as Session Briefing on `/workout` page |

## Memory sync via git

The `claude-memory/` directory at the repo root holds Claude's durable knowledge as plain markdown files. Both Macbook and server have it cloned/symlinked into Claude Code's expected memory path:

```
<repo>/claude-memory/                    ← source of truth, tracked in git
       ├── MEMORY.md                     (index — always loaded)
       ├── user_fitness_goals.md
       ├── project_calibrated_targets.md
       ├── project_strength_baselines.md
       ├── reference_notion_hub.md
       ├── reference_turso_creds.md      (sanitized — secrets in .env)
       └── feedback_daily_data_prompt.md

~/.claude/projects/-Users-wanby-my-files-projects-shred-sync/memory/
       ↳ symlink → <repo>/claude-memory/
```

Run `bash scripts/setup-claude-memory.sh` on each machine to set up the symlink (one-time per machine).

When Claude updates a memory file via its auto-memory system, the file changes in the repo. Commit + push, and the next `git pull` on the server picks it up. Conversely, if Claude on the server learns something and writes to memory, commit + push, and the Macbook picks it up.

This makes memory **machine-portable** without any custom sync infrastructure — git is the sync layer.

## Why this design

| Design choice | Why |
|---------------|-----|
| One persistent Claude session on the server (not per-device) | Avoids context fragmentation. Phone and laptop see the same conversation. |
| Memory files in git, not in `~/.claude/projects/` only | Survives machine wipes, allows multi-machine, version-controlled history of facts. |
| Sanitized credential file in repo + secrets in `.env` | Repo can be public; secrets never leak. Standard best practice. |
| Bootstrap doc + auto-memory + protocol spec (three layers) | Each layer answers a different "what does Claude need to know?" question — facts (memory), workflow (protocol), entry-point (bootstrap). |
| Cron-driven reminders, not in-conversation reminders | Claude doesn't need to "remember" to ping at 7 AM — the OS scheduler does it. Claude is purely reactive to user input + scheduled triggers. |
| Turso as single source of truth, not local SQLite | One DB across all clients. Dashboard and server-Claude see identical state in real time. |
| Dashboard as direct-write surface for routine logs | Workout sets are just data entry — no need to involve Claude. Saves API budget and reduces friction. |
| Claude as optimization layer for food planning | Constrained macro optimization is high-value work — solving it manually costs ~15 min/meal that Claude does in seconds. |
| Falsifiable prediction accuracy as the legitimacy gate | Without measurable predictions, the analysis is unfalsifiable. With them, the user can independently verify the model is working. |

## Failure modes & mitigations

| Failure | Impact | Mitigation |
|---------|--------|------------|
| Server reboots, loses Claude session | All daily reminders fail | Cron job at boot restarts `claude remote-control`; bootstrap doc lets the new session catch up |
| Token in `.env` expires/leaks | DB inaccessible | `turso db tokens create` rotates; update `.env` on every machine |
| User's phone offline at 7 AM | Push doesn't arrive | Push queues — delivers when phone reconnects. User can also pull-not-push: open mobile app any time, ask "what should I log?" |
| Render deployment fails after a push | Dashboard shows stale UI | Render rolls back to last good build; user accesses Turso directly via scripts |
| Claude memory file conflict between Macbook + server | Diverged context | Git merge resolves; commit-and-pull discipline prevents most cases. If conflict, the server is source of truth (it's where the active session lives). |
| GitHub push includes accidental secret | Credential leak | Pre-commit hook should grep for token patterns before allowing push. (TODO: add as a future safeguard.) |

## Phase rollout (from the deep-interview spec)

1. **Phase 1 — Server bootstrap** (~30-60 min one-time): SSH to server, install claude CLI, clone repo, login with Max subscription, create `.env`, run setup-claude-memory script
2. **Phase 2 — Remote Control + mobile** (~10 min one-time): enable Remote Control on server, install Claude mobile app, connect, verify push notifications fire
3. **Phase 3 — Protocol artifacts**: write `PROTOCOL.md` + `BOOTSTRAP-CLAUDE.md`, add Turso tables `prediction` + `mealPlan`, add forecast-vs-actual accuracy panel to dashboard
4. **Phase 4 — Cron automation** (~30 min one-time): write 6 cron jobs (7am, 12:30pm, 3pm, 6pm, 9pm, 9:30pm) that push reminders and run scheduled Claude tasks
5. **Phase 5 — Validation week** (Apr 28 – May 4): run protocol live, track all 8 acceptance criteria, weekly review

The full spec lives at `docs/daily-coaching-protocol.md`.
