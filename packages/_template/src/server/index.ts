import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  MODULE_ID,
  templateCapabilities,
  templateContract,
  templateEvents,
  templatePermissions,
} from '../contract.js'
import { defineModule, defineServerModule, implement_, packageVersion } from './_impl.js'
import { schema } from './schema.js'

export const templateModule = defineServerModule({
  definition: defineModule({
    id: MODULE_ID,
    name: 'Template',
    version: packageVersion(import.meta.url),
    description: 'Example module',
    icon: 'puzzle',
    permissions: templatePermissions,
    capabilities: templateCapabilities,
    events: templateEvents,
  }),
  /** Attached so the developer panel can check the router against what was promised. */
  contract: templateContract,
  schema,
  migrationsFolder: join(dirname(fileURLToPath(import.meta.url)), '../../migrations'),
  router: implement_,
  /**
   * What this module reacts to. The pattern may be an exact name, `module.*`, or `*`; handlers are
   * durable consumers in production, so one that throws is retried rather than lost.
   */
  subscriptions: {
    'core.workspace.created': async (event, kernel) => {
      kernel.log.info({ module: MODULE_ID, event: event.name }, 'a workspace was created')
    },
  },
})
export default templateModule
