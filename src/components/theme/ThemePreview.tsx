import React from 'react';
import { Heart, Sparkles } from 'lucide-react';
import {
  buildCustomBackgroundImageStyle,
  buildCustomBackgroundOverlayColor,
  optimizeCloudinaryBackgroundUrl,
} from '../../lib/themeLogic';
import type { CustomBackgroundConfig, EffectiveTheme } from '../../types/index';

interface ThemePreviewProps {
  effectiveTheme: EffectiveTheme;
  surfacePolarity: 'dark' | 'light';
  customBackground: CustomBackgroundConfig | null;
  spaceName: string;
  userName: string;
}

export const ThemePreview: React.FC<ThemePreviewProps> = ({
  effectiveTheme,
  surfacePolarity,
  customBackground,
  spaceName,
  userName,
}) => {
  const isRomantic = effectiveTheme === 'romantic';
  const isCustom = effectiveTheme === 'custom' && Boolean(customBackground?.url);
  const isDark = surfacePolarity === 'dark';

  const palette = isRomantic
    ? {
        canvas: '#FFF3F7',
        nav: 'rgba(255, 243, 247, 0.92)',
        card: '#FFFFFF',
        noteA: '#FCE0EA',
        noteB: '#FFD5E4',
        text: '#4A2638',
        muted: '#956B7D',
        accent: '#D94F85',
        accentText: '#FFFFFF',
        border: 'rgba(217, 79, 133, 0.2)',
        badgeLabel: 'Romantic Mode',
      }
    : isDark
      ? {
          canvas: '#17151F',
          nav: 'rgba(33, 29, 43, 0.88)',
          card: isCustom ? 'rgba(40, 35, 51, 0.82)' : '#282333',
          noteA: isCustom ? 'rgba(46, 39, 64, 0.84)' : '#2E2740',
          noteB: isCustom ? 'rgba(53, 38, 53, 0.84)' : '#352635',
          text: '#F6F2FC',
          muted: '#A8A0B7',
          accent: '#BFA7F2',
          accentText: '#17151F',
          border: 'rgba(191, 167, 242, 0.22)',
          badgeLabel: isCustom ? 'Custom Photo · Dark Scrim' : 'Dark Mode',
        }
      : {
          canvas: '#FFFFFF',
          nav: 'rgba(255, 255, 255, 0.92)',
          card: isCustom ? 'rgba(255, 255, 255, 0.86)' : '#FFFFFF',
          noteA: isCustom ? 'rgba(243, 239, 251, 0.88)' : '#F5F0FF',
          noteB: isCustom ? 'rgba(255, 232, 240, 0.88)' : '#FFF2F7',
          text: '#29253A',
          muted: '#817B90',
          accent: '#6554A4',
          accentText: '#FFFFFF',
          border: 'rgba(101, 84, 164, 0.16)',
          badgeLabel: isCustom ? 'Custom Photo · Light Scrim' : 'Light Mode',
        };

  const customImgStyle =
    isCustom && customBackground ? buildCustomBackgroundImageStyle(customBackground) : null;
  const customOverlay =
    isCustom && customBackground ? buildCustomBackgroundOverlayColor(customBackground) : null;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-colors duration-300"
      style={{
        backgroundColor: palette.canvas,
        borderColor: palette.border,
      }}
      aria-label={`Live theme preview: ${palette.badgeLabel}`}
    >
      {isCustom && customBackground && customImgStyle && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <img
            src={optimizeCloudinaryBackgroundUrl(customBackground.url)}
            alt=""
            className="w-full h-full object-cover"
            style={{
              objectPosition: customImgStyle.objectPosition,
              transform: customImgStyle.transform,
              filter: customImgStyle.filter,
            }}
          />
          <div className="absolute inset-0" style={{ backgroundColor: customOverlay ?? undefined }} />
        </div>
      )}

      {isRomantic && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none overflow-hidden opacity-75"
        >
          <Heart
            className="w-3.5 h-3.5 absolute top-3 right-8 text-[#F28DB5] fill-[#F28DB5]"
            style={{ transform: 'rotate(-12deg)' }}
          />
          <Heart
            className="w-3 h-3 absolute bottom-4 right-14 text-[#E65B78] fill-[#E65B78] opacity-70"
            style={{ transform: 'rotate(16deg)' }}
          />
          <Heart
            className="w-2.5 h-2.5 absolute top-11 right-24 text-[#D94F85] fill-[#D94F85] opacity-60"
          />
        </div>
      )}

      <div className="relative z-10 space-y-3">
        {/* Mini Header Bar */}
        <div
          className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-2 border backdrop-blur-md"
          style={{
            backgroundColor: palette.nav,
            borderColor: palette.border,
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: palette.accent }}
            />
            <span
              className="font-display text-xs font-semibold truncate"
              style={{ color: palette.text }}
            >
              {spaceName}
            </span>
          </div>
          <span className="text-[11px] font-medium shrink-0" style={{ color: palette.muted }}>
            {palette.badgeLabel}
          </span>
        </div>

        {/* Mini Feed Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            className="rounded-xl p-3.5 border backdrop-blur-md space-y-2"
            style={{
              backgroundColor: palette.noteA,
              borderColor: palette.border,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold" style={{ color: palette.text }}>
                {userName}
              </span>
              <span className="text-[11px]" style={{ color: palette.muted }}>
                Just now
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: palette.text }}>
              Picked up iced matcha &amp; saved a sunny spot for us later.
            </p>
          </div>

          <div
            className="rounded-xl p-3.5 border backdrop-blur-md flex flex-col justify-between gap-2.5"
            style={{
              backgroundColor: palette.noteB,
              borderColor: palette.border,
            }}
          >
            <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: palette.text }}>
              <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: palette.accent }} />
              <span>Compliments Jar</span>
            </div>
            <button
              type="button"
              tabIndex={-1}
              className="self-start px-3 py-1 rounded-lg text-[11px] font-semibold pointer-events-none"
              style={{
                backgroundColor: palette.accent,
                color: palette.accentText,
              }}
            >
              Pick a little note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
