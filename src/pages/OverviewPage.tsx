import { ArrowDownToLine, ArrowRight, ArrowUpRight, BrainCircuit, Cpu, FlaskConical, Layers3, ShieldAlert, Waypoints } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StateBadge } from '../components/common/StateBadge';
import { reportedBenchmarkRows, reportedStudyContext } from '../data/reportedBenchmarks';
import { formatNumber, formatPercent } from '../utils/formatting';

const reportedInt8Row = reportedBenchmarkRows.find((row) => row.model_id === reportedStudyContext.int8MobileNetModelId);
const reportedMetrics = [
  { label: 'INT8 model footprint', value: `${formatNumber(reportedInt8Row?.footprint_mb, 2)}${reportedInt8Row?.footprint_mb == null ? '' : ' MB'}`, detail: 'Reported model footprint', icon: Layers3 },
  { label: 'Clean F1 score', value: formatPercent(reportedInt8Row?.clean_f1_percent), detail: 'Reported in technical note', icon: BrainCircuit },
  { label: 'CPU inference latency', value: `${formatNumber(reportedInt8Row?.cpu_latency_ms, 1)}${reportedInt8Row?.cpu_latency_ms == null ? '' : ' ms'}`, detail: 'Reported average latency', icon: Cpu },
  { label: 'Model input', value: `${reportedStudyContext.inputWidth} × ${reportedStudyContext.inputHeight}`, detail: `${reportedStudyContext.inputChannels}-channel RGB image tile`, icon: Waypoints },
];

const stages = [
  { number: '01', title: 'Upload / input tile', detail: 'PNG or JPEG source image', icon: ArrowUpRight, tag: 'User input' },
  { number: '02', title: 'Backend preprocessing', detail: 'Decode · RGB · resize · normalize', icon: Layers3, tag: 'Backend-owned' },
  { number: '03', title: 'Optional input noise', detail: 'Gaussian · salt-and-pepper · band dropout', icon: ShieldAlert, tag: 'Evaluation control' },
  { number: '04', title: 'Quantized model', detail: 'Selected deployed model inference', icon: BrainCircuit, tag: 'Offline quantized' },
  { number: '05', title: 'Prediction + policy', detail: 'Backend label, scores, and decision', icon: ArrowDownToLine, tag: 'Backend response' },
];

