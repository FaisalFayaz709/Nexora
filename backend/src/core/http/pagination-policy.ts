import { AppError } from './errors.js';

export interface PaginationInput {
  readonly page?: number;
  readonly pageSize?: number;
}

export interface PaginationPolicy {
  readonly defaultPageSize?: number;
  readonly maxPageSize: number;
}

export interface PaginationWindow {
  readonly page: number;
  readonly pageSize: number;
  readonly skip: number;
  readonly take: number;
}

export function resolvePagination(input: PaginationInput, policy: PaginationPolicy): PaginationWindow {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? policy.defaultPageSize ?? 25;

  if (!Number.isInteger(page) || page < 1) {
    throw new AppError(400, 'PAGINATION_PAGE_INVALID', 'Page must be a positive integer.');
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > policy.maxPageSize) {
    throw new AppError(400, 'PAGINATION_PAGE_SIZE_INVALID', 'Page size is outside the allowed range.', {
      maxPageSize: policy.maxPageSize,
    });
  }

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
