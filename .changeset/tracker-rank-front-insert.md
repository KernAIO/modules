---
'@kernhq/module-tracker': patch
---

Stop `rankBetween` looping for ever when cards are dragged to the top of a list.

An absent lower bound was treated as *below* digit 0, so the midpoint of (nothing, `'2'`) came out
as `'0'` — and nothing sorts strictly between `''` and `'0'`. The next insertion at the front then
searched for a key below `'0'` for ever, appending a digit each pass until the tab ran out of
memory. Five cards dragged to the top of one list was enough to reach it, and `rankBetweenSafe` in
the app's mock try/catches, which does nothing against a loop.

`src/client/rank.ts` had no test at all, which is how this survived. It has one now, including 200
consecutive insertions at the front.

`src/server/rank.ts` is a separate implementation and was never affected — it recurses on a midpoint
and throws on a bound ending in `0`.
