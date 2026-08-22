import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MODULE_ID, templateEvents, templatePermissions } from '../contract.js'
import { defineModule, defineServerModule, implement_ } from './_impl.js'
import { schema } from './schema.js'

export const templateModule = defineServerModule({
  definition: defineModule({
    id: MODULE_ID,
    name: 'Template',
    version: '0.1.0',
    description: 'Example module',
    icon: 'puzzle',
    permissions: templatePermissions,
    events: templateEvents,
  }),
  schema,
  migrationsFolder: join(dirname(fileURLToPath(import.meta.url)), '../../migrations'),
  router: implement_,
  subscriptions: {
    'core.workspace.created': async (e, kernel) => {
      kernel.log.info({ e: e.name }, 'template saw workspace created')
    },
  },
})
export default templateModule
