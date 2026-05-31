import {Command, Flags} from '@oclif/core'
import {decideSandbox, SANDBOX_ENV} from '../../sandbox.js'

export default class SandboxCheck extends Command {
  static summary = 'Check whether we are running inside the Cruise Control devcontainer sandbox.'
  static description =
    `Succeeds silently when ${SANDBOX_ENV}=1. Otherwise warns (stdout, exit 0) so a SessionStart\n` +
    `hook can surface it; with --strict it instead writes to stderr and exits 2 so a PreToolUse\n` +
    `hook treats the call as denied.`

  static examples = ['<%= config.bin %> sandbox check', '<%= config.bin %> sandbox check --strict']

  static flags = {
    strict: Flags.boolean({
      description: 'Exit 2 (deny) instead of warning when outside the sandbox. For an opt-in hard block.',
      default: false,
    }),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(SandboxCheck)
    const decision = decideSandbox(process.env, flags.strict)

    if (decision.stream === 'stdout') process.stdout.write(decision.message + '\n')
    else if (decision.stream === 'stderr') process.stderr.write(decision.message + '\n')

    if (decision.exitCode !== 0) process.exitCode = decision.exitCode
  }
}
