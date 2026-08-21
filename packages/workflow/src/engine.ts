import type { RuleRegistry } from './registry.js'
import {
  type Intent,
  type RuleContext,
  type RuleObject,
  type Transition,
  type TransitionInput,
  type TransitionReason,
  WorkflowDefinition,
  type WorkflowDefinitionInput,
  type WorkflowStatus,
} from './types.js'

// ---------- definition helpers ----------

export interface DefinitionProblem {
  path: string
  message: string
}

/** Parse + structurally validate a workflow definition. Returns the normalised definition or problems. */
export function validateDefinition(
  input: unknown,
  registry?: RuleRegistry,
): { ok: true; definition: WorkflowDefinition; problems: [] } | { ok: false; problems: DefinitionProblem[] } {
  const parsed = WorkflowDefinition.safeParse(input)
  if (!parsed.success)
    return {
      ok: false,
      problems: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    }
  const def = parsed.data
  const problems: DefinitionProblem[] = []
  const statusIds = new Set<string>()
  for (const [i, s] of def.statuses.entries()) {
    if (statusIds.has(s.id))
      problems.push({ path: `statuses.${i}.id`, message: `Duplicate status id "${s.id}"` })
    statusIds.add(s.id)
  }
  const initials = def.statuses.filter((s) => s.initial)
  if (initials.length > 1) problems.push({ path: 'statuses', message: 'Only one status may be initial' })
  const trIds = new Set<string>()
  for (const [i, t] of def.transitions.entries()) {
    if (trIds.has(t.id))
      problems.push({ path: `transitions.${i}.id`, message: `Duplicate transition id "${t.id}"` })
    trIds.add(t.id)
    if (!statusIds.has(t.to))
      problems.push({ path: `transitions.${i}.to`, message: `Unknown target status "${t.to}"` })
    if (t.from !== '*')
      for (const f of t.from)
        if (!statusIds.has(f))
          problems.push({ path: `transitions.${i}.from`, message: `Unknown source status "${f}"` })
    if (registry) {
      for (const r of registry.validateRefs('condition', t.conditions))
        problems.push({ path: `transitions.${i}.conditions`, message: r.message })
      for (const r of registry.validateRefs('validator', t.validators))
        problems.push({ path: `transitions.${i}.validators`, message: r.message })
      for (const r of registry.validateRefs('postFunction', t.postFunctions))
        problems.push({ path: `transitions.${i}.postFunctions`, message: r.message })
    }
  }
  if (problems.length) return { ok: false, problems }
  return { ok: true, definition: def, problems: [] }
}

/** Parse a definition input (throws on schema errors). Convenience for templates/tests. */
export function defineWorkflow(input: WorkflowDefinitionInput): WorkflowDefinition {
  const res = validateDefinition(input)
  if (!res.ok)
    throw new Error(`Invalid workflow: ${res.problems.map((p) => `${p.path}: ${p.message}`).join('; ')}`)
  return res.definition
}

export function statusById(def: WorkflowDefinition, id: string): WorkflowStatus | undefined {
  return def.statuses.find((s) => s.id === id)
}
export function transitionById(def: WorkflowDefinition, id: string): Transition | undefined {
  return def.transitions.find((t) => t.id === id)
}
/** The status new objects start in: the `initial` one, else the lowest `order`, else the first. */
export function initialStatus(def: WorkflowDefinition): WorkflowStatus {
  return (
    def.statuses.find((s) => s.initial) ??
    [...def.statuses].sort((a, b) => a.order - b.order)[0] ??
    def.statuses[0]!
  )
}
export function sortedStatuses(def: WorkflowDefinition): WorkflowStatus[] {
  return [...def.statuses].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
}
export function transitionsFrom(def: WorkflowDefinition, statusId: string): Transition[] {
  return def.transitions.filter((t) => t.from === '*' || t.from.includes(statusId))
}
/** Find a transition leading from `fromStatusId` to `toStatusId` (explicit ones first, then global). */
export function findTransition(def: WorkflowDefinition, fromStatusId: string, toStatusId: string) {
  const cands = transitionsFrom(def, fromStatusId).filter((t) => t.to === toStatusId)
  return cands.find((t) => t.from !== '*') ?? cands[0]
}

