/**
 * Start a module.
 *
 * A module is **one package**: contract, server, screens, strings and manifest. It used to be two —
 * the headless half here and the manifest, pages, API client and mock in the `app` repository — and
 * every screen in the product lived in the app, which meant nobody outside this organisation could
 * ship one. That is no longer true, and this generator no longer writes an app half.
 *
 *   pnpm new-module crm
 *
 * The only thing left outside the package is one line registering it: `featureModules` in a host
 * service, and `registerModule` in the app's registry.
 */
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
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
    .replaceAll('templateClientModule', `${id}ClientModule`)
    .replaceAll('templateMessageBundles', `${id}MessageBundles`)
    .replaceAll('createMockTemplateApi', `createMock${Pascal}Api`)
    .replaceAll('getTemplateApi', `get${Pascal}Api`)
    .replaceAll('__setTemplateApi', `__set${Pascal}Api`)
    .replaceAll('canTemplate', `can${Pascal}`)
    .replaceAll('TemplateMessageKey', `${Pascal}MessageKey`)
    .replaceAll('TemplatePermission', `${Pascal}Permission`)
    .replaceAll('TemplateContract', `${Pascal}Contract`)
    .replaceAll('TemplateApi', `${Pascal}Api`)
    .replaceAll('createTemplateClient', `create${Pascal}Client`)
    .replaceAll('TEMPLATE_PERMISSIONS', `${id.toUpperCase()}_PERMISSIONS`)
    .replaceAll('TEMPLATE_CAPABILITIES', `${id.toUpperCase()}_CAPABILITIES`)
    .replaceAll("'template'", `'${id}'`)
    // URLs the manifest declares, and the namespaced keys in the message bundle
    .replaceAll("'/template", `'/${id}`)
    .replaceAll('/template', `/${id}`)
    .replaceAll("'template.", `'${id}.`)
    .replaceAll('template.note.', `${id}.note.`)
    .replaceAll('Template', Pascal)
  if (next !== text) writeFileSync(file, next)
}

const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full)
    else if (/\.(ts|json|sql|md|svelte)$/.test(entry)) rewrite(full)
  }
}
walk(dest)

// package.json: the things a hand copy gets wrong
const pkgPath = join(dest, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
pkg.name = `@kernhq/module-${id}`
pkg.version = '0.1.0'
delete pkg.private // a private package is skipped silently by changesets
pkg.description = `Kern ${id} module`
/**
 * A first-party module is AGPL-3.0-only, and carries no LICENSE file of its own — the repository
 * root's covers it.
 *
 * `_template` is Apache-2.0 because a third party must be able to copy it and keep their module
 * closed (ADR 0005), and it ships a LICENSE file saying so. Copying the template therefore copies
 * the wrong licence, which is a copyright statement rather than a typo: an Apache-2.0 first-party
 * module gives away the copyleft that makes the product's licence mean anything. Nothing checks
 * this, and it shipped that way once.
 *
 * Building something a third-party module must import? Then it belongs in the framework half, and
 * that decision is `kern-repo`'s, not this script's.
 */
pkg.license = 'AGPL-3.0-only'
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
rmSync(join(dest, 'LICENSE'), { force: true })

console.log(`\n✓ @kernhq/module-${id} created in packages/${id}\n`)
console.log('Next:')
console.log(`  1. pnpm install                     (from the umbrella root)`)
console.log(`  2. rename the Note entity to yours  (contract.ts, schema.ts, _impl.ts, migrations/)`)
console.log(`  3. pnpm --filter @kernhq/module-${id} db:generate`)
console.log(`  4. write migrations/0001_rls.sql for every tenant table`)
console.log(`  5. build the screens in src/client — pages/, widgets/, and the manifest in module.ts`)
console.log(`  6. host the server half: add ${id}Module to featureModules in repos/core/src/service.ts`)
console.log(`  7. register the client: registerModule(${id}ClientModule) in`)
console.log(`     repos/app/src/lib/modules/registry.ts, importing from '@kernhq/module-${id}/client'`)
console.log('')
console.log('Those last two lines are the only wiring outside this package. Everything the')
console.log('interface offers — navigation, routes, widgets, settings pages, strings — is declared')
console.log(`in src/client/module.ts, and the shell renders whatever it finds there.`)
console.log('')
console.log(`Capabilities: keep or delete ${id}Capabilities in contract.ts and`)
console.log('src/client/permissions.ts. Most modules are all-or-nothing and want them gone;')
console.log('declare them only when different customers want different amounts of the module.')
console.log(`\nRead packages/${id}/README.md before publishing.\n`)
