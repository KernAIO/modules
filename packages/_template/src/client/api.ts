import { createModuleClient, type KernClientOptions } from '@kernhq/sdk'
import type { ContractRouterClient } from '@orpc/contract'
import type { TemplateContract } from '../contract.js'

/** The typed client, derived from the contract — no hand-written method list to drift. */
export type TemplateApi = ContractRouterClient<TemplateContract>

export function createTemplateClient(opts: KernClientOptions): TemplateApi {
  return createModuleClient<TemplateApi>(opts, 'template')
}
