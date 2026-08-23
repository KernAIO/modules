# modules

**The features Kern ships with — each one written the way yours would be.**

Every feature in [Kern](https://github.com/KernAIO/kern) is a module. A module owns its own database
schema, its own API and its own screens. It says what it contributes, and the runtime does the rest.

Nothing in here uses a private interface. If you can build a module, you can build a feature that
sits beside these as an equal. A workspace can switch any module off, ours included.

## What is here

| Module | What it does | State |
|---|---|---|
| `@kernhq/module-tracker` | Issues and projects: list, board, detail, queries, cycles, time tracking | Working |
| `@kernhq/module-chat` | Channels, direct messages, threads, reactions, presence | Working |
| `@kernhq/module-mail` | Sending email, providers, templates, delivery log | Working |
| `@kernhq/workflow` | The state machine the others use for statuses and transitions | Working |
| `packages/_template` | An empty module to copy | — |

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

Website: [kernaio.com](https://kernaio.com).
