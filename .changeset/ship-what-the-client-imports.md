---
'@kernhq/module-tracker': patch
'@kernhq/module-chat': patch
'@kernhq/module-mail': patch
---

Ship the sources the published client imports, and stop advertising a client that does not exist.

0.1.1 fixed the unresolvable client by having it import its own package's entry points. That works
for a consumer but not for the module repository itself, where the packages are type-checked before
they are built — the entry points resolve to `dist`, which does not exist yet. The client goes back
to relative imports and the tarball now carries `src/contract` (and `src/kql` for the tracker),
which is what those imports point at.

`@kernhq/module-chat` declared a `./client` export pointing at a file that was never written, so
importing it always failed. The export is gone until the chat client lands.

`pnpm check:pack` packs each module for real and walks every import from the published client entry,
so neither can come back unnoticed.
