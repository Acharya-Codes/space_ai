import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowDownToLine, CheckCircle2, CircleDashed, Clock3, Database, Download, Eye, FileJson2, Info, Layers3, LoaderCircle, RefreshCw, ShieldCheck, ShieldX, XCircle } from 'lucide-react';
import type { AnalysisResponse, CompletedAnalysis, DataMode } from '../../types/api';
import { StateBadge } from '../common/StateBadge';
import { formatNumber, formatPercent } from '../../utils/formatting';

function ImageArtifact({ url, alt, emptyTitle, emptyDescription }: { url: string | null; alt: string; emptyTitle: string; emptyDescription: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  if (!url || failed) {
    return <div className="artifact-empty"><div className="artifact-empty-icon"><Eye size={20} /></div><strong>{failed ? 'Artifact could not be loaded' : emptyTitle}</strong><p>{failed ? 'Check that the backend artifact URL is reachable from this browser.' : emptyDescription}</p></div>;
  }
  return <img src={url} alt={alt} className="artifact-image" onError={() => setFailed(true)} />;
}

function decisionTone(action: AnalysisResponse['decision']['action']): 'success' | 'danger' | 'warning' {
  if (action === 'downlink') return 'success';
  if (action === 'drop') return 'danger';
  return 'warning';
}

function ResultMetric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Clock3 }) {
  return <div className="result-metric"><span className="result-metric-icon"><Icon size={15} /></span><div><span>{label}</span><strong>{value}</strong></div></div>;
}

