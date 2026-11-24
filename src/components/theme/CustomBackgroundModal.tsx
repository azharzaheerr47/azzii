import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2, Upload, X } from 'lucide-react';
import { prepareImageForUpload, validateImageFileCandidate } from '../../lib/imageUploadPrep';
import {
  DEFAULT_CUSTOM_BACKGROUND_SETTINGS,
  buildCustomBackgroundImageStyle,
  buildCustomBackgroundOverlayColor,
  optimizeCloudinaryBackgroundUrl,
} from '../../lib/themeLogic';
import type {
  BackgroundPosition,
  CustomBackgroundConfig,
  OverlayMode,
} from '../../types/index';
import { api } from '../../utils/apiClient';
import { useToast } from '../ui/ToastProvider';

interface CustomBackgroundModalProps {
  open: boolean;
  initialConfig: CustomBackgroundConfig | null;
  saving: boolean;
  onLivePreview: (config: CustomBackgroundConfig | null) => void;
  onApply: (config: CustomBackgroundConfig) => Promise<void>;
  onRemoveBackground: () => Promise<void>;
  onClose: () => void;
}

const POSITION_OPTIONS: { id: BackgroundPosition; label: string }[] = [
  { id: 'center', label: 'Center' },
  { id: 'top', label: 'Top' },
  { id: 'bottom', label: 'Bottom' },
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
];

