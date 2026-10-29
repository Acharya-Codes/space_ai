import type { AnalysisConfig, ModelMetadata, NoiseType } from '../types/api';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = '10 MiB';

export interface FileValidationResult {
  valid: boolean;
  message?: string;
}

export function validateUploadFile(file: File): FileValidationResult {
  if (file.size <= 0) return { valid: false, message: 'The selected file is empty.' };
  if (file.size > MAX_UPLOAD_BYTES) return { valid: false, message: `File exceeds the proposed ${MAX_UPLOAD_LABEL} frontend upload limit.` };
  const name = file.name.toLowerCase();
  const extensionIsSupported = name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg');
  const typeIsSupported = file.type === 'image/png' || file.type === 'image/jpeg';
  if (!extensionIsSupported || (file.type !== '' && !typeIsSupported)) {
    return { valid: false, message: 'Choose a PNG or JPEG image. Browser file metadata is only a convenience check, not a security guarantee.' };
  }
  return { valid: true };
}

export function inspectImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const result = { width: image.naturalWidth, height: image.naturalHeight };
      URL.revokeObjectURL(objectUrl);
      if (result.width < 1 || result.height < 1) reject(new Error('The selected file does not contain a decodable image.'));
      else resolve(result);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('The selected file could not be decoded as a PNG or JPEG image.'));
    };
    image.src = objectUrl;
  });
}

export function isRangeValueValid(value: number, range: { min: number; max: number; step?: number } | undefined): boolean {
  if (!range || !Number.isFinite(value) || value < range.min || value > range.max) return false;
  if (range.step === undefined || range.step <= 0) return true;
  const increments = (value - range.min) / range.step;
  return Math.abs(increments - Math.round(increments)) < 1e-7;
}

export function validateAnalysisConfig(config: AnalysisConfig, model: ModelMetadata | undefined, seedInput: string): string[] {
  const issues: string[] = [];
  if (!model) return ['Select a model with metadata from the API.'];
  if (!model.available) issues.push('The selected model is not available according to the API.');
  if (!model.noise || !Array.isArray(model.noise.supported_types)) issues.push('Required noise metadata is missing.');
  if (model.noise && !model.noise.supported_types.includes(config.noiseType as NoiseType)) issues.push('The selected noise type is not supported by this model.');
  if (config.noiseType === 'gaussian' && !isRangeValueValid(config.noiseStd ?? Number.NaN, model.noise?.gaussian_std)) {
    issues.push('Gaussian standard deviation is missing or outside the backend-provided range.');
  }
  if (config.noiseType === 'salt_pepper' && !isRangeValueValid(config.corruptionProbability ?? Number.NaN, model.noise?.corruption_probability)) {
    issues.push('Corruption probability is missing or outside the backend-provided range.');
  }
  if (config.noiseType === 'band_dropout' && (!config.dropoutChannel || !model.noise?.dropout_channels?.includes(config.dropoutChannel))) {
    issues.push('Choose a supported RGB channel for band dropout.');
  }
  if (seedInput.trim() !== '' && config.noiseType !== 'none') {
    const value = Number(seedInput);
    if (!model.noise?.seed_supported) issues.push('This model does not advertise seed support.');
    else if (!Number.isInteger(value) || !Number.isFinite(value)) issues.push('Random seed must be an integer.');
    else if (value < -2147483648 || value > 2147483647) issues.push('Random seed must be between -2147483648 and 2147483647.');
  }
  return issues;
}

export function buildAnalysisConfig(input: {
  model: ModelMetadata;
  noiseType: NoiseType;
  gaussianStd: string;
  corruptionProbability: string;
  dropoutChannel: 'R' | 'G' | 'B';
  seed: string;
}): AnalysisConfig {
  const config: AnalysisConfig = { modelId: input.model.id, noiseType: input.noiseType };
  if (input.noiseType === 'gaussian') config.noiseStd = input.gaussianStd.trim() ? Number(input.gaussianStd) : Number.NaN;
  if (input.noiseType === 'salt_pepper') config.corruptionProbability = input.corruptionProbability.trim() ? Number(input.corruptionProbability) : Number.NaN;
  if (input.noiseType === 'band_dropout') config.dropoutChannel = input.dropoutChannel;
  if (input.seed.trim() !== '' && input.noiseType !== 'none' && input.model.noise?.seed_supported) config.seed = Number(input.seed);
  return config;
}
