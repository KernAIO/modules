---
'@kernhq/module-quire': minor
---

Databases: rows, typed columns, views, relations and rollups.

A row **is** a page — created in the same space, parented to the database's own page — so it is
openable, commentable, versioned and searchable without any of that being built twice. Cells live in
`props`, keyed by a stable `key` rather than by name, so renaming a column keeps its data.

Filtering and sorting happen in SQL over `jsonb`, not in memory: a page of fifty rows filtered down
to three is not a page of three, and the caller has no way to ask for the rest. Sorts are typed, so
10 does not come before 9. An untouched checkbox filters as `false`, because most rows are ones
nobody has touched. A filter naming a property that does not exist is refused rather than
interpolated — the key arrives in the request and `props->>'…'` is query text, not a parameter.

Formulas and rollups are computed on write into `computed`, so a view can sort and filter by one
like any other column. A broken formula shows an error in its own cell rather than failing the write
that triggered it.

Three bugs the tests caught, each of which would have read as "the data is wrong" rather than as a
bug: the database's own page appeared as the first row of itself, a rollup looked for its target
column in the database holding the rollup rather than the one across the relation, and every
camelCase formula function was unreachable.
