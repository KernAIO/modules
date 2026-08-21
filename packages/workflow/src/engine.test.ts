import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  applyTransition,
  approvalsRemaining,
  availableTransitions,
  builtinRegistry,
  canApprove,
  createApprovalState,
  createWorkflowFromTemplate,
  defineCondition,
  definePostFunction,
  defineValidator,
  defineWorkflow,
  evaluateTransition,
  findTransition,
  initialStatus,
  isApproved,
  isRejected,
  type RuleObject,
  RuleRegistry,
  recordDecision,
  resolveApprovers,
  sortedStatuses,
  transitionsFrom,
  validateDefinition,
  workflowTemplates,
} from './index.js'

const registry = builtinRegistry()
const software = createWorkflowFromTemplate('software', { id: 'wf1' })

const obj = (over: Partial<RuleObject> = {}): RuleObject => ({
  id: 'i1',
  statusId: 'todo',
  assigneeIds: ['u1'],
  reporterId: 'u2',
  fields: { priority: 'high', estimate: 3 },
  ...over,
})
const actor = (id: string | null = 'u1', over: Record<string, unknown> = {}) => ({ id, ...over })

describe('definition validation', () => {
  it('parses templates', () => {
    for (const t of Object.values(workflowTemplates)) expect(validateDefinition(t, registry).ok).toBe(true)
  })
  it('reports duplicate status ids and unknown targets', () => {
    const res = validateDefinition({
      id: 'x',
      name: 'x',
      statuses: [
        { id: 'a', name: 'A', category: 'todo' },
        { id: 'a', name: 'A2', category: 'done' },
      ],
      transitions: [{ id: 't', name: 't', from: ['nope'], to: 'zzz' }],
    })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      const msgs = res.problems.map((p) => p.message).join('\n')
      expect(msgs).toContain('Duplicate status id')
      expect(msgs).toContain('Unknown target status')
      expect(msgs).toContain('Unknown source status')
    }
  })
  it('rejects multiple initial statuses', () => {
    const res = validateDefinition({
      id: 'x',
      name: 'x',
      statuses: [
        { id: 'a', name: 'A', category: 'todo', initial: true },
        { id: 'b', name: 'B', category: 'done', initial: true },
      ],
    })
    expect(res.ok).toBe(false)
  })
  it('validates rule refs against the registry', () => {
    const res = validateDefinition(
      {
        id: 'x',
        name: 'x',
        statuses: [{ id: 'a', name: 'A', category: 'todo' }],
        transitions: [
          {
            id: 't',
            name: 't',
            from: '*',
            to: 'a',
            conditions: [{ type: 'nope' }],
            validators: [{ type: 'field.required', config: {} }],
          },
        ],
      },
      registry,
    )
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.problems.some((p) => p.message.includes('Unknown condition'))).toBe(true)
      expect(res.problems.some((p) => p.message.includes('Invalid config for validator'))).toBe(true)
    }
  })
  it('defineWorkflow throws on invalid input', () => {
    expect(() => defineWorkflow({ id: 'x', name: 'x', statuses: [] } as any)).toThrow()
  })
  it('initial status: explicit, else lowest order', () => {
    expect(initialStatus(software).id).toBe('backlog')
    const d = defineWorkflow({
      id: 'x',
      name: 'x',
      statuses: [
        { id: 'b', name: 'B', category: 'done', order: 5 },
        { id: 'a', name: 'A', category: 'todo', order: 1 },
      ],
    })
    expect(initialStatus(d).id).toBe('a')
    expect(sortedStatuses(d).map((s) => s.id)).toEqual(['a', 'b'])
  })
  it('transitionsFrom includes global transitions; findTransition prefers explicit', () => {
    const ids = transitionsFrom(software, 'todo').map((t) => t.id)
    expect(ids).toContain('start')
    expect(ids).toContain('cancel')
    expect(findTransition(software, 'in_progress', 'done')?.id).toBe('complete')
    expect(findTransition(software, 'todo', 'cancelled')?.id).toBe('cancel')
    expect(findTransition(software, 'todo', 'done')).toBeUndefined()
  })
})

