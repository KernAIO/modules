---
'@kernhq/module-hr': minor
---

Add attendance: punches, schedules and a derived day sheet.

**The server stamps the time.** A client's clock is a claim — recorded beside the server's instant
with the measured skew, and marked `disputed` beyond a threshold — never the thing that decides. A
system that cannot tell an offline sync from an edited phone clock cannot defend any of its numbers.

**Raw punches are immutable and the day sheet is derived.** A wrong punch is voided by a correcting
row that points at it, so "recorded then corrected" and "never recorded" stay distinguishable.
Everything on the day sheet comes from punches, schedule, calendar and leave and can be thrown away
and rebuilt, which makes a bad computation a bug to fix rather than data to repair.

The time arithmetic is a pure layer with no database and no clock of its own, so daylight saving is
testable as a table. A 09:00–18:00 shift really is an hour shorter on the spring transition and an
hour longer in autumn; subtracting wall-clock readings reports nine hours every day and quietly pays
for an hour nobody worked, once a year. An ambiguous wall time resolves to the earlier instant and a
skipped one to the moment the clock jumps — both deliberate, both tested. Istanbul is in the test
matrix precisely because Türkiye abolished the change in 2016: proving the code handles transitions
is worth less if it has invented one.

A night shift is attributed to **the day it started**, so clocking out at 06:00 on Tuesday finishes
Monday. The alternative leaves Monday short and Tuesday long — the month adds up while every
individual day is wrong.

Punches are partitioned monthly by business date, with a DEFAULT partition so a missing month is a
slow insert rather than a refused punch. Partitions are created through a SQL function that also
enables row-level security on them: a partition created with a bare `CREATE TABLE ... PARTITION OF`
is readable directly by any role holding SELECT on it, whatever the parent's policy says. An
integration test caught that, not a review.

Regularization goes through the same approval engine leave uses — which is why that engine was keyed
by subject type rather than bolted onto leave requests. Jobs fan out per office rather than firing
once in UTC, because "it is past 3am" is a different moment in every office.
