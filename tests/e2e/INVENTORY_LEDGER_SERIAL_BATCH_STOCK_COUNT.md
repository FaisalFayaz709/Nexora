# M8 Runtime E2E Scenarios

These scenarios must be automated against the running Docker stack before production certification.

1. Seed a tenant, branch, warehouse, products and stock balances.
2. Reserve available stock and prove another concurrent reservation cannot reserve more than availability.
3. Dispatch a transfer and verify source balance, stock ledger, serial state and batch remaining quantity.
4. Receive a transfer and verify destination balance, stock ledger, serial state and batch remaining quantity.
5. Create and post an adjustment and verify ledger immutability.
6. Start a physical stock count with an optional product filter; verify the filter is applied.
7. Verify active stock count freeze blocks normal adjustment/reservation/transfer mutation in the frozen scope.
8. Submit count lines and post variance from a different user; verify maker-checker, adjustment, posting and ledger entries.
9. Repeat with a second tenant and prove cross-tenant IDs cannot read or mutate inventory records.
