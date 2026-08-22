---
'@kernhq/module-tracker': minor
---

The public intake form asks what the project actually records.

`intake.form` derives its questions from the resolved layout of the project's default work item
type, instead of four hardcoded entries. Configure a field and the form follows, with nothing to
keep in step by hand.

Only field types a stranger can sensibly answer are offered — text, long text, choice, several
choices, number, date, yes/no and link. A `user` picker would list the workspace's members to the
public and a `relation` would list its issues; neither belongs on a form anyone on the internet can
open. A field the layout hides is not asked about either.

`intake.submit` writes the answers into `issue.custom` rather than flattening them into the
description. A form could ask for Impact and the issue could not then be filtered, grouped or
reported on by it: the answer was only ever text in a paragraph. Answers naming a field the form did
not offer are ignored and logged, because a public form receives whatever it is sent.

A required field still does not bounce a submission — a stranger cannot know the workspace made a
field mandatory, and refusing would lose the request. The gap is recorded and completed at triage.
