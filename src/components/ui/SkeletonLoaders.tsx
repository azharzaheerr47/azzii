import React from 'react';

export const NoteSkeletonList: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-4" aria-label="Loading shared notes">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-5 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[var(--accent-soft-strong)]" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 w-36 bg-[var(--accent-soft-strong)] rounded" />
              <div className="h-2.5 w-24 bg-[var(--accent-soft)] rounded" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-3.5 w-full bg-[var(--accent-soft)] rounded" />
            <div className="h-3.5 w-4/5 bg-[var(--accent-soft)] rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const PageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 animate-pulse">
        <div className="h-10 w-48 mx-auto bg-[var(--accent-soft-strong)] rounded-xl" />
        <div className="h-64 w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl" />
      </div>
    </div>
  );
};
