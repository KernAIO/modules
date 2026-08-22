import {
  baseContract,
  defineEvent,
  definePermissions,
  PageInput,
  page,
  WorkspaceId,
} from '@kernalo/contracts'
import { z } from 'zod'

export const MODULE_ID = 'template'
export const Widget = z.object({
  id: z.uuid(),
  workspaceId: WorkspaceId,
  name: z.string().min(1).max(120),
  createdAt: z.string(),
})
export type Widget = z.infer<typeof Widget>
const ws = z.object({ workspaceId: WorkspaceId })

export const templateContract = {
  widgets: {
    list: baseContract
      .route({ method: 'GET', path: '/widgets', tags: ['template'] })
      .input(ws.extend(PageInput.shape))
      .output(page(Widget)),
    create: baseContract
      .route({ method: 'POST', path: '/widgets', tags: ['template'] })
      .input(ws.extend({ name: z.string().min(1) }))
      .output(Widget),
  },
}
export type TemplateContract = typeof templateContract

export const templateEvents = {
  widgetCreated: defineEvent(
    'template.widget.created',
    z.object({ widgetId: z.uuid(), workspaceId: WorkspaceId }),
  ),
}
export const templatePermissions = definePermissions([
  {
    key: 'template.widget.view',
    label: 'View widgets',
    scope: 'workspace',
    defaultRoles: ['owner', 'admin', 'member', 'guest'],
    dangerous: false,
  },
  {
    key: 'template.widget.manage',
    label: 'Create/edit widgets',
    scope: 'workspace',
    defaultRoles: ['owner', 'admin', 'member'],
    dangerous: false,
  },
])
