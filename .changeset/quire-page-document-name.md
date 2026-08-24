---
'@kernhq/module-quire': patch
---

Export `pageDocumentName(page)` from the client.

The name a page's prose is synchronised under is the module's to decide, and the collab gateway
parses it with the matching function in `@kernhq/contracts`. Leaving the caller to assemble the
string means a name the gateway cannot parse, which is a rejected WebSocket with no useful error.
