import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('PASS 08 stock count / cycle count source policy', () => {
  it('exposes list, detail, count-sheet and command routes under the locked Fastify /api/v1 surface', () => {
    const routes = source('backend/src/modules/inventory/stock-count/stock-count.routes.ts');
    for (const route of [
      '/api/v1/stock-counts',
      '/api/v1/stock-counts/:id',
      '/api/v1/stock-counts/:id/count-sheet',
      '/api/v1/stock-counts/:id/start',
      '/api/v1/stock-counts/:id/submit',
      '/api/v1/stock-counts/:id/post',
    ]) {
      expect(routes).toContain(route);
    }
    expect(routes).toContain('authenticateRequest');
    expect(routes).toContain('resolveTenantRequest');
    expect(routes).toContain("assertModuleEnabled(request.tenant!.organizationId, 'inventory')");
  });

  it('keeps stock count posting transactional, maker-checker controlled and ledger-backed', () => {
    const service = source('backend/src/modules/inventory/stock-count/stock-count.service.ts');
    expect(service).toContain('withTransaction');
    expect(service).toContain('STOCK_COUNT_MAKER_CHECKER_REQUIRED');
    expect(service).toContain('createAdjustmentLine');
    expect(service).toContain('applyOnHandDelta');
    expect(service).toContain('createTransaction');
    expect(service).toContain("referenceType: 'StockCount'");
    expect(service).toContain('STOCK_COUNT_POSTED');
  });

  it('prevents incomplete or duplicated count lines before variance submission', () => {
    const service = source('backend/src/modules/inventory/stock-count/stock-count.service.ts');
    expect(service).toContain('STOCK_COUNT_DUPLICATE_LINE');
    expect(service).toContain('STOCK_COUNT_LINES_INCOMPLETE');
    expect(service).toContain('varianceQty');
    expect(service).toContain('upsertVariance');
  });
});
