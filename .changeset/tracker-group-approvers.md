---
'@kernhq/module-tracker': patch
---

Let an approval addressed to a group or a role be granted.

`resolveSubject` returned nobody for `group` and `role` subjects, so an approval addressed to either
could never reach `minApprovals` — the transition was stuck for good, with no error to explain it.

Core's member list already carries each member's `groupIds` and `roleIds`, so the tracker expands
them from that. A role subject matches a custom role id or a built-in role name (`owner`, `admin`,
`member`, `guest`). If core cannot answer, the transition now fails loudly rather than quietly
resolving to an approval nobody can grant.
