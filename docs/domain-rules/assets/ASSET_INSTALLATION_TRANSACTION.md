# Atomic Serialized Asset Installation

The source requires Asset installation to include:
stock consumption/issue + serial state + asset record + installation history + audit.

This implementation transaction:

1. validate authenticated tenant and asset.install permission;
2. validate Project, customer/site/area and technician via public facades;
3. begin PostgreSQL transaction;
4. lock Asset;
5. create AssetInstallation;
6. lock linked SerialNumber;
7. verify serial belongs to this Asset, is AVAILABLE and has a source warehouse;
8. lock/update StockBalance and decrement exactly 1 unit;
9. create immutable StockTransaction type CUSTOMER_INSTALLATION;
10. set SerialNumber.status=INSTALLED and currentWarehouseId=NULL;
11. link StockTransactionSerial;
12. set Asset installedAt + ACTIVE;
13. append AssetHistory transition from previous -> INSTALLED -> ACTIVE;
14. create/rotate opaque QR token metadata;
15. append business audit;
16. append canonical `asset.installed` event;
17. commit.

Actual QR image/PDF/customer notification remains an after-commit concern.
No BullMQ performs the stock/serial/Asset transition.
