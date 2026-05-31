import {test} from 'node:test'
import assert from 'node:assert/strict'
import {execFile} from 'node:child_process'
import {fileURLToPath} from 'node:url'

const BUNDLE = fileURLToPath(new URL('../dist/cc.js', import.meta.url))

interface RunResult {
  code: number
  stdout: string
  stderr: string
}

// Run the *built bundle* as a real subprocess. `sandbox` controls the CC_SANDBOX marker.
// NODE_OPTIONS is cleared so an inspector in the parent env can't pollute the child's stderr.
function run(args: string[], sandbox: boolean): Promise<RunResult> {
  const env: NodeJS.ProcessEnv = {...process.env, NODE_OPTIONS: ''}
  if (sandbox) env.CC_SANDBOX = '1'
  else delete env.CC_SANDBOX

  return new Promise((resolve) => {
    execFile(process.execPath, [BUNDLE, ...args], {env}, (error, stdout, stderr) => {
      resolve({code: error && typeof error.code === 'number' ? error.code : 0, stdout, stderr})
    })
  })
}

test('e2e: in sandbox → exit 0, no output', async () => {
  const r = await run(['sandbox', 'check'], true)
  assert.equal(r.code, 0)
  assert.equal(r.stdout.trim(), '')
})

test('e2e: outside, default → warning on stdout, exit 0', async () => {
  const r = await run(['sandbox', 'check'], false)
  assert.equal(r.code, 0)
  assert.match(r.stdout, /CC_SANDBOX is not set/)
  assert.doesNotMatch(r.stderr, /CC_SANDBOX is not set/)
})

test('e2e: outside, --strict → warning on stderr, exit 2', async () => {
  const r = await run(['sandbox', 'check', '--strict'], false)
  assert.equal(r.code, 2)
  assert.equal(r.stdout.trim(), '')
  assert.match(r.stderr, /CC_SANDBOX is not set/)
})
