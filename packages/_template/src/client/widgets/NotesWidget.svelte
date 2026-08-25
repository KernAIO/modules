<script lang="ts">
import { WidgetState } from '@kernhq/ui'
import { createQuery } from '@tanstack/svelte-query'
import { getTemplateApi } from '../api-instance.js'
import { t } from '../i18n.js'

/**
 * A dashboard card.
 *
 * `WidgetState` draws loading, failed and empty so every card on the board reports those three the
 * same way — and so a module does not have to translate "Retry" to show a widget that failed.
 */
interface Props {
  workspaceId: string
  settings?: Record<string, string | number | boolean | null>
}
const { workspaceId, settings }: Props = $props()

const limit = $derived(Number(settings?.limit ?? 5))
const api = getTemplateApi()

const notes = createQuery(() => ({
  queryKey: ['template', 'note', workspaceId, limit],
  queryFn: () => api.notes.list({ workspaceId }),
  enabled: Boolean(workspaceId),
}))

const items = $derived((notes.data?.items ?? []).slice(0, limit))
</script>

<WidgetState
  pending={notes.isPending}
  error={notes.error}
  empty={!items.length}
  emptyTitle={t('empty')}
  emptyIcon="file-text"
  onRetry={() => notes.refetch()}
>
  <ul>
    {#each items as note (note.id)}
      <li>{note.title}</li>
    {/each}
  </ul>
</WidgetState>
