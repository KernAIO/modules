# Kern first-party modules

Each package is `@kernalo/module-<id>` and exports three entrypoints:

| entry | runs in | contains |
|---|---|---|
| `./contract` | everywhere | Zod schemas, oRPC contract, events, permissions (no runtime deps beyond zod/@orpc/contract) |
| `./server` | a Kern backend service (core/chat/mail/…) | `defineServerModule`: Drizzle schema (`mod_<id>`), migrations, oRPC router, procedures, event subscriptions, jobs, automations, search indexers |
| `./client` | the SvelteKit app | `defineClientModule`: routes, nav, command actions, presenters, slots, i18n |

Copy `packages/_template` to start a module. Conventions: tables live in the module's own Postgres schema with `workspace_id` + RLS; cross-module access only via `kernel.call()` and events.
