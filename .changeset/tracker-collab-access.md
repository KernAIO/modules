---
'@kernhq/module-tracker': minor
---

Fix `tracker.collab.access` so the collab gateway can actually use its answer.

The procedure declared `{ workspaceId, issueId, userId }` returning `{ canView, canEdit }`. The
gateway sends `{ workspaceId, type, id, userId }` and reads `{ canRead, canWrite }`. Zod rejected
every call, the broker threw, and the gateway fell back to plain workspace membership — so an
issue's collaborative description was readable and writable by any non-guest member of the
workspace, whatever the project's permissions said.

It now takes its shapes from `CollabAccessInput` / `CollabAccess` in `@kernhq/contracts`, so the two
sides compile against one definition, and refuses a document type the tracker does not own. The
integration test asserted the old shape on both sides, which is why nothing caught this; it now
builds the gateway's payload through the contract.

This changes the procedure's signature. Nothing could have been calling it successfully, but a
caller that had been getting the fallback behaviour will now get the real answer.
