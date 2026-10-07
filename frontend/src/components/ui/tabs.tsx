'use client';
import * as React from 'react';
import { cn } from '../../lib/utils';

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

export function Tabs({ items, defaultId }: { items: TabItem[]; defaultId?: string }) {
  const [active, setActive] = React.useState(defaultId ?? items[0]?.id ?? '');
  const selected = items.find((item) => item.id === active);
  return (
    <div>
      <div className="inline-flex rounded-lg bg-muted p-1" role="tablist">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === active}
            className={cn('rounded-md px-3 py-2 text-sm font-medium', item.id === active ? 'bg-background shadow-sm' : 'text-muted-foreground')}
            onClick={() => setActive(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-4" role="tabpanel">
        {selected?.content}
      </div>
    </div>
  );
}
