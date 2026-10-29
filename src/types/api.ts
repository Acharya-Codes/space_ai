export type DataMode = 'demo' | 'live';
export type NoiseType = 'none' | 'gaussian' | 'salt_pepper' | 'band_dropout';
export type DecisionAction = 'downlink' | 'drop' | 'review';
export type ScoreKind = 'calibrated_probability' | 'uncalibrated' | 'logit' | 'unknown' | string;

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}

export interface NumericRange {
  min: number;
  max: number;
  step: number;
  default: number;
  units?: string;
}

export interface NoiseMetadata {
  supported_types: NoiseType[];
  gaussian_std?: NumericRange;
  corruption_probability?: NumericRange;
  dropout_channels?: Array<'R' | 'G' | 'B'>;
  seed_supported?: boolean;
}

export interface ModelMetadata {
  id: string;
  name: string;
  version: string;
  available: boolean;
  tasks: string[];
  input: {
    width: number;
    height: number;
    channels: number;
  };
  noise?: NoiseMetadata;
}

export interface ClassScore {
  label: string;
  score: number;
}

export interface Prediction {
  task: string | null;
  label: string | null;
  confidence: number | null;
  score_kind?: ScoreKind;
  class_scores: ClassScore[];
}

export interface Decision {
  action: DecisionAction;
  reason: string | null;
}

export interface Timing {
  preprocessing_ms: number | null;
  inference_ms: number | null;
}

export interface Artifacts {
  processed_image_url: string | null;
  explanation_image_url: string | null;
  explanation_method: string | null;
}

export interface AnalysisResponse {
  request_id: string;
  model: {
    id: string;
    version: string;
  };
  prediction: Prediction;
  decision: Decision;
  timing: Timing;
  artifacts: Artifacts;
  warnings: string[];
}

export interface AnalysisConfig {
  modelId: string;
  noiseType: NoiseType;
  noiseStd?: number;
  corruptionProbability?: number;
  dropoutChannel?: 'R' | 'G' | 'B';
  seed?: number;
}

export interface BenchmarkRow {
  model_id: string;
  model: string;
  footprint_mb: number | null;
  cpu_latency_ms: number | null;
  clean_f1_percent: number | null;
  gaussian_f1_percent: number | null;
  salt_pepper_f1_percent: number | null;
  band_dropout_f1_percent: number | null;
}

export interface BenchmarksResponse {
  source_label: string;
  source_kind: 'technical_note' | 'backend_evaluation';
  notes: string[];
  rows: BenchmarkRow[];
}

export interface ApiService {
  readonly mode: DataMode;
  readonly baseUrl: string;
  getHealth(signal?: AbortSignal): Promise<HealthResponse>;
  getModels(signal?: AbortSignal): Promise<ModelMetadata[]>;
  analyzeImage(file: File, config: AnalysisConfig, signal: AbortSignal): Promise<AnalysisResponse>;
  getBenchmarks(signal?: AbortSignal): Promise<BenchmarksResponse>;
}

export interface CompletedAnalysis {
  result: AnalysisResponse;
  config: AnalysisConfig;
  sourceMode: DataMode;
  browserRequestMs: number;
  key: string;
  file: {
    name: string;
    size: number;
    type: string;
  };
}
