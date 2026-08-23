/**
 * A module has to report the version of the package it ships in.
 *
 * These two numbers were written separately: changesets bumped `package.json` on release, and the
 * string literal in `defineModule` stayed where somebody first typed it. Chat shipped as 0.2.0 and
 * told every admin it was 0.1.0; mail and tracker were wrong the same way. That literal is what the
 * modules screen renders and what `workspace_modules.installed_version` records, so the one version
 * number a customer sees was wrong for every module we had published.
 *
 * `packageVersion(import.meta.url)` fixes it at the source, and this keeps it fixed. It reads the
 * built output rather than the source, because the lookup has to resolve from `dist/` — which is
 * the layout the images actually ship.
 *
 *   pnpm build && node scripts/check-module-versions.mjs
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const packagesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages')
const read = (p) => JSON.parse(readFileSync(p, 'utf8'))

/** The manifest a server module registers, whatever name the package exports it under. */
function definitionOf(mod) {
  const candidates = [mod.default, ...Object.values(mod)]
  return candidates.find((v) => v && typeof v === 'object' && 'definition' in v)?.definition
}

const problems = []
let checked = 0

for (const name of readdirSync(packagesDir).sort()) {
  const root = join(packagesDir, name)
  const pkgPath = join(root, 'package.json')
  const entry = join(root, 'dist/server/index.js')
  if (!existsSync(pkgPath)) continue
  const pkg = read(pkgPath)
  // packages without a server module (the workflow state machine) register no manifest
  if (!existsSync(entry)) continue

  const definition = definitionOf(await import(entry))
  if (!definition) {
    problems.push(`${pkg.name}: dist/server/index.js exports no module definition`)
    continue
  }
  checked++
  if (definition.version !== pkg.version)
    problems.push(
      `${pkg.name}: manifest says ${definition.version}, package.json says ${pkg.version}` +
        ` — use packageVersion(import.meta.url) in defineModule`,
    )
}

if (problems.length) {
  console.error(`✖ module versions disagree with their packages:\n  ${problems.join('\n  ')}`)
  process.exit(1)
}
console.log(`✔ ${checked} module manifests report their package version`)
