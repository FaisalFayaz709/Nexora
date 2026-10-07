'use client';

import type { ReactNode } from 'react';
import { FormProvider, type FieldValues, type UseFormReturn } from 'react-hook-form';
import { Button } from '../ui';

export interface FormShellProps<TFieldValues extends FieldValues> {
  form: UseFormReturn<TFieldValues>;
  onSubmit: (values: TFieldValues) => void | Promise<void>;
  children: ReactNode;
  submitLabel?: string;
  pending?: boolean;
  disabled?: boolean;
  secondaryAction?: ReactNode;
}

export function FormShell<TFieldValues extends FieldValues>({ form, onSubmit, children, submitLabel = 'Save', pending = false, disabled = false, secondaryAction }: FormShellProps<TFieldValues>) {
  return (
    <FormProvider {...form}>
      <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} className="space-y-6">
        {children}
        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
          {secondaryAction}
          <Button type="submit" disabled={disabled || pending}>
            {pending ? 'Saving…' : submitLabel}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
