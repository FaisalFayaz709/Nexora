import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { Prisma, prisma } from '@nexora/database';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import { StockAdjustmentService } from './stock-adjustment.service.js';
import { StockReservationService } from './stock-reservation.service.js';
import { StockTransferService } from './stock-transfer.service.js';

const integration = describe.runIf(process.env.RUN_INTEGRATION_TESTS === '1');

async function fixture(trackingType = 'NONE') {
  const suffix = randomUUID().slice(0, 8);
  const organization = await prisma.organization.create({
    data: {
      code: `INV-${suffix}`,
      name: 'Inventory Test',
      currency: 'USD',
      timezone: 'UTC',
      locale: 'en',
      status: 'ACTIVE',
    },
  });
  const branch = await prisma.branch.create({
    data: {
      organizationId: organization.id,
      code: `B-${suffix}`,
      name: 'Inventory Branch',
    },
  });
  const department = await prisma.department.create({
    data: {
      organizationId: organization.id,
      branchId: branch.id,
      name: `Inventory Department ${suffix}`,
    },
  });
  const category = await prisma.productCategory.create({
    data: { organizationId: organization.id, name: `Category-${suffix}` },
  });
  const unit = await prisma.unitOfMeasure.create({
    data: {
      organizationId: organization.id,
      code: `EA-${suffix}`,
      name: 'Each',
      precision: 0,
    },
  });
  const product = await prisma.product.create({
    data: {
      organizationId: organization.id,
      categoryId: category.id,
      sku: `SKU-${suffix}`,
      name: 'Concurrent Product',
      unitId: unit.id,
      trackingType,
    },
  });
  const source = await prisma.warehouse.create({
    data: {
      organizationId: organization.id,
      branchId: branch.id,
      code: `SRC-${suffix}`,
      name: 'Source Warehouse',
    },
  });
  const destination = await prisma.warehouse.create({
    data: {
      organizationId: organization.id,
      branchId: branch.id,
      code: `DST-${suffix}`,
      name: 'Destination Warehouse',
    },
  });
  const user = await prisma.user.create({
    data: {
      email: `inventory-${suffix}@example.invalid`,
      passwordHash: 'test-only-not-used',
      status: 'ACTIVE',
    },
  });
  const employee = await prisma.employee.create({
    data: {
      organizationId: organization.id,
      userId: user.id,
      branchId: branch.id,
      departmentId: department.id,
      employeeNo: `EMP-${suffix}`,
      name: 'Inventory Runtime User',
    },
  });
  const customer = await prisma.customer.create({
    data: { organizationId: organization.id, code: `CUS-${suffix}`, name: 'Inventory Runtime Customer' },
  });
  const site = await prisma.customerSite.create({
    data: { organizationId: organization.id, customerId: customer.id, code: `SITE-${suffix}`, name: 'Inventory Runtime Site' },
  });
  const projectA = await prisma.project.create({
    data: {
      organizationId: organization.id,
      customerId: customer.id,
      contractId: randomUUID(),
      siteId: site.id,
      projectNo: `PRJ-A-${suffix}`,
      name: 'Inventory Runtime Project A',
      managerId: employee.id,
      startDate: new Date('2026-01-01T00:00:00Z'),
      dueDate: new Date('2026-02-01T00:00:00Z'),
      contractValue: new Prisma.Decimal('1000'),
    },
  });
  const projectB = await prisma.project.create({
    data: {
      organizationId: organization.id,
      customerId: customer.id,
      contractId: randomUUID(),
      siteId: site.id,
      projectNo: `PRJ-B-${suffix}`,
      name: 'Inventory Runtime Project B',
      managerId: employee.id,
      startDate: new Date('2026-01-01T00:00:00Z'),
      dueDate: new Date('2026-02-01T00:00:00Z'),
      contractValue: new Prisma.Decimal('1000'),
    },
  });
  const tenant: TenantRequestContext = {
    membershipId: randomUUID(),
    organizationId: organization.id,
    branchId: branch.id,
  };
  return {
    suffix, organization, branch, department, category, unit, product, source, destination,
    user, employee, customer, site, projectA, projectB, tenant,
  };
}

