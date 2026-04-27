# Server Bootstrap Playbook

Step-by-step setup for running the persistent ShredSync Claude session on your home Ubuntu server, paired to your phone via Claude Code Remote Control.

**Audience:** you (Boyang), once you SSH into the home Ubuntu server.

**Time estimate:** 30-45 min total.

**Tonight's goal:** server is alive, mobile pairs to it, push notifications fire. Everything else (cron, prediction tables, dashboard panels) builds on this foundation.

---

## How to read this doc on the server

Three options:

1. **Phone browser (easiest):** open `https://github.com/boyangwan12/Shred-Sync/blob/main/shredding-dashboard/docs/server-bootstrap.md` and follow along step-by-step.
2. **After cloning:** once Phase B Step 4 is done, `cat ~/projects/Shred-Sync/shredding-dashboard/docs/server-bootstrap.md` (chicken-and-egg — you need to be past the clone step, so this works for re-reading).
3. **Macbook side-by-side:** keep this file open on your laptop while typing commands on the server SSH session.

---

## Phase A — Before leaving the Macbook (5 min)

You need to transfer the Turso token to the server. Two options:

### Option A1 — scp the .env file directly (easiest)

Run this on the **Macbook** to confirm the token is where you expect:

```bash
cat /Users/wanby/my_files/projects/shred-sync/shredding-dashboard/.env
```

You should see `TURSO_DATABASE_URL=...` and `TURSO_AUTH_TOKEN=...`. Tonight at the server, you'll scp this file over (Phase B Step 5).

### Option A2 — copy token to a password manager

If you'd rather not scp, copy the `TURSO_AUTH_TOKEN` value into your password manager now. You'll paste it manually on the server.

**Either works.** Pick one. Note your server's SSH address before you walk away.

---

## Phase B — At the server (~30 min)

### Step B1: SSH in and check prerequisites

```bash
ssh <your-server>

# Verify these are installed
node --version    # need >= 18
git --version
curl --version
```

If Node is missing or too old:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step B2: Install Claude CLI

```bash
curl -fsSL https://claude.ai/install.sh | bash

# Add to PATH if not already
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

claude --version   # should print a version
```

### Step B3: Login with Max subscription

```bash
claude /login
```

Headless server: it'll print a URL — copy it to your phone, log in there, paste the code back. Use your **Max subscription** account.

### Step B4: Clone the repo

```bash
mkdir -p ~/projects && cd ~/projects
git clone https://github.com/boyangwan12/Shred-Sync.git
cd Shred-Sync/shredding-dashboard
```

### Step B5: Set up `.env` (the secret transfer)

**If using scp from Macbook** — open a NEW terminal on your Macbook (not on the server) and run:

```bash
scp /Users/wanby/my_files/projects/shred-sync/shredding-dashboard/.env \
    <your-server>:~/projects/Shred-Sync/shredding-dashboard/.env
```

**If using password manager** — on the server:

```bash
nano ~/projects/Shred-Sync/shredding-dashboard/.env
```

Paste:

```
TURSO_DATABASE_URL=libsql://shred-sync-boyangwan12.aws-us-east-1.turso.io
TURSO_AUTH_TOKEN=<paste from password manager>
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`.

### Step B6: Install npm dependencies

```bash
cd ~/projects/Shred-Sync/shredding-dashboard
npm install
```

This takes 2-3 min. May warn about peer deps — that's fine.

### Step B7: Verify DB connection

```bash
npx tsx scripts/aggregate-actuals.ts 2026-04-27
```

**Expected output:** A line containing `DB: TURSO (PRODUCTION)` and a successful aggregation.

**If you see `DB: LOCAL SQLite`** — the `.env` didn't load. Check the file:

```bash
ls -la .env
cat .env
```

Make sure it's at `shredding-dashboard/.env` (not `Shred-Sync/.env`) and contains both lines without quotes around the values.

### Step B8: Set up the memory symlink

```bash
bash scripts/setup-claude-memory.sh
```

**Expected output:**

```
Git root:        /home/<user>/projects/Shred-Sync
Project hash:    -home-<user>-projects-Shred-Sync
Memory source:   /home/<user>/projects/Shred-Sync/shredding-dashboard/claude-memory
Memory target:   /home/<user>/.claude/projects/-home-<user>-projects-Shred-Sync/memory
Symlink created: ...
```

Verify:

```bash
ls -la ~/.claude/projects/-home-*/memory  # should be a symlink to claude-memory/
```

### Step B9: Smoke test — fresh Claude session reads bootstrap

```bash
cd ~/projects/Shred-Sync/shredding-dashboard
claude
```

When the prompt appears, type:

```
Read BOOTSTRAP-CLAUDE.md and confirm.
```

You should get the bootstrap-loaded confirmation: `"Bootstrap loaded. {N} memory files read. Cut day {X} of 84..."`.

If it works, the server's Claude has full context. Exit with `Ctrl+D` or `/quit`.

### Stop and verify before continuing

Before Phase C, confirm:

- [ ] `claude --version` prints a version
- [ ] `claude /login` succeeded (auth saved)
- [ ] `npx tsx scripts/aggregate-actuals.ts 2026-04-27` shows `DB: TURSO (PRODUCTION)`
- [ ] `bash scripts/setup-claude-memory.sh` created the symlink
- [ ] Fresh `claude` session loaded the bootstrap successfully

