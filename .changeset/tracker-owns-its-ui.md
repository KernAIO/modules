---
'@kernhq/module-tracker': minor
---

Tracker ships its own screens — the last module to move.

Four pages, thirty components, seven widgets, seven settings screens, the planning and project
areas, 579 strings in five locales, the mock and the API instance. `IntakePage` is exported by name
as well: it is the one tracker screen that is *not* inside a workspace — somebody outside the
organisation opens `/request/<token>` with no session — so the app mounts it as a route of its own.

Four defects the move exposed, none of which the app could have shown:

- **Six shadowed `t` parameters** across transitions, types and templates. Each turned a message
  call into a property access on the shadow. Two more appeared in settings pages copied after the
  first sweep, which is why the check runs on every pass rather than once.
- **`api-instance` imported the package's own barrel**, which re-exports it — a cycle that resolves
  through the export map inside the app and fails immediately standalone.
- **`mock.ts` imported five helpers from `./index.js`** that live in `kql.ts`, `rank.ts` and
  `rules.ts`.
- **`tracker.test.ts` went through the barrel too**, so it began failing with `$state is not defined`
  the moment this package grew components — a pure-function test broken by a Svelte import three
  files away.

`svelte-dnd-action` is a dependency of this package now. The board has always needed it; it was
being borrowed from the app.