describe('evaluateTransition', () => {
  it('allows a plain transition', async () => {
    const ev = await evaluateTransition(software, 'backlog', 'plan', {
      registry,
      object: obj(),
      actor: actor(),
    })
    expect(ev.allowed).toBe(true)
    expect(ev.to.id).toBe('todo')
  })
  it('rejects when transition is not available from status', async () => {
    const ev = await evaluateTransition(software, 'done', 'plan', { registry, object: obj(), actor: actor() })
    expect(ev.allowed).toBe(false)
    expect(ev.reasons[0]?.kind).toBe('structural')
  })
  it('rejects unknown transition / status', async () => {
    expect(
      (await evaluateTransition(software, 'todo', 'nope', { registry, object: obj(), actor: actor() }))
        .allowed,
    ).toBe(false)
    expect(
      (await evaluateTransition(software, 'nope', 'plan', { registry, object: obj(), actor: actor() }))
        .allowed,
    ).toBe(false)
  })
  it('runs conditions (subtasks.allDone)', async () => {
    const base = { registry, object: obj({ statusId: 'in_progress' }), actor: actor() }
    const blocked = await evaluateTransition(software, 'in_progress', 'complete', {
      ...base,
      subitems: async () => [{ id: 's', statusCategory: 'todo' }],
    })
    expect(blocked.allowed).toBe(false)
    expect(blocked.reasons[0]).toMatchObject({ kind: 'condition', type: 'subtasks.allDone' })
    const ok = await evaluateTransition(software, 'in_progress', 'complete', {
      ...base,
      subitems: async () => [{ id: 's', statusCategory: 'cancelled' }],
    })
    expect(ok.allowed).toBe(true)
    const noHook = await evaluateTransition(software, 'in_progress', 'complete', base)
    expect(noHook.allowed).toBe(true)
  })
  it('skipConditions bypasses conditions', async () => {
    const ev = await evaluateTransition(software, 'in_progress', 'complete', {
      registry,
      object: obj(),
      actor: actor(),
      subitems: async () => [{ id: 's', statusCategory: 'todo' }],
      skipConditions: true,
    })
    expect(ev.allowed).toBe(true)
  })
  it('runs validators only when input is given', async () => {
    const noInput = await evaluateTransition(software, 'triage', 'decline', {
      registry,
      object: obj(),
      actor: actor(),
    })
    expect(noInput.allowed).toBe(true)
    const withInput = await evaluateTransition(software, 'triage', 'decline', {
      registry,
      object: obj(),
      actor: actor(),
      input: {},
    })
    expect(withInput.allowed).toBe(false)
    expect(withInput.reasons[0]).toMatchObject({
      kind: 'validator',
      type: 'comment.required',
      field: 'comment',
    })
    const withComment = await evaluateTransition(software, 'triage', 'decline', {
      registry,
      object: obj(),
      actor: actor(),
      input: { comment: 'spam' },
    })
    expect(withComment.allowed).toBe(true)
  })
  it('availableTransitions lists non-hidden transitions with results', async () => {
    const list = await availableTransitions(software, 'todo', { registry, object: obj(), actor: actor() })
    const ids = list.map((t) => t.transition.id)
    expect(ids).toEqual(expect.arrayContaining(['start', 'cancel']))
    expect(ids).not.toContain('backlog')
    const withHidden = await availableTransitions(software, 'todo', {
      registry,
      object: obj(),
      actor: actor(),
      includeHidden: true,
    })
    expect(withHidden.map((t) => t.transition.id)).toContain('backlog')
  })
})

