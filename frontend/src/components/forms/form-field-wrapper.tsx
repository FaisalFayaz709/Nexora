import type { ReactNode } from 'react';
import { Label } from '../ui';

export function FormFieldWrapper({ label, htmlFor, description, error, children }: { label: string; htmlFor?: string; description?: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  );
}
