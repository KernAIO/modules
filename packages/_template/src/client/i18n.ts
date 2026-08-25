import { type Message, scopedT } from '@kernhq/ui'

/**
 * This module's own strings, in every locale the platform ships.
 *
 * A module ships separately from the app, so Paraglide — which compiles only the app's
 * `messages/*.json` — cannot see these. The shell merges them into the framework's message runtime
 * when it registers the module, and `t()` resolves against the merged map. Keys are namespaced by
 * module id, which is what keeps two modules from colliding in that one map.
 *
 * A **counted** message is not a string with `{count}` in it: give it a map of CLDR plural category
 * to string and `t(key, { count })` picks the form. English has two and Arabic has six, and which
 * one applies is `Intl.PluralRules`' answer rather than yours.
 *
 * Words every module needs and none owns — Save, Cancel, Retry — come from the framework's `common`
 * bundle (`t('common.save')`). Do not copy them here; six translations of "Save" drift apart.
 *
 * Bundles are thunks so a locale is fetched only when it is the one in use. English is the fallback
 * and is therefore always loaded.
 */
export const en: Record<string, Message> = {
  'template.nav': 'Notes',
  'template.title': 'Notes',
  'template.empty': 'Nothing here yet.',
  'template.new': 'New note',
  'template.note_title': 'Title',
  'template.note_body': 'Body',
  'template.archived': 'Archived',
  'template.count': { one: '{n} note', other: '{n} notes' },
  'template.widget_title': 'Recent notes',
  'template.widget_desc': 'The last few notes in this workspace.',
  'template.settings_nav': 'Notes',
}

export type TemplateMessageKey = keyof typeof en

/**
 * Add a locale by adding a bundle here. `node scripts/extract-module-messages.mjs` in the app
 * repository does this automatically when a module's strings are moved out of the app.
 */
export const templateMessageBundles = {
  en: async () => en,
}

/** `t('nav')` — the module id is implied. `t('common.save')` still reaches the shared bundle. */
export const t = scopedT('template')
