---
'@kernhq/module-tracker': minor
---

The last two field types work.

**`relation`** — a link to another issue. The targets are checked against the field's
`relationTypeIds` and `relationProjectIds`, and against existence: a link to an issue that is not
there is not a link, it is a uuid that will render as itself for ever. The value is always stored as
an array, whatever it was given, because that is what the KQL compiler compares against.

**`formula`** — an expression over the same issue's own values, and nothing else. No rollups over
children and no references to other issues, which is what removes the dependency graph and the
recompute fan-out: a value is computed when the issue is written, and nothing else can invalidate
it. A formula names a field the way everything else does — `{estimate}`, `{cf.story_points}` — and
has arithmetic, comparison, and `abs`, `round`, `min`, `max`, `coalesce`, `daysBetween`, `if`,
`concat` and `length`.

A missing value makes the whole expression empty rather than zero: a story with no estimate has no
doubled estimate either, and calling it 0 would sort it to the top. A formula that reads another
formula sees a computed value. One that would calculate itself is refused when the field is saved,
and so is a formula that cannot be read — along with a text `pattern` that will not compile, which
would otherwise fail on every write to the project instead of on the save that introduced it. That
check now runs on edit as well as on create.

A change to an estimate, a priority, a date or a title recomputes the formulas that read it, so a
calculated value is never left stale.
