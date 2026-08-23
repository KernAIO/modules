# modules

**The features Kern ships with — each one written the way yours would be.**

[![CI](https://img.shields.io/github/actions/workflow/status/KernAIO/modules/ci.yml?branch=main&label=CI&style=flat-square)](https://github.com/KernAIO/modules/actions/workflows/ci.yml)
[![Licence](https://img.shields.io/badge/licence-AGPL--3.0-blue?style=flat-square)](LICENSE)
[![Status](https://img.shields.io/badge/status-pre--1.0-orange?style=flat-square)](https://github.com/KernAIO/kern#what-works-today)
[![Last commit](https://img.shields.io/github/last-commit/KernAIO/modules?style=flat-square)](https://github.com/KernAIO/modules/commits/main)
[![Website](https://img.shields.io/badge/kernaio.com-1f2328?style=flat-square)](https://kernaio.com)

Every feature in [Kern](https://github.com/KernAIO/kern) is a module. A module owns its own database
schema, its own API and its own screens. It says what it contributes, and the runtime does the rest.

Nothing in here uses a private interface. If you can build a module, you can build a feature that
sits beside these as an equal. A workspace can switch any module off, ours included.

## What is here

| Module | What it does | State | Version |
|---|---|---|---|
| `@kernhq/module-tracker` | Issues and projects: list, board, detail, queries, cycles, time tracking | Working | [![npm](https://img.shields.io/npm/v/@kernhq/module-tracker?style=flat-square&label=)](https://www.npmjs.com/package/@kernhq/module-tracker) |
| `@kernhq/module-chat` | Channels, direct messages, threads, reactions, presence | Working | [![npm](https://img.shields.io/npm/v/@kernhq/module-chat?style=flat-square&label=)](https://www.npmjs.com/package/@kernhq/module-chat) |
| `@kernhq/module-mail` | Sending email, providers, templates, delivery log | Working | [![npm](https://img.shields.io/npm/v/@kernhq/module-mail?style=flat-square&label=)](https://www.npmjs.com/package/@kernhq/module-mail) |
| `@kernhq/workflow` | The state machine the others use for statuses and transitions | Working | [![npm](https://img.shields.io/npm/v/@kernhq/workflow?style=flat-square&label=)](https://www.npmjs.com/package/@kernhq/workflow) |
| `packages/_template` | An empty module to copy | — | — |

## Build a module

Goal: create a module that Kern serves.

You need:

- Node 24 and pnpm 10.

### 1. Copy the template

```bash
cp -r packages/_template packages/my-module
```

The template brings tests for the two things that are easiest to forget. Every procedure your
contract promises must exist. Every procedure must sit behind a permission check.

### 2. Write the three entry points

| Entry point | Runs where | Holds |
|---|---|---|
| `./contract` | Everywhere | The shapes: data, API, events, permission keys. No runtime |
| `./server` | A Kern service | Database schema, migrations, API, jobs, event handlers, search |
| `./client` | The web app | Screens, navigation, command actions, how your objects are drawn elsewhere |

### 3. Check it

```bash
pnpm typecheck
pnpm test
pnpm check:pack
```

**Expected result:** all three report success.

`pnpm check:pack` packs each module and follows every import from its published client entry. A
module ships part of its client as source, so anything that source imports has to be inside the
package.

### 4. Have a service host it

A module that nothing loads is invisible: its tests pass, it publishes, and every call answers 404.
Add it to `featureModules` in the [core service](https://github.com/KernAIO/core), or to a service of
your own.

## Rules a module follows

- **A module owns its data.** Its tables live in its own Postgres schema, named `mod_<id>`. Every
  tenant table carries a `workspace_id` and a row-level security policy.
- **No module reads another module's tables.** Ask through `kernel.call()`, or listen for an event.
  There is no join across schemas.
- **A generated migration must say `CREATE SCHEMA IF NOT EXISTS`.** The runtime creates the schema
  before running migrations, so the plain form fails at boot.
- **The client ships as source**, not compiled, so the application builds the components with its own
  toolchain.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [CLAUDE.md](CLAUDE.md). Licence: [AGPL-3.0](LICENSE).

---

**Kern** — one place for your team's work: issues, conversations, documents and people.
Open source, self-hosted. [kernaio.com](https://kernaio.com) · [github.com/KernAIO](https://github.com/KernAIO)
