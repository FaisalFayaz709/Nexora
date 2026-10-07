import { createHash, randomBytes } from 'node:crypto';
import { Prisma, withTransaction, type TransactionClient } from '@nexora/database';
import { AuditWriter } from '../../core/audit/audit-writer.js';
import { BusinessEventWriter } from '../../core/events/business-event-writer.js';
import { AppError } from '../../core/http/errors.js';
import {
  assertAssetInstallable,
  assertAssetInstallationPlacement,
  assertAssetQrResolvable,
  assertAssetQrRotatable,
  assertAssetRegistrationFromStock,
  assertAssetReplacementLink,
  assertAssetRetirable,
  assertAssetRmaAllowed,
  assertWarrantyWindow,
  deriveWarrantyStatus,
  type AssetLifecycleStatus,
  type AssetTrackingType,
} from './asset-lifecycle-policy.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import type { ApprovalFacade, ApprovalSubjectDecision } from '../approvals/index.js';
import type { CustomerFacade } from '../customers/index.js';
import type { EmployeeFacade } from '../hr/index.js';
import type { InventoryFacade } from '../inventory/index.js';
import type { NumberSequenceFacade } from '../platform/number-sequence/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import type { ProjectFacade } from '../projects/index.js';
import type { VendorGovernanceFacade } from '../vendors/index.js';
import { AssetRepository } from './asset.repository.js';

const DEFAULT_QR_TTL_DAYS = 365;
const WARRANTY_EXPIRING_DAYS = 30;

const ASSET_TERMINAL = new Set(['REPLACED', 'RETIRED']);

function page(query: { page?: number; pageSize?: number }) {
  const current = query.page ?? 1;
  const pageSize = Math.min(query.pageSize ?? 25, 100);
  return { page: current, pageSize, skip: (current - 1) * pageSize, take: pageSize };
}

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function decimalOrNull(value: string | null | undefined) {
  return value === null || value === undefined ? null : new Prisma.Decimal(value);
}

function hashToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function newQrToken() {
  return randomBytes(32).toString('base64url');
}

function qrExpiry(ttlDays: number) {
  return new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
}

function warrantyStatus(startsAt: Date, expiresAt: Date, now = new Date()) {
  assertWarrantyWindow(startsAt, expiresAt);
  return deriveWarrantyStatus(startsAt, expiresAt, now, WARRANTY_EXPIRING_DAYS);
}

export class AssetService {
  constructor(
    private readonly numbers: NumberSequenceFacade,
    private readonly inventory: InventoryFacade,
    private readonly customers: CustomerFacade,
    private readonly projects: ProjectFacade,
    private readonly employees: EmployeeFacade,
    private readonly vendors: VendorGovernanceFacade,
    private readonly approvals: ApprovalFacade,
    private readonly access: PlatformAccessFacade,
    private readonly repository = new AssetRepository(),
    private readonly audit = new AuditWriter(),
    private readonly events = new BusinessEventWriter(),
  ) {}

  private async enabled(organizationId: string) {
    await this.access.assertModuleEnabled(organizationId, 'assets');
  }

  private async validatePlacement(
    organizationId: string,
    input: {
      customerId: string;
      siteId: string;
      areaId?: string | null;
      projectId: string;
    },
  ) {
    await this.customers.customerForProject(organizationId, input.customerId);
    await this.customers.siteForProject(
      organizationId,
      input.customerId,
      input.siteId,
    );
    if (input.areaId) {
      await this.customers.areaForAsset(
        organizationId,
        input.siteId,
        input.areaId,
      );
    }
    const project = await this.projects.assertProject(organizationId, input.projectId);
    if (
      project.customerId !== input.customerId ||
      project.siteId !== input.siteId
    ) {
      throw new AppError(
        400,
        'ASSET_PROJECT_PLACEMENT_INVALID',
        'Asset customer/site must match the selected project.',
      );
    }
    return project;
  }

  private async validateCommercialReferences(
    organizationId: string,
    supplierVendorId?: string | null,
    warranty?: any,
  ) {
    if (supplierVendorId) {
      await this.vendors.assertApproved(organizationId, supplierVendorId);
    }
    if (warranty?.vendorId) {
      await this.vendors.assertApproved(organizationId, warranty.vendorId);
    }
  }

