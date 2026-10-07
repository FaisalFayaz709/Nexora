'use client';

import { Controller, useFormContext, type FieldPath, type FieldValues } from 'react-hook-form';
import { Checkbox, Input, Select, Textarea, type SelectOption } from '../ui';
import { FormFieldWrapper } from './form-field-wrapper';

export function TextField<TFieldValues extends FieldValues>({ name, label, description, type = 'text' }: { name: FieldPath<TFieldValues>; label: string; description?: string; type?: string }) {
  const form = useFormContext<TFieldValues>();
  const message = form.getFieldState(name, form.formState).error?.message;
  return (
    <FormFieldWrapper label={label} htmlFor={name} description={description} error={message}>
      <Input id={name} type={type} {...form.register(name)} />
    </FormFieldWrapper>
  );
}

export function TextareaField<TFieldValues extends FieldValues>({ name, label, description }: { name: FieldPath<TFieldValues>; label: string; description?: string }) {
  const form = useFormContext<TFieldValues>();
  const message = form.getFieldState(name, form.formState).error?.message;
  return (
    <FormFieldWrapper label={label} htmlFor={name} description={description} error={message}>
      <Textarea id={name} {...form.register(name)} />
    </FormFieldWrapper>
  );
}

function formatJson(value: unknown) {
  if (typeof value === 'string') return value;
  if (value === undefined) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value ?? '');
  }
}

export function JsonField<TFieldValues extends FieldValues>({ name, label, description }: { name: FieldPath<TFieldValues>; label: string; description?: string }) {
  const form = useFormContext<TFieldValues>();
  const message = form.getFieldState(name, form.formState).error?.message;
  return (
    <Controller
      name={name}
      control={form.control}
      render={({ field }) => (
        <FormFieldWrapper
          label={label}
          htmlFor={name}
          description={description ?? 'Enter valid JSON. The parsed value is submitted to the shared Zod contract, not a raw string.'}
          error={message}
        >
          <Textarea
            id={name}
            name={field.name}
            ref={field.ref}
            value={formatJson(field.value)}
            onBlur={field.onBlur}
            onChange={(event) => {
              const raw = event.target.value;
              if (!raw.trim()) {
                field.onChange(null);
                return;
              }
              try {
                field.onChange(JSON.parse(raw));
                form.clearErrors(name);
              } catch {
                field.onChange(raw);
                form.setError(name, { type: 'parse', message: 'Enter valid JSON before submitting.' });
              }
            }}
          />
        </FormFieldWrapper>
      )}
    />
  );
}

export function SelectField<TFieldValues extends FieldValues>({ name, label, options, placeholder, description }: { name: FieldPath<TFieldValues>; label: string; options: SelectOption[]; placeholder?: string; description?: string }) {
  const form = useFormContext<TFieldValues>();
  const message = form.getFieldState(name, form.formState).error?.message;
  return (
    <Controller
      name={name}
      control={form.control}
      render={({ field }) => (
        <FormFieldWrapper label={label} htmlFor={name} description={description} error={message}>
          <Select id={name} options={options} placeholder={placeholder} value={String(field.value ?? '')} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
        </FormFieldWrapper>
      )}
    />
  );
}

export function CheckboxField<TFieldValues extends FieldValues>({ name, label, description }: { name: FieldPath<TFieldValues>; label: string; description?: string }) {
  const form = useFormContext<TFieldValues>();
  const message = form.getFieldState(name, form.formState).error?.message;
  return (
    <Controller
      name={name}
      control={form.control}
      render={({ field }) => (
        <FormFieldWrapper label={label} htmlFor={name} description={description} error={message}>
          <Checkbox id={name} name={field.name} checked={Boolean(field.value)} onChange={(event) => field.onChange(event.target.checked)} onBlur={field.onBlur} ref={field.ref} />
        </FormFieldWrapper>
      )}
    />
  );
}
