import {
  defineModule,
  defineServerModule,
  type Kernel,
  packageVersion,
  type RequestContext,
  requires,
  uuidv7,
  workspaceScoped,
} from '@kernhq/kernel'
import { implement } from '@orpc/server'
import { and, desc, eq } from 'drizzle-orm'
import { MODULE_ID, templateContract, templateEvents } from '../contract.js'
import { notes } from './schema.js'

/**
 * The router, kept apart from `index.ts` so `module.test.ts` can walk it without booting a kernel.
 *
 * Two middlewares on every procedure, and the test fails if either is missing:
 * `workspaceScoped` (a real membership, and the module switched on for that workspace) and
 * `requires` (the permission this particular call needs).
 */
export { defineModule, defineServerModule, packageVersion }

const os = implement(templateContract).$context<RequestContext>()

export function implement_(kernel: Kernel) {
  const scoped = os.use(workspaceScoped(MODULE_ID))

  return os.router({
    notes: {
      list: scoped.notes.list.use(requires('template.note.view')).handler(({ input }) =>
        // Every tenant query runs inside `withWorkspace`, which sets `app.workspace_id` for the
        // transaction. Outside it, the RLS policy matches nothing and the query returns no rows.
        kernel.database.withWorkspace(input.workspaceId, async (tx) => {
          const rows = await tx
            .select()
            .from(notes)
            .where(eq(notes.workspaceId, input.workspaceId))
            .orderBy(desc(notes.createdAt))
            .limit(input.limit)
          return {
            items: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
            nextCursor: null,
          }
        }),
      ),

      create: scoped.notes.create
        .use(requires('template.note.manage'))
        .handler(async ({ input, context }) => {
          const row = await kernel.database.withWorkspace(input.workspaceId, async (tx) => {
            const [r] = await tx
              .insert(notes)
              .values({
                id: uuidv7(),
                workspaceId: input.workspaceId,
                title: input.title,
                body: input.body,
              })
              .returning()
            return r!
          })

          // Both, every time. The event is for anything that reacts later; the realtime change is
          // what redraws a screen somebody is looking at now. A mutation that does neither leaves
          // the rest of the product believing the old answer.
          await kernel.emit(
            templateEvents.noteCreated,
            { noteId: row.id, workspaceId: input.workspaceId },
            { workspaceId: input.workspaceId, actorId: context.principal.userId },
          )
          await kernel.realtime.change(input.workspaceId, {
            module: MODULE_ID,
            entity: 'note',
            id: row.id,
            op: 'created',
          })

          return { ...row, createdAt: row.createdAt.toISOString() }
        }),

      remove: scoped.notes.remove
        .use(requires('template.note.manage'))
        .handler(async ({ input, context }) => {
          await kernel.database.withWorkspace(input.workspaceId, (tx) =>
            tx.delete(notes).where(and(eq(notes.workspaceId, input.workspaceId), eq(notes.id, input.noteId))),
          )
          await kernel.emit(
            templateEvents.noteRemoved,
            { noteId: input.noteId, workspaceId: input.workspaceId },
            { workspaceId: input.workspaceId, actorId: context.principal.userId },
          )
          await kernel.realtime.change(input.workspaceId, {
            module: MODULE_ID,
            entity: 'note',
            id: input.noteId,
            op: 'deleted',
          })
          return { ok: true as const }
        }),
    },
  })
}
