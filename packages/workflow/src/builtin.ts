import { z } from 'zod'
import { defineCondition, definePostFunction, defineValidator, RuleRegistry } from './registry.js'
import { RESOLVED_CATEGORIES, type RuleContext, Subject } from './types.js'

const isEmpty = (v: unknown) =>
  v === undefined ||
  v === null ||
  v === '' ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v as object).length === 0)

/** Field lookup: transition input first (what the user is about to set), then the object. */
export const fieldValue = (ctx: RuleContext, field: string): unknown => {
  if (ctx.input.fields && field in ctx.input.fields) return ctx.input.fields[field]
  if (field === 'assignee' || field === 'assigneeIds')
    return ctx.object.assigneeIds ?? ctx.object.fields[field]
  if (field === 'reporter' || field === 'reporterId') return ctx.object.reporterId ?? ctx.object.fields[field]
  if (field === 'status' || field === 'statusId') return ctx.object.statusId ?? ctx.object.fields[field]
  return ctx.object.fields[field]
}

const hasPermission = async (ctx: RuleContext, permission: string) => {
  if (ctx.actor.isAdmin) return true
  if (ctx.hasPermission) return ctx.hasPermission(permission)
  const p = ctx.actor.permissions
  if (!p) return false
  return p instanceof Set ? p.has(permission) : (p as readonly string[]).includes(permission)
}

// ---------------- conditions ----------------

export const userHasPermission = defineCondition({
  type: 'user.hasPermission',
  label: 'User has permission',
  schema: z.object({ permission: z.string().min(1) }),
  evaluate: (c, ctx) => hasPermission(ctx, c.permission),
  failMessage: (c) => `Requires permission ${c.permission}`,
})

export const userIsAssignee = defineCondition({
  type: 'user.isAssignee',
  label: 'Only the assignee',
  schema: z.object({}).default({}),
  evaluate: (_c, ctx) => !!ctx.actor.id && (ctx.object.assigneeIds ?? []).includes(ctx.actor.id),
  failMessage: () => 'Only an assignee may perform this transition',
})

export const userIsReporter = defineCondition({
  type: 'user.isReporter',
  label: 'Only the reporter',
  schema: z.object({}).default({}),
  evaluate: (_c, ctx) => !!ctx.actor.id && ctx.object.reporterId === ctx.actor.id,
  failMessage: () => 'Only the reporter may perform this transition',
})

export const userInGroup = defineCondition({
  type: 'user.inGroup',
  label: 'User is in group',
  schema: z.object({ groupId: z.string().min(1) }),
  evaluate: async (c, ctx) => {
    if (ctx.actor.groupIds?.includes(c.groupId)) return true
    if (!ctx.resolveSubject || !ctx.actor.id) return false
    const ids = await ctx.resolveSubject({ kind: 'group', id: c.groupId })
    return ids.includes(ctx.actor.id)
  },
  failMessage: (c) => `Only members of group ${c.groupId} may perform this transition`,
})

export const fieldEquals = defineCondition({
  type: 'field.equals',
  label: 'Field equals value',
  schema: z.object({ field: z.string().min(1), value: z.unknown() }),
  evaluate: (c, ctx) => {
    const v = fieldValue(ctx, c.field)
    if (Array.isArray(v)) return Array.isArray(c.value) ? sameSet(v, c.value) : v.includes(c.value)
    return v === c.value || String(v) === String(c.value)
  },
  failMessage: (c) => `Field ${c.field} must equal ${JSON.stringify(c.value)}`,
})

export const fieldNotEmpty = defineCondition({
  type: 'field.notEmpty',
  label: 'Field is not empty',
  schema: z.object({ field: z.string().min(1) }),
  evaluate: (c, ctx) => !isEmpty(fieldValue(ctx, c.field)),
  failMessage: (c) => `Field ${c.field} must not be empty`,
})

export const subtasksAllDone = defineCondition({
  type: 'subtasks.allDone',
  label: 'All sub-items resolved',
  schema: z.object({ includeCancelled: z.boolean().default(true) }).default({ includeCancelled: true }),
  evaluate: async (c, ctx) => {
    if (!ctx.subitems) return true
    const subs = await ctx.subitems()
    return subs.every((s) =>
      c.includeCancelled ? RESOLVED_CATEGORIES.has(s.statusCategory) : s.statusCategory === 'done',
    )
  },
  failMessage: () => 'All sub-items must be resolved first',
})

// ---------------- validators ----------------

export const fieldRequired = defineValidator({
  type: 'field.required',
  label: 'Field required',
  schema: z.object({ field: z.string().min(1), message: z.string().optional() }),
  validate: (c, ctx) =>
    isEmpty(fieldValue(ctx, c.field))
      ? [{ field: c.field, message: c.message ?? `${c.field} is required` }]
      : [],
})

