import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DEFAULT_USER_APPEARANCE,
  normalizeAppearance,
  resolveEffectiveTheme,
  resolveSurfacePolarity,
} from '../../lib/themeLogic';
import type { EffectiveTheme, PublicUser, UserAppearance } from '../../types/index';
import { api } from '../../utils/apiClient';
import { useToast } from '../ui/ToastProvider';
import { BackgroundLayer } from './BackgroundLayer';
import { FallingHearts } from './FallingHearts';

const THEME_CACHE_KEY = 'ols_theme_cache';

interface ThemeCachePayload {
  themeMode: UserAppearance['themeMode'];
  romanticMode: boolean;
  overlayMode: 'dark' | 'light';
  hasCustomBg: boolean;
}

function writeThemeCache(appearance: UserAppearance): void {
  try {
    const payload: ThemeCachePayload = {
      themeMode: appearance.themeMode,
      romanticMode: appearance.romanticMode,
      overlayMode: appearance.customBackground?.overlayMode === 'light' ? 'light' : 'dark',
      hasCustomBg: Boolean(appearance.customBackground?.url),
    };
    window.localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

function readInitialSystemDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

interface ThemeContextValue {
  appearance: UserAppearance;
  effectiveTheme: EffectiveTheme;
  surfacePolarity: 'dark' | 'light';
  systemIsDark: boolean;
  savingAppearance: boolean;
  syncFromUser: (user: PublicUser | null) => void;
  updateAppearance: (
    next: UserAppearance,
    options?: { toastMessage?: string },
  ) => Promise<PublicUser | null>;
  toggleRomanticMode: (enabled: boolean) => Promise<void>;
  resetToDefault: () => Promise<void>;
  setLivePreview: (preview: UserAppearance | null) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

interface ThemeProviderProps {
  onUserAppearanceUpdated?: (user: PublicUser) => void;
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  onUserAppearanceUpdated,
  children,
}) => {
  const { showToast } = useToast();
  const [appearance, setAppearance] = useState<UserAppearance>(DEFAULT_USER_APPEARANCE);
  const [livePreview, setLivePreview] = useState<UserAppearance | null>(null);
  const [systemIsDark, setSystemIsDark] = useState<boolean>(readInitialSystemDark);
  const [savingAppearance, setSavingAppearance] = useState(false);
  const [heartBurstId, setHeartBurstId] = useState(0);
  const isAuthenticatedRef = useRef(false);

  // Listen to operating system dark/light preference changes dynamically
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = (e?: MediaQueryListEvent) => {
      setSystemIsDark(e ? e.matches : mq.matches);
    };
    update();
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, []);

  const activeAppearance = livePreview ?? appearance;

  const effectiveTheme = useMemo(
    () => resolveEffectiveTheme(activeAppearance, systemIsDark),
    [activeAppearance, systemIsDark],
  );

  const surfacePolarity = useMemo(
    () => resolveSurfacePolarity(activeAppearance, systemIsDark),
    [activeAppearance, systemIsDark],
  );

  // Sync DOM attributes, .dark variant, and <meta name="theme-color">
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = effectiveTheme;
    root.dataset.surface = surfacePolarity;
    root.classList.toggle('dark', surfacePolarity === 'dark');

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      const color =
        effectiveTheme === 'romantic'
          ? '#D94F85'
          : surfacePolarity === 'dark'
            ? '#17151F'
            : '#6554A4';
      metaTheme.setAttribute('content', color);
    }
  }, [effectiveTheme, surfacePolarity]);

  const syncFromUser = useCallback((user: PublicUser | null) => {
    if (!user) {
      isAuthenticatedRef.current = false;
      setLivePreview(null);
      setAppearance(DEFAULT_USER_APPEARANCE);
      writeThemeCache(DEFAULT_USER_APPEARANCE);
      return;
    }
    isAuthenticatedRef.current = true;
    const normalized = normalizeAppearance(user.appearance);
    setAppearance(normalized);
    writeThemeCache(normalized);
  }, []);

  const updateAppearance = useCallback(
    async (
      rawNext: UserAppearance,
      options?: { toastMessage?: string },
    ): Promise<PublicUser | null> => {
      const next = normalizeAppearance(rawNext);
      const prev = appearance;

      if (!prev.romanticMode && next.romanticMode) {
        setHeartBurstId((n) => n + 1);
      }

      setAppearance(next);
      writeThemeCache(next);

      if (!isAuthenticatedRef.current) {
        return null;
      }

      setSavingAppearance(true);
      try {
        const res = await api.updateAppearance(next);
        const persisted = normalizeAppearance(res.user.appearance);
        setAppearance(persisted);
        writeThemeCache(persisted);
        onUserAppearanceUpdated?.(res.user);
        if (options?.toastMessage) {
          showToast(options.toastMessage, 'success');
        }
        return res.user;
      } catch (err) {
        setAppearance(prev);
        writeThemeCache(prev);
        showToast(
          err instanceof Error ? err.message : 'Could not save theme preferences.',
          'error',
        );
        return null;
      } finally {
        setSavingAppearance(false);
      }
    },
    [appearance, onUserAppearanceUpdated, showToast],
  );

  const toggleRomanticMode = useCallback(
    async (enabled: boolean) => {
      const next: UserAppearance = {
        ...appearance,
        romanticMode: enabled,
      };
      await updateAppearance(next, {
        toastMessage: enabled
          ? 'Love is in the little things. 💗'
          : 'Restored your previous theme.',
      });
    },
    [appearance, updateAppearance],
  );

  const resetToDefault = useCallback(async () => {
    const next: UserAppearance = {
      themeMode: 'system',
      romanticMode: false,
      customBackground: appearance.customBackground,
    };
    await updateAppearance(next, {
      toastMessage: 'Appearance reset to System default.',
    });
  }, [appearance.customBackground, updateAppearance]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      appearance,
      effectiveTheme,
      surfacePolarity,
      systemIsDark,
      savingAppearance,
      syncFromUser,
      updateAppearance,
      toggleRomanticMode,
      resetToDefault,
      setLivePreview,
    }),
    [
      appearance,
      effectiveTheme,
      surfacePolarity,
      systemIsDark,
      savingAppearance,
      syncFromUser,
      updateAppearance,
      toggleRomanticMode,
      resetToDefault,
    ],
  );

  return (
    <ThemeContext.Provider value={value}>
      <BackgroundLayer
        active={effectiveTheme === 'custom'}
        config={activeAppearance.customBackground}
      />
      <FallingHearts burstId={heartBurstId} />
      <div className="relative z-10 min-h-screen">{children}</div>
    </ThemeContext.Provider>
  );
};
