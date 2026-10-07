import { Badge } from '../ui';

const positiveStatuses = new Set(['ACTIVE', 'APPROVED', 'POSTED', 'PAID', 'RECEIVED', 'CLOSED', 'COMPLETED', 'ACCEPTED']);
const negativeStatuses = new Set(['REJECTED', 'CANCELLED', 'REVERSED', 'FAILED', 'VOID', 'TERMINATED']);

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const variant = negativeStatuses.has(normalized) ? 'destructive' : positiveStatuses.has(normalized) ? 'default' : 'secondary';
  return <Badge variant={variant}>{normalized.replaceAll('_', ' ')}</Badge>;
}
