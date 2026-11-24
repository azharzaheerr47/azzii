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
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#29253A]">
            Sticker Collection
          </h1>
          <p className="mt-1 text-sm text-[#817B90] tabular-nums">
            {STICKER_CATALOG.length} custom illustrated stickers to pair with your shared notes
          </p>
        </div>

        <div
          className="inline-flex flex-wrap items-center gap-1 p-1 bg-white border border-[#6554A4]/14 rounded-xl self-start sm:self-auto"
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
                  ? 'bg-[#FFF9EA] text-[#29253A] ring-1 ring-[#F3BB38]/50'
                  : 'text-[#817B90] hover:text-[#29253A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Spotlight Preview */}
      <section className="bg-gradient-to-r from-[#FFF9EA]/75 via-white to-[#E9DFFF]/35 border border-[#6554A4]/14 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-2xl bg-white border border-[#6554A4]/12 shadow-xs">
            <StickerArtwork sticker={activeMeta.id} className="w-16 h-16 sm:w-20 sm:h-20" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#817B90] capitalize">
              {activeMeta.group === 'sunflower' ? 'Sunflowers & stars' : activeMeta.group} set
            </p>
            <h2 className="font-display text-lg font-bold text-[#29253A]">
              {activeMeta.label}
            </h2>
            <p className="text-xs text-[#817B90] mt-0.5">
              Tap any sticker below to inspect it or start a note with it.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onUseStickerInNote(activeMeta.id)}
          className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6554A4] hover:bg-[#534391] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
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
              className={`group rounded-2xl p-4 flex flex-col items-center justify-center gap-2.5 border transition-all ${
                isSelected
                  ? 'bg-[#FFF9EA]/70 border-[#F3BB38] ring-2 ring-[#FFD45A]/60 shadow-xs'
                  : 'bg-white border-[#6554A4]/14 hover:border-[#6554A4]/35 hover:-translate-y-0.5'
              }`}
            >
              <StickerArtwork
                sticker={item.id}
                className="w-16 h-16 transition-transform duration-150 group-hover:scale-105"
              />
              <span className="text-xs font-medium text-[#29253A] text-center">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
