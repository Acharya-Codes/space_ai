import type { AnalysisResponse, ModelMetadata } from '../types/api';

/** All demo metadata is illustrative contract scaffolding, not a claim about a deployed model. */
export const demoModels: ModelMetadata[] = [
  {
    id: 'resnet18',
    name: 'ResNet-18 baseline',
    version: 'demo-1',
    available: true,
    tasks: ['scene'],
    input: { width: 64, height: 64, channels: 3 },
    noise: {
      supported_types: ['none', 'gaussian', 'salt_pepper', 'band_dropout'],
      gaussian_std: { min: 0, max: 0.2, step: 0.01, default: 0.05, units: 'normalized pixel units [0,1]' },
      corruption_probability: { min: 0, max: 0.3, step: 0.01, default: 0.05, units: 'fraction of pixels' },
      dropout_channels: ['R', 'G', 'B'],
      seed_supported: true,
    },
  },
  {
    id: 'custom_resnet8_fp32',
    name: 'Custom ResNet-8 FP32',
    version: 'demo-1',
    available: true,
    tasks: ['scene'],
    input: { width: 64, height: 64, channels: 3 },
    noise: {
      supported_types: ['none', 'gaussian', 'salt_pepper', 'band_dropout'],
      gaussian_std: { min: 0, max: 0.2, step: 0.01, default: 0.05, units: 'normalized pixel units [0,1]' },
      corruption_probability: { min: 0, max: 0.3, step: 0.01, default: 0.05, units: 'fraction of pixels' },
      dropout_channels: ['R', 'G', 'B'],
      seed_supported: true,
    },
  },
  {
    id: 'mobilenetv2_fp32',
    name: 'MobileNetV2 α=0.5 FP32',
    version: 'demo-1',
    available: true,
    tasks: ['scene'],
    input: { width: 64, height: 64, channels: 3 },
    noise: {
      supported_types: ['none', 'gaussian', 'salt_pepper', 'band_dropout'],
      gaussian_std: { min: 0, max: 0.2, step: 0.01, default: 0.05, units: 'normalized pixel units [0,1]' },
      corruption_probability: { min: 0, max: 0.3, step: 0.01, default: 0.05, units: 'fraction of pixels' },
      dropout_channels: ['R', 'G', 'B'],
      seed_supported: true,
    },
  },
  {
    id: 'mobilenetv2_int8',
    name: 'MobileNetV2 α=0.5 INT8',
    version: 'demo-1',
    available: true,
    tasks: ['scene'],
    input: { width: 64, height: 64, channels: 3 },
    noise: {
      supported_types: ['none', 'gaussian', 'salt_pepper', 'band_dropout'],
      gaussian_std: { min: 0, max: 0.2, step: 0.01, default: 0.05, units: 'normalized pixel units [0,1]' },
      corruption_probability: { min: 0, max: 0.3, step: 0.01, default: 0.05, units: 'fraction of pixels' },
      dropout_channels: ['R', 'G', 'B'],
      seed_supported: true,
    },
  },
];

export function createDemoResult(model: ModelMetadata): AnalysisResponse {
  return {
    request_id: `demo-${Date.now().toString(36)}`,
    model: { id: model.id, version: model.version },
    prediction: {
      task: 'scene',
      label: 'Illustrative scene A',
      confidence: null,
      score_kind: 'unknown',
      class_scores: [],
    },
    decision: {
      action: 'review',
      reason: 'Policy not configured. Review is a proposed UI state, not a reported experimental result.',
    },
    timing: { preprocessing_ms: null, inference_ms: null },
    artifacts: {
      processed_image_url: null,
      explanation_image_url: null,
      explanation_method: null,
    },
    warnings: [
      'This result is a fixed demonstration fixture and does not depend on image content.',
      'No image preprocessing or machine-learning inference was performed in the browser.',
    ],
  };
}
