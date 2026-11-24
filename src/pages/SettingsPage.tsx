import React, { useState } from 'react';
import { Check, Copy, Eye, EyeOff, Link2, RefreshCw, ShieldCheck } from 'lucide-react';
import { buildInviteLink } from '../lib/inviteLink';
import type { AvatarPreset, PublicUser, SpaceSettings, SpaceStatus } from '../types/index';
import { api } from '../utils/apiClient';
import { SpaceBrandMark } from '../components/artwork/CatDuoIllustration';
import { PartnerAvatar } from '../components/artwork/PartnerAvatar';
import type { AppearanceTheme } from '../components/layout/AppShell';
import { useToast } from '../components/ui/ToastProvider';

interface SettingsPageProps {
  user: PublicUser;
  members: PublicUser[];
  space: SpaceSettings;
  status: SpaceStatus;
  appearance: AppearanceTheme;
  onChangeAppearance: (theme: AppearanceTheme) => void;
  onSpaceUpdated: (space: SpaceSettings) => void;
  onUserUpdated: (user: PublicUser) => void;
  onLogout: () => void;
}

const AVATAR_CHOICES: { id: AvatarPreset; label: string }[] = [
  { id: 'bat-cat', label: 'Bat Cat' },
  { id: 'bow-cat', label: 'Bow Cat' },
  { id: 'lavender', label: 'Lavender' },
  { id: 'blush', label: 'Blush' },
  { id: 'sky', label: 'Sky' },
];

const LOGO_CHOICES: { id: 'cat-duo' | 'heart' | 'moon' | 'sunflower'; label: string }[] = [
  { id: 'cat-duo', label: 'Cat Duo' },
  { id: 'sunflower', label: 'Sunflower' },
  { id: 'heart', label: 'Pastel Heart' },
  { id: 'moon', label: 'Cozy Moon' },
];

