import React from 'react';
import { BookOpen, Home, Images, LogOut, Settings } from 'lucide-react';
import type { PublicUser, SpaceSettings } from '../../types/index';
import { SpaceBrandMark } from '../artwork/CatDuoIllustration';
import { PartnerAvatar } from '../artwork/PartnerAvatar';

export type AppRoute = 'dashboard' | 'notes' | 'memories' | 'settings';

interface AppShellProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  space: SpaceSettings;
  user: PublicUser;
  members: PublicUser[];
  onlineUserIds: string[];
  onLogout: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: AppRoute; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'notes', label: 'Notes', icon: BookOpen },
  { id: 'memories', label: 'Memories', icon: Images },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const AppShell: React.FC<AppShellProps> = ({
  currentRoute,
  onNavigate,
  space,
  user,
  members,
  onlineUserIds,
  onLogout,
  children,
}) => {
  return (
    <div className="min-h-screen bg-[#FAF9FE] flex flex-col pb-20 md:pb-0">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#6554A4]/12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand mark + single-line Space Name */}
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 group"
          >
            <SpaceBrandMark style={space.logoStyle} className="w-8 h-8 shrink-0" />
            <span className="font-display text-base sm:text-lg font-bold tracking-tight text-[#29253A] group-hover:text-[#6554A4] transition-colors truncate max-w-[180px] sm:max-w-[240px]">
              {space.spaceName}
            </span>
          </button>

          {/* Zone 2: Clean single-line text nav links (Desktop/Tablet) */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => {
              const active = currentRoute === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`py-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                    active
                      ? 'text-[#6554A4] border-[#6554A4]'
                      : 'text-[#645E7B] border-transparent hover:text-[#29253A]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Partner Presence + Sign Out action */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center -space-x-2" aria-label="Space members">
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
              onClick={onLogout}
              aria-label={`Sign out ${user.name}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#645E7B] hover:text-[#29253A] hover:bg-[#E9DFFF]/45 transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation (<= 15% viewport height, >= 44px touch targets) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#6554A4]/12 px-2 py-1.5"
        aria-label="Mobile navigation"
      >
        <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
          {NAV_ITEMS.map((item) => {
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
                    ? 'text-[#6554A4] bg-[#E9DFFF]/55'
                    : 'text-[#645E7B] hover:text-[#29253A]'
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
