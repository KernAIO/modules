---
'@kernhq/module-quire': minor
---

Comments, mentions and search.

Comments are anchored with **Yjs relative positions**, not character offsets. An offset names a
place that only exists while nobody else is typing — two words inserted above and the remark is
attached to something it was never about. `quotedText` is kept alongside so a thread whose text has
since been deleted still reads as being about something.

Replying to a reply joins the thread rather than nesting deeper, and resolving settles the
conversation rather than one remark in it. A thread whose opening comment is deleted keeps its
replies: they are still somebody's words.

Mentions notify everyone named except the author, through a best-effort `NotifyService` — a comment
must not fail to post because core is briefly unavailable.

Pages are indexed for workspace search, and `resolvers` render a page or space wherever another
module links to one. **Only pages in an `open` space are indexed**, deliberately:
`SearchDocument.acl` matches against `[userId, …groupIds, 'role:<role>']`, so indexing a restricted
space correctly means knowing which subjects may read a page — and core can answer "may this person
read this object" but cannot enumerate who can. Guessing yields either a private page in a
stranger's results or a page its author cannot find. The restricted case waits for a core procedure
that can answer it.
