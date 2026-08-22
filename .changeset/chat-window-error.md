---
'@kernhq/module-chat': patch
---

Let a failed transcript recover, and stop following a channel you left.

`openChannel` set the window to `loading: true` and awaited the request. When that request failed
the window stayed loading for ever, so the reader watched a skeleton that would never become a
conversation. `MessageWindow` now carries an `error`, a failed window is retried rather than treated
as loaded, and `retryChannel` re-runs it.

`leaveChannel` dropped the channel locally but kept its realtime subscription open, so messages kept
arriving for a channel you were no longer in.
