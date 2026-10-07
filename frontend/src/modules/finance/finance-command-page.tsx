import { FinanceResourceDetail } from './finance-resource-detail';
import { FinanceScopedSurface } from './finance-scoped-surface';
import {
  getFinanceResourceConfig,
  getFinanceScopedSurfaceConfig,
  type FinanceCommandKey,
  type FinanceResourceConfig,
  type FinanceResourceKey,
  type FinanceScopedSurfaceKey,
} from './finance-resource-config';

export function FinanceResourceCommandPage({
  resourceKey,
  commandKey,
  recordId,
}: {
  resourceKey: FinanceResourceKey;
  commandKey: FinanceCommandKey;
  recordId: string;
}) {
  const base = getFinanceResourceConfig(resourceKey);
  const resource = {
    ...base,
    commands: base.commands.filter((command) => command.key === commandKey),
  } satisfies FinanceResourceConfig;

  return <FinanceResourceDetail resource={resource} recordId={recordId} />;
}

export function FinanceScopedCommandPage({
  surfaceKey,
  recordId = 'context',
}: {
  surfaceKey: FinanceScopedSurfaceKey;
  recordId?: string;
}) {
  return <FinanceScopedSurface surface={getFinanceScopedSurfaceConfig(surfaceKey)} recordId={recordId} />;
}
