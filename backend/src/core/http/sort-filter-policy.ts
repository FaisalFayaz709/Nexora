import { AppError } from './errors.js';

export interface SortItem {
  readonly field: string;
  readonly direction: 'asc' | 'desc';
}

export function parseAllowlistedSort(sort: string | undefined, allowedFields: readonly string[]): SortItem[] {
  if (!sort) return [];
  const allowed = new Set(allowedFields);
  return sort.split(',').filter(Boolean).map((item) => {
    const [field, rawDirection = 'asc'] = item.split(':');
    if (!field || !allowed.has(field)) {
      throw new AppError(400, 'SORT_FIELD_NOT_ALLOWED', 'Sort field is not allowed for this endpoint.', {
        field,
        allowedFields,
      });
    }
    if (rawDirection !== 'asc' && rawDirection !== 'desc') {
      throw new AppError(400, 'SORT_DIRECTION_INVALID', 'Sort direction must be asc or desc.', {
        field,
        direction: rawDirection,
      });
    }
    return { field, direction: rawDirection };
  });
}

export function rejectUnknownFilterKeys(
  received: Record<string, unknown>,
  allowedKeys: readonly string[],
): void {
  const allowed = new Set(allowedKeys);
  const unknown = Object.keys(received).filter((key) => !allowed.has(key));
  if (unknown.length) {
    throw new AppError(400, 'FILTER_FIELD_NOT_ALLOWED', 'One or more filters are not allowed.', {
      unknown,
      allowedKeys,
    });
  }
}
