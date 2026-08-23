---
'@kernhq/module-chat': patch
'@kernhq/module-mail': patch
'@kernhq/module-tracker': patch
---

Report the version of the package the module ships in.

The version in `defineModule` was a string literal, and nothing bumped it when changesets released
the package: chat shipped as 0.2.0 and told every admin it was 0.1.0, and that literal is what the
modules screen renders and what `workspace_modules.installed_version` records. It now comes from
`packageVersion(import.meta.url)`, and `pnpm check:versions` fails the build if the two ever
disagree again.
