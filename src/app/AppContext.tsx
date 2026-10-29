import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { HealthResponse, ModelMetadata } from '../types/api';
import { api, dataMode } from '../services/api';
import { asErrorMessage } from '../services/errors';

export type LoadState = 'idle' | 'loading' | 'success' | 'error';
export type ThemeName = 'aurora' | 'solar' | 'violet' | 'ember';

const validThemes: ThemeName[] = ['aurora', 'solar', 'violet', 'ember'];

function readInitialTheme(): ThemeName {
  try {
    const saved = window.localStorage.getItem('orbitlens-theme');
    if (saved && validThemes.includes(saved as ThemeName)) return saved as ThemeName;
  } catch {
    // Storage can be disabled by the browser; the default theme still works.
  }
  return 'aurora';
}

interface AppContextValue {
  mode: typeof dataMode;
  health: HealthResponse | null;
  healthState: LoadState;
  healthError: string | null;
  models: ModelMetadata[];
  modelsState: LoadState;
  modelsError: string | null;
  retryMetadata: () => void;
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthState, setHealthState] = useState<LoadState>('idle');
  const [healthError, setHealthError] = useState<string | null>(null);
  const [models, setModels] = useState<ModelMetadata[]>([]);
  const [modelsState, setModelsState] = useState<LoadState>('idle');
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [theme, setTheme] = useState<ThemeName>(readInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const themeColors: Record<ThemeName, string> = {
      aurora: '#07111f',
      solar: '#151019',
      violet: '#0d0d20',
      ember: '#170f16',
    };
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', themeColors[theme]);
    try {
      window.localStorage.setItem('orbitlens-theme', theme);
    } catch {
      // Theme selection remains active for this session if storage is unavailable.
    }
  }, [theme]);

  const retryMetadata = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setHealthState('loading');
    setModelsState('loading');
    setHealthError(null);
    setModelsError(null);

    api.getHealth(controller.signal).then((value) => {
      if (controller.signal.aborted) return;
      setHealth(value);
      setHealthState('success');
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setHealth(null);
      setHealthError(asErrorMessage(error));
      setHealthState('error');
    });

    api.getModels(controller.signal).then((value) => {
      if (controller.signal.aborted) return;
      setModels(value);
      setModelsState('success');
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setModels([]);
      setModelsError(asErrorMessage(error));
      setModelsState('error');
    });

    return () => controller.abort();
  }, [reloadKey]);

  const value = useMemo<AppContextValue>(() => ({
    mode: dataMode,
    health,
    healthState,
    healthError,
    models,
    modelsState,
    modelsError,
    retryMetadata,
    theme,
    setTheme,
  }), [health, healthState, healthError, models, modelsState, modelsError, retryMetadata, theme]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useAppContext must be used inside AppProvider.');
  return value;
}
