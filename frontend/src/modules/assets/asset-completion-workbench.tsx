'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';

type AssetRow = {
  id: string;
  assetNo: string;
  status: string;
  customerId: string;
  siteId: string;
  projectId: string;
  installedAt?: string | null;
  qrTag?: { generatedAt?: string; expiresAt?: string | null; revokedAt?: string | null } | null;
};

const lifecycleControls = [
  'Register serial stock as customer asset',
  'Install with site/project/technician proof',
  'Generate and rotate hashed QR token',
  'Revoke old QR on replacement or retirement',
  'Append asset history for warranty, RMA, service and maintenance',
  'Block mutation after REPLACED or RETIRED state',
];

function EvidenceCard({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-2 break-words text-sm font-semibold text-slate-900">{String(value ?? '—')}</div>
    </div>
  );
}

export function AssetCompletionWorkbench() {
  const [assetId, setAssetId] = useState('');
  const [lastQrToken, setLastQrToken] = useState('');
  const queryClient = useQueryClient();

  const assets = useQuery({
    queryKey: ['m12-assets'],
    queryFn: () => apiRequest<{ data: AssetRow[] }>('/assets?page=1&pageSize=25'),
  });

  const selectedAsset = useMemo(
    () => (assets.data?.data ?? []).find((item) => item.id === assetId),
    [assets.data?.data, assetId],
  );

  const history = useQuery({
    queryKey: ['m12-asset-history', assetId],
    enabled: Boolean(assetId),
    queryFn: () => apiRequest<any>(`/assets/${assetId}/history?page=1&pageSize=50`),
  });

  const rotateQr = useMutation({
    mutationFn: () => apiRequest<{ data: { token: string } }>(`/assets/${assetId}/qr/rotate`, {
      method: 'POST',
      body: JSON.stringify({ ttlDays: 365 }),
    }),
    onSuccess: async (result) => {
      setLastQrToken(result.data.token);
      await queryClient.invalidateQueries({ queryKey: ['m12-assets'] });
      await queryClient.invalidateQueries({ queryKey: ['m12-asset-history', assetId] });
    },
  });

  const resolveQr = useQuery({
    queryKey: ['m12-resolve-qr', lastQrToken],
    enabled: Boolean(lastQrToken),
    queryFn: () => apiRequest<any>(`/asset-qr/${lastQrToken}`),
  });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Asset Completion Workbench</h1>
        <p className="mt-2 max-w-4xl text-sm text-slate-600">
          M12 workbench for proving the locked asset lifecycle: serialized stock registration,
          installation, QR rotation, replacement QR revocation, retirement, warranty, RMA,
          service history and maintenance history. Commands still require backend RBAC and tenant guards.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <label htmlFor="asset" className="text-sm font-medium text-slate-700">Asset under test</label>
        <select
          id="asset"
          className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
          value={assetId}
          onChange={(event) => {
            setAssetId(event.target.value);
            setLastQrToken('');
          }}
        >
          <option value="">Select asset</option>
          {(assets.data?.data ?? []).map((asset) => (
            <option key={asset.id} value={asset.id}>{asset.assetNo} — {asset.status}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <EvidenceCard title="Asset" value={selectedAsset?.assetNo} />
        <EvidenceCard title="Status" value={selectedAsset?.status} />
        <EvidenceCard title="Site" value={selectedAsset?.siteId} />
        <EvidenceCard title="Installed" value={selectedAsset?.installedAt} />
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-900">QR evidence</h2>
            <p className="mt-1 text-xs text-slate-500">
              Raw token is exposed only after rotation. Persisted token is server-side SHA-256 hash.
              Replacement and retirement must revoke the old active QR.
            </p>
          </div>
          <button
            type="button"
            disabled={!assetId || rotateQr.isPending || selectedAsset?.status === 'RETIRED'}
            onClick={() => rotateQr.mutate()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Rotate QR
          </button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <EvidenceCard title="Generated" value={selectedAsset?.qrTag?.generatedAt} />
          <EvidenceCard title="Expires" value={selectedAsset?.qrTag?.expiresAt} />
          <EvidenceCard title="Revoked" value={selectedAsset?.qrTag?.revokedAt} />
        </div>
        {lastQrToken ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <EvidenceCard title="Fresh raw token" value={lastQrToken} />
            <EvidenceCard title="Resolved asset" value={resolveQr.data?.data?.assetNo ?? resolveQr.data?.data?.id} />
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">M12 locked controls</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            {lifecycleControls.map((control) => <li key={control}>• {control}</li>)}
          </ul>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Recent asset history</h2>
          <div className="mt-4 space-y-3">
            {(history.data?.data ?? []).slice(0, 8).map((event: any) => (
              <div key={event.id} className="rounded-lg border p-3 text-sm">
                <div className="font-medium text-slate-900">{event.eventType}</div>
                <div className="text-xs text-slate-500">
                  {event.oldStatus ?? '—'} → {event.newStatus ?? '—'} · {event.referenceType ?? 'no reference'}
                </div>
              </div>
            ))}
            {assetId && !(history.data?.data ?? []).length ? (
              <div className="text-sm text-slate-500">No history events returned for this asset.</div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
