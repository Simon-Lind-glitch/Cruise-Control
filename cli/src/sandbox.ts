// Pure sandbox-decision logic, deliberately free of any oclif/Node-CLI dependency so it
// can be unit-tested in isolation. The command layer (commands/sandbox/check.ts) is a thin
// wrapper that applies a SandboxDecision to the real process streams and exit code.

/** The marker the devcontainer's containerEnv sets. Its presence (=== '1') means "in the sandbox". */
export const SANDBOX_ENV = 'CC_SANDBOX'

export const WARNING =
  `⚠️  Cruise Control: ${SANDBOX_ENV} is not set — this session is NOT running inside the\n` +
  `    devcontainer sandbox. Run /cc:init to add (or enforce) a devcontainer, then reopen\n` +
  `    the repo in the container before building features with /cc:feature.`

export interface SandboxDecision {
  /** Whether the marker is present. */
  inSandbox: boolean
  /** Process exit code to set. */
  exitCode: number
  /** Which stream to write the message to (if any). */
  stream: 'none' | 'stdout' | 'stderr'
  /** The message to write (empty when stream is 'none'). */
  message: string
}

/**
 * Decide what `cc sandbox check` should do, given an environment and the --strict flag.
 *
 *  - In the sandbox (CC_SANDBOX === '1'): silent success, regardless of --strict.
 *  - Outside, default: warn on stdout, exit 0 (safe for a SessionStart hook).
 *  - Outside, --strict: warn on stderr, exit 2 (a PreToolUse hook reads this as "deny").
 */
export function decideSandbox(env: NodeJS.ProcessEnv, strict: boolean): SandboxDecision {
  if (env[SANDBOX_ENV] === '1') {
    return {inSandbox: true, exitCode: 0, stream: 'none', message: ''}
  }
  if (strict) {
    return {inSandbox: false, exitCode: 2, stream: 'stderr', message: WARNING}
  }
  return {inSandbox: false, exitCode: 0, stream: 'stdout', message: WARNING}
}
