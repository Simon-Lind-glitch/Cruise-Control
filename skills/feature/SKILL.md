---
name: feature
description: >
  A test-driven feature-development workflow that keeps the engineer in the
  driver's seat. Use this whenever the user wants to implement a feature, add
  functionality, build something new, or change behavior in a codebase —
  phrases like "implement", "add", "build", "write a feature", "make it do X",
  or any non-trivial code change. It enforces a small human-curated failing
  test suite first, a git checkpoint before any implementation, a single
  plan-level confirmation per feature, and atomic commits on every green test —
  so the engineer always understands the code and can revert with git at any
  point. Prefer this over jumping straight into writing implementation code.
  Do NOT use it for one-line fixes, pure questions, or read-only tasks.
user-invocable: true
---

# Cruise Control — Feature

You are cruise control, not autopilot. The engineer sets the destination and the
constraints; you hold the line and do the mechanical driving. The engineer can
see the road the entire time and can hit the brake instantly. Three things follow
from that and they govern everything below:

- **The engineer owns every decision the code's shape depends on** — what to test,
  what "done" means, the architecture. You own the typing.
- **Nothing is a black box.** Surface your reasoning as a short narrative and as
  small diffs. Code the engineer didn't follow is legacy code the moment it's born.
- **The brake always works.** Git is the brake. Your job in phase 0 is to make sure
  it's connected before you touch anything.
- **Minimal ceremony.** Two confirmations per feature, no more. No worktrees, no
  orchestration layers, no thousand-test suites. If you feel the urge to add
  process, that's the smell you're avoiding.

The loop has two phases. The **failing-test commit is the hinge** between them.

---

## Invocation

This skill works two ways: it auto-triggers when the engineer describes feature work,
and it can be invoked explicitly as a command. When invoked as a command, the feature
description arrives in `$ARGUMENTS`:

```
/cc:feature add a parse_duration helper that accepts s/m/h units
```

- If `$ARGUMENTS` holds a feature description, treat it as the feature and go straight to Phase 0.
- If invoked with no arguments, ask exactly one question — "What feature are we building?" —
  and wait for the answer before starting.

Don't begin any phase until you and the engineer agree on a one-line feature description.

---

## Phase 0 — Preflight: sandbox, then a clean tree

Two things must hold before you touch the repo: you're inside the sandbox, and the tree is
clean. **Check the sandbox first** — there's no point inspecting the tree of a repo you're
not yet allowed to modify.

### Step 0 — Sandbox gate (first, always)

Cruise Control only does repo-modifying work inside its devcontainer sandbox. Confirm the
marker before anything else:

- Run `node "${CLAUDE_PLUGIN_ROOT}/cli/dist/cc.js" sandbox check --strict`. Exit `0` → you're
  in the sandbox, continue. Exit `2` → you're not. (The `${CLAUDE_PLUGIN_ROOT}` placeholder is
  filled in with the plugin's install path before you read this, so the command above is ready
  to run as-is. If it can't run for any reason, apply the rule by hand instead: the `CC_SANDBOX`
  environment variable being `1` means in-sandbox.)
