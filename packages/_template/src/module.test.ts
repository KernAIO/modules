/**
 * The template's own guard rails — copy this file along with the rest of the package.
 *
 * It needs no database and no running service: it walks the contract and the router as data and
 * checks the two things that are easy to forget and impossible for `tsc` to see.
 *
 *   1. every procedure the contract promises is actually implemented — a contract entry with no
 *      router entry type-checks perfectly and 404s at runtime;
 *   2. every implemented procedure is behind `workspaceScoped()` *and* a `requires()` — a procedure
 *      that forgets the second one is readable by any member of any workspace with the module on.
 *
 * Add your module's real tests next to it; this one keeps working as the contract grows.
 */
import type { Kernel } from '@kernhq/kernel'
import { describe, expect, it } from 'vitest'
import { MODULE_ID, templateContract, templateEvents, templatePermissions } from './contract.js'
import { implement_ } from './server/_impl.js'
import { templateModule } from './server/index.js'

/** An oRPC procedure (contract or implementation) carries `~orpc`; a router group does not. */
interface Leaf {
  '~orpc': {
    route?: { method?: string; path?: string }
    middlewares?: unknown[]
  }
}
const isLeaf = (node: unknown): node is Leaf =>
  typeof node === 'object' && node !== null && '~orpc' in node

/** `{ widgets: { list, create } }` → `{ 'widgets.list': leaf, 'widgets.create': leaf }` */
function leaves(node: unknown, path: string[] = []): Record<string, Leaf> {
  if (isLeaf(node)) return { [path.join('.')]: node }
  if (typeof node !== 'object' || node === null) return {}
  return Object.entries(node).reduce<Record<string, Leaf>>(
    (acc, [key, value]) => Object.assign(acc, leaves(value, [...path, key])),
    {},
  )
}

// The router is only inspected, never called, so it needs no real kernel behind it.
const declared = leaves(templateContract)
const implemented = leaves(implement_({} as Kernel))

describe('the contract and the router agree', () => {
  it('implements every declared procedure, and nothing that was never declared', () => {
    expect(Object.keys(implemented).sort()).toEqual(Object.keys(declared).sort())
  })

  it('keeps the REST route the contract published', () => {
    for (const [name, leaf] of Object.entries(implemented)) {
      const contractRoute = declared[name]?.['~orpc'].route
      expect(leaf['~orpc'].route?.method, `${name} method`).toBe(contractRoute?.method)
      expect(leaf['~orpc'].route?.path, `${name} path`).toBe(contractRoute?.path)
    }
  })
})

describe('every procedure is authorised', () => {
  it('carries both the workspace/module gate and a permission check', () => {
    for (const [name, leaf] of Object.entries(implemented)) {
      // `workspaceScoped(MODULE_ID)` + `requires('<permission>')`
      expect(leaf['~orpc'].middlewares?.length ?? 0, `${name} middlewares`).toBeGreaterThanOrEqual(2)
    }
  })
})

describe('the module declares what it uses', () => {
  it('names its permissions and events under its own module id', () => {
    for (const p of templatePermissions) expect(p.key.startsWith(`${MODULE_ID}.`), p.key).toBe(true)
    for (const e of Object.values(templateEvents))
      expect(e.name.startsWith(`${MODULE_ID}.`), e.name).toBe(true)
  })

  it('registers those permissions and events on the server module', () => {
    expect(templateModule.definition.id).toBe(MODULE_ID)
    expect(templateModule.definition.permissions).toBe(templatePermissions)
    expect(templateModule.definition.events).toBe(templateEvents)
    expect(templateModule.router, 'a module with a contract has to mount a router').toBeTypeOf(
      'function',
    )
  })
})
