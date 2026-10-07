import type { ReactNode } from 'react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui';
import { StatusBadge } from './status-badge';

export interface StateTransitionAction {
  id: string;
  label: string;
  permission: string;
  destructive?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export function StateTransitionPanel({ currentStatus, title = 'Workflow actions', description, actions }: { currentStatus: string; title?: string; description?: string; actions: StateTransitionAction[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description ?? 'Only allowed command transitions should be shown for the current status and permission scope.'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Current status</span>
          <StatusBadge status={currentStatus} />
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button key={action.id} type="button" variant={action.destructive ? 'destructive' : 'outline'} disabled={action.disabled} onClick={action.onSelect}>
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function MakerCheckerNotice({ children = 'Maker-checker applies: creators cannot be sole approvers for high-risk transactions.' }: { children?: ReactNode }) {
  return <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">{children}</div>;
}
