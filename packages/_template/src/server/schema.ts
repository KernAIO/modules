import { moduleSchema } from '@kernaio/kernel'
import { sql } from 'drizzle-orm'
import { index, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const schema = moduleSchema('template')
export const widgets = schema.table(
  'widgets',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    workspaceId: uuid('workspace_id').notNull(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('widgets_ws_idx').on(t.workspaceId, t.createdAt)],
)
// NOTE: add RLS in the generated migration: see `rlsPolicySql('mod_template','widgets')` from @kernaio/kernel
