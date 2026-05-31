// Pure init logic — deliberately free of any oclif/fs/network dependency so it can be
// unit-tested in isolation, mirroring sandbox.ts. The command layer (commands/init.ts)
// supplies real manifest contents + a file listing, applies the plan to the filesystem,
// and shells out to the skills CLI. Everything decision-shaped lives here.

/** What we infer about a repo's stack from its manifests and file layout. */
export interface StackInfo {
  /** Human-readable languages/runtimes, e.g. ['TypeScript', 'Node']. */
  languages: string[]
  /** Detected test runner key, e.g. 'node:test' | 'vitest' | 'jest' | 'pytest' | 'go test' | 'cargo test'. */
  testRunner: string | null
  /** How to run the whole suite, e.g. 'npm test' | 'pytest'. */
  testCommand: string | null
  /** How to build, if there's a build step, e.g. 'npm run build'. */
  buildCommand: string | null
  /** How to run a single test file, e.g. 'node --test <file>'. */
  singleTestCommand: string | null
  /** The directory tests live in, e.g. 'test'. */
  testDir: string | null
  /** The glob test files match, e.g. '*.test.ts'. */
  testGlob: string | null
}

/** One thing `cc init` will do (or, in dry-run, would do). */
export interface InitAction {
  kind: 'install-anchor' | 'write-context-doc'
  description: string
}

/** The full plan `cc init` computes before touching anything. */
export interface InitPlan {
  actions: InitAction[]
  dryRun: boolean
  summary: string
}

export interface PlanInitInput {
  stack: StackInfo
  /** Whether a TDD anchor skill is already installed (idempotency). */
  anchorInstalled: boolean
  dryRun: boolean
}

// Presence of a manifest implies a language/runtime. Order matters only for readability;
// duplicates (two manifests → same language) are de-duped below.
const LANG_BY_MANIFEST: ReadonlyArray<readonly [string, string]> = [
  ['tsconfig.json', 'TypeScript'],
  ['package.json', 'Node'],
  ['pyproject.toml', 'Python'],
  ['requirements.txt', 'Python'],
  ['setup.cfg', 'Python'],
  ['go.mod', 'Go'],
  ['Cargo.toml', 'Rust'],
  ['Gemfile', 'Ruby'],
  ['pom.xml', 'Java'],
  ['build.gradle', 'JVM'],
]

// How to run a single test, keyed by runner.
const SINGLE_TEST: Record<string, string> = {
  'node:test': 'node --test <file>',
  vitest: 'vitest run <file>',
  jest: 'jest <file>',
  pytest: 'pytest <file>',
  'go test': 'go test ./<package>',
  'cargo test': 'cargo test <name>',
}

