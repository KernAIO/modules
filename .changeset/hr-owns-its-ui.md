---
'@kernhq/module-hr': minor
---

HR ships its own screens.

Five pages, six components, five dashboard widgets, five settings screens, 118 strings in five
locales, the mock and the API instance move into this package. It is the first migrated module with
capabilities, and they work unchanged: a contribution declares `capability: 'attendance'` and the
shell drops it when the workspace has that switched off.

`core-api.ts` names the slice of core's API this module calls, structurally rather than by importing
core's router type — hr does not depend on core, and core does not know hr exists.

Two bugs the move exposed, both invisible while this code lived in the app:

- `const typeLabel = (t: string) => t('employment_full_time')` — a parameter named `t` shadowing the
  message function, so every branch was a call on a string. It only became visible once the package
  type-checked its own client, which it did not do before.
- `types.map((t) => …)` was the same shadow, one rename away from the same bug.
