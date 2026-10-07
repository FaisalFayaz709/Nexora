import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-6 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{eyebrow}</p> : null}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
