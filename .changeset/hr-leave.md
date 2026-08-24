---
'@kernhq/module-hr': minor
---

Add leave and the shared approval engine.

**A balance is a sum, never a stored number.** Every grant, accrual, consumption, reversal, expiry
and adjustment is an append-only ledger entry. Cancelling approved leave inserts a reversal; it does
not delete the consumption, because "she booked it and cancelled" and "she never booked it" are
different facts and only one of them is true. That costs a little arithmetic and buys the only thing
that matters when an employee and HR disagree about a number: a list of what happened, in order,
that nobody edited.

The two ways a balance goes wrong under load are both refused by the database rather than by
application code. A cursor row taken `FOR UPDATE` serialises spending, so two overlapping requests
for the last day cannot both read "enough". A partial unique index across `(person, date)` for
counted days in a live status means a person cannot hold two live requests covering one Tuesday —
and it is partial so that a cancelled request stops blocking the date.

**One approval engine, keyed by subject type**, so regularization, overtime and timesheets attach to
it later without a schema change. The chain is snapshotted onto the request when it is raised and
approvers are resolved to people then, so editing a workflow — or a reorganisation — cannot change
who has to sign something already in flight. One decision per approver per step, enforced by a
unique index: a double click is one decision, not two towards a quorum. Delegation records both
people, so "who approved this" never becomes ambiguous. A chain that resolves to nobody
auto-approves, because a one-person company has no manager and still has to book time off.

Two capabilities: `leave` (on by default) and `approvals` (off — at Level 1 the requester's manager
approves implicitly, and a company with one approver does not need a chain editor to discover that).