export function OverviewPage() {
  return (
    <div className="page-stack">
      <section className="hero-section">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> ONBOARD EDGE AI · RESEARCH DEMONSTRATOR</div>
          <h1>Screen the signal.<br /><span>Protect the downlink.</span></h1>
          <p className="hero-description">This interface demonstrates noise-robust satellite image classification for compute-constrained edge deployment.</p>
          <div className="hero-actions">
            <Link to="/analysis" className="button button--primary">Open Analysis Lab <ArrowRight size={16} /></Link>
            <Link to="/benchmarks" className="button button--secondary">View Benchmarks <ArrowUpRight size={16} /></Link>
          </div>
          <div className="hero-footnote"><span className="mini-status-dot" /> Offline training and quantization · Online inference only</div>
        </div>
        <div className="hero-art hero-art--reference" aria-label="Static OrbitLens interface concept image">
          <img className="hero-reference-image" src="/images/orbitlens-ui-reference.webp" alt="Static design reference showing the OrbitLens satellite research demonstrator interface over Earth and space." />
          <div className="hero-reference-scrim" aria-hidden="true" />
          <div className="hero-art-label">VISUAL CONCEPT · STATIC REFERENCE</div>
          <div className="hero-art-caption"><span className="tile-coordinate">ORBITLENS UI <b>·</b> DESIGN REFERENCE</span><StateBadge tone="neutral">Not live telemetry</StateBadge></div>
        </div>
      </section>

      <section aria-labelledby="reported-metrics-heading">
        <div className="section-heading-row"><div><div className="eyebrow">REPORTED BASELINE</div><h2 id="reported-metrics-heading">At a glance</h2></div><StateBadge tone="warning">Technical note values</StateBadge></div>
        <div className="metric-grid">
          {reportedMetrics.map(({ label, value, detail, icon: Icon }) => (
            <article className="metric-card" key={label}>
              <div className="metric-card-top"><span className="metric-icon"><Icon size={18} /></span><span className="metric-asterisk">↗</span></div>
              <div className="metric-value">{value}</div><div className="metric-label">{label}</div>
              <div className="metric-detail"><span className="reported-dot" />{detail}</div>
            </article>
          ))}
        </div>
        <p className="subtle-note">Reported in supplied technical note; not independently reproduced by this website. CPU and runtime details are incompletely specified.</p>
      </section>

      <section className="panel pipeline-panel" aria-labelledby="pipeline-title">
        <div className="panel-heading">
          <div><div className="eyebrow">END-TO-END WORKFLOW</div><h2 id="pipeline-title">From input tile to proposed action</h2><p className="section-description">The actual preprocessing, inference, and decision policy are owned by the backend in live mode.</p></div>
          <StateBadge tone="info">Conceptual pipeline</StateBadge>
        </div>
        <div className="pipeline-grid">
          {stages.map(({ number, title, detail, icon: Icon, tag }, index) => (
            <div className="pipeline-stage-wrap" key={number}>
              <article className="pipeline-stage">
                <div className="pipeline-stage-top"><span>{number}</span><Icon size={19} /></div>
                <h3>{title}</h3><p>{detail}</p><span className="pipeline-tag">{tag}</span>
              </article>
              {index < stages.length - 1 && <ArrowRight size={16} className="pipeline-connector" aria-hidden="true" />}
            </div>
          ))}
        </div>
        <div className="offline-note"><div className="offline-note-icon"><Cpu size={17} /></div><div><strong>Training and quantization happen offline.</strong><p>Noise-aware training augments the training data; INT8 post-training quantization produces a deployment artifact. The optional noise control only simulates input degradation for evaluation—it does not retrain or requantize the model on each upload.</p></div></div>
      </section>

      <section className="research-grid" aria-label="Research goals and limitations">
        <article className="panel research-panel">
          <div className="eyebrow">RESEARCH GOALS</div><h2>Designed around edge constraints</h2>
          <div className="goal-list">
            <div className="goal-item"><span className="goal-number">01</span><div><strong>Small model footprint</strong><p>Explore compact parameter storage for bandwidth-constrained platforms.</p></div></div>
            <div className="goal-item"><span className="goal-number">02</span><div><strong>Low inference latency</strong><p>Compare reported CPU timing while keeping request time separate.</p></div></div>
            <div className="goal-item"><span className="goal-number">03</span><div><strong>Synthetic-noise robustness</strong><p>Evaluate behavior under defined image corruption operators.</p></div></div>
            <div className="goal-item"><span className="goal-number">04</span><div><strong>Screen before a possible downlink</strong><p>Surface a backend policy decision without inventing local thresholds.</p></div></div>
          </div>
        </article>
        <aside className="limitation-card">
          <div className="limitation-icon"><ShieldAlert size={20} /></div><div className="eyebrow">IMPORTANT LIMITATION</div><h2>Research interface, not flight evidence.</h2>
          <p>The website does not demonstrate flight readiness, live satellite connectivity, onboard energy consumption, total runtime RAM, or operational bandwidth savings.</p>
          <Link to="/methodology" className="text-link">Read methodology and limitations <ArrowRight size={14} /></Link>
        </aside>
      </section>

      <section className="next-step-strip"><div className="next-step-icon"><FlaskConical size={20} /></div><div><strong>Explore the analysis workflow</strong><p>Upload a PNG or JPEG and inspect the proposed API result flow. Demo mode returns a fixed fixture, not a classification of your image.</p></div><Link to="/analysis" className="button button--secondary">Open Lab <ArrowRight size={15} /></Link></section>
    </div>
  );
}
