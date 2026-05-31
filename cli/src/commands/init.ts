import {Command, Flags} from '@oclif/core'
import {readFile, writeFile, mkdir, readdir} from 'node:fs/promises'
import {join, relative, sep} from 'node:path'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {detectStack, renderContextDoc, planInit, type StackInfo} from '../init.js'

const execFileAsync = promisify(execFile)

// Manifests we read to detect the stack (filename → content map handed to detectStack).
const MANIFEST_FILES = [
  'package.json',
  'tsconfig.json',
  'pyproject.toml',
  'requirements.txt',
  'setup.cfg',
  'go.mod',
  'Cargo.toml',
  'Gemfile',
  'pom.xml',
  'build.gradle',
]

// Directories never worth walking when looking for the test layout.
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.agents', '.claude'])

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
    const {flags} = await this.parse(Init)
    const cwd = process.cwd()

    const manifests = await readManifests(cwd)
    const files = await walkFiles(cwd)
    const stack = detectStack(manifests, files)
    const anchorInstalled = await hasAnchor(cwd)
    const plan = planInit({stack, anchorInstalled, dryRun: flags['dry-run']})

    this.printPlan(stack, plan)
    if (plan.dryRun) return

    for (const action of plan.actions) {
      if (action.kind === 'install-anchor') await this.installAnchor()
      else if (action.kind === 'write-context-doc') await writeContextDoc(cwd, stack)
    }
    this.log('✓ Done.')
  }

  private printPlan(stack: StackInfo, plan: {actions: {description: string}[]; summary: string}): void {
    this.log(`cc init — ${plan.summary}`)
    this.log(`Stack: ${stack.languages.length ? stack.languages.join(' · ') : 'unknown'}`)
    if (stack.testCommand) this.log(`Test: ${stack.testCommand}`)
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

async function readManifests(cwd: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  await Promise.all(
    MANIFEST_FILES.map(async (name) => {
      try {
        out[name] = await readFile(join(cwd, name), 'utf8')
      } catch {
        // absent — fine
      }
    }),
  )
  return out
}

// Bounded recursive walk returning repo-relative, '/'-separated paths. Skips heavy dirs.
async function walkFiles(cwd: string, dir = cwd, depth = 0): Promise<string[]> {
  if (depth > 4) return []
  let entries: import('node:fs').Dirent[]
  try {
    entries = await readdir(dir, {withFileTypes: true})
  } catch {
    return []
  }
  const out: string[] = []
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      out.push(...(await walkFiles(cwd, join(dir, entry.name), depth + 1)))
    } else {
      out.push(relative(cwd, join(dir, entry.name)).split(sep).join('/'))
    }
  }
  return out
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

async function writeContextDoc(cwd: string, stack: StackInfo): Promise<void> {
  const dir = join(cwd, '.claude')
  await mkdir(dir, {recursive: true})
  await writeFile(join(dir, 'cc.md'), renderContextDoc(stack))
}
