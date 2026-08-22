---
'@kernhq/module-tracker': patch
---

Scope component and label issue counts to the workspace.

`arrayCounts` took a `workspaceId` and never used it, so the number beside a component or label
counted matching issues across every workspace in the schema. Row-level security hides that in a
deployment, but not from a role that can bypass it — which is exactly why the other queries here
carry an explicit `workspace_id` predicate. This one now does too.
