import { expect, test } from '@playwright/test';

const runBrowserE2E = process.env.RUN_BROWSER_E2E === '1' || process.env.RUNTIME_CERTIFICATION === '1';

const criticalRoutes = [
  '/dashboard',
  '/customers',
  '/projects',
  '/procurement/purchase-requests',
  '/procurement/rfqs',
  '/procurement/purchase-orders',
  '/inventory/stock-ledger',
  '/assets',
  '/tickets',
  '/work-orders',
  '/customer-invoices',
  '/supplier-invoices',
  '/reports',
  '/audit-logs',
  '/customer-portal/projects',
  '/vendor-portal/rfqs',
  '/technician/offline-queue',
];

test.describe('PASS_22_TESTING_COMPLETION browser full-lifecycle surfaces', () => {
  test.skip(!runBrowserE2E, 'Set RUN_BROWSER_E2E=1 after the Docker/runtime stack is running. Source-only PASS_22 must not pretend browser E2E ran.');

  test('PASS22-FULL-LIFECYCLE-DASHBOARD-PROFITABILITY routes render without server-only frontend leakage', async ({ page }) => {
    const browserErrors: string[] = [];
    page.on('console', (msg) => { if (msg.type() === 'error') browserErrors.push(msg.text()); });
    for (const route of criticalRoutes) {
      await page.goto(route);
      await expect(page.locator('body')).toBeVisible();
    }
    expect(browserErrors.join('
')).not.toMatch(/PrismaClient|@nexora\/database|MinIO secret|BullMQ|Unhandled Runtime Error/i);
  });

  test('PASS22-PORTAL-SCOPES-OFFLINE-SYNC portal shells stay isolated from internal ERP navigation', async ({ page }) => {
    await page.goto('/customer-portal/projects');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Administration');
    await page.goto('/vendor-portal/rfqs');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('User Management');
    await page.goto('/technician/offline-queue');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).toContainText(/offline|sync|queue/i);
  });
});
