# Field Service Source Boundary

## Source-locked

Core entities: Ticket, TicketComment, SlaPolicy, WorkOrder, WorkOrderAssignment,
TechnicianProfile, ServiceReport and ServiceReportPart.

Appendix-F visit/GPS entities: ServiceVisit, ServiceVisitLocation,
TechnicianLocationPing, TechnicianRoute, WorkOrderCheckIn and WorkOrderCheckOut.

Canonical Ticket status: OPEN, ASSIGNED, IN_PROGRESS, WAITING_CUSTOMER,
WAITING_VENDOR, RESOLVED, CLOSED, CANCELLED.

Canonical WorkOrder status: NEW, VALIDATED, ASSIGNED, TECHNICIAN_ACCEPTED,
TRAVELLING, ON_SITE, DIAGNOSIS, WORK_IN_PROGRESS, WAITING_FOR_PART, RESOLVED,
CUSTOMER_CONFIRMATION, CLOSED, CANCELLED.

Technician availability: AVAILABLE, ASSIGNED, ON_SITE, ON_LEAVE, OFF_DUTY.

Ticket categories: TECHNICAL_ISSUE, INSTALLATION_ISSUE, MAINTENANCE_REQUEST,
WARRANTY_CLAIM, BILLING_ISSUE, NETWORK_PROBLEM, EQUIPMENT_FAILURE,
GENERAL_REQUEST. Priorities: LOW, MEDIUM, HIGH, CRITICAL.

The source explicitly defines create-ticket and complete-work-order examples,
CRITICAL SLA example (30-minute response / four-hour resolution), service-report
contents, part consumption, assigned-technician-only acceptance, customer
confirmation closure, technician check-in/location/check-out, tenant privacy
policy and the atomic WorkOrder completion transaction.

## Implementation-derived and explicitly documented

The PDF does not print exact payloads for most Field Service commands, SLA
defaults for LOW/MEDIUM/HIGH, ServiceReport status values, exact GPS table
fields, retention duration, a technician-carried-stock entity, or detailed
serialized spare-part semantics.

This implementation therefore uses internal LOW 480/2880, MEDIUM 240/1440, HIGH 60/480 and
CRITICAL 30/240 minute SLA baselines; DRAFT/FINAL ServiceReport state; module
configuration keys for optional GPS/privacy; explicit warehouse/location stock
custody for service parts; and rejects anonymous SERIAL part consumption so the
Asset lifecycle remains the only serialized-equipment path.

No extra public Service endpoint or permission literal is invented. The three
Appendix-F technician mutation routes intentionally retain the blank permission
field from the locked catalog and enforce authenticated tenant + assigned
technician scope in the service layer.
