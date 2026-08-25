---
'@kernhq/module-billing': minor
---

Billing ships its own screens.

The workspace plan page and both instance console pages move into this package, with the module's
strings in all five locales and its API instance. The shell mounts whatever the manifest declares.

Instance pages needed the shell to learn something new: they are **not** filtered on whether the
current workspace has billing enabled, and never on a capability. The console is not about a
workspace — an operator looking at what every workspace is billed must still see the screen from a
workspace that has billing switched off.

`index.ts` no longer defines the formatting helpers; they live in `format.ts` and the barrel
re-exports them. The barrel now reaches the client module, and through it Svelte components and the
framework's rune-backed singletons — so importing one pure helper through it dragged all of that in,
and `format.test.ts` started failing with "$state is not defined". Import the file, not the barrel.
