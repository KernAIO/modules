import {
  defineModule,
  defineServerModule,
  type Kernel,
  requires,
  uuidv7,
  workspaceScoped,
} from '@kernalo/kernel'
import { implement } from '@orpc/server'
import { desc, eq } from 'drizzle-orm'
import { MODULE_ID, templateContract, templateEvents } from '../contract.js'
import { widgets } from './schema.js'

export { defineModule, defineServerModule }

const os = implement(templateContract).$context<import('@kernalo/kernel').RequestContext>()

/** Router implementation for the template contract. */
export function implement_(kernel: Kernel) {
  const scoped = os.use(workspaceScoped(MODULE_ID))
  return os.router({
    widgets: {
      list: scoped.widgets.list.use(requires('template.widget.view')).handler(async ({ input, context }) =>
        kernel.database.withWorkspace(input.workspaceId, async (tx) => {
          const rows = await tx
            .select()
            .from(widgets)
            .where(eq(widgets.workspaceId, input.workspaceId))
            .orderBy(desc(widgets.createdAt))
            .limit(input.limit)
          return {
            items: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) as any,
            nextCursor: null,
          }
        }),
      ),
      create: scoped.widgets.create
        .use(requires('template.widget.manage'))
        .handler(async ({ input, context }) => {
          const row = await kernel.database.withWorkspace(input.workspaceId, async (tx) => {
            const [r] = await tx
              .insert(widgets)
              .values({ id: uuidv7(), workspaceId: input.workspaceId, name: input.name })
              .returning()
            return r!
          })
          await kernel.emit(
            templateEvents.widgetCreated,
            { widgetId: row.id, workspaceId: input.workspaceId },
            { workspaceId: input.workspaceId, actorId: context.principal.userId },
          )
          await kernel.realtime.change(input.workspaceId, {
            module: MODULE_ID,
            entity: 'widget',
            id: row.id,
            op: 'created',
          })
          return { ...row, createdAt: row.createdAt.toISOString() } as any
        }),
    },
  })
}
