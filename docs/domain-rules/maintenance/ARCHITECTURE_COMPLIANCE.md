# Architecture Compliance

- Maintenance routes expose exactly five locked endpoints.
- Controllers translate HTTP only.
- MaintenanceService performs business rules and transaction orchestration.
- MaintenanceRepository owns Maintenance persistence only.
- WorkOrder creation goes through FieldServiceFacade.
- Asset lifecycle/history updates go through AssetFacade.
- Part stock consumption goes through InventoryFacade.
- No Maintenance module imports FieldServiceRepository, AssetRepository or InventoryRepository.
- Critical schedule generation and maintenance completion remain synchronous PostgreSQL transactions.
- BullMQ is not used for Maintenance state mutation.
- `contractId` remains a scalar until the Contract owner implementation introduces the physical Contract relation.
