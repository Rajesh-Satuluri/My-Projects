# Deploy scripts

## `deploy-project.sh` — additive gh-pages deploy

`gh-pages` in this repo is a **shared multi-project host**: each top-level
folder (`snowflake/`, `iceberg/`, `db-lab/`, `interview-prep/`, …) is an
independent site. A deploy that force-pushes a full snapshot from a stale
checkout **wipes every other project** — this has happened repeatedly.

Use this script for every project deploy instead. It:

- fetches the **current** `gh-pages` (never a stale local copy),
- replaces **only** the target project's own subdirectory,
- refuses to commit if anything outside that folder changed,
- pushes **without `--force`**, rebasing and retrying if another project
  deployed concurrently.

### Usage

```bash
scripts/deploy-project.sh <project-name> <built-output-dir> [commit-msg]
```

| Arg | Meaning |
|-----|---------|
| `project-name` | Top-level folder on `gh-pages`, e.g. `snowflake` (single path segment). |
| `built-output-dir` | Local dir whose contents become that folder (build output, or the source dir for a no-build static site). |
| `commit-msg` | Optional. Defaults to `deploy(<project>): <src-sha>`. |

### Examples

```bash
# No-build static site (e.g. snowflake): deploy the source folder as-is
scripts/deploy-project.sh snowflake ./snowflake

# Built site: deploy the dist output into the iceberg/ folder
scripts/deploy-project.sh iceberg ./iceberg/dist "iceberg: v2 release"
```

### Migrating an existing deploy

If a project currently deploys with something like:

```bash
git add -A && git commit -m "deploy: $(git rev-parse HEAD)" && git push --force origin gh-pages
```

replace that entire block with a single call to `deploy-project.sh`. The
`--force` push is the bug — dropping it (and scoping to one folder) is the fix.

Requirements: `git` only (no `rsync`). Run from any clone of this repo, on any branch.
