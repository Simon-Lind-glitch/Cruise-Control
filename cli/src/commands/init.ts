import {Command, Flags} from '@oclif/core'
import {writeFile, mkdir, readdir} from 'node:fs/promises'
import {join} from 'node:path'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {renderContextDoc, planInit} from '../init.js'

const execFileAsync = promisify(execFile)

export default class Init extends Command {
  static summary = 'Prime this repo for Cruise Control: install the TDD anchor and write .claude/cc.md.'
  static description =
    'Full-apply by default — installs the TDD anchor skill (idempotent) and writes a .claude/cc.md\n' +
    'context-doc scaffold for the agent to fill with the detected stack. Use --dry-run to preview.'

  static examples = ['<%= config.bin %> init', '<%= config.bin %> init --dry-run']

  static flags = {
    'dry-run': Flags.boolean({
      description: 'Preview the plan without making any changes.',
      default: false,
    }),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(Init)
    const cwd = process.cwd()

    const anchorInstalled = await hasAnchor(cwd)
    const plan = planInit({anchorInstalled, dryRun: flags['dry-run']})

    this.printPlan(plan)
    if (plan.dryRun) return

    for (const action of plan.actions) {
      if (action.kind === 'install-anchor') await this.installAnchor()
      else if (action.kind === 'write-context-doc') await writeContextDoc(cwd)
    }
    this.log('✓ Done.')
  }

  private printPlan(plan: {actions: {description: string}[]; summary: string}): void {
    this.log(`cc init — ${plan.summary}`)
    this.log('Plan:')
    for (const action of plan.actions) this.log(`  - ${action.description}`)
  }

  private async installAnchor(): Promise<void> {
    try {
      await execFileAsync('npx', ['--yes', 'skills', 'add', 'mattpocock/skills', '--skill', 'tdd'])
      this.log('  ✓ Installed TDD anchor')
    } catch {
      this.warn('Could not install the TDD anchor automatically — run `npx skills add mattpocock/skills --skill tdd` yourself.')
    }
  }
}

// An anchor counts as present if .claude/skills holds at least one entry.
async function hasAnchor(cwd: string): Promise<boolean> {
  try {
    const entries = await readdir(join(cwd, '.claude', 'skills'))
    return entries.length > 0
  } catch {
    return false
  }
}

async function writeContextDoc(cwd: string): Promise<void> {
  const dir = join(cwd, '.claude')
  await mkdir(dir, {recursive: true})
  await writeFile(join(dir, 'cc.md'), renderContextDoc())
}
