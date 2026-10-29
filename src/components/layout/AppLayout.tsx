import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Atom, BarChart3, BookOpenText, ChevronRight, CircleHelp, FlaskConical, Gauge, LogOut, Menu, Orbit, RefreshCw, Satellite, X } from 'lucide-react';
import { useAppContext } from '../../app/AppContext';
import { StateBadge } from '../common/StateBadge';
import { ThemePicker } from '../common/ThemePicker';

const navItems = [
  { to: '/', label: 'Overview', icon: Gauge, end: true },
  { to: '/analysis', label: 'Analysis Lab', icon: FlaskConical, end: false },
  { to: '/benchmarks', label: 'Benchmarks', icon: BarChart3, end: false },
  { to: '/methodology', label: 'Methodology', icon: BookOpenText, end: false },
];

export function AppLayout({ onLeave }: { onLeave: () => void }) {
  const { mode, healthState, health, healthError, retryMetadata } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [displayName] = useState(() => {
    try { return window.sessionStorage.getItem('orbitlens-display-name') ?? ''; }
    catch { return ''; }
  });

  function leaveWorkspace() {
    try {
      window.sessionStorage.removeItem('orbitlens-workspace-entry');
      window.sessionStorage.removeItem('orbitlens-display-name');
    } catch { /* The user can still return to the welcome screen. */ }
    onLeave();
    navigate('/login', { replace: true });
  }

  useEffect(() => setMobileOpen(false), [location.pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  const healthOk = healthState === 'success' && health?.status.toLowerCase() === 'ok';
  const healthUnavailable = mode === 'live' && healthState !== 'loading' && !healthOk;
  const status = mode === 'demo'
    ? { label: 'Demo / no backend required', tone: 'info' as const }
    : healthOk
      ? { label: `Connected · v${health.version}`, tone: 'success' as const }
      : healthState === 'loading'
        ? { label: 'Checking API…', tone: 'neutral' as const }
        : { label: 'API unavailable', tone: 'danger' as const };

  const navContent = (
    <>
      <div className="sidebar-brand">
        <div className="brand-mark" aria-hidden="true"><Orbit size={23} strokeWidth={1.8} /></div>
        <div><div className="brand-name">OrbitLens</div><div className="brand-subtitle">RESEARCH CONSOLE</div></div>
      </div>
      <div className="sidebar-section-label">WORKSPACE</div>
      <nav className="primary-nav" aria-label="Primary navigation">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}>
            <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
            {location.pathname === to && <ChevronRight className="nav-chevron" size={15} aria-hidden="true" />}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-theme-setting"><span>COLOUR THEME</span><ThemePicker /></div>
      <div className="sidebar-note">
        <div className="sidebar-note-icon"><Satellite size={18} /></div>
        <p className="sidebar-note-title">Edge inference study</p>
        <p className="sidebar-note-copy">64 × 64 RGB tiles, synthetic sensor noise, and compact model evaluation.</p>
        <NavLink to="/methodology" className="text-link">Study details <ChevronRight size={13} /></NavLink>
      </div>
      <div className="sidebar-bottom"><span className="sidebar-dot" /><span className="sidebar-user-label">{displayName ? `Workspace · ${displayName}` : 'Thesis research demonstrator'}</span><button type="button" className="sidebar-exit-button" onClick={leaveWorkspace} title="Leave demo workspace" aria-label="Leave demo workspace"><LogOut size={14} /></button></div>
    </>
  );

  return (
    <div className="app-shell">
      <aside className="sidebar desktop-sidebar">{navContent}</aside>
      {mobileOpen && <div className="mobile-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) setMobileOpen(false); }}>
        <aside className="sidebar mobile-sidebar" role="dialog" aria-modal="true" aria-label="Mobile navigation">
          <button type="button" className="icon-button mobile-close" aria-label="Close navigation menu" onClick={() => setMobileOpen(false)}><X size={20} /></button>
          {navContent}
        </aside>
      </div>}
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button type="button" className="icon-button mobile-menu-trigger" aria-label="Open navigation menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
            <div className="breadcrumb"><span>OrbitLens</span><span className="breadcrumb-sep">/</span><strong>{navItems.find((item) => item.to === location.pathname)?.label ?? 'Research page'}</strong></div>
          </div>
          <div className="topbar-right">
            <StateBadge tone={mode === 'demo' ? 'info' : 'neutral'}><span className="badge-dot" />{mode.toUpperCase()} MODE</StateBadge>
            <div className="api-status-wrap">
              <StateBadge tone={status.tone}><span className="badge-dot" /><span className="api-status-label">{status.label}</span></StateBadge>
              {healthUnavailable && <button type="button" className="tiny-icon-button" title="Retry API health and model metadata" aria-label="Retry API health and model metadata" onClick={retryMetadata}><RefreshCw size={14} /></button>}
              {mode === 'live' && healthError && <span className="sr-only" role="status">{healthError}</span>}
            </div>
            <div className="topbar-theme-picker"><ThemePicker /></div>
          </div>
        </header>
        {mode === 'demo' && <div className="demo-banner" role="status"><Atom size={16} aria-hidden="true" /><div><strong>Demo mode — illustrative fixtures, not model inference.</strong><span>Uploaded images are not classified. Use live mode only after connecting a backend that implements the proposed API.</span></div></div>}
        {healthUnavailable && <div className="global-alert" role="status"><CircleHelp size={17} /><div><strong>Backend health check did not confirm availability.</strong> {healthError ?? `Health endpoint status: ${health?.status ?? 'unknown'}.`}</div><button type="button" className="button button--ghost button--small" onClick={retryMetadata}><RefreshCw size={14} /> Retry connection</button></div>}
        <main id="main-content" className="page-content"><Outlet /></main>
        <footer className="app-footer"><span>OrbitLens <span className="footer-separator">·</span> Noise-Robust Satellite AI Research Demonstrator</span><span><Activity size={13} /> Thesis prototype · Not a flight-control system</span></footer>
      </div>
    </div>
  );
}