describe('built-in conditions', () => {
  const wf = (conditions: any[]) =>
    defineWorkflow({
      id: 'c',
      name: 'c',
      statuses: [
        { id: 'a', name: 'A', category: 'todo' },
        { id: 'b', name: 'B', category: 'done' },
      ],
      transitions: [{ id: 't', name: 't', from: ['a'], to: 'b', conditions }],
    })
  const run = (conditions: any[], opts: Record<string, unknown> = {}) =>
    evaluateTransition(wf(conditions), 'a', 't', { registry, object: obj(), actor: actor(), ...opts } as any)

  it('user.hasPermission via hook, via actor.permissions, via admin', async () => {
    const c = [{ type: 'user.hasPermission', config: { permission: 'x.y.z' } }]
    expect((await run(c)).allowed).toBe(false)
    expect((await run(c, { hasPermission: (p: string) => p === 'x.y.z' })).allowed).toBe(true)
    expect((await run(c, { actor: actor('u1', { permissions: new Set(['x.y.z']) }) })).allowed).toBe(true)
    expect((await run(c, { actor: actor('u1', { permissions: ['x.y.z'] }) })).allowed).toBe(true)
    expect((await run(c, { actor: actor('u9', { isAdmin: true }) })).allowed).toBe(true)
    const r = await run(c)
    expect(r.reasons[0]?.message).toContain('x.y.z')
  })
  it('user.isAssignee / user.isReporter', async () => {
    expect((await run([{ type: 'user.isAssignee' }])).allowed).toBe(true)
    expect((await run([{ type: 'user.isAssignee' }], { actor: actor('u3') })).allowed).toBe(false)
    expect((await run([{ type: 'user.isAssignee' }], { actor: actor(null) })).allowed).toBe(false)
    expect((await run([{ type: 'user.isReporter' }], { actor: actor('u2') })).allowed).toBe(true)
    expect((await run([{ type: 'user.isReporter' }])).allowed).toBe(false)
  })
  it('user.inGroup via actor.groupIds or resolveSubject', async () => {
    const c = [{ type: 'user.inGroup', config: { groupId: 'g1' } }]
    expect((await run(c)).allowed).toBe(false)
    expect((await run(c, { actor: actor('u1', { groupIds: ['g1'] }) })).allowed).toBe(true)
    expect((await run(c, { resolveSubject: async () => ['u1'] })).allowed).toBe(true)
    expect((await run(c, { resolveSubject: async () => ['u7'] })).allowed).toBe(false)
  })
  it('field.equals / field.notEmpty (input overrides object)', async () => {
    expect(
      (await run([{ type: 'field.equals', config: { field: 'priority', value: 'high' } }])).allowed,
    ).toBe(true)
    expect((await run([{ type: 'field.equals', config: { field: 'priority', value: 'low' } }])).allowed).toBe(
      false,
    )
    expect(
      (
        await run([{ type: 'field.equals', config: { field: 'priority', value: 'low' } }], {
          input: { fields: { priority: 'low' } },
        })
      ).allowed,
    ).toBe(true)
    expect((await run([{ type: 'field.equals', config: { field: 'assignee', value: 'u1' } }])).allowed).toBe(
      true,
    )
    expect(
      (await run([{ type: 'field.equals', config: { field: 'assignee', value: ['u1'] } }])).allowed,
    ).toBe(true)
    expect((await run([{ type: 'field.equals', config: { field: 'reporter', value: 'u2' } }])).allowed).toBe(
      true,
    )
    expect((await run([{ type: 'field.equals', config: { field: 'status', value: 'todo' } }])).allowed).toBe(
      true,
    )
    expect((await run([{ type: 'field.notEmpty', config: { field: 'priority' } }])).allowed).toBe(true)
    expect((await run([{ type: 'field.notEmpty', config: { field: 'missing' } }])).allowed).toBe(false)
    expect(
      (
        await run([{ type: 'field.notEmpty', config: { field: 'e' } }], {
          object: obj({ fields: { e: [] } }),
        })
      ).allowed,
    ).toBe(false)
    expect(
      (
        await run([{ type: 'field.notEmpty', config: { field: 'e' } }], {
          object: obj({ fields: { e: {} } }),
        })
      ).allowed,
    ).toBe(false)
  })
  it('unknown condition type and invalid config are structural failures; throwing rule is an error', async () => {
    expect((await run([{ type: 'nope' }])).reasons[0]?.kind).toBe('structural')
    expect((await run([{ type: 'field.equals', config: { value: 1 } }])).reasons[0]?.kind).toBe('structural')
    const reg = new RuleRegistry([
      defineCondition({
        type: 'boom',
        label: 'boom',
        schema: z.object({}),
        evaluate: () => {
          throw new Error('kaboom')
        },
      }),
    ])
    const ev = await evaluateTransition(wf([{ type: 'boom' }]), 'a', 't', {
      registry: reg,
      object: obj(),
      actor: actor(),
    })
    expect(ev.reasons[0]).toMatchObject({ kind: 'error', message: 'kaboom' })
  })
})