export const SettingsPage: React.FC<SettingsPageProps> = ({
  user,
  members,
  space,
  status,
  appearance,
  onChangeAppearance,
  onSpaceUpdated,
  onUserUpdated,
  onLogout,
}) => {
  const { showToast } = useToast();

  // Space form state
  const [spaceName, setSpaceName] = useState(space.spaceName);
  const [tagline, setTagline] = useState(space.tagline);
  const [welcomeMessage, setWelcomeMessage] = useState(space.welcomeMessage);
  const [logoStyle, setLogoStyle] = useState<'cat-duo' | 'heart' | 'moon' | 'sunflower'>(
    space.logoStyle,
  );
  const [savingSpace, setSavingSpace] = useState(false);

  // Profile form state
  const [displayName, setDisplayName] = useState(user.name);
  const [bio, setBio] = useState(user.bio ?? '');
  const [avatarPreset, setAvatarPreset] = useState<AvatarPreset>(user.avatarPreset);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Invite state
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [rotatingInvite, setRotatingInvite] = useState(false);
  const [copiedType, setCopiedType] = useState<'code' | 'link' | null>(null);

  const handleSaveSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSpace(true);
    try {
      const res = await api.updateSpace({
        spaceName,
        tagline,
        welcomeMessage,
        logoStyle,
      });
      onSpaceUpdated(res.space);
      showToast('Space settings saved.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save space settings.', 'error');
    } finally {
      setSavingSpace(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.updateProfile({
        name: displayName,
        avatarPreset,
        bio: bio.trim(),
      });
      onUserUpdated(res.user);
      showToast('Profile updated.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRotateInvite = async () => {
    setRotatingInvite(true);
    try {
      const res = await api.rotateInvite();
      setInviteCode(res.inviteCode);
      showToast('New partner invite link & code created.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not rotate invite code.', 'error');
    } finally {
      setRotatingInvite(false);
    }
  };

  const copyInvite = async (kind: 'code' | 'link') => {
    if (!inviteCode) return;
    const value =
      kind === 'link' ? buildInviteLink(window.location.origin, inviteCode) : inviteCode;
    await navigator.clipboard.writeText(value).catch(() => undefined);
    setCopiedType(kind);
    showToast(kind === 'link' ? 'Invite link copied.' : 'Invite code copied.', 'success');
    window.setTimeout(() => setCopiedType((cur) => (cur === kind ? null : cur)), 2000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      showToast('Password updated successfully.', 'success');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-[#29253A]">
          Space Settings
        </h1>
        <p className="mt-1 text-sm text-[#645E7B]">
          Customize your shared sanctuary, personal profile, and two-person access.
        </p>
      </div>

      {/* Space Customization */}
      <section className="bg-white border border-[#6554A4]/14 rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold text-[#29253A]">
          Customize Shared Space
        </h2>
        <p className="mt-0.5 text-xs text-[#645E7B]">
          Changes sync immediately for both of you.
        </p>

        <form onSubmit={handleSaveSpace} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="settings-space-name"
              className="block text-xs font-medium text-[#29253A] mb-1.5"
            >
              Space name
            </label>
            <input
              id="settings-space-name"
              type="text"
              required
              maxLength={48}
              value={spaceName}
              onChange={(e) => setSpaceName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#6554A4]/20 bg-[#FAF9FE]/60 text-sm text-[#29253A] focus:outline-none focus:ring-2 focus:ring-[#6554A4]/25"
            />
          </div>

          <div>
            <label
              htmlFor="settings-welcome-message"
              className="block text-xs font-medium text-[#29253A] mb-1.5"
            >
              Dashboard welcome message
            </label>
            <textarea
              id="settings-welcome-message"
              rows={2}
              required
              maxLength={240}
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#6554A4]/20 bg-[#FAF9FE]/60 text-sm text-[#29253A] focus:outline-none focus:ring-2 focus:ring-[#6554A4]/25"
            />
          </div>

          <div>
            <label
              htmlFor="settings-tagline"
              className="block text-xs font-medium text-[#29253A] mb-1.5"
            >
              Subtitle
            </label>
            <input
              id="settings-tagline"
              type="text"
              maxLength={100}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#6554A4]/20 bg-[#FAF9FE]/60 text-sm text-[#29253A] focus:outline-none focus:ring-2 focus:ring-[#6554A4]/25"
            />
          </div>

          <div>
            <span className="block text-xs font-medium text-[#29253A] mb-2">Logo mark</span>
            <div className="flex flex-wrap gap-2.5">
              {LOGO_CHOICES.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => setLogoStyle(choice.id)}
                  aria-pressed={logoStyle === choice.id}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
                    logoStyle === choice.id
                      ? 'bg-[#E9DFFF]/70 border-[#6554A4] text-[#29253A]'
                      : 'bg-white border-[#6554A4]/15 text-[#645E7B] hover:border-[#6554A4]/40'
                  }`}
                >
                  <SpaceBrandMark style={choice.id} className="w-6 h-6" />
                  <span className="whitespace-nowrap">{choice.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={savingSpace}
              className="px-4 py-2 rounded-xl bg-[#6554A4] hover:bg-[#534391] text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {savingSpace ? 'Saving...' : 'Save space settings'}
            </button>
          </div>
        </form>
      </section>

      {/* Personal Profile */}
      <section className="bg-white border border-[#6554A4]/14 rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold text-[#29253A]">Your Profile</h2>
        <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="settings-display-name"
              className="block text-xs font-medium text-[#29253A] mb-1.5"
            >
              Display name
            </label>
            <input
              id="settings-display-name"
              type="text"
              required
              maxLength={40}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#6554A4]/20 bg-[#FAF9FE]/60 text-sm text-[#29253A] focus:outline-none focus:ring-2 focus:ring-[#6554A4]/25"
            />
          </div>

          <div>
            <label
              htmlFor="settings-bio"
              className="block text-xs font-medium text-[#29253A] mb-1.5"
            >
              Short bio or mood <span className="font-normal text-[#817B90]">(optional)</span>
            </label>
            <input
              id="settings-bio"
              type="text"
              maxLength={160}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g., Currently craving iced matcha & late night walks"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#6554A4]/20 bg-[#FAF9FE]/60 text-sm text-[#29253A] focus:outline-none focus:ring-2 focus:ring-[#6554A4]/25"
            />
          </div>

          <div>
            <span className="block text-xs font-medium text-[#29253A] mb-2">Avatar style</span>
            <div className="flex flex-wrap gap-2.5">
              {AVATAR_CHOICES.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => setAvatarPreset(choice.id)}
                  aria-pressed={avatarPreset === choice.id}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                    avatarPreset === choice.id
                      ? 'bg-[#E9DFFF]/70 border-[#6554A4] text-[#29253A]'
                      : 'bg-white border-[#6554A4]/15 text-[#645E7B] hover:border-[#6554A4]/40'
                  }`}
                >
                  <PartnerAvatar name={displayName || choice.label} preset={choice.id} size="xs" />
                  <span className="whitespace-nowrap">{choice.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-4 py-2 rounded-xl bg-[#6554A4] hover:bg-[#534391] text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {savingProfile ? 'Updating...' : 'Save profile'}
            </button>
          </div>
        </form>
      </section>

      {/* Appearance Theme */}
      <section className="bg-white border border-[#6554A4]/14 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#29253A]">Appearance</h2>
          <p className="mt-0.5 text-xs text-[#817B90]">
            Choose the backdrop tone you prefer on this device.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Appearance backdrop">
          <button
            type="button"
            role="radio"
            aria-checked={appearance === 'lavender'}
            onClick={() => onChangeAppearance('lavender')}
            className={`text-left p-4 rounded-xl border transition-all flex items-center gap-3 ${
              appearance === 'lavender'
                ? 'bg-[#E9DFFF]/40 border-[#6554A4] ring-1 ring-[#6554A4]/30'
                : 'bg-white border-[#6554A4]/15 hover:border-[#6554A4]/35'
            }`}
          >
            <span className="w-8 h-8 rounded-full bg-[#FCFAFF] border border-[#BFA7F2] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#29253A]">Soft Lavender</p>
              <p className="text-xs text-[#817B90]">Airy lavender & crisp white</p>
            </div>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={appearance === 'cream'}
            onClick={() => onChangeAppearance('cream')}
            className={`text-left p-4 rounded-xl border transition-all flex items-center gap-3 ${
              appearance === 'cream'
                ? 'bg-[#FFF9EA] border-[#F3BB38] ring-1 ring-[#F3BB38]/40'
                : 'bg-white border-[#6554A4]/15 hover:border-[#6554A4]/35'
            }`}
          >
            <span className="w-8 h-8 rounded-full bg-[#FFF9EA] border border-[#F3BB38] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#29253A]">Sunflower Cream</p>
              <p className="text-xs text-[#817B90]">Sunlit warm cream canvas</p>
            </div>
          </button>
        </div>
      </section>

      {/* Change Password */}
      <section className="bg-white border border-[#6554A4]/14 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#29253A]">Password</h2>
            <p className="mt-0.5 text-xs text-[#645E7B]">
              Update the password for your account ({user.email}).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPasswords((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-[#645E7B] hover:text-[#29253A] hover:bg-[#FAF9FE] transition-colors whitespace-nowrap"
          >
            {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showPasswords ? 'Hide passwords' : 'Show passwords'}</span>
          </button>
        </div>

        <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="settings-current-password"
              className="block text-xs font-medium text-[#29253A] mb-1.5"
            >
              Current password
            </label>
            <input
              id="settings-current-password"
              type={showPasswords ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#6554A4]/20 bg-[#FAF9FE]/60 text-sm text-[#29253A] focus:outline-none focus:ring-2 focus:ring-[#6554A4]/25"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="settings-new-password"
                className="block text-xs font-medium text-[#29253A] mb-1.5"
              >
                New password
              </label>
              <input
                id="settings-new-password"
                type={showPasswords ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#6554A4]/20 bg-[#FAF9FE]/60 text-sm text-[#29253A] focus:outline-none focus:ring-2 focus:ring-[#6554A4]/25"
              />
            </div>

            <div>
              <label
                htmlFor="settings-confirm-password"
                className="block text-xs font-medium text-[#29253A] mb-1.5"
              >
                Confirm new password
              </label>
              <input
                id="settings-confirm-password"
                type={showPasswords ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#6554A4]/20 bg-[#FAF9FE]/60 text-sm text-[#29253A] focus:outline-none focus:ring-2 focus:ring-[#6554A4]/25"
              />
            </div>
          </div>

          {passwordError && (
            <p
              role="alert"
              className="text-xs text-[#B91C1C] bg-[#FFF5F7] border border-[#E11D48]/20 rounded-xl px-3.5 py-2.5"
            >
              {passwordError}
            </p>
          )}

          <div className="pt-1">
            <button
              type="submit"
              disabled={savingPassword}
              className="px-4 py-2 rounded-xl bg-[#6554A4] hover:bg-[#534391] text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {savingPassword ? 'Updating...' : 'Update password'}
            </button>
          </div>
        </form>
      </section>

      {/* Two-Person Privacy & Members */}
      <section className="bg-white border border-[#6554A4]/14 rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#29253A]">
              Private Two-Person Access
            </h2>
            <p className="mt-0.5 text-xs text-[#645E7B]">
              {status.userCount} of {status.maxUsers} authorized accounts registered.
              {status.userCount === 2 && ' New registrations are permanently closed.'}
            </p>
          </div>
          <ShieldCheck className="w-5 h-5 text-[#6554A4] shrink-0" />
        </div>

        <div className="divide-y divide-[#6554A4]/10 border-t border-[#6554A4]/10">
          {members.map((m) => (
            <div key={m.id} className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <PartnerAvatar
                  name={m.name}
                  preset={m.avatarPreset}
                  avatarUrl={m.avatar}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#29253A] truncate">
                    {m.name} {m.id === user.id ? '(You)' : ''}
                  </p>
                  <p className="text-xs text-[#645E7B] truncate">{m.email}</p>
                </div>
              </div>
              <span className="text-xs text-[#645E7B] capitalize shrink-0">{m.role}</span>
            </div>
          ))}
        </div>

        {status.userCount < status.maxUsers && (
          <div className="pt-3 border-t border-[#6554A4]/10 flex flex-col gap-3">
            <p className="text-xs text-[#645E7B]">
              Generate a one-time 7-day invite link or code for your partner to claim seat 2.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {inviteCode && (
                <>
                  <code className="px-3 py-1.5 rounded-xl bg-[#FAF9FE] border border-[#6554A4]/20 text-xs font-semibold tracking-wider text-[#29253A] tabular-nums">
                    {inviteCode}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyInvite('link')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#6554A4] text-white text-xs font-medium hover:bg-[#534391] whitespace-nowrap"
                  >
                    {copiedType === 'link' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Link2 className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedType === 'link' ? 'Link copied' : 'Copy invite link'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => copyInvite('code')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#6554A4]/20 text-xs font-medium text-[#29253A] hover:bg-[#FAF9FE] whitespace-nowrap"
                  >
                    {copiedType === 'code' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedType === 'code' ? 'Code copied' : 'Copy code'}</span>
                  </button>
                </>
              )}
              <button
                type="button"
                disabled={rotatingInvite}
                onClick={handleRotateInvite}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#6554A4]/25 bg-white text-[#29253A] text-xs font-medium hover:bg-[#FAF9FE] disabled:opacity-60 whitespace-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{inviteCode ? 'New link' : 'Generate invite'}</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Sign out */}
      <div className="flex items-center justify-end pt-2">
        <button
          type="button"
          onClick={onLogout}
          className="px-4 py-2 rounded-xl border border-[#6554A4]/20 text-sm font-medium text-[#29253A] hover:bg-white transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
};
