import { runtimeAcceptanceSuite } from '../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'C14 Customer portal, vendor portal and technician PWA runtime acceptance',
  requirements: [
    {
      name: 'customer portal shows only linked customer projects/assets/invoices/documents',
      evidence: 'Seed two customers in the same tenant plus another tenant; authenticate customer portal identity and verify dashboard, projects, assets, tickets, invoices, payments and documents are filtered to the linked customer only.',
    },
    {
      name: 'vendor portal shows only linked vendor RFQs/quotations/POs/GRNs/invoices/payments',
      evidence: 'Seed RFQs and POs for two vendors; authenticate vendor portal identity and verify quotation submission, PO visibility, delivery evidence, invoices, payments and documents are restricted to the linked vendor.',
    },
    {
      name: 'technician PWA commands are assigned-work-order scoped',
      evidence: 'Authenticate two technicians; verify only the assigned technician can accept, start travel, arrive, check in, add location/photo, use spare parts, submit service report, collect signature, check out and complete the work order.',
    },
    {
      name: 'QR asset lookup never bypasses authorization',
      evidence: 'Resolve active, rotated and revoked QR tokens as customer, technician and unrelated portal users; verify token lookup is always followed by tenant/customer/assignment permission checks.',
    },
    {
      name: 'offline technician sync is idempotent and tenant scoped',
      evidence: 'Replay offline commands with duplicate clientCommandId, wrong technician and wrong tenant; verify only unique commands for the assigned technician are applied once and audited.',
    },
    {
      name: 'portal photos signatures and attachments use centralized document storage',
      evidence: 'Upload visit photos, customer signature and vendor documents through document upload intent/complete-upload; verify DocumentLink rows and no inline file blobs in portal command payloads.',
    },
  ],
});