describe('built-in validators', () => {
  const wf = (validators: any[]) =>
    defineWorkflow({
      id: 'v',
      name: 'v',
      statuses: [
        { id: 'a', name: 'A', category: 'todo' },
        { id: 'b', name: 'B', category: 'done' },
      ],
      transitions: [{ id: 't', name: 't', from: ['a'], to: 'b', validators }],
    })
  const run = (validators: any[], input: any = {}, o: RuleObject = obj()) =>
    evaluateTransition(wf(validators), 'a', 't', { registry, object: o, actor: actor(), input })

  it('field.required', async () => {
    expect((await run([{ type: 'field.required', config: { field: 'priority' } }])).allowed).toBe(true)
    const r = await run([{ type: 'field.required', config: { field: 'dueDate', message: 'need a date' } }])
    expect(r.allowed).toBe(false)
    expect(r.reasons[0]).toMatchObject({ kind: 'validator', field: 'dueDate', message: 'need a date' })
    expect(
      (
        await run([{ type: 'field.required', config: { field: 'dueDate' } }], {
          fields: { dueDate: '2026-01-01' },
        })
      ).allowed,
    ).toBe(true)
  })
  it('comment.required with minLength', async () => {
    expect(
      (await run([{ type: 'comment.required', config: { minLength: 5 } }], { comment: 'abc' })).allowed,
    ).toBe(false)
    expect(
      (await run([{ type: 'comment.required', config: { minLength: 5 } }], { comment: 'abcdef' })).allowed,
    ).toBe(true)
    expect((await run([{ type: 'comment.required' }], { comment: '   ' })).allowed).toBe(false)
  })
  it('estimate.required', async () => {
    expect((await run([{ type: 'estimate.required' }])).allowed).toBe(true)
    expect((await run([{ type: 'estimate.required' }], {}, obj({ fields: { estimate: 0 } }))).allowed).toBe(
      false,
    )
    expect((await run([{ type: 'estimate.required' }], {}, obj({ fields: {} }))).allowed).toBe(false)
    expect(
      (
        await run(
          [{ type: 'estimate.required', config: { field: 'points' } }],
          { fields: { points: 2 } },
          obj({ fields: {} }),
        )
      ).allowed,
    ).toBe(true)
  })
  it('unknown validator type is structural', async () => {
    expect((await run([{ type: 'nope' }])).reasons[0]?.kind).toBe('structural')
  })
})

