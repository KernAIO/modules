---
'@kernhq/module-mail': patch
---

Fix a block comment in `src/client/index.ts` that a glob closed early, leaving the rest of the
sentence as code. `./client` exports TypeScript source rather than built JavaScript, so the file is
compiled by whatever imports it — an unparseable comment shipped in 0.2.0 breaks the consumer's
build, not this package's.
