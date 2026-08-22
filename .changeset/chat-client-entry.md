---
'@kernhq/module-chat': minor
---

Add the client entry point.

`@kernhq/module-chat/client` exports what a host needs to draw a conversation without reimplementing
any of it: the typed API client, the `ChatStore` (channels, sections, threads, reactions, pins,
bookmarks, typing, presence, read state, and the realtime handler that keeps all of it current),
message rendering helpers and the module's own message catalogue. The Svelte components live in the
application, which owns the design system — the same split the tracker uses.
