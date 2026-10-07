import { withTransaction, type TransactionClient } from '@nexora/database';
import { AuditWriter } from '../../../core/audit/audit-writer.js';
import { AppError } from '../../../core/http/errors.js';
import type { TenantRequestContext } from '../../../core/tenant/tenant-context.js';
import type { OrganizationFacade } from '../../organization/index.js';
import { NumberSequenceRepository } from './number-sequence.repository.js';

const ORG_SCOPE = 'ORG';
export function numberSequenceScopeKey(branchId?: string | null) { return branchId ?? ORG_SCOPE; }
export function formatBusinessNumber(prefix: string, number: bigint, padding: number) { return `${prefix}${number.toString().padStart(padding, '0')}`; }

export class NumberSequenceService {
  constructor(
    private readonly organization: Pick<OrganizationFacade, 'branchExists'>,
    private readonly repository = new NumberSequenceRepository(),
    private readonly auditWriter = new AuditWriter(),
  ) {}

  async list(tenant: TenantRequestContext, query: any) {
    if (tenant.branchId && query.branchId && query.branchId !== tenant.branchId) throw new AppError(403, 'NUMBER_SEQUENCE_BRANCH_SCOPE_DENIED', 'Requested branch is outside the active branch scope.');
    if (query.branchId && !(await this.organization.branchExists(tenant.organizationId, query.branchId))) throw new AppError(404, 'NUMBER_SEQUENCE_BRANCH_NOT_FOUND', 'Branch does not belong to the active organization.');
    const page = query.page ?? 1, pageSize = Math.min(query.pageSize ?? 25, 100);
    const result = await this.repository.list({ organizationId: tenant.organizationId, branchScopeId: tenant.branchId, entityType: query.entityType, branchId: query.branchId, fiscalYear: query.fiscalYear, skip: (page - 1) * pageSize, take: pageSize });
    return { ...result, page, pageSize };
  }

  async create(tenant: TenantRequestContext, actor: any, input: any) {
    const branchId = input.branchId ?? null;
    if (tenant.branchId && branchId !== tenant.branchId) throw new AppError(403, 'NUMBER_SEQUENCE_BRANCH_SCOPE_DENIED', 'A branch-scoped administrator may configure only the active branch.');
    if (branchId && !(await this.organization.branchExists(tenant.organizationId, branchId))) throw new AppError(404, 'NUMBER_SEQUENCE_BRANCH_NOT_FOUND', 'Branch does not belong to the active organization.');
    return withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);
      const row = await repo.create({ organizationId: tenant.organizationId, branchId, branchScopeKey: numberSequenceScopeKey(branchId), entityType: input.entityType, prefix: input.prefix, fiscalYear: input.fiscalYear, currentNumber: BigInt(input.startNumber), padding: input.padding, resetPolicy: input.resetPolicy });
      await this.auditWriter.append(tx, { organizationId: tenant.organizationId, actorUserId: actor.userId, action: 'NUMBER_SEQUENCE_CREATED', subjectType: 'NumberSequence', subjectId: row.id, afterJson: { branchId: row.branchId, entityType: row.entityType, prefix: row.prefix, fiscalYear: row.fiscalYear, currentNumber: row.currentNumber.toString(), padding: row.padding, resetPolicy: row.resetPolicy }, ip: actor.ip });
      return row;
    });
  }

  async reset(tenant: TenantRequestContext, actor: any, id: string, reason: string) {
    const existing = await this.repository.findById(tenant.organizationId, id);
    if (!existing || (tenant.branchId && existing.branchId !== tenant.branchId)) throw new AppError(404, 'NUMBER_SEQUENCE_NOT_FOUND', 'Number sequence not found.');
    if (existing.branchId && !(await this.organization.branchExists(tenant.organizationId, existing.branchId))) throw new AppError(409, 'NUMBER_SEQUENCE_BRANCH_INVALID', 'Configured branch no longer belongs to the active organization.');
    if ((await this.repository.reservationCount(existing.id)) > 0) {
      throw new AppError(
        409,
        'NUMBER_SEQUENCE_RESET_NOT_ALLOWED_AFTER_ISSUE',
        'A sequence that has already issued business numbers cannot be reset because business numbers must remain unique. Create the next fiscal-year/scope sequence instead.',
      );
    }
    return withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx); const row = await repo.reset(id);
      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId, actorUserId: actor.userId,
        action: 'NUMBER_SEQUENCE_RESET', subjectType: 'NumberSequence', subjectId: id,
        beforeJson: { currentNumber: existing.currentNumber.toString(), resetPolicy: existing.resetPolicy, fiscalYear: existing.fiscalYear, branchId: existing.branchId },
        afterJson: { currentNumber: '0', resetPolicy: existing.resetPolicy, fiscalYear: existing.fiscalYear, branchId: existing.branchId, reason }, ip: actor.ip,
      });
      return row;
    });
  }


  async withBusinessNumberInTransaction<T extends { id: string }>(
    tx: TransactionClient,
    input: {
      organizationId: string; branchId?: string | null; entityType: string; fiscalYear: number; targetType: string;
      createTarget: (tx: TransactionClient, businessNumber: string) => Promise<T>;
    },
  ): Promise<{ target: T; businessNumber: string }> {
    const repo = this.repository.withDb(tx);
    let sequence;
    try { sequence = await repo.allocateNext({ organizationId: input.organizationId, branchScopeKey: numberSequenceScopeKey(input.branchId), entityType: input.entityType, fiscalYear: input.fiscalYear }); }
    catch { throw new AppError(409, 'NUMBER_SEQUENCE_NOT_CONFIGURED', 'No number sequence is configured for the requested organization/branch/entity/fiscal year.'); }
    const businessNumber = formatBusinessNumber(sequence.prefix, sequence.currentNumber, sequence.padding);
    const reservation = await repo.createReservation({ sequenceId: sequence.id, organizationId: input.organizationId, branchId: input.branchId ?? null, reservedNumber: sequence.currentNumber, businessNumber, targetType: input.targetType });
    const target = await input.createTarget(tx, businessNumber);
    await repo.consumeReservation(reservation.id, target.id);
    return { target, businessNumber };
  }

  async withBusinessNumber<T extends { id: string }>(input: {
    organizationId: string; branchId?: string | null; entityType: string; fiscalYear: number; targetType: string;
    createTarget: (tx: TransactionClient, businessNumber: string) => Promise<T>;
  }): Promise<{ target: T; businessNumber: string }> {
    if (input.branchId && !(await this.organization.branchExists(input.organizationId, input.branchId))) throw new AppError(404, 'NUMBER_SEQUENCE_BRANCH_NOT_FOUND', 'Branch does not belong to the target organization.');
    return withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);
      let sequence;
      try { sequence = await repo.allocateNext({ organizationId: input.organizationId, branchScopeKey: numberSequenceScopeKey(input.branchId), entityType: input.entityType, fiscalYear: input.fiscalYear }); }
      catch { throw new AppError(409, 'NUMBER_SEQUENCE_NOT_CONFIGURED', 'No number sequence is configured for the requested organization/branch/entity/fiscal year.'); }
      const businessNumber = formatBusinessNumber(sequence.prefix, sequence.currentNumber, sequence.padding);
      const reservation = await repo.createReservation({ sequenceId: sequence.id, organizationId: input.organizationId, branchId: input.branchId ?? null, reservedNumber: sequence.currentNumber, businessNumber, targetType: input.targetType });
      const target = await input.createTarget(tx, businessNumber);
      await repo.consumeReservation(reservation.id, target.id);
      return { target, businessNumber };
    });
  }
}