  private async addWarranty(
    tx: TransactionClient,
    input: {
      organizationId: string;
      assetId: string;
      actorUserId: string;
      warranty: {
        vendorId: string;
        startsAt: string;
        expiresAt: string;
        terms?: string;
        documentId?: string | null;
      };
    },
  ) {
    const startsAt = dateOnly(input.warranty.startsAt);
    const expiresAt = dateOnly(input.warranty.expiresAt);
    assertWarrantyWindow(startsAt, expiresAt);

    const status = warrantyStatus(startsAt, expiresAt);
    const row = await this.repository.createWarranty(tx, {
      organizationId: input.organizationId,
      assetId: input.assetId,
      vendorId: input.warranty.vendorId,
      startsAt,
      expiresAt,
      terms: input.warranty.terms ?? null,
      documentId: input.warranty.documentId ?? null,
      status,
    });

    await this.repository.createHistory(tx, {
      organizationId: input.organizationId,
      assetId: input.assetId,
      eventType: 'WARRANTY_REGISTERED',
      referenceType: 'AssetWarranty',
      referenceId: row.id,
      detailsJson: {
        vendorId: row.vendorId,
        startsAt: row.startsAt,
        expiresAt: row.expiresAt,
        status,
        documentId: row.documentId,
      },
    });

    if (status === 'EXPIRING') {
      await this.events.append(tx, {
        organizationId: input.organizationId,
        type: 'asset.warranty.expiring',
        aggregateType: 'Asset',
        aggregateId: input.assetId,
        payload: {
          warrantyId: row.id,
          expiresAt: row.expiresAt.toISOString(),
        },
      });
    }

    return row;
  }

  private mapAsset(row: any) {
    return {
      ...row,
      purchaseCost: row.purchaseCost?.toString() ?? null,
      warranties: (row.warranties ?? []).map((warranty: any) => ({
        ...warranty,
        status: warranty.status === 'VOID'
          ? 'VOID'
          : warrantyStatus(warranty.startsAt, warranty.expiresAt),
      })),
      qrTag: row.qrTag
        ? {
            generatedAt: row.qrTag.generatedAt,
            expiresAt: row.qrTag.expiresAt,
            revokedAt: row.qrTag.revokedAt,
          }
        : null,
    };
  }

  async assetForFieldService(organizationId: string, assetId: string) {
    const row = await this.repository.get(organizationId, assetId);
    if (!row) throw new AppError(404,'ASSET_NOT_FOUND','Asset not found.');
    return row;
  }

  async recordFieldServiceCompletion(tx: TransactionClient, input: {
    organizationId:string; assetId:string; workOrderId:string; serviceReportId:string; technicianId:string;
    resolution:string; parts:Array<{productId:string;qty:string;stockTransactionId:string|null}>;
  }) {
    const asset=await this.repository.get(input.organizationId,input.assetId);
    if (!asset) throw new AppError(404,'ASSET_NOT_FOUND','Asset not found.');
    await this.repository.createHistory(tx,{organizationId:input.organizationId,assetId:input.assetId,eventType:'FIELD_SERVICE_COMPLETED',oldStatus:asset.status,newStatus:asset.status,referenceType:'WorkOrder',referenceId:input.workOrderId,detailsJson:{serviceReportId:input.serviceReportId,technicianId:input.technicianId,resolution:input.resolution,parts:input.parts}});
  }


  async markUnderMaintenance(
    tx: TransactionClient,
    input: {
      organizationId: string;
      assetId: string;
      workOrderId: string;
      scheduleId: string;
    },
  ) {
    const asset = await this.repository.lockAsset(tx, input.organizationId, input.assetId);
    if (!asset) throw new AppError(404, 'ASSET_NOT_FOUND', 'Asset not found.');
    if (asset.status === 'RETIRED' || asset.status === 'REPLACED') {
      throw new AppError(
        409,
        'ASSET_MAINTENANCE_TERMINAL_STATE',
        'Retired or replaced assets cannot enter maintenance.',
        { currentStatus: asset.status },
      );
    }
    if (asset.status !== 'UNDER_MAINTENANCE') {
      await this.repository.update(tx, asset.id, { status: 'UNDER_MAINTENANCE' });
    }
    await this.repository.createHistory(tx, {
      organizationId: input.organizationId,
      assetId: asset.id,
      eventType: 'MAINTENANCE_STARTED',
      oldStatus: asset.status,
      newStatus: 'UNDER_MAINTENANCE',
      referenceType: 'WorkOrder',
      referenceId: input.workOrderId,
      detailsJson: { scheduleId: input.scheduleId },
    });
  }

