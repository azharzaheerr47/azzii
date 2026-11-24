import React from 'react';
import type { AvatarPreset } from '../../types/index';

interface PartnerAvatarProps {
  name: string;
  preset: AvatarPreset;
  avatarUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isOnline?: boolean;
}

export const PartnerAvatar: React.FC<PartnerAvatarProps> = ({
  name,
  preset,
  avatarUrl,
  size = 'md',
  isOnline,
}) => {
  const sizeMap = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
  };

  const renderPresetSvg = () => {
    if (preset === 'bat-cat') {
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full" fill="none" aria-hidden="true">
          <rect width="40" height="40" rx="20" fill="#E9DFFF" />
          <path d="M11 19 L10 9 L17 15 Z" fill="#29253A" />
          <path d="M29 19 L30 9 L23 15 Z" fill="#29253A" />
          <circle cx="20" cy="22" r="10.5" fill="#29253A" />
          <path d="M13 23 C13 20 27 20 27 23 C27 28 24 31 20 31 C16 31 13 28 13 23 Z" fill="#EFEBF9" />
          <circle cx="16.5" cy="20" r="1.7" fill="#FFD97D" />
          <circle cx="23.5" cy="20" r="1.7" fill="#FFD97D" />
          <polygon points="19,25 21,25 20,26.5" fill="#FF8FB8" />
        </svg>
      );
    }
    if (preset === 'bow-cat') {
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full" fill="none" aria-hidden="true">
          <rect width="40" height="40" rx="20" fill="#FFD6E7" />
          <path d="M11 19 L10 10 L17 15 Z" fill="#FFFFFF" stroke="#29253A" strokeWidth="1.6" />
          <path d="M29 19 L30 10 L23 15 Z" fill="#FFFFFF" stroke="#29253A" strokeWidth="1.6" />
          <circle cx="20" cy="23" r="10.5" fill="#FFFFFF" stroke="#29253A" strokeWidth="1.6" />
          <g transform="translate(26.5, 13.5) rotate(15)">
            <ellipse cx="-3" cy="0" rx="3" ry="2.2" fill="#FF8FB8" stroke="#29253A" strokeWidth="1.2" />
            <ellipse cx="3" cy="0" rx="3" ry="2.2" fill="#FF8FB8" stroke="#29253A" strokeWidth="1.2" />
            <circle cx="0" cy="0" r="1.5" fill="#FF5D9E" stroke="#29253A" strokeWidth="1.2" />
          </g>
          <circle cx="16.5" cy="22.5" r="1.3" fill="#29253A" />
          <circle cx="23.5" cy="22.5" r="1.3" fill="#29253A" />
          <ellipse cx="20" cy="25" rx="1.4" ry="1" fill="#FFB238" />
        </svg>
      );
    }

    const colorMap: Record<AvatarPreset, { bg: string; fg: string }> = {
      'bat-cat': { bg: '#E9DFFF', fg: '#29253A' },
      'bow-cat': { bg: '#FFD6E7', fg: '#29253A' },
      lavender: { bg: '#E9DFFF', fg: '#6554A4' },
      blush: { bg: '#FFD6E7', fg: '#9D3464' },
      sky: { bg: '#D8E9FF', fg: '#2D5893' },
    };
    const palette = colorMap[preset] ?? colorMap.lavender;
    const initial = name.trim().charAt(0).toUpperCase() || '?';
    return (
      <span
        className="w-full h-full flex items-center justify-center font-display font-semibold rounded-full"
        style={{ backgroundColor: palette.bg, color: palette.fg }}
      >
        {initial}
      </span>
    );
  };

  return (
    <span className={`relative inline-flex shrink-0 ${sizeMap[size]}`}>
      <span
        className={`w-full h-full rounded-full overflow-hidden border ${
          isOnline
            ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-border)]'
            : 'border-[var(--border-subtle)]'
        } bg-[var(--bg-card)] flex items-center justify-center`}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        ) : (
          renderPresetSvg()
        )}
      </span>
    </span>
  );
};
