# OrbitLens Proposed API Contract

This document is the frontend/backend handoff contract for the OrbitLens research demonstrator. These endpoints and schemas are proposed integration shapes; they are not proof that a backend, model, or operational policy currently exists.

## Conventions

- Base URL is configured with `VITE_API_BASE_URL` (default example: `http://localhost:8000`).
- JSON endpoints should return `Content-Type: application/json` (or a compatible `+json` media type).
- `POST /api/analyze` uses `multipart/form-data`; do not manually set the multipart content type from the frontend.
- Units: image sizes in pixels; file sizes in bytes/MiB for UI; timing in milliseconds; footprint in MB as the technical note reports it; F1 in percentage points on the 0–100 display scale; confidence, if supplied, is a finite number in `[0, 1]`.
- Missing numeric values should be `null`, not guessed or encoded as strings. Zero is a valid measurement. For resilience, the frontend also normalizes omitted optional numeric, timing, confidence, class-score, warning, reason, and artifact fields to their corresponding empty / `null` states; supplied values with an invalid type are rejected.
- The backend is authoritative for all image validation, image decoding, preprocessing, inference, timing, policy decisions, optional explanation generation, and file retention.
- Do not expose secrets in frontend environment variables. All `VITE_` values are public after build.

## `GET /api/health`

Example response:

```json
{
  "status": "ok",
  "service": "satellite-analysis-api",
  "version": "1.0.0"
}
```

All three fields are non-empty strings. The frontend only shows a live connection as connected after a successful health response whose `status` equals `ok` (case-insensitive). A successful TCP connection alone is not enough.

## `GET /api/models`

Example response (parameter ranges here are illustrative contract examples, not paper benchmark severities):

```json
{
  "models": [
    {
      "id": "mobilenetv2_int8",
      "name": "MobileNetV2 INT8",
      "version": "1.0.0",
      "available": true,
      "tasks": ["scene"],
      "input": { "width": 64, "height": 64, "channels": 3 },
      "noise": {
        "supported_types": ["none", "gaussian", "salt_pepper", "band_dropout"],
        "gaussian_std": {
          "min": 0,
          "max": 0.2,
          "step": 0.01,
          "default": 0.05,
          "units": "normalized pixel units [0,1]"
        },
        "corruption_probability": {
          "min": 0,
          "max": 0.3,
          "step": 0.01,
          "default": 0.05,
          "units": "fraction of pixels"
        },
        "dropout_channels": ["R", "G", "B"],
        "seed_supported": true
      }
    }
  ]
}
```

### Model fields

- `id`: stable machine identifier used as `model_id` in analysis requests.
- `name`: display label.
- `version`: deployed model/artifact version.
- `available`: whether this model may currently be selected for inference. `false` models remain disabled in the selector.
- `tasks`: backend-defined task identifiers. The frontend does not assume a final class taxonomy or that cloud and scene tasks share a model.
- `input.width`, `input.height`, `input.channels`: required input shape metadata. Expected thesis tile shape is 64 × 64 × 3 RGB, but backend values must be explicit.
- `noise.supported_types`: subset of `none`, `gaussian`, `salt_pepper`, and `band_dropout`.
- `gaussian_std`, `corruption_probability`: when applicable, include finite `min`, `max`, positive `step`, valid `default`, and a documented `units` string where meaningful.
- `dropout_channels`: supported channels among `R`, `G`, `B`.
- `seed_supported`: whether the request may include an integer `seed`.

The frontend enables Run Analysis only when a selected model is marked available and the required metadata for the selected noise type is present and valid. It uses the live API's ranges/defaults in live mode. The illustrative defaults in the demo service are not claimed to be study evaluation severities.

## `POST /api/analyze`

Request format: `multipart/form-data`.

### Fields

| Field | Type | Sent when | Meaning / units |
|---|---|---|---|
| `file` | file | Always | One PNG or JPEG upload. Backend validates contents, MIME/type, size, and decodability independently. |
| `model_id` | string | Always | `id` of a model advertised as available by `/api/models`. |
| `noise_type` | enum | Always | `none`, `gaussian`, `salt_pepper`, or `band_dropout`. |
| `noise_std` | finite number string | Gaussian only | Standard deviation, using units advertised by the selected model. |
| `corruption_probability` | finite number string | Salt-and-pepper only | Fraction/probability using the model's documented range. |
| `dropout_channel` | enum | Band dropout only | `R`, `G`, or `B`, limited by `dropout_channels`. |
| `seed` | integer string | Optional, only when supported and supplied | Signed 32-bit integer. Backend must document determinism behavior. |

