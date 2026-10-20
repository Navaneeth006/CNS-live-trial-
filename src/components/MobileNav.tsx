import React from 'react';
import {
  LayoutDashboard,
  CircleDot,
  Video,
  History,
  Tv,
} from 'lucide-react';
import { useRouter } from '../context/RouterContext.tsx';

interface MobileNavItem {
  label: string;
  path: string;
  icon: any;
  badge?: string;
}

export const MobileNav: React.FC = () => {
  const { route, navigate } = useRouter();

  // Don't show bottom nav on full-screen displays or mobile scoring to maximize screen real estate
  if (route.path.startsWith('/table/') || route.path === '/display' || route.path === '/stream') {
    return null;
  }

  const items: MobileNavItem[] = [
    { label: 'Overview', path: '/', icon: LayoutDashboard },
    { label: 'Tables', path: '/tables', icon: CircleDot },
    { label: 'Video Feed', path: '/videos', icon: Video },
    { label: 'History', path: '/history', icon: History },
    { label: 'TV View', path: '/display', icon: Tv },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#151918]/95 backdrop-blur-md border-t border-[#E1E3DF] dark:border-[#26302B] px-2 py-1.5 flex items-center justify-around transition-colors">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.path === '/'
            ? route.path === '/'
            : route.path.startsWith(item.path);

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center p-1.5 rounded-xl min-w-[52px] relative transition-colors cursor-pointer ${
              isActive
                ? 'text-[#197A4C] dark:text-[#1F9D63] font-bold'
                : 'text-[#5A635E] dark:text-[#9BA3A0] hover:text-[#111413] dark:hover:text-[#F5F7F6]'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
            <span className="text-[10px] mt-0.5 font-display">{item.label}</span>
            {item.badge && (
              <span className="absolute top-0.5 right-2 w-4 h-4 rounded-full bg-[#197A4C] dark:bg-[#1F9D63] text-white font-bold text-[9px] font-mono flex items-center justify-center">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
