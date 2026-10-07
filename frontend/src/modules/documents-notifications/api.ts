import { apiGet, type ApiQueryParams } from '@/lib/api-client';
import { createCrudResourceApi, createModuleQueryKeys, postCommand } from '@/lib/module-api';

export type ListFilters = ApiQueryParams;
export type CreateInput = Record<string, unknown>;
export type UpdateInput = Record<string, unknown>;
export type CommandInput = Record<string, unknown>;

export const platformEndpoints = {
  documents: '/documents',
  notifications: '/notifications',
  communications: '/communications',
  requestUploadIntent: '/documents/upload-intent',
  completeUpload: '/documents/complete-upload',
  uploadDocumentVersion: (id: string) => `/documents/${id}/versions`,
  markNotificationRead: (id: string) => `/notifications/${id}/read`,
  markAllNotificationsRead: '/notifications/read-all',
  sendCommunication: '/communications/send',
} as const;

export const platformKeys = createModuleQueryKeys('platform', { documents: 'documents', notifications: 'notifications', communications: 'communications' });

export const documentsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(platformEndpoints.documents);
export const notificationsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(platformEndpoints.notifications);
export const communicationsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(platformEndpoints.communications);

export function requestUploadIntent(body?: CommandInput, idempotencyKey?: string) { return postCommand(platformEndpoints.requestUploadIntent, body, idempotencyKey); }
export function completeUpload(body?: CommandInput, idempotencyKey?: string) { return postCommand(platformEndpoints.completeUpload, body, idempotencyKey); }
export function uploadDocumentVersion(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(platformEndpoints.uploadDocumentVersion(id), body, idempotencyKey); }
export function markNotificationRead(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(platformEndpoints.markNotificationRead(id), body, idempotencyKey); }
export function markAllNotificationsRead(body?: CommandInput, idempotencyKey?: string) { return postCommand(platformEndpoints.markAllNotificationsRead, body, idempotencyKey); }
export function sendCommunication(body?: CommandInput, idempotencyKey?: string) { return postCommand(platformEndpoints.sendCommunication, body, idempotencyKey); }

export function getDocumentDownloadUrl(id: string) { return apiGet(`/documents/${id}/download-url`); }
export function getCommunicationDelivery(id: string) { return apiGet(`/communications/${id}/delivery`); }

export const PlatformApiRegistry = { endpoints: platformEndpoints, keys: platformKeys } as const;
