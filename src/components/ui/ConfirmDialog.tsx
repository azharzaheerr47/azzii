import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDanger = false,
  busy = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#29253A]/35 backdrop-blur-[2px]"
          onClick={() => !busy && onCancel()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.16 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="w-full max-w-md bg-white border border-[#6554A4]/15 rounded-2xl shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="confirm-dialog-title"
              className="font-display text-lg font-semibold text-[#29253A]"
            >
              {title}
            </h2>
            <p className="mt-2 text-sm text-[#645E7B] leading-relaxed">{description}</p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-[#6554A4]/20 text-[#29253A] hover:bg-[#FAF9FE] transition-colors whitespace-nowrap shrink-0"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onConfirm}
                className={`px-4 py-2 text-sm font-medium rounded-xl text-white transition-colors whitespace-nowrap shrink-0 disabled:opacity-60 ${
                  isDanger
                    ? 'bg-[#B91C1C] hover:bg-[#991B1B]'
                    : 'bg-[#6554A4] hover:bg-[#54448F]'
                }`}
              >
                {busy ? 'Working...' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
