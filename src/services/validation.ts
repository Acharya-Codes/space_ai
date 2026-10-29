import type {
  AnalysisResponse,
  BenchmarksResponse,
  DecisionAction,
  HealthResponse,
  ModelMetadata,
  NumericRange,
  NoiseType,
} from '../types/api';
import { ApiError } from './errors';

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function optionalNullableFiniteNumber(value: unknown, field: string): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  throw new ApiError(`The API response field ${field} must be a finite number or null when supplied.`);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

const noiseTypes: NoiseType[] = ['none', 'gaussian', 'salt_pepper', 'band_dropout'];
const decisions: DecisionAction[] = ['downlink', 'drop', 'review'];

export function parseHealth(payload: unknown): HealthResponse {
  if (!record(payload) || !nonEmptyString(payload.status) || !nonEmptyString(payload.service) || !nonEmptyString(payload.version)) {
    throw new ApiError('The health endpoint returned an unexpected response. Expected status, service, and version strings.');
  }
  return { status: payload.status, service: payload.service, version: payload.version };
}

function parseRange(value: unknown): NumericRange | undefined {
  if (!record(value)) return undefined;
  if (!isNumber(value.min) || !isNumber(value.max) || !isNumber(value.step) || !isNumber(value.default)) return undefined;
  if (value.min > value.max || value.step <= 0 || value.default < value.min || value.default > value.max) return undefined;
  return {
    min: value.min,
    max: value.max,
    step: value.step,
    default: value.default,
    ...(typeof value.units === 'string' ? { units: value.units } : {}),
  };
}

export function parseModels(payload: unknown): ModelMetadata[] {
  if (!record(payload) || !Array.isArray(payload.models)) {
    throw new ApiError('The models endpoint returned an unexpected response. Expected a models array.');
  }
  return payload.models.map((item, index): ModelMetadata => {
    if (!record(item) || !nonEmptyString(item.id) || !nonEmptyString(item.name) || !nonEmptyString(item.version) || typeof item.available !== 'boolean') {
      throw new ApiError(`The models endpoint returned invalid model metadata at index ${index}.`);
    }
    if (!Array.isArray(item.tasks) || !item.tasks.every(nonEmptyString)) {
      throw new ApiError(`Model ${item.id} has an invalid tasks array.`);
    }
    if (!record(item.input) || !isNumber(item.input.width) || !isNumber(item.input.height) || !isNumber(item.input.channels)) {
      throw new ApiError(`Model ${item.id} has invalid or missing input dimensions.`);
    }
    let noise: ModelMetadata['noise'];
    if (record(item.noise)) {
      if (!Array.isArray(item.noise.supported_types) || !item.noise.supported_types.every((type): type is NoiseType => typeof type === 'string' && noiseTypes.includes(type as NoiseType))) {
        throw new ApiError(`Model ${item.id} has invalid noise metadata.`);
      }
      const dropout = item.noise.dropout_channels;
      if (dropout !== undefined && (!Array.isArray(dropout) || !dropout.every((channel) => channel === 'R' || channel === 'G' || channel === 'B'))) {
        throw new ApiError(`Model ${item.id} has invalid dropout channel metadata.`);
      }
      noise = {
        supported_types: item.noise.supported_types as NoiseType[],
        gaussian_std: parseRange(item.noise.gaussian_std),
        corruption_probability: parseRange(item.noise.corruption_probability),
        dropout_channels: dropout as Array<'R' | 'G' | 'B'> | undefined,
        seed_supported: typeof item.noise.seed_supported === 'boolean' ? item.noise.seed_supported : undefined,
      };
    }
    return {
      id: item.id,
      name: item.name,
      version: item.version,
      available: item.available,
      tasks: item.tasks,
      input: { width: item.input.width, height: item.input.height, channels: item.input.channels },
      ...(noise ? { noise } : {}),
    };
  });
}

function parseStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new ApiError(`The analysis response has an invalid ${field} field.`);
  }
  return value;
}

