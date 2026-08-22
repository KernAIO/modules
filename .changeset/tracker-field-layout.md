---
'@kernhq/module-tracker': minor
---

Make the per-work-item-type field layout real, and validate custom values on every write.

`WorkItemType.fieldLayout` has been stored since the type existed and was read by nothing. It is now
resolved: `types.layout` returns the fields of one type in one project, ordered, labelled and split
into `main` and `sidebar`, with system fields and custom fields in one list addressed by the same
`cf.<key>` convention that KQL and view columns already use.

Two rules keep it from surprising anyone. An **empty layout means the default layout** — every type
starts with `fieldLayout: []`, so anything else would blank every existing issue panel. And a field
the layout does not mention is **appended, not hidden**, so a newly created field appears instead of
looking like it failed to save. `title`, `status` and `type` can never be hidden.

Custom values are now checked against their field definition on **update** as well as create: a
`select` refuses a value that is not one of its options, a `number` respects `min`/`max`/`precision`,
a `url` refuses anything but http and https, and a key that no field defines is an error rather than
a silent write. A required field is enforced for `app` and `api`; for `email`, `intake`, `import` and
`automation` the gap is logged and the issue is still created, because a customer's email must not
bounce because the workspace made a field mandatory.

Transition screens now save what they collect. The values were passed to the rule engine and then
dropped, so a screen appeared to work only when a `field.set` post-function repeated the value. Only
the fields a screen declares are applied — `tracker.issue.transition` is narrower than
`tracker.issue.update`.

`searchable` reaches the search index for the first time, and a CSV import converts a cell to its
field's type instead of importing every column as text.

**Breaking:** `FieldScheme` and `fields.schemes.*` are removed, along with `Project.fieldSchemeId`.
A project gated its custom fields twice — once by scheme, once by layout — and a field hidden by
either was impossible to explain. The layout is the more capable of the two. `TypeScheme` and
`WorkflowScheme` are unaffected. Migration `0003` drops the table.

Also fixed: `workflows.create` and `workflows.update` validated without the rule registry and so
accepted definitions `workflows.validate` rejected; removing a status consulted issues across the
whole workspace rather than the types the workflow governs; a `relation` field compiled as scalar
text in KQL and never matched; and two partial unique indexes let two field definitions share one
key, and therefore one value. Migration `0002` replaces them with one constraint and refuses to run
where a collision already exists.
