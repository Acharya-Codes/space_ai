import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Atom, CheckCircle2, Cpu, Orbit, Satellite, Sparkles, Waves, UserRound } from 'lucide-react';
import { ThemePicker } from '../components/common/ThemePicker';

interface WelcomePageProps {
  onEnter: (displayName: string) => void;
}

export function WelcomePage({ onEnter }: WelcomePageProps) {
  const [displayName, setDisplayName] = useState('');
  const navigate = useNavigate();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = displayName.trim().slice(0, 40);
    onEnter(name);
    navigate('/', { replace: true });
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-ambient welcome-ambient--one" aria-hidden="true" />
      <div className="welcome-ambient welcome-ambient--two" aria-hidden="true" />
      <header className="welcome-topbar">
        <div className="welcome-brand">
          <div className="welcome-brand-mark" aria-hidden="true"><Orbit size={23} strokeWidth={1.8} /></div>
          <div><div className="welcome-brand-name">OrbitLens</div><div className="welcome-brand-caption">NOISE-ROBUST SATELLITE AI</div></div>
        </div>
        <div className="welcome-header-actions">
          <span className="welcome-project-pill"><span /> THESIS RESEARCH DEMO</span>
          <ThemePicker />
        </div>
      </header>

      <main className="welcome-main">
        <section className="welcome-copy" aria-labelledby="welcome-title">
          <div className="welcome-eyebrow"><span className="welcome-eyebrow-line" /> RESEARCH WORKSPACE <span className="welcome-eyebrow-index">01 / 04</span></div>
          <h1 id="welcome-title">See the signal.<br /><span>Respect the noise.</span></h1>
          <p className="welcome-lead">A research demonstrator for compact satellite AI — explore how image quality, model footprint, and edge inference constraints shape the path from pixels to a proposed downlink decision.</p>

          <div className="welcome-highlights" aria-label="Project scope">
            <div><span className="welcome-highlight-icon"><Cpu size={17} /></span><span><strong>Edge-first models</strong><small>Compact inference research</small></span></div>
            <div><span className="welcome-highlight-icon"><Waves size={17} /></span><span><strong>Noise-aware evaluation</strong><small>Three synthetic operators</small></span></div>
            <div><span className="welcome-highlight-icon"><CheckCircle2 size={17} /></span><span><strong>Transparent evidence</strong><small>Reported results stay labelled</small></span></div>
          </div>

          <form className="welcome-access-card" onSubmit={handleSubmit}>
            <div className="welcome-access-title-row">
              <div><div className="welcome-access-eyebrow">WORKSPACE ACCESS</div><h2>Enter the research console</h2></div>
              <div className="welcome-access-icon"><Sparkles size={19} /></div>
            </div>
            <label htmlFor="researcher-display-name">Researcher label <span>OPTIONAL</span></label>
            <div className="welcome-name-input-wrap">
              <UserRound size={16} aria-hidden="true" />
              <input id="researcher-display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={40} placeholder="e.g. Researcher or Thesis Lab" autoComplete="nickname" />
            </div>
            <button type="submit" className="welcome-enter-button">Continue to workspace <ArrowRight size={17} /></button>
            <p className="welcome-access-note"><Atom size={13} /> No account or password required. This is a local demo entry screen, not authentication.</p>
          </form>
        </section>

        <section className="welcome-visual" aria-label="Illustrative satellite image tile artwork">
          <div className="welcome-visual-topline"><span><span className="welcome-status-dot" /> RESEARCH PREVIEW</span><span>RGB · 64 × 64</span></div>
          <div className="orbital-scene" aria-hidden="true">
            <div className="orbital-ring orbital-ring--outer" />
            <div className="orbital-ring orbital-ring--middle" />
            <div className="orbital-ring orbital-ring--inner" />
            <div className="orbital-glow" />
            <div className="orbital-planet"><div className="planet-highlight" /><div className="planet-continent planet-continent--one" /><div className="planet-continent planet-continent--two" /><div className="planet-continent planet-continent--three" /></div>
            <div className="orbital-satellite"><Satellite size={26} strokeWidth={1.4} /></div>
            <div className="welcome-image-tile">
              <div className="welcome-tile-land welcome-tile-land--one" />
              <div className="welcome-tile-land welcome-tile-land--two" />
              <div className="welcome-tile-river" />
              <div className="welcome-tile-grid" />
              <div className="welcome-tile-crosshair" />
              <span className="welcome-tile-corner welcome-tile-corner--tl" />
              <span className="welcome-tile-corner welcome-tile-corner--br" />
              <span className="welcome-tile-caption">ILLUSTRATIVE TILE ART</span>
            </div>
            <div className="welcome-float-card welcome-float-card--top"><span className="welcome-float-symbol"><Atom size={15} /></span><span><strong>64 × 64</strong><small>RGB INPUT CONTRACT</small></span></div>
            <div className="welcome-float-card welcome-float-card--bottom"><span className="welcome-float-symbol welcome-float-symbol--blue"><Cpu size={15} /></span><span><strong>Compute-constrained</strong><small>MODEL EVALUATION</small></span></div>
          </div>
          <div className="welcome-visual-caption"><span>Conceptual visualization only</span><span>No live satellite telemetry</span></div>
          <div className="welcome-visual-footer"><span className="welcome-footer-icon"><Satellite size={16} /></span><div><strong>From input tile to informed review</strong><p>Upload, evaluate, compare — with backend-defined predictions and decisions.</p></div><span className="welcome-footer-arrow"><ArrowRight size={16} /></span></div>
        </section>
      </main>

      <footer className="welcome-bottomline"><span>ORBITLENS <i /> RESEARCH DEMONSTRATOR</span><span>Not a live satellite-control system · No flight qualification implied</span></footer>
    </div>
  );
}
