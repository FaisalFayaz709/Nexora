import { runtimeAcceptanceSuite } from '../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'Finance PostgreSQL/API acceptance',
  requirements: [
    { name: 'keeps customer invoice posting atomic', evidence: 'post approved invoice and verify balance, journal, lines and audit in one transaction' },
    { name: 'enforces supplier invoice three-way match', evidence: 'match supplier invoice against PO/GRN and reject mismatch' },
    { name: 'keeps payment idempotency and allocation atomic', evidence: 'retry same Idempotency-Key and verify single payment, allocations and journal' },
    { name: 'rejects unbalanced manual journals and closed-period posting', evidence: 'attempt invalid journal and closed-period journal and verify rejection' },
    { name: 'denies cross-tenant finance references', evidence: 'use foreign customer/vendor/project/account ids and expect authorization failure' },
  ],
});
