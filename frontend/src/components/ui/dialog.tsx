'use client';
import * as React from 'react';
import { cn } from '../../lib/utils';
import { Button } from './button';

export interface DialogProps {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  onOpenChange: (open: boolean) => void;
}

export function Dialog({ open, title, description, children, onOpenChange }: DialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={cn('w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg')}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="dialog-title" className="text-lg font-semibold">{title}</h2>
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} aria-label="Close dialog">
            ×
          </Button>
        </div>
        <div className="mt-6">{children}</div>
      </section>
    </div>
  );
}
