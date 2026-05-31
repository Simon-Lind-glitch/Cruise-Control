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
  assert.match(SKILL, /Two confirmations per feature/i, 'two-confirmation rule must remain')
  assert.match(SKILL, /test: <feature> \(red\)/, 'red checkpoint commit must remain')
  assert.match(SKILL, /feat: <behavior> \(green\)/, 'green commit cadence must remain')
  // Generic red-green craft that the tdd skill now owns — delegated, not duplicated.
  assert.doesNotMatch(SKILL, /not red from a typo or import error/i, 'generic TDD craft prose should be delegated to the tdd skill')
})
