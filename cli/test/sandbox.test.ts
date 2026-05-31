import {test} from 'node:test'
import assert from 'node:assert/strict'
import {decideSandbox, SANDBOX_ENV, WARNING} from '../src/sandbox.ts'

test('in sandbox → silent success', () => {
  const d = decideSandbox({[SANDBOX_ENV]: '1'}, false)
  assert.deepEqual(d, {inSandbox: true, exitCode: 0, stream: 'none', message: ''})
})

test('in sandbox → --strict is still a silent success (never blocks inside)', () => {
  const d = decideSandbox({[SANDBOX_ENV]: '1'}, true)
  assert.equal(d.inSandbox, true)
  assert.equal(d.exitCode, 0)
  assert.equal(d.stream, 'none')
})

test('outside, default → warn on stdout, exit 0', () => {
  const d = decideSandbox({}, false)
  assert.equal(d.inSandbox, false)
  assert.equal(d.exitCode, 0)
  assert.equal(d.stream, 'stdout')
  assert.equal(d.message, WARNING)
})

test('outside, --strict → warn on stderr, exit 2 (deny)', () => {
  const d = decideSandbox({}, true)
  assert.equal(d.inSandbox, false)
  assert.equal(d.exitCode, 2)
  assert.equal(d.stream, 'stderr')
  assert.equal(d.message, WARNING)
})

test('only the exact value "1" counts as in-sandbox', () => {
  for (const value of ['0', 'true', '', 'yes', ' 1']) {
    assert.equal(decideSandbox({[SANDBOX_ENV]: value}, false).inSandbox, false, `value=${JSON.stringify(value)}`)
  }
})
