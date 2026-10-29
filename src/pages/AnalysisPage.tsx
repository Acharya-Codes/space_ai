import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, ChevronDown, FlaskConical, Info, RefreshCw, RotateCcw, SlidersHorizontal, WifiOff } from 'lucide-react';
import { useAppContext } from '../app/AppContext';
import { ImageUpload, type SelectedImage } from '../components/upload/ImageUpload';
import { AnalysisResult, ImageComparison } from '../components/analysis/AnalysisResult';
import { StateBadge } from '../components/common/StateBadge';
import { api, apiBaseUrl } from '../services/api';
import { asErrorMessage } from '../services/errors';
import type { AnalysisConfig, CompletedAnalysis, NoiseType } from '../types/api';
import { buildAnalysisConfig, inspectImageDimensions, validateAnalysisConfig, validateUploadFile } from '../utils/validation';
import { resolveArtifactUrl } from '../utils/artifactUrls';

type AnalysisState = 'idle' | 'loading' | 'success' | 'error';

export function AnalysisPage() {
  const { models, modelsState, modelsError, retryMetadata, mode } = useAppContext();
  const [selectedModelId, setSelectedModelId] = useState('');
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [inspectBusy, setInspectBusy] = useState(false);
  const [inputChanging, setInputChanging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [noiseType, setNoiseType] = useState<NoiseType>('none');
  const [gaussianStd, setGaussianStd] = useState('0.05');
  const [corruptionProbability, setCorruptionProbability] = useState('0.05');
  const [dropoutChannel, setDropoutChannel] = useState<'R' | 'G' | 'B'>('R');
  const [seed, setSeed] = useState('');
  const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [completed, setCompleted] = useState<CompletedAnalysis | null>(null);
  const activeAbort = useRef<AbortController | null>(null);
  const requestSequence = useRef(0);
  const inspectSequence = useRef(0);
  const currentPreviewUrl = useRef<string | null>(null);

  const selectedModel = models.find((model) => model.id === selectedModelId);
  const availableModels = models.filter((model) => model.available);

  useEffect(() => {
    if (modelsState !== 'success') return;
    if (availableModels.length === 0) {
      setSelectedModelId('');
      return;
    }
    const selectedStillAvailable = availableModels.some((model) => model.id === selectedModelId);
    if (!selectedStillAvailable) {
      const preferred = availableModels.find((model) => model.id === 'mobilenetv2_int8') ?? availableModels[0];
      setSelectedModelId(preferred.id);
    }
  }, [models, modelsState, selectedModelId]);

  useEffect(() => {
    if (!selectedModel) return;
    const supported = selectedModel.noise?.supported_types ?? [];
    if (!supported.includes(noiseType)) setNoiseType(supported.includes('none') ? 'none' : (supported[0] ?? 'none'));
    if (selectedModel.noise?.gaussian_std) setGaussianStd(String(selectedModel.noise.gaussian_std.default));
    if (selectedModel.noise?.corruption_probability) setCorruptionProbability(String(selectedModel.noise.corruption_probability.default));
    if (selectedModel.noise?.dropout_channels?.[0]) setDropoutChannel(selectedModel.noise.dropout_channels[0]);
    if (!selectedModel.noise?.seed_supported) setSeed('');
  // Noise defaults should be reapplied when the selected model changes, not when each control changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModelId, models]);

  useEffect(() => () => {
    activeAbort.current?.abort();
    if (currentPreviewUrl.current) URL.revokeObjectURL(currentPreviewUrl.current);
  }, []);

  const invalidateCurrentRequest = useCallback((message?: string) => {
    requestSequence.current += 1;
    if (activeAbort.current) {
      activeAbort.current.abort();
      activeAbort.current = null;
    }
    setAnalysisState((state) => state === 'loading' || state === 'error' ? 'idle' : state);
    if (message) setNotice(message);
    setAnalysisError(null);
  }, []);

  const handleChooseFile = useCallback(async (file: File) => {
    invalidateCurrentRequest();
    setUploadError(null);
    const inspectionId = ++inspectSequence.current;
    setInputChanging(true);
    const check = validateUploadFile(file);
    if (!check.valid) {
      setUploadError(check.message ?? 'This file is not supported.');
      setInspectBusy(false);
      setInputChanging(false);
      return;
    }
    setInspectBusy(true);
    try {
      const dimensions = await inspectImageDimensions(file);
      if (inspectionId !== inspectSequence.current) return;
      const previewUrl = URL.createObjectURL(file);
      if (currentPreviewUrl.current) URL.revokeObjectURL(currentPreviewUrl.current);
      currentPreviewUrl.current = previewUrl;
      setSelectedImage({ file, previewUrl, width: dimensions.width, height: dimensions.height, token: `${Date.now().toString(36)}-${inspectionId}` });
      setNotice(null);
    } catch (error) {
      if (inspectionId !== inspectSequence.current) return;
      setUploadError(asErrorMessage(error));
    } finally {
      if (inspectionId === inspectSequence.current) { setInspectBusy(false); setInputChanging(false); }
    }
  }, [invalidateCurrentRequest]);

  const handleRemoveFile = useCallback(() => {
    invalidateCurrentRequest('Image removed. Any previous result is retained for inspection and marked stale.');
    inspectSequence.current += 1;
    setInspectBusy(false);
    setInputChanging(false);
    setSelectedImage(null);
    setUploadError(null);
    if (currentPreviewUrl.current) URL.revokeObjectURL(currentPreviewUrl.current);
    currentPreviewUrl.current = null;
  }, [invalidateCurrentRequest]);

  const applyConfigChange = useCallback(() => {
    invalidateCurrentRequest();
    setNotice(null);
  }, [invalidateCurrentRequest]);

  const config: AnalysisConfig | null = selectedModel ? buildAnalysisConfig({
    model: selectedModel,
    noiseType,
    gaussianStd,
    corruptionProbability,
    dropoutChannel,
    seed,
  }) : null;

  const configIssues = useMemo(() => config ? validateAnalysisConfig(config, selectedModel, seed) : ['Select a model with metadata from the API.'], [config, selectedModel, seed]);
  const canRun = Boolean(
    selectedImage && config && modelsState === 'success' && selectedModel?.available && configIssues.length === 0 &&
    analysisState !== 'loading' && !inspectBusy
  );
  const analysisKey = JSON.stringify({
    imageToken: selectedImage?.token ?? null,
    modelId: selectedModelId,
    noiseType,
    gaussianStd: noiseType === 'gaussian' ? gaussianStd : null,
    corruptionProbability: noiseType === 'salt_pepper' ? corruptionProbability : null,
    dropoutChannel: noiseType === 'band_dropout' ? dropoutChannel : null,
    seed: selectedModel?.noise?.seed_supported ? seed : null,
  });
  const stale = Boolean(completed && (completed.key !== analysisKey || inputChanging));

  const onRunAnalysis = useCallback(async () => {
    if (!selectedImage || !selectedModel || !config || !canRun) return;
    requestSequence.current += 1;
    const requestId = requestSequence.current;
    activeAbort.current?.abort();
    const controller = new AbortController();
    activeAbort.current = controller;
    const startedAt = performance.now();
    const fileSnapshot = { name: selectedImage.file.name, size: selectedImage.file.size, type: selectedImage.file.type || 'Not reported by browser' };
    const configSnapshot: AnalysisConfig = { ...config };
    const resultMode = mode;
    setAnalysisState('loading');
    setAnalysisError(null);
    setNotice(null);

    try {
      const result = await api.analyzeImage(selectedImage.file, configSnapshot, controller.signal);
      const elapsed = performance.now() - startedAt;
      if (controller.signal.aborted || requestId !== requestSequence.current) return;
      setCompleted({
        result,
        config: configSnapshot,
        sourceMode: resultMode,
        browserRequestMs: elapsed,
        file: fileSnapshot,
        key: analysisKey,
      });
      setAnalysisState('success');
      setNotice(resultMode === 'demo' ? 'Demo fixture returned successfully; uploaded image content was not analyzed.' : 'Backend response received. Review model score semantics and policy warnings before interpreting it.');
    } catch (error) {
      if (controller.signal.aborted || requestId !== requestSequence.current) return;
      setAnalysisError(asErrorMessage(error));
      setAnalysisState('error');
    } finally {
      if (requestId === requestSequence.current) activeAbort.current = null;
    }
  }, [selectedImage, selectedModel, config, canRun, mode, analysisKey]);

  const onCancel = useCallback(() => {
    if (activeAbort.current) {
      activeAbort.current.abort();
      activeAbort.current = null;
      requestSequence.current += 1;
      setAnalysisState('idle');
      setNotice('Request cancelled. No result was accepted from the cancelled request.');
    }
  }, []);

  const rangeGaussian = selectedModel?.noise?.gaussian_std;
  const rangeSalt = selectedModel?.noise?.corruption_probability;
  const supportedNoiseTypes = selectedModel?.noise?.supported_types ?? [];
  const hasModelMetadataError = modelsState === 'error';

  return (
    <div className="page-stack">
      <section className="page-intro-row">
        <div><div className="eyebrow"><span className="eyebrow-line" /> ANALYSIS WORKSPACE</div><h1>Analysis Lab</h1><p className="page-lead">Configure a model and optional synthetic sensor degradation, then inspect the backend response contract.</p></div>
        <div className="page-intro-badges"><StateBadge tone={mode === 'demo' ? 'info' : 'neutral'}>{mode === 'demo' ? 'Illustrative demo' : 'Live API only'}</StateBadge><StateBadge tone="neutral">Max upload: 10 MiB</StateBadge></div>
      </section>

      <div className="analysis-layout">
        <section className="panel config-panel" aria-labelledby="configuration-title">
          <div className="panel-heading"><div><div className="eyebrow">REQUEST SETUP</div><h2 id="configuration-title">Input & configuration</h2><p className="section-description">Every control maps to a proposed API request field.</p></div><SlidersHorizontal size={19} className="panel-heading-icon" /></div>
          <div className="config-section"><div className="form-section-heading"><span className="step-indicator">01</span><div><h3>Input image</h3><p>Choose one source image</p></div></div><ImageUpload selected={selectedImage} inspecting={inspectBusy} error={uploadError} onChoose={handleChooseFile} onRemove={handleRemoveFile} /></div>
          <div className="config-divider" />
          <div className="config-section"><div className="form-section-heading"><span className="step-indicator">02</span><div><h3>Classification model</h3><p>Only API-advertised available models can run</p></div></div>
            {modelsState === 'loading' && <div className="inline-loading"><RefreshCw size={15} className="spin-icon" />Loading model metadata…</div>}
            {hasModelMetadataError && <div className="inline-error"><WifiOff size={16} /><div><strong>Model metadata unavailable</strong><p>{modelsError ?? 'The API did not return model metadata.'} Live mode will not invent a model list.</p><button type="button" className="button button--secondary button--small" onClick={retryMetadata}><RefreshCw size={13} /> Retry metadata</button></div></div>}
            {modelsState === 'success' && <>
              <label className="field-label" htmlFor="model-select">Available model</label>
              <div className="select-wrap"><select id="model-select" value={selectedModelId} onChange={(event) => { applyConfigChange(); setSelectedModelId(event.target.value); }}>
                <option value="" disabled>Select a model…</option>
                {models.map((model) => <option key={model.id} value={model.id} disabled={!model.available}>{model.name}{model.available ? '' : ' (unavailable)'}</option>)}
              </select><ChevronDown size={16} aria-hidden="true" /></div>
              {selectedModel && <div className="model-metadata-card"><div className="model-metadata-top"><strong>{selectedModel.name}</strong><StateBadge tone={selectedModel.available ? 'success' : 'warning'}>{selectedModel.available ? 'Available' : 'Unavailable'}</StateBadge></div><div className="model-meta-items"><span>Version <b>{selectedModel.version}</b></span><span>Input <b>{selectedModel.input.width} × {selectedModel.input.height} × {selectedModel.input.channels}</b></span><span>Tasks <b>{selectedModel.tasks.length ? selectedModel.tasks.join(', ') : 'Not available'}</b></span></div></div>}
              {availableModels.length === 0 && <p className="field-error" role="status">The API returned no available models. Check model deployment and retry metadata.</p>}
            </>}
          </div>
          <div className="config-divider" />
          <div className="config-section"><div className="form-section-heading"><span className="step-indicator">03</span><div><h3>Evaluation noise</h3><p>Optional inference-time input corruption</p></div></div>
            <label className="field-label" htmlFor="noise-select">Noise operator</label>
            <div className="select-wrap"><select id="noise-select" value={noiseType} disabled={!selectedModel?.noise || supportedNoiseTypes.length === 0} onChange={(event) => { const nextNoise = event.target.value as NoiseType; applyConfigChange(); setNoiseType(nextNoise); if (nextNoise === 'none') setSeed(''); }}>
              {supportedNoiseTypes.includes('none') && <option value="none">Clean / none</option>}
              {supportedNoiseTypes.includes('gaussian') && <option value="gaussian">Gaussian noise</option>}
              {supportedNoiseTypes.includes('salt_pepper') && <option value="salt_pepper">Salt-and-pepper noise</option>}
              {supportedNoiseTypes.includes('band_dropout') && <option value="band_dropout">Band dropout</option>}
              {supportedNoiseTypes.length === 0 && <option value="none">Noise metadata unavailable</option>}
            </select><ChevronDown size={16} aria-hidden="true" /></div>
            {noiseType === 'gaussian' && <div className="conditional-field"><label className="field-label" htmlFor="gaussian-std">Standard deviation</label><div className="number-control"><input id="gaussian-std" type="number" min={rangeGaussian?.min} max={rangeGaussian?.max} step={rangeGaussian?.step} value={gaussianStd} disabled={!rangeGaussian} onChange={(event) => { applyConfigChange(); setGaussianStd(event.target.value); }} /><span>{rangeGaussian?.units ?? 'Units not supplied'}</span></div><p className="range-help">{rangeGaussian ? `API range: ${rangeGaussian.min}–${rangeGaussian.max} · default ${rangeGaussian.default} · step ${rangeGaussian.step}` : 'Required Gaussian parameter metadata is missing.'}</p></div>}
            {noiseType === 'salt_pepper' && <div className="conditional-field"><label className="field-label" htmlFor="corruption-probability">Corruption probability</label><div className="number-control"><input id="corruption-probability" type="number" min={rangeSalt?.min} max={rangeSalt?.max} step={rangeSalt?.step} value={corruptionProbability} disabled={!rangeSalt} onChange={(event) => { applyConfigChange(); setCorruptionProbability(event.target.value); }} /><span>{rangeSalt?.units ?? 'Fraction / units not supplied'}</span></div><p className="range-help">{rangeSalt ? `API range: ${rangeSalt.min}–${rangeSalt.max} · default ${rangeSalt.default} · step ${rangeSalt.step}` : 'Required corruption probability metadata is missing.'}</p></div>}
            {noiseType === 'band_dropout' && <div className="conditional-field"><label className="field-label" htmlFor="dropout-channel">Channel to zero</label><div className="select-wrap"><select id="dropout-channel" value={dropoutChannel} disabled={!selectedModel?.noise?.dropout_channels?.length} onChange={(event) => { applyConfigChange(); setDropoutChannel(event.target.value as 'R' | 'G' | 'B'); }}>{(selectedModel?.noise?.dropout_channels ?? []).map((channel) => <option value={channel} key={channel}>{channel} channel</option>)}</select><ChevronDown size={16} aria-hidden="true" /></div><p className="range-help">The selected RGB channel is zeroed by the backend evaluation operator.</p></div>}
            <div className="conditional-field seed-field"><label className="field-label" htmlFor="random-seed">Random seed <span className="optional-label">OPTIONAL</span></label><input className="text-input" id="random-seed" type="number" step="1" min={-2147483648} max={2147483647} value={seed} disabled={!selectedModel?.noise?.seed_supported || noiseType === 'none'} placeholder={!selectedModel?.noise?.seed_supported ? 'Not supported by this model' : noiseType === 'none' ? 'Select noise to set a seed' : 'Leave blank for backend default'} onChange={(event) => { applyConfigChange(); setSeed(event.target.value); }} /><p className="range-help">{!selectedModel?.noise?.seed_supported ? 'Seed support is not advertised in model metadata.' : noiseType === 'none' ? 'A seed is only relevant when an input noise operator is selected.' : 'Optional signed 32-bit integer; sent only when supplied.'}</p></div>
          </div>
          <div className="configuration-footnote"><Info size={14} /><span>Noise-aware training and INT8 quantization are offline steps. This control does not retrain or quantize on upload.</span></div>
          {configIssues.length > 0 && selectedImage && <div className="validation-box" role="status"><AlertCircle size={15} /><div><strong>Configuration needs attention</strong><ul>{configIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div></div>}
          <div className="run-actions">
            {analysisState === 'loading' ? <button type="button" className="button button--danger-outline run-button" onClick={onCancel}><RotateCcw size={16} /> Cancel request</button> : <button type="button" className="button button--primary run-button" disabled={!canRun} onClick={onRunAnalysis}>{analysisState === 'error' ? <RefreshCw size={16} /> : <FlaskConical size={16} />}{analysisState === 'error' ? 'Retry Analysis' : 'Run Analysis'}</button>}
            <span className="run-hint">{analysisState === 'loading' ? 'One request in flight' : !selectedImage ? 'Upload a file to enable analysis' : configIssues.length > 0 ? 'Resolve configuration issues first' : 'Ready when you are'}</span>
          </div>
        </section>

        <div className="analysis-right-column">
          <AnalysisResult state={analysisState} error={analysisError} notice={notice} completed={completed} stale={stale} onCancel={onCancel} onRetry={onRunAnalysis} />
          <div className="timing-note"><Info size={15} /><p><strong>Timing is split by measurement scope.</strong> Backend preprocessing and inference are returned by the API; browser end-to-end duration includes request overhead and upload time. Demo mode only reports its real browser elapsed duration.</p></div>
        </div>
      </div>

      <ImageComparison
        originalUrl={selectedImage?.previewUrl ?? null}
        originalName={selectedImage?.file.name ?? null}
        processedUrl={completed ? resolveBackendArtifact(completed.result.artifacts.processed_image_url, completed.sourceMode) : null}
        explanationUrl={completed ? resolveBackendArtifact(completed.result.artifacts.explanation_image_url, completed.sourceMode) : null}
        explanationMethod={completed?.result.artifacts.explanation_method ?? null}
        sourceMode={completed?.sourceMode ?? null}
      />

      <section className="panel contract-panel"><div className="contract-icon"><Check size={17} /></div><div><h3>Backend handoff boundary</h3><p>The frontend sends a multipart upload and configuration fields, then displays the API response. It does not calculate predictions, invent labels, create processed images, or convert scores into downlink decisions.</p><a className="text-link" href="/API_CONTRACT.md" target="_blank" rel="noreferrer">Open API contract <Info size={13} /></a></div></section>
    </div>
  );
}

function resolveBackendArtifact(url: string | null, sourceMode: 'demo' | 'live') {
  if (sourceMode !== 'live') return null;
  return resolveArtifactUrl(url, apiBaseUrl);
}
