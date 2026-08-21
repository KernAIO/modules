import type { z } from 'zod'
import type { Intent, RuleContext, RuleObject, RuleRef, TransitionReason } from './types.js'

export interface ValidationIssue {
  message: string
  field?: string
}

/** Gate: the transition is offered / allowed only when every condition passes. */
export interface ConditionDef<TConfig = unknown, TObject extends RuleObject = RuleObject> {
  kind: 'condition'
  type: string
  label: string
  description?: string
  schema: z.ZodType<TConfig>
  evaluate: (config: TConfig, ctx: RuleContext<TObject>) => boolean | Promise<boolean>
  /** human message when the condition fails */
  failMessage?: (config: TConfig, ctx: RuleContext<TObject>) => string
}
/** Check of the submitted input; returns issues (empty = ok). */
export interface ValidatorDef<TConfig = unknown, TObject extends RuleObject = RuleObject> {
  kind: 'validator'
  type: string
  label: string
  description?: string
  schema: z.ZodType<TConfig>
  validate: (
    config: TConfig,
    ctx: RuleContext<TObject>,
  ) => ValidationIssue[] | null | undefined | Promise<ValidationIssue[] | null | undefined>
}
/** Side-effect plan executed by the host after a successful transition. */
export interface PostFunctionDef<TConfig = unknown, TObject extends RuleObject = RuleObject> {
  kind: 'postFunction'
  type: string
  label: string
  description?: string
  schema: z.ZodType<TConfig>
  plan: (config: TConfig, ctx: RuleContext<TObject>) => Intent[] | Promise<Intent[]>
}

export type RuleDef = ConditionDef<any, any> | ValidatorDef<any, any> | PostFunctionDef<any, any>

export function defineCondition<TConfig, TObject extends RuleObject = RuleObject>(
  def: Omit<ConditionDef<TConfig, TObject>, 'kind'>,
): ConditionDef<TConfig, TObject> {
  return { kind: 'condition', ...def }
}
export function defineValidator<TConfig, TObject extends RuleObject = RuleObject>(
  def: Omit<ValidatorDef<TConfig, TObject>, 'kind'>,
): ValidatorDef<TConfig, TObject> {
  return { kind: 'validator', ...def }
}
export function definePostFunction<TConfig, TObject extends RuleObject = RuleObject>(
  def: Omit<PostFunctionDef<TConfig, TObject>, 'kind'>,
): PostFunctionDef<TConfig, TObject> {
  return { kind: 'postFunction', ...def }
}

/** Registry of rule implementations. Hosts create one, add built-ins plus their own rules. */
export class RuleRegistry {
  private readonly conditions = new Map<string, ConditionDef<any, any>>()
  private readonly validators = new Map<string, ValidatorDef<any, any>>()
  private readonly postFunctions = new Map<string, PostFunctionDef<any, any>>()

  constructor(defs: RuleDef[] = []) {
    this.register(...defs)
  }

  register(...defs: RuleDef[]): this {
    for (const d of defs) {
      const map = this.mapFor(d.kind)
      if (map.has(d.type)) throw new Error(`Duplicate ${d.kind} type: ${d.type}`)
      map.set(d.type, d as any)
    }
    return this
  }

  condition(type: string) {
    return this.conditions.get(type)
  }
  validator(type: string) {
    return this.validators.get(type)
  }
  postFunction(type: string) {
    return this.postFunctions.get(type)
  }
  list(kind: RuleDef['kind']): RuleDef[] {
    return [...this.mapFor(kind).values()]
  }

  /** Validate every RuleRef's config against its registered schema. */
  validateRefs(kind: RuleDef['kind'], refs: RuleRef[]): TransitionReason[] {
    const out: TransitionReason[] = []
    for (const ref of refs) {
      const def = this.mapFor(kind).get(ref.type)
      if (!def) {
        out.push({ kind: 'structural', type: ref.type, message: `Unknown ${kind} "${ref.type}"` })
        continue
      }
      const res = def.schema.safeParse(ref.config ?? {})
      if (!res.success)
        out.push({
          kind: 'structural',
          type: ref.type,
          message: `Invalid config for ${kind} "${ref.type}": ${res.error.issues.map((i) => i.message).join('; ')}`,
        })
    }
    return out
  }

  private mapFor(kind: RuleDef['kind']): Map<string, RuleDef> {
    if (kind === 'condition') return this.conditions as Map<string, RuleDef>
    if (kind === 'validator') return this.validators as Map<string, RuleDef>
    return this.postFunctions as Map<string, RuleDef>
  }
}
