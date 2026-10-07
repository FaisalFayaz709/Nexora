'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';

type AssetRow = {
  id: string;
  assetNo: string;
  productId: string;
  customerId: string;
  siteId: string;
  projectId: string;
  status: string;
  installedAt?: string | null;
};

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 break-words text-sm font-medium text-slate-900">{String(value ?? '—')}</div>
    </div>
  );
}

function RouteCard({ title, route, note }: { title: string; route: string; note: string }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="font-medium text-slate-900">{title}</div>
      <code className="mt-2 block rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">{route}</code>
      <p className="mt-2 text-xs text-slate-500">{note}</p>
    </div>
  );
}

export function AssetLifecycleDashboard() {
  const [assetId, setAssetId] = useState('');
  const [qrToken, setQrToken] = useState('');
  const queryClient = useQueryClient();

  const assets = useQuery({
    queryKey: ['c7-assets'],
    queryFn: () => apiRequest<{ data: AssetRow[] }>('/assets?page=1&pageSize=10'),
  });

  const asset = useQuery({
    queryKey: ['c7-asset-detail', assetId],
    enabled: Boolean(assetId),
    queryFn: () => apiRequest<any>(`/assets/${assetId}`),
  });

  const history = useQuery({
    queryKey: ['c7-asset-history', assetId],
    enabled: Boolean(assetId),
    queryFn: () => apiRequest<any>(`/assets/${assetId}/history?page=1&pageSize=25`),
  });

  const rotateQr = useMutation({
    mutationFn: () => apiRequest<{ data: { token: string } }>(`/assets/${assetId}/qr/rotate`, {
      method: 'POST',
      body: JSON.stringify({ ttlDays: 365 }),
    }),
    onSuccess: async (result) => {
      setQrToken(result.data.token);
      await queryClient.invalidateQueries({ queryKey: ['c7-asset-detail', assetId] });
      await queryClient.invalidateQueries({ queryKey: ['c7-asset-history', assetId] });
    },
  });

  const resolvedQr = useQuery({
    queryKey: ['c7-asset-qr-resolve', qrToken],
    enabled: Boolean(qrToken),
    queryFn: () => apiRequest<any>(`/asset-qr/${qrToken}`),
  });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Asset Lifecycle & QR Tracking</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          C7 workbench for the locked asset chain: serial stock to asset registration,
          project/site installation, QR generation and rotation, warranty traceability,
          replacement, RMA, retirement and append-only lifecycle history.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <label className="text-sm font-medium text-slate-700" htmlFor="asset-id">Asset</label>
        <select
          id="asset-id"
          value={assetId}
          onChange={(event) => {
            setAssetId(event.target.value);
            setQrToken('');
          }}
          className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">Select an asset to inspect lifecycle and QR state</option>
          {(assets.data?.data ?? []).map((row) => (
            <option key={row.id} value={row.id}>
              {row.assetNo} — {row.status} — {row.projectId}
            </option>
          ))}
        </select>
      </div>

      {!assetId ? (
        <div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-slate-500">
          Select an asset to inspect installation, warranty, QR, RMA and retirement evidence.
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Asset no" value={asset.data?.data?.assetNo} />
            <Field label="Status" value={asset.data?.data?.status} />
            <Field label="Serial" value={asset.data?.data?.serialNumber?.serialNo} />
            <Field label="Installed" value={asset.data?.data?.installedAt} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Customer" value={asset.data?.data?.customerId} />
            <Field label="Site" value={asset.data?.data?.siteId} />
            <Field label="Project" value={asset.data?.data?.projectId} />
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold">QR token control</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Raw token is shown only after rotation. The persisted token remains hashed server-side.
                </p>
              </div>
              <button
                type="button"
                disabled={!assetId || rotateQr.isPending}
                onClick={() => rotateQr.mutate()}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Rotate QR
              </button>
            </div>
            {qrToken ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Field label="Fresh QR token" value={qrToken} />
                <Field label="Resolved asset" value={resolvedQr.data?.data?.assetNo ?? resolvedQr.data?.data?.id} />
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="font-semibold">Latest warranty</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Field label="Status" value={asset.data?.data?.warranties?.[0]?.status} />
                <Field label="Vendor" value={asset.data?.data?.warranties?.[0]?.vendorId} />
                <Field label="Start" value={asset.data?.data?.warranties?.[0]?.startsAt} />
                <Field label="Expiry" value={asset.data?.data?.warranties?.[0]?.expiresAt} />
              </div>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="font-semibold">Lifecycle command endpoints</h2>
              <div className="mt-4 grid gap-3">
                <RouteCard title="Register from stock" route="POST /api/v1/assets/register-from-stock" note="Serial stock is locked and linked before asset creation completes." />
                <RouteCard title="Install asset" route="POST /api/v1/assets/:id/install" note="Creates installation evidence, stock transaction, QR and audit in one transaction." />
                <RouteCard title="Replace / Retire / RMA" route="POST /api/v1/assets/:id/replace | /retire | /rma" note="Terminal and vendor-governance checks are enforced by the asset service." />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Asset history continuity</h2>
            <div className="mt-4 space-y-3">
              {(history.data?.data ?? []).map((event: any) => (
                <div key={event.id} className="rounded-lg border p-3 text-sm">
                  <div className="font-medium text-slate-900">{event.eventType}</div>
                  <div className="text-xs text-slate-500">
                    {event.oldStatus ?? '—'} → {event.newStatus ?? '—'} · {event.referenceType ?? 'no reference'} · {String(event.occurredAt ?? '')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
