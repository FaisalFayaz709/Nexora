# M12 Runtime E2E Scenario Checklist

These are the live runtime scenarios required after M1 lockfile, M2 database and M3 Docker runtime are working.

| Scenario | Required runtime proof |
|---|---|
| M12-RUNTIME-SERIAL-STOCK-REGISTER-INSTALL-CONSUME-SERIAL-AND-ACTIVATE-ASSET | A received serial number becomes exactly one asset and cannot be reused. |
| M12-RUNTIME-INSTALLATION-CREATES-ASSET-INSTALLATION-HISTORY-AUDIT-EVENT-AND-HASHED-QR | Install endpoint updates stock/serial, asset, history, audit, business event and QR hash in one transaction. |
| M12-RUNTIME-QR-ROTATE-DOES-NOT-LEAK-PERSISTED-HASH-AND-OLD-TOKEN-FAILS | Stored QR token differs from returned token; prior token no longer resolves after rotation. |
| M12-RUNTIME-QR-RESOLVE-DENIES-CROSS-TENANT-TOKEN-USE | Tenant B cannot resolve Tenant A asset QR token. |
| M12-RUNTIME-REPLACEMENT-REVOKES-OLD-ASSET-QR-AND-LINKS-REPLACEMENT-ASSET | Old asset moves to REPLACED, replacement remains ACTIVE, old QR resolves as invalid. |
| M12-RUNTIME-RETIREMENT-REVOKES-QR-AND-BLOCKS-FURTHER-INSTALL-REPLACE-RMA | Retired asset cannot be mutated and QR is revoked. |
| M12-RUNTIME-RMA-BLOCKS-BLACKLISTED-OR-UNAPPROVED-VENDOR | RMA with unapproved/blacklisted vendor fails. |
| M12-RUNTIME-WARRANTY-EXPIRY-SCAN-EMITS-ASSET-WARRANTY-EXPIRING-EVENT | Expiring warranty creates asset.warranty.expiring event once. |
| M12-RUNTIME-FIELD-SERVICE-AND-MAINTENANCE-APPEND-ASSET-HISTORY | Work-order/maintenance completion writes append-only asset history. |
| M12-RUNTIME-ASSET-COST-HISTORY-FEEDS-PROJECT-COSTING-READ-MODEL | Asset cost changes are visible to project/reporting read models without cross-module repository imports. |
