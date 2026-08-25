/**
 * The in-memory implementation of this module's API.
 *
 * It satisfies the same contract types as the real client, so no screen has a second code path for
 * demos and end-to-end tests. `PUBLIC_API_MOCK=1` in the app selects it, and the shell reports that
 * through `getHost().isMock` — a module never checks an env var itself.
 *
 * Keep it in step with the contract. A module whose mock is missing a procedure has a working page
 * and a broken demo, in exactly the environment used to show the product.
 */
interface MockNote {
  id: string
  workspaceId: string
  title: string
  body: string
  createdAt: string
  archivedAt: string | null
}

export function createMockTemplateApi() {
  const notes: MockNote[] = [
    {
      id: '01920000-0000-7000-8000-000000000001',
      workspaceId: '',
      title: 'A first note',
      body: 'Everything here comes from src/client/mock.ts',
      createdAt: new Date().toISOString(),
      archivedAt: null,
    },
  ]

  return {
    notes: {
      list: async ({ workspaceId }: { workspaceId: string }) => ({
        items: notes.map((n) => ({ ...n, workspaceId })),
        nextCursor: null,
      }),
      create: async ({ workspaceId, title, body }: { workspaceId: string; title: string; body?: string }) => {
        const note: MockNote = {
          id: crypto.randomUUID(),
          workspaceId,
          title,
          body: body ?? '',
          createdAt: new Date().toISOString(),
          archivedAt: null,
        }
        notes.unshift(note)
        return note
      },
      remove: async ({ noteId }: { noteId: string }) => {
        const at = notes.findIndex((n) => n.id === noteId)
        if (at >= 0) notes.splice(at, 1)
        return { ok: true as const }
      },
      // behind the `archive` capability; the mock does not gate, the server does
      archive: async ({ noteId, archived }: { noteId: string; archived?: boolean }) => {
        const note = notes.find((n) => n.id === noteId)
        if (!note) throw new Error('Note not found')
        note.archivedAt = archived === false ? null : new Date().toISOString()
        return note
      },
    },
  }
}
