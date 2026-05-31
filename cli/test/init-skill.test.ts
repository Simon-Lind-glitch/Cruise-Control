import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, join} from 'node:path'

// Stack determination now belongs to the agent, not the CLI. These are content-regression
// tests on the init skill text: they pin that the skill directs the agent to determine the
// stack and record it in cc.md, and that the old "the CLI is the source of truth for
// detection" directive is gone. (That the agent loads the skill at runtime is the Skill
// tool's job — inherent to a skill-text change, not asserted here.)

const here = dirname(fileURLToPath(import.meta.url))
const SKILL = readFileSync(join(here, '..', '..', 'skills', 'init', 'SKILL.md'), 'utf8')

test('the init skill directs the agent to determine the stack and record it in cc.md', () => {
  assert.match(SKILL, /determine the stack/i, 'skill instructs the agent to determine the stack')
  assert.match(SKILL, /cc\.md/, 'and to record it in cc.md')
})

test('the old "CLI owns detection / don’t re-derive" directive is gone', () => {
  assert.doesNotMatch(SKILL, /re-derive detection/i, 'CLI-owns-detection directive should be removed')
  assert.doesNotMatch(SKILL, /deterministic source of truth/i, 'CLI-as-detection-source-of-truth should be removed')
})
