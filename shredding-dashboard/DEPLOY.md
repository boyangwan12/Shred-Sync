# Deploy to Render.com with Turso

This app uses SQLite locally but Turso (LibSQL, SQLite-compatible) in production so data survives across Render free-tier restarts.

## One-time setup (~10 min)

### 1. Create a Turso database

Install the Turso CLI and sign up:

```bash
brew install tursodatabase/tap/turso
turso auth signup
```

Create a database and upload the existing local dev data:

```bash
# From shredding-dashboard directory
turso db create shred-sync --from-file ./dev.db

# Grab the connection URL and token
turso db show shred-sync --url
turso db tokens create shred-sync --expiration none
```

Save the URL (looks like `libsql://shred-sync-<your-org>.turso.io`) and the token.

### 2. Create the Render web service

1. Go to https://dashboard.render.com/
2. **New → Web Service → Connect GitHub** → pick `boyangwan12/Shred-Sync`
3. Render will detect `render.yaml` and pre-fill most fields. Confirm:
   - Name: `shred-sync` (or pick your own — this becomes your URL)
   - Runtime: Node
   - Root Directory: `shredding-dashboard`
   - Plan: Free
4. Under **Environment** tab, add these secrets:
   - `TURSO_DATABASE_URL` = the libsql:// URL from step 1
   - `TURSO_AUTH_TOKEN` = the token from step 1
   - `APP_PASSWORD` = a password of your choice (basic auth)
   - `APP_USER` = `me` (or any username)
5. Save → Render builds + deploys (first build ~3 min)

### 3. Access

Your URL: `https://shred-sync.onrender.com` (or whatever service name you picked).

When you hit it, browser prompts for user/password (the `APP_USER` / `APP_PASSWORD` you set).

Most browsers remember credentials after first login.

## First request after idle

Render free tier sleeps the instance after 15 min of inactivity. The first request after sleep takes ~30–50s to cold-start. You'll see a spinner.

## Updating data from the app

Every time you write via the app (log a workout, update a daily log), it writes to Turso — the data is durable across restarts and deploys.

## Making code changes

Any push to `main` triggers auto-deploy:

```bash
git push origin main
```

Render will rebuild and redeploy. Zero downtime-ish — it swaps only after the new build is healthy.

## Rollback

Render dashboard → Events tab → Rollback on a previous deploy.

## Running locally after setup

Local dev still uses `dev.db` because `TURSO_DATABASE_URL` is unset. No change to your workflow.

If you want local to read from Turso too (to pull fresh data), set `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` in a local `.env` file.
