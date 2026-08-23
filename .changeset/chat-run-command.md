---
'@kernhq/module-chat': minor
---

`ChatStore.runCommand` runs a slash command and keeps the rail honest afterwards. `commands.run` had
a server and no caller, so typing `/leave` posted the word "/leave".

It belongs on the store rather than in a composer because every command that does anything changes
what the sidebar shows — `/leave` removes a channel, `/mute` changes a membership, `/topic` changes
what the header reads. A message the command posts is applied immediately, so the sender sees their
own `/shrug` without waiting for realtime.

The `ephemeral` line comes back in the server's English; callers translate the commands they know
and fall back to it for the rest, which keeps working when commands become pluggable.
