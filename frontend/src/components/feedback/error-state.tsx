import type { ReactNode } from 'react';
import { Button } from '../ui';

export function ErrorState({ title = 'Something went wrong', description, retry }: { title?: string | undefined; description?: string | undefined; retry?: (() => void) | undefined }) {
  return (
    <section className="rounded-lg border border-destructive/30 bg-card p-6 text-card-foreground">
      <h2 className="text-lg font-semibold text-destructive">{title}</h2>
      {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
      {retry ? <Button type="button" variant="outline" className="mt-4" onClick={retry}>Retry</Button> : null}
    </section>
  );
}

export function ValidationSummary({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
      <p className="font-medium">Please fix the following:</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {errors.map((error) => <li key={error}>{error}</li>)}
      </ul>
    </div>
  );
}

export function ConflictState({ title = 'Conflict detected', description, action }: { title?: string | undefined; description?: string | undefined; action?: ReactNode | undefined }) {
  return (
    <section className="rounded-lg border bg-card p-6 text-card-foreground">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}
