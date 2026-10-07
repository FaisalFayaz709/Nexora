import { Prisma, withTransaction } from '@nexora/database';
import { AuditWriter } from '../../../core/audit/audit-writer.js';
import { BusinessEventWriter } from '../../../core/events/business-event-writer.js';
import { AppError } from '../../../core/http/errors.js';
import type { TenantRequestContext } from '../../../core/tenant/tenant-context.js';
import type { InventoryFacade } from '../../inventory/index.js';
import type { NumberSequenceFacade } from '../../platform/number-sequence/index.js';
import type { PlatformAccessFacade } from '../../platform/configuration/index.js';
import type { VendorGovernanceFacade } from '../../vendors/index.js';
import { PurchaseContractRepository } from './purchase-contract.repository.js';

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function dec(value: string | number | Prisma.Decimal | null | undefined) {
  return value === null || value === undefined ? null : new Prisma.Decimal(value);
}

function nonNullDec(value: string | number | Prisma.Decimal) {
  return new Prisma.Decimal(value);
}

export class PurchaseContractService {
  constructor(
    private readonly numbers: NumberSequenceFacade,
    private readonly vendors: VendorGovernanceFacade,
    private readonly inventory: InventoryFacade,
    private readonly access: PlatformAccessFacade,
    private readonly repository = new PurchaseContractRepository(),
    private readonly audit = new AuditWriter(),
    private readonly events = new BusinessEventWriter(),
  ) {}

  private async enabled(organizationId: string) {
    await this.access.assertModuleEnabled(organizationId, 'procurement');
  }

  async create(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    input: any,
  ) {
    await this.enabled(tenant.organizationId);
    const branchId = input.branchId ?? tenant.branchId ?? null;
    if (tenant.branchId && branchId !== tenant.branchId) {
      throw new AppError(403, 'PURCHASE_CONTRACT_BRANCH_SCOPE_DENIED', 'Purchase contract branch is outside the active branch scope.');
    }

    await this.vendors.assertApproved(tenant.organizationId, input.vendorId);
    for (const item of input.items) {
      await this.inventory.getProductForProcurement(tenant.organizationId, item.productId);
    }

    const startDate = dateOnly(input.startDate);
    const endDate = dateOnly(input.endDate);
    if (endDate < startDate) {
      throw new AppError(400, 'PURCHASE_CONTRACT_DATE_RANGE_INVALID', 'Contract end date cannot precede start date.');
    }

    const maxValue = dec(input.maxValue);
    return this.numbers.withBusinessNumber({
      organizationId: tenant.organizationId,
      branchId,
      entityType: 'PURCHASE_CONTRACT',
      fiscalYear: startDate.getUTCFullYear(),
      targetType: 'PurchaseContract',
      createTarget: async (tx, contractNo) => {
        const row = await this.repository.createContract(tx, {
          organizationId: tenant.organizationId,
          branchId,
          vendorId: input.vendorId,
          contractNo,
          startDate,
          endDate,
          maxValue,
          termsJson: input.terms ?? null,
          notes: input.notes ?? null,
          createdById: actor.userId,
          items: input.items.map((item: any) => ({
            productId: item.productId,
            agreedRate: nonNullDec(item.agreedRate),
            maxQuantity: dec(item.maxQuantity),
            maxValue: dec(item.maxValue),
          })),
        });
        await this.audit.append(tx, {
          organizationId: tenant.organizationId,
          actorUserId: actor.userId,
          action: 'PURCHASE_CONTRACT_CREATED',
          subjectType: 'PurchaseContract',
          subjectId: row.id,
          afterJson: {
            contractNo,
            vendorId: input.vendorId,
            branchId,
            startDate: input.startDate,
            endDate: input.endDate,
            maxValue: maxValue?.toString() ?? null,
            itemCount: row.items.length,
          },
          ip: actor.ip,
        });
        return row;
      },
    });
  }

