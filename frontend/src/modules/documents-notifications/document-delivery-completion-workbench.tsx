'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';

type DocumentRow = {
  id: string;
  title: string;
  category: string;
  subjectType: string;
  subjectId?: string | null;
  status: string;
  currentVersionId?: string | null;
};

type CommunicationRow = {
  id: string;
  channel: string;
  recipient: string;
  subject?: string | null;
  status: string;
};

const completionSteps = [
  'Upload intent uses the backend StorageService only and returns a private tenant-prefixed MinIO object key.',
  'Complete upload verifies size, MIME type, checksum and object-key tenant prefix before creating document metadata.',
  'Document versioning updates the current version inside a tenant-scoped transaction and records audit/event evidence.',
  'Download URL generation is short-lived, access-logged and never exposes raw MinIO credentials.',
  'Communication attachments reference Document IDs only; object keys and presigned URLs never enter the message payload.',
  'Email outbox rows carry a tenant idempotency key so worker retries cannot duplicate delivery state.',
  'Notification fan-out dedupes recipients and read/read-all state remains user-scoped.',
  'BullMQ is used only after transactional state commits; stock, money and approval state are never mutated by delivery jobs.',
];

function Badge({ value }: { value: string }) {
  return <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{value}</span>;
}

function EvidenceCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <h3 className="font-medium text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
    </div>
  );
}

export function DocumentDeliveryCompletionWorkbench() {
  const [documentId, setDocumentId] = useState('');
  const [communicationId, setCommunicationId] = useState('');
  const [recipient, setRecipient] = useState('customer@example.com');
  const queryClient = useQueryClient();

  const documents = useQuery({
    queryKey: ['m15-documents'],
    queryFn: () => apiRequest<{ data: DocumentRow[] }>('/documents?page=1&pageSize=15'),
  });

  const communications = useQuery({
    queryKey: ['m15-communications'],
    queryFn: () => apiRequest<{ data: CommunicationRow[] }>('/communications?page=1&pageSize=15'),
  });

  const selectedDocument = useMemo(
    () => (documents.data?.data ?? []).find((row) => row.id === documentId) ?? null,
    [documentId, documents.data],
  );

  const selectedCommunication = useMemo(
    () => (communications.data?.data ?? []).find((row) => row.id === communicationId) ?? null,
    [communicationId, communications.data],
  );

  const downloadUrl = useMutation({
    mutationFn: () => apiRequest(`/documents/${documentId}/download-url`),
  });

  const sendCommunication = useMutation({
    mutationFn: () => apiRequest('/communications/send', {
      method: 'POST',
      body: JSON.stringify({
        subjectType: selectedDocument?.subjectType ?? 'Manual',
        subjectId: selectedDocument?.subjectId ?? undefined,
        channel: 'EMAIL',
        direction: 'OUTBOUND',
        recipient,
        subject: 'NEXORA document communication',
        body: 'Document-related communication generated through the locked communication service.',
        attachments: documentId ? [{ documentId }] : [],
      }),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['m15-communications'] });
    },
  });

  const readAllNotifications = useMutation({
    mutationFn: () => apiRequest('/notifications/read-all', { method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['m15-notifications'] });
    },
  });

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Missing Pass M15</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Documents, MinIO, Notifications & Communication Completion</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
          Completion view for private document storage, versioning, access logs, notification fan-out,
          email outbox idempotency and communication attachment traceability. This page uses the locked
          document, notification and communication APIs without adding any parallel storage or messaging path.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 shadow-sm lg:col-span-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="m15-document">Document</label>
          <select
            id="m15-document"
            value={documentId}
            onChange={(event) => setDocumentId(event.target.value)}
            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Select document</option>
            {(documents.data?.data ?? []).map((row) => (
              <option key={row.id} value={row.id}>
                {row.title} — {row.category} — {row.status}
              </option>
            ))}
          </select>
          {selectedDocument ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge value={`Subject: ${selectedDocument.subjectType}`} />
              <Badge value={`Category: ${selectedDocument.category}`} />
              <Badge value={`Status: ${selectedDocument.status}`} />
              {selectedDocument.currentVersionId ? <Badge value="Current version linked" /> : null}
            </div>
          ) : null}
          <button
            type="button"
            disabled={!documentId || downloadUrl.isPending}
            onClick={() => downloadUrl.mutate()}
            className="mt-4 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            Generate audited short-lived download URL
          </button>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <label className="text-sm font-medium text-slate-700" htmlFor="m15-recipient">Email recipient</label>
          <input
            id="m15-recipient"
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={!recipient || sendCommunication.isPending}
            onClick={() => sendCommunication.mutate()}
            className="mt-4 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            Send traceable email communication
          </button>
          <button
            type="button"
            disabled={readAllNotifications.isPending}
            onClick={() => readAllNotifications.mutate()}
            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
          >
            Mark my notifications read
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="font-semibold text-slate-900">M15 locked workflow</h2>
          <ol className="mt-4 space-y-2 text-sm text-slate-600">
            {completionSteps.map((step) => (
              <li key={step} className="rounded-lg bg-slate-50 p-3">{step}</li>
            ))}
          </ol>
        </div>
        <div className="grid gap-3">
          <EvidenceCard title="Storage boundary" body="The frontend never receives MinIO credentials and backend business modules use StorageService instead of importing the MinIO SDK." />
          <EvidenceCard title="Attachment traceability" body="Communications attach documents by documentId after tenant validation; objectKey and presigned URLs stay out of the communication payload." />
          <EvidenceCard title="EmailOutbox idempotency" body="Email delivery work is represented as an EmailOutbox row with a tenant-scoped idempotency key for retry-safe worker processing." />
          <EvidenceCard title="No critical async mutation" body="Queues may deliver email, notifications, scans, exports and webhooks only after the owning transactional state has committed." />
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Communication delivery evidence</h2>
        <select
          value={communicationId}
          onChange={(event) => setCommunicationId(event.target.value)}
          className="mt-3 w-full rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">Select communication</option>
          {(communications.data?.data ?? []).map((row) => (
            <option key={row.id} value={row.id}>{row.channel} — {row.recipient} — {row.status}</option>
          ))}
        </select>
        {selectedCommunication ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge value={`Channel: ${selectedCommunication.channel}`} />
            <Badge value={`Recipient: ${selectedCommunication.recipient}`} />
            <Badge value={`Status: ${selectedCommunication.status}`} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