export function AnalysisResult({
  state,
  error,
  notice,
  completed,
  stale,
  onCancel,
  onRetry,
}: {
  state: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  notice: string | null;
  completed: CompletedAnalysis | null;
  stale: boolean;
  onCancel: () => void;
  onRetry: () => void;
}) {
  const response = completed?.result;
  const confidence = response?.prediction.confidence;
  const calibrated = response?.prediction.score_kind === 'calibrated_probability';
  const scoreLabel = calibrated ? 'Confidence (calibrated probability)' : 'Model score';
  const confidenceText = confidence === null || confidence === undefined
    ? 'Not available'
    : calibrated ? formatPercent(confidence * 100, 1) : formatNumber(confidence, 4);

  return (
    <section className="panel results-panel" aria-labelledby="results-title">
      <div className="panel-heading results-heading"><div><div className="eyebrow">INFERENCE OUTPUT</div><h2 id="results-title">Analysis results</h2><p className="section-description">Results reflect the selected data mode and returned API fields.</p></div>
        {state === 'success' && response ? <StateBadge tone={stale ? 'warning' : completed?.sourceMode === 'demo' ? 'info' : 'success'}>{stale ? 'Stale configuration' : completed?.sourceMode === 'demo' ? 'Demo fixture' : 'API result'}</StateBadge> : <StateBadge tone={state === 'error' ? 'danger' : state === 'loading' ? 'info' : 'neutral'}>{state === 'loading' ? 'In progress' : state === 'error' ? 'Failed' : 'Awaiting run'}</StateBadge>}
      </div>
      {state === 'idle' && !response && <div className="results-empty"><div className="results-empty-icon"><CircleDashed size={26} /></div><h3>Results will appear here</h3><p>Choose an image and model configuration, then run an analysis request. The live backend owns preprocessing, prediction, and the downlink decision.</p><div className="empty-specs"><span><CheckCircle2 size={14} /> Prediction & score</span><span><CheckCircle2 size={14} /> Timing breakdown</span><span><CheckCircle2 size={14} /> Policy response</span></div></div>}
      {state === 'loading' && <div className="loading-state" role="status" aria-live="polite"><LoaderCircle size={24} className="spin-icon" /><div><strong>Uploading image and waiting for backend analysis.</strong><p>Waiting for a single response. No fabricated progress percentage is shown.</p></div><button type="button" className="button button--ghost button--small danger-text" onClick={onCancel}>Cancel request</button></div>}
      {state === 'error' && <div className="error-state" role="alert"><div className="error-state-icon"><XCircle size={21} /></div><div className="error-state-copy"><h3>Analysis request failed</h3><p>{error ?? 'The request could not be completed.'}</p><button type="button" className="button button--secondary button--small" onClick={onRetry}><RefreshCw size={14} /> Retry analysis</button></div></div>}
      {notice && state !== 'loading' && <p className="inline-notice" role="status"><Info size={14} />{notice}</p>}
      {response && state !== 'loading' && <div className={`result-content${stale ? ' result-content--stale' : ''}`}>
        {stale && <div className="stale-warning" role="status"><AlertTriangle size={16} /><div><strong>This result is stale.</strong><p>The image or configuration has changed since this request. Run analysis again before relying on it.</p></div></div>}
        <div className="prediction-summary">
          <div className="prediction-label-wrap"><span className="field-eyebrow">PREDICTED CLASS</span><h3>{response.prediction.label ?? 'Not available'}</h3><div className="prediction-meta"><span className="meta-chip">Task: {response.prediction.task ?? 'Not available'}</span><span className="meta-chip">{scoreLabel}</span></div></div>
          <div className="confidence-ring"><span>{confidenceText}</span><small>{calibrated ? 'probability' : 'score'}</small></div>
        </div>
        <div className="decision-box"><div className={`decision-symbol decision-symbol--${response.decision.action}`}>{response.decision.action === 'downlink' ? <ArrowDownToLine size={19} /> : response.decision.action === 'drop' ? <ShieldX size={19} /> : <ShieldCheck size={19} />}</div><div className="decision-main"><span className="field-eyebrow">BACKEND DECISION</span><strong>{response.decision.action === 'downlink' ? 'Downlink' : response.decision.action === 'drop' ? 'Drop' : 'Review'}</strong><p>{response.decision.reason ?? 'No decision explanation supplied.'}</p></div><StateBadge tone={decisionTone(response.decision.action)}>{response.decision.action.toUpperCase()}</StateBadge></div>
        {response.prediction.class_scores.length > 0 && <div className="scores-section"><div className="subsection-heading"><h3>Class scores</h3><span>{response.prediction.score_kind ?? 'Score semantics unknown'}</span></div><div className="scores-list">{response.prediction.class_scores.map((score) => <div className="score-row" key={score.label}><span>{score.label}</span><code>{formatNumber(score.score, 5)}</code></div>)}</div><p className="field-help">Scores are shown as returned; they may be uncalibrated and are not guaranteed accuracy.</p></div>}
        <div className="result-metrics-grid">
          <ResultMetric label="Backend preprocessing" value={response.timing.preprocessing_ms === null ? 'Not available' : `${formatNumber(response.timing.preprocessing_ms, 3)} ms`} icon={Layers3} />
          <ResultMetric label="Backend inference" value={response.timing.inference_ms === null ? 'Not available' : `${formatNumber(response.timing.inference_ms, 3)} ms`} icon={Clock3} />
          <ResultMetric label={completed?.sourceMode === 'demo' ? 'Demo request duration' : 'Browser end-to-end'} value={completed ? `${formatNumber(completed.browserRequestMs, 1)} ms` : 'Not available'} icon={Clock3} />
          <ResultMetric label="Model version" value={response.model.version || 'Not available'} icon={Database} />
        </div>
        <div className="result-metadata"><div><span>Model ID</span><code>{response.model.id || 'Not available'}</code></div><div><span>Request ID</span><code>{response.request_id || 'Not available'}</code></div><div><span>Source mode</span><strong>{completed?.sourceMode.toUpperCase() ?? 'Not available'}</strong></div></div>
        {response.warnings.length > 0 && <div className="warnings-block"><div className="warnings-title"><AlertTriangle size={15} /><strong>Warnings</strong></div><ul>{response.warnings.map((warning, index) => <li key={`${index}-${warning}`}>{warning}</li>)}</ul></div>}
        {completed?.sourceMode === 'demo' && <div className="demo-result-note"><Info size={15} /><span>This result is a fixed demonstration fixture and does not depend on image content.</span></div>}
        <div className="result-export-row"><span><FileJson2 size={16} /> Export completed result and request configuration</span><button type="button" className="button button--secondary button--small" onClick={() => downloadResult(completed)} disabled={!completed}><Download size={14} /> Download result JSON</button></div>
      </div>}
      {!response && state !== 'loading' && state !== 'error' && <div className="results-footnote"><Info size={14} />A decision is displayed only when returned by the backend. “Review” may indicate a policy is not configured.</div>}
    </section>
  );
}


