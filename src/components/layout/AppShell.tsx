import React from 'react';
import { BookOpen, Home, Images, LogOut, Settings, Sparkles, Sticker } from 'lucide-react';
import type { PublicUser, SpaceSettings } from '../../types/index';
import { SpaceBrandMark } from '../artwork/CatDuoIllustration';
import { PartnerAvatar } from '../artwork/PartnerAvatar';

export type AppRoute = 'dashboard' | 'notes' | 'memories' | 'jar' | 'stickers' | 'settings';
export type AppearanceTheme = 'lavender' | 'cream';

interface AppShellProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  space: SpaceSettings;
  user: PublicUser;
  members: PublicUser[];
  onlineUserIds: string[];
  appearance: AppearanceTheme;
  onLogout: () => void;
  children: React.ReactNode;
}

const PRIMARY_NAV_ITEMS: {
  id: AppRoute;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'notes', label: 'Notes', icon: BookOpen },
  { id: 'memories', label: 'Memories', icon: Images },
  { id: 'jar', label: 'Jar', icon: Sparkles },
  { id: 'stickers', label: 'Stickers', icon: Sticker },
];

export const AppShell: React.FC<AppShellProps> = ({
  currentRoute,
  onNavigate,
  space,
  user,
  members,
  onlineUserIds,
  appearance,
  onLogout,
  children,
}) => {
  const rootBg = appearance === 'cream' ? 'bg-[#FFFDF6]' : 'bg-[#FCFAFF]';

  return (
    <div className={`min-h-screen ${rootBg} flex flex-col pb-20 md:pb-0 transition-colors duration-200`}>
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/92 backdrop-blur-md border-b border-[#6554A4]/12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Brand mark + single-line Space Name */}
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 group"
          >
            <SpaceBrandMark style={space.logoStyle} className="w-8 h-8 shrink-0" />
            <span className="font-display text-base sm:text-lg font-bold tracking-tight text-[#29253A] group-hover:text-[#6554A4] transition-colors truncate max-w-[145px] sm:max-w-[210px]">
              {space.spaceName}
            </span>
          </button>

          {/* Zone 2: Clean single-line text nav links (Desktop/Tablet) */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-6" aria-label="Main navigation">
            {PRIMARY_NAV_ITEMS.map((item) => {
              const active = currentRoute === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`py-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                    active
                      ? 'text-[#6554A4] border-[#F3BB38]'
                      : 'text-[#817B90] border-transparent hover:text-[#29253A]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Partner Presence + Settings + Sign Out */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden lg:flex items-center -space-x-2 mr-1" aria-label="Space members">
              {members.map((member) => (
                <PartnerAvatar
                  key={member.id}
                  name={member.name}
                  preset={member.avatarPreset}
                  avatarUrl={member.avatar}
                  size="sm"
                  isOnline={onlineUserIds.includes(member.id)}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              aria-label="Space settings"
              aria-current={currentRoute === 'settings' ? 'page' : undefined}
              className={`min-h-[40px] min-w-[40px] inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                currentRoute === 'settings'
                  ? 'bg-[#E9DFFF]/75 text-[#6554A4]'
                  : 'text-[#817B90] hover:text-[#29253A] hover:bg-[#FFF9EA]'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              aria-label={`Sign out ${user.name}`}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#817B90] hover:text-[#29253A] hover:bg-[#E9DFFF]/45 transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>

      {/* Editorial Footer */}
      <footer className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 border-t border-[#6554A4]/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#817B90]">
        <p className="font-display font-medium text-[#29253A]/75">
          {space.spaceName}
        </p>
        <p>A little space, a lot of memories.</p>
      </footer>

      {/* Mobile Bottom Navigation (<= 15% viewport height, >= 44px touch targets) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#6554A4]/12 px-1.5 py-1.5"
        aria-label="Mobile navigation"
      >
        <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = currentRoute === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium transition-colors ${
                  active
                    ? 'text-[#6554A4] bg-[#FFF9EA] ring-1 ring-[#F3BB38]/50'
                    : 'text-[#817B90] hover:text-[#29253A]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
