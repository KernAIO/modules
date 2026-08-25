---
'@kernhq/module-hr': minor
---

Add policies, accrual and payroll periods.

**A policy is a row, not a branch.** Leave entitlement, overtime rules and rounding differ per
company and per country, and encoding that as `if (country === 'TR')` is how a product acquires a
branch per customer and a release cycle per rule change. A policy carries a kind, a config validated
by that kind's own schema, and an effective range — so a rule that changed in July is still
answerable for June.

**One ladder decides which applies**: `person → office → legal entity → org unit → position →
workspace`, nearest wins. The same order already resolves a calendar, so there is never a second
precedence rule to remember. It is stored as a `priority` on the assignment, so the database orders
it rather than a service knowing the sequence by heart, and `policies.resolveFor` reports which rung
answered — because "why does she accrue differently from her team" is the question this module gets
asked.

**Accrual `preview` and `run` are the same computation.** `run` credits exactly what `preview`
returned; a preview written separately eventually disagrees with the number that lands in somebody's
balance. It is idempotent per person, per type, per period, because a job that double-credits when
somebody clicks twice is worse than one that never ran. People who accrue nothing are returned with
the reason rather than being silently absent.

**Periods make a filed payroll safe.** Locking a month sets `locked` on every derived day inside it,
so a recomputation leaves them alone and says which dates it refused to touch. Unlocking is
deliberately loud — it logs a warning with the reason and reports how many days became movable
again, because a payroll has usually already been filed against a closed month.

Two exclusion constraints do work application code should not have to: one assignment of a policy at
a rung over a period (two overlapping ones at the same priority would make the ladder's answer
depend on row order), and no two periods of a kind covering the same day for one entity ("is this
date locked" has to have exactly one answer).
