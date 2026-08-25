---
'@kernhq/module-mail': minor
---

Mail ships its own screens.

The settings page, both dashboard cards, the module's strings in all five locales, its permissions
and its API instance now live in this package instead of in the app. The shell mounts whatever the
manifest declares, so deleting this package now removes the feature completely — which is what makes
it a module rather than a server half plus a hand-written page somebody has to keep in step.

Two things changed shape while moving:

- **Permissions are derived from the contract, not re-typed.** The app kept its own copy of
  `mail.settings.manage`, which type-checks perfectly while being wrong: a mistyped key silently
  hides a control or offers one the server refuses, and nothing reports it.
- **The settings page takes `workspaceId` as a prop** rather than reading `$app/state`. A module
  package is type-checked on its own, and the router alias does not resolve there — it only appeared
  to work because the app compiled it.

`typecheck` now runs `svelte-check` over `src/client`. Without it this package's own CI checked the
server half and nothing else, which is most of the package now.
