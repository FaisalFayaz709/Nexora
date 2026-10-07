import { API_BASE_PATH } from '@nexora/shared';
export const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? `http://localhost:3001${API_BASE_PATH}`;