// ---------- evaluation ----------

export interface EvaluateOptions<TObject extends RuleObject> {
  registry: RuleRegistry
  object: TObject
  actor: RuleContext['actor']
  input?: TransitionInput
  now?: Date
  hasPermission?: RuleContext['hasPermission']
  resolveSubject?: RuleContext['resolveSubject']
  subitems?: RuleContext['subitems']
  extra?: Record<string, unknown>
  /** approval already satisfied for this object+transition (host tracks approval state) */
  approvalSatisfied?: boolean
  /** skip conditions (automations / admins forcing a transition) */
  skipConditions?: boolean
}

export interface TransitionEvaluation {
  transition: Transition
  from: WorkflowStatus
  to: WorkflowStatus
  allowed: boolean
  reasons: TransitionReason[]
  /** the transition carries an approval spec that is not satisfied yet */
  requiresApproval: boolean
}

function buildCtx<TObject extends RuleObject>(
  opts: EvaluateOptions<TObject>,
  from: WorkflowStatus,
  to: WorkflowStatus,
  transition: Transition,
): RuleContext<TObject> {
  return {
    object: opts.object,
    actor: opts.actor,
    input: opts.input ?? {},
    from,
    to,
    transition,
    now: opts.now ?? new Date(),
    hasPermission: opts.hasPermission,
    resolveSubject: opts.resolveSubject,
    subitems: opts.subitems,
    extra: opts.extra,
  }
}

