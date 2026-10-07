'use client';

import { useFieldArray, useFormContext, type FieldPath, type FieldValues } from 'react-hook-form';
import { CheckboxField, JsonField, TextareaField, TextField, SelectField } from './controlled-fields';
import { DatePickerField, FileUploadField, MoneyInput, QuantityInput } from './domain-fields';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../ui';
import type { ResourceFormField, ResourceFormMode } from './resource-form-types';

function RenderField<TFieldValues extends FieldValues>({ field, name }: { field: ResourceFormField; name?: string }) {
  const fieldName = (name ?? field.name) as FieldPath<TFieldValues>;
  const common = {
    key: name ?? field.name,
    name: fieldName,
    label: field.label,
    ...(field.description ? { description: field.description } : {}),
  };
  if (field.type === 'textarea') return <TextareaField<TFieldValues> {...common} />;
  if (field.type === 'date') return <DatePickerField<TFieldValues> {...common} />;
  if (field.type === 'money') return <MoneyInput<TFieldValues> {...common} />;
  if (field.type === 'quantity') return <QuantityInput<TFieldValues> {...common} />;
  if (field.type === 'file') return <FileUploadField<TFieldValues> {...common} />;
  if (field.type === 'json') return <JsonField<TFieldValues> {...common} />;
  if (field.type === 'select') return <SelectField<TFieldValues> {...common} options={field.options ?? []} placeholder={field.placeholder ?? `Select ${field.label.toLowerCase()}`} />;
  if (field.type === 'checkbox') return <CheckboxField<TFieldValues> {...common} />;
  return <TextField<TFieldValues> {...common} type={field.type === 'number' ? 'number' : 'text'} />;
}

function DynamicArrayField<TFieldValues extends FieldValues>({ field }: { field: ResourceFormField }) {
  const form = useFormContext<TFieldValues>();
  const { fields, append, remove } = useFieldArray({ control: form.control, name: field.name as never });
  const error = form.getFieldState(field.name as FieldPath<TFieldValues>, form.formState).error?.message;
  const emptyItem = field.emptyItem ?? Object.fromEntries((field.arrayFields ?? []).map((child) => [child.name, child.type === 'json' ? [] : '']));

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">{field.label}</CardTitle>
            {field.description ? <p className="mt-1 text-sm text-muted-foreground">{field.description}</p> : null}
            {error ? <p className="mt-1 text-sm text-destructive">{error}</p> : null}
          </div>
          <Button type="button" variant="outline" onClick={() => append(emptyItem as never)}>
            Add line
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.length === 0 ? (
          <div className="rounded-md border p-4 text-sm text-muted-foreground">
            No lines added yet. Add at least {field.minItems ?? 1} line before submitting this workflow.
          </div>
        ) : null}
        {fields.map((item, index) => (
          <div key={item.id} className="rounded-md border p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Line {index + 1}</p>
              <Button type="button" variant="ghost" onClick={() => remove(index)}>
                Remove
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {(field.arrayFields ?? []).map((child) => (
                <RenderField<TFieldValues>
                  key={child.name}
                  field={child}
                  name={`${field.name}.${index}.${child.name}`}
                />
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ResourceFormFields<TFieldValues extends FieldValues>({ fields, mode }: { fields: ResourceFormField[]; mode: ResourceFormMode }) {
  const visibleFields = fields.filter((field) => {
    if (field.createOnly && mode !== 'create') return false;
    if (field.editOnly && mode !== 'edit') return false;
    return field.type !== 'hidden';
  });

  return (
    <>
      {visibleFields.map((field) => {
        if (field.type === 'array') return <DynamicArrayField<TFieldValues> key={field.name} field={field} />;
        return <RenderField<TFieldValues> key={field.name} field={field} />;
      })}
    </>
  );
}
