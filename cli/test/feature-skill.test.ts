import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, join} from 'node:path'

// The feature skill delegates the red-green craft to the external `tdd` skill instead of
// restating it. These are content-regression tests on the skill text: they pin that the
// delegation directive, the precedence note, and the cruise-control orchestration survive
// edits. They prove the prose is correct — not that the agent loads the skill at runtime
// (that is the Skill tool's job, inherent to a skill-text change).

const here = dirname(fileURLToPath(import.meta.url))
const SKILL = readFileSync(join(here, '..', '..', 'skills', 'feature', 'SKILL.md'), 'utf8')

// The slice of the doc that is Phase 1 — where test-speccing (and thus the tdd handoff) lives.
function phase1(doc: string): string {
  const start = doc.indexOf('## Phase 1')
  const end = doc.indexOf('## Phase 2')
  assert.ok(start !== -1 && end !== -1 && end > start, 'Phase 1 / Phase 2 headings must exist')
  return doc.slice(start, end)
}

// The slice of the doc that is Phase 2 — where the implementation cadence (small diffs, per-diff
// checkpoints) lives.
function phase2(doc: string): string {
  const start = doc.indexOf('## Phase 2')
  const end = doc.indexOf('## What this skill')
  assert.ok(start !== -1 && end !== -1 && end > start, 'Phase 2 / "What this skill" headings must exist')
  return doc.slice(start, end)
}

test('Phase 1 instructs invoking the external `tdd` skill before writing tests', () => {
  const p1 = phase1(SKILL)
  assert.match(p1, /\btdd\b/i, 'Phase 1 should name the tdd skill')
  assert.match(p1, /\bskill\b/i, 'Phase 1 should refer to it as a skill')
  assert.match(p1, /\b(invoke|load|use)\b/i, 'Phase 1 should instruct invoking/loading the skill')
})

test('a precedence note keeps the feature skill’s commit/confirmation rules ahead of the tdd skill', () => {
  assert.match(SKILL, /precedence/i, 'there must be a precedence note')
  // The precedence sentence must be about THIS skill's commit/confirmation rules winning.
  const line = SKILL.split('\n').find((l) => /precedence/i.test(l)) ?? ''
  assert.match(line, /commit|confirmation|rules/i, 'precedence must concern the commit/confirmation rules')
})

test('the orchestration survives the trim and the generic TDD craft prose is gone', () => {
  // Orchestration invariants that make this skill itself — must remain.
  assert.match(SKILL, /If two tests would break for the same bug/i, 'minimal-suite rule must remain')
  assert.match(SKILL, /test: <feature> \(red\)/, 'red checkpoint commit must remain')
  assert.match(SKILL, /feat: <behavior> \(green\)/, 'green commit cadence must remain')
  // Generic red-green craft that the tdd skill now owns — delegated, not duplicated.
  assert.doesNotMatch(SKILL, /not red from a typo or import error/i, 'generic TDD craft prose should be delegated to the tdd skill')
})

test('Phase 2 builds in small diffs, one step at a time', () => {
  const p2 = phase2(SKILL)
  assert.match(p2, /small,? diffs?/i, 'Phase 2 should commit to small diffs')
  assert.match(p2, /step[- ]by[- ]step|one (diff|step) at a time/i, 'Phase 2 should build one step at a time')
})

test('each implementation diff pauses for the engineer to accept-and-continue or redirect', () => {
  const p2 = phase2(SKILL)
  assert.match(p2, /\baccept\b/i, 'Phase 2 should let the engineer accept a diff')
  assert.match(p2, /redirect|give input|your input/i, 'Phase 2 should let the engineer redirect / give input')
  assert.match(p2, /\b(pause|stop|wait)\b/i, 'Phase 2 should pause at each diff')
})

test('the upfront is a lightweight step-list of the red thread, not a full code dump or run-to-green plan', () => {
  const p2 = phase2(SKILL)
  assert.match(p2, /step[- ]list/i, 'the upfront should be a one-line step-list')
  assert.doesNotMatch(p2, /run to green without/i, 'the old "run to green without further gates" directive must be gone')
  assert.doesNotMatch(p2, /per feature, not per test/i, 'the old per-feature confirmation framing must be gone')
})

test('the minimal-ceremony identity is "small diffs, not big gates", replacing the two-confirmations framing', () => {
  assert.match(SKILL, /small diffs, not big gates/i, 'the new minimal-ceremony identity must be present')
  assert.doesNotMatch(SKILL, /two confirmations per feature/i, 'the old two-confirmations framing must be gone')
})
