import { describe, expect, it } from 'vitest';
import { AppError } from './errors.js';
import { resolvePagination } from './pagination-policy.js';
import { parseAllowlistedSort, rejectUnknownFilterKeys } from './sort-filter-policy.js';

describe('pagination and filter policy core controls', () => {
  it('resolves bounded page windows', () => {
    expect(resolvePagination({ page: 2, pageSize: 10 }, { maxPageSize: 50 })).toEqual({
      page: 2,
      pageSize: 10,
      skip: 10,
      take: 10,
    });
  });

  it('rejects unbounded page sizes', () => {
    expect(() => resolvePagination({ page: 1, pageSize: 5000 }, { maxPageSize: 100 })).toThrow(AppError);
  });

  it('parses only allowlisted sort fields', () => {
    expect(parseAllowlistedSort('createdAt:desc,status:asc', ['createdAt', 'status'])).toEqual([
      { field: 'createdAt', direction: 'desc' },
      { field: 'status', direction: 'asc' },
    ]);
    expect(() => parseAllowlistedSort('rawSql:desc', ['createdAt'])).toThrow(AppError);
  });

  it('rejects unknown filter fields', () => {
    expect(() => rejectUnknownFilterKeys({ status: 'OPEN', unsafe: 'x' }, ['status'])).toThrow(AppError);
  });
});
