import { runtimeAcceptanceSuite } from '../../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'Commercial Procurement PostgreSQL/API acceptance',
  requirements: [
    {
      name: 'blocks risky vendors from RFQ PO payment and contract release flows',
      evidence: 'create vendor onboarding and blacklist/risk records, then verify RFQ invitation, PO creation, payment and release-order commands reject unsafe vendors',
    },
    {
      name: 'enforces vendor onboarding maker-checker with bank document evidence',
      evidence: 'submit onboarding with bank and document metadata, approve with a distinct actor and verify vendor status plus audit evidence',
    },
    {
      name: 'prevents purchase contract release order over-release under concurrency',
      evidence: 'race release-order creation against one contract item and verify remaining quantity/value cannot go below zero',
    },
    {
      name: 'allocates release-order numbers transaction-safely',
      evidence: 'create parallel release orders and verify unique business numbers and consumed NumberSequenceReservation rows',
    },
  ],
});