  async recordMaintenanceCompletion(
    tx: TransactionClient,
    input: {
      organizationId: string;
      assetId: string;
      maintenanceExecutionId: string;
      workOrderId: string;
      result: string;
      notes: string | null;
      parts: Array<{ productId: string; qty: string; stockTransactionId: string | null }>;
    },
  ) {
    const asset = await this.repository.lockAsset(tx, input.organizationId, input.assetId);
    if (!asset) throw new AppError(404, 'ASSET_NOT_FOUND', 'Asset not found.');
    if (asset.status === 'RETIRED' || asset.status === 'REPLACED') {
      throw new AppError(
        409,
        'ASSET_MAINTENANCE_TERMINAL_STATE',
        'Retired or replaced assets cannot be completed through maintenance.',
        { currentStatus: asset.status },
      );
    }

    const nextStatus = input.result === 'FAILED'
      ? 'UNDER_MAINTENANCE'
      : input.result === 'REPAIRED'
        ? 'REPAIRED'
        : 'ACTIVE';

    if (asset.status !== nextStatus) {
      await this.repository.update(tx, asset.id, { status: nextStatus });
    }
    await this.repository.createHistory(tx, {
      organizationId: input.organizationId,
      assetId: asset.id,
      eventType: 'MAINTENANCE_COMPLETED',
      oldStatus: asset.status,
      newStatus: nextStatus,
      referenceType: 'MaintenanceExecution',
      referenceId: input.maintenanceExecutionId,
      detailsJson: {
        workOrderId: input.workOrderId,
        result: input.result,
        notes: input.notes,
        parts: input.parts,
      },
    });
  }

  async list(tenant: TenantRequestContext, query: any) {
    await this.enabled(tenant.organizationId);
    const p = page(query);
    const { rows, total } = await this.repository.list({
      organizationId: tenant.organizationId,
      status: query.status,
      customerId: query.customerId,
      siteId: query.siteId,
      projectId: query.projectId,
      productId: query.productId,
      skip: p.skip,
      take: p.take,
    });
    return {
      rows: rows.map((row) => this.mapAsset(row)),
      total,
      page: p.page,
      pageSize: p.pageSize,
    };
  }

  async listBySite(
    tenant: TenantRequestContext,
    siteId: string,
    query: any,
  ) {
    await this.enabled(tenant.organizationId);
    await this.customers.siteById(tenant.organizationId, siteId);

    const p = page(query);
    const { rows, total } = await this.repository.listBySite({
      organizationId: tenant.organizationId,
      siteId,
      status: query.status,
      projectId: query.projectId,
      skip: p.skip,
      take: p.take,
    });
    return { rows, total, page: p.page, pageSize: p.pageSize };
  }

  async get(tenant: TenantRequestContext, id: string) {
    await this.enabled(tenant.organizationId);
    const row = await this.repository.get(tenant.organizationId, id);
    if (!row) throw new AppError(404, 'ASSET_NOT_FOUND', 'Asset not found.');
    return this.mapAsset(row);
  }

  async create(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    input: any,
  ) {
    await this.enabled(tenant.organizationId);
    await this.validatePlacement(tenant.organizationId, input);
    const product = await this.inventory.getProductForProcurement(
      tenant.organizationId,
      input.productId,
    );
    assertAssetRegistrationFromStock({
      trackingType: product.trackingType as AssetTrackingType,
      serialNo: null,
    });
    await this.validateCommercialReferences(
      tenant.organizationId,
      input.supplierVendorId,
      input.warranty,
    );

    return this.numbers.withBusinessNumber({
      organizationId: tenant.organizationId,
      branchId: null,
      entityType: 'ASSET',
      fiscalYear: new Date().getUTCFullYear(),
      targetType: 'Asset',
      createTarget: async (tx, assetNo) => {
        const row = await this.repository.create(tx, {
          organizationId: tenant.organizationId,
          assetNo,
          productId: input.productId,
          serialNumberId: null,
          customerId: input.customerId,
          siteId: input.siteId,
          areaId: input.areaId ?? null,
          projectId: input.projectId,
          status: 'PROCURED',
          purchaseCost: decimalOrNull(input.purchaseCost),
          supplierVendorId: input.supplierVendorId ?? null,
        });

        await this.repository.createHistory(tx, {
          organizationId: tenant.organizationId,
          assetId: row.id,
          eventType: 'ASSET_REGISTERED',
          oldStatus: null,
          newStatus: 'PROCURED',
          detailsJson: {
            productId: row.productId,
            purchaseCost: row.purchaseCost?.toString() ?? null,
            supplierVendorId: row.supplierVendorId,
          },
        });

        if (input.warranty) {
          await this.addWarranty(tx, {
            organizationId: tenant.organizationId,
            assetId: row.id,
            actorUserId: actor.userId,
            warranty: input.warranty,
          });
        }

        await this.audit.append(tx, {
          organizationId: tenant.organizationId,
          actorUserId: actor.userId,
          action: 'ASSET_CREATED',
          subjectType: 'Asset',
          subjectId: row.id,
          afterJson: {
            assetNo: row.assetNo,
            productId: row.productId,
            customerId: row.customerId,
            siteId: row.siteId,
            projectId: row.projectId,
            status: row.status,
          },
          ip: actor.ip,
        });
        return row;
      },
    });
  }

