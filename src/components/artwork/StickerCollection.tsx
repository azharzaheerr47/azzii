import React from 'react';
import type { StickerId } from '../../types/index';

export interface StickerMeta {
  id: StickerId;
  label: string;
}

export const STICKER_CATALOG: StickerMeta[] = [
  { id: 'happy-cat', label: 'Happy Cat' },
  { id: 'blushing-cat', label: 'Blushing Cat' },
  { id: 'love-cats', label: 'Love Cats' },
  { id: 'hugging-cats', label: 'Hugging Cats' },
  { id: 'sleeping-cat', label: 'Sleeping Cat' },
  { id: 'sad-cat', label: 'Sad Cat' },
  { id: 'crying-cat', label: 'Crying Cat' },
  { id: 'angry-cat', label: 'Angry Cat' },
  { id: 'bat-cat', label: 'Bat Cat' },
  { id: 'pink-bow', label: 'Pink Bow' },
  { id: 'sweet-heart', label: 'Sweet Heart' },
  { id: 'sparkle-star', label: 'Cute Star' },
  { id: 'pastel-flower', label: 'Pastel Flower' },
  { id: 'cozy-moon', label: 'Cozy Moon' },
];

export function getStickerLabel(id: StickerId): string {
  return STICKER_CATALOG.find((s) => s.id === id)?.label ?? id;
}

const CatFaceBase: React.FC<{
  bg: string;
  fur?: string;
  children: React.ReactNode;
}> = ({ bg, fur = '#FFFFFF', children }) => (
  <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" aria-hidden="true">
    <circle cx="32" cy="32" r="29" fill={bg} />
    <path d="M16 26 L15 11 L27 19 Z" fill={fur} stroke="#29253A" strokeWidth="2.3" strokeLinejoin="round" />
    <path d="M48 26 L49 11 L37 19 Z" fill={fur} stroke="#29253A" strokeWidth="2.3" strokeLinejoin="round" />
    <ellipse cx="32" cy="34" rx="19" ry="16" fill={fur} stroke="#29253A" strokeWidth="2.3" />
    {children}
  </svg>
);

