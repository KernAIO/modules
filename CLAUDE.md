# CLAUDE.md — Kern project rules

Rules for anyone (human or AI agent) working on Kern repositories. These apply to every repo in the KernAIO org.

## We build in the open
The repositories are **public**, so every commit is visible the moment it is pushed:
- Never commit secrets, tokens, personal data, or machine-specific paths. Use `.env` (gitignored) + `.env.example`.
- Write READMEs, docs, and issue/PR text for external contributors, not for ourselves.
- Keep commit history clean and meaningful — it is part of what people judge the project by.
- Every repo carries LICENSE, CLA.md, CODE_OF_CONDUCT.md, SECURITY.md, CONTRIBUTING.md.
- **Two licences, split at the framework boundary.** The `kernel` repo and `modules`'
  `_template` + `workflow` are **Apache-2.0** so anyone can write a closed module; the product —
  `app`, `core`, `chat`, `mail`, `collab`, `docs`, this umbrella, the first-party modules — is
  **AGPL-3.0-only**. A new package inherits its repo's licence unless it is something a third-party
  module must import, and then it is Apache-2.0 with its own LICENSE file. Apache-2.0 packages take
  only permissive dependencies. If a module author has to import an AGPL package to get something
  done, move the API — never the licence. See `LICENSING.md` and
  `docs/adr/0005-licensing-and-the-module-boundary.md`.

## Git
- Author identity: `Navid Mirzaaghazadeh <mirzaaghazadeh@icloud.com>` (already set in each repo's local git config — plain `git commit` is correct; do not override with `-c`).
- **Do not add `Claude-Session:`, `Co-Authored-By: Claude`, "Generated with", or any AI trailer/branding to commit messages, PRs, or code comments.**
- Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, with optional scope). Imperative mood, ≤ 72-char subject.
- Push to `origin main`. Never force-push. If `git pull --rebase` complains about unstaged files that aren't yours (parallel agents share worktrees), use `git -c rebase.autoStash=true pull --rebase`.
- **Never `git add -A` or `git add .`. Stage the paths you changed, by name.** Several agents share
  these checkouts, and another one is very often part-way through a new package in the same repo.
  `git add -A` sweeps their half-finished files into your commit and pushes them — under your commit
  message, without their lockfile entry, so CI fails at install for everyone. It happened on
  2026-08-24: a contact-address fix carried two unfinished modules into `main`. Run
  `git status --porcelain` first and stage from it; if you cannot name every path you are about to
  commit, you are not ready to commit. When it does happen, do not revert the other agent's files —
  they are still working on them; tell them instead, and repair what you broke.

## Layout & workflow
- Umbrella dev workspace: `kern/` with sibling repos cloned under `kern/repos/<name>` (gitignored there). pnpm links all `@kernhq/*` packages via the umbrella workspace.
- Install dependencies ONLY via `kern/scripts/pnpm-install-locked.sh` (serialises pnpm at the umbrella root).
- Node 24 (`nvm use 24`), pnpm 10, TypeScript ~5.9, ESM/NodeNext, Biome for lint+format (run `pnpm exec biome check --write <paths>` before committing), Vitest.
- Contracts first: changes to `@kernhq/contracts` / module contracts land (and build) before their consumers.
- Modules own their data: Postgres schema `mod_<id>`, `workspace_id` + RLS on every tenant table, cross-module access only via `kernel.call()` and events. See `modules` repo `packages/_template`.
- Ports: app 5173 · core 4000 · chat 4100 · mail 4200 · collab 4300 · docs 4400.
- Dev DB on this machine: Homebrew Postgres 18 at `localhost:5432` (`kern`/`kern`); the compose Postgres listens on `${KERN_PG_PORT:-5432}` (5433 here).

## CI
Every service repository's CI runs the real suites, so the workflow starts the infrastructure they
need as service containers: Postgres (`pgvector/pgvector:pg18`) everywhere, Valkey for `chat`,
Mailpit for `mail`. Things learned the hard way:
- Address a service container as **127.0.0.1**, never `localhost` — a runner resolves `localhost` to
  `::1` first, where the published port is not listening, and `fetch` does not retry over IPv4.