  async registerFromStock(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    input: any,
  ) {
    await this.enabled(tenant.organizationId);
    assertAssetRegistrationFromStock({
      trackingType: 'SERIAL',
      serialNo: input.serialNo,
    });
    await this.validatePlacement(tenant.organizationId, input);
    await this.validateCommercialReferences(
      tenant.organizationId,
      input.supplierVendorId,
      input.warranty,
    );

    return this.numbers.withBusinessNumber({
      organizationId: tenant.organizationId,
      branchId: null,
      entityType: 'ASSET',
      fiscalYear: new Date().getUTCFullYear(),
      targetType: 'Asset',
      createTarget: async (tx, assetNo) => {
        const locked = await this.inventory.registerSerializedAsset(tx, {
          organizationId: tenant.organizationId,
          serialNo: input.serialNo,
        });

        const row = await this.repository.create(tx, {
          organizationId: tenant.organizationId,
          assetNo,
          productId: locked.productId,
          serialNumberId: locked.id,
          customerId: input.customerId,
          siteId: input.siteId,
          areaId: input.areaId ?? null,
          projectId: input.projectId,
          status: 'IN_WAREHOUSE',
          purchaseCost: decimalOrNull(input.purchaseCost),
          supplierVendorId: input.supplierVendorId ?? null,
        });

        await this.inventory.linkSerializedAsset(tx, {
          serialNumberId: locked.id,
          assetId: row.id,
        });

        await this.repository.createHistory(tx, {
          organizationId: tenant.organizationId,
          assetId: row.id,
          eventType: 'ASSET_REGISTERED_FROM_STOCK',
          oldStatus: null,
          newStatus: 'IN_WAREHOUSE',
          referenceType: 'SerialNumber',
          referenceId: locked.id,
          detailsJson: {
            serialNo: locked.serialNo,
            warehouseId: locked.currentWarehouseId,
          },
        });

        if (input.warranty) {
          await this.addWarranty(tx, {
            organizationId: tenant.organizationId,
            assetId: row.id,
            actorUserId: actor.userId,
            warranty: input.warranty,
          });
        }

        await this.audit.append(tx, {
          organizationId: tenant.organizationId,
          actorUserId: actor.userId,
          action: 'ASSET_REGISTERED_FROM_STOCK',
          subjectType: 'Asset',
          subjectId: row.id,
          afterJson: {
            assetNo: row.assetNo,
            serialNo: locked.serialNo,
            serialNumberId: locked.id,
            status: row.status,
          },
          ip: actor.ip,
        });

        return row;
      },
    });
  }

