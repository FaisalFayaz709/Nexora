# NEXORA Frontend Components

Pass R2 establishes the Appendix G component ownership model:

- `ui/` contains shadcn/ui-compatible primitives copied into the source tree and owned by NEXORA.
- `app/` contains application shells, page headers and guards.
- `data/` contains TanStack Table-backed grid wrappers.
- `forms/` contains React Hook Form wrappers and domain-neutral field components.
- `feedback/` contains loading, empty, error, validation, conflict, forbidden and not-found states.
- `workflow/` contains status badges, approval/audit/activity timelines and command-state panels.

Business modules must build on these wrappers instead of one-off page-level component systems.
