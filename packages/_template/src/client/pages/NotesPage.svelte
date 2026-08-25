<script lang="ts">
import { Button, EmptyState, Spinner, session } from '@kernhq/ui'
import { createQuery } from '@tanstack/svelte-query'
import { getTemplateApi } from '../api-instance.js'
import { t } from '../i18n.js'
import { canTemplate } from '../permissions.js'

/**
 * This module's screen.
 *
 * The shell passes `workspaceId` and `workspaceSlug`, and `params` for any `:name` segment the
 * route declared. **Do not read `$app/state` or `$app/navigation`** — they are SvelteKit aliases,
 * this package is type-checked on its own, and they resolve only because the app happens to be
 * compiling you. Ask `navigation` from `@kernhq/ui` for the current location instead.
 */
interface Props {
  workspaceId: string
  workspaceSlug: string
  params?: Record<string, string>
}
const { workspaceId }: Props = $props()

const api = getTemplateApi()

// `[module, entity, …scope]`, so a realtime change invalidates exactly this and nothing else.
const notes = createQuery(() => ({
  queryKey: ['template', 'note', workspaceId],
  queryFn: () => api.notes.list({ workspaceId }),
  enabled: Boolean(workspaceId),
}))
</script>

<svelte:head><title>{t('title')} · {session.workspaces.find((w) => w.id === workspaceId)?.name ?? ''}</title></svelte:head>

<section>
  <header>
    <h1>{t('title')}</h1>
    {#if canTemplate('manage')}
      <Button size="sm">{t('new')}</Button>
    {/if}
  </header>

  {#if notes.isPending}
    <Spinner />
  {:else if notes.isError}
    <p>{t('common.error')}</p>
  {:else if !notes.data?.items.length}
    <EmptyState icon="file-text" title={t('empty')} />
  {:else}
    <p>{t('count', { n: notes.data.items.length })}</p>
    <ul>
      {#each notes.data.items as note (note.id)}
        <li>{note.title}</li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  h1 {
    font-size: 18px;
    font-weight: 600;
    color: var(--kern-ink-900);
  }
</style>
