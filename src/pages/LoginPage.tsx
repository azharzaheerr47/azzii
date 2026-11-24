import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, Link2, Lock } from 'lucide-react';
import { normalizeInviteCode } from '../lib/inviteLink';
import type { AvatarPreset, PublicUser, SpaceStatus } from '../types/index';
import { api } from '../utils/apiClient';
import { CatDuoIllustration } from '../components/artwork/CatDuoIllustration';
import { PartnerAvatar } from '../components/artwork/PartnerAvatar';
import { SunflowerAccent } from '../components/artwork/SunflowerIllustration';
import { useToast } from '../components/ui/ToastProvider';

interface LoginPageProps {
  status: SpaceStatus;
  initialInviteCode?: string | null;
  onAuthenticated: (user: PublicUser, createdInviteCode?: string) => Promise<void>;
}

const AVATAR_CHOICES: { id: AvatarPreset; label: string }[] = [
  { id: 'bat-cat', label: 'Bat Cat' },
  { id: 'bow-cat', label: 'Bow Cat' },
  { id: 'lavender', label: 'Lavender' },
  { id: 'blush', label: 'Blush' },
  { id: 'sky', label: 'Sky' },
];

type AuthTab = 'login' | 'signup' | 'invite';

export const LoginPage: React.FC<LoginPageProps> = ({
  status,
  initialInviteCode = null,
  onAuthenticated,
}) => {
  const { showToast } = useToast();
  const isFirstRun = !status.initialized;
  const normalizedUrlInvite = normalizeInviteCode(initialInviteCode);

  const [mode, setMode] = useState<AuthTab>(() => {
    if (normalizedUrlInvite) return 'invite';
    if (isFirstRun) return 'signup';
    return 'login';
  });

  const [spaceName, setSpaceName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCode, setInviteCode] = useState(() => normalizedUrlInvite ?? '');
  const [avatarPreset, setAvatarPreset] = useState<AvatarPreset>(
    mode === 'invite' ? 'bow-cat' : 'bat-cat',
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      if (mode === 'signup') {
        const res = await api.signup({
          name,
          email,
          password,
          avatarPreset,
          spaceName: spaceName.trim() || undefined,
        });
        await onAuthenticated(res.user, res.inviteCode);
        showToast('Your private space is ready. Share your invite link with your partner!', 'success');
      } else if (mode === 'invite') {
        const res = await api.redeemInvite({
          inviteCode,
          name,
          email,
          password,
          avatarPreset,
        });
        await onAuthenticated(res.user);
        showToast('Welcome to Our Little Space.', 'success');
      } else {
        const res = await api.login({ email, password });
        await onAuthenticated(res.user);
        showToast(`Welcome back, ${res.user.name}.`, 'success');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-center px-4 py-10 sm:px-6 lg:px-8 transition-colors duration-300"
      style={{
        backgroundColor: 'var(--bg-canvas)',
        backgroundImage:
          'linear-gradient(135deg, var(--bg-hero-from), var(--bg-hero-via), var(--bg-hero-to))',
      }}
    >
      <main className="max-w-4xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left: Brand & Cat Duo Illustration */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left"
        >
          <div className="relative inline-flex items-end mb-6">
            <CatDuoIllustration size="lg" className="drop-shadow-xs" />
            <SunflowerAccent className="w-14 h-14 -ml-5 -mb-1 drop-shadow-xs" />
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] text-balance">
            Our Little Space
          </h1>
          <p className="mt-3 text-base text-[var(--text-muted)] leading-relaxed max-w-md">
            A quiet, private corner of the internet made exclusively for two people to leave
            daily notes, photo memories, compliments, and small illustrated keepsakes.
          </p>

          <div className="mt-6 flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Lock className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
            <span>
              {status.initialized
                ? 'Private 2-person space · Sign in, create a new space, or join by invite'
                : 'Private 2-person space · Ready for initial setup'}
            </span>
          </div>
        </motion.section>

        {/* Right: Auth Card */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="lg:col-span-6 bg-[var(--bg-card)] backdrop-blur-md border border-[var(--border-subtle)] rounded-2xl p-6 sm:p-8 shadow-xs"
        >
          <div className="mb-6">
            <div
              className="flex flex-wrap sm:inline-flex gap-1 p-1 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl mb-4"
              role="tablist"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  mode === 'login'
                    ? 'bg-[var(--bg-card-elevated)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signup'}
                onClick={() => {
                  setMode('signup');
                  setErrorMsg(null);
                }}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  mode === 'signup'
                    ? 'bg-[var(--bg-card-elevated)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Sign up
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'invite'}
                onClick={() => {
                  setMode('invite');
                  setErrorMsg(null);
                }}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  mode === 'invite'
                    ? 'bg-[var(--bg-card-elevated)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Join by invite
              </button>
            </div>

            {normalizedUrlInvite && mode === 'invite' && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-border)] px-3.5 py-2.5 text-xs text-[var(--text-primary)]">
                <Link2 className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                <span>
                  Partner invite link applied (<strong className="font-semibold">{normalizedUrlInvite}</strong>). Complete your account details below to join.
                </span>
              </div>
            )}

            <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">
              {mode === 'signup'
                ? 'Create your space'
                : mode === 'invite'
                  ? 'Join your partner'
                  : 'Welcome back'}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {mode === 'signup'
                ? 'Create your account and get a private invite link so your partner can join your 2-person space.'
                : mode === 'invite'
                  ? 'Use the invite link or enter the code your partner shared to claim the second account.'
                  : 'Sign in with your private credentials to open your shared notes.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'invite' && (
              <div>
                <label
                  htmlFor="auth-invite"
                  className="block text-xs font-medium text-[var(--text-primary)] mb-1.5"
                >
                  Partner invite code
                </label>
                <input
                  id="auth-invite"
                  type="text"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="ABCD-1234"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)] tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]/30"
                />
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label
                  htmlFor="auth-space-name"
                  className="block text-xs font-medium text-[var(--text-primary)] mb-1.5"
                >
                  Space name <span className="font-normal text-[var(--text-muted)]">(optional)</span>
                </label>
                <input
                  id="auth-space-name"
                  type="text"
                  maxLength={48}
                  value={spaceName}
                  onChange={(e) => setSpaceName(e.target.value)}
                  placeholder="Our Little Space"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]/30"
                />
              </div>
            )}

            {(mode === 'signup' || mode === 'invite') && (
              <div>
                <label
                  htmlFor="auth-name"
                  className="block text-xs font-medium text-[var(--text-primary)] mb-1.5"
                >
                  Your display name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  required
                  maxLength={40}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={mode === 'signup' ? 'e.g., Leo' : 'e.g., Maya'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]/30"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-medium text-[var(--text-primary)] mb-1.5"
              >
                Email address
              </label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]/30"
              />
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-medium text-[var(--text-primary)] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={mode === 'login' ? 1 : 8}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'login' ? 'Enter your password' : 'Minimum 8 characters'}
                  className="w-full pl-3.5 pr-11 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-1.5 my-1 px-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center justify-center transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {(mode === 'signup' || mode === 'invite') && (
              <div>
                <span className="block text-xs font-medium text-[var(--text-primary)] mb-2">
                  Choose your avatar
                </span>
                <div className="flex flex-wrap items-center gap-2.5">
                  {AVATAR_CHOICES.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => setAvatarPreset(choice.id)}
                      aria-label={`Select ${choice.label} avatar`}
                      aria-pressed={avatarPreset === choice.id}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                        avatarPreset === choice.id
                          ? 'bg-[var(--accent-soft-strong)] border-[var(--accent-primary)] text-[var(--text-primary)]'
                          : 'bg-[var(--bg-input)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <PartnerAvatar name={name || choice.label} preset={choice.id} size="xs" />
                      <span className="whitespace-nowrap">{choice.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {errorMsg && (
              <div
                role="alert"
                className="text-xs text-[var(--danger-text)] bg-[var(--danger-bg)] border border-[var(--danger-border)] rounded-xl px-3.5 py-2.5 space-y-1"
              >
                <p className="font-medium">{errorMsg}</p>
                {mode === 'login' && errorMsg.toLowerCase().includes('invalid email or password') && (
                  <p className="opacity-90">
                    Double-check your email and use the eye icon to verify your password, or switch to Sign up to start a fresh space.
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-on-primary)] text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {submitting
                ? 'Please wait...'
                : mode === 'signup'
                  ? 'Create account & space'
                  : mode === 'invite'
                    ? 'Join private space'
                    : 'Enter our space'}
            </button>
          </form>
        </motion.section>
      </main>
    </div>
  );
};
