import React from 'react';

interface CatDuoIllustrationProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CatDuoIllustration: React.FC<CatDuoIllustrationProps> = ({
  className = '',
  size = 'md',
}) => {
  const sizeClass =
    size === 'sm' ? 'w-16 h-16' : size === 'lg' ? 'w-48 h-48' : 'w-32 h-32';

  return (
    <svg
      viewBox="0 0 180 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${sizeClass} ${className}`}
      role="img"
      aria-label="Illustration of a black bat-eared cat and a pastel white cat with a pink bow sitting together"
    >
      <defs>
        <linearGradient id="catDuoBackdrop" x1="15" y1="10" x2="165" y2="140" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E9DFFF" />
          <stop offset="55%" stopColor="#FFD6E7" />
          <stop offset="100%" stopColor="#D8E9FF" />
        </linearGradient>
      </defs>

      {/* Soft pastel halo */}
      <rect x="10" y="10" width="160" height="130" rx="36" fill="url(#catDuoBackdrop)" />
      <ellipse cx="90" cy="122" rx="60" ry="11" fill="#FFFFFF" fillOpacity="0.72" />

      {/* Subtle decorative stars */}
      <path d="M32 32 L34 26 L36 32 L42 34 L36 36 L34 42 L32 36 L26 34 Z" fill="#FFFFFF" fillOpacity="0.85" />
      <path d="M148 34 L149.5 30 L151 34 L155 35.5 L151 37 L149.5 41 L148 37 L144 35.5 Z" fill="#FFFFFF" fillOpacity="0.85" />

      {/* Floating heart */}
      <path
        d="M90 36 C90 32.5 85.2 30.5 83.2 33.8 C81.2 30.5 76.4 32.5 76.4 36 C76.4 40.8 83.2 44.8 83.2 44.8 C83.2 44.8 90 40.8 90 36 Z"
        transform="translate(6.8, -4)"
        fill="#FF8FB8"
      />

      {/* Cat 1: Bat-Cat (Left) */}
      <g>
        {/* Tail */}
        <path
          d="M36 112 C23 110 21 94 30 88"
          stroke="#29253A"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Body */}
        <path d="M36 119 C36 91 45 78 61 78 C77 78 86 91 86 119 Z" fill="#29253A" />
        {/* Chest emblem accent */}
        <ellipse cx="61" cy="102" rx="11" ry="13" fill="#3F385B" />
        {/* Little paws */}
        <ellipse cx="50" cy="118" rx="6" ry="4" fill="#3F385B" />
        <ellipse cx="72" cy="118" rx="6" ry="4" fill="#3F385B" />
        {/* Bat Ears */}
        <path d="M37 56 L34 24 L54 41 Z" fill="#29253A" />
        <path d="M85 56 L88 24 L68 41 Z" fill="#29253A" />
        <path d="M40 50 L38 32 L50 42 Z" fill="#4C446B" />
        <path d="M82 50 L84 32 L72 42 Z" fill="#4C446B" />
        {/* Head / Cowl */}
        <path
          d="M35 63 C35 43 47 36 61 36 C75 36 87 43 87 63 C87 77 76 84 61 84 C46 84 35 77 35 63 Z"
          fill="#29253A"
        />
        {/* Muzzle */}
        <path
          d="M46 66 C46 60 76 60 76 66 C76 77 69 82 61 82 C53 82 46 77 46 66 Z"
          fill="#EFEBF9"
        />
        {/* Golden Eyes */}
        <ellipse cx="51" cy="58" rx="4.2" ry="4.8" fill="#FFD97D" />
        <ellipse cx="71" cy="58" rx="4.2" ry="4.8" fill="#FFD97D" />
        <circle cx="52" cy="57" r="1.6" fill="#29253A" />
        <circle cx="72" cy="57" r="1.6" fill="#29253A" />
        {/* Nose & Smile */}
        <polygon points="59,66.5 63,66.5 61,69.5" fill="#FF8FB8" />
        <path
          d="M57 72 Q61 75.5 65 72"
          stroke="#29253A"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* Cat 2: Bow-Cat (Right) */}
      <g>
        {/* Tail */}
        <path
          d="M142 113 C153 111 155 96 146 90"
          stroke="#29253A"
          strokeWidth="5"
          strokeLinecap="round"
        />
        {/* Body */}
        <path
          d="M94 119 C94 92 103 79 119 79 C135 79 144 92 144 119 Z"
          fill="#FFFFFF"
          stroke="#29253A"
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        {/* Pink Collar */}
        <path
          d="M104 84 Q119 89 134 84"
          stroke="#FF8FB8"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="119" cy="88" r="3" fill="#FFD97D" stroke="#29253A" strokeWidth="1.8" />
        {/* Ears */}
        <path
          d="M95 55 L93 29 L112 43 Z"
          fill="#FFFFFF"
          stroke="#29253A"
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        <path
          d="M143 55 L145 29 L126 43 Z"
          fill="#FFFFFF"
          stroke="#29253A"
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        {/* Head */}
        <ellipse
          cx="119"
          cy="62"
          rx="26"
          ry="22"
          fill="#FFFFFF"
          stroke="#29253A"
          strokeWidth="3.2"
        />
        {/* Pink Bow */}
        <g transform="translate(135, 38) rotate(16)">
          <ellipse
            cx="-7.5"
            cy="0"
            rx="7.5"
            ry="5.5"
            fill="#FF9EC4"
            stroke="#29253A"
            strokeWidth="2.4"
          />
          <ellipse
            cx="7.5"
            cy="0"
            rx="7.5"
            ry="5.5"
            fill="#FF9EC4"
            stroke="#29253A"
            strokeWidth="2.4"
          />
          <circle
            cx="0"
            cy="0"
            r="3.8"
            fill="#FF6FA8"
            stroke="#29253A"
            strokeWidth="2.4"
          />
        </g>
        {/* Eyes & Blush */}
        <circle cx="109" cy="61" r="3.1" fill="#29253A" />
        <circle cx="129" cy="61" r="3.1" fill="#29253A" />
        <circle cx="110" cy="59.8" r="1.1" fill="#FFFFFF" />
        <circle cx="130" cy="59.8" r="1.1" fill="#FFFFFF" />
        <ellipse cx="102" cy="68" rx="4.5" ry="2.4" fill="#FFD6E7" />
        <ellipse cx="136" cy="68" rx="4.5" ry="2.4" fill="#FFD6E7" />
        {/* Nose & Smile */}
        <ellipse cx="119" cy="66" rx="2.7" ry="2" fill="#FFB238" />
        <path
          d="M115 70.5 Q119 73.8 123 70.5"
          stroke="#29253A"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Whiskers */}
        <line x1="89" y1="61" x2="97" y2="62.5" stroke="#29253A" strokeWidth="2" strokeLinecap="round" />
        <line x1="89" y1="67" x2="97" y2="66.5" stroke="#29253A" strokeWidth="2" strokeLinecap="round" />
        <line x1="141" y1="62.5" x2="149" y2="61" stroke="#29253A" strokeWidth="2" strokeLinecap="round" />
        <line x1="141" y1="66.5" x2="149" y2="67" stroke="#29253A" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
};

