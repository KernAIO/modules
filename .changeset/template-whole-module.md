---
'@kernhq/module-template': minor
---

The template is a whole module now: screens, strings and manifest included.

It used to be the headless half. The manifest, the pages, the API client and the mock were written
into the `app` repository by `pnpm new-module`, which meant a third party copying this package got a
working API and a nav item that went nowhere — and the Apache-2.0 licence on it promised something
the shape of the code could not deliver.

What it ships now: `module.ts` with navigation, a route, a command and a dashboard widget;
`pages/NotesPage.svelte` and `widgets/NotesWidget.svelte`; `i18n.ts` with its own bundle, including
a counted message; `permissions.ts` derived from the contract; `api-instance.ts` taking its origin
from the host; and `mock.ts`.

`typecheck` runs `svelte-check` over `src/client`, so the screens are checked by the package that
owns them rather than by whoever happens to compile them.

`permissions.ts` builds its keys from `MODULE_ID` rather than a literal — one place decides what the
module is called, and a generator that renamed the literals but missed a template string would throw
at import.
