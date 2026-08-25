---
'@kernhq/module-quire': minor
---

Quire ships its own screens.

All three pages, seven components, 75 strings in five locales, the mock and the API instance move
into this package. The routes are declarations now — `/quire`, `/quire/:space`, `/quire/:space/:page`
— matched by the shell, which hands the component its `params`. A wiki page's URL is this module's
business rather than something the app mirrors in its route tree.

**Two `QUIRE_PERMISSIONS` existed and they disagreed.** This package declared six keys; the app
declared eight, adding `page.comment` and `page.publish`. Any screen gating through the package's
copy was reading a key that did not exist there — and a wrong permission string is a perfectly valid
string, so nothing reported it. There is one now, derived from the contract, and `key()` throws at
import if a name is not declared.

Components read the shell's `navigation` singleton instead of `$app/navigation` and `$app/state`,
and the collaborative editor takes its endpoint from the host instead of naming port 4300.
