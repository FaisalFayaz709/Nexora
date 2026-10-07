import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { ApiClientError } from '@/lib/api-client';

export type BackendFieldError = {
  path?: string | string[];
  field?: string;
  message?: string;
};

function toFieldPath(error: BackendFieldError): string | null {
  if (Array.isArray(error.path)) return error.path.join('.');
  if (typeof error.path === 'string') return error.path;
  if (typeof error.field === 'string') return error.field;
  return null;
}

function isBackendFieldError(value: unknown): value is BackendFieldError {
  return Boolean(value) && typeof value === 'object' && ('path' in value || 'field' in value || 'message' in value);
}

function extractFieldErrors(details: unknown): BackendFieldError[] {
  if (!details || typeof details !== 'object') return [];
  const record = details as Record<string, unknown>;
  const candidates = [record.fieldErrors, record.errors, record.validationErrors, record.issues];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.filter(isBackendFieldError);
  }
  if (record.fields && typeof record.fields === 'object') {
    return Object.entries(record.fields as Record<string, unknown>).map(([field, message]) => ({ field, message: String(message) }));
  }
  return [];
}

export function mapApiValidationErrorsToForm<TFieldValues extends FieldValues>(form: UseFormReturn<TFieldValues>, error: unknown): string {
  if (!(error instanceof ApiClientError)) {
    return error instanceof Error ? error.message : 'The request failed.';
  }

  const fieldErrors = extractFieldErrors(error.details);
  for (const fieldError of fieldErrors) {
    const field = toFieldPath(fieldError);
    if (!field) continue;
    form.setError(field as Path<TFieldValues>, {
      type: error.code || 'server',
      message: fieldError.message || error.message,
    });
  }

  return error.message;
}
