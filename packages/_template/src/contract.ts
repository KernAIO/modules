import {
  baseContract,
  defineCapabilities,
  defineEvent,
  definePermissions,
  PageInput,
  page,
  WorkspaceId,
} from '@kernhq/contracts'
import { z } from 'zod'

/**
 * What this module offers, as data.
 *
 * Imported by **both** halves — the server implements it, the client calls it — so nothing here may
 * touch Node. The contract is the only thing that crosses that line, which is why a procedure that
 * exists here and not in the router is a lie that compiles. `module.test.ts` checks exactly that.
 */

/** Lowercase, 2-32 characters. Names the API prefix, the Postgres schema `mod_<id>` and every event. */
export const MODULE_ID = 'template'

export const Note = z.object({
  id: z.uuid(),
  workspaceId: WorkspaceId,
  title: z.string().min(1).max(120),
  body: z.string().max(4000),
  createdAt: z.string(),
  archivedAt: z.string().nullable(),
})
export type Note = z.infer<typeof Note>

const ws = z.object({ workspaceId: WorkspaceId })

export const templateContract = {
  notes: {
    list: baseContract
      .route({ method: 'GET', path: '/notes', tags: ['template'] })
      .input(ws.extend(PageInput.shape))
      .output(page(Note)),
    create: baseContract
      .route({ method: 'POST', path: '/notes', tags: ['template'] })
      .input(ws.extend({ title: z.string().min(1).max(120), body: z.string().max(4000).default('') }))
      .output(Note),
    remove: baseContract
      .route({ method: 'DELETE', path: '/notes/{noteId}', tags: ['template'] })
      .input(ws.extend({ noteId: z.uuid() }))
      .output(z.object({ ok: z.literal(true) })),
    /**
     * Behind the `archive` capability. A workspace that has not switched it on gets `notFound` here
     * — and never sees the button, because the client half declares the same capability.
     */
    archive: baseContract
      .route({ method: 'POST', path: '/notes/{noteId}/archive', tags: ['template'] })
      .input(ws.extend({ noteId: z.uuid(), archived: z.boolean().default(true) }))
      .output(Note),
  },
}
export type TemplateContract = typeof templateContract

/**
 * Which procedures belong to which capability, as data.
 *
 * Declared rather than inferred, because a missing `requiresCapability` is invisible: the procedure
 * type-checks, the tests pass, and the only symptom is that a workspace which switched the feature
 * off can still call it. `module.test.ts` reads this and fails when a procedure named here is not
 * carrying the extra middleware, which is the one thing `tsc` cannot see.
 *
 * A procedure absent from here belongs to the module as a whole and is reachable whenever the module
 * is on.
 */
export const templateCapabilityProcedures: Record<string, readonly string[]> = {
  archive: ['notes.archive'],
}

/** `<module>.<entity>.<action>`. Anything that emits one declares it here. */
export const templateEvents = {
  noteCreated: defineEvent('template.note.created', z.object({ noteId: z.uuid(), workspaceId: WorkspaceId })),
  noteRemoved: defineEvent('template.note.removed', z.object({ noteId: z.uuid(), workspaceId: WorkspaceId })),
}

/**
 * Sub-features a workspace can switch off inside this module.
 *
 * Delete this block if your module is all-or-nothing — most are, and an empty registry costs
 * nothing. Declare capabilities when different customers want *different amounts* of the module,
 * because the alternatives are a code fork or screens full of controls that do nothing.
 *
 * A capability is not a second permission system:
 *
 * - a **permission** asks whether this *person* may do something; someone else may be allowed it;
 * - a **capability** asks whether this *workspace* has the feature at all. It is off for everyone,
 *   including the owner, and the procedure behind it answers `notFound` rather than `forbidden` —
 *   because a surface the workspace never enabled is not being withheld, it is not there.
 *
 * `dependsOn` is enforced: switching `archive` off would switch off anything that depended on it,
 * transitively, without either of them having to remember. And switching one off never destroys
 * data — it is a flag in this module's settings, so turning it back on restores what was there.
 * Anything that would need a migration to reverse does not belong behind a capability.
 */
export const templateCapabilities = defineCapabilities([
  {
    id: 'notes',
    label: 'Notes',
    description: 'The notes list itself',
    // `required` is the module's own foundation: always on, never offered as a switch.
    required: true,
  },
  {
    id: 'archive',
    label: 'Archive notes',
    description: 'Keep notes out of the list without deleting them',
    dependsOn: ['notes'],
    defaultEnabled: false,
    level: 2,
  },
])

/**
 * `<module>.<resource>.<action>`, each with the narrowest scope that works and the roles that hold it
 * by default. A workspace can add or remove any of them afterwards with a custom role.
 */
export const templatePermissions = definePermissions([
  {
    key: 'template.note.view',
    label: 'View notes',
    scope: 'workspace',
    defaultRoles: ['owner', 'admin', 'member', 'guest'],
    dangerous: false,
  },
  {
    key: 'template.note.manage',
    label: 'Create and delete notes',
    scope: 'workspace',
    defaultRoles: ['owner', 'admin', 'member'],
    dangerous: false,
  },
])
