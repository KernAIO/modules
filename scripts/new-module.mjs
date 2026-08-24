/**
 * Start a module, both halves of it.
 *
 * Copying `_template` gets you a working API and a nav item that goes nowhere: the manifest, the
 * page, the API client, the mock and the registry entry all live in the `app` repository, and until
 * now every one of them was hand-work guided by a skill file. This writes them.
 *
 *   pnpm new-module crm
 *
 * Inside the umbrella workspace it writes both halves. Standalone — no `app` checkout beside this
 * one — it writes the package and prints exactly what is still missing, rather than pretending.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const id = (process.argv[2] ?? '').trim()

if (!/^[a-z][a-z0-9_]{1,31}$/.test(id)) {
  console.error('Usage: pnpm new-module <id>')
  console.error('  <id> is lowercase, 2-32 chars, and becomes the API prefix and the Postgres schema.')
  process.exit(1)
}
if (id === 'template') {
  console.error('`template` is the template. Pick the name of the thing you are building.')
  process.exit(1)
}

const Pascal = id.replace(/(^|_)([a-z])/g, (_, __, c) => c.toUpperCase())
const dest = join(root, 'packages', id)
if (existsSync(dest)) {
  console.error(`packages/${id} already exists.`)
  process.exit(1)
}

// ---------------------------------------------------------------- the package
const SKIP = new Set(['node_modules', 'dist', '.turbo'])
cpSync(join(root, 'packages/_template'), dest, {
  recursive: true,
  filter: (src) => !SKIP.has(src.split('/').pop()),
})

/** `template` is a whole word in these files, so a plain replace is safe and a regex is not needed. */
const rewrite = (file) => {
  const text = readFileSync(file, 'utf8')
  const next = text
    .replaceAll('@kernhq/module-template', `@kernhq/module-${id}`)
    .replaceAll('mod_template', `mod_${id}`)
    .replaceAll('templateContract', `${id}Contract`)
    .replaceAll('templateEvents', `${id}Events`)
    .replaceAll('templatePermissions', `${id}Permissions`)
    .replaceAll('templateCapabilityProcedures', `${id}CapabilityProcedures`)
    .replaceAll('templateCapabilities', `${id}Capabilities`)
    .replaceAll('templateModule', `${id}Module`)
    .replaceAll('TemplateContract', `${Pascal}Contract`)
    .replaceAll('TemplateApi', `${Pascal}Api`)
    .replaceAll('createTemplateClient', `create${Pascal}Client`)
    .replaceAll('TEMPLATE_PERMISSIONS', `${id.toUpperCase()}_PERMISSIONS`)
    .replaceAll('TEMPLATE_CAPABILITIES', `${id.toUpperCase()}_CAPABILITIES`)
    .replaceAll("'template'", `'${id}'`)
    .replaceAll('template.note.', `${id}.note.`)
    .replaceAll('Template', Pascal)
  if (next !== text) writeFileSync(file, next)
}

const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full)
    else if (/\.(ts|json|sql|md)$/.test(entry)) rewrite(full)
  }
}
walk(dest)

// package.json: the two things a hand copy gets wrong
const pkgPath = join(dest, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
pkg.name = `@kernhq/module-${id}`
pkg.version = '0.1.0'
delete pkg.private // a private package is skipped silently by changesets
pkg.description = `Kern ${id} module`
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)

// ---------------------------------------------------------------- the app half
const app = join(root, '..', 'app')
const wroteApp = existsSync(join(app, 'src/lib/modules'))

