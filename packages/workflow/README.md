# @kernaio/workflow

Generic, pure-TypeScript workflow / state-machine engine used by Kern modules (Tracker issues, HR leave
requests, Recruiting pipelines, CRM deals). It owns *definitions* and *decisions*; the host module owns
persistence, permissions and side effects.

```
WorkflowDefinition ──▶ availableTransitions(def, status, ctx)   → what a menu may offer
                   ──▶ evaluateTransition(def, from, id, ctx)    → { allowed, reasons[] }
                   ──▶ applyTransition(def, from, id, ctx)       → { ok, to, intents[] }   (host executes intents)
```

## Definition

```ts
import { defineWorkflow } from '@kernaio/workflow'

const wf = defineWorkflow({
  id: 'software',
  name: 'Software',
  statuses: [
    { id: 'todo', name: 'Todo', category: 'todo', order: 0, initial: true },
    { id: 'doing', name: 'In Progress', category: 'in_progress', order: 1 },
    { id: 'done', name: 'Done', category: 'done', order: 2 },
  ],
  transitions: [
    { id: 'start', name: 'Start', from: ['todo'], to: 'doing',
      conditions: [{ type: 'user.hasPermission', config: { permission: 'tracker.issue.transition' } }],
      postFunctions: [{ type: 'assign.to', config: { to: 'currentUser' } }] },
    { id: 'finish', name: 'Done', from: ['doing'], to: 'done',
      conditions: [{ type: 'subtasks.allDone' }],
      validators: [{ type: 'comment.required' }],
      approval: { approvers: [{ kind: 'group', id: 'qa' }], minApprovals: 1 },
      postFunctions: [{ type: 'resolution.set', config: { value: 'done' } }] },
    { id: 'cancel', name: 'Cancel', from: '*', to: 'done', hidden: true },
  ],
})
```

* **Status categories**: `backlog | todo | in_progress | done | cancelled | triage`. `done`/`cancelled` are
  "resolved" (`RESOLVED_CATEGORIES`).
* **Transitions**: `from` is a list of status ids or `'*'` (global). `hidden` transitions are not offered in
  menus (`availableTransitions`) but can still be executed.
* `validateDefinition(input, registry?)` returns structured problems (duplicate ids, unknown statuses,
  unknown/invalid rule configs). `initialStatus`, `sortedStatuses`, `transitionsFrom`, `findTransition` are helpers.

## Rules

Rules are referenced by `{ type, config }` and implemented in a `RuleRegistry`:

| kind | role | built-ins |
|---|---|---|
| condition | gate: transition offered/allowed only if all pass | `user.hasPermission {permission}`, `user.isAssignee`, `user.isReporter`, `user.inGroup {groupId}`, `field.equals {field,value}`, `field.notEmpty {field}`, `subtasks.allDone {includeCancelled}` |
| validator | checks the submitted input (`ctx.input`) → issues | `field.required {field,message?}`, `comment.required {minLength}`, `estimate.required {field}` |
| post-function | plans side effects → `Intent[]` (host executes) | `field.set {field,value}`, `assign.to {to: currentUser\|reporter\|unassigned\|user, userId?}`, `resolution.set {value}`, `notify {subjects,template,data?}`, `webhook {url,method,headers?,payload?}`, `subitem.create {title,typeKey?,fields?,assignTo}`, `run.automation {ruleId,input?}` |

```ts
import { builtinRegistry, defineCondition } from '@kernaio/workflow'
const registry = builtinRegistry().register(
  defineCondition({ type: 'issue.hasLabel', label: 'Has label', schema: z.object({ label: z.string() }),
    evaluate: (c, ctx) => (ctx.object.fields.labels as string[]).includes(c.label) }),
)
```

`RuleContext` carries `object` (`{ id, statusId, assigneeIds, reporterId, fields }`), `actor`
(`{ id, groupIds?, permissions?, isAdmin? }`), `input` (`{ fields?, comment?, resolution? }`), `from`, `to`,
`transition`, `now` and host hooks `hasPermission(key)`, `resolveSubject(subject)`, `subitems()`.
Field lookups read the transition input first, then the object.

Intents returned by `applyTransition`:
`field.set`, `assign`, `resolution.set`, `notify`, `webhook`, `subitem.create`, `automation.run`, `custom`
(unknown post-function types are passed through as `custom` so hosts can run their own).

## Approvals

A transition with `approval` is evaluated like any other, but `applyTransition` returns
`{ ok: false, pendingApproval: true }` until the host passes `approvalSatisfied: true`. The host persists an
`ApprovalState` (created with `createApprovalState(transition, requestedBy)`), calls `canApprove(state, actor, object,
resolveSubject)` and `recordDecision(state, { userId, decision, comment })`; `isApproved` / `isRejected` /
`approvalsRemaining` read it back. `resolveApprovers` expands subjects (`user`, `group`, `role`, `assignee`,
`reporter`, `projectLead`, `field`) to user ids.

## Templates

`workflowTemplates.software | kanban | simple` and `createWorkflowFromTemplate('software', { id, name })`.
