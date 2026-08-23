---
'@kernhq/module-mail': minor
---

Mail now ships `createMailClient`, the typed oRPC client for `/api/mail`, the way the tracker and
chat modules do. Without it nothing could call the module: its settings and delivery log had a
server and no way to reach it.

Removes the client module and settings component that lived here. The app composes its own client
modules and owns its screens, so neither was ever registered or rendered — a `defineClientModule`
in a module package is dead code by the app's architecture.