function safeJson(text: string): {scripts?: Record<string, string>} | null {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

// Treat a path as a test file if its basename carries a .test./.spec. marker, or it lives
// under a conventional test directory.
const TEST_FILE = /(?:^|\/)([^/]+\.(test|spec)\.[cm]?[jt]sx?)$/
const TEST_DIR_SEGMENT = /(?:^|\/)(tests?|__tests__|spec)(?:\/|$)/

function deriveTestLayout(files: string[]): {testDir: string | null; testGlob: string | null} {
  const dirs = new Map<string, number>()
  let glob: string | null = null

  for (const f of files) {
    const markerMatch = f.match(TEST_FILE)
    const dirMatch = f.match(TEST_DIR_SEGMENT)
    if (!markerMatch && !dirMatch) continue

    // Tally the top-level directory the test sits under (so 'test/a/b.test.ts' counts 'test').
    const top = f.includes('/') ? f.slice(0, f.indexOf('/')) : '.'
    dirs.set(top, (dirs.get(top) ?? 0) + 1)

    // Glob from the first marker-style file we see: 'foo.test.ts' → '*.test.ts'.
    if (!glob && markerMatch) {
      const base = markerMatch[1] // e.g. 'foo.test.ts'
      glob = '*' + base.slice(base.indexOf('.' + markerMatch[2]))
    }
  }

  let testDir: string | null = null
  let best = 0
  for (const [dir, count] of dirs)
    if (count > best) {
      best = count
      testDir = dir
    }

  return {testDir, testGlob: glob}
}

/**
 * Infer the stack from manifest contents (filename → text) and a repo-relative file listing.
 * Pure: the caller reads the filesystem and passes the data in.
 */
export function detectStack(manifests: Record<string, string>, files: string[]): StackInfo {
  const languages: string[] = []
  for (const [file, lang] of LANG_BY_MANIFEST)
    if (file in manifests && !languages.includes(lang)) languages.push(lang)

  let testRunner: string | null = null
  let testCommand: string | null = null
  let buildCommand: string | null = null

  if ('package.json' in manifests) {
    const scripts = safeJson(manifests['package.json'])?.scripts ?? {}
    if (scripts.build) buildCommand = 'npm run build'
    if (scripts.test) {
      testCommand = 'npm test'
      const t = String(scripts.test)
      testRunner = /vitest/.test(t)
        ? 'vitest'
        : /jest/.test(t)
          ? 'jest'
          : /node\s+--test/.test(t)
            ? 'node:test'
            : null
    }
  } else if ('pyproject.toml' in manifests || 'setup.cfg' in manifests || 'requirements.txt' in manifests) {
    testRunner = 'pytest'
    testCommand = 'pytest'
  } else if ('go.mod' in manifests) {
    testRunner = 'go test'
    testCommand = 'go test ./...'
  } else if ('Cargo.toml' in manifests) {
    testRunner = 'cargo test'
    testCommand = 'cargo test'
  }

  const singleTestCommand = testRunner ? (SINGLE_TEST[testRunner] ?? null) : null
  const {testDir, testGlob} = deriveTestLayout(files)

  return {languages, testRunner, testCommand, buildCommand, singleTestCommand, testDir, testGlob}
}

/** Render the `.claude/cc.md` context doc from a detected stack. Pure. */
export function renderContextDoc(stack: StackInfo): string {
  const langs = stack.languages.length ? stack.languages.join(' · ') : 'unknown'
  const lines: string[] = [
    '# Cruise Control — project context',
    '',
    'Sources of truth (do not duplicate): README.md and any CONTRIBUTING.md / docs/.',
    'This file records only the delta the feature loop needs — written by `cc init`.',
    '',
    `Stack: ${langs}`,
  ]

  if (stack.testCommand) lines.push(`Test: \`${stack.testCommand}\``)
  if (stack.buildCommand) lines.push(`Build: \`${stack.buildCommand}\``)

  lines.push('', '## Test structure')
  lines.push(`Runner: ${stack.testRunner ?? 'unknown'}`)
  if (stack.testDir) lines.push(`Tests live in: \`${stack.testDir}/\` (matching \`${stack.testGlob ?? '*'}\`)`)
  if (stack.singleTestCommand) lines.push(`Run a single test: \`${stack.singleTestCommand}\``)

  lines.push(
    '',
    'This repo uses the Cruise Control feature loop (`/cc:feature`) and a TDD anchor skill.',
    '',
  )
  return lines.join('\n')
}

/** Decide what `cc init` should do, given the stack, what's already installed, and --dry-run. Pure. */
export function planInit(input: PlanInitInput): InitPlan {
  const actions: InitAction[] = []
  if (!input.anchorInstalled)
    actions.push({kind: 'install-anchor', description: 'Install the TDD anchor skill (mattpocock/skills tdd)'})
  actions.push({kind: 'write-context-doc', description: 'Write .claude/cc.md context doc'})

  const summary = input.dryRun
    ? 'Dry run — preview only, no changes made.'
    : 'Applying cc init — priming this repo.'

  return {actions, dryRun: input.dryRun, summary}
}
