import React, { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { StickerId } from '../types/index';
import { STICKER_CATALOG, StickerArtwork } from '../components/artwork/StickerCollection';

interface StickersPageProps {
  onUseStickerInNote: (sticker: StickerId) => void;
}

type StickerGroupFilter = 'all' | 'cats' | 'sunflower' | 'keepsakes';

const GROUP_TABS: { id: StickerGroupFilter; label: string }[] = [
  { id: 'all', label: 'All stickers' },
  { id: 'cats', label: 'Cozy cats' },
  { id: 'sunflower', label: 'Sunflowers & stars' },
  { id: 'keepsakes', label: 'Keepsakes' },
];

export const StickersPage: React.FC<StickersPageProps> = ({ onUseStickerInNote }) => {
  const [group, setGroup] = useState<StickerGroupFilter>('all');
  const [selected, setSelected] = useState<StickerId>('sunflower');

  const items = useMemo(() => {
    if (group === 'all') return STICKER_CATALOG;
    return STICKER_CATALOG.filter((s) => s.group === group);
  }, [group]);

  const activeMeta = STICKER_CATALOG.find((s) => s.id === selected) ?? STICKER_CATALOG[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Sticker Collection
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)] tabular-nums">
            {STICKER_CATALOG.length} custom illustrated stickers to pair with your shared notes
          </p>
        </div>

        <div
          className="inline-flex flex-wrap items-center gap-1 p-1 bg-[var(--bg-card)] backdrop-blur-md border border-[var(--border-subtle)] rounded-xl self-start sm:self-auto"
          role="group"
          aria-label="Filter stickers by set"
        >
          {GROUP_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setGroup(tab.id)}
              aria-pressed={group === tab.id}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                group === tab.id
                  ? 'bg-[var(--accent-soft-strong)] text-[var(--text-primary)] ring-1 ring-[var(--accent-border)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Spotlight Preview */}
      <section
        className="border border-[var(--border-subtle)] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-5 backdrop-blur-md"
        style={{
          backgroundImage:
            'linear-gradient(90deg, var(--bg-hero-from), var(--bg-hero-via), var(--bg-hero-to))',
        }}
      >
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-xs">
            <StickerArtwork sticker={activeMeta.id} className="w-16 h-16 sm:w-20 sm:h-20" />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)] capitalize">
              {activeMeta.group === 'sunflower' ? 'Sunflowers & stars' : activeMeta.group} set
            </p>
            <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
              {activeMeta.label}
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Tap any sticker below to inspect it or start a note with it.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onUseStickerInNote(activeMeta.id)}
          className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-on-primary)] text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <span>Use in a new note</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </section>

      {/* Sticker Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3.5">
        {items.map((item) => {
          const isSelected = selected === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item.id)}
              aria-pressed={isSelected}
              className={`group rounded-2xl p-4 flex flex-col items-center justify-center gap-2.5 border transition-all backdrop-blur-md ${
                isSelected
                  ? 'bg-[var(--accent-soft)] border-[var(--accent-primary)] ring-2 ring-[var(--accent-border)] shadow-xs'
                  : 'bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:-translate-y-0.5'
              }`}
            >
              <StickerArtwork
                sticker={item.id}
                className="w-16 h-16 transition-transform duration-150 group-hover:scale-105"
              />
              <span className="text-xs font-medium text-[var(--text-primary)] text-center">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
