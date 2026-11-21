import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface LightboxImageItem {
  id: string;
  secureUrl: string;
  caption?: string;
  meta?: string;
}

interface ImageLightboxProps {
  images: LightboxImageItem[];
  activeIndex: number | null;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  images,
  activeIndex,
  onClose,
  onNavigate,
}) => {
  const isOpen = activeIndex !== null && images[activeIndex] !== undefined;

  useEffect(() => {
    if (!isOpen || activeIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && images.length > 1) {
        onNavigate((activeIndex - 1 + images.length) % images.length);
      }
      if (e.key === 'ArrowRight' && images.length > 1) {
        onNavigate((activeIndex + 1) % images.length);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, activeIndex, images.length, onClose, onNavigate]);

  const current = isOpen && activeIndex !== null ? images[activeIndex] : null;

  return (
    <AnimatePresence>
      {isOpen && current && activeIndex !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-modal="true"
          aria-label="Full screen image viewer"
          className="fixed inset-0 z-50 bg-[#1B1726]/92 backdrop-blur-sm flex flex-col justify-between p-4 sm:p-6"
          onClick={onClose}
        >
          {/* Top Bar */}
          <div
            className="flex items-center justify-between text-white/90 max-w-6xl w-full mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs sm:text-sm tabular-nums text-white/75">
              {activeIndex + 1} / {images.length}
              {current.meta ? ` · ${current.meta}` : ''}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close image lightbox"
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Image Stage */}
          <div
            className="flex-1 flex items-center justify-center relative max-w-6xl w-full mx-auto my-4 min-h-0"
            onClick={(e) => e.stopPropagation()}
          >
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => onNavigate((activeIndex - 1 + images.length) % images.length)}
                aria-label="Previous image"
                className="hidden sm:flex absolute left-2 z-10 w-11 h-11 rounded-full bg-white/12 hover:bg-white/25 text-white items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <motion.img
              key={current.id}
              initial={{ opacity: 0.7, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.16 }}
              src={current.secureUrl}
              alt={current.caption || 'Shared memory photograph'}
              referrerPolicy="no-referrer"
              className="max-h-[75vh] max-w-full rounded-xl object-contain shadow-2xl select-none"
            />

            {images.length > 1 && (
              <button
                type="button"
                onClick={() => onNavigate((activeIndex + 1) % images.length)}
                aria-label="Next image"
                className="hidden sm:flex absolute right-2 z-10 w-11 h-11 rounded-full bg-white/12 hover:bg-white/25 text-white items-center justify-center transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Caption + mobile nav */}
          <div
            className="max-w-3xl w-full mx-auto flex flex-col items-center gap-3 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {current.caption && (
              <p className="text-sm text-white/90 leading-relaxed line-clamp-2">
                {current.caption}
              </p>
            )}
            {images.length > 1 && (
              <div className="flex sm:hidden items-center gap-4">
                <button
                  type="button"
                  onClick={() => onNavigate((activeIndex - 1 + images.length) % images.length)}
                  aria-label="Previous image"
                  className="px-4 py-2 rounded-xl bg-white/15 text-white text-xs font-medium"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate((activeIndex + 1) % images.length)}
                  aria-label="Next image"
                  className="px-4 py-2 rounded-xl bg-white/15 text-white text-xs font-medium"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
