---
'@kernhq/module-template': minor
---

Publish the module template.

It was `private: true`, so the Apache-2.0 half of the licensing split — the package a third party
copies to write a closed module — could only be got by cloning an AGPL-3.0 repository. The promise
in ADR 0005 was real in the licence header and unreachable in practice.

`files` now ships the whole source tree, the migrations, the drizzle config and the tsconfigs: this
package is published to be read and copied, not imported.
