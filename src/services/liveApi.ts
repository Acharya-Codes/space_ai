import type { ApiService, AnalysisConfig, AnalysisResponse, BenchmarksResponse, HealthResponse, ModelMetadata } from '../types/api';
import { ApiError, readJsonResponse } from './errors';
import { parseAnalysis, parseBenchmarks, parseHealth, parseModels } from './validation';

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

async function fetchJson(url: string, signal?: AbortSignal, baseUrl?: string): Promise<unknown> {
  if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) {
    throw new ApiError('VITE_API_BASE_URL must be an absolute HTTP(S) URL in live mode.');
  }
  let response: Response;
  try {
    response = await fetch(url, { method: 'GET', signal, headers: { Accept: 'application/json' } });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new TypeError('Network request failed.');
  }
  return readJsonResponse(response);
}

export function createLiveApi(baseUrl: string): ApiService {
  const normalizedBase = baseUrl.replace(/\/+$/, '');

  return {
    mode: 'live',
    baseUrl: normalizedBase,
    async getHealth(signal?: AbortSignal): Promise<HealthResponse> {
      return parseHealth(await fetchJson(joinUrl(normalizedBase, '/api/health'), signal, normalizedBase));
    },
    async getModels(signal?: AbortSignal): Promise<ModelMetadata[]> {
      return parseModels(await fetchJson(joinUrl(normalizedBase, '/api/models'), signal, normalizedBase));
    },
    async analyzeImage(file: File, config: AnalysisConfig, signal: AbortSignal): Promise<AnalysisResponse> {
      if (!/^https?:\/\//i.test(normalizedBase)) throw new ApiError('VITE_API_BASE_URL must be an absolute HTTP(S) URL in live mode.');
      const body = new FormData();
      body.append('file', file, file.name);
      body.append('model_id', config.modelId);
      body.append('noise_type', config.noiseType);
      if (config.noiseType === 'gaussian' && config.noiseStd !== undefined) body.append('noise_std', String(config.noiseStd));
      if (config.noiseType === 'salt_pepper' && config.corruptionProbability !== undefined) body.append('corruption_probability', String(config.corruptionProbability));
      if (config.noiseType === 'band_dropout' && config.dropoutChannel) body.append('dropout_channel', config.dropoutChannel);
      if (config.seed !== undefined) body.append('seed', String(config.seed));

      let response: Response;
      try {
        response = await fetch(joinUrl(normalizedBase, '/api/analyze'), {
          method: 'POST',
          body,
          signal,
          headers: { Accept: 'application/json' },
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') throw error;
        throw new TypeError('Network request failed.');
      }
      return parseAnalysis(await readJsonResponse(response));
    },
    async getBenchmarks(signal?: AbortSignal): Promise<BenchmarksResponse> {
      return parseBenchmarks(await fetchJson(joinUrl(normalizedBase, '/api/benchmarks'), signal, normalizedBase));
    },
  };
}
