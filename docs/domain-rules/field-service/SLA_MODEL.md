# SLA Model

Ticket stores the selected SlaPolicy plus responseDueAt, resolutionDueAt,
firstRespondedAt, resolvedAt and closedAt. Assignment records first response
once. Resolution records the resolution instant. Reads derive remaining and
breached values against the stored deadlines, so later policy changes do not
rewrite historical SLA behavior.

Only the CRITICAL 30-minute response / 4-hour resolution example is printed by
the source. LOW/MEDIUM/HIGH baseline values are implementation-derived because
the locked catalog contains no public SLA administration API.
