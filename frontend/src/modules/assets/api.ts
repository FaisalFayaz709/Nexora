import { apiGet, type ApiQueryParams } from '@/lib/api-client';
import { createCrudResourceApi, createModuleQueryKeys, postCommand } from '@/lib/module-api';

export type ListFilters = ApiQueryParams;
export type CreateInput = Record<string, unknown>;
export type UpdateInput = Record<string, unknown>;
export type CommandInput = Record<string, unknown>;

export const assetsEndpoints = {
  assets: '/assets',
  registerAssetFromStock: '/assets/register-from-stock',
  installAsset: (id: string) => `/assets/${id}/install`,
  replaceAsset: (id: string) => `/assets/${id}/replace`,
  retireAsset: (id: string) => `/assets/${id}/retire`,
  rotateAssetQr: (id: string) => `/assets/${id}/qr/rotate`,
  createAssetRma: (id: string) => `/assets/${id}/rma`,
} as const;

export const assetsKeys = createModuleQueryKeys('assets', { assets: 'assets' });

export const assetsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(assetsEndpoints.assets);

export function registerAssetFromStock(body?: CommandInput, idempotencyKey?: string) { return postCommand(assetsEndpoints.registerAssetFromStock, body, idempotencyKey); }
export function installAsset(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(assetsEndpoints.installAsset(id), body, idempotencyKey); }
export function replaceAsset(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(assetsEndpoints.replaceAsset(id), body, idempotencyKey); }
export function retireAsset(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(assetsEndpoints.retireAsset(id), body, idempotencyKey); }
export function rotateAssetQr(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(assetsEndpoints.rotateAssetQr(id), body, idempotencyKey); }
export function createAssetRma(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(assetsEndpoints.createAssetRma(id), body, idempotencyKey); }

export function getAssetHistory(id: string) { return apiGet(`${assetsEndpoints.assets}/${id}/history`); }
export function resolveAssetQr(token: string) { return apiGet(`/asset-qr/${token}`); }

export const AssetsApiRegistry = { endpoints: assetsEndpoints, keys: assetsKeys } as const;
