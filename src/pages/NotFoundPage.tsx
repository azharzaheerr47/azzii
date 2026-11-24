import React from 'react';
import { CatDuoIllustration } from '../components/artwork/CatDuoIllustration';

interface NotFoundPageProps {
  onGoHome: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onGoHome }) => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <CatDuoIllustration size="md" className="mb-5" />
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
        This page wandered off
      </h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-sm">
        We could not find that corner of Our Little Space. Let us head back to your shared notes.
      </p>
      <button
        type="button"
        onClick={onGoHome}
        className="mt-6 px-5 py-2.5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-on-primary)] text-sm font-medium transition-colors"
      >
        Return home
      </button>
    </div>
  );
};
