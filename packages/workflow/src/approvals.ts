import { z } from 'zod'
import type { ApprovalSpec, RuleActor, RuleObject, Subject, Transition } from './types.js'

export const ApprovalDecision = z.object({
  userId: z.string(),
  decision: z.enum(['approve', 'reject']),
  comment: z.string().nullable().default(null),
  at: z.string(),
})
export type ApprovalDecision = z.infer<typeof ApprovalDecision>

/** Host-persisted approval state for one object + transition (e.g. `issue_approvals` row, JSON column). */
export const ApprovalState = z.object({
  transitionId: z.string(),
  /** snapshot of the spec at request time so later workflow edits do not change a running approval */
  spec: z.object({
    approvers: z.array(z.any()),
    minApprovals: z.number().int().min(1),
    rejectOnAnyRejection: z.boolean(),
  }),
  requestedBy: z.string().nullable(),
  requestedAt: z.string(),
  decisions: z.array(ApprovalDecision).default([]),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
})
export type ApprovalState = z.infer<typeof ApprovalState>

export function createApprovalState(
  transition: Pick<Transition, 'id' | 'approval'>,
  requestedBy: string | null,
  now = new Date(),
): ApprovalState {
  if (!transition.approval) throw new Error(`Transition ${transition.id} has no approval spec`)
  const spec: ApprovalSpec = transition.approval
  return {
    transitionId: transition.id,
    spec: {
      approvers: spec.approvers,
      minApprovals: spec.minApprovals,
      rejectOnAnyRejection: spec.rejectOnAnyRejection,
    },
    requestedBy,
    requestedAt: now.toISOString(),
    decisions: [],
    status: 'pending',
  }
}

/** Expand approver subjects to user ids (host resolves groups/roles/field subjects). */
export async function resolveApprovers(
  approvers: Subject[],
  object: RuleObject,
  resolveSubject?: (s: Subject) => readonly string[] | Promise<readonly string[]>,
): Promise<string[]> {
  const ids = new Set<string>()
  for (const s of approvers) {
    if (s.kind === 'user' && s.id) ids.add(s.id)
    else if (s.kind === 'assignee') for (const a of object.assigneeIds ?? []) ids.add(a)
    else if (s.kind === 'reporter' && object.reporterId) ids.add(object.reporterId)
    else if (s.kind === 'field' && s.id) {
      const v = object.fields[s.id]
      if (typeof v === 'string') ids.add(v)
      else if (Array.isArray(v)) for (const x of v) if (typeof x === 'string') ids.add(x)
    } else if (resolveSubject) for (const id of await resolveSubject(s)) ids.add(id)
  }
  return [...ids]
}

export async function canApprove(
  state: ApprovalState,
  actor: RuleActor,
  object: RuleObject,
  resolveSubject?: (s: Subject) => readonly string[] | Promise<readonly string[]>,
): Promise<boolean> {
  if (!actor.id || state.status !== 'pending') return false
  if (state.decisions.some((d) => d.userId === actor.id)) return false
  const ids = await resolveApprovers(state.spec.approvers as Subject[], object, resolveSubject)
  return ids.includes(actor.id)
}

/** Record a decision and recompute status. Returns a new state (immutable). */
export function recordDecision(
  state: ApprovalState,
  decision: Omit<ApprovalDecision, 'at'> & { at?: string },
  now = new Date(),
): ApprovalState {
  if (state.status !== 'pending') throw new Error(`Approval is already ${state.status}`)
  if (state.decisions.some((d) => d.userId === decision.userId))
    throw new Error('This user has already decided')
  const decisions = [
    ...state.decisions,
    { ...decision, comment: decision.comment ?? null, at: decision.at ?? now.toISOString() },
  ]
  const approvals = decisions.filter((d) => d.decision === 'approve').length
  const rejections = decisions.filter((d) => d.decision === 'reject').length
  let status: ApprovalState['status'] = 'pending'
  if (rejections > 0 && state.spec.rejectOnAnyRejection) status = 'rejected'
  else if (approvals >= state.spec.minApprovals) status = 'approved'
  return { ...state, decisions, status }
}

export const isApproved = (state: ApprovalState | null | undefined) => state?.status === 'approved'
export const isRejected = (state: ApprovalState | null | undefined) => state?.status === 'rejected'
export const approvalsRemaining = (state: ApprovalState) =>
  Math.max(0, state.spec.minApprovals - state.decisions.filter((d) => d.decision === 'approve').length)
