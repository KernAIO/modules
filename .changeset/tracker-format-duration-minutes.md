---
'@kernhq/module-tracker': patch
---

`formatDuration` keeps minutes below a day.

It rounded to whole hours, so ninety logged minutes read as "2h" and a timer running for twenty read
as "0h". For an estimate that is a rounding; for time somebody actually tracked it is wrong, and the
same function shows both. Above a day minutes stop being the point and are still dropped.
