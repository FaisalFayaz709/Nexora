import { runtimeAcceptanceSuite } from '../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'CRM PostgreSQL/API acceptance',
  requirements: [
    { name: 'preserves lead to opportunity workflow', evidence: 'create lead, qualify it and verify opportunity plus audit/event evidence' },
    { name: 'preserves survey quotation contract lifecycle', evidence: 'run survey, send quotation, accept quotation and activate contract' },
    { name: 'blocks cross-tenant CRM object references', evidence: 'use customer/site/opportunity ids from another tenant and expect denial' },
  ],
});
