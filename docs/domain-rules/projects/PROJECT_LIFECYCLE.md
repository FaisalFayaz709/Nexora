# Project Lifecycle Controls

Implementation-derived transition table used to satisfy the source rule that
status is not freely patchable.

Project:
- DRAFT -> PLANNED | CANCELLED
- PLANNED -> ACTIVE | ON_HOLD | CANCELLED
- ACTIVE -> ON_HOLD | COMPLETED | CANCELLED
- ON_HOLD -> ACTIVE | CANCELLED
- COMPLETED -> HANDED_OVER only through the locked handover command
- HANDED_OVER -> terminal
- CANCELLED -> terminal

ProjectTask:
- NOT_STARTED -> IN_PROGRESS | BLOCKED | CANCELLED
- IN_PROGRESS -> BLOCKED | COMPLETED | CANCELLED
- BLOCKED -> IN_PROGRESS | CANCELLED
- COMPLETED -> terminal
- CANCELLED -> terminal

`COMPLETED` task status forces completionPct = 100.

These matrices are implementation controls because the PDF prints the statuses
but not the transition graph.
