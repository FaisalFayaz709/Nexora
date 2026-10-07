# Technician Visit / GPS Privacy

The Appendix-F visit routes require authenticated tenant context and the service
verifies User -> Employee -> current accepted WorkOrderAssignment. GPS capture
is disabled by default and accepted only when the tenant service-module config
enables it. GPS coordinates use NUMERIC/Decimal, never Float. Proof/ping records
carry retainUntil; visit operations purge expired unreferenced location data.
Photo/customer-signature requirements are tenant-configurable. Check-in/out
remain usable without GPS when location collection is disabled. Completion
requires a checked-out ServiceVisit. Access/audit records do not expose raw
unnecessary location data.
