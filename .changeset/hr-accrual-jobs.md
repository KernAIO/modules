---
'@kernhq/module-hr': minor
---

Add the monthly accrual and yearly carry-forward jobs.

Both fan out per workspace and write through the same paths the API uses, so a scheduled credit and
a manual one are the same operation and cannot drift. The accrual job is idempotent per person, per
type, per period — a retry after a partial failure credits only what is missing.

Carry-forward writes **three** entries rather than performing a transfer: what lapsed and what left
close the old year, and what survived opens the new one. Each year's ledger then sums to what that
year actually held, which is what turns "your balance went down" into "you had 9 days, 5 carried, 4
expired above the cap" — a sentence somebody can check against the list. It runs on the 2nd of
January so a late December accrual has already landed.
