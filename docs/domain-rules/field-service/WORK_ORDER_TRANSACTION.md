# Work-Order Completion Transaction

One PostgreSQL transaction performs: lock WorkOrder; require accepted technician
and checked-out visit; lock DRAFT ServiceReport; consume every ServiceReportPart
through InventoryFacade as immutable TECHNICIAN_ISSUE stock ledger evidence;
apply batch-lot decrements; link stock transactions; finalize report; verify
visit; progress WorkOrder through RESOLVED -> CUSTOMER_CONFIRMATION -> CLOSED;
release technician; resolve linked Ticket when eligible; append Asset service
history through AssetFacade; append audit; append `work_order.completed`; commit.

Customer report PDF and notifications are after-commit async work only. BullMQ
never owns stock, report finalization or WorkOrder lifecycle state.
