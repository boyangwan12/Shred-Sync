#!/usr/bin/env bash
# Symlink claude-memory/ in the repo to Claude Code's auto-memory path.
# Run once per machine (Macbook + home Ubuntu server).
#
# Behavior:
#   - Auto-detects the Claude Code project-hash directory from the git root
#   - Backs up any existing memory directory to memory.bak-<timestamp>
#   - Creates a symlink ~/.claude/projects/<hash>/memory/ -> <repo>/claude-memory/
#   - Idempotent: safe to re-run

set -euo pipefail

# Resolve the repo's git root (Claude uses git root for the project hash, not cwd)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GIT_ROOT="$(cd "$SCRIPT_DIR" && git rev-parse --show-toplevel 2>/dev/null || true)"

if [ -z "${GIT_ROOT:-}" ]; then
  echo "ERROR: Not inside a git repository. Run this script from a cloned Shred-Sync checkout."
  exit 1
fi

# Claude Code computes the project hash by replacing every '/' in the absolute git-root path with '-'.
# Example: /Users/wanby/my_files/projects/shred-sync -> -Users-wanby-my-files-projects-shred-sync
PROJECT_HASH="$(echo "$GIT_ROOT" | sed 's#/#-#g')"
PROJECT_HASH_DIR="$HOME/.claude/projects/$PROJECT_HASH"

# The repo is one level below the git root (shredding-dashboard/), so claude-memory/ lives there.
# Detect by trying both layouts.
if [ -d "$GIT_ROOT/claude-memory" ]; then
  MEMORY_SRC="$GIT_ROOT/claude-memory"
elif [ -d "$GIT_ROOT/shredding-dashboard/claude-memory" ]; then
  MEMORY_SRC="$GIT_ROOT/shredding-dashboard/claude-memory"
else
  echo "ERROR: Could not find claude-memory/ in $GIT_ROOT or $GIT_ROOT/shredding-dashboard"
  exit 1
fi

MEMORY_DEST="$PROJECT_HASH_DIR/memory"

echo "Git root:        $GIT_ROOT"
echo "Project hash:    $PROJECT_HASH"
echo "Memory source:   $MEMORY_SRC"
echo "Memory target:   $MEMORY_DEST"
echo ""

mkdir -p "$PROJECT_HASH_DIR"

if [ -L "$MEMORY_DEST" ]; then
  CURRENT_TARGET="$(readlink "$MEMORY_DEST")"
  if [ "$CURRENT_TARGET" = "$MEMORY_SRC" ]; then
    echo "Symlink already correct. Nothing to do."
    exit 0
  fi
  echo "Removing existing (incorrect) symlink: $MEMORY_DEST -> $CURRENT_TARGET"
  rm "$MEMORY_DEST"
elif [ -e "$MEMORY_DEST" ]; then
  TS="$(date +%Y%m%d-%H%M%S)"
  BACKUP="$MEMORY_DEST.bak-$TS"
  echo "Backing up existing memory directory to:"
  echo "  $BACKUP"
  mv "$MEMORY_DEST" "$BACKUP"
fi

ln -s "$MEMORY_SRC" "$MEMORY_DEST"
echo "Symlink created: $MEMORY_DEST -> $MEMORY_SRC"
echo ""
echo "Done. Claude's auto-memory now reads from the repo's claude-memory/ directory."
echo "When you edit memory files, commit + push so other machines pick up the change."
