# Cruise Control — project context

Sources of truth (do not duplicate): `README.md` (full design rules, sandbox model, install,
layout). This file records only the delta the feature loop needs.

This repo *is* Cruise Control — the `cc` Claude Code plugin — and uses its own
`/cc:feature` loop and TDD anchor (`.claude/skills/tdd`).

Stack: TypeScript (ESM, NodeNext, strict) · Node 22 · oclif CLI · esbuild bundle · `node --test`.
All CLI work lives under `cli/`.

Test (from `cli/`): `npm test`        — build + unit + e2e
Single test (from `cli/`): `node --test test/sandbox.test.ts`   (swap the file)
Typecheck (from `cli/`): `npm run typecheck`
Build artifact: `npm run build` → bundles to `cli/dist/cc.js` (committed; rebuild when CLI changes).

Branch policy: never start a feature on a dirty tree; failing-test commit is the checkpoint,
every green test is an atomic commit (see README "Design rules").
Commit convention: none enforced — match existing `git log` style.
