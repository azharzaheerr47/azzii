import React, { useCallback, useState } from 'react';
import {
  Check,
  Heart,
  Image as ImageIcon,
  Monitor,
  Moon,
  RotateCcw,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';
import { optimizeCloudinaryBackgroundUrl } from '../../lib/themeLogic';
import type { CustomBackgroundConfig, ThemeMode } from '../../types/index';
import { CustomBackgroundModal } from './CustomBackgroundModal';
import { ThemePreview } from './ThemePreview';
import { useTheme } from './ThemeProvider';

interface AppearanceSettingsProps {
  spaceName: string;
  userName: string;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  spaceName,
  userName,
}) => {
  const {
    appearance,
    effectiveTheme,
    surfacePolarity,
    systemIsDark,
    savingAppearance,
    updateAppearance,
    toggleRomanticMode,
    resetToDefault,
    setLivePreview,
  } = useTheme();

  const [customModalOpen, setCustomModalOpen] = useState(false);

  const selectThemeMode = async (mode: ThemeMode) => {
    if (mode === 'custom' && !appearance.customBackground?.url) {
      setCustomModalOpen(true);
      return;
    }

    await updateAppearance(
      {
        ...appearance,
        themeMode: mode,
        romanticMode: false,
      },
      {
        toastMessage:
          mode === 'system'
            ? `Theme set to System (${systemIsDark ? 'Dark' : 'Light'}).`
            : mode === 'dark'
              ? 'Dark mode applied.'
              : mode === 'light'
                ? 'Light mode applied.'
                : 'Custom photo background applied.',
      },
    );
  };

  const handleApplyCustomBackground = async (config: CustomBackgroundConfig) => {
    await updateAppearance(
      {
        themeMode: 'custom',
        romanticMode: false,
        customBackground: config,
      },
      { toastMessage: 'Custom photo background applied.' },
    );
  };

  const handleRemoveCustomBackground = async () => {
    await updateAppearance(
      {
        themeMode: appearance.themeMode === 'custom' ? 'system' : appearance.themeMode,
        romanticMode: appearance.romanticMode,
        customBackground: null,
      },
      { toastMessage: 'Custom background photo removed.' },
    );
  };

  const handleLivePreview = useCallback(
    (config: CustomBackgroundConfig | null) => {
      if (!config) {
        setLivePreview(null);
        return;
      }
      setLivePreview({
        themeMode: 'custom',
        romanticMode: false,
        customBackground: config,
      });
    },
    [setLivePreview],
  );

  const isCustomActive = !appearance.romanticMode && appearance.themeMode === 'custom';
  const isSystemActive = !appearance.romanticMode && appearance.themeMode === 'system';
  const isDarkActive = !appearance.romanticMode && appearance.themeMode === 'dark';
  const isLightActive = !appearance.romanticMode && appearance.themeMode === 'light';
  const isDefaultState = appearance.themeMode === 'system' && !appearance.romanticMode;

  return (
    <section
      id="settings-appearance"
      aria-labelledby="appearance-heading"
      className="bg-[var(--bg-card)] backdrop-blur-md border border-[var(--border-subtle)] rounded-2xl p-6 shadow-[var(--shadow-card)] space-y-6 transition-colors scroll-mt-24"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2
            id="appearance-heading"
            className="font-display text-lg font-semibold text-[var(--text-primary)]"
          >
            Appearance &amp; Themes
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Personalized only for your account ({userName}) across every device.
          </p>
        </div>

        <button
          type="button"
          disabled={isDefaultState || savingAppearance}
          onClick={resetToDefault}
          className="self-start sm:self-auto min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to default</span>
        </button>
      </div>

      {/* Live Preview Panel */}
      <ThemePreview
        effectiveTheme={effectiveTheme}
        surfacePolarity={surfacePolarity}
        customBackground={appearance.customBackground}
        spaceName={spaceName}
        userName={userName}
      />

      {/* Signature Romantic Mode Toggle Card */}
      <div
        className={`rounded-2xl border p-4 sm:p-5 flex items-center justify-between gap-4 transition-colors duration-200 ${
          appearance.romanticMode
            ? 'bg-[var(--accent-soft)] border-[var(--accent-primary)]'
            : 'bg-[var(--bg-subtle)]/70 border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
        }`}
      >
        <div className="flex items-start gap-3.5 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors"
            style={{
              backgroundColor: appearance.romanticMode ? '#C93B72' : '#FFE4EE',
              color: appearance.romanticMode ? '#FFFFFF' : '#C93B72',
            }}
          >
            <Heart className="w-5 h-5 fill-current" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">
                Romantic Mode
              </h3>
              <span className="text-[11px] font-medium text-[var(--text-muted)]">
                · Signature atmosphere
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              A little more love in every corner. Soft pink rose tones with a celebratory flutter of hearts.
            </p>
            {appearance.romanticMode && (
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                Turn off anytime to return right back to your{' '}
                <span className="font-medium capitalize">{appearance.themeMode}</span> theme.
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={appearance.romanticMode}
          aria-label="Toggle Romantic Mode"
          disabled={savingAppearance}
          onClick={() => toggleRomanticMode(!appearance.romanticMode)}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-200 ${
            appearance.romanticMode
              ? 'bg-[#C93B72] border-[#C93B72]'
              : 'bg-[var(--bg-subtle)] border-[var(--border-strong)]'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform duration-200 ${
              appearance.romanticMode ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Theme Selection Grid */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-3.5"
        role="radiogroup"
        aria-label="Choose appearance theme"
      >
        {/* 1. System Theme (Default) */}
        <button
          type="button"
          role="radio"
          aria-checked={isSystemActive}
          disabled={savingAppearance}
          onClick={() => selectThemeMode('system')}
          className={`group text-left rounded-2xl border p-4 transition-colors duration-150 ${
            isSystemActive
              ? 'bg-[var(--accent-soft)] border-[var(--accent-primary)]'
              : 'bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            {/* Split Dark/Light visual preview */}
            <div className="w-14 h-10 rounded-xl overflow-hidden border border-[var(--border-strong)] grid grid-cols-2 shrink-0">
              <div className="bg-[#FFFFFF] p-1.5 flex flex-col justify-between">
                <span className="w-3 h-1 rounded-full bg-[#6855A3]" />
                <span className="w-full h-2 rounded-xs bg-[#F3EFFB]" />
              </div>
              <div className="bg-[#15131C] p-1.5 flex flex-col justify-between">
                <span className="w-3 h-1 rounded-full bg-[#BFA7F2]" />
                <span className="w-full h-2 rounded-xs bg-[#262231]" />
              </div>
            </div>

            {isSystemActive && (
              <span className="w-5 h-5 rounded-full bg-[var(--accent-primary)] text-[var(--accent-on-primary)] flex items-center justify-center shrink-0">
                <Check className="w-3 h-3" />
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            <Monitor className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <p className="font-display text-sm font-semibold text-[var(--text-primary)]">
              System
            </p>
          </div>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Matches device ({systemIsDark ? 'Dark' : 'Light'} active)
          </p>
        </button>

        {/* 2. Dark Theme */}
        <button
          type="button"
          role="radio"
          aria-checked={isDarkActive}
          disabled={savingAppearance}
          onClick={() => selectThemeMode('dark')}
          className={`group text-left rounded-2xl border p-4 transition-colors duration-150 ${
            isDarkActive
              ? 'bg-[var(--accent-soft)] border-[var(--accent-primary)]'
              : 'bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="w-14 h-10 rounded-xl overflow-hidden border border-[#BFA7F2]/35 bg-[#15131C] p-1.5 flex flex-col justify-between shrink-0">
              <div className="flex items-center gap-1">
                <span className="w-3 h-1 rounded-full bg-[#BFA7F2]" />
                <span className="w-4 h-1 rounded-full bg-[#ABA3BA]/50" />
              </div>
              <div className="h-3 rounded-xs bg-[#262231] border border-[#BFA7F2]/20" />
            </div>

            {isDarkActive && (
              <span className="w-5 h-5 rounded-full bg-[var(--accent-primary)] text-[var(--accent-on-primary)] flex items-center justify-center shrink-0">
                <Check className="w-3 h-3" />
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            <Moon className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <p className="font-display text-sm font-semibold text-[var(--text-primary)]">
              Dark Mode
            </p>
          </div>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Warm charcoal &amp; soft lavender
          </p>
        </button>

        {/* 3. Light Theme */}
        <button
          type="button"
          role="radio"
          aria-checked={isLightActive}
          disabled={savingAppearance}
          onClick={() => selectThemeMode('light')}
          className={`group text-left rounded-2xl border p-4 transition-colors duration-150 ${
            isLightActive
              ? 'bg-[var(--accent-soft)] border-[var(--accent-primary)]'
              : 'bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="w-14 h-10 rounded-xl overflow-hidden border border-[#6855A3]/25 bg-[#FFFFFF] p-1.5 flex flex-col justify-between shrink-0">
              <div className="flex items-center gap-1">
                <span className="w-3 h-1 rounded-full bg-[#6855A3]" />
                <span className="w-4 h-1 rounded-full bg-[#7A748A]/40" />
              </div>
              <div className="h-3 rounded-xs bg-[#FAF9FC] border border-[#6855A3]/20" />
            </div>

            {isLightActive && (
              <span className="w-5 h-5 rounded-full bg-[var(--accent-primary)] text-[var(--accent-on-primary)] flex items-center justify-center shrink-0">
                <Check className="w-3 h-3" />
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <p className="font-display text-sm font-semibold text-[var(--text-primary)]">
              Light Mode
            </p>
          </div>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Minimal, bright &amp; distraction-free
          </p>
        </button>

        {/* 4. Create Your Own Theme (Custom Photo) */}
        <div
          className={`group rounded-2xl border p-4 transition-colors duration-150 flex flex-col justify-between ${
            isCustomActive
              ? 'bg-[var(--accent-soft)] border-[var(--accent-primary)]'
              : 'bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <button
            type="button"
            role="radio"
            aria-checked={isCustomActive}
            disabled={savingAppearance}
            onClick={() => selectThemeMode('custom')}
            className="text-left w-full"
          >
            <div className="flex items-start justify-between gap-3">
              {appearance.customBackground?.url ? (
                <div className="w-14 h-10 rounded-xl overflow-hidden border border-[var(--border-strong)] relative shrink-0">
                  <img
                    src={optimizeCloudinaryBackgroundUrl(appearance.customBackground.url)}
                    alt="Your custom background"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-14 h-10 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-input)] flex items-center justify-center shrink-0">
                  <ImageIcon className="w-4 h-4 text-[var(--accent-primary)]" />
                </div>
              )}

              {isCustomActive && (
                <span className="w-5 h-5 rounded-full bg-[var(--accent-primary)] text-[var(--accent-on-primary)] flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3" />
                </span>
              )}
            </div>

            <div className="mt-3 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <p className="font-display text-sm font-semibold text-[var(--text-primary)]">
                Create Your Own Theme
              </p>
            </div>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {appearance.customBackground?.url
                ? 'Your personal photo backdrop'
                : 'Upload & customize your photo'}
            </p>
          </button>

          {appearance.customBackground?.url && (
            <button
              type="button"
              onClick={() => setCustomModalOpen(true)}
              className="mt-3 self-start inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent-primary)] hover:underline"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Customize photo &amp; blur</span>
            </button>
          )}
        </div>
      </div>

      <CustomBackgroundModal
        open={customModalOpen}
        initialConfig={appearance.customBackground}
        saving={savingAppearance}
        onLivePreview={handleLivePreview}
        onApply={handleApplyCustomBackground}
        onRemoveBackground={handleRemoveCustomBackground}
        onClose={() => setCustomModalOpen(false)}
      />
    </section>
  );
};
