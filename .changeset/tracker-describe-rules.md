---
'@kernhq/module-tracker': minor
---

`describeRule` — a workflow rule said the way an administrator thinks about it.

A transition's conditions, validators and post-functions are stored as `{type, config}`, which is the
right thing to store and the wrong thing to show: an editor that renders JSON asks somebody to read
a data structure to answer "who is allowed to close this". `describeRule` turns one into a sentence
— "Only when every sub-issue is done", "Assigns it to whoever moved it", "Notifies the assignee" —
and `describeApprovers` does the same for a transition that needs sign-off.

It lives here rather than in an interface so a rule and the sentence describing it cannot drift into
different repositories. A rule nothing recognises reports its own type rather than guessing, which is
what a newer server or an extension's rule will do.
