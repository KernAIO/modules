import { getHost } from '@kernhq/ui'
import { createTemplateClient, type TemplateApi } from './api.js'
import { createMockTemplateApi } from './mock.js'

/**
 * This module's API client, made once and shared.
 *
 * The origin comes from the shell, never from an env var read here: same-origin in every real
 * deployment, so a module never has to know which service hosts it or on what port. Six modules used
 * to carry their own `env.PUBLIC_API_URL || 'http://localhost:4000'`, which is six chances for one
 * to be wrong and a failure that reads as a connection refused with no clue who owned it.
 *
 * The shell also decides whether it is running against the in-memory implementation, which satisfies
 * the same contract types — so no screen has a second code path for demos and end-to-end tests.
 */
let cached: TemplateApi | null = null

export function getTemplateApi(): TemplateApi {
  if (cached) return cached
  const host = getHost()
  cached = host.isMock
    ? (createMockTemplateApi() as unknown as TemplateApi)
    : createTemplateClient({ baseUrl: host.apiBaseUrl })
  return cached
}

/** Test seam: install a fake without touching module state elsewhere. */
export function __setTemplateApi(api: TemplateApi | null) {
  cached = api
}
