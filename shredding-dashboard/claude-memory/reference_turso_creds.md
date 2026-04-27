---
name: reference_turso_creds
description: Turso (production) database — credentials live in .env (gitignored), this file documents access patterns only
type: reference
originSessionId: 0489599e-6d50-4105-8a8d-9d1f4b6e222c
---
The ShredSync app uses Turso as its single source of truth (both the Render-deployed site and local `npm run dev` read/write here). Local dev.db was retired 2026-04-23.

**⚠️ Never commit the auth token to git.** This file is checked into the repo and intentionally contains no secret material.

**Connection URL:**
`libsql://shred-sync-boyangwan12.aws-us-east-1.turso.io`

**Auth token:**
Stored in `.env` (gitignored) as `TURSO_AUTH_TOKEN`. Loaded automatically by `src/lib/db.ts` via `dotenv/config`.

## Setting up on a new machine (e.g., the home Ubuntu server)

1. Clone the repo: `git clone https://github.com/boyangwan12/Shred-Sync.git`
2. Manually create `shredding-dashboard/.env`:
   ```
   TURSO_DATABASE_URL=libsql://shred-sync-boyangwan12.aws-us-east-1.turso.io
   TURSO_AUTH_TOKEN=<paste from password manager>
   ```
3. The token must be transferred **out-of-band** (password manager, secure note, encrypted message). Never email/chat/commit it.
4. Verify connection:
   ```bash
   cd shredding-dashboard && npx tsx scripts/aggregate-actuals.ts
   ```
   Look for `DB: TURSO (PRODUCTION)` in the log output.

## Where it's configured

- `shredding-dashboard/.env` (gitignored) — local Macbook + home Ubuntu server
- Render dashboard → `shred-sync` service → Environment tab (for the deployed app)

## How to rotate (if leaked or expiring)

```bash
turso db tokens create shred-sync --expiration none
```

Then update `.env` on **every machine** that runs the app AND the Render dashboard env var. Don't forget the home server.

## How to reach Turso CLI

```bash
# macOS
brew install tursodatabase/tap/turso

# Linux (server)
curl -sSfL https://get.tur.so/install.sh | bash

turso auth login   # opens browser, sign in once
turso db list      # should show `shred-sync`
```

## Scripts that use it

All `shredding-dashboard/scripts/*.ts` import `prisma` from `src/lib/db.ts`, which loads `.env` via dotenv — no manual `export TURSO_*` needed. The log line `DB: TURSO (PRODUCTION)` confirms connection.
