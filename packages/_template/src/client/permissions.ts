import { session } from '@kernhq/ui'
import { MODULE_ID, templatePermissions } from '../contract.js'

/**
 * What this module lets somebody do.
 *
 * **Derived from the contract, never re-typed.** `key()` throws at import if a name is not declared,
 * which is the whole point: a hand-copied permission string type-checks perfectly while being wrong,
 * and a wrong one silently hides a control or offers one the server refuses. Two modules shipped
 * with copies that had drifted apart before this was written down.
 *
 * Hide what a person may never do; disable — with a reason — what they cannot do right now. The
 * server checks again on every call regardless; this only stops the interface offering a door that
 * will not open.
 */
const key = (suffix: string) => {
  // `MODULE_ID`, not the literal — one place decides what this module is called, and a copy of the
  // generator that renamed the literals but missed a template string would throw at import.
  const found = templatePermissions.find((p) => p.key === `${MODULE_ID}.${suffix}`)
  if (!found) throw new Error(`${MODULE_ID}: no permission declared for ${MODULE_ID}.${suffix}`)
  return found.key
}

export const TEMPLATE_PERMISSIONS = {
  view: key('note.view'),
  manage: key('note.manage'),
} as const

export type TemplatePermission = keyof typeof TEMPLATE_PERMISSIONS

export function canTemplate(permission: TemplatePermission): boolean {
  return session.can(TEMPLATE_PERMISSIONS[permission])
}

/**
 * Sub-features a workspace can switch off inside this module.
 *
 * A client contribution names its own module's capability unqualified — `capability: 'archive'` —
 * because from inside a module there is only one namespace. The shell prefixes it with this module's
 * id when it builds the workspace's set, which is where several modules' capabilities meet.
 *
 * Delete this block if your module is all-or-nothing. Most are.
 */
export const TEMPLATE_CAPABILITIES = {
  notes: 'notes',
  archive: 'archive',
} as const
