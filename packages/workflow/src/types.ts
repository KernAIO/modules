import { z } from 'zod'

/** Lifecycle category a status belongs to. Drives board column defaults, "done" semantics and reports. */
export const StatusCategory = z.enum(['backlog', 'todo', 'in_progress', 'done', 'cancelled', 'triage'])
export type StatusCategory = z.infer<typeof StatusCategory>

/** Categories that mean "resolved" (item is no longer open). */
export const RESOLVED_CATEGORIES: ReadonlySet<StatusCategory> = new Set(['done', 'cancelled'])

export const WorkflowStatus = z.object({
  /** stable id, unique within the workflow (e.g. `todo`, `in_review` or a uuid) */
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(80),
  category: StatusCategory,
  color: z.string().max(32).optional(),
  order: z.number().int().default(0),
  /** exactly one status may be the initial one (defaults to the first status by order) */
  initial: z.boolean().optional(),
  description: z.string().max(500).optional(),
})
export type WorkflowStatus = z.infer<typeof WorkflowStatus>

/** Reference to a registered rule implementation (condition / validator / post-function) plus its config. */
export const RuleRef = z.object({
  type: z.string().min(1).max(80),
  config: z.unknown().optional(),
})
export type RuleRef = z.infer<typeof RuleRef>

/**
 * Who may approve / who is addressed. `kind` is interpreted by the host through `ctx.resolveSubject`;
 * the engine understands `user`, `assignee`, `reporter` natively.
 */
export const Subject = z.object({
  kind: z.enum(['user', 'group', 'role', 'assignee', 'reporter', 'projectLead', 'field']),
  /** user id / group id / role key / field key, depending on kind */
  id: z.string().optional(),
})
export type Subject = z.infer<typeof Subject>

export const ApprovalSpec = z.object({
  approvers: z.array(Subject).min(1),
  /** approvals needed before the transition may complete (default 1) */
  minApprovals: z.number().int().min(1).default(1),
  /** a single rejection fails the approval (default true) */
  rejectOnAnyRejection: z.boolean().default(true),
})
export type ApprovalSpec = z.infer<typeof ApprovalSpec>

export const TransitionScreen = z.object({
  /** field keys to show in the transition dialog */
  fields: z.array(z.string()).default([]),
  /** prompt for a comment in the dialog (validators may require it) */
  comment: z.boolean().default(false),
})
export type TransitionScreen = z.infer<typeof TransitionScreen>

export const Transition = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(80),
  /** list of source status ids, or `'*'` for a global transition (available from any status) */
  from: z.union([z.literal('*'), z.array(z.string().min(1))]),
  to: z.string().min(1),
  conditions: z.array(RuleRef).default([]),
  validators: z.array(RuleRef).default([]),
  postFunctions: z.array(RuleRef).default([]),
  approval: ApprovalSpec.optional(),
  screen: TransitionScreen.optional(),
  description: z.string().max(500).optional(),
  /** hidden transitions are not offered in menus but may be executed by automations */
  hidden: z.boolean().default(false),
})
export type Transition = z.infer<typeof Transition>

export const WorkflowDefinition = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  statuses: z.array(WorkflowStatus).min(1),
  transitions: z.array(Transition).default([]),
})
export type WorkflowDefinition = z.infer<typeof WorkflowDefinition>

/** Input type for authoring (defaults not yet applied). */
export type WorkflowDefinitionInput = z.input<typeof WorkflowDefinition>

// ---------- evaluation context ----------

export interface RuleActor {
  /** null for system / anonymous actors */
  id: string | null
  groupIds?: readonly string[]
  /** permission keys the actor holds in the relevant scope (used by `user.hasPermission` when `hasPermission` is absent) */
  permissions?: ReadonlySet<string> | readonly string[]
  isAdmin?: boolean
}

/** Data the engine inspects on the object being transitioned. Hosts map their entity into this shape. */
export interface RuleObject {
  id?: string
  statusId?: string
  assigneeIds?: readonly string[]
  reporterId?: string | null
  /** flat field bag: system fields by name (`priority`, `dueDate`…) and custom fields by key */
  fields: Record<string, unknown>
}

/** What the user submitted in the transition dialog. */
export interface TransitionInput {
  fields?: Record<string, unknown>
  comment?: string | null
  resolution?: string | null
}

export interface RuleContext<TObject extends RuleObject = RuleObject> {
  object: TObject
  actor: RuleActor
  input: TransitionInput
  from: WorkflowStatus
  to: WorkflowStatus
  transition: Transition
  now: Date
  /** host hook: check a permission key for the actor at the object's scope */
  hasPermission?: (permission: string) => boolean | Promise<boolean>
  /** host hook: expand a subject to user ids (groups/roles/projectLead) */
  resolveSubject?: (subject: Subject) => readonly string[] | Promise<readonly string[]>
  /** host hook: sub-items of the object with their status category */
  subitems?: () => Promise<ReadonlyArray<{ id: string; statusCategory: StatusCategory }>>
  /** anything else hosts want to pass to custom rules */
  extra?: Record<string, unknown>
}

/** A reason a transition is blocked. */
export interface TransitionReason {
  kind: 'structural' | 'condition' | 'validator' | 'approval' | 'error'
  type?: string
  message: string
  field?: string
}

// ---------- post-function intents ----------

export type Intent =
  | { kind: 'field.set'; field: string; value: unknown }
  | {
      kind: 'assign'
      /** resolved user id, or null to unassign */
      userId: string | null
      /** original target of the rule */
      to: 'currentUser' | 'reporter' | 'unassigned' | 'user'
    }
  | { kind: 'resolution.set'; value: string | null }
  | { kind: 'notify'; subjects: Subject[]; template: string; data?: Record<string, unknown> }
  | {
      kind: 'webhook'
      url: string
      method: 'POST' | 'PUT' | 'GET'
      headers?: Record<string, string>
      payload?: unknown
    }
  | {
      kind: 'subitem.create'
      title: string
      typeKey?: string
      fields?: Record<string, unknown>
      assignTo?: string | null
    }
  | { kind: 'automation.run'; ruleId: string; input?: Record<string, unknown> }
  | { kind: 'custom'; type: string; data: unknown }
