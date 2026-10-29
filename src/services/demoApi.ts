import { reportedBenchmarks } from '../data/reportedBenchmarks';
import { createDemoResult, demoModels } from '../data/demoFixtures';
import type { ApiService, AnalysisConfig, AnalysisResponse, BenchmarksResponse, HealthResponse, ModelMetadata } from '../types/api';
import { ApiError } from './errors';

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('The request was aborted.', 'AbortError'));
      return;
    }
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      reject(new DOMException('The request was aborted.', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export const demoApi: ApiService = {
  mode: 'demo',
  baseUrl: '',
  async getHealth(): Promise<HealthResponse> {
    return { status: 'demo', service: 'orbitlens-demo-fixtures', version: 'demo' };
  },
  async getModels(): Promise<ModelMetadata[]> {
    return demoModels.map((model) => ({ ...model, tasks: [...model.tasks], input: { ...model.input }, noise: model.noise ? { ...model.noise, supported_types: [...model.noise.supported_types] } : undefined }));
  },
  async analyzeImage(_file: File, config: AnalysisConfig, signal: AbortSignal): Promise<AnalysisResponse> {
    await wait(850, signal);
    if (signal.aborted) throw new DOMException('The request was aborted.', 'AbortError');
    const model = demoModels.find((item) => item.id === config.modelId && item.available);
    if (!model) throw new ApiError('The selected model is not available in demo metadata.');
    return createDemoResult(model);
  },
  async getBenchmarks(): Promise<BenchmarksResponse> {
    return { ...reportedBenchmarks, notes: [...reportedBenchmarks.notes], rows: reportedBenchmarks.rows.map((row) => ({ ...row })) };
  },
};
