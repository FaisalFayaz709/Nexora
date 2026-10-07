import type { ReactNode } from 'react';

import { Button } from '../ui';

export type DataRowAction = {
  label: string;
  href?: string;
  onSelect?: () => void;
  disabled?: boolean;
  reason?: string;
};

export function RowActionsMenu({ actions, children }: { actions?: DataRowAction[]; children?: ReactNode }) {
  const visibleActions = actions && actions.length > 0 ? actions : [{ label: 'Review', disabled: true, reason: 'Detail and command workflows are delivered in CRUD passes R9-R16.' }];

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {children}
      {visibleActions.map((action) => {
        const disabled = action.disabled || (!action.href && !action.onSelect);
        if (action.href && !disabled) {
          return (
            <Button key={action.label} type="button" variant="outline" size="sm" asChild title={action.reason}>
              <a href={action.href}>{action.label}</a>
            </Button>
          );
        }
        return (
          <Button
            key={action.label}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            title={action.reason}
            onClick={action.onSelect}
          >
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}