async function putStock(input: {
  organizationId: string;
  warehouseId: string;
  productId: string;
  onHand: string;
  reserved?: string;
}) {
  return prisma.stockBalance.create({
    data: {
      organizationId: input.organizationId,
      warehouseId: input.warehouseId,
      locationScopeKey: 'WAREHOUSE',
      productId: input.productId,
      onHand: new Prisma.Decimal(input.onHand),
      reserved: new Prisma.Decimal(input.reserved ?? '0'),
    },
  });
}

integration('inventory PostgreSQL concurrency acceptance', () => {
  it('prevents concurrent reservations from exceeding available stock', async () => {
    const f = await fixture();
    await putStock({
      organizationId: f.organization.id,
      warehouseId: f.source.id,
      productId: f.product.id,
      onHand: '100',
    });

    const service = new StockReservationService();
    const attempts = await Promise.allSettled(
      Array.from({ length: 10 }, (_value, index) =>
        service.reserve(
          f.tenant,
          { userId: f.user.id, ip: '127.0.0.1' },
          {
            productId: f.product.id,
            warehouseId: f.source.id,
            projectId: index % 2 === 0 ? f.projectA.id : f.projectB.id,
            quantity: '15',
          },
        ),
      ),
    );

    const committed = attempts.filter((result) => result.status === 'fulfilled').length;
    expect(committed).toBe(6);

    const balance = await prisma.stockBalance.findUniqueOrThrow({
      where: {
        organizationId_warehouseId_locationScopeKey_productId: {
          organizationId: f.organization.id,
          warehouseId: f.source.id,
          locationScopeKey: 'WAREHOUSE',
          productId: f.product.id,
        },
      },
    });
    const active = await prisma.stockReservation.aggregate({
      where: {
        organizationId: f.organization.id,
        warehouseId: f.source.id,
        productId: f.product.id,
        status: 'ACTIVE',
      },
      _sum: { qty: true },
    });

    expect(balance.reserved.toString()).toBe(
      (active._sum.qty ?? new Prisma.Decimal(0)).toString(),
    );
    expect(balance.reserved.toString()).toBe('90');
    expect(balance.reserved.lessThanOrEqualTo(balance.onHand)).toBe(true);
  }, 30_000);

  it('allows only one concurrent dispatch and one receive effect', async () => {
    const f = await fixture();
    await putStock({
      organizationId: f.organization.id,
      warehouseId: f.source.id,
      productId: f.product.id,
      onHand: '10',
    });

    const transfer = await prisma.stockTransfer.create({
      data: {
        organizationId: f.organization.id,
        fromWarehouseId: f.source.id,
        toWarehouseId: f.destination.id,
        transferNo: `TR-${f.suffix}`,
        items: {
          create: {
            productId: f.product.id,
            qty: new Prisma.Decimal('8'),
          },
        },
      },
    });

    const service = new StockTransferService({} as never);
    const dispatches = await Promise.allSettled([
      service.dispatch(f.tenant, { userId: f.user.id, ip: '127.0.0.1' }, transfer.id),
      service.dispatch(f.tenant, { userId: f.user.id, ip: '127.0.0.1' }, transfer.id),
    ]);
    expect(dispatches.filter((result) => result.status === 'fulfilled')).toHaveLength(1);

    const sourceBalance = await prisma.stockBalance.findUniqueOrThrow({
      where: {
        organizationId_warehouseId_locationScopeKey_productId: {
          organizationId: f.organization.id,
          warehouseId: f.source.id,
          locationScopeKey: 'WAREHOUSE',
          productId: f.product.id,
        },
      },
    });
    expect(sourceBalance.onHand.toString()).toBe('2');
    expect(
      await prisma.stockTransaction.count({
        where: {
          organizationId: f.organization.id,
          referenceType: 'StockTransfer',
          referenceId: transfer.id,
          warehouseId: f.source.id,
          qty: { lt: 0 },
        },
      }),
    ).toBe(1);

    const receives = await Promise.allSettled([
      service.receive(f.tenant, { userId: f.user.id, ip: '127.0.0.1' }, transfer.id),
      service.receive(f.tenant, { userId: f.user.id, ip: '127.0.0.1' }, transfer.id),
    ]);
    expect(receives.filter((result) => result.status === 'fulfilled')).toHaveLength(1);

    const destinationBalance = await prisma.stockBalance.findUniqueOrThrow({
      where: {
        organizationId_warehouseId_locationScopeKey_productId: {
          organizationId: f.organization.id,
          warehouseId: f.destination.id,
          locationScopeKey: 'WAREHOUSE',
          productId: f.product.id,
        },
      },
    });
    expect(destinationBalance.onHand.toString()).toBe('8');
    expect(
      await prisma.stockTransaction.count({
        where: {
          organizationId: f.organization.id,
          referenceType: 'StockTransfer',
          referenceId: transfer.id,
          warehouseId: f.destination.id,
          qty: { gt: 0 },
        },
      }),
    ).toBe(1);
  }, 30_000);

  it('allows only one concurrent adjustment post', async () => {
    const f = await fixture();
    await putStock({
      organizationId: f.organization.id,
      warehouseId: f.source.id,
      productId: f.product.id,
      onHand: '10',
    });

    const adjustment = await prisma.stockAdjustment.create({
      data: {
        organizationId: f.organization.id,
        warehouseId: f.source.id,
        reason: 'Concurrency test',
        lines: {
          create: {
            productId: f.product.id,
            qtyDelta: new Prisma.Decimal('5'),
            serialNumbersJson: [],
            batchesJson: [],
          },
        },
      },
    });

    const service = new StockAdjustmentService();
    const results = await Promise.allSettled([
      service.post(f.tenant, { userId: f.user.id, ip: '127.0.0.1' }, adjustment.id),
      service.post(f.tenant, { userId: f.user.id, ip: '127.0.0.1' }, adjustment.id),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);

    const balance = await prisma.stockBalance.findUniqueOrThrow({
      where: {
        organizationId_warehouseId_locationScopeKey_productId: {
          organizationId: f.organization.id,
          warehouseId: f.source.id,
          locationScopeKey: 'WAREHOUSE',
          productId: f.product.id,
        },
      },
    });
    expect(balance.onHand.toString()).toBe('15');
    expect(
      await prisma.stockTransaction.count({
        where: {
          organizationId: f.organization.id,
          referenceType: 'StockAdjustment',
          referenceId: adjustment.id,
        },
      }),
    ).toBe(1);
  }, 30_000);

  it('prevents the same serialized item from being dispatched twice concurrently', async () => {
    const f = await fixture('SERIAL');
    await putStock({
      organizationId: f.organization.id,
      warehouseId: f.source.id,
      productId: f.product.id,
      onHand: '2',
    });
    const serial = await prisma.serialNumber.create({
      data: {
        organizationId: f.organization.id,
        productId: f.product.id,
        serialNo: `SER-${f.suffix}`,
        status: 'AVAILABLE',
        currentWarehouseId: f.source.id,
      },
    });

    async function createTransfer(no: string) {
      const transfer = await prisma.stockTransfer.create({
        data: {
          organizationId: f.organization.id,
          fromWarehouseId: f.source.id,
          toWarehouseId: f.destination.id,
          transferNo: no,
        },
      });
      const item = await prisma.stockTransferItem.create({
        data: {
          transferId: transfer.id,
          productId: f.product.id,
          qty: new Prisma.Decimal('1'),
        },
      });
      await prisma.stockTransferItemSerial.create({
        data: { transferItemId: item.id, serialNumberId: serial.id },
      });
      return transfer;
    }

    const first = await createTransfer(`SER-A-${f.suffix}`);
    const second = await createTransfer(`SER-B-${f.suffix}`);
    const service = new StockTransferService({} as never);
    const results = await Promise.allSettled([
      service.dispatch(f.tenant, { userId: f.user.id, ip: '127.0.0.1' }, first.id),
      service.dispatch(f.tenant, { userId: f.user.id, ip: '127.0.0.1' }, second.id),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);

    const updatedSerial = await prisma.serialNumber.findUniqueOrThrow({
      where: { id: serial.id },
    });
    expect(updatedSerial.status).toBe('IN_TRANSIT');

    const balance = await prisma.stockBalance.findUniqueOrThrow({
      where: {
        organizationId_warehouseId_locationScopeKey_productId: {
          organizationId: f.organization.id,
          warehouseId: f.source.id,
          locationScopeKey: 'WAREHOUSE',
          productId: f.product.id,
        },
      },
    });
    expect(balance.onHand.toString()).toBe('1');
  }, 30_000);
});
