---
'@kernhq/module-quire': minor
---

The database foundations: schema, property types and the formula language.

A database is not a second kind of object beside a page — it *is* a page whose body renders a view,
and each of its rows is a page too. That is what makes a row openable, commentable, versioned and
searchable without building any of it again.

The formula language is a hand-written Pratt parser to a typed AST, evaluated by walking it.
**Never `eval`, never `new Function`**: a formula is text a workspace member types and the server
evaluates, and handing that to the JavaScript engine is arbitrary code execution with the database
connection already open. The first tests assert what it refuses.

`&&` and `||` short-circuit, so `false && prop("x")` never reads `x`. Dividing by nothing gives a
blank cell rather than `Infinity`. Function names are matched case-insensitively — keying the table
by the lowercased name instead would have made every camelCase function silently unreachable, which
it did until a test caught it.
