import type { ReactNode } from 'react';

export function EmptyState({ title, description, action }: { title: string; description?: string | undefined; action?: ReactNode | undefined }) {
  return (
    <section className="rounded-lg border border-dashed bg-card p-8 text-center text-card-foreground">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </section>
  );
}