export const StickerArtwork: React.FC<{
  sticker: StickerId;
  className?: string;
}> = ({ sticker, className = 'w-12 h-12' }) => {
  const renderSvg = () => {
    switch (sticker) {
      case 'happy-cat':
        return (
          <CatFaceBase bg="#E9DFFF">
            <path d="M22 32 Q25 28 28 32" stroke="#29253A" strokeWidth="2.3" strokeLinecap="round" />
            <path d="M36 32 Q39 28 42 32" stroke="#29253A" strokeWidth="2.3" strokeLinecap="round" />
            <ellipse cx="20" cy="37" rx="3.2" ry="1.8" fill="#FFD6E7" />
            <ellipse cx="44" cy="37" rx="3.2" ry="1.8" fill="#FFD6E7" />
            <polygon points="30.5,35 33.5,35 32,37" fill="#FF8FB8" />
            <path d="M27.5 39 Q32 43.5 36.5 39" stroke="#29253A" strokeWidth="2.2" strokeLinecap="round" />
          </CatFaceBase>
        );
      case 'blushing-cat':
        return (
          <CatFaceBase bg="#FFD6E7">
            <circle cx="24.5" cy="32" r="2.3" fill="#29253A" />
            <circle cx="39.5" cy="32" r="2.3" fill="#29253A" />
            <ellipse cx="20" cy="36.5" rx="4.2" ry="2.4" fill="#FF9EC4" />
            <ellipse cx="44" cy="36.5" rx="4.2" ry="2.4" fill="#FF9EC4" />
            <path d="M29 38 Q32 40.5 35 38" stroke="#29253A" strokeWidth="2.2" strokeLinecap="round" />
          </CatFaceBase>
        );
      case 'sad-cat':
        return (
          <CatFaceBase bg="#D8E9FF">
            <circle cx="24.5" cy="33" r="2.3" fill="#29253A" />
            <circle cx="39.5" cy="33" r="2.3" fill="#29253A" />
            <path d="M21 28 L27 30" stroke="#29253A" strokeWidth="2" strokeLinecap="round" />
            <path d="M43 28 L37 30" stroke="#29253A" strokeWidth="2" strokeLinecap="round" />
            <path d="M28 41 Q32 37.5 36 41" stroke="#29253A" strokeWidth="2.2" strokeLinecap="round" />
          </CatFaceBase>
        );
      case 'crying-cat':
        return (
          <CatFaceBase bg="#D8E9FF">
            <path d="M22 32 Q25 35 28 32" stroke="#29253A" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M36 32 Q39 35 42 32" stroke="#29253A" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M24 36 C22 40 22 43 24 44 C26 43 26 40 24 36 Z" fill="#70B5FF" />
            <path d="M40 36 C38 40 38 43 40 44 C42 43 42 40 40 36 Z" fill="#70B5FF" />
            <ellipse cx="32" cy="40" rx="2.6" ry="2" fill="#FF8FB8" />
          </CatFaceBase>
        );
      case 'angry-cat':
        return (
          <CatFaceBase bg="#FFD6E7">
            <path d="M21 28 L28 31.5" stroke="#29253A" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M43 28 L36 31.5" stroke="#29253A" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="24.5" cy="33.5" r="2.2" fill="#29253A" />
            <circle cx="39.5" cy="33.5" r="2.2" fill="#29253A" />
            <path d="M27.5 40.5 L30.5 38.5 L33.5 40.5 L36.5 38.5" stroke="#29253A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </CatFaceBase>
        );
      case 'sleeping-cat':
        return (
          <CatFaceBase bg="#E9DFFF">
            <path d="M22 33 Q25 36 28 33" stroke="#29253A" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M36 33 Q39 36 42 33" stroke="#29253A" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="32" cy="39" r="1.8" fill="#FF8FB8" />
            <text x="43" y="21" fontSize="9" fontWeight="700" fill="#6554A4">z</text>
            <text x="49" y="15" fontSize="11" fontWeight="700" fill="#6554A4">z</text>
          </CatFaceBase>
        );
      case 'love-cats':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" aria-hidden="true">
            <circle cx="32" cy="32" r="29" fill="#FFD6E7" />
            {/* Left cat */}
            <path d="M13 28 L12 18 L21 24 Z" fill="#29253A" />
            <path d="M29 28 L30 18 L21 24 Z" fill="#29253A" />
            <circle cx="21" cy="34" r="10.5" fill="#29253A" />
            <circle cx="18.5" cy="33" r="1.6" fill="#FFD97D" />
            <circle cx="24" cy="33" r="1.6" fill="#FFD97D" />
            {/* Right cat */}
            <path d="M35 28 L34 18 L43 24 Z" fill="#FFFFFF" stroke="#29253A" strokeWidth="2" />
            <path d="M51 28 L52 18 L43 24 Z" fill="#FFFFFF" stroke="#29253A" strokeWidth="2" />
            <circle cx="43" cy="34" r="10.5" fill="#FFFFFF" stroke="#29253A" strokeWidth="2" />
            <circle cx="40" cy="33" r="1.5" fill="#29253A" />
            <circle cx="45.5" cy="33" r="1.5" fill="#29253A" />
            {/* Center heart */}
            <path d="M32 21 C32 18.8 29 17.5 27.5 19.6 C26 17.5 23 18.8 23 21 C23 24.3 27.5 26.8 27.5 26.8 C27.5 26.8 32 24.3 32 21 Z" transform="translate(4.5, -2)" fill="#FF5D9E" />
          </svg>
        );
      case 'hugging-cats':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" aria-hidden="true">
            <circle cx="32" cy="32" r="29" fill="#E9DFFF" />
            <circle cx="24" cy="34" r="12" fill="#FFFFFF" stroke="#29253A" strokeWidth="2.2" />
            <circle cx="40" cy="34" r="12" fill="#FFE6F0" stroke="#29253A" strokeWidth="2.2" />
            <path d="M16 26 L15 16 L24 22 Z" fill="#FFFFFF" stroke="#29253A" strokeWidth="2.2" />
            <path d="M48 26 L49 16 L40 22 Z" fill="#FFE6F0" stroke="#29253A" strokeWidth="2.2" />
            <path d="M21 33 Q23 30 25 33" stroke="#29253A" strokeWidth="2" strokeLinecap="round" />
            <path d="M39 33 Q41 30 43 33" stroke="#29253A" strokeWidth="2" strokeLinecap="round" />
            <path d="M27 42 Q32 45 37 42" stroke="#6554A4" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        );
      case 'bat-cat':
        return (
          <CatFaceBase bg="#E9DFFF" fur="#29253A">
            <path d="M22 35 C22 31 42 31 42 35 C42 42 37 45 32 45 C27 45 22 42 22 35 Z" fill="#EFEBF9" />
            <ellipse cx="25.5" cy="30" rx="2.6" ry="3" fill="#FFD97D" />
            <ellipse cx="38.5" cy="30" rx="2.6" ry="3" fill="#FFD97D" />
            <polygon points="30.5,36 33.5,36 32,38.5" fill="#FF8FB8" />
          </CatFaceBase>
        );
      case 'pink-bow':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" aria-hidden="true">
            <circle cx="32" cy="32" r="29" fill="#FFD6E7" />
            <path d="M29 36 L22 48 L28 45 L31 48 Z" fill="#FF8FB8" stroke="#29253A" strokeWidth="2" strokeLinejoin="round" />
            <path d="M35 36 L42 48 L36 45 L33 48 Z" fill="#FF8FB8" stroke="#29253A" strokeWidth="2" strokeLinejoin="round" />
            <ellipse cx="21" cy="29" rx="11" ry="8.5" fill="#FF9EC4" stroke="#29253A" strokeWidth="2.3" />
            <ellipse cx="43" cy="29" rx="11" ry="8.5" fill="#FF9EC4" stroke="#29253A" strokeWidth="2.3" />
            <circle cx="32" cy="29" r="5.5" fill="#FF6FA8" stroke="#29253A" strokeWidth="2.3" />
          </svg>
        );
      case 'sweet-heart':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" aria-hidden="true">
            <circle cx="32" cy="32" r="29" fill="#FFD6E7" />
            <path
              d="M32 48 C32 48 14 37.5 14 25.5 C14 19.5 18.6 15.5 23.8 15.5 C27.4 15.5 30.4 17.5 32 20.4 C33.6 17.5 36.6 15.5 40.2 15.5 C45.4 15.5 50 19.5 50 25.5 C50 37.5 32 48 32 48 Z"
              fill="#FF7EB3"
              stroke="#29253A"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <path d="M20 23 C20 20.5 22 19 24.5 19" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        );
      case 'sparkle-star':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" aria-hidden="true">
            <circle cx="32" cy="32" r="29" fill="#D8E9FF" />
            <path
              d="M32 13 L37.3 24.2 L49.6 25.8 L40.6 34.4 L42.9 46.7 L32 40.8 L21.1 46.7 L23.4 34.4 L14.4 25.8 L26.7 24.2 Z"
              fill="#FFD97D"
              stroke="#29253A"
              strokeWidth="2.3"
              strokeLinejoin="round"
            />
            <circle cx="28" cy="30" r="1.5" fill="#29253A" />
            <circle cx="36" cy="30" r="1.5" fill="#29253A" />
            <path d="M30 33.5 Q32 35.5 34 33.5" stroke="#29253A" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        );
      case 'pastel-flower':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" aria-hidden="true">
            <circle cx="32" cy="32" r="29" fill="#E9DFFF" />
            <circle cx="32" cy="18" r="8" fill="#FFFFFF" stroke="#29253A" strokeWidth="2" />
            <circle cx="45" cy="27" r="8" fill="#FFD6E7" stroke="#29253A" strokeWidth="2" />
            <circle cx="40" cy="42" r="8" fill="#FFFFFF" stroke="#29253A" strokeWidth="2" />
            <circle cx="24" cy="42" r="8" fill="#FFD6E7" stroke="#29253A" strokeWidth="2" />
            <circle cx="19" cy="27" r="8" fill="#FFFFFF" stroke="#29253A" strokeWidth="2" />
            <circle cx="32" cy="31" r="8.5" fill="#FFD97D" stroke="#29253A" strokeWidth="2.2" />
            <circle cx="29.5" cy="30" r="1.3" fill="#29253A" />
            <circle cx="34.5" cy="30" r="1.3" fill="#29253A" />
            <path d="M30 33.5 Q32 35.2 34 33.5" stroke="#29253A" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        );
      case 'cozy-moon':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" aria-hidden="true">
            <circle cx="32" cy="32" r="29" fill="#E9DFFF" />
            <path
              d="M39 17 C31.5 18.2 26 24.7 26 32.5 C26 41.2 33 48.2 41.7 48.2 C44 48.2 46.2 47.7 48.2 46.8 C44.5 50.4 39.5 52.6 34 52.6 C22.8 52.6 13.8 43.6 13.8 32.4 C13.8 22.1 21.5 13.6 31.4 12.4 C34.3 12.4 37 14.3 39 17 Z"
              fill="#BFA7F2"
              stroke="#29253A"
              strokeWidth="2.3"
              strokeLinejoin="round"
            />
            <path d="M43 22 L44.5 18 L46 22 L50 23.5 L46 25 L44.5 29 L43 25 L39 23.5 Z" fill="#FFD97D" stroke="#29253A" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        );
    }
  };

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      title={getStickerLabel(sticker)}
    >
      {renderSvg()}
    </span>
  );
};

