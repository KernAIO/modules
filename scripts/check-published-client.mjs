/**
 * A module publishes `src/client` as source: consumers compile the Svelte components with their own
 * toolchain. That only works if everything the client imports is inside the tarball — and it is easy
 * not to notice when it isn't, because in the development workspace the whole repository is linked
 * and every path resolves. It failed for real once: the app's build died on
 * "Could not resolve '../kql/ast.js'" against a package that worked perfectly here.
 *
 * So: pack each package for real, then walk every relative import from the published client entry
 * and check the file is there.
 *
 *   node scripts/check-published-client.mjs
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'

const CANDIDATE_SUFFIXES = ['', '.ts', '.js', '.svelte', '/index.ts', '/index.js']

/** Follow every relative import from `entry`, and return the ones that lead nowhere. */
function unresolvedFrom(entry, packageRoot) {
  const seen = new Set()
  const missing = []
  const visit = (file) => {
    if (seen.has(file)) return
    seen.add(file)
    for (const [, spec] of readFileSync(file, 'utf8').matchAll(/from '([^']+)'/g)) {
      if (!spec.startsWith('.')) continue
      const base = resolve(dirname(file), spec.replace(/\.js$/, ''))
      const hit = CANDIDATE_SUFFIXES.map((s) => base + s).find((p) => existsSync(p) && statSync(p).isFile())
      if (hit) visit(hit)
      else missing.push(`${relative(packageRoot, file)} → ${spec}`)
    }
  }
  visit(entry)
  return { missing: [...new Set(missing)], followed: seen.size }
}

// Keyed on what a package promises, not on what happens to be on disk: a `./client` export whose
// file does not exist is exactly the kind of thing this is here to catch.
const clientEntryOf = (pkg) => {
  const entry = pkg.exports?.['./client']
  return typeof entry === 'string' ? entry : entry?.default
}
const packages = readdirSync('packages').filter((name) => {
  const manifest = join('packages', name, 'package.json')
  return existsSync(manifest) && clientEntryOf(JSON.parse(readFileSync(manifest, 'utf8')))
})

let failed = false
for (const name of packages) {
  const dir = join('packages', name)
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  if (pkg.private) {
    console.log(`- ${pkg.name}: private, not published`)
    continue
  }
  const out = mkdtempSync(join(tmpdir(), 'kern-pack-'))
  try {
    execFileSync('npm', ['pack', '--pack-destination', out], { cwd: dir, stdio: 'pipe' })
    const tarball = join(
      out,
      readdirSync(out).find((f) => f.endsWith('.tgz')),
    )
    execFileSync('tar', ['xzf', tarball, '-C', out])
    const root = join(out, 'package')
    const declared = clientEntryOf(pkg)
    const entry = join(root, declared)
    if (!existsSync(entry)) {
      console.error(`✗ ${pkg.name}: the ./client export points at ${declared}, which is not in the tarball`)
      failed = true
      continue
    }
    const { missing, followed } = unresolvedFrom(entry, root)
    if (missing.length) {
      console.error(`✗ ${pkg.name}: ${missing.length} import(s) point outside the tarball`)
      for (const m of missing) console.error(`    ${m}`)
      console.error(`    Add what they need to "files", or import the package's own entry points.`)
      failed = true
    } else {
      console.log(`✓ ${pkg.name}: ${followed} files reachable from the published client`)
    }
  } finally {
    rmSync(out, { recursive: true, force: true })
  }
}

process.exit(failed ? 1 : 0)
