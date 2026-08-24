---
'@kernhq/module-quire': minor
---

Drafts, publishing and version history.

`page_versions` is the backbone of both halves of the draft model rather than a feature beside it: a
**page** serves `published_version_id` to a reader, and a **live doc** serves the document itself —
one mechanism, two behaviours.

- `versions.list` / `get` / `create` — history, with the version a reader is being served marked.
- `versions.restore` — puts an older version back. The state it replaces is captured *first*, so
  restoring is never itself the thing that loses work.
- `publishing.publish` / `revert` — decide what readers see, or throw the draft away and go back.
  Reverting also keeps what it discarded.

Restoring and reverting go through `collab.document.replace`, not `apply`: applying an update merges
it, so an older state would produce the union of old and new and bring every deleted paragraph back
alongside the ones that replaced it.

Subscribing to `collab.document.updated` mirrors the flattened prose onto the row, marks a page
whose draft has moved on from what readers see, and takes an automatic version when the last one is
old enough — so history accumulates while somebody writes rather than only when they remember to
press something.

New permission `quire.page.publish`: deciding what readers and any public site are served is a
different question from being allowed to write a draft.
