---
'@kernhq/module-tracker': minor
---

`@kernhq/module-tracker/client` re-exports every contract type.

It used to be a hand-kept allowlist, so an interface that reached for one more model needed a
publish of this package before it could name what it was already receiving — four times in one
afternoon. The list guarded nothing: `export type *` is erased at compile time exactly as the named
exports were, and the emitted client still carries no reference to the contract or to zod.