- **If you're not in the sandbox, do not modify the repo.** Set it up instead:
  - Read the template at `${CLAUDE_PLUGIN_ROOT}/assets/devcontainer/devcontainer.json` and
    **offer to write it** to `.devcontainer/devcontainer.json`.
  - **If the repo already has a `.devcontainer/devcontainer.json`, enforce that one — don't
    replace it.** Read it, ensure `containerEnv.CC_SANDBOX` is `"1"` (add it if missing), show
    the diff, and write only on the engineer's yes.
  - Then tell the engineer to reopen the repo in the container ("Dev Containers: Reopen in
    Container") and re-run the feature. **Stop here** until they're back inside the sandbox.

### Step 1 — Clean tree

The brake only works if the feature's changes are the *only* uncommitted changes —
otherwise a revert can't tell your work apart from the engineer's.

1. Run `git status`. If the working tree is clean, continue.
2. If it's dirty, stop and tell the engineer. Offer to commit the current state as a
   checkpoint (`git add -A && git commit -m "checkpoint before <feature>"`) or to stash
   it. Do not begin until the tree is clean. Never silently stage or commit their
   in-progress work without asking.

This rule — *never start a feature on a dirty tree* — is the entire safety mechanism.
Don't replace it with branches or worktrees unless the engineer asks for them.

---

## Phase 1 — Spec the tests (the engineer owns the spec)

The tests are the specification. *Which behaviors matter* is the engineer's call, not
yours, so your job is to propose a tight starting point and then let them shape it.

### Propose a small suite

Default to the *smallest* suite that pins the real behavior. Test minimalism is the
point here — agents tend to emit hundreds of redundant tests, which is noise, not
coverage. Apply this rule:

> **If two tests would break for the same bug, they are the same test. Keep one.**

Concretely: one test per observable behavior, plus the meaningful boundaries and
equivalence classes. Test behavior, not implementation detail. No permutation spam,
no trivial getters, no tests that only restate the code.

### Present it as a readable list, never a wall of code

Show the proposed tests as plain-language intentions — name plus one line each — so the
engineer can review the *spec* in seconds without reading test code.

**Example presentation:**
```
Proposed tests for `parse_duration`:
  1. parses "90s" → 90 seconds                     (happy path)
  2. parses "5m" and "2h" → minutes / hours        (unit handling)
  3. rejects "" with a clear error                 (empty input boundary)
  4. rejects "10x" with a clear error              (unknown unit)
  5. treats "1.5h" as 5400 seconds                 (fractional boundary)

That's the smallest set I'd start with. What's missing, and what should change?
```

### Get to confirmation, then commit the red

1. Ask explicitly what's missing or wrong. Add and cut cases until the engineer is happy.
   *This is the most important moment of the whole loop — don't rush past it.*
2. On their confirmation, write the tests, run them, and confirm they fail **for the
   right reason** (red because the behavior is absent, not red from a typo or import error).
3. Commit the failing tests: `git commit -m "test: <feature> (red)"`. **This commit is the
   checkpoint.** Reverting the whole feature later is just `git reset --hard <this commit>`.

---

## Phase 2 — Implement to green (you drive, the engineer steers)

Confirmation granularity here is **per feature, not per test.** You earn one approval on
the plan, then run to green without interrupting — only coming back if reality diverges.

### Present the through-line, once

Before writing implementation code, spend a few tokens on the red thread — the story that
keeps the engineer's mental model intact. For the whole feature, present:

1. **The narrative** — how you intend to make the suite go green, in two or three sentences.
2. **Pseudocode / the steps** — the shape of the solution and the order you'll build it in.
3. **The proposed code** — the actual implementation you plan to write, shown for review.

Then ask for a single confirmation on the plan.

### Implement and commit on green

1. Once the plan is approved, implement test-by-test. After each test goes green, commit it:
   `git commit -m "feat: <behavior> (green)"`. Small, atomic commits tied to passing tests
   give the engineer a granular brake — revert one step, or the whole feature, or keep it.
2. **Run to green without further gates.** Don't re-confirm each step — that's the gate-fatigue
   you're avoiding.
3. **Re-surface only on divergence.** If you discover the approved plan was wrong — a test
   can't be satisfied as designed, the approach needs to change, scope has to grow — stop and
   bring it back to the engineer with what you learned. Approval was for *that* story; a
   different story needs a new approval.
4. When the whole suite is green, summarize what changed and the commits you made. Stop.

---

## What this skill deliberately does NOT do

Keeping these *out* is as important as the steps above — they're the over-engineering the
engineer is reacting against:

- No branches or worktrees by default. A clean tree plus a checkpoint commit is enough.
- No exhaustive test generation. Small and human-curated beats large and automatic.
- No confirmation gates beyond the two (test suite, implementation plan).
- No silent scope expansion. If the work grows beyond the approved plan, surface it.
- No "this should work" — green tests are the only evidence that the feature is done.
