---
'@kernhq/module-chat': minor
---

Chat ships its own screens.

The conversation page, fourteen components, two widgets, 121 strings in five locales, the mock and
the API instance move into this package.

Its half-written client i18n runtime is gone. It carried its own `t()`, its own bundle registry and
its own `setChatLocale` — with `let locale = 'en'`, which was not reactive, so switching language
would have left every chat string in the previous one. Nothing consumed it. The framework does this
once now, for every module.

`core-api.ts` names the slice of core's API chat calls — members, users and files — structurally, so
chat does not import core's router type.

Two cycles the move exposed, both of which compiled inside the app and could not have: `api-instance`
and `store-instance` imported the package's own barrel, which re-exports them.