export function parseAnalysis(payload: unknown): AnalysisResponse {
  if (!record(payload) || !nonEmptyString(payload.request_id) || !record(payload.model) || !nonEmptyString(payload.model.id) || !nonEmptyString(payload.model.version)) {
    throw new ApiError('The analysis endpoint returned an unexpected response. Request ID and model metadata are required.');
  }
  if (!record(payload.prediction) || !record(payload.decision) || !record(payload.timing) || !record(payload.artifacts)) {
    throw new ApiError('The analysis endpoint response is missing prediction, decision, timing, or artifacts.');
  }
  const prediction = payload.prediction;
  const task = prediction.task === undefined ? null : prediction.task;
  const label = prediction.label === undefined ? null : prediction.label;
  if (!(task === null || typeof task === 'string') || !(label === null || typeof label === 'string')) {
    throw new ApiError('The analysis response has invalid prediction task or label fields.');
  }
  const confidence = optionalNullableFiniteNumber(prediction.confidence, 'prediction.confidence');
  if (typeof confidence === 'number' && (confidence < 0 || confidence > 1)) {
    throw new ApiError('The backend supplied an invalid confidence value; expected null or a finite number from 0 to 1.');
  }
  if (prediction.class_scores !== undefined && !Array.isArray(prediction.class_scores)) throw new ApiError('The analysis response class_scores field must be an array when supplied.');
  const classScores = (Array.isArray(prediction.class_scores) ? prediction.class_scores : []).map((score, index) => {
    if (!record(score) || !nonEmptyString(score.label) || !isNumber(score.score)) {
      throw new ApiError(`The analysis response contains invalid class_scores entry ${index}.`);
    }
    return { label: score.label, score: score.score };
  });
  if (typeof payload.decision.action !== 'string' || !decisions.includes(payload.decision.action as DecisionAction)) {
    throw new ApiError('The analysis response contains an invalid decision action.');
  }
  const decisionReason = payload.decision.reason === undefined ? null : payload.decision.reason;
  if (!(decisionReason === null || typeof decisionReason === 'string')) {
    throw new ApiError('The analysis response has an invalid decision reason.');
  }
  const preprocessingMs = optionalNullableFiniteNumber(payload.timing.preprocessing_ms, 'timing.preprocessing_ms');
  const inferenceMs = optionalNullableFiniteNumber(payload.timing.inference_ms, 'timing.inference_ms');
  for (const key of ['processed_image_url', 'explanation_image_url', 'explanation_method'] as const) {
    if (!(payload.artifacts[key] === undefined || payload.artifacts[key] === null || typeof payload.artifacts[key] === 'string')) {
      throw new ApiError(`The analysis response has an invalid artifacts.${key} field.`);
    }
  }
  return {
    request_id: payload.request_id,
    model: { id: payload.model.id, version: payload.model.version },
    prediction: {
      task,
      label,
      confidence,
      score_kind: typeof prediction.score_kind === 'string' ? prediction.score_kind : 'unknown',
      class_scores: classScores,
    },
    decision: { action: payload.decision.action as DecisionAction, reason: decisionReason },
    timing: { preprocessing_ms: preprocessingMs, inference_ms: inferenceMs },
    artifacts: {
      processed_image_url: typeof payload.artifacts.processed_image_url === 'string' ? payload.artifacts.processed_image_url : null,
      explanation_image_url: typeof payload.artifacts.explanation_image_url === 'string' ? payload.artifacts.explanation_image_url : null,
      explanation_method: typeof payload.artifacts.explanation_method === 'string' ? payload.artifacts.explanation_method : null,
    },
    warnings: payload.warnings === undefined ? [] : parseStringArray(payload.warnings, 'warnings'),
  };
}

export function parseBenchmarks(payload: unknown): BenchmarksResponse {
  if (!record(payload) || !nonEmptyString(payload.source_label) || !['technical_note', 'backend_evaluation'].includes(String(payload.source_kind)) || !Array.isArray(payload.notes) || !payload.notes.every((note) => typeof note === 'string') || !Array.isArray(payload.rows)) {
    throw new ApiError('The benchmarks endpoint returned an invalid response shape.');
  }
  const rows = payload.rows.map((row, index) => {
    if (!record(row) || !nonEmptyString(row.model_id) || !nonEmptyString(row.model)) {
      throw new ApiError(`The benchmarks endpoint returned an invalid row at index ${index}.`);
    }
    const numericFields = ['footprint_mb', 'cpu_latency_ms', 'clean_f1_percent', 'gaussian_f1_percent', 'salt_pepper_f1_percent', 'band_dropout_f1_percent'] as const;
    const numericValues = Object.fromEntries(numericFields.map((field) => [field, optionalNullableFiniteNumber(row[field], `rows[${index}].${field}`)])) as Record<(typeof numericFields)[number], number | null>;
    return {
      model_id: row.model_id,
      model: row.model,
      footprint_mb: numericValues.footprint_mb,
      cpu_latency_ms: numericValues.cpu_latency_ms,
      clean_f1_percent: numericValues.clean_f1_percent,
      gaussian_f1_percent: numericValues.gaussian_f1_percent,
      salt_pepper_f1_percent: numericValues.salt_pepper_f1_percent,
      band_dropout_f1_percent: numericValues.band_dropout_f1_percent,
    };
  });
  return {
    source_label: payload.source_label,
    source_kind: payload.source_kind as BenchmarksResponse['source_kind'],
    notes: payload.notes as string[],
    rows,
  };
}
