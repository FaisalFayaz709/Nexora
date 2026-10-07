import { runtimeAcceptanceSuite } from '../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'Commercial Finance PostgreSQL/API acceptance',
  requirements: [
    { name: 'posts landed cost idempotently', evidence: 'retry same landed-cost post and verify one journal and one cost-layer set' },
    { name: 'rejects unreconciled landed cost allocations', evidence: 'allocate less or more than header total and expect rejection' },
    { name: 'stores historic tax calculation evidence', evidence: 'calculate tax, change rule and verify existing TaxTransaction stays unchanged' },
    { name: 'closes bank reconciliation immutably', evidence: 'close reconciliation and verify later silent edit is rejected' },
    { name: 'posts payment voucher with cheque evidence', evidence: 'create CHEQUE voucher and verify journal plus ChequeRegister row' },
    { name: 'posts receipt voucher with payer evidence', evidence: 'create receipt voucher and verify bank/cash debit, AR/revenue credit and audit row' },
  ],
});
