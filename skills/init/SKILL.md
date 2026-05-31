---
name: init
description: >
  Initialize a repository for the Cruise Control workflow. Use this when the
  engineer runs "cc init", says "initialize cruise control / cc", "set up this
  project for cc", "init project", or is starting work in a new or unfamiliar
  repo and wants it primed before building features. It runs the `cc init` CLI
  to detect the stack, install the TDD anchor, and write a small project-context
  file, then layers on judgment — reading existing docs, enriching the delta, and
  suggesting relevant skills (asking before installing any). Run this once per repo
  before using /cc:feature. Do NOT use it to write features — that's the feature loop's job.
user-invocable: true
---

# Cruise Control — Init

Prime a repo so the feature loop has the context it needs and surface useful skills —
without adding redundancy or taking decisions away from the engineer.

The mechanical work — stack detection, writing `.claude/cc.md`, installing the TDD anchor —
is done deterministically by the **`cc init` CLI**. Your job is to drive it behind the
engineer's approval and add the judgment the CLI can't: reading what's already documented,
enriching the delta, and suggesting stack-specific skills.

These principles govern everything below:

- **Suggest, don't auto-install.** The engineer approves before anything is written or installed.
  You always preview with `--dry-run` first; nothing lands without a yes.
- **Pointer + delta, never a copy.** Existing READMEs and CLAUDE.md are the source of truth.
  The context doc links to them and records *only what's missing*. The CLI writes the mechanical
  facts; you trim anything already documented elsewhere.
- **Small.** Init produces the shortest thing that makes the feature loop work, not an encyclopedia.

---

## Step 0 — Sandbox gate (first, always)

Cruise Control runs inside its devcontainer sandbox. Priming writes files, so confirm the
marker before anything else:

- Run `node "${CLAUDE_PLUGIN_ROOT}/cli/dist/cc.js" sandbox check --strict`. Exit `0` → in the
  sandbox, continue to Step 1. Exit `2` → not in the sandbox. (The `${CLAUDE_PLUGIN_ROOT}`
  placeholder is filled in with the plugin's install path before you read this, so the command
  above is ready to run as-is. If it can't run for any reason, apply the rule by hand instead:
  the `CC_SANDBOX` environment variable being `1` means in-sandbox.)
- **If you're not in the sandbox, set it up instead of priming:**
  - Read `${CLAUDE_PLUGIN_ROOT}/assets/devcontainer/devcontainer.json` and **offer to write it**
    to `.devcontainer/devcontainer.json`.
  - **If a `.devcontainer/devcontainer.json` already exists, enforce that one — don't replace
    it.** Ensure `containerEnv.CC_SANDBOX` is `"1"` (add it if missing), show the diff, write on yes.
  - Tell the engineer to reopen in the container ("Dev Containers: Reopen in Container") and
    re-run `/cc:init`. **Stop here** until they're back inside the sandbox.

This gate comes before everything — the rest of init assumes the sandbox.

## Step 1 — Preview with `cc init --dry-run`

Let the CLI do the detection. Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/cli/dist/cc.js" init --dry-run
```

This detects the stack (languages, test / build / single-test commands, the test directory and
glob) and prints the plan it would apply — installing the TDD anchor (if one isn't already
present) and writing `.claude/cc.md`. It changes nothing.

Show the engineer the detected stack and the plan. This is the deterministic source of truth, so
**don't re-derive detection by hand** — only fall back to reading manifests yourself if the CLI
can't run for some reason.

## Step 2 — Read what's already documented

Before applying, skim the existing context so the context doc ends up as pointer + delta, not a
duplicate: root and nested `CLAUDE.md`, `README.md` (including sub-package READMEs), `docs/`,
`CONTRIBUTING.md`. Note what's already covered — you'll fold real links into `.claude/cc.md` in
the next step and cut anything the CLI wrote that's already documented elsewhere.

## Step 3 — Apply on confirmation, then enrich

On the engineer's yes, apply:

```bash
node "${CLAUDE_PLUGIN_ROOT}/cli/dist/cc.js" init
```

This:
- **installs the TDD anchor skill idempotently** — `mattpocock/skills tdd` by default, *skipped*
  if `.claude/skills/` already holds one (it never installs a second);
- **writes `.claude/cc.md`** pre-filled with the detected stack and a `## Test structure` section
  (test dir, glob, single-test command) — the facts a future session would otherwise re-discover.

**TDD anchor notes:**
- The default anchor is the behavior-focused `mattpocock/skills tdd`. If the engineer prefers the
  stricter watch-it-fail discipline, install `obra/superpowers --skill test-driven-development`
  instead (do it *before* `cc init`, or swap afterward — the CLI skips its default once any anchor
  is present). Don't end up with two; they'll fight over how to drive red-green.
- **The anchor and `/cc:feature` must agree on who's in charge.** `/cc:feature` owns the
  orchestration (clean tree, the small-suite-then-green flow, git checkpoints, the two
  confirmations); the TDD anchor is the doctrine it leans on. If their loops conflict — e.g. an
  anchor that forbids writing the suite up front — **`/cc:feature` wins**; the anchor is reference,
  not a co-driver.

**Then enrich `.claude/cc.md` with the delta the CLI can't infer** (and only that):
- **Links to the real docs** — README, CONTRIBUTING, key `docs/` pages — as the sources of truth.
- Conventions not derivable from manifests: the **commit-message convention** and **branch policy**.
- **Trim** anything the CLI wrote that's already documented elsewhere — a duplicated fact rots.

## Step 4 — Suggest stack-specific skills

Map the detected frameworks to a few targeted searches, then present matches for approval:

```bash
npx skills search <keyword>   # e.g. vitest, fastapi, terraform, playwright
```

- Present a short ranked list: skill name + one line on why it's relevant to *this* repo. Don't
  dump raw CLI output at the engineer.
- Install only what they approve, one at a time (`npx skills add <owner/repo> --skill <name>`).

Never install silently. What enters `.claude/skills/` is the engineer's call — that's them keeping
their hands on the wheel.

## Step 5 — Confirm and stop

Show the engineer three things: the detected stack (from `cc init`), the skills installed, and the
context doc. Then make no further changes. Init is setup, not feature work — when they're ready to
build, that's `/cc:feature`.

---

## What this skill deliberately does NOT do

- Hand-roll stack detection or doc-writing the `cc init` CLI already does deterministically.
- Install skills (or apply `cc init`) without a preview and approval.
- Restate anything already in a README or CLAUDE.md.
- Produce a sprawling document — pointer + delta only.
- Start building. Init ends exactly where the feature loop begins.