if (wroteApp) {
  const modDir = join(app, 'src/lib/modules', id)
  mkdirSync(join(modDir, 'widgets'), { recursive: true })

  writeFileSync(
    join(modDir, 'permissions.ts'),
    `import { session } from '$lib/state/session.svelte'

/**
 * What this module lets somebody do.
 *
 * Hide what a person may never do; disable — with a reason — what they cannot do right now. The
 * server checks again regardless: this is about not offering a door that will not open.
 */
export const ${id.toUpperCase()}_PERMISSIONS = {
  view: '${id}.note.view',
  manage: '${id}.note.manage',
} as const

export type ${Pascal}Permission = keyof typeof ${id.toUpperCase()}_PERMISSIONS

export function can${Pascal}(permission: ${Pascal}Permission): boolean {
  return session.can(${id.toUpperCase()}_PERMISSIONS[permission])
}

/**
 * Sub-features a workspace can switch off inside this module.
 *
 * Delete this if your module is all-or-nothing. Where it is not, a client contribution names one
 * unqualified — \`capability: '${id.toUpperCase()}_CAPABILITIES.archive'\` — and the shell drops the
 * navigation, widget, command or settings page when the workspace has it off. Nothing is greyed
 * out: a capability is about whether the workspace has the feature at all, so there is nothing to
 * explain and nothing to upgrade to.
 *
 * These ids must match what the server declares in \`defineCapabilities\`, and what the mock reports
 * from \`workspaces.modules.list\` — a disagreement is a screen that works in \`dev:mock\` and 404s
 * against core.
 */
export const ${id.toUpperCase()}_CAPABILITIES = {
  notes: 'notes',
  archive: 'archive',
} as const
`,
  )

  writeFileSync(
    join(modDir, 'api.ts'),
    `import { create${Pascal}Client, type ${Pascal}Api } from '@kernhq/module-${id}/client'
import { browser } from '$app/environment'
import { env } from '$env/dynamic/public'
import { isMock } from '$lib/api/client'
import { createMock${Pascal}Api } from './mock'

/**
 * This module's API client.
 *
 * An empty base URL keeps requests same-origin, so the dev proxy and the reverse proxy both work
 * without CORS. \`PUBLIC_API_MOCK=1\` swaps in the in-memory implementation, which satisfies the same
 * contract types — so no screen has a second code path for demos and end-to-end tests.
 */
export type { ${Pascal}Api }

let cached: ${Pascal}Api | null = null

export function get${Pascal}Api(): ${Pascal}Api {
  if (cached) return cached
  cached = isMock() ? (createMock${Pascal}Api() as unknown as ${Pascal}Api) : create${Pascal}Client({
    baseUrl: env.PUBLIC_API_URL || (browser ? window.location.origin : 'http://localhost:4000'),
  })
  return cached
}

/** Test seam. */
export function __set${Pascal}Api(api: ${Pascal}Api | null) {
  cached = api
}
`,
  )

  writeFileSync(
    join(modDir, 'mock.ts'),
    `/**
 * The in-memory ${id} API.
 *
 * A module missing from the mock has a working page and no way to reach it in exactly the
 * environment used for demos and end-to-end tests. Keep it in step with the contract.
 */
const now = Date.now()
const iso = (msAgo = 0) => new Date(now - msAgo).toISOString()

interface MockNote {
  id: string
  workspaceId: string
  title: string
  body: string
  createdAt: string
  archivedAt: string | null
}

export function createMock${Pascal}Api() {
  const notes: MockNote[] = [
    {
      id: '01920000-0000-7000-8000-0000000${id.length}001',
      workspaceId: '',
      title: 'A first note',
      body: 'Everything here comes from src/lib/modules/${id}/mock.ts',
      createdAt: iso(36e5),
      archivedAt: null,
    },
  ]

  return {
    notes: {
      list: async ({ workspaceId }: { workspaceId: string }) => ({
        items: notes.map((n) => ({ ...n, workspaceId })),
        nextCursor: null,
      }),
      create: async ({ workspaceId, title, body }: { workspaceId: string; title: string; body?: string }) => {
        const note: MockNote = {
          id: crypto.randomUUID(),
          workspaceId,
          title,
          body: body ?? '',
          createdAt: new Date().toISOString(),
          archivedAt: null,
        }
        notes.unshift(note)
        return note
      },
      remove: async ({ noteId }: { noteId: string }) => {
        const at = notes.findIndex((n) => n.id === noteId)
        if (at >= 0) notes.splice(at, 1)
        return { ok: true as const }
      },
      // behind the \`archive\` capability; the mock does not gate, the server does
      archive: async ({ noteId, archived }: { noteId: string; archived?: boolean }) => {
        const note = notes.find((n) => n.id === noteId)
        if (!note) throw new Error('Note not found')
        note.archivedAt = archived === false ? null : new Date().toISOString()
        return note
      },
    },
  }
}
`,
  )
  console.log(`  app  src/lib/modules/${id}/{permissions,api,mock}.ts`)
}

console.log(`\n✓ @kernhq/module-${id} created in packages/${id}\n`)
console.log('Next:')
console.log(`  1. pnpm install                     (from the umbrella root)`)
console.log(`  2. rename the Note entity to yours  (contract.ts, schema.ts, _impl.ts, migrations/)`)
console.log(`  3. pnpm --filter @kernhq/module-${id} db:generate`)
console.log(`  4. write migrations/0001_rls.sql for every tenant table`)
console.log(`  4b. keep or delete ${id}Capabilities in contract.ts — most modules are`)
console.log(`      all-or-nothing and want it gone; declare capabilities only when different`)
console.log(`      customers want different amounts of the module.`)
console.log(`  5. host it: add ${id}Module to featureModules in repos/core/src/service.ts`)
if (wroteApp) {
  console.log(`  6. write the manifest at repos/app/src/lib/modules/${id}/client.ts`)
  console.log(`     and register it in repos/app/src/lib/modules/registry.ts`)
} else {
  console.log(`  6. no app checkout beside this repo, so the client half was not written.`)
  console.log(`     In the umbrella workspace this step is done for you.`)
}
console.log(`\nRead packages/${id}/README.md before publishing.\n`)
