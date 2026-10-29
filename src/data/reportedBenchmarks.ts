import type { BenchmarkRow, BenchmarksResponse } from '../types/api';

/** Values transcribed from the supplied technical note; they are not live measurements. */
export const reportedStudyContext = {
  inputWidth: 64,
  inputHeight: 64,
  inputChannels: 3,
  evaluationPatchCount: 2000,
  approximateModelFootprintConstraintMb: 5,
  approximateCpuLatencyConstraintMs: 10,
  int8MobileNetModelId: 'mobilenetv2_int8',
  fp32MobileNetModelId: 'mobilenetv2_fp32',
};

export const reportedBenchmarkRows: BenchmarkRow[] = [
  {
    model_id: 'resnet18',
    model: 'ResNet-18 baseline',
    footprint_mb: 44.70,
    cpu_latency_ms: 18.40,
    clean_f1_percent: 93.1,
    gaussian_f1_percent: 64.2,
    salt_pepper_f1_percent: 58.0,
    band_dropout_f1_percent: 51.5,
  },
  {
    model_id: 'custom_resnet8_fp32',
    model: 'Custom ResNet-8 FP32',
    footprint_mb: 4.80,
    cpu_latency_ms: 5.10,
    clean_f1_percent: 89.4,
    gaussian_f1_percent: 71.5,
    salt_pepper_f1_percent: 68.3,
    band_dropout_f1_percent: 62.0,
  },
  {
    model_id: 'mobilenetv2_fp32',
    model: 'MobileNetV2 α=0.5 FP32',
    footprint_mb: 2.25,
    cpu_latency_ms: 4.20,
    clean_f1_percent: 91.5,
    gaussian_f1_percent: 78.4,
    salt_pepper_f1_percent: 74.1,
    band_dropout_f1_percent: 70.1,
  },
  {
    model_id: 'mobilenetv2_int8',
    model: 'MobileNetV2 α=0.5 INT8',
    footprint_mb: 0.65,
    cpu_latency_ms: 2.10,
    clean_f1_percent: 90.8,
    gaussian_f1_percent: 77.9,
    salt_pepper_f1_percent: 73.6,
    band_dropout_f1_percent: 69.5,
  },
];

export const reportedBenchmarks: BenchmarksResponse = {
  source_label: 'Reported in supplied technical note; not independently reproduced by this website.',
  source_kind: 'technical_note',
  notes: [
    `The note reports evaluation on a ${reportedStudyContext.evaluationPatchCount.toLocaleString()}-patch test set.`,
    'CPU latency is reported as averaged across 1,000 iterations; exact CPU model and inference runtime are not fully specified.',
    'Detailed noise severities for the benchmark rows are not fully documented.',
    'Reported model footprint is not a measurement of peak runtime RAM.',
  ],
  rows: reportedBenchmarkRows,
};
