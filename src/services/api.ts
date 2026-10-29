import type { ApiService, DataMode } from '../types/api';
import { demoApi } from './demoApi';
import { createLiveApi } from './liveApi';

const requestedMode = (import.meta.env.VITE_DATA_MODE ?? 'demo').trim().toLowerCase();
export const dataMode: DataMode = requestedMode === 'live' ? 'live' : 'demo';
export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim() || 'http://localhost:8000';

/** There is intentionally no runtime live-to-demo fallback. */
export const api: ApiService = dataMode === 'live' ? createLiveApi(apiBaseUrl) : demoApi;
