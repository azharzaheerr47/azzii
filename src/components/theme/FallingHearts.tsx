import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';

interface HeartParticle {
  id: number;
  leftPct: number;
  size: number;
  durationSec: number;
  delaySec: number;
  driftPx: number;
  opacity: number;
  color: string;
  rotStart: number;
  rotMid: number;
  rotEnd: number;
}

const HEART_COLORS = ['#E65B78', '#F28DB5', '#D94F85', '#FF9EC4'];

function generateHearts(count: number): HeartParticle[] {
  return Array.from({ length: count }, (_, idx) => ({
    id: idx,
    leftPct: Math.round(((idx + 0.5) / count) * 94 + (idx % 3) * 1.8),
    size: 13 + (idx % 4) * 3.5,
    durationSec: 2.7 + (idx % 5) * 0.38,
    delaySec: (idx % 6) * 0.16,
    driftPx: (idx % 2 === 0 ? 1 : -1) * (16 + (idx % 4) * 10),
    opacity: 0.48 + (idx % 4) * 0.1,
    color: HEART_COLORS[idx % HEART_COLORS.length],
    rotStart: -16 + (idx % 5) * 7,
    rotMid: 14 - (idx % 4) * 8,
    rotEnd: -20 + (idx % 6) * 6,
  }));
}

const ACTIVATION_HEARTS = generateHearts(18);

interface FallingHeartsProps {
  burstId: number;
}

export const FallingHearts: React.FC<FallingHeartsProps> = ({ burstId }) => {
  const prefersReducedMotion = useReducedMotion();
  const [visibleBurst, setVisibleBurst] = useState<number | null>(null);

  useEffect(() => {
    if (!burstId || prefersReducedMotion) {
      setVisibleBurst(null);
      return;
    }

    setVisibleBurst(burstId);
    const timer = window.setTimeout(() => {
      setVisibleBurst((cur) => (cur === burstId ? null : cur));
    }, 4600);
    return () => window.clearTimeout(timer);
  }, [burstId, prefersReducedMotion]);

  if (!visibleBurst || prefersReducedMotion) {
    return null;
  }

  return (
    <div
      key={visibleBurst}
      aria-hidden="true"
      className="fixed inset-0 z-40 pointer-events-none overflow-hidden select-none"
    >
      {ACTIVATION_HEARTS.map((heart) => (
        <svg
          key={heart.id}
          viewBox="0 0 24 24"
          className="ols-falling-heart"
          style={
            {
              left: `${heart.leftPct}%`,
              width: `${heart.size}px`,
              height: `${heart.size}px`,
              animationDuration: `${heart.durationSec}s`,
              animationDelay: `${heart.delaySec}s`,
              '--heart-drift': `${heart.driftPx}px`,
              '--heart-opacity': `${heart.opacity}`,
              '--heart-rot-start': `${heart.rotStart}deg`,
              '--heart-rot-mid': `${heart.rotMid}deg`,
              '--heart-rot-end': `${heart.rotEnd}deg`,
            } as React.CSSProperties
          }
          fill={heart.color}
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      ))}
    </div>
  );
};