export const commentRequired = defineValidator({
  type: 'comment.required',
  label: 'Comment required',
  schema: z.object({ minLength: z.number().int().min(1).default(1) }).default({ minLength: 1 }),
  validate: (c, ctx) =>
    (ctx.input.comment ?? '').trim().length < c.minLength
      ? [{ field: 'comment', message: 'A comment is required for this transition' }]
      : [],
})

export const estimateRequired = defineValidator({
  type: 'estimate.required',
  label: 'Estimate required',
  schema: z.object({ field: z.string().default('estimate') }).default({ field: 'estimate' }),
  validate: (c, ctx) => {
    const v = fieldValue(ctx, c.field)
    return isEmpty(v) || Number(v) <= 0 ? [{ field: c.field, message: 'An estimate is required' }] : []
  },
})

// ---------------- post-functions ----------------

export const fieldSet = definePostFunction({
  type: 'field.set',
  label: 'Set field value',
  schema: z.object({ field: z.string().min(1), value: z.unknown() }),
  plan: (c) => [{ kind: 'field.set', field: c.field, value: c.value }],
})

export const assignTo = definePostFunction({
  type: 'assign.to',
  label: 'Assign to',
  schema: z.object({
    to: z.enum(['currentUser', 'reporter', 'unassigned', 'user']),
    userId: z.string().optional(),
  }),
  plan: (c, ctx) => {
    const userId =
      c.to === 'currentUser'
        ? ctx.actor.id
        : c.to === 'reporter'
          ? (ctx.object.reporterId ?? null)
          : c.to === 'user'
            ? (c.userId ?? null)
            : null
    return [{ kind: 'assign', userId, to: c.to }]
  },
})

export const resolutionSet = definePostFunction({
  type: 'resolution.set',
  label: 'Set resolution',
  schema: z.object({ value: z.string().nullable() }),
  plan: (c) => [{ kind: 'resolution.set', value: c.value }],
})

export const notify = definePostFunction({
  type: 'notify',
  label: 'Notify',
  schema: z.object({
    subjects: z.array(Subject).min(1),
    template: z.string().min(1),
    data: z.record(z.string(), z.unknown()).optional(),
  }),
  plan: (c) => [{ kind: 'notify', subjects: c.subjects, template: c.template, data: c.data }],
})

export const webhook = definePostFunction({
  type: 'webhook',
  label: 'Call webhook',
  schema: z.object({
    url: z.string().url(),
    method: z.enum(['POST', 'PUT', 'GET']).default('POST'),
    headers: z.record(z.string(), z.string()).optional(),
    payload: z.unknown().optional(),
  }),
  plan: (c) => [{ kind: 'webhook', url: c.url, method: c.method, headers: c.headers, payload: c.payload }],
})

export const subitemCreate = definePostFunction({
  type: 'subitem.create',
  label: 'Create sub-item',
  schema: z.object({
    title: z.string().min(1),
    typeKey: z.string().optional(),
    fields: z.record(z.string(), z.unknown()).optional(),
    assignTo: z.enum(['currentUser', 'reporter', 'unassigned']).default('unassigned'),
  }),
  plan: (c, ctx) => [
    {
      kind: 'subitem.create',
      title: c.title,
      typeKey: c.typeKey,
      fields: c.fields,
      assignTo:
        c.assignTo === 'currentUser'
          ? ctx.actor.id
          : c.assignTo === 'reporter'
            ? ctx.object.reporterId
            : null,
    },
  ],
})

export const runAutomation = definePostFunction({
  type: 'run.automation',
  label: 'Run automation rule',
  schema: z.object({ ruleId: z.string().min(1), input: z.record(z.string(), z.unknown()).optional() }),
  plan: (c) => [{ kind: 'automation.run', ruleId: c.ruleId, input: c.input }],
})

export const builtinConditions = [
  userHasPermission,
  userIsAssignee,
  userIsReporter,
  userInGroup,
  fieldEquals,
  fieldNotEmpty,
  subtasksAllDone,
]
export const builtinValidators = [fieldRequired, commentRequired, estimateRequired]
export const builtinPostFunctions = [
  fieldSet,
  assignTo,
  resolutionSet,
  notify,
  webhook,
  subitemCreate,
  runAutomation,
]

/** A registry pre-loaded with every built-in rule. */
export function builtinRegistry(): RuleRegistry {
  return new RuleRegistry([...builtinConditions, ...builtinValidators, ...builtinPostFunctions])
}

function sameSet(a: unknown[], b: unknown[]) {
  if (a.length !== b.length) return false
  const sb = new Set(b.map(String))
  return a.every((x) => sb.has(String(x)))
}
