---
'@kernhq/module-tracker': minor
---

Group by a custom field.

`issues.query` and `groupIssues` accept `cf.<key>` wherever they accepted a built-in group key, so a
board can have a column per Severity and a list can have a heading per Squad. A multi-valued field
puts an issue in every group it names, the same rule labels follow, and an issue with no value —
absent, empty, or an empty list — groups under nothing and sorts last.

The counts are computed in Postgres by unnesting the value, which has one wrinkle worth recording:
a set-returning function is not allowed inside `CASE`, so the value is normalised to an array in the
`CASE` and unnested in the `FROM` item.
