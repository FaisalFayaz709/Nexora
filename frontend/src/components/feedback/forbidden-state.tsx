export function ForbiddenState({ title = 'Access denied', description }: { title?: string; description?: string }) {
  return (
    <section className="rounded-lg border bg-card p-6 text-card-foreground">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
    </section>
  );
}

export function NotFoundState({ title = 'Not found', description }: { title?: string; description?: string }) {
  return (
    <section className="rounded-lg border bg-card p-6 text-card-foreground">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
    </section>
  );
}
