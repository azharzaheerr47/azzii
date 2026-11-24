import React, { useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

export const SunflowerAccent: React.FC<{ className?: string }> = ({
  className = 'w-14 h-14',
}) => (
  <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
    <path
      d="M40 74 C40 62 40 50 40 38"
      stroke="#91AA81"
      strokeWidth="3.5"
      strokeLinecap="round"
    />
    <path
      d="M40 61 C31 61 25 56 24 49 C31 49 37 53 40 61 Z"
      fill="#91AA81"
    />
    <path
      d="M40 54 C49 54 55 49 56 42 C49 42 43 46 40 54 Z"
      fill="#91AA81"
    />
    <g transform="translate(40, 29)">
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
        <ellipse
          key={deg}
          cx="0"
          cy="-14.5"
          rx="4.2"
          ry="8.5"
          transform={`rotate(${deg})`}
          fill={deg % 60 === 0 ? '#FFD45A' : '#F3BB38'}
          stroke="#29253A"
          strokeWidth="1.4"
        />
      ))}
      <circle cx="0" cy="0" r="8.8" fill="#5B3E2B" stroke="#29253A" strokeWidth="1.8" />
      <circle cx="-2.8" cy="-2" r="1.2" fill="#FFD45A" fillOpacity="0.85" />
      <circle cx="2.5" cy="-1.5" r="1.1" fill="#FFD45A" fillOpacity="0.85" />
      <circle cx="0" cy="2.6" r="1.2" fill="#FFD45A" fillOpacity="0.85" />
    </g>
  </svg>
);

interface SunflowerBloomIntroProps {
  spaceName: string;
  userName: string;
  onComplete: () => void;
}

const PETAL_ANGLES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const SPARKLE_COORDS = [
  { x: 42, y: 48, color: '#FFD45A', delay: 0.7 },
  { x: 174, y: 44, color: '#F3BB38', delay: 0.85 },
  { x: 32, y: 112, color: '#BFA7F2', delay: 0.95 },
  { x: 184, y: 108, color: '#FFD6E7', delay: 1.05 },
  { x: 64, y: 24, color: '#FFD45A', delay: 1.1 },
  { x: 152, y: 26, color: '#D8E9FF', delay: 1.15 },
];

export const SunflowerBloomIntro: React.FC<SunflowerBloomIntroProps> = ({
  spaceName,
  userName,
  onComplete,
}) => {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const duration = prefersReducedMotion ? 1100 : 3000;
    const timer = window.setTimeout(onComplete, duration);
    return () => window.clearTimeout(timer);
  }, [onComplete, prefersReducedMotion]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Welcome to ${spaceName}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        backgroundColor: 'var(--bg-canvas)',
        backgroundImage:
          'radial-gradient(circle at 50% 38%, var(--bg-bloom-from) 0%, var(--bg-bloom-via) 58%, var(--bg-bloom-to) 100%)',
      }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
    >
      <div className="max-w-md w-full flex flex-col items-center text-center">
        <div className="relative w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center">
          <svg viewBox="0 0 216 216" className="w-full h-full overflow-visible" fill="none">
            {/* Soft warm halo */}
            <motion.circle
              cx="108"
              cy="88"
              r="72"
              fill="#FFD45A"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 0.18, scale: 1 }}
              transition={{ duration: prefersReducedMotion ? 0.01 : 0.9, delay: 0.35 }}
            />

            {/* Floating golden & pastel particles */}
            {SPARKLE_COORDS.map((sp, i) => (
              <motion.circle
                key={i}
                cx={sp.x}
                cy={sp.y}
                r="3.6"
                fill={sp.color}
                initial={{ opacity: 0, y: 10, scale: 0.4 }}
                animate={
                  prefersReducedMotion
                    ? { opacity: 0.85, y: 0, scale: 1 }
                    : { opacity: [0, 0.95, 0.7], y: [8, -6, -12], scale: [0.4, 1.1, 0.9] }
                }
                transition={{
                  duration: prefersReducedMotion ? 0.01 : 1.6,
                  delay: prefersReducedMotion ? 0 : sp.delay,
                  ease: 'easeOut',
                }}
              />
            ))}

            {/* Stem rising upward */}
            <motion.path
              d="M108 196 C108 168 108 134 108 100"
              stroke="#91AA81"
              strokeWidth="6.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: prefersReducedMotion ? 0.01 : 0.65, ease: 'easeOut' }}
            />

            {/* Left & Right Unfolding Leaves */}
            <motion.path
              d="M108 158 C88 158 76 146 74 132 C88 132 101 141 108 158 Z"
              fill="#91AA81"
              style={{ transformOrigin: '108px 158px' }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                duration: prefersReducedMotion ? 0.01 : 0.45,
                delay: prefersReducedMotion ? 0 : 0.32,
                ease: 'easeOut',
              }}
            />
            <motion.path
              d="M108 142 C128 142 140 130 142 116 C128 116 115 125 108 142 Z"
              fill="#91AA81"
              style={{ transformOrigin: '108px 142px' }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                duration: prefersReducedMotion ? 0.01 : 0.45,
                delay: prefersReducedMotion ? 0 : 0.44,
                ease: 'easeOut',
              }}
            />

            {/* Sunflower Head */}
            <g transform="translate(108, 88)">
              {/* Outer Golden Petals: outer <g> handles angle rotation, inner <motion.g> handles scale bloom */}
              {PETAL_ANGLES.map((deg, idx) => (
                <g key={deg} transform={`rotate(${deg})`}>
                  <motion.g
                    style={{ transformOrigin: '0px 0px' }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 220,
                      damping: 18,
                      delay: prefersReducedMotion ? 0 : 0.42 + idx * 0.035,
                    }}
                  >
                    <ellipse
                      cx="0"
                      cy="-32"
                      rx="8.5"
                      ry="20"
                      fill={idx % 2 === 0 ? '#FFD45A' : '#F3BB38'}
                      stroke="#29253A"
                      strokeWidth="2"
                    />
                  </motion.g>
                </g>
              ))}

              {/* Textured Center */}
              <motion.g
                initial={{ scale: 0.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 20,
                  delay: prefersReducedMotion ? 0 : 0.48,
                }}
              >
                <circle cx="0" cy="0" r="19" fill="#5B3E2B" stroke="#29253A" strokeWidth="2.4" />
                <circle cx="0" cy="0" r="14" stroke="#F3BB38" strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="2 3" />
                <circle cx="-5" cy="-4" r="1.8" fill="#FFD45A" fillOpacity="0.85" />
                <circle cx="5" cy="-3" r="1.6" fill="#FFD45A" fillOpacity="0.85" />
                <circle cx="-1" cy="5" r="1.8" fill="#FFD45A" fillOpacity="0.85" />
                <circle cx="6" cy="4" r="1.4" fill="#FFD45A" fillOpacity="0.7" />
              </motion.g>
            </g>
          </svg>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.01 : 0.5, delay: prefersReducedMotion ? 0 : 1.05 }}
          className="mt-2 space-y-2"
        >
          <p className="text-xs font-medium tracking-wide uppercase text-[var(--text-muted)]">
            {spaceName}
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] text-balance">
            Where our little memories bloom
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            Welcome home, {userName}.
          </p>
        </motion.div>

        <motion.button
          type="button"
          onClick={onComplete}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: prefersReducedMotion ? 0 : 0.8 }}
          className="mt-8 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors shadow-xs"
        >
          <span>Enter our space</span>
          <ArrowRight className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
        </motion.button>
      </div>
    </motion.div>
  );
};
