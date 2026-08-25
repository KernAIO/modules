# Kern modules — moved

Every module that lived here now has its own repository, and the shared workflow engine moved into
the framework. Nothing was lost: each repository carries the history of the package it holds.

| Module | Repository | Package |
|---|---|---|
| Tracker — projects, work items, cycles | [KernAIO/module-tracker](https://github.com/KernAIO/module-tracker) | `@kernhq/module-tracker` |
| Chat — channels, threads, DMs | [KernAIO/module-chat](https://github.com/KernAIO/module-chat) | `@kernhq/module-chat` |
| Quire — spaces, pages, collaborative docs | [KernAIO/module-quire](https://github.com/KernAIO/module-quire) | `@kernhq/module-quire` |
| HR — people, leave, attendance, approvals | [KernAIO/module-hr](https://github.com/KernAIO/module-hr) | `@kernhq/module-hr` |
| Mail — workspace email delivery | [KernAIO/module-mail](https://github.com/KernAIO/module-mail) | `@kernhq/module-mail` |
| Billing — plans, subscriptions, entitlements | [KernAIO/module-billing](https://github.com/KernAIO/module-billing) | `@kernhq/module-billing` |
| Workflow engine (Apache-2.0, shared) | [KernAIO/kernel](https://github.com/KernAIO/kernel) | `@kernhq/workflow` |

## Writing your own

Start from [**KernAIO/module-template**](https://github.com/KernAIO/module-template). It is
Apache-2.0 — what you build from it is yours to license however you like — and it is a whole working
module: contract, server, schema, row-level security, permissions, screens and strings.

```bash
npx degit KernAIO/module-template my-module
```

## Why they are separate

The modules above are the ones Kern ships with, and they are meant to be read as much as run — each
one written the way yours would be. A reference implementation that lives somewhere structurally
special is not a reference. They are the same shape as yours: one package, its own repository, its
own release.

See [ADR 0008](https://github.com/KernAIO/kern/blob/main/docs/adr/0008-a-module-ships-its-own-screens.md).