export const CustomBackgroundModal: React.FC<CustomBackgroundModalProps> = ({
  open,
  initialConfig,
  saving,
  onLivePreview,
  onApply,
  onRemoveBackground,
  onClose,
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const unsavedPublicIdsRef = useRef<string[]>([]);

  const [draft, setDraft] = useState<CustomBackgroundConfig | null>(initialConfig);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(initialConfig);
      setUploadError(null);
      unsavedPublicIdsRef.current = [];
    }
  }, [open, initialConfig]);

  useEffect(() => {
    onLivePreview(open ? draft : null);
  }, [open, draft, onLivePreview]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !uploading && !saving) {
        onLivePreview(null);
        const candidates = unsavedPublicIdsRef.current;
        unsavedPublicIdsRef.current = [];
        for (const id of candidates) {
          void api.deletePendingUpload(id).catch(() => undefined);
        }
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, uploading, saving, onLivePreview, onClose]);

  if (!open) return null;

  const updateDraft = (patch: Partial<CustomBackgroundConfig>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const cleanupUnsavedUploads = async (keepPublicId?: string) => {
    const candidates = unsavedPublicIdsRef.current.filter((id) => id && id !== keepPublicId);
    unsavedPublicIdsRef.current = [];
    for (const id of candidates) {
      await api.deletePendingUpload(id).catch(() => undefined);
    }
  };

  const handleCancel = async () => {
    onLivePreview(null);
    await cleanupUnsavedUploads();
    onClose();
  };

  const handleFileUpload = async (file: File) => {
    const check = validateImageFileCandidate(file);
    if (!check.valid) {
      setUploadError(check.error);
      showToast(check.error, 'error');
      return;
    }

    setUploadError(null);
    setUploading(true);
    setUploadProgress(10);
    try {
      const prepared = await prepareImageForUpload(file);
      setUploadProgress(20);
      const uploaded = await api.uploadImages(
        [prepared],
        (pct) => setUploadProgress(Math.max(20, pct)),
        'theme',
      );
      const item = uploaded[0];
      if (!item) throw new Error('Upload did not return a photo URL.');

      unsavedPublicIdsRef.current.push(item.cloudinaryPublicId);

      const nextConfig: CustomBackgroundConfig = {
        url: item.secureUrl,
        publicId: item.cloudinaryPublicId,
        position: draft?.position ?? DEFAULT_CUSTOM_BACKGROUND_SETTINGS.position,
        scale: draft?.scale ?? DEFAULT_CUSTOM_BACKGROUND_SETTINGS.scale,
        blur: draft?.blur ?? DEFAULT_CUSTOM_BACKGROUND_SETTINGS.blur,
        brightness: draft?.brightness ?? DEFAULT_CUSTOM_BACKGROUND_SETTINGS.brightness,
        overlayOpacity:
          draft?.overlayOpacity ?? DEFAULT_CUSTOM_BACKGROUND_SETTINGS.overlayOpacity,
        overlayMode: draft?.overlayMode ?? DEFAULT_CUSTOM_BACKGROUND_SETTINGS.overlayMode,
      };
      setDraft(nextConfig);
      onLivePreview(nextConfig);
      showToast('Photo uploaded. Adjust framing & readability below.', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to upload photo.';
      setUploadError(msg);
      showToast(msg, 'error');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleApply = async () => {
    if (!draft) return;
    await cleanupUnsavedUploads(draft.publicId);
    onLivePreview(null);
    await onApply(draft);
    onClose();
  };

  const handleRemove = async () => {
    onLivePreview(null);
    await cleanupUnsavedUploads();
    await onRemoveBackground();
    onClose();
  };

  const previewImgStyle = draft ? buildCustomBackgroundImageStyle(draft) : null;
  const previewOverlay = draft ? buildCustomBackgroundOverlayColor(draft) : null;
  const previewIsDark = draft?.overlayMode !== 'light';

  return (
    <div
      className="fixed inset-0 z-50 bg-[var(--backdrop-scrim)] backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-theme-modal-title"
      onClick={handleCancel}
    >
      <div
        className="w-full max-w-2xl bg-[var(--bg-card-elevated)] border border-[var(--border-strong)] rounded-2xl shadow-[var(--shadow-elevated)] p-5 sm:p-6 my-auto space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="custom-theme-modal-title"
              className="font-display text-lg font-bold text-[var(--text-primary)]"
            >
              Create Your Own Theme
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Upload a favorite photo from your gallery and tune clarity, framing, and readability.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            disabled={uploading || saving}
            aria-label="Close custom theme editor"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void handleFileUpload(file);
          }}
        />

        {/* Upload Dropzone OR Live Preview Frame */}
        {!draft ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const file = e.dataTransfer.files?.[0];
              if (file) void handleFileUpload(file);
            }}
            className={`rounded-2xl border border-dashed p-8 sm:p-10 text-center transition-colors ${
              dragActive
                ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]'
                : 'border-[var(--border-strong)] bg-[var(--bg-input)]'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-soft)] flex items-center justify-center mx-auto mb-3">
              <ImagePlus className="w-6 h-6 text-[var(--accent-primary)]" />
            </div>
            <p className="font-display text-sm font-semibold text-[var(--text-primary)]">
              Drop a photo here, or choose from your device
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Supports JPEG, PNG, and WebP · Automatically optimized for fast upload
            </p>
            {uploadError && (
              <p
                role="alert"
                className="mt-3 max-w-md mx-auto rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3.5 py-2 text-xs text-[var(--danger-text)]"
              >
                {uploadError}
              </p>
            )}
            {uploadProgress !== null ? (
              <div className="mt-4 max-w-xs mx-auto space-y-1.5">
                <div className="h-1.5 w-full rounded-full bg-[var(--accent-soft)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent-primary)] transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-[var(--text-muted)] tabular-nums">
                  Uploading {uploadProgress}%...
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-on-primary)] text-xs font-semibold transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Select photo from gallery</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Live Interactive Background Preview */}
            <div className="relative h-48 sm:h-56 rounded-2xl overflow-hidden border border-[var(--border-strong)]">
              <img
                src={optimizeCloudinaryBackgroundUrl(draft.url)}
                alt="Custom background preview"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  objectPosition: previewImgStyle?.objectPosition,
                  transform: previewImgStyle?.transform,
                  filter: previewImgStyle?.filter,
                }}
              />
              <div
                className="absolute inset-0 transition-colors duration-200"
                style={{ backgroundColor: previewOverlay ?? undefined }}
              />

              {/* Sample Readable UI Overlay inside Preview */}
              <div className="relative z-10 h-full p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium backdrop-blur-md border"
                    style={{
                      backgroundColor: previewIsDark
                        ? 'rgba(33, 29, 43, 0.78)'
                        : 'rgba(255, 255, 255, 0.85)',
                      borderColor: previewIsDark
                        ? 'rgba(191, 167, 242, 0.25)'
                        : 'rgba(101, 84, 164, 0.16)',
                      color: previewIsDark ? '#F6F2FC' : '#29253A',
                    }}
                  >
                    Live background preview
                  </span>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium backdrop-blur-md border transition-colors"
                    style={{
                      backgroundColor: previewIsDark
                        ? 'rgba(33, 29, 43, 0.82)'
                        : 'rgba(255, 255, 255, 0.88)',
                      borderColor: previewIsDark
                        ? 'rgba(191, 167, 242, 0.28)'
                        : 'rgba(101, 84, 164, 0.2)',
                      color: previewIsDark ? '#F6F2FC' : '#29253A',
                    }}
                  >
                    {uploading ? `Uploading ${uploadProgress ?? 0}%` : 'Change photo'}
                  </button>
                </div>

                <div
                  className="max-w-sm rounded-xl p-3 backdrop-blur-md border"
                  style={{
                    backgroundColor: previewIsDark
                      ? 'rgba(40, 35, 51, 0.84)'
                      : 'rgba(255, 255, 255, 0.86)',
                    borderColor: previewIsDark
                      ? 'rgba(191, 167, 242, 0.22)'
                      : 'rgba(101, 84, 164, 0.16)',
                  }}
                >
                  <p
                    className="text-xs font-semibold"
                    style={{ color: previewIsDark ? '#F6F2FC' : '#29253A' }}
                  >
                    Sample shared note readability
                  </p>
                  <p
                    className="mt-0.5 text-[11px]"
                    style={{ color: previewIsDark ? '#D4CCE6' : '#5E5872' }}
                  >
                    Adjust blur, brightness, and overlay tint so words always remain effortless to read.
                  </p>
                </div>
              </div>
            </div>

            {/* Sliders & Framing Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-[var(--text-primary)]">Focal position</span>
                  <span className="text-[var(--text-muted)] capitalize">{draft.position}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {POSITION_OPTIONS.map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => updateDraft({ position: pos.id })}
                      aria-pressed={draft.position === pos.id}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        draft.position === pos.id
                          ? 'bg-[var(--accent-soft-strong)] border-[var(--accent-primary)] text-[var(--text-primary)]'
                          : 'bg-[var(--bg-input)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-[var(--text-primary)]">Overlay style</span>
                  <span className="text-[var(--text-muted)] capitalize">{draft.overlayMode} scrim</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(['dark', 'light'] as OverlayMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => updateDraft({ overlayMode: mode })}
                      aria-pressed={draft.overlayMode === mode}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors ${
                        draft.overlayMode === mode
                          ? 'bg-[var(--accent-soft-strong)] border-[var(--accent-primary)] text-[var(--text-primary)]'
                          : 'bg-[var(--bg-input)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {mode} overlay
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="bg-scale-slider"
                  className="flex items-center justify-between text-xs mb-1"
                >
                  <span className="font-medium text-[var(--text-primary)]">Zoom / Scale</span>
                  <span className="text-[var(--text-muted)] tabular-nums">{draft.scale}%</span>
                </label>
                <input
                  id="bg-scale-slider"
                  type="range"
                  min={100}
                  max={150}
                  step={1}
                  value={draft.scale}
                  onChange={(e) => updateDraft({ scale: Number(e.target.value) })}
                  className="w-full accent-[var(--accent-primary)]"
                />
              </div>

              <div>
                <label
                  htmlFor="bg-blur-slider"
                  className="flex items-center justify-between text-xs mb-1"
                >
                  <span className="font-medium text-[var(--text-primary)]">Soft blur</span>
                  <span className="text-[var(--text-muted)] tabular-nums">{draft.blur}px</span>
                </label>
                <input
                  id="bg-blur-slider"
                  type="range"
                  min={0}
                  max={24}
                  step={1}
                  value={draft.blur}
                  onChange={(e) => updateDraft({ blur: Number(e.target.value) })}
                  className="w-full accent-[var(--accent-primary)]"
                />
              </div>

              <div>
                <label
                  htmlFor="bg-brightness-slider"
                  className="flex items-center justify-between text-xs mb-1"
                >
                  <span className="font-medium text-[var(--text-primary)]">Brightness</span>
                  <span className="text-[var(--text-muted)] tabular-nums">{draft.brightness}%</span>
                </label>
                <input
                  id="bg-brightness-slider"
                  type="range"
                  min={40}
                  max={130}
                  step={1}
                  value={draft.brightness}
                  onChange={(e) => updateDraft({ brightness: Number(e.target.value) })}
                  className="w-full accent-[var(--accent-primary)]"
                />
              </div>

              <div>
                <label
                  htmlFor="bg-opacity-slider"
                  className="flex items-center justify-between text-xs mb-1"
                >
                  <span className="font-medium text-[var(--text-primary)]">Overlay opacity</span>
                  <span className="text-[var(--text-muted)] tabular-nums">
                    {draft.overlayOpacity}%
                  </span>
                </label>
                <input
                  id="bg-opacity-slider"
                  type="range"
                  min={15}
                  max={85}
                  step={1}
                  value={draft.overlayOpacity}
                  onChange={(e) => updateDraft({ overlayOpacity: Number(e.target.value) })}
                  className="w-full accent-[var(--accent-primary)]"
                />
              </div>
            </div>
          </div>
        )}

        {draft && uploadError && (
          <p
            role="alert"
            className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3.5 py-2 text-xs text-[var(--danger-text)]"
          >
            {uploadError}
          </p>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3">
          {draft ? (
            <button
              type="button"
              disabled={uploading || saving}
              onClick={handleRemove}
              className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--danger-text)] hover:bg-[var(--danger-bg)] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove photo</span>
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={uploading || saving}
              onClick={handleCancel}
              className="min-h-[38px] px-4 py-2 rounded-xl border border-[var(--border-strong)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!draft || uploading || saving}
              onClick={handleApply}
              className="min-h-[38px] px-4 py-2 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-on-primary)] text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? 'Applying...' : 'Apply background'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
