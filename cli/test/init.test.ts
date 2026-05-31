import {test} from 'node:test'
import assert from 'node:assert/strict'
import {renderContextDoc, planInit} from '../src/init.ts'

// The CLI no longer detects the stack — the agent does, then fills in the scaffold.
// These tests pin the scaffold contract and the (stack-free) plan.

test('renderContextDoc: scaffolds a Stack placeholder + Test structure section, fabricates nothing', () => {
  const doc = renderContextDoc()
  assert.match(doc, /Stack:/, 'has a Stack line')
  assert.match(doc, /Test structure/i, 'has a Test structure section')
  assert.match(doc, /<!--.*-->/, 'leaves an agent fill-in marker the agent replaces')
  assert.doesNotMatch(doc, /unknown/i, 'does not fabricate an unknown stack')
})

test('planInit dry-run → actions planned but flagged preview', () => {
  const plan = planInit({anchorInstalled: false, dryRun: true})
  assert.equal(plan.dryRun, true)
  assert.ok(
    plan.actions.some((a) => a.kind === 'install-anchor'),
    'plans the anchor install when none present',
  )
  assert.ok(
    plan.actions.some((a) => a.kind === 'write-context-doc'),
    'plans the context doc',
  )
  assert.match(plan.summary, /dry|preview/i)
})

test('planInit: anchor already installed → no install action', () => {
  const plan = planInit({anchorInstalled: true, dryRun: false})
  assert.ok(!plan.actions.some((a) => a.kind === 'install-anchor'), 'skips install (idempotent)')
  assert.ok(plan.actions.some((a) => a.kind === 'write-context-doc'), 'still writes the context doc')
})