  async approve(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    id: string,
    input: { comment?: string | null },
  ) {
    await this.enabled(tenant.organizationId);
    return withTransaction(async (tx) => {
      const contract = await this.repository.lockContract(tx, tenant.organizationId, id);
      if (!contract) throw new AppError(404, 'PURCHASE_CONTRACT_NOT_FOUND', 'Purchase contract not found.');
      if (tenant.branchId && contract.branchId !== tenant.branchId) {
        throw new AppError(403, 'PURCHASE_CONTRACT_BRANCH_SCOPE_DENIED', 'Purchase contract is outside the active branch scope.');
      }
      if (contract.status !== 'DRAFT') {
        throw new AppError(409, 'PURCHASE_CONTRACT_INVALID_STATE', 'Only DRAFT purchase contracts can be approved.');
      }
      if (contract.createdById === actor.userId) {
        throw new AppError(403, 'PURCHASE_CONTRACT_MAKER_CHECKER_REQUIRED', 'Creator cannot approve the same purchase contract.');
      }
      await this.vendors.assertApproved(tenant.organizationId, contract.vendorId);
      const row = await this.repository.activateContract(tx, id, actor.userId);
      await this.audit.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'PURCHASE_CONTRACT_APPROVED',
        subjectType: 'PurchaseContract',
        subjectId: id,
        beforeJson: { status: contract.status },
        afterJson: { status: row.status, comment: input.comment ?? null },
        ip: actor.ip,
      });
      await this.events.append(tx, {
        organizationId: tenant.organizationId,
        type: 'purchase_contract.approved',
        aggregateType: 'PurchaseContract',
        aggregateId: id,
        payload: { contractNo: contract.contractNo, vendorId: contract.vendorId },
      });
      return row;
    });
  }
  async createReleaseOrder(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    id: string,
    input: any,
  ) {
    await this.enabled(tenant.organizationId);
    const releaseDate = dateOnly(new Date().toISOString().slice(0, 10));
    const expectedDate = dateOnly(input.expectedDate);
    if (expectedDate < releaseDate) {
      throw new AppError(400, 'PURCHASE_RELEASE_EXPECTED_DATE_INVALID', 'Release-order expected date cannot be before today.');
    }

    return this.numbers.withBusinessNumber({
      organizationId: tenant.organizationId,
      branchId: tenant.branchId,
      entityType: 'PURCHASE_RELEASE_ORDER',
      fiscalYear: releaseDate.getUTCFullYear(),
      targetType: 'PurchaseReleaseOrder',
      createTarget: async (tx, releaseOrderNo) => {
        const contract = await this.repository.lockContract(tx, tenant.organizationId, id);
        if (!contract) throw new AppError(404, 'PURCHASE_CONTRACT_NOT_FOUND', 'Purchase contract not found.');
        if (tenant.branchId && contract.branchId !== tenant.branchId) {
          throw new AppError(403, 'PURCHASE_CONTRACT_BRANCH_SCOPE_DENIED', 'Purchase contract is outside the active branch scope.');
        }
        if (contract.status !== 'ACTIVE') {
          throw new AppError(409, 'PURCHASE_CONTRACT_NOT_ACTIVE', 'Release orders require an ACTIVE purchase contract.');
        }
        if (releaseDate < contract.startDate || releaseDate > contract.endDate) {
          throw new AppError(409, 'PURCHASE_CONTRACT_NOT_IN_VALIDITY', 'Release date is outside the purchase contract validity period.');
        }
        await this.vendors.assertApproved(tenant.organizationId, contract.vendorId);

        const items = await this.repository.contractItems(tx, id);
        const itemById = new Map(items.map((item) => [item.id, item]));
        const releaseItems = [];
        let totalValue = new Prisma.Decimal(0);

        for (const requestItem of input.items) {
          const contractItem = itemById.get(requestItem.contractItemId);
          if (!contractItem) {
            throw new AppError(400, 'PURCHASE_RELEASE_CONTRACT_ITEM_INVALID', 'Release order item is not part of this contract.');
          }
          const quantity = nonNullDec(requestItem.quantity);
          const lineTotal = quantity.mul(contractItem.agreedRate);
          const nextQuantity = contractItem.releasedQuantity.add(quantity);
          const nextValue = contractItem.releasedValue.add(lineTotal);

          if (contractItem.maxQuantity && nextQuantity.gt(contractItem.maxQuantity)) {
            throw new AppError(409, 'PURCHASE_CONTRACT_QUANTITY_EXCEEDED', 'Release order exceeds remaining contract item quantity.');
          }
          if (contractItem.maxValue && nextValue.gt(contractItem.maxValue)) {
            throw new AppError(409, 'PURCHASE_CONTRACT_ITEM_VALUE_EXCEEDED', 'Release order exceeds remaining contract item value.');
          }

          releaseItems.push({
            contractItemId: contractItem.id,
            productId: contractItem.productId,
            quantity,
            unitPrice: contractItem.agreedRate,
            lineTotal,
          });
          totalValue = totalValue.add(lineTotal);
        }

        if (!totalValue.isPositive()) {
          throw new AppError(400, 'PURCHASE_RELEASE_TOTAL_INVALID', 'Release order total must be greater than zero.');
        }
        const nextContractValue = contract.releasedValue.add(totalValue);
        if (contract.maxValue && nextContractValue.gt(contract.maxValue)) {
          throw new AppError(409, 'PURCHASE_CONTRACT_VALUE_EXCEEDED', 'Release order exceeds remaining contract value.');
        }

        const release = await this.repository.createReleaseOrder(tx, {
          organizationId: tenant.organizationId,
          branchId: contract.branchId,
          purchaseContractId: contract.id,
          vendorId: contract.vendorId,
          releaseOrderNo,
          releaseDate,
          expectedDate,
          totalValue,
          notes: input.notes ?? null,
          createdById: actor.userId,
          items: releaseItems,
        });

        for (const item of releaseItems) {
          await this.repository.incrementContractItemRelease(tx, item.contractItemId, item.quantity, item.lineTotal);
        }
        await this.repository.incrementContractReleaseValue(tx, contract.id, totalValue);

        await this.audit.append(tx, {
          organizationId: tenant.organizationId,
          actorUserId: actor.userId,
          action: 'PURCHASE_RELEASE_ORDER_CREATED',
          subjectType: 'PurchaseReleaseOrder',
          subjectId: release.id,
          afterJson: {
            releaseOrderNo,
            purchaseContractId: contract.id,
            contractNo: contract.contractNo,
            totalValue: totalValue.toString(),
            itemCount: release.items.length,
          },
          ip: actor.ip,
        });
        await this.events.append(tx, {
          organizationId: tenant.organizationId,
          type: 'purchase_release_order.created',
          aggregateType: 'PurchaseReleaseOrder',
          aggregateId: release.id,
          payload: { purchaseContractId: contract.id, vendorId: contract.vendorId, totalValue: totalValue.toString() },
        });
        return release;
      },
    }).then((result) => result.target);
  }
}