- Do not set `registry-url` on `actions/setup-node` in an install job. It writes an `.npmrc` with a
  placeholder token, and npm answers a bad token with **404**, so public packages appear to vanish.
- A repository is built **standalone** in CI. `workspace:*` only resolves inside the umbrella
  workspace; depend on the published version instead.
- **Each repository's own `pnpm-lock.yaml` is what CI installs from, and you cannot refresh it from
  inside the umbrella.** Add a dependency to a package and the umbrella install updates the *umbrella*
  lockfile, leaving the repo's committed one stale — CI then fails every job at
  `ERR_PNPM_OUTDATED_LOCKFILE`, install-time, before a single test runs. Plain `pnpm install` in
  `repos/<name>` walks up and attaches to the umbrella; `--ignore-workspace` skips `packages/*` and
  cheerfully reports nothing to do. Clone the repo somewhere outside the workspace and run
  `pnpm install --lockfile-only` there, then copy the lockfile back.
- Skipping a test because its infrastructure is missing is fine on a laptop and dishonest in CI.
  Fail when `process.env.CI` is set.

## Writing
Documentation — READMEs, guides, runbooks, `docs/`, and any procedure someone follows — uses the
`adhd-friendly-ste-technical-writer` skill in `.claude/skills/`: goal first, one action per step,
short sentences, conditions before commands, an observable result after every important action.
It is a house style inspired by ASD-STE100, not certified compliance — do not claim otherwise.
It governs documents for readers. Code comments and commit messages keep the voice they have.

## Quality bar
- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` must pass before pushing.
- UI follows `app/DESIGN.md` (Ink/paper design system) and must work in RTL (fa/ar) and dark mode.
- All user-facing strings go through i18n (Paraglide) — no hardcoded English in components.

## Keeping this file current
This file is how the next person — or the next agent — avoids repeating what we already worked out.
When you learn something durable, add it here **in the same commit as the change that taught you**:
- a trap that cost you time (a silent failure, a misleading error, a tool that lies about success)
- a convention you had to infer from reading several files
- a decision and the reason behind it, especially where the obvious choice is wrong
Keep it specific and short. Delete anything that stops being true — a stale note is worse than none.

---

# This repository: modules (first-party feature modules)

Every feature ships as a module: `@kernhq/module-chat`, `-mail`, `-tracker`, plus `@kernhq/workflow`
(the reusable state machine) and `packages/_template` to copy from.

**Things worth knowing**
- A module has three entry points: `./contract` (Zod + oRPC, no runtime), `./server`
  (`defineServerModule`: schema, migrations, router, procedures, jobs, subscriptions, search, resolvers)
  and `./client` (`defineClientModule`: nav, routes, commands, presenters, slots).
- A module owns its data in its **own Postgres schema** (`mod_<id>`) with `workspace_id` and RLS on
  every tenant table. Cross-module access goes through `kernel.call()` and events — never a join across
  schemas.
- Generated migrations must use `CREATE SCHEMA IF NOT EXISTS`: the kernel creates the schema before
  running them, so the bare form fails on boot.
- The client is published as **source**, not compiled: consumers build the Svelte components with their
  own toolchain, so `tsconfig` excludes `src/client`.
- **A module's manifest version comes from `packageVersion(import.meta.url)`.** The literal that used
  to sit in `defineModule` was never bumped by a release: chat shipped as 0.2.0 and told every admin
  it was 0.1.0, and that literal is what `workspace_modules.installed_version` recorded.
  `pnpm check:versions` (after `pnpm build`) fails CI if the two ever disagree again.
- `@kernhq/workflow`'s registry uses `any` deliberately — it holds rules whose config types differ, and
  `unknown` would break variance. The reasoning is at the top of `src/registry.ts`; each rule validates
  its own config with Zod before it runs.
- **A syntax error in client source breaks the consumer, not this package.** `./client` is published
  as TypeScript, so nothing here compiles it: `pnpm build` and `pnpm typecheck` both pass while a
  broken file ships. Only the app finds it, one publish later. Biome's lint does catch it — run it
  before publishing, and never trust a green build alone for anything under `src/client`.
- **A path glob inside a block comment ends the comment.** `app/src/lib/modules/*/client.ts` contains
  `*/`; everything after it becomes code. Biome reports a missing semicolon on the prose, which
  points at the symptom rather than the cause. Write such a path without the star, or use `//`.
