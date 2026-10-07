# Source Boundary

Source-locked:
- exact 26 Procurement method/path signatures and permission literals;
- PurchaseRequest, RFQ, PurchaseOrder and GoodsReceipt canonical statuses;
- entity key-field baseline for PR/RFQ/quotation/PO/GRN/inspection;
- deterministic quotation comparison; supplier selection remains a human decision;
- approved quotation -> PO;
- GRN -> inspection -> warehouse stock;
- atomic GRN + inventory transaction;
- maker-checker on PO approval;
- canonical Procurement events.

Implementation-derived but not represented as source-locked facts:
- supplier quotation internal states `SUBMITTED`, `SELECTED`, `NOT_SELECTED` because Appendix A does not publish a SupplierQuotation status model;
- RFQ publish command stores `PUBLISHED`; `OPEN` remains accepted for compatibility with the canonical RFQ state list;
- receipt tolerance is read from existing OrganizationSetting key `procurement.receiptTolerancePct`, defaulting to zero when unconfigured;
- GRN enters `INSPECTION_PENDING` after receipt because the separate inspection endpoint is source-locked;
- Product/PO/GRN payload fields not printed as complete shared contracts remain explicitly implementation-derived around the source examples/entity catalog.

No missing source contract is silently described as exact.
