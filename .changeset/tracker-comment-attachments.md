---
'@kernhq/module-tracker': minor
---

Let a file arrive with a comment.

`attachments.add` accepts an optional `commentId`, and `Attachment` carries it. A file belongs to
the issue and *optionally* to the comment that introduced it, so the issue keeps listing every
attachment while a comment can show its own.

Attaching to a comment requires `tracker.issue.comment` rather than the edit permission — somebody
who may reply but not edit must still be able to attach a screenshot to their reply — and the author
of a comment may remove the files that arrived with it, the same way they own its text.
