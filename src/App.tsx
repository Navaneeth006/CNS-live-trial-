import React from 'react';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { RouterProvider, useRouter } from './context/RouterContext.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { TopNav } from './components/TopNav.tsx';
import { MobileNav } from './components/MobileNav.tsx';

// Pages
import { DashboardPage } from './pages/DashboardPage.tsx';
import { TablesPage } from './pages/TablesPage.tsx';
import { LiveGamesPage } from './pages/LiveGamesPage.tsx';
import { GameHistoryPage } from './pages/GameHistoryPage.tsx';
import { VideoFeedsPage } from './pages/VideoFeedsPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { MobileScoringPage } from './pages/MobileScoringPage.tsx';
import { TVDisplayPage } from './pages/TVDisplayPage.tsx';
import { StreamOverlayPage } from './pages/StreamOverlayPage.tsx';

const AppContent: React.FC = () => {
  const { path } = useRouter();

  // Special Standalone Fullscreen Routes (No venue management shell)
  if (path === '/display' || path === '/tv') {
    return <TVDisplayPage />;
  }

  if (path.startsWith('/tv/') || path.startsWith('/display/')) {
    const parts = path.split('/');
    const parsedId = parseInt(parts[2], 10);
    return (
      <TVDisplayPage
        initialFocusMode="single"
        initialTableId={isNaN(parsedId) ? 1 : parsedId}
        lockedTable={true}
      />
    );
  }

  if (path.startsWith('/stream')) {
    const parts = path.split('/');
    const parsedId = parts[2] ? parseInt(parts[2], 10) : 1;
    return <StreamOverlayPage initialTableId={isNaN(parsedId) ? 1 : parsedId} />;
  }

  if (path.startsWith('/table/')) {
    const tableIdStr = path.replace('/table/', '').split('/')[0];
    const tableId = parseInt(tableIdStr, 10);
    return <MobileScoringPage tableId={isNaN(tableId) ? 1 : tableId} />;
  }

  // Standard Management Shell (Sidebar + TopNav + Content + MobileNav)
  const renderCurrentPage = () => {
    switch (path) {
      case '/':
        return <DashboardPage />;
      case '/tables':
        return <TablesPage />;
      case '/live':
      case '/games':
        return <LiveGamesPage />;
      case '/history':
        return <GameHistoryPage />;
      case '/videos':
      case '/video-feed':
      case '/players':
        return <VideoFeedsPage />;
      case '/settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F3] dark:bg-[#0B0D0C] text-[#111413] dark:text-[#F5F7F6] flex flex-col md:flex-row transition-colors">
      {/* Desktop Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <TopNav />
        <main className="flex-1 overflow-y-auto">
          {renderCurrentPage()}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <RouterProvider>
          <AppContent />
        </RouterProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
