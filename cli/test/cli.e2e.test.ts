import {test} from 'node:test'
import assert from 'node:assert/strict'
import {execFile} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {mkdtemp, mkdir, writeFile, rm, readFile, access} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

const BUNDLE = fileURLToPath(new URL('../dist/cc.js', import.meta.url))

interface RunResult {
  code: number
  stdout: string
  stderr: string
}

// Run the *built bundle* as a real subprocess. `sandbox` controls the CC_SANDBOX marker.
// NODE_OPTIONS is cleared so an inspector in the parent env can't pollute the child's stderr.
// `cwd` lets init tests run against a throwaway repo dir.
function run(args: string[], sandbox: boolean, cwd?: string): Promise<RunResult> {
  const env: NodeJS.ProcessEnv = {...process.env, NODE_OPTIONS: ''}
  if (sandbox) env.CC_SANDBOX = '1'
  else delete env.CC_SANDBOX

  return new Promise((resolve) => {
    execFile(process.execPath, [BUNDLE, ...args], {env, cwd}, (error, stdout, stderr) => {
      resolve({code: error && typeof error.code === 'number' ? error.code : 0, stdout, stderr})
    })
  })
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

// Make a throwaway repo dir with a minimal Node/TS layout for `cc init` to detect.
async function makeRepo(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cc-init-'))
  await writeFile(join(dir, 'package.json'), JSON.stringify({scripts: {test: 'node --test test/*.ts'}}))
  await mkdir(join(dir, 'test'), {recursive: true})
  await writeFile(join(dir, 'test', 'a.test.ts'), '')
  return dir
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

test('e2e: init --dry-run → exit 0, prints a plan, writes nothing', async () => {
  const dir = await makeRepo()
  try {
    const r = await run(['init', '--dry-run'], true, dir)
    assert.equal(r.code, 0)
    assert.match(r.stdout, /npm test/, 'previews the detected test command')
    assert.equal(await exists(join(dir, '.claude', 'cc.md')), false, 'dry-run writes no context doc')
  } finally {
    await rm(dir, {recursive: true, force: true})
  }
})

test('e2e: init → exit 0, writes .claude/cc.md with detected facts', async () => {
  const dir = await makeRepo()
  try {
    const r = await run(['init'], true, dir)
    assert.equal(r.code, 0)
    const docPath = join(dir, '.claude', 'cc.md')
    assert.equal(await exists(docPath), true, 'writes the context doc')
    const doc = await readFile(docPath, 'utf8')
    assert.match(doc, /npm test/, 'doc records the detected test command')
    assert.match(doc, /Test structure/i, 'doc records the test structure')
  } finally {
    await rm(dir, {recursive: true, force: true})
  }
})
