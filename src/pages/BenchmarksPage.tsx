import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, BarChart3, Clock3, Database, Layers3, RefreshCw } from 'lucide-react';
import { StateBadge } from '../components/common/StateBadge';
import { ChartDataTable } from '../components/benchmarks/ChartDataTable';
import { api } from '../services/api';
import { asErrorMessage } from '../services/errors';
import { reportedBenchmarks, reportedStudyContext } from '../data/reportedBenchmarks';
import type { BenchmarksResponse } from '../types/api';
import { formatNumber, formatPercent } from '../utils/formatting';

export function BenchmarksPage() {
  const [benchmarkData, setBenchmarkData] = useState<BenchmarksResponse | null>(null);
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [apiError, setApiError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    setApiError(null);
    api.getBenchmarks(controller.signal).then((response) => {
      if (controller.signal.aborted) return;
      setBenchmarkData(response);
      setState('success');
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setApiError(asErrorMessage(error));
      setBenchmarkData(reportedBenchmarks);
      setState('error');
    });
    return () => controller.abort();
  }, [reloadKey]);

  const rows = benchmarkData?.rows ?? reportedBenchmarks.rows;
  const chartRows = rows.map((row) => ({
    model: row.model,
    clean: row.clean_f1_percent,
    gaussian: row.gaussian_f1_percent,
    saltPepper: row.salt_pepper_f1_percent,
    bandDropout: row.band_dropout_f1_percent,
  }));
  const footprintRows = rows.map((row) => ({ model: row.model, footprint: row.footprint_mb }));
  const latencyRows = rows.map((row) => ({ model: row.model, latency: row.cpu_latency_ms }));
  const sourceIsBackend = benchmarkData?.source_kind === 'backend_evaluation';
  const int8Row = rows.find((row) => row.model_id === reportedStudyContext.int8MobileNetModelId);
  const footprintRow = int8Row ?? rows.filter((row) => row.footprint_mb !== null).slice().sort((a, b) => (a.footprint_mb ?? Number.POSITIVE_INFINITY) - (b.footprint_mb ?? Number.POSITIVE_INFINITY))[0];
  const latencyRow = rows.filter((row) => row.cpu_latency_ms !== null).slice().sort((a, b) => (a.cpu_latency_ms ?? Number.POSITIVE_INFINITY) - (b.cpu_latency_ms ?? Number.POSITIVE_INFINITY))[0];
  const cleanF1Row = int8Row ?? rows.filter((row) => row.clean_f1_percent !== null).slice().sort((a, b) => (b.clean_f1_percent ?? Number.NEGATIVE_INFINITY) - (a.clean_f1_percent ?? Number.NEGATIVE_INFINITY))[0];
  const fp32Row = rows.find((row) => row.model_id === reportedStudyContext.fp32MobileNetModelId);
  const cleanF1Delta = fp32Row?.clean_f1_percent != null && int8Row?.clean_f1_percent != null
    ? fp32Row.clean_f1_percent - int8Row.clean_f1_percent
    : null;

  return (
    <div className="page-stack">
      <section className="page-intro-row"><div><div className="eyebrow"><span className="eyebrow-line" /> REPORTED EVALUATION</div><h1>Benchmarks</h1><p className="page-lead">Compare model footprint, reported CPU latency, and F1 scores across clean and synthetically degraded inputs.</p></div><div className="page-intro-badges"><StateBadge tone={sourceIsBackend ? 'success' : 'warning'}>{sourceIsBackend ? 'Backend evaluation' : 'Technical note'}</StateBadge><StateBadge tone="neutral">{rows.length} {rows.length === 1 ? 'model' : 'models'}</StateBadge></div></section>

      {state === 'loading' && <div className="inline-loading panel-loading" role="status"><RefreshCw size={15} className="spin-icon" />Loading benchmark data…</div>}
      {state === 'error' && <div className="fallback-notice" role="status"><AlertTriangle size={17} /><div><strong>Benchmark API unavailable; showing the supplied technical-note values.</strong><p>{apiError}. This static fallback is benchmark data only and is not used for image inference.</p></div><button className="button button--secondary button--small" onClick={() => setReloadKey((key) => key + 1)}><RefreshCw size={13} /> Retry API</button></div>}

      <section className="metric-grid benchmark-metric-grid" aria-label="Key benchmark takeaways">
        <article className="metric-card"><div className="metric-card-top"><span className="metric-icon"><Layers3 size={18} /></span><StateBadge tone={sourceIsBackend ? 'info' : 'warning'}>{sourceIsBackend ? 'API value' : 'Reported'}</StateBadge></div><div className="metric-value">{footprintRow?.footprint_mb == null ? 'Not available' : `${formatNumber(footprintRow.footprint_mb, 2)} MB`}</div><div className="metric-label">{int8Row ? 'MobileNetV2 INT8 footprint' : 'Smallest footprint in rows'}</div><div className="metric-detail">Model footprint, not peak runtime RAM</div></article>
        <article className="metric-card"><div className="metric-card-top"><span className="metric-icon"><Clock3 size={18} /></span><StateBadge tone={sourceIsBackend ? 'info' : 'warning'}>{sourceIsBackend ? 'API value' : 'Reported'}</StateBadge></div><div className="metric-value">{latencyRow?.cpu_latency_ms == null ? 'Not available' : `${formatNumber(latencyRow.cpu_latency_ms, 2)} ms`}</div><div className="metric-label">{latencyRow ? `Lowest CPU latency · ${latencyRow.model}` : 'CPU latency'}</div><div className="metric-detail">Not browser request duration</div></article>
        <article className="metric-card"><div className="metric-card-top"><span className="metric-icon"><BarChart3 size={18} /></span><StateBadge tone={sourceIsBackend ? 'info' : 'warning'}>{sourceIsBackend ? 'API value' : 'Reported'}</StateBadge></div><div className="metric-value">{cleanF1Row?.clean_f1_percent == null ? 'Not available' : formatPercent(cleanF1Row.clean_f1_percent)}</div><div className="metric-label">{int8Row ? 'MobileNetV2 INT8 clean F1' : 'Highest clean F1 in rows'}</div><div className="metric-detail">Aggregate metric, not single-image score</div></article>
        <article className="metric-card"><div className="metric-card-top"><span className="metric-icon"><Database size={18} /></span><StateBadge tone={sourceIsBackend ? 'info' : 'warning'}>{sourceIsBackend ? 'API scope' : 'Reported'}</StateBadge></div><div className="metric-value">{sourceIsBackend ? rows.length.toLocaleString() : reportedStudyContext.evaluationPatchCount.toLocaleString()}</div><div className="metric-label">{sourceIsBackend ? 'Rows returned by API' : 'Reported test patches'}</div><div className="metric-detail">{sourceIsBackend ? 'Test-set size is not part of this API schema' : 'Evaluation set cited by the note'}</div></article>
      </section>

      <section className="panel benchmark-table-panel"><div className="panel-heading"><div><div className="eyebrow">FULL COMPARISON</div><h2>Model performance table</h2><p className="section-description">Footprint is in MB, latency in milliseconds, and F1 in percent.</p></div><StateBadge tone="neutral">{sourceIsBackend ? 'API supplied' : 'Paper data'}</StateBadge></div>
        <div className="table-scroll"><table className="benchmark-table"><thead><tr><th scope="col">Model</th><th scope="col">Footprint (MB)</th><th scope="col">CPU latency (ms)</th><th scope="col">Clean F1 (%)</th><th scope="col">Gaussian F1 (%)</th><th scope="col">Salt-and-pepper F1 (%)</th><th scope="col">Band-dropout F1 (%)</th></tr></thead><tbody>{rows.map((row) => <tr key={row.model_id}><th scope="row"><div className="benchmark-model-name">{row.model}</div><code>{row.model_id}</code></th><td>{formatNumber(row.footprint_mb, 2)}</td><td>{formatNumber(row.cpu_latency_ms, 2)}</td><td>{formatPercent(row.clean_f1_percent)}</td><td>{formatPercent(row.gaussian_f1_percent)}</td><td>{formatPercent(row.salt_pepper_f1_percent)}</td><td>{formatPercent(row.band_dropout_f1_percent)}</td></tr>)}</tbody></table></div>
        <p className="table-footnote">Not available values remain blank in the underlying API response and display explicitly if omitted.</p>
      </section>

      <section className="panel chart-panel"><div className="panel-heading"><div><div className="eyebrow">ROBUSTNESS PROFILE</div><h2>F1 across noise conditions</h2><p className="section-description">Grouped comparison across the four reported conditions. Values are dataset-level F1 metrics.</p></div><StateBadge tone="warning">Reported F1</StateBadge></div>
        <div className="chart-wrap chart-wrap--large"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartRows} margin={{ top: 12, right: 18, bottom: 18, left: 2 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} /><XAxis dataKey="model" tick={{ fill: 'var(--muted)', fontSize: 11 }} interval={0} angle={-8} textAnchor="end" height={70} tickLine={false} axisLine={{ stroke: 'var(--border)' }} /><YAxis domain={[0, 100]} tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} unit="%" /><Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)' }} formatter={(value) => value == null ? 'Not available' : `${value}%`} /><Legend wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }} /><Bar dataKey="clean" name="Clean" fill="#4fd1c5" radius={[3, 3, 0, 0]} /><Bar dataKey="gaussian" name="Gaussian" fill="#51a9ff" radius={[3, 3, 0, 0]} /><Bar dataKey="saltPepper" name="Salt-and-pepper" fill="#a78bfa" radius={[3, 3, 0, 0]} /><Bar dataKey="bandDropout" name="Band dropout" fill="#f6ad55" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>
        <ChartDataTable title="F1 comparison" headers={['Model', 'Clean F1 (%)', 'Gaussian F1 (%)', 'Salt-and-pepper F1 (%)', 'Band-dropout F1 (%)']} rows={rows.map((row) => [row.model, formatNumber(row.clean_f1_percent, 1), formatNumber(row.gaussian_f1_percent, 1), formatNumber(row.salt_pepper_f1_percent, 1), formatNumber(row.band_dropout_f1_percent, 1)])} />
      </section>

      <div className="charts-two-column">
        <section className="panel chart-panel"><div className="panel-heading"><div><div className="eyebrow">STORAGE</div><h2>Reported model footprint</h2><p className="section-description">Smaller model file footprint, measured in MB.</p></div></div>
          <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={footprintRows} layout="vertical" margin={{ top: 4, right: 18, left: 12, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} /><XAxis type="number" tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} unit=" MB" /><YAxis type="category" dataKey="model" width={145} tick={{ fill: 'var(--muted)', fontSize: 10 }} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)' }} formatter={(value) => value == null ? 'Not available' : `${value} MB`} /><Bar dataKey="footprint" name="Footprint" fill="#4fd1c5" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>
          <ChartDataTable title="Footprint comparison" headers={['Model', 'Footprint (MB)']} rows={rows.map((row) => [row.model, formatNumber(row.footprint_mb, 2)])} />
        </section>
        <section className="panel chart-panel"><div className="panel-heading"><div><div className="eyebrow">LATENCY</div><h2>Reported CPU latency</h2><p className="section-description">Reported average CPU inference time, in milliseconds.</p></div></div>
          <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={latencyRows} layout="vertical" margin={{ top: 4, right: 18, left: 12, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} /><XAxis type="number" tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} unit=" ms" /><YAxis type="category" dataKey="model" width={145} tick={{ fill: 'var(--muted)', fontSize: 10 }} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)' }} formatter={(value) => value == null ? 'Not available' : `${value} ms`} /><Bar dataKey="latency" name="CPU latency" fill="#51a9ff" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>
          <ChartDataTable title="Latency comparison" headers={['Model', 'CPU latency (ms)']} rows={rows.map((row) => [row.model, formatNumber(row.cpu_latency_ms, 2)])} />
        </section>
      </div>

      <section className="panel provenance-panel"><div className="provenance-icon"><Database size={19} /></div><div className="provenance-content"><div className="eyebrow">SOURCE & PROVENANCE</div><h2>{benchmarkData?.source_label ?? reportedBenchmarks.source_label}</h2><p>{sourceIsBackend ? 'These rows were returned by the configured backend evaluation endpoint. Review the notes for measurement conditions.' : 'Reported in supplied technical note; not independently reproduced by this website.'}</p><ul>{(benchmarkData?.notes ?? reportedBenchmarks.notes).map((note) => <li key={note}>{note}</li>)}</ul>{sourceIsBackend ? <div className="provenance-insights"><div><strong>Data source</strong><span>Rows were supplied by <code>/api/benchmarks</code>; source notes are shown above.</span></div><div><strong>Do not conflate timings</strong><span>Backend inference time is distinct from browser end-to-end request time.</span></div><div><strong>Keep memory separate</strong><span>Model footprint and peak runtime memory are different measurements.</span></div></div> : <div className="provenance-insights"><div><strong>INT8 vs FP32 clean F1</strong><span>{int8Row?.clean_f1_percent == null || fp32Row?.clean_f1_percent == null ? 'Not available for both models in these rows.' : `${formatPercent(int8Row.clean_f1_percent)} vs ${formatPercent(fp32Row.clean_f1_percent)} — ${cleanF1Delta !== null && cleanF1Delta >= 0 ? 'a decrease of' : 'an increase of'} ${formatNumber(Math.abs(cleanF1Delta ?? 0), 1)} percentage points.`}</span></div><div><strong>Do not conflate timings</strong><span>Reported CPU inference time is distinct from browser end-to-end request time.</span></div><div><strong>Footprint ≠ RAM</strong><span>Reported model footprint is not measured peak runtime memory.</span></div></div>}</div></section>
    </div>
  );
}