- **A dependency added from the umbrella workspace does not update this repo's lockfile.** The
  umbrella install writes the umbrella's, and this repo's CI installs with `--frozen-lockfile`
  against its own — so the change passes locally and fails in CI with ERR_PNPM_OUTDATED_LOCKFILE.
  Run `pnpm install --lockfile-only` here, in the repo that owns the manifest, and commit the result.
- **`files` must cover everything `./client` imports, contract source included.** The client ships as
  source, so a re-export of `../contract.js` from `src/client/index.ts` breaks the consumer unless the
  contract is in the tarball too. `pnpm check:pack` catches it; nothing else does, because the local
  workspace resolves the file that the published package omits.
- **A module's tenant tables carry RLS — unless the rows are the operator's rather than the tenant's.**
  `mod_billing` is the one case: a console that lists every workspace and jobs that enumerate them
  cannot run under a policy that returns nothing when `app.workspace_id` is unset. If you make that
  exception, write the reason at the top of the schema file, and keep the genuinely tenant-owned
  tables (`invoices`) secured. See `docs/adr/0003` in the `kern` repo.
- **Capabilities are for a module different customers want *different amounts* of.** A module is
  all-or-nothing; a capability is the switch below it, declared with `defineCapabilities` in the
  contract, enforced by `requiresCapability(MODULE_ID, id)` on the server and by `capability:` on a
  client contribution. It answers **404, not 403** — a permission failure means the surface exists
  and this person may not have it, which is the wrong sentence for a workspace that never enabled
  the feature, and it contradicts a shell that has already hidden the navigation. Switching one off
  must never destroy data: it is a flag in module settings, so anything needing a migration to
  reverse does not belong behind one. `chat`, `mail`, `tracker` and `billing` deliberately declare
  none — each is coherent only as a whole, and a capability nobody switches is a switch nobody
  needs. `_template` declares two so the shape is visible; delete them when you copy it.
- **A procedure behind a capability needs its own line in `<module>CapabilityProcedures`.** A
  missing `requiresCapability` is invisible — the procedure compiles, every other test passes, and
  the only symptom is a workspace calling a feature it switched off. `module.test.ts` reads that map
  and fails when a procedure named in it is not carrying the extra middleware. Order the middlewares
  `workspaceScoped` → `requiresCapability` → `requires`, so a workspace with the module off is
  refused before anything reveals which capabilities the module has.
- **A fix without a changeset does not ship.** The commit lands, CI goes green, the registry keeps
  the broken version, and the consumer's build still fails against it. If a fix matters to a
  consumer, it needs a changeset in the same commit.
- **Start a module with `pnpm new-module <id>`, not `cp -r _template`.** A hand copy has to get four
  things right that nothing checks: deleting `"private": true` (a private package is skipped
  silently by changesets — the commit lands, CI is green, nothing publishes), `files` covering
  everything `./client` imports, the module id agreeing in `MODULE_ID`, `moduleSchema()` and
  `schemaFilter`, and the version coming from `packageVersion(import.meta.url)`. The generator does
  all four, and writes the app-side half — permissions, API client and mock — which used to be
  undocumented hand-work in another repository.
- **The template's client half is typechecked through `tsconfig.client.json`.** `./client` ships as
  source, so `tsconfig.json` must not emit it, and for a long time that meant it was not checked at
  all: `pnpm build` and `pnpm typecheck` both passed over a broken file and only the app found it,
  one publish later. `typecheck` now runs both configs.