The frontend omits irrelevant noise fields. It does not set `Content-Type` for `FormData`; the browser adds the multipart boundary.

### Proposed response

```json
{
  "request_id": "request-id",
  "model": {
    "id": "mobilenetv2_int8",
    "version": "1.0.0"
  },
  "prediction": {
    "task": "scene",
    "label": "backend-defined-label",
    "confidence": null,
    "score_kind": "uncalibrated",
    "class_scores": []
  },
  "decision": {
    "action": "review",
    "reason": "Decision policy is not configured."
  },
  "timing": {
    "preprocessing_ms": null,
    "inference_ms": null
  },
  "artifacts": {
    "processed_image_url": null,
    "explanation_image_url": null,
    "explanation_method": null
  },
  "warnings": []
}
```

### Response schema and semantics

- `request_id`: non-empty request identifier suitable for display/log correlation. Do not put image data in it.
- `model.id`, `model.version`: actual model used for the request.
- `prediction.task`: backend task identifier or `null` if unavailable.
- `prediction.label`: backend-defined label or `null`. The frontend does not hardcode EuroSAT classes, a cloud taxonomy, a cloud percentage, or segmentation masks.
- `prediction.confidence`: `null` or a finite number from `0` to `1`. The frontend rejects an invalid value. It is not called a calibrated probability unless `score_kind` is exactly `calibrated_probability`.
- `prediction.score_kind`: explain score semantics. Recommended values include `calibrated_probability`, `uncalibrated`, `logit`, and `unknown`; other backend strings may be returned. Scores may be uncalibrated.
- `prediction.class_scores`: array of `{ "label": string, "score": finite number }`. The UI displays values as returned; it does not normalize them or imply probability when not specified.
- `decision.action`: exactly `downlink`, `drop`, or `review`.
- `decision.reason`: string or `null`. “Policy not configured” is a valid explanation for `review`.
- `timing.preprocessing_ms`: finite number or `null`. Must describe backend preprocessing timing only, with boundaries documented by the backend.
- `timing.inference_ms`: finite number or `null`. Must describe backend model inference timing only. Do not substitute paper-reported CPU latency or browser request duration.
- `artifacts.processed_image_url`: absolute HTTP(S) URL or path to the actual backend-returned processed input artifact, or `null`.
- `artifacts.explanation_image_url`: absolute HTTP(S) URL or path to an actual explanation artifact generated by the backend, or `null`.
- `artifacts.explanation_method`: backend explanation method name/metadata string, or `null`. Do not claim Grad-CAM unless this metadata says so and the backend actually supplies the artifact.
- `warnings`: array of strings. Use it for limitations, score caveats, preprocessing caveats, and non-operational outputs.

The frontend does not determine downlink/drop actions from labels or scores. Classification and operational decision policy must remain separate.

## `GET /api/benchmarks`

This endpoint is optional. When unavailable or invalid, the UI can visibly fall back to the supplied static technical-note values. That fallback applies only to benchmarks and never to inference.

Example response:

```json
{
  "source_label": "Backend evaluation run 2026-10-28",
  "source_kind": "backend_evaluation",
  "notes": ["Describe hardware, runtime, and evaluation conditions."],
  "rows": [
    {
      "model_id": "mobilenetv2_int8",
      "model": "MobileNetV2 alpha=0.5 INT8",
      "footprint_mb": 0.65,
      "cpu_latency_ms": 2.1,
      "clean_f1_percent": 90.8,
      "gaussian_f1_percent": 77.9,
      "salt_pepper_f1_percent": 73.6,
      "band_dropout_f1_percent": 69.5
    }
  ]
}
```

### Benchmark response fields

- `source_label`: non-empty provenance/source description shown in the UI.
- `source_kind`: `technical_note` or `backend_evaluation`.
- `notes`: array of strings describing evaluation conditions and caveats.
- `rows`: array of benchmark rows, each with the exact fields below.

