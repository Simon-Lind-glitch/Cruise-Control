import {test} from 'node:test'
import assert from 'node:assert/strict'
import {detectStack, renderContextDoc, planInit, type StackInfo} from '../src/init.ts'

// A representative Node/TS stack, used by the doc/plan tests.
const NODE_STACK: StackInfo = {
  languages: ['TypeScript', 'Node'],
  testRunner: 'node:test',
  testCommand: 'npm test',
  buildCommand: 'npm run build',
  singleTestCommand: 'node --test <file>',
  testDir: 'test',
  testGlob: '*.test.ts',
}

test('detectStack: package.json scripts → Node/TS, test + build + single-test commands', () => {
  const manifests = {
    'package.json': JSON.stringify({scripts: {test: 'node --test test/*.ts', build: 'node build.mjs'}}),
    'tsconfig.json': '{}',
  }
  const s = detectStack(manifests, ['package.json', 'tsconfig.json'])
  assert.ok(s.languages.includes('TypeScript'), 'TypeScript from tsconfig.json')
  assert.ok(s.languages.includes('Node'), 'Node from package.json')
  assert.equal(s.testCommand, 'npm test')
  assert.equal(s.buildCommand, 'npm run build')
  assert.match(s.singleTestCommand ?? '', /node --test/)
})

test('detectStack: pyproject.toml → Python', () => {
  const s = detectStack({'pyproject.toml': '[project]\nname = "x"\n'}, ['pyproject.toml'])
  assert.ok(s.languages.includes('Python'), 'Python from pyproject.toml')
})

test('detectStack: no recognized manifest → empty stack, no crash', () => {
  const s = detectStack({}, [])
  assert.deepEqual(s.languages, [])
  assert.equal(s.testCommand, null)
})

test('detectStack: derives test layout from file paths', () => {
  const files = ['package.json', 'src/x.ts', 'test/foo.test.ts', 'test/bar.test.ts']
  const s = detectStack({'package.json': '{}'}, files)
  assert.equal(s.testDir, 'test')
  assert.equal(s.testGlob, '*.test.ts')
})

test('renderContextDoc embeds stack + a Test structure section', () => {
  const doc = renderContextDoc(NODE_STACK)
  assert.match(doc, /npm test/, 'test command')
  assert.match(doc, /npm run build/, 'build command')
  assert.match(doc, /Test structure/i, 'a test-structure section')
  assert.match(doc, /node --test/, 'single-test command')
  assert.match(doc, /\btest\b/, 'test directory')
})

test('planInit dry-run → actions are planned but flagged preview', () => {
  const plan = planInit({stack: NODE_STACK, anchorInstalled: false, dryRun: true})
  assert.equal(plan.dryRun, true)
  assert.ok(plan.actions.length > 0, 'still shows what it would do')
  assert.ok(
    plan.actions.some((a) => a.kind === 'install-anchor'),
    'plans the anchor install when none present',
  )
  assert.match(plan.summary, /dry|preview/i)
})

test('planInit: anchor already installed → no install action', () => {
  const plan = planInit({stack: NODE_STACK, anchorInstalled: true, dryRun: false})
  assert.ok(!plan.actions.some((a) => a.kind === 'install-anchor'), 'skips install (idempotent)')
  assert.ok(plan.actions.some((a) => a.kind === 'write-context-doc'), 'still writes the context doc')
})