describe('applyTransition & post-functions', () => {
  it('returns intents for built-in post-functions', async () => {
    const res = await applyTransition(software, 'todo', 'start', {
      registry,
      object: obj(),
      actor: actor('u5'),
    })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.to.id).toBe('in_progress')
      expect(res.intents).toEqual([{ kind: 'assign', userId: 'u5', to: 'currentUser' }])
    }
  })
  it('returns reasons when blocked', async () => {
    const res = await applyTransition(software, 'triage', 'decline', {
      registry,
      object: obj(),
      actor: actor(),
      input: {},
    })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.pendingApproval).toBe(false)
      expect(res.reasons[0]?.kind).toBe('validator')
    }
  })
  it('plans every built-in post-function', async () => {
    const wf = defineWorkflow({
      id: 'p',
      name: 'p',
      statuses: [
        { id: 'a', name: 'A', category: 'todo' },
        { id: 'b', name: 'B', category: 'done' },
      ],
      transitions: [
        {
          id: 't',
          name: 't',
          from: ['a'],
          to: 'b',
          postFunctions: [
            { type: 'field.set', config: { field: 'priority', value: 'low' } },
            { type: 'assign.to', config: { to: 'reporter' } },
            { type: 'assign.to', config: { to: 'unassigned' } },
            { type: 'assign.to', config: { to: 'user', userId: 'u9' } },
            { type: 'resolution.set', config: { value: 'fixed' } },
            { type: 'notify', config: { subjects: [{ kind: 'assignee' }], template: 'done' } },
            { type: 'webhook', config: { url: 'https://example.com/hook', payload: { a: 1 } } },
            { type: 'subitem.create', config: { title: 'QA', assignTo: 'currentUser' } },
            { type: 'run.automation', config: { ruleId: 'r1' } },
            { type: 'custom.thing', config: { x: 1 } },
            { type: 'field.set', config: { nope: true } },
          ],
        },
      ],
    })
    const res = await applyTransition(wf, 'a', 't', { registry, object: obj(), actor: actor('u1') })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.intents).toEqual([
        { kind: 'field.set', field: 'priority', value: 'low' },
        { kind: 'assign', userId: 'u2', to: 'reporter' },
        { kind: 'assign', userId: null, to: 'unassigned' },
        { kind: 'assign', userId: 'u9', to: 'user' },
        { kind: 'resolution.set', value: 'fixed' },
        { kind: 'notify', subjects: [{ kind: 'assignee' }], template: 'done', data: undefined },
        {
          kind: 'webhook',
          url: 'https://example.com/hook',
          method: 'POST',
          headers: undefined,
          payload: { a: 1 },
        },
        { kind: 'subitem.create', title: 'QA', typeKey: undefined, fields: undefined, assignTo: 'u1' },
        { kind: 'automation.run', ruleId: 'r1', input: undefined },
        { kind: 'custom', type: 'custom.thing', data: { x: 1 } },
      ])
    }
  })
  it('custom rules can be registered; duplicates throw', () => {
    const reg = builtinRegistry()
    reg.register(
      defineValidator({ type: 'my.v', label: 'v', schema: z.object({}), validate: () => [] }),
      definePostFunction({ type: 'my.pf', label: 'pf', schema: z.object({}), plan: () => [] }),
    )
    expect(reg.validator('my.v')).toBeDefined()
    expect(reg.postFunction('my.pf')).toBeDefined()
    expect(reg.list('condition').length).toBe(7)
    expect(() =>
      reg.register(defineValidator({ type: 'my.v', label: 'v', schema: z.object({}), validate: () => [] })),
    ).toThrow()
  })
})

