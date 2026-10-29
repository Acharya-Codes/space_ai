import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './AppContext';
import { AppLayout } from '../components/layout/AppLayout';
import { OverviewPage } from '../pages/OverviewPage';
import { AnalysisPage } from '../pages/AnalysisPage';
import { BenchmarksPage } from '../pages/BenchmarksPage';
import { MethodologyPage } from '../pages/MethodologyPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { WelcomePage } from '../pages/WelcomePage';

function readWorkspaceEntry(): boolean {
  try {
    return window.sessionStorage.getItem('orbitlens-workspace-entry') === 'true';
  } catch {
    return false;
  }
}

function AppRoutes() {
  const [hasEntered, setHasEntered] = useState(readWorkspaceEntry);

  function enterWorkspace(displayName: string) {
    try {
      window.sessionStorage.setItem('orbitlens-workspace-entry', 'true');
      if (displayName) window.sessionStorage.setItem('orbitlens-display-name', displayName);
      else window.sessionStorage.removeItem('orbitlens-display-name');
    } catch {
      // The local demo gate remains usable even if session storage is blocked.
    }
    setHasEntered(true);
  }

  return (
    <Routes>
      <Route path="/login" element={hasEntered ? <Navigate to="/" replace /> : <WelcomePage onEnter={enterWorkspace} />} />
      <Route path="/welcome" element={<Navigate to="/login" replace />} />
      <Route element={hasEntered ? <AppLayout onLeave={() => setHasEntered(false)} /> : <Navigate to="/login" replace />}>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/benchmarks" element={<BenchmarksPage />} />
        <Route path="/methodology" element={<MethodologyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
