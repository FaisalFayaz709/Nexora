import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('PASS_22 migration and seed evidence source', () => {
  it('keeps Prisma schema and seed scripts present for runtime migration testing', () => {
    const schema = readFileSync(join(process.cwd(), 'database/prisma/schema.prisma'), 'utf8');
    const seed = readFileSync(join(process.cwd(), 'database/prisma/seed/seed.mjs'), 'utf8');
    expect(schema).toContain('model Organization');
    expect(schema).toContain('model AuditLog');
    expect(seed).toContain('baseline.seed.json');
  });
});
