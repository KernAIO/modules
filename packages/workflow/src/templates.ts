import { defineWorkflow } from './engine.js'
import type { WorkflowDefinition, WorkflowDefinitionInput } from './types.js'

export type WorkflowTemplateId = 'software' | 'kanban' | 'simple'

const COLORS = {
  backlog: '#8b8d98',
  todo: '#6e7f9a',
  in_progress: '#f2c94c',
  review: '#a78bfa',
  done: '#5ec269',
  cancelled: '#9ca3af',
  triage: '#f59e0b',
}

/** Scrum-style software workflow: Backlog → Todo → In Progress → In Review → Done (+ Cancelled, Triage). */
export const softwareTemplate: WorkflowDefinitionInput = {
  id: 'software',
  name: 'Software',
  description: 'Backlog, Todo, In Progress, In Review, Done, Cancelled (+ Triage for intake)',
  statuses: [
    { id: 'triage', name: 'Triage', category: 'triage', color: COLORS.triage, order: 0 },
    { id: 'backlog', name: 'Backlog', category: 'backlog', color: COLORS.backlog, order: 1, initial: true },
    { id: 'todo', name: 'Todo', category: 'todo', color: COLORS.todo, order: 2 },
    { id: 'in_progress', name: 'In Progress', category: 'in_progress', color: COLORS.in_progress, order: 3 },
    { id: 'in_review', name: 'In Review', category: 'in_progress', color: COLORS.review, order: 4 },
    { id: 'done', name: 'Done', category: 'done', color: COLORS.done, order: 5 },
    { id: 'cancelled', name: 'Cancelled', category: 'cancelled', color: COLORS.cancelled, order: 6 },
  ],
  transitions: [
    { id: 'accept', name: 'Accept', from: ['triage'], to: 'backlog' },
    {
      id: 'decline',
      name: 'Decline',
      from: ['triage'],
      to: 'cancelled',
      validators: [{ type: 'comment.required' }],
    },
    { id: 'plan', name: 'Plan', from: ['backlog'], to: 'todo' },
    {
      id: 'start',
      name: 'Start',
      from: ['backlog', 'todo'],
      to: 'in_progress',
      postFunctions: [{ type: 'assign.to', config: { to: 'currentUser' } }],
    },
    { id: 'review', name: 'Ready for review', from: ['in_progress'], to: 'in_review' },
    { id: 'reopen_review', name: 'Back to In Progress', from: ['in_review'], to: 'in_progress' },
    {
      id: 'complete',
      name: 'Done',
      from: ['in_progress', 'in_review'],
      to: 'done',
      conditions: [{ type: 'subtasks.allDone' }],
      postFunctions: [{ type: 'resolution.set', config: { value: 'done' } }],
    },
    {
      id: 'cancel',
      name: 'Cancel',
      from: '*',
      to: 'cancelled',
      postFunctions: [{ type: 'resolution.set', config: { value: 'cancelled' } }],
    },
    {
      id: 'reopen',
      name: 'Reopen',
      from: ['done', 'cancelled'],
      to: 'todo',
      postFunctions: [{ type: 'resolution.set', config: { value: null } }],
    },
    { id: 'backlog', name: 'Move to backlog', from: ['todo', 'in_progress'], to: 'backlog', hidden: true },
  ],
}

/** Kanban: Todo → In Progress → Done with global cancel; every status reachable from any other. */
export const kanbanTemplate: WorkflowDefinitionInput = {
  id: 'kanban',
  name: 'Kanban',
  description: 'Todo, In Progress, Done, Cancelled – free movement between columns',
  statuses: [
    { id: 'todo', name: 'Todo', category: 'todo', color: COLORS.todo, order: 0, initial: true },
    { id: 'in_progress', name: 'In Progress', category: 'in_progress', color: COLORS.in_progress, order: 1 },
    { id: 'done', name: 'Done', category: 'done', color: COLORS.done, order: 2 },
    { id: 'cancelled', name: 'Cancelled', category: 'cancelled', color: COLORS.cancelled, order: 3 },
  ],
  transitions: [
    {
      id: 'to_todo',
      name: 'Todo',
      from: '*',
      to: 'todo',
      postFunctions: [{ type: 'resolution.set', config: { value: null } }],
    },
    {
      id: 'to_in_progress',
      name: 'In Progress',
      from: '*',
      to: 'in_progress',
      postFunctions: [{ type: 'resolution.set', config: { value: null } }],
    },
    {
      id: 'to_done',
      name: 'Done',
      from: '*',
      to: 'done',
      postFunctions: [{ type: 'resolution.set', config: { value: 'done' } }],
    },
    {
      id: 'to_cancelled',
      name: 'Cancelled',
      from: '*',
      to: 'cancelled',
      postFunctions: [{ type: 'resolution.set', config: { value: 'cancelled' } }],
    },
  ],
}

/** Simple: Open ↔ Done. */
export const simpleTemplate: WorkflowDefinitionInput = {
  id: 'simple',
  name: 'Simple',
  description: 'Open and Done',
  statuses: [
    { id: 'open', name: 'Open', category: 'todo', color: COLORS.todo, order: 0, initial: true },
    { id: 'done', name: 'Done', category: 'done', color: COLORS.done, order: 1 },
  ],
  transitions: [
    {
      id: 'complete',
      name: 'Done',
      from: ['open'],
      to: 'done',
      postFunctions: [{ type: 'resolution.set', config: { value: 'done' } }],
    },
    {
      id: 'reopen',
      name: 'Reopen',
      from: ['done'],
      to: 'open',
      postFunctions: [{ type: 'resolution.set', config: { value: null } }],
    },
  ],
}

export const workflowTemplates: Record<WorkflowTemplateId, WorkflowDefinitionInput> = {
  software: softwareTemplate,
  kanban: kanbanTemplate,
  simple: simpleTemplate,
}

/** Instantiate a template with a fresh id/name (deep-copied + normalised). */
export function createWorkflowFromTemplate(
  template: WorkflowTemplateId,
  opts: { id: string; name?: string },
): WorkflowDefinition {
  const base = workflowTemplates[template]
  const copy = structuredClone(base)
  return defineWorkflow({ ...copy, id: opts.id, name: opts.name ?? copy.name })
}
