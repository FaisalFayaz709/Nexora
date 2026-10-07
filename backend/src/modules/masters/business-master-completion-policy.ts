import {
  BusinessMasterCompletionRows,
  BusinessMasterRoutes,
  type BusinessMasterSubject,
} from '@nexora/shared';
import { AppError } from '../../core/http/errors.js';
import { BusinessMasterImmutableFields } from './business-master-policy.js';

export const RuntimeBusinessMasterSubjects = [
  'EMPLOYEE',
  'CUSTOMER',
  'CUSTOMER_SITE',
  'VENDOR',
  'PRODUCT',
  'WAREHOUSE',
] as const satisfies readonly BusinessMasterSubject[];

export function businessMasterCompletionFor(subject: BusinessMasterSubject) {
  const row = BusinessMasterCompletionRows.find((entry) => entry.subject === subject);
  if (!row) {
    throw new AppError(
      500,
      'BUSINESS_MASTER_COMPLETION_ROW_MISSING',
      `${subject} is missing from the M7 business-master completion matrix.`,
    );
  }
  return row;
}

export function assertBusinessMasterCompletionMatrix() {
  const failures: string[] = [];
  for (const subject of RuntimeBusinessMasterSubjects) {
    const row = BusinessMasterCompletionRows.find((entry) => entry.subject === subject);
    const route = BusinessMasterRoutes.find((entry) => entry.subject === subject);
    if (!row) failures.push(`${subject}: completion row missing`);
    if (!route) failures.push(`${subject}: route manifest row missing`);
    if (row && route) {
      if (row.ownerModule !== route.ownerModule) failures.push(`${subject}: owner module mismatch`);
      if (row.apiSurface !== route.listPath) failures.push(`${subject}: API surface mismatch`);
      for (const capability of ['shared_contract','locked_route','controller_parse','tenant_scoped_repository','audit_on_mutation','bounded_pagination','import_template'] as const) {
        if (!row.capabilities.includes(capability)) failures.push(`${subject}: missing ${capability}`);
      }
    }
    const immutable = BusinessMasterImmutableFields[subject] ?? [];
    if (!immutable.includes('id')) failures.push(`${subject}: id is not immutable`);
    if (!immutable.includes('createdAt')) failures.push(`${subject}: createdAt is not immutable`);
  }
  if (failures.length) {
    throw new AppError(
      500,
      'BUSINESS_MASTER_COMPLETION_MATRIX_INVALID',
      failures.join('; '),
      { failures },
    );
  }
  return true;
}
