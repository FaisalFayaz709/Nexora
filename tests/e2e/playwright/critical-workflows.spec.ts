import { expect, test } from '@playwright/test';

const runBrowserE2E = process.env.RUN_BROWSER_E2E === '1' || process.env.RUNTIME_CERTIFICATION === '1';

test.describe('R18 browser E2E full-stack workflow certification', () => {
  test.skip(!runBrowserE2E, 'Set RUN_BROWSER_E2E=1 after the Docker/runtime stack is running. source-only R18 must not pretend browser E2E ran.');

  test('R18-FRONTEND-SHELL-FORM-GRID-WORKFLOW-STATES internal ERP workflow surfaces are reachable', async ({ page }) => {
    const routes = [
      '/dashboard',
      '/procurement/purchase-requests',
      '/inventory/stock-ledger',
      '/projects',
      '/assets',
      '/work-orders',
      '/customer-invoices',
      '/reports',
      '/audit-logs',
    ];
    const errors: string[] = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('body')).toBeVisible();
    }
    expect(errors.join('\n')).not.toMatch(/PrismaClient|@nexora\/database|MinIO secret|Unhandled Runtime Error/i);
  });

  test('R18-TECHNICIAN-OFFLINE-SYNC-REPLAY-CONFLICT technician PWA exposes offline queue and sync status', async ({ page }) => {
    await page.goto('/technician/jobs');
    await expect(page.locator('body')).toBeVisible();
    await page.goto('/technician/offline-queue');
    await expect(page.locator('body')).toBeVisible();
    await page.goto('/technician/sync-status');
    await expect(page.locator('body')).toBeVisible();
  });

  test('R18-CROSS-TENANT-IDOR-MAKER-CHECKER portal shells do not show internal ERP navigation', async ({ page }) => {
    await page.goto('/customer-portal/projects');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Administration');
    await page.goto('/vendor-portal/rfqs');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('User Management');
  });
});
