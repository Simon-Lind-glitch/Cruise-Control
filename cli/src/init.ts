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

/**
 * Infer the stack from manifest contents (filename → text) and a repo-relative file listing.
 * Pure: the caller reads the filesystem and passes the data in.
 */
export function detectStack(_manifests: Record<string, string>, _files: string[]): StackInfo {
  throw new Error('detectStack: not implemented')
}

/** Render the `.claude/cc.md` context doc from a detected stack. Pure. */
export function renderContextDoc(_stack: StackInfo): string {
  throw new Error('renderContextDoc: not implemented')
}

/** Decide what `cc init` should do, given the stack, what's already installed, and --dry-run. Pure. */
export function planInit(_input: PlanInitInput): InitPlan {
  throw new Error('planInit: not implemented')
}
