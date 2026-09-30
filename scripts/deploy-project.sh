#!/usr/bin/env bash
#
# deploy-project.sh — ADDITIVE deploy of a single project to the shared
# `gh-pages` branch of this repo.
#
# WHY THIS EXISTS
# ---------------
# `gh-pages` hosts many independent projects side by side, one per
# top-level directory (snowflake/, iceberg/, db-lab/, interview-prep/, ...).
# A deploy that does `git add -A && git commit && git push --force` from a
# stale full checkout WIPES every other project. That has happened here
# repeatedly. This script instead:
#
#   1. Fetches the CURRENT gh-pages (never works from a stale local copy).
#   2. Replaces ONLY the target project's own subdirectory.
#   3. Pushes WITHOUT --force, rebasing and retrying if someone else
#      deployed in the meantime.
#
# So two projects can deploy concurrently and neither can clobber the other.
#
# USAGE
# -----
#   scripts/deploy-project.sh <project-name> <built-output-dir> [commit-msg]
#
#   <project-name>       Top-level folder name on gh-pages, e.g. "snowflake".
#   <built-output-dir>   Local dir whose contents become that folder's new
#                        contents (your build output, or the source dir for
#                        a no-build static site).
#   [commit-msg]         Optional. Defaults to: deploy(<project>): <src-sha>
#
# EXAMPLES
#   scripts/deploy-project.sh snowflake ./snowflake
#   scripts/deploy-project.sh iceberg  ./iceberg/dist  "iceberg: v2 release"
#
# REQUIREMENTS: git, rsync. Run from inside a clone of this repo (any branch).
#
set -euo pipefail

PROJECT="${1:-}"
SRC_DIR="${2:-}"
MSG="${3:-}"

if [[ -z "$PROJECT" || -z "$SRC_DIR" ]]; then
  echo "usage: $0 <project-name> <built-output-dir> [commit-msg]" >&2
  exit 2
fi
if [[ ! -d "$SRC_DIR" ]]; then
  echo "error: built-output-dir '$SRC_DIR' does not exist or is not a directory" >&2
  exit 2
fi
# Guard against a project name that would escape the repo root.
case "$PROJECT" in
  */*|.|..|"") echo "error: project name must be a single path segment" >&2; exit 2;;
esac

SRC_ABS="$(cd "$SRC_DIR" && pwd)"
REPO_URL="$(git config --get remote.origin.url)"
BRANCH="gh-pages"

# Best-effort source SHA for the default commit message.
SRC_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
[[ -z "$MSG" ]] && MSG="deploy(${PROJECT}): ${SRC_SHA}"

WORKTREE="$(mktemp -d "${TMPDIR:-/tmp}/ghpages-deploy.XXXXXX")"
cleanup() { rm -rf "$WORKTREE"; }
trap cleanup EXIT

echo "==> Cloning $BRANCH (shallow) from origin"
# Shallow single-branch clone = current gh-pages, never a stale snapshot.
git clone --depth 1 --branch "$BRANCH" --single-branch "$REPO_URL" "$WORKTREE"

echo "==> Replacing ONLY '$PROJECT/' with contents of '$SRC_ABS'"
# Mirror the build output into THIS project's folder only (files deleted
# since the last deploy are dropped because we clear the folder first).
# Scoped to one folder — sibling project folders are never touched. No
# external deps: rm + cp, so this runs anywhere git does (no rsync needed).
rm -rf "${WORKTREE:?}/$PROJECT"
mkdir -p "$WORKTREE/$PROJECT"
# cp -a preserves modes/times; the trailing /. copies dir CONTENTS (incl.
# dotfiles) rather than nesting the source dir.
cp -a "$SRC_ABS/." "$WORKTREE/$PROJECT/"
# Never publish a stray VCS dir if the source happened to contain one.
rm -rf "$WORKTREE/$PROJECT/.git"

cd "$WORKTREE"

if git diff --quiet && git diff --cached --quiet && [[ -z "$(git status --porcelain)" ]]; then
  echo "==> No changes for '$PROJECT'; nothing to deploy."
  exit 0
fi

# Sanity: only the target project folder may be staged.
git add -A
STRAY="$(git diff --cached --name-only | grep -v "^$PROJECT/" || true)"
if [[ -n "$STRAY" ]]; then
  echo "error: refusing to deploy — changes touch files outside '$PROJECT/':" >&2
  echo "$STRAY" >&2
  exit 1
fi

git -c user.name="${GIT_AUTHOR_NAME:-deploy-bot}" \
    -c user.email="${GIT_AUTHOR_EMAIL:-deploy-bot@users.noreply.github.com}" \
    commit -q -m "$MSG"

# Push WITHOUT force. If origin moved (another project deployed), rebase our
# single project-scoped commit on top and retry. Never --force.
attempt=0
max=5
delay=2
until git push origin "HEAD:$BRANCH"; do
  attempt=$((attempt+1))
  if [[ $attempt -ge $max ]]; then
    echo "error: push failed after $max attempts" >&2
    exit 1
  fi
  echo "==> Push rejected (origin moved or transient). Rebasing and retrying ($attempt/$max) in ${delay}s..."
  sleep "$delay"; delay=$((delay*2))
  git fetch origin "$BRANCH"
  # Our commit only touches $PROJECT/, so a rebase onto others' deploys
  # applies cleanly — no conflicts with sibling projects.
  git rebase "origin/$BRANCH"
done

echo "==> Deployed '$PROJECT' to $BRANCH additively. Siblings untouched."