  async update(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    id: string,
    input: any,
  ) {
    await this.enabled(tenant.organizationId);
    const before = await this.repository.get(tenant.organizationId, id);
    if (!before) throw new AppError(404, 'ASSET_NOT_FOUND', 'Asset not found.');
    if (ASSET_TERMINAL.has(before.status)) {
      throw new AppError(409, 'ASSET_TERMINAL_STATE', 'Replaced or retired assets cannot be edited.');
    }

    const placementChange =
      input.customerId !== undefined ||
      input.siteId !== undefined ||
      input.areaId !== undefined ||
      input.projectId !== undefined;

    if (placementChange && ['INSTALLED','ACTIVE','UNDER_MAINTENANCE','REPAIRED'].includes(before.status)) {
      throw new AppError(
        409,
        'ASSET_PLACEMENT_COMMAND_REQUIRED',
        'Installed asset placement cannot be freely patched.',
      );
    }

    const customerId = input.customerId ?? before.customerId;
    const siteId = input.siteId ?? before.siteId;
    const projectId = input.projectId ?? before.projectId;
    const areaId = input.areaId === undefined ? before.areaId : input.areaId;

    if (placementChange) {
      await this.validatePlacement(tenant.organizationId, {
        customerId,
        siteId,
        projectId,
        areaId,
      });
    }

    await this.validateCommercialReferences(
      tenant.organizationId,
      input.supplierVendorId,
      input.warranty,
    );

    return withTransaction(async (tx) => {
      const row = await this.repository.update(tx, id, {
        ...(input.customerId !== undefined ? { customerId } : {}),
        ...(input.siteId !== undefined ? { siteId } : {}),
        ...(input.projectId !== undefined ? { projectId } : {}),
        ...(input.areaId !== undefined ? { areaId } : {}),
        ...(input.purchaseCost !== undefined ? { purchaseCost: decimalOrNull(input.purchaseCost) } : {}),
        ...(input.supplierVendorId !== undefined ? { supplierVendorId: input.supplierVendorId } : {}),
      });

      const costOrSupplierChanged =
        input.purchaseCost !== undefined ||
        input.supplierVendorId !== undefined;

      if (costOrSupplierChanged) {
        await this.repository.createHistory(tx, {
          organizationId: tenant.organizationId,
          assetId: id,
          eventType: 'ASSET_COST_UPDATED',
          oldStatus: before.status,
          newStatus: before.status,
          detailsJson: {
            before: {
              purchaseCost: before.purchaseCost?.toString() ?? null,
              supplierVendorId: before.supplierVendorId,
            },
            after: {
              purchaseCost: row.purchaseCost?.toString() ?? null,
              supplierVendorId: row.supplierVendorId,
            },
          },
        });
      }

      if (input.warranty) {
        await this.addWarranty(tx, {
          organizationId: tenant.organizationId,
          assetId: id,
          actorUserId: actor.userId,
          warranty: input.warranty,
        });
      }

      await this.audit.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'ASSET_UPDATED',
        subjectType: 'Asset',
        subjectId: id,
        beforeJson: {
          customerId: before.customerId,
          siteId: before.siteId,
          areaId: before.areaId,
          projectId: before.projectId,
          purchaseCost: before.purchaseCost?.toString() ?? null,
          supplierVendorId: before.supplierVendorId,
        },
        afterJson: {
          customerId: row.customerId,
          siteId: row.siteId,
          areaId: row.areaId,
          projectId: row.projectId,
          purchaseCost: row.purchaseCost?.toString() ?? null,
          supplierVendorId: row.supplierVendorId,
        },
        ip: actor.ip,
      });
      return this.mapAsset({ ...row, warranties: [], qrTag: null });
    });
  }

  async install(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    id: string,
    input: any,
  ) {
    await this.enabled(tenant.organizationId);
    const technician = await this.employees.employeeForProject(
      tenant.organizationId,
      input.technicianId,
    );
    const project = await this.projects.assertProject(
      tenant.organizationId,
      input.projectId,
    );
    await this.customers.siteForProject(
      tenant.organizationId,
      project.customerId,
      input.siteId,
    );
    await this.customers.areaForAsset(
      tenant.organizationId,
      input.siteId,
      input.areaId,
    );

    return withTransaction(async (tx) => {
      const asset = await this.repository.lockAsset(tx, tenant.organizationId, id);
      if (!asset) throw new AppError(404, 'ASSET_NOT_FOUND', 'Asset not found.');
      const productTrackingType = asset.serialNumberId
        ? 'SERIAL'
        : (await this.inventory.getProductForProcurement(
            tenant.organizationId,
            asset.productId,
          )).trackingType;
      assertAssetInstallable({
        status: asset.status as AssetLifecycleStatus,
        productTrackingType: productTrackingType as AssetTrackingType,
        serialNumberId: asset.serialNumberId,
      });
      assertAssetInstallationPlacement({
        assetProjectId: asset.projectId,
        assetCustomerId: asset.customerId,
        assetSiteId: asset.siteId,
        projectId: project.id,
        projectCustomerId: project.customerId,
        siteId: input.siteId,
      });

      const installation = await this.repository.createInstallation(tx, {
        organizationId: tenant.organizationId,
        assetId: id,
        projectId: input.projectId,
        technicianId: technician.id,
        installedAt: new Date(input.installedAt),
        locationText: input.locationText,
        checklistId: input.checklistId ?? null,
      });

      let stockTransactionId: string | null = null;
      if (asset.serialNumberId) {
        const stock = await this.inventory.installSerializedAsset(tx, {
          organizationId: tenant.organizationId,
          serialNumberId: asset.serialNumberId,
          assetId: id,
          referenceId: installation.id,
        });
        stockTransactionId = stock.ledgerId;
      }

      await this.repository.update(tx, id, {
        status: 'ACTIVE',
        installedAt: new Date(input.installedAt),
        areaId: input.areaId,
      });

      await this.repository.createHistory(tx, {
        organizationId: tenant.organizationId,
        assetId: id,
        eventType: 'INSTALLED',
        oldStatus: asset.status,
        newStatus: 'INSTALLED',
        referenceType: 'AssetInstallation',
        referenceId: installation.id,
        occurredAt: new Date(input.installedAt),
        detailsJson: {
          technicianId: technician.id,
          locationText: input.locationText,
          stockTransactionId,
        },
      });
      await this.repository.createHistory(tx, {
        organizationId: tenant.organizationId,
        assetId: id,
        eventType: 'ACTIVATED',
        oldStatus: 'INSTALLED',
        newStatus: 'ACTIVE',
        referenceType: 'AssetInstallation',
        referenceId: installation.id,
        occurredAt: new Date(input.installedAt),
      });

      const rawToken = newQrToken();
      await this.repository.upsertQr(tx, {
        organizationId: tenant.organizationId,
        assetId: id,
        token: hashToken(rawToken),
        generatedAt: new Date(),
        expiresAt: qrExpiry(DEFAULT_QR_TTL_DAYS),
      });

      await this.audit.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'ASSET_INSTALLED',
        subjectType: 'Asset',
        subjectId: id,
        beforeJson: { status: asset.status },
        afterJson: {
          status: 'ACTIVE',
          installationId: installation.id,
          technicianId: technician.id,
          stockTransactionId,
        },
        ip: actor.ip,
      });

      await this.events.append(tx, {
        organizationId: tenant.organizationId,
        type: 'asset.installed',
        aggregateType: 'Asset',
        aggregateId: id,
        payload: {
          assetNo: asset.assetNo,
          projectId: asset.projectId,
          siteId: asset.siteId,
          installationId: installation.id,
        },
      });

      return {
        id,
        assetNo: asset.assetNo,
        status: 'ACTIVE',
        qr: { token: rawToken },
      };
    });
  }

  async replace(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    id: string,
    input: any,
  ) {
    await this.enabled(tenant.organizationId);

    return withTransaction(async (tx) => {
      const oldAsset = await this.repository.lockAsset(tx, tenant.organizationId, id);
      const replacement = await this.repository.lockAsset(
        tx,
        tenant.organizationId,
        input.replacementAssetId,
      );

      if (!oldAsset || !replacement) {
        throw new AppError(404, 'ASSET_NOT_FOUND', 'Old or replacement asset not found.');
      }
      assertAssetReplacementLink({
        oldStatus: oldAsset.status as AssetLifecycleStatus,
        replacementStatus: replacement.status as AssetLifecycleStatus,
        oldAssetId: oldAsset.id,
        replacementAssetId: replacement.id,
        oldCustomerId: oldAsset.customerId,
        replacementCustomerId: replacement.customerId,
        oldSiteId: oldAsset.siteId,
        replacementSiteId: replacement.siteId,
        oldProjectId: oldAsset.projectId,
        replacementProjectId: replacement.projectId,
        oldReplacedByAssetId: oldAsset.replacedByAssetId,
      });

      await this.repository.update(tx, id, {
        status: 'REPLACED',
        replacedByAssetId: replacement.id,
      });
      await this.repository.revokeQr(tx, oldAsset.id);

      await this.repository.createHistory(tx, {
        organizationId: tenant.organizationId,
        assetId: id,
        eventType: 'REPLACED',
        oldStatus: oldAsset.status,
        newStatus: 'REPLACED',
        referenceType: 'Asset',
        referenceId: replacement.id,
        detailsJson: { reason: input.reason ?? null, qrRevoked: true },
      });
      await this.repository.createHistory(tx, {
        organizationId: tenant.organizationId,
        assetId: replacement.id,
        eventType: 'REPLACEMENT_LINKED',
        oldStatus: replacement.status,
        newStatus: replacement.status,
        referenceType: 'Asset',
        referenceId: oldAsset.id,
        detailsJson: { replacedAssetNo: oldAsset.assetNo, reason: input.reason ?? null },
      });

      await this.audit.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'ASSET_REPLACED',
        subjectType: 'Asset',
        subjectId: id,
        beforeJson: { status: oldAsset.status, replacedByAssetId: null },
        afterJson: {
          status: 'REPLACED',
          replacedByAssetId: replacement.id,
          reason: input.reason ?? null,
          oldAssetQrRevoked: true,
        },
        ip: actor.ip,
      });

      await this.events.append(tx, {
        organizationId: tenant.organizationId,
        type: 'asset.replaced',
        aggregateType: 'Asset',
        aggregateId: id,
        payload: {
          assetNo: oldAsset.assetNo,
          replacementAssetId: replacement.id,
          replacementAssetNo: replacement.assetNo,
          qrRevoked: true,
        },
      });

      return {
        id,
        assetNo: oldAsset.assetNo,
        status: 'REPLACED',
        replacementAssetId: replacement.id,
        replacementAssetNo: replacement.assetNo,
      };
    });
  }

  private async retireNow(
    tx: TransactionClient,
    input: {
      organizationId: string;
      assetId: string;
      actorUserId: string;
      reason: string;
      approvalRequestId?: string | null;
    },
  ) {
    const asset = await this.repository.lockAsset(
      tx,
      input.organizationId,
      input.assetId,
    );
    if (!asset) throw new AppError(404, 'ASSET_NOT_FOUND', 'Asset not found.');
    assertAssetRetirable(asset.status as AssetLifecycleStatus);

    const row = await this.repository.update(tx, asset.id, { status: 'RETIRED' });
    await this.repository.revokeQr(tx, asset.id);
    await this.repository.createHistory(tx, {
      organizationId: input.organizationId,
      assetId: asset.id,
      eventType: 'RETIRED',
      oldStatus: asset.status,
      newStatus: 'RETIRED',
      referenceType: input.approvalRequestId ? 'ApprovalRequest' : null,
      referenceId: input.approvalRequestId ?? null,
      detailsJson: { reason: input.reason },
    });
    await this.audit.append(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'ASSET_RETIRED',
      subjectType: 'Asset',
      subjectId: asset.id,
      beforeJson: { status: asset.status },
      afterJson: {
        status: 'RETIRED',
        reason: input.reason,
        approvalRequestId: input.approvalRequestId ?? null,
      },
      ip: null,
    });
    return row;
  }

  async retire(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    id: string,
    input: any,
  ) {
    await this.enabled(tenant.organizationId);

    return withTransaction(async (tx) => {
      const asset = await this.repository.lockAsset(tx, tenant.organizationId, id);
      if (!asset) throw new AppError(404, 'ASSET_NOT_FOUND', 'Asset not found.');
      assertAssetRetirable(asset.status as AssetLifecycleStatus);

      const approval = await this.approvals.requestApprovalIfConfigured(tx, {
        organizationId: tenant.organizationId,
        branchId: null,
        subjectType: 'AssetRetirement',
        subjectId: id,
        requestedById: actor.userId,
        context: {
          assetNo: asset.assetNo,
          status: asset.status,
          purchaseCost: asset.purchaseCost?.toString() ?? null,
          reason: input.reason,
        },
      });

      if (approval) {
        await this.repository.createHistory(tx, {
          organizationId: tenant.organizationId,
          assetId: id,
          eventType: 'RETIREMENT_REQUESTED',
          oldStatus: asset.status,
          newStatus: asset.status,
          referenceType: 'ApprovalRequest',
          referenceId: approval.id,
          detailsJson: { reason: input.reason },
        });
        await this.audit.append(tx, {
          organizationId: tenant.organizationId,
          actorUserId: actor.userId,
          action: 'ASSET_RETIREMENT_REQUESTED',
          subjectType: 'Asset',
          subjectId: id,
          afterJson: {
            status: asset.status,
            approvalRequestId: approval.id,
            reason: input.reason,
          },
          ip: actor.ip,
        });
        return {
          id,
          assetNo: asset.assetNo,
          status: asset.status,
          approvalRequestId: approval.id,
          approvalStatus: approval.status,
        };
      }

      return this.retireNow(tx, {
        organizationId: tenant.organizationId,
        assetId: id,
        actorUserId: actor.userId,
        reason: input.reason,
      });
    });
  }

  async applyApprovalDecision(
    tx: TransactionClient,
    input: ApprovalSubjectDecision,
  ) {
    if (input.subjectType !== 'AssetRetirement') {
      throw new AppError(
        409,
        'ASSET_APPROVAL_SUBJECT_UNSUPPORTED',
        'Unsupported Asset approval subject.',
        { subjectType: input.subjectType },
      );
    }

    if (input.decision === 'APPROVED') {
      await this.retireNow(tx, {
        organizationId: input.organizationId,
        assetId: input.subjectId,
        actorUserId: input.actorUserId,
        reason: input.comment ?? 'Approved asset retirement.',
        approvalRequestId: input.approvalRequestId,
      });
      return;
    }

    const asset = await this.repository.lockAsset(
      tx,
      input.organizationId,
      input.subjectId,
    );
    if (!asset) throw new AppError(404, 'ASSET_NOT_FOUND', 'Asset not found.');

    await this.repository.createHistory(tx, {
      organizationId: input.organizationId,
      assetId: asset.id,
      eventType: input.decision === 'REJECTED'
        ? 'RETIREMENT_REJECTED'
        : 'RETIREMENT_RETURNED',
      oldStatus: asset.status,
      newStatus: asset.status,
      referenceType: 'ApprovalRequest',
      referenceId: input.approvalRequestId,
      detailsJson: { comment: input.comment },
    });
    await this.audit.append(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: `ASSET_RETIREMENT_${input.decision}`,
      subjectType: 'Asset',
      subjectId: asset.id,
      afterJson: {
        status: asset.status,
        approvalRequestId: input.approvalRequestId,
        comment: input.comment,
      },
      ip: null,
    });
  }

  async history(tenant: TenantRequestContext, id: string, query: any) {
    await this.enabled(tenant.organizationId);
    await this.get(tenant, id);
    const p = page(query);
    const { rows, total } = await this.repository.history({
      organizationId: tenant.organizationId,
      assetId: id,
      eventType: query.eventType,
      skip: p.skip,
      take: p.take,
    });
    return { rows, total, page: p.page, pageSize: p.pageSize };
  }

  async rotateQr(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    id: string,
    ttlDays?: number,
  ) {
    await this.enabled(tenant.organizationId);
    const rawToken = newQrToken();
    const tokenHash = hashToken(rawToken);
    const generatedAt = new Date();
    const effectiveTtlDays = ttlDays ?? DEFAULT_QR_TTL_DAYS;

    await withTransaction(async (tx) => {
      const asset = await this.repository.lockAsset(tx, tenant.organizationId, id);
      if (!asset) throw new AppError(404, 'ASSET_NOT_FOUND', 'Asset not found.');
      assertAssetQrRotatable(asset.status as AssetLifecycleStatus);

      await this.repository.upsertQr(tx, {
        organizationId: tenant.organizationId,
        assetId: id,
        token: tokenHash,
        generatedAt,
        expiresAt: qrExpiry(effectiveTtlDays),
      });

      await this.repository.createHistory(tx, {
        organizationId: tenant.organizationId,
        assetId: id,
        eventType: 'QR_ROTATED',
        oldStatus: asset.status,
        newStatus: asset.status,
        detailsJson: {
          ttlDays: effectiveTtlDays,
          tokenHashPrefix: tokenHash.slice(0, 12),
        },
      });

      await this.audit.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'ASSET_QR_ROTATED',
        subjectType: 'Asset',
        subjectId: id,
        afterJson: {
          generatedAt,
          ttlDays: effectiveTtlDays,
          tokenHashPrefix: tokenHash.slice(0, 12),
        },
        ip: actor.ip,
      });
    });

    return { token: rawToken };
  }

  async resolveQr(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    rawToken: string,
  ) {
    await this.enabled(tenant.organizationId);
    const row = await this.repository.resolveQr(
      tenant.organizationId,
      hashToken(rawToken),
    );

    if (!row) {
      assertAssetQrResolvable({ qrTagId: null });
      throw new AppError(404, 'ASSET_QR_INVALID_OR_EXPIRED', 'Asset QR token is invalid, expired or revoked.');
    }
    assertAssetQrResolvable({
      qrTagId: row.id,
      revokedAt: row.revokedAt,
      expiresAt: row.expiresAt,
    });

    await withTransaction(async (tx) => {
      await this.audit.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'ASSET_QR_RESOLVED',
        subjectType: 'Asset',
        subjectId: row.assetId,
        afterJson: {
          qrTagId: row.id,
          resolvedAt: new Date(),
        },
        ip: actor.ip,
      });
    });

    const warranty = row.asset.warranties[0];
    const installation = row.asset.installations[0];

    return {
      id: row.asset.id,
      assetNo: row.asset.assetNo,
      productId: row.asset.productId,
      customerId: row.asset.customerId,
      siteId: row.asset.siteId,
      areaId: row.asset.areaId,
      projectId: row.asset.projectId,
      status: row.asset.status,
      installedAt: row.asset.installedAt,
      warranty: warranty
        ? {
            startsAt: warranty.startsAt,
            expiresAt: warranty.expiresAt,
            status: warranty.status === 'VOID'
              ? 'VOID'
              : warrantyStatus(warranty.startsAt, warranty.expiresAt),
          }
        : null,
      installation: installation
        ? {
            installedAt: installation.installedAt,
            locationText: installation.locationText,
          }
        : null,
    };
  }

  async createRma(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    id: string,
    input: any,
  ) {
    await this.enabled(tenant.organizationId);
    const asset = await this.repository.get(tenant.organizationId, id);
    if (!asset) throw new AppError(404, 'ASSET_NOT_FOUND', 'Asset not found.');
    assertAssetRmaAllowed(asset.status as AssetLifecycleStatus);
    await this.vendors.assertApproved(tenant.organizationId, input.vendorId);

    return this.numbers.withBusinessNumber({
      organizationId: tenant.organizationId,
      branchId: null,
      entityType: 'RMA',
      fiscalYear: new Date().getUTCFullYear(),
      targetType: 'AssetRMA',
      createTarget: async (tx, rmaNo) => {
        const row = await this.repository.createRma(tx, {
          organizationId: tenant.organizationId,
          assetId: id,
          vendorId: input.vendorId,
          rmaNo,
          status: 'REQUESTED',
          reason: input.reason,
        });

        await this.repository.createHistory(tx, {
          organizationId: tenant.organizationId,
          assetId: id,
          eventType: 'RMA_REQUESTED',
          oldStatus: asset.status,
          newStatus: asset.status,
          referenceType: 'AssetRMA',
          referenceId: row.id,
          detailsJson: {
            rmaNo,
            vendorId: input.vendorId,
            reason: input.reason,
          },
        });

        await this.audit.append(tx, {
          organizationId: tenant.organizationId,
          actorUserId: actor.userId,
          action: 'ASSET_RMA_CREATED',
          subjectType: 'AssetRMA',
          subjectId: row.id,
          afterJson: {
            assetId: id,
            rmaNo,
            vendorId: input.vendorId,
            status: row.status,
          },
          ip: actor.ip,
        });
        return row;
      },
    });
  }
}
