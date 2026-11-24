import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface ComplimentJarIllustrationProps {
  noteCount: number;
  isPicking?: boolean;
  className?: string;
}

const SLIP_PRESETS = [
  { x: 64, y: 160, rot: -16, fill: '#FFD45A' },
  { x: 96, y: 164, rot: 12, fill: '#FFD6E7' },
  { x: 126, y: 158, rot: -8, fill: '#E9DFFF' },
  { x: 78, y: 138, rot: 22, fill: '#D8E9FF' },
  { x: 112, y: 136, rot: -20, fill: '#FFF9EA' },
  { x: 94, y: 118, rot: 7, fill: '#FFD45A' },
  { x: 68, y: 116, rot: -12, fill: '#FFD6E7' },
  { x: 124, y: 116, rot: 15, fill: '#E9DFFF' },
];

export const ComplimentJarIllustration: React.FC<ComplimentJarIllustrationProps> = ({
  noteCount,
  isPicking = false,
  className = 'w-56 h-64',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const visibleSlips =
    noteCount <= 0 ? 0 : Math.min(SLIP_PRESETS.length, Math.max(2, noteCount));

  return (
    <motion.div
      animate={
        isPicking && !prefersReducedMotion
          ? {
              rotate: [0, -4, 4, -3, 2, 0],
              y: [0, -4, 0, -2, 0],
            }
          : { rotate: 0, y: 0 }
      }
      transition={{ duration: 0.55, ease: 'easeInOut' }}
      className={`relative select-none ${className}`}
    >
      <svg viewBox="0 0 200 230" fill="none" className="w-full h-full overflow-visible" aria-hidden="true">
        {/* Soft shadow beneath jar */}
        <ellipse cx="100" cy="212" rx="58" ry="9" fill="#6554A4" fillOpacity="0.1" />

        {/* Jar Glass Body Back */}
        <path
          d="M52 68 C40 76 34 90 34 110 L34 184 C34 199 45 208 62 208 L138 208 C155 208 166 199 166 184 L166 110 C166 90 160 76 148 68 Z"
          fill="#FCFAFF"
          fillOpacity="0.92"
          stroke="#29253A"
          strokeWidth="2.5"
        />

        {/* Soft warm inner tint */}
        <path
          d="M42 114 L42 183 C42 193 50 200 62 200 L138 200 C150 200 158 193 158 183 L158 114 Z"
          fill="#FFF9EA"
          fillOpacity="0.55"
        />

        {/* Folded Compliment Slips inside the jar */}
        {SLIP_PRESETS.slice(0, visibleSlips).map((slip, idx) => (
          <g key={idx} transform={`translate(${slip.x}, ${slip.y}) rotate(${slip.rot})`}>
            <motion.g
              initial={false}
              animate={
                isPicking && !prefersReducedMotion
                  ? { y: [0, -5, 0] }
                  : { y: 0 }
              }
              transition={{ duration: 0.45, delay: idx * 0.03 }}
            >
              <rect
                x="-18"
                y="-10"
                width="36"
                height="20"
                rx="4"
                fill={slip.fill}
                stroke="#29253A"
                strokeWidth="1.7"
              />
              <path d="M-18 -9 L0 2 L18 -9" stroke="#29253A" strokeWidth="1.3" strokeOpacity="0.5" />
            </motion.g>
          </g>
        ))}

        {/* Emerging Note animation when picking */}
        {isPicking && !prefersReducedMotion && (
          <motion.g
            initial={{ x: 100, y: 120, opacity: 0, scale: 0.6 }}
            animate={{ x: 100, y: 14, opacity: 1, scale: 1.05 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            <rect
              x="-20"
              y="-12"
              width="40"
              height="24"
              rx="5"
              fill="#FFD45A"
              stroke="#29253A"
              strokeWidth="2"
            />
            <path d="M-20 -10 L0 3 L20 -10" stroke="#29253A" strokeWidth="1.5" />
          </motion.g>
        )}

        {/* Jar Label Ribbon Band */}
        <rect
          x="52"
          y="108"
          width="96"
          height="42"
          rx="12"
          fill="#FFFFFF"
          fillOpacity="0.95"
          stroke="#6554A4"
          strokeOpacity="0.28"
          strokeWidth="1.6"
        />
        <text
          x="100"
          y="126"
          textAnchor="middle"
          fill="#29253A"
          fontSize="10.5"
          fontWeight="700"
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          Little Love Notes
        </text>
        <text
          x="100"
          y="141"
          textAnchor="middle"
          fill="#817B90"
          fontSize="9.5"
          fontFamily="DM Sans, sans-serif"
        >
          {noteCount === 0
            ? 'waiting for love'
            : `${noteCount} ${noteCount === 1 ? 'note' : 'notes'} inside`}
        </text>

        {/* Glass reflection shine */}
        <path
          d="M48 92 C44 102 44 134 45 162"
          stroke="#FFFFFF"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeOpacity="0.85"
        />

        {/* Jar Neck & Ribbon */}
        <rect
          x="54"
          y="54"
          width="92"
          height="14"
          rx="5"
          fill="#FFFFFF"
          stroke="#29253A"
          strokeWidth="2.4"
        />
        {/* Warm Cork Lid */}
        <path
          d="M62 34 C62 30 65 28 70 28 L130 28 C135 28 138 30 138 34 L142 54 L58 54 Z"
          fill="#E5C089"
          stroke="#29253A"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <line x1="72" y1="36" x2="128" y2="36" stroke="#C59B5E" strokeWidth="2" strokeLinecap="round" />

        {/* Pastel Ribbon around neck + Tiny Sunflower Charm */}
        <path
          d="M54 64 Q100 71 146 64"
          stroke="#F3BB38"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <g transform="translate(138, 76)">
          <circle cx="0" cy="0" r="9" fill="#FFF9EA" stroke="#29253A" strokeWidth="1.5" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <ellipse
              key={deg}
              cx="0"
              cy="-5.2"
              rx="1.8"
              ry="3.2"
              transform={`rotate(${deg})`}
              fill="#FFD45A"
            />
          ))}
          <circle cx="0" cy="0" r="3" fill="#5B3E2B" />
        </g>

        {/* Subtle decorative stars */}
        <path
          d="M28 72 L30 66 L32 72 L38 74 L32 76 L30 82 L28 76 L22 74 Z"
          fill="#FFD45A"
        />
        <path
          d="M174 52 L175.5 48 L177 52 L181 53.5 L177 55 L175.5 59 L174 55 L170 53.5 Z"
          fill="#BFA7F2"
        />
      </svg>
    </motion.div>
  );
};