interface StickerPickerProps {
  selected: StickerId | null;
  onSelect: (sticker: StickerId | null) => void;
  onClose?: () => void;
}

export const StickerPicker: React.FC<StickerPickerProps> = ({
  selected,
  onSelect,
  onClose,
}) => {
  return (
    <div
      className="bg-white border border-[#6554A4]/18 rounded-2xl shadow-lg p-3 w-72 sm:w-80 z-30"
      role="dialog"
      aria-label="Choose a sticker"
    >
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-semibold text-[#29253A]">Pick a sticker</span>
        {selected && (
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              onClose?.();
            }}
            className="text-xs text-[#6554A4] hover:underline whitespace-nowrap"
          >
            Remove
          </button>
        )}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {STICKER_CATALOG.map((item) => {
          const isActive = selected === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(isActive ? null : item.id);
                onClose?.();
              }}
              aria-label={`Attach ${item.label} sticker`}
              aria-pressed={isActive}
              className={`p-1.5 rounded-xl flex items-center justify-center transition-transform duration-150 hover:scale-105 ${
                isActive
                  ? 'bg-[#E9DFFF] ring-2 ring-[#6554A4]'
                  : 'hover:bg-[#FAF9FE]'
              }`}
            >
              <StickerArtwork sticker={item.id} className="w-10 h-10" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
