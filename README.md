# Cruise Control (`cc`)

A disciplined, human-in-the-loop TDD workflow for Claude Code.

The engineer drives; the agent is cruise control, not autopilot. You set the destination
and the constraints, you can see the road the whole time (small diffs + a plain-language
through-line), and the brake always works (git). The agent does the mechanical driving and
never takes a decision the code's shape depends on.

## Commands

- **`/cc:init`** — prime a repo once before building. Detects the stack, suggests relevant
  skills from the [skills.sh](https://skills.sh) registry (asking before installing any), and
  writes one small `.claude/cc.md` context file that *points at* your existing docs instead of
  duplicating them.
- **`/cc:feature <description>`** — build a feature test-first. A small human-curated failing
  test suite goes in first and gets committed as a checkpoint, then the agent implements to green
  with atomic commits, after a single plan-level confirmation. Revert anything with `git reset`.

Both also auto-trigger from natural phrasing ("set up this repo", "add feature X"), so the
slash commands are the deterministic entry point, not the only one.

## Design rules

- **Engineer owns the spec.** The tests *are* the specification; which behaviors matter is a
  human decision. The agent proposes the smallest suite that pins real behavior, then the
  engineer shapes it.
- **Small by construction.** Test-minimalism rule: *if two tests would break for the same bug,
  they are the same test — keep one.*
- **Git is the brake.** Never start a feature on a dirty tree. The failing-test commit is the
  checkpoint; every green test is an atomic commit.
- **Pointer + delta.** `init` never copies what's already in a README or CLAUDE.md — it links
  and records only the missing facts, so nothing rots into a stale duplicate.
- **Minimal ceremony.** Two confirmations per feature (test suite, plan). No worktrees, no
  orchestration, no thousand-test suites.

## Sandbox (devcontainer)

Cruise Control does its repo-modifying work inside a **devcontainer sandbox**. The whole basis
of enforcement is a single environment marker, **`CC_SANDBOX=1`**, set by the devcontainer's
`containerEnv` (see `assets/devcontainer/devcontainer.json`).

- **Every skill gates on it.** The first thing `/cc:init` and `/cc:feature` do is check the
  marker via `cc sandbox check --strict`. If you're not in the sandbox, the agent won't touch
  the repo — instead it **offers to write** `.devcontainer/devcontainer.json` for you (and if you
  already have one, it **enforces that one**: it adds `CC_SANDBOX=1` to your existing config
  rather than replacing it), then asks you to *Dev Containers: Reopen in Container* and re-run.
- **Session warning.** A `SessionStart` hook (`hooks/hooks.json`) runs `cc sandbox check` in
  warn-only mode, so a session started outside the container surfaces a notice in context. It
  never blocks.

### The `cc` CLI

The check is a small oclif CLI shipped with the plugin and bundled to a single committed file
(`cli/dist/cc.js`) so it runs with no install step:

```
cc sandbox check            # exit 0 in-sandbox (silent); else warn on stdout, exit 0
cc sandbox check --strict   # exit 0 in-sandbox; else warn on stderr, exit 2 (deny)
```

Contributors who change the CLI rebuild the artifact (it is committed):

```
cd cli && npm install && npm run build   # bundles to cli/dist/cc.js
npm test                                 # unit + end-to-end tests
```

### Opt-in: a strict hard block

By default nothing blocks you — the gate is agent-driven and the hook only warns, so you can
never get locked out mid-setup. If you want a hard block that **denies Bash/Write/Edit outside
the sandbox**, add this `PreToolUse` entry to `hooks/hooks.json` yourself (it is intentionally
*not* shipped active):

```json
"PreToolUse": [
  {
    "matcher": "Bash|Write|Edit",
    "hooks": [
      { "type": "command",
        "command": "node \"${CLAUDE_PLUGIN_ROOT}/cli/dist/cc.js\" sandbox check --strict" }
    ]
  }
]
```

It exits `2` outside the sandbox, which Claude Code treats as denying the tool call.

## Install

The repo root is both the plugin and its own marketplace, so installing is two commands.

### From GitHub (shareable)

```
/plugin marketplace add Simon-Lind-glitch/Cruise-Control
/plugin install cc@cc-marketplace
```

### Local / iterative development

From a clone of this repo, point the marketplace at the working copy:

```
/plugin marketplace add .
/plugin install cc@cc-marketplace
```

### No-install dev shortcut

To load the skills without going through the marketplace, copy or symlink the repo into a
skills directory under the `cc` name — `~/.claude/skills/cc/` (personal) or a repo's
`.claude/skills/cc/` (project). Because `.claude-plugin/plugin.json` is at the root, Claude
Code loads it in place on the next session. Launch from the repo root so it's found.

## Layout

```
cc/
├── .claude-plugin/
│   ├── plugin.json        # plugin manifest (name "cc" → /cc:* commands)
│   └── marketplace.json   # self-hosting marketplace entry (source "./")
├── skills/
│   ├── init/SKILL.md      # /cc:init    (sandbox gate → prime repo)
│   └── feature/SKILL.md   # /cc:feature (sandbox gate → TDD loop)
├── hooks/
│   └── hooks.json         # SessionStart → cc sandbox check (warn-only)
├── assets/
│   └── devcontainer/
│       └── devcontainer.json   # the sandbox template (sets CC_SANDBOX=1)
├── cli/                   # the `cc` CLI (oclif); dist/cc.js is committed
│   ├── src/               # sources + pure decideSandbox logic
│   ├── test/              # unit + e2e tests
│   └── dist/cc.js         # bundled artifact invoked by hooks & skills
└── README.md
```

## Notes from the author

> _In my own words — to be filled in._

## License

MIT (update if you prefer otherwise).
