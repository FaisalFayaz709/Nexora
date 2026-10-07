import type { z } from 'zod';
import type { SelectOption } from '../ui';

export type ResourceFormMode = 'create' | 'edit';

export type ResourceFormFieldType = 'text' | 'textarea' | 'date' | 'number' | 'money' | 'quantity' | 'select' | 'checkbox' | 'hidden' | 'file' | 'json' | 'array';

export type ResourceFormField = {
  name: string;
  label: string;
  type: ResourceFormFieldType;
  description?: string;
  placeholder?: string;
  required?: boolean;
  options?: SelectOption[];
  createOnly?: boolean;
  editOnly?: boolean;
  arrayFields?: ResourceFormField[];
  emptyItem?: Record<string, unknown>;
  minItems?: number;
};

export type ResourceFormDefinition<TValues extends Record<string, unknown> = Record<string, unknown>> = {
  resourceKey: string;
  title: string;
  description: string;
  endpoint: string;
  schema: z.ZodType<TValues>;
  defaultValues: TValues;
  fields: ResourceFormField[];
  invalidateKeys: readonly unknown[];
  idempotent?: boolean;
};

export type CommandFormDefinition<TValues extends Record<string, unknown> = Record<string, unknown>> = {
  commandKey: string;
  title: string;
  description: string;
  endpoint: string;
  schema: z.ZodType<TValues>;
  defaultValues: TValues;
  fields: ResourceFormField[];
  invalidateKeys: readonly unknown[];
  idempotent: boolean;
  currentStatus?: string;
  requiredPermission?: string;
  irreversibleEffects?: string[];
};
