import React from 'react';
import {
  LayoutDashboard,
  CircleDot,
  Video,
  History,
  Radio,
  Settings,
  Tv,
  PlusCircle,
  ExternalLink,
} from 'lucide-react';
import { useRouter } from '../context/RouterContext.tsx';
import { useStore } from '../hooks/useStore.ts';

interface SidebarProps {
  onOpenStartModal?: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
  sub?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenStartModal }) => {
  const { route, navigate } = useRouter();
  const { tables, activeGames } = useStore();

  const navItems: NavItem[] = [
    { label: 'Overview', path: '/', icon: LayoutDashboard },
    {
      label: 'Tables',
      path: '/tables',
      icon: CircleDot,
      badge: '6',
    },
    {
      label: 'Video Feed',
      path: '/videos',
      icon: Video,
      badge: 'Live',
      badgeColor: 'bg-red-500',
    },
    { label: 'Game History', path: '/history', icon: History },
    { label: 'Streaming', path: '/stream', icon: Radio, sub: 'OBS Overlay' },
    { label: 'Venue Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-[#E1E3DF] dark:border-[#26302B] bg-white dark:bg-[#151918] hidden md:flex flex-col justify-between p-4 shrink-0 transition-colors">
      <div className="space-y-6">
        {/* Quick Action: Start Game */}
        {onOpenStartModal && (
          <button
            id="btn-sidebar-new-match"
            onClick={onOpenStartModal}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#197A4C] dark:bg-[#1F9D63] hover:bg-[#14643E] dark:hover:bg-[#26B372] active:scale-[0.98] text-white rounded-xl font-semibold text-xs font-display tracking-wider uppercase shadow-md shadow-[#1F9D63]/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Launch Match</span>
          </button>
        )}

        {/* Primary Navigation */}
        <nav className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#8E9B95] dark:text-[#616B66] mb-2 font-display">
            Venue Management
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === '/'
                ? route.path === '/'
                : route.path.startsWith(item.path);

            return (
              <button
                key={item.path}
                id={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-[#197A4C]/10 text-[#197A4C] border border-[#197A4C]/25 dark:bg-[#1F9D63]/15 dark:text-[#1F9D63] dark:border-[#1F9D63]/30 shadow-xs'
                    : 'text-[#5A635E] dark:text-[#9BA3A0] hover:bg-[#F0F2EE] dark:hover:bg-[#1D2321] hover:text-[#111413] dark:hover:text-[#F5F7F6]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive
                        ? 'text-[#197A4C] dark:text-[#1F9D63]'
                        : 'text-[#8E9B95] dark:text-[#616B66] group-hover:text-[#111413] dark:group-hover:text-[#F5F7F6]'
                    }`}
                  />
                  <span className="font-display tracking-tight">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      item.badgeColor ||
                      'bg-[#EBECE8] dark:bg-[#1D2321] text-[#5A635E] dark:text-[#9BA3A0] border border-[#E1E3DF] dark:border-[#26302B]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Broadcast & Live Display Links */}
      <div className="pt-4 border-t border-[#E1E3DF] dark:border-[#26302B] space-y-2">
        <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#8E9B95] dark:text-[#616B66] font-display">
          Broadcast Arena
        </p>

        <button
          onClick={() => navigate('/display')}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#5A635E] dark:text-[#9BA3A0] hover:bg-[#F0F2EE] dark:hover:bg-[#1D2321] hover:text-[#111413] dark:hover:text-[#F5F7F6] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Tv className="w-4 h-4 text-[#197A4C] dark:text-[#1F9D63]" />
            <span className="font-display">TV Scoreboard</span>
          </div>
          <ExternalLink className="w-3 h-3 text-[#8E9B95] dark:text-[#616B66]" />
        </button>

        <button
          onClick={() => navigate('/stream')}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#5A635E] dark:text-[#9BA3A0] hover:bg-[#F0F2EE] dark:hover:bg-[#1D2321] hover:text-[#111413] dark:hover:text-[#F5F7F6] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#B8892F] dark:text-[#D6A84F]" />
            <span className="font-display">OBS Stream Overlay</span>
          </div>
          <ExternalLink className="w-3 h-3 text-[#8E9B95] dark:text-[#616B66]" />
        </button>

        <div className="mt-4 p-3 rounded-xl bg-[#F4F5F3] dark:bg-[#1D2321] border border-[#E1E3DF] dark:border-[#26302B] text-[11px] text-[#5A635E] dark:text-[#9BA3A0]">
          <div className="flex items-center gap-1.5 font-bold font-display text-[#111413] dark:text-[#F5F7F6]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#197A4C] dark:bg-[#1F9D63]" />
            <span>Midnight Billiards Engine</span>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-[#8E9B95] dark:text-[#616B66]">
            F1 timing accuracy & real-time pool table telemetry.
          </p>
        </div>
      </div>
    </aside>
  );
};
