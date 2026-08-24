import { createModuleClient, type KernClientOptions } from '@kernhq/sdk'
import type { ContractRouterClient } from '@orpc/contract'
import type { TemplateContract } from '../contract.js'

/**
 * The client half.
 *
 * Published as **source**, not compiled: the consumer builds the TypeScript and Svelte with its own
 * toolchain, which is what lets `$state` in a module store stay reactive inside the app. Two
 * consequences worth knowing before you edit anything here — nothing in this package compiles it,
 * so `pnpm build` passes over a syntax error and only the app finds it; and `files` in package.json
 * must cover every directory this entry reaches, contract source included.
 *
 * What lives here: the typed API client, and any logic that is about this module but not about a
 * screen (formatting, grouping, parsing). What does not: the `defineClientModule` manifest and the
 * Svelte components, which live in the app so their labels can go through its message catalogue.
 * `pnpm new-module` generates both halves.
 */
export type TemplateApi = ContractRouterClient<TemplateContract>

export function createTemplateClient(opts: KernClientOptions): TemplateApi {
  return createModuleClient<TemplateApi>(opts, 'template')
}

export {
  MODULE_ID,
  type Note,
  templateCapabilities,
  templatePermissions,
} from '../contract.js'

/** The permission keys, so the app gates on a constant rather than a string it retyped. */
export const TEMPLATE_PERMISSIONS = {
  view: 'template.note.view',
  manage: 'template.note.manage',
} as const

/**
 * The capability ids, for the same reason.
 *
 * A client contribution names its own module's capability unqualified — `capability: 'archive'` —
 * because from inside a module there is only one namespace. The shell prefixes it with this
 * module's id when it builds the workspace's set, which is where several modules' capabilities meet.
 */
export const TEMPLATE_CAPABILITIES = {
  notes: 'notes',
  archive: 'archive',
} as const
