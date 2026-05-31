---
name: init
description: >
  Initialize a repository for the Cruise Control workflow. Use this when the
  engineer runs "cc init", says "initialize cruise control / cc", "set up this
  project for cc", "init project", or is starting work in a new or unfamiliar
  repo and wants it primed before building features. It detects the project's
  stack, suggests relevant skills from the skills.sh registry (asking before
  installing any), and writes one small project-context file that points at the
  existing docs instead of duplicating them. Run this once per repo before using
  /cc:feature. Do NOT use it to write features — that's the feature loop's job.
user-invocable: true
---

# Cruise Control — Init

Prime a repo so the feature loop has the context it needs and surface useful skills —
without adding redundancy or taking decisions away from the engineer.

These principles carry over from the feature loop and govern everything below:

- **Suggest, don't auto-install.** The engineer approves every skill and every line written.
  Nothing enters `.claude/skills/` without a yes.
- **Pointer + delta, never a copy.** Existing READMEs and CLAUDE.md are the source of truth.
  The context doc links to them and records *only what's missing*. If a fact is already
  written down, don't restate it — a duplicated fact is a fact that will go stale.
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

## Step 1 — Detect the stack

Read manifests and configs to infer languages, frameworks, and the test runner. Check
whichever exist:

- **JS/TS:** `package.json` (scripts, deps, devDeps), `tsconfig.json`, lockfiles
- **Python:** `pyproject.toml`, `requirements*.txt`, `setup.cfg`, `tox.ini`
- **Go:** `go.mod` · **Rust:** `Cargo.toml` · **Ruby:** `Gemfile` · **JVM:** `pom.xml`, `build.gradle`
- **Test/lint signals:** jest / vitest / pytest / `go test` / `cargo test`, eslint, ruff, etc.
- **Conventions:** `.editorconfig`, linter configs, CI under `.github/workflows`

Summarize what you found in three to six lines and confirm it with the engineer before continuing.

## Step 2 — Read what's already documented

Before writing anything, read the existing context so you don't duplicate it: root and nested
`CLAUDE.md`, `README.md` (including sub-package READMEs), `docs/`, `CONTRIBUTING.md`. Note what's
already covered — the context doc you produce in Step 5 must *reference* these, not restate them.

## Step 3 — Ensure the TDD anchor skill

The feature loop is test-driven, so a primed repo should have a TDD skill present. This is the one
skill init treats as a pinned default rather than rediscovering each time.

Init is idempotent — never re-fetch what's already there. Check first:

```bash
npx skills list                 # source of truth for what's installed
ls .claude/skills/ 2>/dev/null  # fallback: look for an existing tdd skill
```

If a TDD skill is missing, install the pinned anchor into the repo (project scope), after a one-line
confirmation from the engineer:

```bash
# pinned default — behavior-focused, planning phase, red-green-refactor:
npx skills add mattpocock/skills --skill tdd
# alternative — strict watch-it-fail discipline:
npx skills add obra/superpowers --skill test-driven-development
```

Rules:
- **Don't install a second TDD skill.** If the repo already has one (or the engineer prefers a
  different anchor), keep that one — two TDD skills will fight over how to drive red-green.
- **The anchor and `/cc:feature` must agree on who's in charge.** `/cc:feature` owns the orchestration
  (clean tree, the small-suite-then-green flow, git checkpoints, the two confirmations); the TDD anchor
  is the doctrine it leans on. If their loops conflict, `/cc:feature` wins — the anchor is reference, not
  a co-driver.
- Exact flags shift between CLI versions; `npx skills --help` is authoritative. The shorthand
  `npx skills add owner/repo/skill` also works, and `--global` installs to `~/.claude/skills/` instead.

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

## Step 5 — Write a minimal context doc (pointer + delta)

Write to `.claude/cc.md`, or append a short "Cruise Control" section to `CLAUDE.md` if the engineer
prefers a single file. Include only:

- **Links to the real docs** (README, CONTRIBUTING, key `docs/` pages) — the source of truth.
- **The delta:** the few load-bearing facts not written down anywhere — the test command, how to
  run a single test, the commit-message convention, branch policy.
- **One line** noting the repo uses the Cruise Control feature loop (`/cc:feature`).

If a fact already lives in a README, link to it instead of copying it.

**Skeleton:**
```markdown
# Cruise Control — project context
Sources of truth (do not duplicate): README.md, CONTRIBUTING.md, docs/architecture.md
Stack: <languages / frameworks detected>
Test: `<command>`   · single test: `<command>`
Commit convention: <e.g. Conventional Commits>
Notes: <only the handful of things not documented elsewhere>
```

## Step 6 — Confirm and stop

Show the engineer three things: the detected stack, the skills installed, and the context doc.
Then make no further changes. Init is setup, not feature work — when they're ready to build,
that's `/cc:feature`.

---

## What this skill deliberately does NOT do

- Install skills without approval.
- Restate anything already in a README or CLAUDE.md.
- Produce a sprawling document — pointer + delta only.
- Start building. Init ends exactly where the feature loop begins.