### Benchmark row schema (defined once)

| Field | Type | Units / meaning |
|---|---|---|
| `model_id` | string | Stable model identifier |
| `model` | string | Display label |
| `footprint_mb` | finite number or `null` | Model/parameter footprint in MB; not peak runtime RAM |
| `cpu_latency_ms` | finite number or `null` | Reported CPU inference latency in milliseconds; describe hardware/runtime and measurement boundaries in `notes` |
| `clean_f1_percent` | finite number or `null` | F1 percentage on clean inputs |
| `gaussian_f1_percent` | finite number or `null` | F1 percentage under Gaussian noise |
| `salt_pepper_f1_percent` | finite number or `null` | F1 percentage under salt-and-pepper noise |
| `band_dropout_f1_percent` | finite number or `null` | F1 percentage under band dropout |

Values in this endpoint must include the source and measurement conditions. Do not mix MB and milliseconds on one unqualified axis. The frontend charts use separate axes/charts for footprint and latency.

## Error format and HTTP handling

Recommended common JSON error shape:

```json
{
  "error": {
    "code": "INVALID_IMAGE",
    "message": "The uploaded file could not be decoded."
  }
}
```

Also document validation errors such as HTTP 422 where `detail` may be a string or an array of objects (for example, field location plus message). The frontend handles:

- HTTP 413: upload too large.
- HTTP 422: validation failure; array details are rendered as readable text where possible.
- HTTP 500 and other 5xx: backend failure.
- Network failure / API unavailable / CORS failure.
- Non-JSON response on an API endpoint expected to return JSON.
- Invalid JSON.
- Aborted request: the request is cancelled, and an older request cannot overwrite a newer one.

Do not rely on the client for authorization or security validation. This interface does not implement authentication.

## Artifact URL rules

- Accept absolute `http://` and `https://` URLs.
- Accept relative paths resolved against the configured API base URL.
- Reject unsupported schemes such as `javascript:`, `file:`, or `data:`.
- Avoid protocol-relative URLs that silently choose a different origin.
- Artifact responses must be reachable from the browser and return actual content. The UI provides an image-load error state.
- Do not return an artifact URL that is valid only from an internal backend network unless the browser can access it.
- The backend must document how artifacts are authenticated (if applicable), cached, expired, and retained.

## Demo-mode disclaimer

Demo mode uses local illustrative model metadata and a fixed result fixture. The label `Illustrative scene A` is a placeholder fixture label, not the thesis model's class taxonomy. Demo results:

- do not depend on uploaded image content;
- do not run ML inference or browser-side preprocessing;
- report backend preprocessing and inference timing as `null`;
- default to a `review` decision and explicitly say the policy is not configured;
- do not include a processed image or explanation image unless the demo behavior is deliberately revised with another explicit disclaimer.

The benchmark page's static numbers are the values supplied in the technical note and have distinct provenance from demo inference.

## Backend clarification checklist

Resolve these points before interpreting outputs as research or operational results:

1. What is the actual deployed class taxonomy for each task?
2. Are scene and cloud tasks served by separate models, a multi-head model, a percentage estimator, or a segmentation pipeline?
3. Which models are actually deployed and available, with what artifact versions?
4. What exact decoding, resize, RGB conversion, and normalization procedure must be used?
5. What are the valid noise parameter units, ranges, defaults, steps, and per-model support?
6. What are the semantics of confidence and class scores? Are scores calibrated and on what evidence?
7. What exact policy maps outputs to downlink, drop, or review? What thresholds, if any, are justified and versioned?
8. How are model versions and model artifacts tracked?
9. How are preprocessing and inference timing measured, and what do those boundaries include/exclude?
10. What is the image retention/storage policy, and how are uploaded content and generated artifacts removed?
11. Is an explainability artifact available? Which method and metadata are actually returned?
12. What exact CPU model, inference runtime, thread configuration, and numerical settings were used for any reproduced benchmarks?
13. How is peak runtime memory measured separately from model footprint?
14. What are the dataset composition, class balance, split configuration, noise severity, random seeds, and reproducibility procedure?
15. What evidence is required before making energy, bandwidth savings, hardware compatibility, or flight-readiness claims?