async function runConditions<TObject extends RuleObject>(
  ctx: RuleContext<TObject>,
  registry: RuleRegistry,
): Promise<TransitionReason[]> {
  const reasons: TransitionReason[] = []
  for (const ref of ctx.transition.conditions) {
    const def = registry.condition(ref.type)
    if (!def) {
      reasons.push({ kind: 'structural', type: ref.type, message: `Unknown condition "${ref.type}"` })
      continue
    }
    const cfg = def.schema.safeParse(ref.config ?? {})
    if (!cfg.success) {
      reasons.push({ kind: 'structural', type: ref.type, message: `Invalid condition config "${ref.type}"` })
      continue
    }
    try {
      if (!(await def.evaluate(cfg.data, ctx)))
        reasons.push({
          kind: 'condition',
          type: ref.type,
          message: def.failMessage?.(cfg.data, ctx) ?? `Condition ${def.label} not met`,
        })
    } catch (err) {
      reasons.push({
        kind: 'error',
        type: ref.type,
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }
  return reasons
}

async function runValidators<TObject extends RuleObject>(
  ctx: RuleContext<TObject>,
  registry: RuleRegistry,
): Promise<TransitionReason[]> {
  const reasons: TransitionReason[] = []
  for (const ref of ctx.transition.validators) {
    const def = registry.validator(ref.type)
    if (!def) {
      reasons.push({ kind: 'structural', type: ref.type, message: `Unknown validator "${ref.type}"` })
      continue
    }
    const cfg = def.schema.safeParse(ref.config ?? {})
    if (!cfg.success) {
      reasons.push({ kind: 'structural', type: ref.type, message: `Invalid validator config "${ref.type}"` })
      continue
    }
    try {
      for (const issue of (await def.validate(cfg.data, ctx)) ?? [])
        reasons.push({ kind: 'validator', type: ref.type, message: issue.message, field: issue.field })
    } catch (err) {
      reasons.push({
        kind: 'error',
        type: ref.type,
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }
  return reasons
}

/**
 * Evaluate whether `transitionId` may run from `fromStatusId`: structural checks + conditions
 * (+ validators when `input` is provided). Pure; never executes post-functions.
 */
export async function evaluateTransition<TObject extends RuleObject>(
  def: WorkflowDefinition,
  fromStatusId: string,
  transitionId: string,
  opts: EvaluateOptions<TObject>,
): Promise<TransitionEvaluation> {
  const transition = transitionById(def, transitionId)
  const from = statusById(def, fromStatusId)
  if (!transition || !from) {
    const missing = !transition ? `transition "${transitionId}"` : `status "${fromStatusId}"`
    const dummy: WorkflowStatus = from ?? { id: fromStatusId, name: fromStatusId, category: 'todo', order: 0 }
    return {
      transition: transition ?? {
        id: transitionId,
        name: transitionId,
        from: [],
        to: '',
        conditions: [],
        validators: [],
        postFunctions: [],
        hidden: false,
      },
      from: dummy,
      to: dummy,
      allowed: false,
      reasons: [{ kind: 'structural', message: `Unknown ${missing}` }],
      requiresApproval: false,
    }
  }
  const to = statusById(def, transition.to)
  const reasons: TransitionReason[] = []
  if (!to) reasons.push({ kind: 'structural', message: `Unknown target status "${transition.to}"` })
  if (transition.from !== '*' && !transition.from.includes(fromStatusId))
    reasons.push({
      kind: 'structural',
      message: `Transition "${transition.name}" is not available from "${from.name}"`,
    })
  const target = to ?? from
  const ctx = buildCtx(opts, from, target, transition)
  if (!reasons.length && !opts.skipConditions) reasons.push(...(await runConditions(ctx, opts.registry)))
  if (!reasons.length && opts.input) reasons.push(...(await runValidators(ctx, opts.registry)))
  const requiresApproval = !!transition.approval && !opts.approvalSatisfied
  return { transition, from, to: target, allowed: reasons.length === 0, reasons, requiresApproval }
}

/** Transitions offered from `statusId` with their condition results (hidden ones excluded unless `includeHidden`). */
export async function availableTransitions<TObject extends RuleObject>(
  def: WorkflowDefinition,
  statusId: string,
  opts: EvaluateOptions<TObject> & { includeHidden?: boolean },
): Promise<TransitionEvaluation[]> {
  const out: TransitionEvaluation[] = []
  for (const t of transitionsFrom(def, statusId)) {
    if (t.hidden && !opts.includeHidden) continue
    out.push(await evaluateTransition(def, statusId, t.id, { ...opts, input: undefined }))
  }
  return out
}

export type ApplyResult =
  | { ok: true; transition: Transition; from: WorkflowStatus; to: WorkflowStatus; intents: Intent[] }
  | {
      ok: false
      transition?: Transition
      from?: WorkflowStatus
      to?: WorkflowStatus
      reasons: TransitionReason[]
      /** transition is valid but blocked on approval */
      pendingApproval: boolean
    }

/**
 * Run conditions + validators, then plan post-functions. Does NOT mutate anything: returns the
 * intents for the host to execute (set fields, assign, notify…) inside its own transaction.
 */
export async function applyTransition<TObject extends RuleObject>(
  def: WorkflowDefinition,
  fromStatusId: string,
  transitionId: string,
  opts: EvaluateOptions<TObject>,
): Promise<ApplyResult> {
  const ev = await evaluateTransition(def, fromStatusId, transitionId, { ...opts, input: opts.input ?? {} })
  if (!ev.allowed)
    return {
      ok: false,
      transition: ev.transition,
      from: ev.from,
      to: ev.to,
      reasons: ev.reasons,
      pendingApproval: false,
    }
  if (ev.requiresApproval)
    return {
      ok: false,
      transition: ev.transition,
      from: ev.from,
      to: ev.to,
      reasons: [{ kind: 'approval', message: 'This transition requires approval' }],
      pendingApproval: true,
    }
  const ctx = buildCtx(opts, ev.from, ev.to, ev.transition)
  const intents: Intent[] = []
  for (const ref of ev.transition.postFunctions) {
    const pf = opts.registry.postFunction(ref.type)
    if (!pf) {
      intents.push({ kind: 'custom', type: ref.type, data: ref.config })
      continue
    }
    const cfg = pf.schema.safeParse(ref.config ?? {})
    if (!cfg.success) continue
    intents.push(...(await pf.plan(cfg.data, ctx)))
  }
  return { ok: true, transition: ev.transition, from: ev.from, to: ev.to, intents }
}
