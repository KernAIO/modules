---
'@kernhq/module-tracker': patch
---

Completing a cycle with `rollToCycleId: null` now leaves unfinished work in the backlog. It was
being treated as "not specified", which moved the work into the next upcoming cycle — the opposite
of what the caller asked for.
