import { Skeleton } from '../ui';

export function LoadingState({ title = 'Loading', description }: { title?: string; description?: string }) {
  return (
    <section className="rounded-lg border bg-card p-6 text-card-foreground">
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-3/5" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <span className="sr-only">{title}{description ? `: ${description}` : ''}</span>
    </section>
  );
}
