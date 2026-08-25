---
'@kernhq/module-quire': patch
---

Stop the formula AST's `if` node being thenable.

An object with a `then` property is a thenable: `await` and `Promise.resolve()` call it as a
promise. The node's `then` was an AST node rather than a function, so the moment one was returned
from an `async` function the runtime would stop treating it as data — silently, with no error at the
point of the mistake. Renamed to `consequent`/`alternate`, which is the standard naming anyway.
