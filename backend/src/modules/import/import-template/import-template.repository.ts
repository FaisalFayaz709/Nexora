import { prisma, type TransactionClient } from '@nexora/database';

type Db = typeof prisma | TransactionClient;

export class ImportTemplateRepository {
  constructor(private readonly db: Db = prisma) {}
  withDb(db: TransactionClient) { return new ImportTemplateRepository(db); }

  upsertBaseline(input: {
    organizationId: string;
    subjectType: string;
    name: string;
    columns: readonly string[];
  }) {
    return this.db.importTemplate.upsert({
      where: {
        organizationId_subjectType_name: {
          organizationId: input.organizationId,
          subjectType: input.subjectType,
          name: input.name,
        },
      },
      update: { columnsJson: [...input.columns], active: true },
      create: {
        organizationId: input.organizationId,
        subjectType: input.subjectType,
        name: input.name,
        columnsJson: [...input.columns],
        active: true,
      },
    });
  }
}
