import type {
  BackgroundPosition,
  CustomBackgroundConfig,
  EffectiveTheme,
  OverlayMode,
  ThemeMode,
  UserAppearance,
} from '../types/index';

export const DEFAULT_CUSTOM_BACKGROUND_SETTINGS = {
  position: 'center' as BackgroundPosition,
  scale: 100,
  blur: 0,
  brightness: 95,
  overlayOpacity: 45,
  overlayMode: 'dark' as OverlayMode,
};

export const DEFAULT_USER_APPEARANCE: UserAppearance = {
  themeMode: 'system',
  romanticMode: false,
  customBackground: null,
};

export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.round(num)));
}

export function normalizeCustomBackground(
  raw: Partial<CustomBackgroundConfig> | null | undefined,
): CustomBackgroundConfig | null {
  if (!raw || typeof raw.url !== 'string' || !raw.url.trim()) {
    return null;
  }
  const position: BackgroundPosition =
    raw.position === 'top' ||
    raw.position === 'bottom' ||
    raw.position === 'left' ||
    raw.position === 'right'
      ? raw.position
      : 'center';

  const overlayMode: OverlayMode = raw.overlayMode === 'light' ? 'light' : 'dark';

  return {
    url: raw.url.trim(),
    publicId: typeof raw.publicId === 'string' ? raw.publicId.trim() : '',
    position,
    scale: clampNumber(raw.scale, 100, 150, DEFAULT_CUSTOM_BACKGROUND_SETTINGS.scale),
    blur: clampNumber(raw.blur, 0, 24, DEFAULT_CUSTOM_BACKGROUND_SETTINGS.blur),
    brightness: clampNumber(
      raw.brightness,
      40,
      130,
      DEFAULT_CUSTOM_BACKGROUND_SETTINGS.brightness,
    ),
    overlayOpacity: clampNumber(
      raw.overlayOpacity,
      15,
      85,
      DEFAULT_CUSTOM_BACKGROUND_SETTINGS.overlayOpacity,
    ),
    overlayMode,
  };
}

export function normalizeAppearance(
  raw: Partial<UserAppearance> | null | undefined,
): UserAppearance {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_USER_APPEARANCE, customBackground: null };
  }

  const themeMode: ThemeMode =
    raw.themeMode === 'dark' ||
    raw.themeMode === 'light' ||
    raw.themeMode === 'custom' ||
    raw.themeMode === 'system'
      ? raw.themeMode
      : 'system';

  const customBackground = normalizeCustomBackground(raw.customBackground);

  return {
    themeMode: themeMode === 'custom' && !customBackground ? 'system' : themeMode,
    romanticMode: Boolean(raw.romanticMode),
    customBackground,
  };
}

export function resolveEffectiveTheme(
  appearance: UserAppearance,
  systemIsDark: boolean,
): EffectiveTheme {
  if (appearance.romanticMode) {
    return 'romantic';
  }
  if (appearance.themeMode === 'custom' && appearance.customBackground?.url) {
    return 'custom';
  }
  if (appearance.themeMode === 'dark') {
    return 'dark';
  }
  if (appearance.themeMode === 'light') {
    return 'light';
  }
  return systemIsDark ? 'dark' : 'light';
}

export function resolveSurfacePolarity(
  appearance: UserAppearance,
  systemIsDark: boolean,
): 'dark' | 'light' {
  const effective = resolveEffectiveTheme(appearance, systemIsDark);
  if (effective === 'dark') return 'dark';
  if (effective === 'custom') {
    return appearance.customBackground?.overlayMode === 'light' ? 'light' : 'dark';
  }
  return 'light';
}

export function mapPositionToCss(position: BackgroundPosition): string {
  switch (position) {
    case 'top':
      return '50% 15%';
    case 'bottom':
      return '50% 85%';
    case 'left':
      return '15% 50%';
    case 'right':
      return '85% 50%';
    case 'center':
    default:
      return '50% 50%';
  }
}

export function buildCustomBackgroundImageStyle(config: CustomBackgroundConfig): {
  objectPosition: string;
  transform: string;
  filter: string;
} {
  const scaleRatio = (clampNumber(config.scale, 100, 150, 100) / 100).toFixed(2);
  const blurPx = clampNumber(config.blur, 0, 24, 0);
  const brightnessPct = clampNumber(config.brightness, 40, 130, 95);

  return {
    objectPosition: mapPositionToCss(config.position),
    transform: `scale(${scaleRatio})`,
    filter: `blur(${blurPx}px) brightness(${brightnessPct}%)`,
  };
}

export function buildCustomBackgroundOverlayColor(config: CustomBackgroundConfig): string {
  const alpha = (clampNumber(config.overlayOpacity, 15, 85, 45) / 100).toFixed(2);
  return config.overlayMode === 'light'
    ? `rgba(255, 250, 253, ${alpha})`
    : `rgba(18, 15, 26, ${alpha})`;
}

export function optimizeCloudinaryBackgroundUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed.startsWith('https://res.cloudinary.com/')) {
    return trimmed;
  }
  const marker = '/image/upload/';
  const idx = trimmed.indexOf(marker);
  if (idx === -1) return trimmed;
  const afterMarker = trimmed.slice(idx + marker.length);
  if (afterMarker.startsWith('f_auto') || afterMarker.startsWith('q_auto')) {
    return trimmed;
  }
  return `${trimmed.slice(0, idx + marker.length)}f_auto,q_auto,w_1920,c_limit/${afterMarker}`;
}
