// Entry point for the bundled `cc` CLI (the shebang is added by the bundler).
//
// We route topics to oclif Command classes explicitly rather than relying on oclif's
// filesystem command discovery — discovery does not survive single-file bundling, whereas
// calling `Command.run()` directly does. As the command surface grows, add cases here.
import SandboxCheck from '../src/commands/sandbox/check.js'
import Init from '../src/commands/init.js'

const VERSION = '0.2.0'

const HELP = [
  'cc — Cruise Control CLI',
  '',
  'USAGE',
  '  cc sandbox check [--strict]',
  '  cc init [--dry-run]',
  '',
  'COMMANDS',
  '  sandbox check   Verify the CC_SANDBOX devcontainer sandbox marker is present.',
  '  init            Prime this repo: detect the stack, install the TDD anchor, write .claude/cc.md.',
  '',
  'FLAGS',
  '  --strict        (sandbox check) exit 2 instead of warning when outside the sandbox.',
  '  --dry-run       (init) preview the plan without making any changes.',
  '',
].join('\n')

async function main(argv: string[]): Promise<void> {
  const [topic, sub, ...rest] = argv

  if (topic === 'sandbox' && sub === 'check') {
    await SandboxCheck.run(rest, import.meta.url)
    return
  }

  if (topic === 'init') {
    await Init.run([sub, ...rest].filter((a): a is string => a !== undefined), import.meta.url)
    return
  }

  if (topic === '--version' || topic === '-v') {
    process.stdout.write(`cc/${VERSION}\n`)
    return
  }

  process.stdout.write(HELP)
  // No command (bare `cc` / `--help`) is success; an unrecognized command is an error.
  if (topic && topic !== '--help' && topic !== '-h') process.exitCode = 1
}

main(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
