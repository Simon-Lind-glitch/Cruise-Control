// Pure init logic — deliberately free of any oclif/fs/network dependency so it can be
// unit-tested in isolation, mirroring sandbox.ts. The command layer (commands/init.ts)
// applies the plan to the filesystem and shells out to the skills CLI. Stack determination
// is the agent's job (see the init skill), not the CLI's — so nothing here detects a stack.

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
  /** Whether a TDD anchor skill is already installed (idempotency). */
  anchorInstalled: boolean
  dryRun: boolean
}

/**
 * Render the `.claude/cc.md` scaffold. The CLI does not detect the stack — it leaves
 * fill-in markers the agent replaces after reading the repo. Pure.
 */
export function renderContextDoc(): string {
  return [
    '# Cruise Control — project context',
    '',
    'Sources of truth (do not duplicate): README.md and any CONTRIBUTING.md / docs/.',
    'This file records only the delta the feature loop needs.',
    '',
    'Stack: <!-- agent: languages/runtimes, e.g. TypeScript · Node 22 -->',
    '',
    '## Test structure',
    '<!-- agent: test command, single-test command, test dir + glob -->',
    '',
    'This repo uses the Cruise Control feature loop (`/cc:feature`) and a TDD anchor skill.',
    '',
  ].join('\n')
}

/** Decide what `cc init` should do, given what's already installed and --dry-run. Pure. */
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
