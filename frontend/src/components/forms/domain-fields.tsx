import type { FieldPath, FieldValues } from 'react-hook-form';
import { TextField } from './controlled-fields';

export function MoneyInput<TFieldValues extends FieldValues>({ name, label = 'Amount' }: { name: FieldPath<TFieldValues>; label?: string }) {
  return <TextField<TFieldValues> name={name} label={label} type="number" description="Stored as DECIMAL/NUMERIC through the backend contract, never frontend floating-point authority." />;
}

export function QuantityInput<TFieldValues extends FieldValues>({ name, label = 'Quantity' }: { name: FieldPath<TFieldValues>; label?: string }) {
  return <TextField<TFieldValues> name={name} label={label} type="number" description="Quantity is submitted as a validated contract value and finalized by backend business rules." />;
}

export function DatePickerField<TFieldValues extends FieldValues>({ name, label = 'Date' }: { name: FieldPath<TFieldValues>; label?: string }) {
  return <TextField<TFieldValues> name={name} label={label} type="date" />;
}

export function FileUploadField<TFieldValues extends FieldValues>({ name, label = 'File' }: { name: FieldPath<TFieldValues>; label?: string }) {
  return <TextField<TFieldValues> name={name} label={label} type="file" description="Large or controlled files must use backend upload-intent and complete-upload endpoints." />;
}
