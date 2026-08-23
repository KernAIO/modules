import { baseContract, defineEvent, definePermissions, PageInput, page, WorkspaceId } from '@kernhq/contracts'
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
  },
}
export type TemplateContract = typeof templateContract

/** `<module>.<entity>.<action>`. Anything that emits one declares it here. */
export const templateEvents = {
  noteCreated: defineEvent('template.note.created', z.object({ noteId: z.uuid(), workspaceId: WorkspaceId })),
  noteRemoved: defineEvent('template.note.removed', z.object({ noteId: z.uuid(), workspaceId: WorkspaceId })),
}

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
