import {Command, Flags} from '@oclif/core'

export default class Init extends Command {
  static summary = 'Prime this repo for Cruise Control: detect the stack, install the TDD anchor, write .claude/cc.md.'
  static description =
    'Full-apply by default — detects the stack, installs the TDD anchor skill (idempotent), and writes a\n' +
    '.claude/cc.md context doc pre-filled with the detected facts. Use --dry-run to preview without changes.'

  static examples = ['<%= config.bin %> init', '<%= config.bin %> init --dry-run']

  static flags = {
    'dry-run': Flags.boolean({
      description: 'Preview the plan without making any changes.',
      default: false,
    }),
  }

  async run(): Promise<void> {
    await this.parse(Init)
    throw new Error('cc init: not implemented')
  }
}