export const SpaceBrandMark: React.FC<{
  style?: 'cat-duo' | 'heart' | 'moon' | 'sunflower';
  className?: string;
}> = ({ style = 'cat-duo', className = 'w-9 h-9' }) => {
  if (style === 'sunflower') {
    return (
      <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
        <rect width="40" height="40" rx="12" fill="#FFF9EA" />
        <g transform="translate(20, 20)">
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <ellipse
              key={deg}
              cx="0"
              cy="-9.5"
              rx="2.9"
              ry="5.5"
              transform={`rotate(${deg})`}
              fill={deg % 60 === 0 ? '#FFD45A' : '#F3BB38'}
            />
          ))}
          <circle cx="0" cy="0" r="6" fill="#5B3E2B" />
          <circle cx="-1.8" cy="-1.5" r="0.9" fill="#FFD45A" fillOpacity="0.8" />
          <circle cx="1.8" cy="1.2" r="0.9" fill="#FFD45A" fillOpacity="0.8" />
        </g>
      </svg>
    );
  }
  if (style === 'heart') {
    return (
      <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
        <rect width="40" height="40" rx="12" fill="#FFD6E7" />
        <path
          d="M20 29.5 C20 29.5 10 23.2 10 16.5 C10 13.2 12.6 10.8 15.6 10.8 C17.6 10.8 19.2 11.9 20 13.3 C20.8 11.9 22.4 10.8 24.4 10.8 C27.4 10.8 30 13.2 30 16.5 C30 23.2 20 29.5 20 29.5 Z"
          fill="#6554A4"
        />
      </svg>
    );
  }
  if (style === 'moon') {
    return (
      <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
        <rect width="40" height="40" rx="12" fill="#D8E9FF" />
        <path
          d="M24.5 11.5 C20.2 12.2 17 16 17 20.5 C17 25.5 21 29.5 26 29.5 C27.4 29.5 28.7 29.2 29.9 28.6 C27.8 30.7 24.9 32 21.6 32 C15.2 32 10 26.8 10 20.4 C10 14.5 14.4 9.6 20.1 9 C21.8 9 23.3 10 24.5 11.5 Z"
          fill="#6554A4"
        />
        <circle cx="27.5" cy="14" r="2" fill="#FF8FB8" />
      </svg>
    );
  }
  return (
    <img
      src="/favicon.svg"
      alt=""
      aria-hidden="true"
      className={`${className} rounded-xl object-cover`}
    />
  );
};