function downloadResult(completed: CompletedAnalysis | null) {
  if (!completed) return;
  const payload = {
    source_mode: completed.sourceMode,
    browser_request_duration_ms: completed.browserRequestMs,
    request_configuration: {
      file: completed.file,
      model_id: completed.config.modelId,
      noise_type: completed.config.noiseType,
      ...(completed.config.noiseStd !== undefined ? { noise_std: completed.config.noiseStd } : {}),
      ...(completed.config.corruptionProbability !== undefined ? { corruption_probability: completed.config.corruptionProbability } : {}),
      ...(completed.config.dropoutChannel ? { dropout_channel: completed.config.dropoutChannel } : {}),
      ...(completed.config.seed !== undefined ? { seed: completed.config.seed } : {}),
    },
    api_result: completed.result,
    note: completed.sourceMode === 'demo' ? 'Illustrative fixture only; not model inference. Original image bytes are not included.' : 'Original image bytes are not included. Browser duration is distinct from backend timing.',
  };
  const blobUrl = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `orbitlens-result-${completed.result.request_id.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
}

export function ImageComparison({ originalUrl, originalName, processedUrl, explanationUrl, explanationMethod, sourceMode }: {
  originalUrl: string | null;
  originalName: string | null;
  processedUrl: string | null;
  explanationUrl: string | null;
  explanationMethod: string | null;
  sourceMode: DataMode | null;
}) {
  return (
    <section className="panel comparison-panel" aria-labelledby="image-comparison-title">
      <div className="panel-heading"><div><div className="eyebrow">ARTIFACT INSPECTION</div><h2 id="image-comparison-title">Image comparison</h2><p className="section-description">Processed and explanation artifacts are displayed only when returned by the backend.</p></div><StateBadge tone="neutral">No browser-side preprocessing</StateBadge></div>
      <div className="comparison-grid">
        <div className="comparison-card"><div className="comparison-card-heading"><div><strong>Original upload</strong><span>{originalName ?? 'No image selected'}</span></div><StateBadge tone="neutral">Source</StateBadge></div>
          {originalUrl ? <img src={originalUrl} alt={originalName ? `Original uploaded image ${originalName}` : 'Original uploaded image'} className="comparison-image" /> : <div className="artifact-empty"><div className="artifact-empty-icon"><Eye size={20} /></div><strong>No source image</strong><p>Select a PNG or JPEG in the upload panel.</p></div>}
        </div>
        <div className="comparison-card"><div className="comparison-card-heading"><div><strong>Processed input</strong><span>{sourceMode === 'demo' ? 'Unavailable in demo fixtures' : 'Backend-returned artifact'}</span></div><StateBadge tone={processedUrl ? 'success' : 'neutral'}>{processedUrl ? 'Returned' : 'Unavailable'}</StateBadge></div>
          <ImageArtifact url={processedUrl} alt="Processed image returned by backend" emptyTitle={sourceMode === 'demo' ? 'No demo artifact supplied' : 'Processed image unavailable'} emptyDescription={sourceMode === 'demo' ? 'Demo mode does not synthesize a fake processed image.' : 'The backend did not return a processed_image_url.'} />
        </div>
      </div>
      <div className="explanation-row"><div className="explanation-copy"><div className="explanation-icon"><Eye size={17} /></div><div><strong>Optional model explanation</strong><p>{explanationMethod ? `Method supplied by backend: ${explanationMethod}` : 'An explanation artifact is not required by the proposed API and may be unavailable.'}</p></div></div><div className="explanation-artifact"><ImageArtifact url={explanationUrl} alt="Model explanation supplied by backend" emptyTitle="No explanation artifact" emptyDescription="No synthetic Grad-CAM or heatmap is generated by this frontend." /></div></div>
    </section>
  );
}
