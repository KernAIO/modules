---
'@kernhq/module-tracker': minor
---

Four project templates, and one applier for all of them.

`software`, `support`, `marketing` and `simple` are values in `server/seeds/templates.ts`, typed by
the same `ProjectTemplateBody` a saved snapshot produces. Each brings its own work item types,
custom fields, per-type layouts, labels, views and settings: a Bug requires Severity and shows steps
to reproduce, a Story hides both and shows story points, a support Ticket has a customer and an
impact and no estimate.

There were two template systems, and neither worked properly:

- Built-in templates were rows with a null workspace, and `templates.list` filters by workspace — so
  the shipped templates could never appear in the list meant to offer them. They are values now, and
  the list returns them ahead of whatever the workspace saved.
- `snapshotProject` emitted fields the applier ignored, and dropped layouts, labels and views
  entirely. A template saved from a carefully configured project produced a project configured
  differently. It now emits everything the applier reads, and a round-trip test proves it: create
  from a built-in, save it as a template, create from that, and the resolved layouts match.

`seedProject` is the applier with a body chosen by name, so "create from Software" and "create from
the template we saved last week" walk the same code.

A template's custom fields are created at **workspace** level. A field key is unique per workspace,
so scoping them to the project would mean only the first project created from a template owned its
fields, and every project after it carried layouts naming fields it could not see.

Also: creating a label that already exists answers with a conflict naming it, rather than a raw
constraint violation.
