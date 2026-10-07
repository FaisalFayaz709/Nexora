import { prisma, type TransactionClient } from '@nexora/database';

type Db = typeof prisma | TransactionClient;

type ImportValidationRow = {
  rawJson: Record<string, unknown>;
  normalizedJson?: Record<string, unknown> | null;
  status: string;
  errors?: Array<{ fieldName?: string | null; code: string; message: string; severity?: string }>;
};

type CommitTargetResult = { targetType: string; targetId: string };

function nullableUuid(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function decimal(value: unknown, fallback = '0') {
  if (value == null || value === '') return fallback;
  return String(value);
}

export class DataImportRepository {
  constructor(private readonly db: Db = prisma) {}

  withDb(db: TransactionClient) {
    return new DataImportRepository(db);
  }

  createBatch(tx: TransactionClient, data: any) {
    return tx.importBatch.create({ data });
  }

  getBatch(organizationId: string, id: string) {
    return this.db.importBatch.findFirst({
      where: { organizationId, id },
      include: { rows: { orderBy: { rowNumber: 'asc' }, include: { errors: true } } },
    });
  }

  getBatchRows(tx: TransactionClient, organizationId: string, batchId: string) {
    return tx.importRow.findMany({
      where: { organizationId, batchId },
      orderBy: { rowNumber: 'asc' },
      include: { errors: true },
    });
  }

  async lockBatch(tx: TransactionClient, organizationId: string, id: string) {
    const rows = await tx.$queryRaw<Array<any>>`SELECT * FROM "ImportBatch" WHERE "id"=${id}::uuid AND "organizationId"=${organizationId}::uuid FOR UPDATE`;
    return rows[0] ?? null;
  }

  updateBatch(tx: TransactionClient, id: string, data: any) {
    return tx.importBatch.update({ where: { id }, data });
  }

  async replaceValidationRows(tx: TransactionClient, organizationId: string, batchId: string, rows: ImportValidationRow[]) {
    await tx.importRow.deleteMany({ where: { batchId } });
    for (const [index, row] of rows.entries()) {
      await tx.importRow.create({
        data: {
          organizationId,
          batchId,
          rowNumber: index + 1,
          rawJson: row.rawJson as never,
          normalizedJson: (row.normalizedJson ?? null) as never,
          status: row.status,
          errors: row.errors?.length
            ? {
                create: row.errors.map((error) => ({
                  organizationId,
                  fieldName: error.fieldName ?? null,
                  code: error.code,
                  message: error.message,
                  severity: error.severity ?? 'ERROR',
                })),
              }
            : undefined,
        },
      });
    }
  }

  updateRows(tx: TransactionClient, batchId: string, status: string) {
    return tx.importRow.updateMany({ where: { batchId }, data: { status } });
  }

  markRowCommitted(tx: TransactionClient, rowId: string, target: CommitTargetResult) {
    return tx.importRow.update({
      where: { id: rowId },
      data: { status: 'COMMITTED', targetType: target.targetType, targetId: target.targetId },
    });
  }

  markRowSkipped(tx: TransactionClient, rowId: string) {
    return tx.importRow.update({ where: { id: rowId }, data: { status: 'SKIPPED' } });
  }

  async findDuplicate(tx: TransactionClient, organizationId: string, subjectType: string, normalized: Record<string, unknown>) {
    if (subjectType === 'EMPLOYEE') return tx.employee.findFirst({ where: { organizationId, employeeNo: text(normalized.employeeNo) }, select: { id: true } });
    if (subjectType === 'CUSTOMER') return tx.customer.findFirst({ where: { organizationId, code: text(normalized.code) }, select: { id: true } });
    if (subjectType === 'CUSTOMER_SITE') return tx.customerSite.findFirst({ where: { organizationId, code: text(normalized.code) }, select: { id: true } });
    if (subjectType === 'VENDOR') return tx.vendor.findFirst({ where: { organizationId, code: text(normalized.code) }, select: { id: true } });
    if (subjectType === 'PRODUCT_CATEGORY') return tx.productCategory.findFirst({ where: { organizationId, name: text(normalized.name) }, select: { id: true } });
    if (subjectType === 'UNIT_OF_MEASURE') return tx.unitOfMeasure.findFirst({ where: { organizationId, code: text(normalized.code) }, select: { id: true } });
    if (subjectType === 'PRODUCT') return tx.product.findFirst({ where: { organizationId, sku: text(normalized.sku) }, select: { id: true } });
    if (subjectType === 'WAREHOUSE') return tx.warehouse.findFirst({ where: { organizationId, code: text(normalized.code) }, select: { id: true } });
    if (subjectType === 'INVENTORY') {
      const locationId = nullableUuid(normalized.locationId);
      return tx.stockBalance.findFirst({
        where: {
          organizationId,
          warehouseId: text(normalized.warehouseId),
          locationScopeKey: locationId ?? '__WAREHOUSE__',
          productId: text(normalized.productId),
        },
        select: { id: true },
      });
    }
    return null;
  }

  async commitTarget(tx: TransactionClient, organizationId: string, branchId: string | null, batchId: string, subjectType: string, normalized: Record<string, unknown>, duplicatePolicy: string): Promise<CommitTargetResult | null> {
    const duplicate = await this.findDuplicate(tx, organizationId, subjectType, normalized);
    const shouldUpdate = duplicatePolicy === 'UPDATE' && duplicate?.id;

    if (duplicate && duplicatePolicy === 'SKIP') return null;

    if (subjectType === 'EMPLOYEE') {
      const data: any = {
        organizationId,
        branchId: text(normalized.branchId) || branchId,
        departmentId: text(normalized.departmentId),
        userId: nullableUuid(normalized.userId),
        managerId: nullableUuid(normalized.managerId),
        employeeNo: text(normalized.employeeNo),
        name: text(normalized.name),
        jobTitle: text(normalized.jobTitle) || null,
        joiningDate: text(normalized.joiningDate) ? new Date(text(normalized.joiningDate)) : null,
        employmentType: text(normalized.employmentType) || null,
        status: text(normalized.status) || 'ACTIVE',
      };
      const record = shouldUpdate
        ? await tx.employee.update({ where: { id: duplicate!.id }, data })
        : await tx.employee.create({ data });
      return { targetType: 'Employee', targetId: record.id };
    }

    if (subjectType === 'CUSTOMER') {
      const data: any = { organizationId, code: text(normalized.code), name: text(normalized.name), taxNo: text(normalized.taxNo) || null, creditLimit: normalized.creditLimit == null ? null : decimal(normalized.creditLimit), status: text(normalized.status) || 'ACTIVE' };
      const record = shouldUpdate ? await tx.customer.update({ where: { id: duplicate!.id }, data }) : await tx.customer.create({ data });
      return { targetType: 'Customer', targetId: record.id };
    }

    if (subjectType === 'CUSTOMER_SITE') {
      const data: any = { organizationId, customerId: text(normalized.customerId), code: text(normalized.code), name: text(normalized.name), addressId: nullableUuid(normalized.addressId) };
      const record = shouldUpdate ? await tx.customerSite.update({ where: { id: duplicate!.id }, data }) : await tx.customerSite.create({ data });
      return { targetType: 'CustomerSite', targetId: record.id };
    }

    if (subjectType === 'VENDOR') {
      const data: any = { organizationId, code: text(normalized.code), name: text(normalized.name), taxNo: text(normalized.taxNo) || null, paymentTerms: text(normalized.paymentTerms) || null, status: text(normalized.status) || 'PENDING_ONBOARDING' };
      const record = shouldUpdate ? await tx.vendor.update({ where: { id: duplicate!.id }, data }) : await tx.vendor.create({ data });
      return { targetType: 'Vendor', targetId: record.id };
    }

    if (subjectType === 'PRODUCT_CATEGORY') {
      const data: any = { organizationId, name: text(normalized.name), parentId: nullableUuid(normalized.parentId) };
      const record = shouldUpdate ? await tx.productCategory.update({ where: { id: duplicate!.id }, data }) : await tx.productCategory.create({ data });
      return { targetType: 'ProductCategory', targetId: record.id };
    }

    if (subjectType === 'UNIT_OF_MEASURE') {
      const data: any = { organizationId, code: text(normalized.code), name: text(normalized.name), precision: Number(normalized.precision ?? 0) };
      const record = shouldUpdate ? await tx.unitOfMeasure.update({ where: { id: duplicate!.id }, data }) : await tx.unitOfMeasure.create({ data });
      return { targetType: 'UnitOfMeasure', targetId: record.id };
    }

    if (subjectType === 'PRODUCT') {
      const data: any = {
        organizationId,
        categoryId: text(normalized.categoryId),
        unitId: text(normalized.unitId),
        sku: text(normalized.sku),
        name: text(normalized.name),
        trackingType: text(normalized.trackingType) || 'NONE',
        brand: text(normalized.brand) || null,
        model: text(normalized.model) || null,
        barcode: text(normalized.barcode) || null,
        standardCost: normalized.standardCost == null ? null : decimal(normalized.standardCost),
        salesPrice: normalized.salesPrice == null ? null : decimal(normalized.salesPrice),
        minStock: normalized.minStock == null ? null : decimal(normalized.minStock),
        maxStock: normalized.maxStock == null ? null : decimal(normalized.maxStock),
      };
      const record = shouldUpdate ? await tx.product.update({ where: { id: duplicate!.id }, data }) : await tx.product.create({ data });
      return { targetType: 'Product', targetId: record.id };
    }

    if (subjectType === 'WAREHOUSE') {
      const data: any = { organizationId, branchId: text(normalized.branchId) || branchId, code: text(normalized.code), name: text(normalized.name), status: text(normalized.status) || 'ACTIVE' };
      const record = shouldUpdate ? await tx.warehouse.update({ where: { id: duplicate!.id }, data }) : await tx.warehouse.create({ data });
      return { targetType: 'Warehouse', targetId: record.id };
    }

    if (subjectType === 'INVENTORY') {
      const locationId = nullableUuid(normalized.locationId);
      const locationScopeKey = locationId ?? '__WAREHOUSE__';
      const onHand = decimal(normalized.onHand ?? normalized.quantity);
      const reserved = decimal(normalized.reserved, '0');
      const duplicateBalance = await this.findDuplicate(tx, organizationId, subjectType, { ...normalized, locationId }) as { id: string } | null;
      const balance = duplicateBalance
        ? await tx.stockBalance.update({ where: { id: duplicateBalance.id }, data: { onHand, reserved } })
        : await tx.stockBalance.create({ data: { organizationId, warehouseId: text(normalized.warehouseId), locationId, locationScopeKey, productId: text(normalized.productId), onHand, reserved } });
      await tx.stockTransaction.create({
        data: {
          organizationId,
          warehouseId: text(normalized.warehouseId),
          locationId,
          productId: text(normalized.productId),
          type: 'OPENING_BALANCE',
          qty: onHand,
          referenceType: 'ImportBatch',
          referenceId: batchId,
        },
      });
      return { targetType: 'StockBalance', targetId: balance.id };
    }

    return null;
  }
}