describe('approvals', () => {
  const wf = defineWorkflow({
    id: 'ap',
    name: 'ap',
    statuses: [
      { id: 'a', name: 'A', category: 'todo' },
      { id: 'b', name: 'B', category: 'done' },
    ],
    transitions: [
      {
        id: 't',
        name: 't',
        from: ['a'],
        to: 'b',
        approval: {
          approvers: [
            { kind: 'user', id: 'm1' },
            { kind: 'group', id: 'g1' },
          ],
          minApprovals: 2,
        },
      },
    ],
  })
  it('applyTransition is pendingApproval until satisfied', async () => {
    const res = await applyTransition(wf, 'a', 't', { registry, object: obj(), actor: actor() })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.pendingApproval).toBe(true)
    const ok = await applyTransition(wf, 'a', 't', {
      registry,
      object: obj(),
      actor: actor(),
      approvalSatisfied: true,
    })
    expect(ok.ok).toBe(true)
    const ev = await evaluateTransition(wf, 'a', 't', { registry, object: obj(), actor: actor() })
    expect(ev.requiresApproval).toBe(true)
    expect(ev.allowed).toBe(true)
  })
  it('state machine: approve / reject / remaining', async () => {
    const t = wf.transitions[0]!
    let st = createApprovalState(t, 'u1')
    expect(st.status).toBe('pending')
    expect(approvalsRemaining(st)).toBe(2)
    const resolve = async (s: any) => (s.kind === 'group' ? ['m2', 'm3'] : [])
    expect(await resolveApprovers(t.approval!.approvers, obj(), resolve)).toEqual(['m1', 'm2', 'm3'])
    expect(await canApprove(st, actor('m1'), obj(), resolve)).toBe(true)
    expect(await canApprove(st, actor('u1'), obj(), resolve)).toBe(false)
    st = recordDecision(st, { userId: 'm1', decision: 'approve', comment: null })
    expect(st.status).toBe('pending')
    expect(approvalsRemaining(st)).toBe(1)
    expect(await canApprove(st, actor('m1'), obj(), resolve)).toBe(false)
    expect(() => recordDecision(st, { userId: 'm1', decision: 'approve', comment: null })).toThrow()
    st = recordDecision(st, { userId: 'm2', decision: 'approve', comment: 'lgtm' })
    expect(isApproved(st)).toBe(true)
    expect(() => recordDecision(st, { userId: 'm3', decision: 'approve', comment: null })).toThrow()

    let rej = createApprovalState(t, null)
    rej = recordDecision(rej, { userId: 'm3', decision: 'reject', comment: 'no' })
    expect(isRejected(rej)).toBe(true)
    expect(await canApprove(rej, actor('m1'), obj(), resolve)).toBe(false)
  })
  it('resolveApprovers handles assignee/reporter/field subjects', async () => {
    const ids = await resolveApprovers(
      [
        { kind: 'assignee' },
        { kind: 'reporter' },
        { kind: 'field', id: 'owner' },
        { kind: 'field', id: 'cc' },
      ],
      obj({ fields: { owner: 'u8', cc: ['u9', 'u1'] } }),
    )
    expect(ids).toEqual(['u1', 'u2', 'u8', 'u9'])
  })
  it('createApprovalState throws without approval spec', () => {
    expect(() => createApprovalState({ id: 'x' }, null)).toThrow()
  })
})

describe('templates', () => {
  it('kanban: every status reachable from any other', async () => {
    const k = createWorkflowFromTemplate('kanban', { id: 'k', name: 'My Kanban' })
    expect(k.name).toBe('My Kanban')
    for (const s of k.statuses) {
      const list = await availableTransitions(k, s.id, { registry, object: obj(), actor: actor() })
      expect(
        list
          .filter((t) => t.allowed)
          .map((t) => t.to.id)
          .sort(),
      ).toEqual(k.statuses.map((x) => x.id).sort())
    }
  })
  it('simple: open ↔ done', async () => {
    const s = createWorkflowFromTemplate('simple', { id: 's' })
    expect(initialStatus(s).id).toBe('open')
    const r = await applyTransition(s, 'open', 'complete', { registry, object: obj(), actor: actor() })
    expect(r.ok && r.intents).toEqual([{ kind: 'resolution.set', value: 'done' }])
  })
  it('template instances are independent copies', () => {
    const a = createWorkflowFromTemplate('software', { id: 'a' })
    a.statuses[0]!.name = 'Changed'
    expect(createWorkflowFromTemplate('software', { id: 'b' }).statuses[0]!.name).toBe('Triage')
  })
})
