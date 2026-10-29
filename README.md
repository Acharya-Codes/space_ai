# OrbitLens — Noise-Robust Satellite AI Research Demonstrator

OrbitLens is a React + TypeScript frontend for the thesis project **“Compute-Constrained Onboard Satellite Scene & Cloud Classification under Sensor Noise.”** It is an evaluation/research interface, not a satellite-control system.

The interface demonstrates the proposed request workflow: upload a PNG/JPEG → backend-owned preprocessing into a 64 × 64 RGB tile → optional synthetic input degradation → inference using an already-deployed model → display returned predictions, timings, artifacts, and the backend's downlink/drop/review decision.

**Demo mode does not perform machine-learning inference.** It returns a fixed illustrative fixture regardless of the uploaded image. Live mode only calls the configured API and never silently falls back to fixture predictions.

## 1. Prerequisites

- Node.js 20.19+ or 22.12+ recommended.
- npm 10+ recommended.
- A modern browser.
- A backend is not required for demo mode. Live mode requires an API implementing the contract in [`API_CONTRACT.md`](./API_CONTRACT.md).

## 2. Install and run locally

From the extracted `orbitlens` project folder:

```bash
npm install
npm run dev
```

Vite prints a local development URL, normally `http://localhost:5173`. Open it in your browser.

## 3. Environment configuration

Create your local `.env` file from the example:

**Windows PowerShell**

```powershell
Copy-Item .env.example .env
```

**macOS / Linux / Git Bash**

```bash
cp .env.example .env
```

The example contains:

```dotenv
VITE_DATA_MODE=demo
VITE_API_BASE_URL=http://localhost:8000
```

Restart the Vite dev server after editing `.env` because Vite reads environment variables at startup.

## 4. Demo mode versus live mode

### Demo mode

Set `VITE_DATA_MODE=demo`.

- Does not need a backend.
- The persistent banner reads “Demo mode — illustrative fixtures, not model inference.”
- Example model metadata is explicitly illustrative configuration.
- Running analysis returns the fixed label `Illustrative scene A`; the result is not based on image content.
- Demo inference/preprocessing timing fields are `null`; the UI only reports actual browser-side request duration.
- Demo result artifacts are unavailable by design; the UI does not reuse the source image as a fake processed artifact or create a fake explanation heatmap.
- The benchmark page shows the typed static values transcribed from the supplied technical note.

### Live mode

Set `VITE_DATA_MODE=live` and configure `VITE_API_BASE_URL`, for example:

```dotenv
VITE_DATA_MODE=live
VITE_API_BASE_URL=http://localhost:8000
```

The frontend makes these calls:

- `GET /api/health`
- `GET /api/models`
- `POST /api/analyze`
- `GET /api/benchmarks`

Live mode never switches to demo predictions. If `/api/analyze` fails, the analysis UI shows the error and allows retry. If the benchmark endpoint fails, the benchmark page may show the static technical-note dataset with a visible fallback warning; that fallback is benchmark data only, never inference.

## 5. Change the API base URL

