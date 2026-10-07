# BOM and Material Flow

The functional source requires a Project BOM to compare required material with
available inventory, identify shortage and allow shortage to create a material
request.

This implementation implements that without crossing module boundaries:

1. `PUT /projects/:id/bom` creates/updates the latest DRAFT BOM.
2. Approved BOM versions are immutable through the public route.
3. `POST /projects/:id/bom/:bomId/approve` approves the DRAFT version and
   supersedes the previous approved version in the same transaction.
4. `GET /projects/:id/bom` asks `InventoryFacade` for organization-wide
   warehouse-aggregate free stock (`onHand - reserved`) and returns
   `availableFreeQty` and `shortageQty`.
5. `POST /projects/:id/material-request` requires an APPROVED BOM, recomputes
   shortage, and calls `ProcurementFacade` in the same PostgreSQL transaction.
6. Project code never imports Inventory or Procurement repositories.

The material requirement uses the already-existing Procurement-owned
MaterialRequirement/MaterialRequirementItem persistence introduced earlier.