If any failed, stop and screenshot the error. We'll debug in our next session.

---

## Phase C — Remote Control + mobile pairing (~10 min)

### Step C1: Enable Remote Control on the server

```bash
cd ~/projects/Shred-Sync/shredding-dashboard
claude
```

Inside the Claude session:

```
/config
```

In the config menu, find **Remote Control** and **enable** it. Save and exit (`/quit`).

### Step C2: Start the persistent Remote Control session in tmux

```bash
# Install tmux if missing
sudo apt-get install -y tmux

# Start a named session
tmux new -s claude-remote
cd ~/projects/Shred-Sync/shredding-dashboard
claude remote-control
```

This starts the always-on session. It'll print a connection identifier or QR code — keep this terminal visible.

**Detach without killing the session:** `Ctrl+B` then `D` (you can SSH-disconnect freely; the tmux session keeps running).

**Re-attach later (after a fresh SSH):** `tmux attach -t claude-remote`.

**Verify it survives SSH disconnect:** detach, exit ssh, ssh back in, run `tmux ls` — you should see `claude-remote: 1 windows` listed.

### Step C3: Install Claude mobile app

On your phone:

1. App Store / Play Store → install **Claude** (by Anthropic)
2. Sign in with your **Max subscription** account
3. Open settings → look for **Remote Control** or **Connected Devices**
4. Tap to add the server's session. You'll either:
   - Scan a QR code shown in the server's tmux session, OR
   - Use a connection identifier shown there (paste it on phone), OR
   - Auto-discover if both are signed into the same account

### Step C4: Verify two-way connection

On phone, in the connected session, type:

```
What's today's date?
```

You should get a response that originates from the server (not the cloud). The response will be the actual date the server has.

### Step C5: Verify push notifications

On phone, send a slightly longer task:

```
List all files in my repo's claude-memory/ directory
```

When Claude finishes, you should get a **push notification** if you're not actively in the app.

If push doesn't fire:

- Phone notification permissions for Claude app — check Settings → Notifications → Claude
- `/config` on server — confirm Remote Control + push are both enabled
- Claude mobile app settings → Notifications

---

## Phase D — You're done for tonight

The first live protocol test is tomorrow morning at 7 AM.

Cron jobs aren't set up yet, so the morning push won't fire automatically tonight. For the v0 test, you'll just:

1. Wake at 7 AM
2. Open Claude app on phone
3. Type: `morning checkin`
4. It'll prompt for weight/sleep/HRV/energy and write to Turso

**Sleep at 11 PM regardless of bootstrap status.** Schedule discipline matters more than completing the bootstrap.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `claude: command not found` | PATH not updated | `source ~/.bashrc` or open a new shell |
| `claude /login` won't open browser | Headless server | Copy printed URL to phone browser, log in there, paste code back |
| `npm install` fails on `libsql` | Native build deps missing | `sudo apt-get install -y build-essential python3` |
| `DB: LOCAL SQLite` instead of TURSO | `.env` didn't load or wrong path | Verify file is at `shredding-dashboard/.env`, not `Shred-Sync/.env` |
| Symlink script: "Could not find claude-memory/" | Wrong working dir | Run from `~/projects/Shred-Sync/shredding-dashboard` |
| Mobile app can't see server | Different account | Both must be signed into the same Max subscription account |
| Push notifications don't fire | OS-level perms | iOS/Android Settings → Notifications → Claude → enable |
| tmux session dies after SSH disconnect | Process not in tmux | Verify with `tmux ls`; if missing, you ran `claude remote-control` outside tmux. Restart inside. |

---

## What's NOT in this playbook (deferred)

- **Cron job setup** — Phase 4 of the protocol spec. Once Remote Control is live, the next session will write 6 cron scripts (7am, 12:30pm, 3pm, 6pm, 9pm, 9:30pm) and you'll add them via `crontab -e`.
- **New Turso tables (`prediction`, `mealPlan`)** — Phase 3. Prisma migration in a future session.
- **Forecast accuracy panel on dashboard** — Phase 3. Frontend work.
- **Boot-time auto-start of `claude remote-control`** — useful for surviving server reboots. Will set up a systemd unit in a future session once we're sure the bootstrap pattern is right.

---

## Quick reference

| Step | Command | Verify |
|------|---------|--------|
| Login | `claude /login` | Browser auth completes |
| Clone | `git clone https://github.com/boyangwan12/Shred-Sync.git ~/projects/Shred-Sync` | Repo at `~/projects/Shred-Sync` |
| Env (scp) | `scp <macbook>:.../.env <server>:.../.env` | `cat .env` shows token |
| Install | `cd shredding-dashboard && npm install` | Exits 0 |
| Verify DB | `npx tsx scripts/aggregate-actuals.ts 2026-04-27` | Logs `DB: TURSO (PRODUCTION)` |
| Memory | `bash scripts/setup-claude-memory.sh` | Symlink created |
| Smoke | `claude` then ask it to read BOOTSTRAP-CLAUDE.md | Bootstrap confirmed |
| Remote | `tmux new -s claude-remote && claude remote-control` | Mobile pairs |
