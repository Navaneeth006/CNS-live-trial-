import React, { useState } from 'react';
import {
  Sun,
  Moon,
  Monitor,
  Bell,
  Tv,
  Radio,
  User,
  Shield,
  Check,
  CircleDot,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { useTheme, ThemeMode } from '../context/ThemeContext.tsx';
import { useRouter } from '../context/RouterContext.tsx';
import { useStore } from '../hooks/useStore.ts';
import { UserRole } from '../types.ts';
import { CsnLiveLogo } from './CsnLiveLogo.tsx';

export const TopNav: React.FC = () => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const { navigate } = useRouter();
  const { settings, staffCalls, resolveStaffCall, currentUser, setAuthUser } = useStore();
  
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);

  const pendingCalls = staffCalls.filter((c) => c.status === 'pending');

  const switchRole = (role: UserRole) => {
    setAuthUser({
      ...currentUser,
      role,
      name: role === 'admin' ? 'Yuvaraja (Admin)' : role === 'staff' ? 'Staff Member' : 'Guest Player',
    });
    setShowRoleMenu(false);
  };

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-[#E1E3DF] dark:border-[#26302B] bg-white/95 dark:bg-[#151918]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between transition-colors">
      {/* Left: Venue Brand & Table Count */}
      <div className="flex items-center gap-3">
        <button
          id="btn-brand-home"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-left group cursor-pointer hover:opacity-90 transition-opacity"
        >
          <CsnLiveLogo size="md" />
          <div className="hidden lg:block border-l border-[#E1E3DF] dark:border-[#26302B] pl-3 ml-1">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#FF002B]/10 text-[#FF002B] border border-[#FF002B]/25 tracking-widest uppercase">
              ARENA
            </span>
            <p className="text-[11px] text-[#5A635E] dark:text-[#9BA3A0] font-medium truncate max-w-[180px]">
              {settings.venueName}
            </p>
          </div>
        </button>

        {/* Sync Active Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FF002B]/10 border border-[#FF002B]/30 text-[#FF002B] text-[11px] font-mono font-semibold">
          <CircleDot className="w-2.5 h-2.5 animate-pulse text-[#FF002B]" />
          <span>Sync Active</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* TV Display Quick Link */}
        <button
          id="btn-nav-tv-display"
          onClick={() => navigate('/display')}
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold font-display tracking-tight bg-[#EBECE8] hover:bg-[#E1E3DF] dark:bg-[#1D2321] dark:hover:bg-[#222927] text-[#111413] dark:text-[#F5F7F6] border border-[#E1E3DF] dark:border-[#26302B] transition-colors cursor-pointer"
          title="Open Fullscreen TV Arena (/display)"
        >
          <Tv className="w-3.5 h-3.5 text-[#197A4C] dark:text-[#1F9D63]" />
          <span>Arena TV</span>
        </button>

        {/* Streaming Overlay Quick Link */}
        <button
          id="btn-nav-stream-overlay"
          onClick={() => navigate('/stream')}
          className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold font-display tracking-tight bg-[#EBECE8] hover:bg-[#E1E3DF] dark:bg-[#1D2321] dark:hover:bg-[#222927] text-[#111413] dark:text-[#F5F7F6] border border-[#E1E3DF] dark:border-[#26302B] transition-colors cursor-pointer"
          title="Open OBS Streaming Overlay (/stream)"
        >
          <Radio className="w-3.5 h-3.5 text-[#B8892F] dark:text-[#D6A84F] animate-pulse" />
          <span>OBS Feed</span>
        </button>

        {/* Notifications / Staff Calls */}
        <div className="relative">
          <button
            id="btn-notifications"
            onClick={() => {
              setShowNotificationMenu(!showNotificationMenu);
              setShowRoleMenu(false);
            }}
            className="relative p-2 rounded-xl text-[#5A635E] dark:text-[#9BA3A0] hover:text-[#111413] dark:hover:text-[#F5F7F6] hover:bg-[#EBECE8] dark:hover:bg-[#1D2321] transition-colors cursor-pointer"
            title="Assistance Notifications"
          >
            <Bell className="w-4 h-4" />
            {pendingCalls.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#151918] animate-pulse" />
            )}
          </button>

          {showNotificationMenu && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-[#151918] border border-[#E1E3DF] dark:border-[#26302B] shadow-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#E1E3DF] dark:border-[#26302B]">
                <span className="text-xs font-bold font-display text-[#111413] dark:text-[#F5F7F6]">
                  Table Service Calls ({pendingCalls.length})
                </span>
                <span className="text-[10px] text-[#8E9B95] dark:text-[#616B66] font-mono">Real-time alerts</span>
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-[#E1E3DF] dark:divide-[#26302B] mt-1">
                {pendingCalls.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#8E9B95] dark:text-[#616B66]">
                    No active staff assistance calls.
                  </div>
                ) : (
                  pendingCalls.map((call) => (
                    <div key={call.id} className="py-2.5 flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-[#B8892F]/10 text-[#B8892F] dark:bg-[#D6A84F]/15 dark:text-[#D6A84F] font-bold font-mono text-[10px]">
                            Table 0{call.tableId}
                          </span>
                          <span className="text-[10px] text-[#8E9B95] dark:text-[#616B66] font-mono">
                            {new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-[#111413] dark:text-[#F5F7F6] mt-1">
                          {call.reason}
                        </p>
                      </div>
                      <button
                        onClick={() => resolveStaffCall(call.id)}
                        className="px-2 py-1 rounded-lg bg-[#197A4C]/10 text-[#197A4C] dark:bg-[#1F9D63]/15 dark:text-[#1F9D63] hover:bg-[#197A4C]/20 text-[10px] font-bold shrink-0 cursor-pointer"
                      >
                        Resolve
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle Button (Instant One-Click Switch) */}
        <button
          id="btn-theme-toggle"
          onClick={() => toggleTheme()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E1E3DF] dark:border-[#26302B] bg-[#EBECE8] hover:bg-[#E1E3DF] dark:bg-[#1D2321] dark:hover:bg-[#222927] text-[#111413] dark:text-[#F5F7F6] text-xs font-semibold font-display tracking-tight transition-all active:scale-[0.98] cursor-pointer"
          title={`Active: ${resolvedTheme === 'dark' ? 'Dark' : 'Light'} Mode. Click to switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {resolvedTheme === 'light' ? (
            <Sun className="w-4 h-4 text-[#B8892F] transition-transform hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 text-[#1F9D63] transition-transform hover:-rotate-12" />
          )}
          <span className="font-mono text-[11px] uppercase tracking-wider font-bold">
            {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
          </span>
        </button>

        {/* User Profile & Role Selector */}
        <div className="relative">
          <button
            id="btn-user-role-menu"
            onClick={() => {
              setShowRoleMenu(!showRoleMenu);
              setShowNotificationMenu(false);
            }}
            className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl border border-[#E1E3DF] dark:border-[#26302B] bg-[#F4F5F3] dark:bg-[#1D2321] hover:bg-[#EBECE8] dark:hover:bg-[#222927] transition-colors cursor-pointer"
          >
            <div className="w-6 h-6 rounded-full bg-[#197A4C] dark:bg-[#1F9D63] text-white flex items-center justify-center text-[10px] font-bold font-mono">
              {currentUser.name.charAt(0)}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold font-display text-[#111413] dark:text-[#F5F7F6] leading-tight">
                {currentUser.name}
              </p>
              <p className="text-[10px] text-[#8E9B95] dark:text-[#616B66] capitalize font-medium">
                {currentUser.role}
              </p>
            </div>
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white dark:bg-[#151918] border border-[#E1E3DF] dark:border-[#26302B] shadow-2xl p-2 z-50">
              <div className="px-3 py-2 border-b border-[#E1E3DF] dark:border-[#26302B]">
                <p className="text-xs font-bold font-display text-[#111413] dark:text-[#F5F7F6]">{currentUser.name}</p>
                <p className="text-[11px] text-[#8E9B95] dark:text-[#616B66] font-mono">{currentUser.email}</p>
              </div>

              <div className="pt-2">
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#8E9B95] dark:text-[#616B66] font-display">
                  Switch Active Role
                </p>
                {(['admin', 'staff', 'player'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => switchRole(r)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                      currentUser.role === r
                        ? 'bg-[#197A4C]/10 text-[#197A4C] dark:bg-[#1F9D63]/15 dark:text-[#1F9D63] font-bold'
                        : 'text-[#5A635E] dark:text-[#9BA3A0] hover:bg-[#F0F2EE] dark:hover:bg-[#1D2321] hover:text-[#111413] dark:hover:text-[#F5F7F6]'
                    }`}
                  >
                    <span>{r} View</span>
                    {currentUser.role === r && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
