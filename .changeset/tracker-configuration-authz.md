---
'@kernhq/module-tracker': patch
---

Authorise issue templates, recurring rules and watcher changes.

Templates and recurring rules are project configuration — they decide what everyone else's issues
look like — but any member who could see a project could create, rewrite or delete them. They now
take `tracker.project.manage`, at project scope when they belong to a project and at workspace scope
when they are shared, and listing templates only returns the ones the caller can reach.

Adding or removing *other people* from an issue's watchers decides whose inbox it lands in, so it
takes the new `tracker.issue.manage_watchers` permission. Watching or unwatching yourself still only
needs to be able to see the issue.