Change `VITE_API_BASE_URL` in `.env` to the backend origin, without appending an endpoint path. For example:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
```

The client joins `/api/health`, `/api/models`, `/api/analyze`, and `/api/benchmarks` to that base. Restart `npm run dev` after the change.

For live artifacts, absolute HTTP(S) URLs are accepted. Relative artifact paths are resolved against the configured API base—not against the frontend origin. The browser must be able to reach those artifact URLs.

## 6. Production build and preview

Create a production build:

```bash
npm run build
```

Preview the generated `dist` files locally:

```bash
npm run preview
```

Check TypeScript separately, if desired:

```bash
npm run typecheck
```

The production output is a static SPA. The hosting provider must serve `index.html` for app routes such as `/analysis`, `/benchmarks`, and `/methodology` when a browser refresh or direct navigation requests those paths. Keep normal static-file handling for built assets.

## 7. Backend integration flow

1. Implement the proposed endpoints from `API_CONTRACT.md`.
2. Return model availability, task identifiers, input shape, supported noise operators, ranges, defaults, units, channels, and seed capability from `GET /api/models`.
3. Implement server-side upload validation and image decoding. The 10 MiB browser limit and MIME/extension checks are usability checks only; the backend must independently validate file type/content/size.
4. Own all inference preprocessing (decode, resize to 64 × 64, RGB conversion, normalization), synthetic noise application, inference, timing, artifacts, and the operational decision policy in the backend.
5. Keep classification scores separate from the decision policy. The frontend does not calculate a downlink/drop threshold and does not interpret a score as calibrated probability unless the backend marks `score_kind` as `calibrated_probability`.
6. Return `null` for unavailable numeric measurements. A numeric zero is a valid value and is displayed as zero.
7. Make any returned artifact URLs reachable from the visitor's browser.

The frontend uses native `fetch`, `FormData`, `AbortController`, and runtime checks for key response fields. It intentionally does not set the multipart `Content-Type` header: the browser must add the boundary.

## 8. CORS, HTTPS, and deployment notes

- For cross-origin requests, configure the backend's CORS policy to allow the exact frontend origin (including scheme and port during development), the `GET` and `POST` methods, and the request headers required by the browser.
- Do not use wildcard CORS with credentialed requests. This frontend does not implement authentication or send credentials.
- A deployed HTTPS frontend calling an HTTP API is mixed content and browsers may block the request. Use HTTPS for the API when the frontend is hosted over HTTPS.
- Configure hosting rewrites/fallbacks so direct access and refreshes at SPA routes serve `index.html`.
- `VITE_` variables are embedded into the public frontend bundle. They are **not** secret storage. Do not put credentials or private tokens in them.

## 9. Ownership and retention

The backend owns authoritative upload validation, decoding, preprocessing, noise operators, inference, score semantics, decision policy, timing definitions, explanation-artifact generation, and any server-side storage/retention. The frontend does not claim that uploaded files are deleted by the backend; implement and document a backend retention policy before handling sensitive imagery.

The frontend does not store uploaded imagery in `localStorage` and does not log image contents to the console. The preview object URL is revoked when the selected image is replaced, removed, or the page unmounts.

## 10. Common troubleshooting

### Backend unavailable

- Confirm the backend is running at the `VITE_API_BASE_URL` origin.
- Visit `/api/health` directly in the browser or call it with an HTTP client.
- Check that the app was started with `VITE_DATA_MODE=live`, then restart Vite.
- Review browser network/devtools errors. The app does not fake a successful connection.

### CORS failure

Allow the exact local frontend origin shown by Vite (often `http://localhost:5173`) in backend CORS configuration. CORS is configured on the backend, not by a frontend header.

### Invalid API response

Compare the endpoint's response with the typed shapes in `API_CONTRACT.md`. The frontend validates critical health/model/analysis/benchmark fields and surfaces a useful error rather than rendering arbitrary JSON objects.

### Unsupported image

This frontend supports PNG and JPEG only, with a proposed 10 MiB limit. Re-export the source in PNG/JPEG format. The backend must independently decode and validate file contents. TIFF, multispectral, and SWIR files are not supported here.

### Build errors

- Use a supported Node.js version (20.19+ or 22.12+ recommended).
- Run `npm install` from the directory containing `package.json`.
- Check that all imports point to files inside `src/` and that the `.env` file contains valid values.
- Run `npm run typecheck` to isolate TypeScript diagnostics, then `npm run build`.
- If dependencies were partially installed, remove `node_modules` and `package-lock.json`, then run `npm install` again.

### Artifacts don't load

The artifact URL must be an absolute HTTP(S) URL or a path that resolves against the configured API base. Ensure the host is browser-accessible, returns an image content type, and permits the required cross-origin loading where applicable.

## 11. Research data provenance

All benchmark values shown on the Benchmarks page are labelled as reported in the supplied technical note and not independently reproduced by the website. Reported model footprint is not peak runtime RAM; reported CPU inference latency is not browser end-to-end duration. The note does not fully specify the exact CPU/runtime, noise severities, full data-split/training configuration, peak runtime memory, or complete operational decision policy.

## Welcome screen and colour themes

The app now opens at `/login` with a polished OrbitLens research-entry screen. It accepts an optional researcher label and then enters the workspace. This is a **local demo gate only**, not account authentication or access control; no password is requested or stored. The entry state lasts for the current browser session. Use **Leave demo workspace** in the sidebar to return to the entry screen.

Four colour themes are included: Aurora teal, Solar amber, Nebula violet, and Ember coral. The selected theme is saved in browser local storage. The slow ambient glow and orbital illustration are decorative only, respect `prefers-reduced-motion`, and do not represent live satellite imagery or telemetry.


### Space imagery assets

The welcome screen uses `public/images/earth-satellite-space.webp` as a full-bleed, gently drifting background. Internal dashboard pages reuse the same image with a darker overlay and slow background drift, and the Overview hero displays `public/images/orbitlens-ui-reference.webp` as a static design reference. These are local bundled assets: no remote image service is used. The UI reference image is explicitly labelled as static concept art, not live telemetry or an inference result.
#   s p a c e _ a i  
 