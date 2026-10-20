import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  QrCode,
  ArrowLeft,
  RotateCw,
  Trophy,
  Clock,
  CircleDot,
  Radio,
  Timer,
  Smartphone,
  Sparkles,
  Sun,
  Moon,
  Share2,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { useStore } from '../hooks/useStore.ts';
import { useRouter } from '../context/RouterContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { Game } from '../types.ts';
import { CsnLiveLogo } from '../components/CsnLiveLogo.tsx';

// QR Code Badge Component for Table Units
const TableQRBadge: React.FC<{ tableId: number; size?: number; label?: string }> = ({
  tableId,
  size = 100,
  label = 'Scan to Score',
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/table/${tableId}`;
    QRCode.toDataURL(url, {
      width: size * 2,
      margin: 1,
      color: { dark: '#0B0D0C', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    })
      .then(setDataUrl)
      .catch(() => {});
  }, [tableId, size]);

  if (!dataUrl) {
    return (
      <div
        className="rounded-2xl bg-[#1D2321] border border-[#26302B] animate-pulse flex items-center justify-center mx-auto"
        style={{ width: size, height: size }}
      >
        <QrCode className="w-8 h-8 text-[#616B66]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5 mx-auto">
      <div className="p-2 bg-white rounded-2xl shadow-xl border-2 border-[#1F9D63]/30 inline-block transition-transform hover:scale-105">
        <img
          src={dataUrl}
          alt={`Table 0${tableId} QR Code`}
          style={{ width: size, height: size }}
          className="rounded-xl block"
        />
      </div>
      {label && (
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#1F9D63] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1F9D63] animate-pulse" />
          {label}
        </span>
      )}
    </div>
  );
};

// Smooth Score Indicator with Visual Pop Feedback
const AnimatedScore: React.FC<{ score: number; isLeading: boolean; sizeClass?: string }> = ({
  score,
  isLeading,
  sizeClass = 'text-3xl sm:text-4xl',
}) => {
  const [highlight, setHighlight] = useState(false);
  const prevScore = useRef(score);

  useEffect(() => {
    if (prevScore.current !== score) {
      prevScore.current = score;
      setHighlight(true);
      const timer = setTimeout(() => setHighlight(false), 700);
      return () => clearTimeout(timer);
    }
  }, [score]);

  return (
    <span
      className={`font-display font-black tracking-tight font-mono-digits transition-all duration-300 inline-block ${sizeClass} ${
        isLeading ? 'text-[#197A4C] dark:text-[#1F9D63]' : 'text-[#111413] dark:text-[#F5F7F6]'
      } ${
        highlight
          ? 'scale-125 text-[#B8892F] dark:text-[#D6A84F] drop-shadow-[0_0_16px_rgba(214,168,79,0.7)]'
          : 'scale-100'
      }`}
    >
      {score}
    </span>
  );
};

export interface TVDisplayPageProps {
  initialFocusMode?: 'grid' | 'single';
  initialTableId?: number;
  lockedTable?: boolean;
}

export const TVDisplayPage: React.FC<TVDisplayPageProps> = ({
  initialFocusMode = 'grid',
  initialTableId = 1,
  lockedTable = false,
}) => {
  const { tables, activeGames, settings, updateSettings, switchActivePlayer, resetPlayerTimer, setTableTheme } = useStore();
  const { navigate } = useRouter();
  const { showToast } = useToast();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [focusMode, setFocusMode] = useState<'grid' | 'single'>(initialFocusMode);
  const [selectedTableId, setSelectedTableId] = useState<number>(initialTableId);
  const [autoCycle, setAutoCycle] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Independent Main TV theme (stored in cuecontrol_main_tv_theme)
  const [mainTvTheme, setMainTvTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('cuecontrol_main_tv_theme');
      if (stored === 'light' || stored === 'dark') return stored;
    }
    return 'dark';
  });

  const toggleMainTvTheme = () => {
    const next = mainTvTheme === 'dark' ? 'light' : 'dark';
    setMainTvTheme(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cuecontrol_main_tv_theme', next);
    }
  };

  const currentTable = tables.find((t) => t.id === selectedTableId) || tables[0];
  const tableTheme = currentTable.theme || 'dark';

  // If locked to a specific table (e.g. /tv/:id), TV display synchronizes with that table's theme!
  // If main arena live broadcast with all tables (/display), uses independent mainTvTheme!
  const effectiveTheme = lockedTable ? tableTheme : mainTvTheme;

  const copyToClipboard = (url: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedUrl(key);
        setTimeout(() => setCopiedUrl(null), 2500);
      }).catch(() => {});
    }
  };

  // Synchronize document root theme with this TV page's effective theme
  useEffect(() => {
    const root = document.documentElement;
    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.style.colorScheme = 'light';
    }

    return () => {
      // When unmounting (e.g. exiting Arena TV back to venue management), restore admin theme
      const stored = (typeof localStorage !== 'undefined' ? localStorage.getItem('cuecontrol_theme') : null) || 'dark';
      if (stored === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
        root.style.colorScheme = 'light';
      }
    };
  }, [effectiveTheme]);

  // Wall Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-Cycle tables in single focus mode
  useEffect(() => {
    if (!autoCycle || focusMode !== 'single') return;
    const interval = setInterval(() => {
      setSelectedTableId((prev) => (prev >= 6 ? 1 : prev + 1));
    }, 10000);
    return () => clearInterval(interval);
  }, [autoCycle, focusMode]);

  // Helper to compute Table Countdown Timer
  const getTableTimerData = (game: Game) => {
    const now = game.status === 'paused' && game.pausedAt ? game.pausedAt : currentTime.getTime();
    const totalPaused = game.totalPausedTime || 0;
    const elapsedMs = Math.max(0, now - game.startTime - totalPaused);

    const setMinutes = game.tableTimerMinutes && game.tableTimerMinutes > 0 ? game.tableTimerMinutes : 45;
    const totalAllocatedMs = setMinutes * 60 * 1000;
    const remainingMs = Math.max(0, totalAllocatedMs - elapsedMs);
    const totalSecs = Math.floor(remainingMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const isExpired = remainingMs <= 0;
    const isWarning = totalSecs > 0 && totalSecs <= 300;
    return {
      formatted: `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`,
      isExpired,
      isWarning,
      isCountDown: true,
      label: 'TABLE TIMER',
    };
  };

  // Helper to compute Player Shot Clock Timer
  const getPlayerTimerData = (game: Game) => {
    const activeIndex = game.activePlayerIndex ?? 0;
    const activeName = activeIndex === 0 ? game.player1 : game.player2;

    const shotLimitSecs = game.playerTimerSeconds && game.playerTimerSeconds > 0 ? game.playerTimerSeconds : 35;
    const turnStart = game.turnStartTime || game.startTime;
    const now = game.status === 'paused' && game.pausedAt ? game.pausedAt : currentTime.getTime();
    const elapsedTurnSecs = Math.floor(Math.max(0, now - turnStart) / 1000);
    const remainingSecs = Math.max(0, shotLimitSecs - elapsedTurnSecs);
    const isExpired = game.status === 'playing' && remainingSecs <= 0;
    const isWarning = game.status === 'playing' && remainingSecs > 0 && remainingSecs <= 10;
    return {
      remainingSecs,
      isExpired,
      isWarning,
      enabled: true,
      activeIndex,
      activeName,
      formatted: `${remainingSecs}s`,
    };
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const activeCount = Object.keys(activeGames).length;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className={`min-h-screen ${effectiveTheme === 'dark' ? 'dark bg-[#0B0D0C] text-[#F5F7F6]' : 'bg-[#F4F5F3] text-[#111413]'} flex flex-col justify-between selection:bg-[#1F9D63]/30 p-3 sm:p-4 lg:p-6 font-sans overflow-hidden transition-colors`}>
      {/* Top Header Bar for TV */}
      <header className="grid grid-cols-2 md:grid-cols-3 items-center border-b border-[#E1E3DF] dark:border-[#26302B] pb-3 mb-2 sm:mb-3 gap-4">
        {/* Left: Broadcast Status */}
        <div className="flex items-center gap-3.5 justify-start">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-white dark:bg-[#151918] border border-[#E1E3DF] dark:border-[#26302B] text-[#5A635E] dark:text-[#9BA3A0] hover:text-[#111413] dark:hover:text-[#F5F7F6] transition-colors cursor-pointer shrink-0"
            title="Exit Arena TV"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <CsnLiveLogo size="sm" />
            <div className="hidden sm:block border-l border-[#E1E3DF] dark:border-[#26302B] pl-2.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FF002B] animate-pulse" />
                <span className="font-display font-black text-sm tracking-wider text-[#111413] dark:text-[#F5F7F6] uppercase">
                  {lockedTable ? `Table 0${selectedTableId} Scoreboard` : 'Arena Broadcast'}
                </span>
              </div>
              <p className="text-[10px] text-[#5A635E] dark:text-[#8E9B95] font-mono whitespace-nowrap">
                {lockedTable ? `Dedicated Feed • Table 0${selectedTableId}` : `${activeCount} Active ${activeCount === 1 ? 'Match' : 'Matches'} • 6 Tables`}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Large Venue Clock */}
        <div className="hidden md:flex flex-col items-center justify-center">
          <span className="font-display font-extrabold text-2xl lg:text-3xl tracking-widest text-[#111413] dark:text-[#F5F7F6] font-mono-digits">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className="text-[11px] text-[#5A635E] dark:text-[#8E9B95] uppercase tracking-widest font-mono">
            {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>

        {/* Right: TV Controls */}
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {/* Mode switch - only if not locked to single table */}
          {!lockedTable && (
            <div className="flex items-center p-1 bg-white dark:bg-[#151918] rounded-xl border border-[#E1E3DF] dark:border-[#26302B]">
              <button
                onClick={() => setFocusMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-display uppercase tracking-wider transition-colors cursor-pointer ${
                  focusMode === 'grid'
                    ? 'bg-[#197A4C] dark:bg-[#1F9D63] text-white shadow-sm'
                    : 'text-[#5A635E] dark:text-[#8E9B95] hover:text-[#111413] dark:hover:text-[#F5F7F6]'
                }`}
              >
                All Tables
              </button>
              <button
                onClick={() => setFocusMode('single')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-display uppercase tracking-wider transition-colors cursor-pointer ${
                  focusMode === 'single'
                    ? 'bg-[#197A4C] dark:bg-[#1F9D63] text-white shadow-sm'
                    : 'text-[#5A635E] dark:text-[#8E9B95] hover:text-[#111413] dark:hover:text-[#F5F7F6]'
                }`}
              >
                Single Arena
              </button>
            </div>
          )}

          {focusMode === 'single' && !lockedTable && (
            <button
              onClick={() => setAutoCycle(!autoCycle)}
              className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                autoCycle
                  ? 'bg-[#197A4C]/10 dark:bg-[#1F9D63]/20 text-[#197A4C] dark:text-[#1F9D63] border-[#197A4C]/30 dark:border-[#1F9D63]/40'
                  : 'bg-white dark:bg-[#151918] text-[#5A635E] dark:text-[#8E9B95] border-[#E1E3DF] dark:border-[#26302B]'
              }`}
              title="Toggle Auto-Cycle (10s)"
            >
              <RotateCw className={`w-4 h-4 ${autoCycle ? 'animate-spin' : ''}`} />
            </button>
          )}

          {/* Independent Theme Toggle Button */}
          <button
            id="btn-tv-theme-toggle"
            onClick={() => {
              if (lockedTable) {
                setTableTheme(selectedTableId, effectiveTheme === 'dark' ? 'light' : 'dark');
              } else {
                toggleMainTvTheme();
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-colors cursor-pointer ${
              effectiveTheme === 'light'
                ? 'bg-white border-[#E1E3DF] text-[#B8892F] hover:bg-[#F0F2EE]'
                : 'bg-[#151918] border-[#26302B] text-[#1F9D63] hover:bg-[#1D2321]'
            }`}
            title={
              lockedTable
                ? `Table 0${selectedTableId} Theme: ${effectiveTheme === 'dark' ? 'Dark' : 'Light'}. Click to switch`
                : `Arena Live Broadcast Theme: ${effectiveTheme === 'dark' ? 'Dark' : 'Light'}. Click to switch`
            }
          >
            {effectiveTheme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider hidden sm:inline">
              {effectiveTheme === 'dark' ? 'Dark' : 'Light'}
            </span>
          </button>

          {/* Stream & Broadcast URLs Share Dialog */}
          <button
            id="btn-tv-share-urls"
            onClick={() => setShowShareModal(true)}
            className="p-2.5 rounded-xl bg-white dark:bg-[#151918] border border-[#E1E3DF] dark:border-[#26302B] text-[#5A635E] dark:text-[#9BA3A0] hover:text-[#111413] dark:hover:text-[#F5F7F6] transition-colors cursor-pointer"
            title="Broadcast & Stream URLs"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => updateSettings({ soundEffects: !settings.soundEffects })}
            className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
              settings.soundEffects
                ? 'bg-white dark:bg-[#151918] text-[#197A4C] dark:text-[#1F9D63] border-[#E1E3DF] dark:border-[#26302B]'
                : 'bg-white dark:bg-[#151918] text-[#8E9B95] dark:text-[#616B66] border-[#E1E3DF] dark:border-[#26302B]'
            }`}
            title="Toggle Arena Sound FX"
          >
            {settings.soundEffects ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-white dark:bg-[#151918] border border-[#E1E3DF] dark:border-[#26302B] text-[#5A635E] dark:text-[#9BA3A0] hover:text-[#111413] dark:hover:text-[#F5F7F6] transition-colors cursor-pointer"
            title="Toggle TV Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Board Arena */}
      <main className="flex-1 flex flex-col justify-center w-full min-h-0 my-auto">
        {focusMode === 'grid' ? (
          /* 6-Table Arena Grid (2x3 or 3x2) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 flex-1">
            {tables.map((table) => {
              const game = table.currentGameId ? activeGames[table.currentGameId] : undefined;

              return (
                <div
                  key={table.id}
                  onClick={() => {
                    setSelectedTableId(table.id);
                    setFocusMode('single');
                  }}
                  className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between cursor-pointer transition-all hover:border-[#197A4C]/50 dark:hover:border-[#1F9D63]/50 relative overflow-hidden ${
                    table.status === 'playing'
                      ? 'bg-white dark:bg-[#151918] border-[#197A4C]/50 dark:border-[#1F9D63]/50 shadow-xl shadow-[#1F9D63]/5'
                      : table.status === 'paused'
                      ? 'bg-white dark:bg-[#151918] border-[#B8892F]/40 dark:border-[#D6A84F]/40'
                      : table.status === 'maintenance'
                      ? 'bg-white/60 dark:bg-[#151918]/60 border-rose-500/30 opacity-70'
                      : 'bg-white dark:bg-[#151918] border-[#E1E3DF] dark:border-[#26302B]'
                  }`}
                >
                  {/* Top: Table Identifier and Status */}
                  <div className="flex items-center justify-between border-b border-[#E1E3DF] dark:border-[#26302B] pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-[#197A4C] dark:bg-[#1F9D63] text-white flex items-center justify-center font-display font-black text-sm shadow-md">
                        0{table.id}
                      </span>
                      <div>
                        <h3 className="font-display font-bold text-base text-[#111413] dark:text-[#F5F7F6] tracking-tight">
                          UNIT TABLE 0{table.id}
                        </h3>
                        <p className="text-[11px] text-[#5A635E] dark:text-[#8E9B95] font-mono">
                          {game ? game.gameType : 'Tournament Felt • Ready'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {table.activeRemoteDeviceId && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/30 uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Remote Live
                        </span>
                      )}
                      {table.status === 'playing' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#197A4C]/10 dark:bg-[#1F9D63]/20 text-[#197A4C] dark:text-[#1F9D63] text-xs font-mono font-bold border border-[#197A4C]/25 dark:border-[#1F9D63]/40 uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#197A4C] dark:bg-[#1F9D63] animate-pulse" />
                          MATCH LIVE
                        </span>
                      ) : table.status === 'paused' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#B8892F]/10 dark:bg-[#D6A84F]/20 text-[#B8892F] dark:text-[#D6A84F] text-xs font-mono font-bold border border-[#B8892F]/25 dark:border-[#D6A84F]/30 uppercase tracking-wider">
                          PAUSED
                        </span>
                      ) : table.status === 'maintenance' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-mono font-bold border border-rose-500/30 uppercase tracking-wider">
                          SERVICE
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#F4F5F3] dark:bg-[#1D2321] text-[#197A4C] dark:text-[#1F9D63] text-xs font-mono font-bold border border-[#E1E3DF] dark:border-[#1F9D63]/30 uppercase tracking-wider">
                          OPEN TO PLAY
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Content */}
                  {game ? (
                    (() => {
                      const tTimer = getTableTimerData(game);
                      const pTimer = getPlayerTimerData(game);

                      return (
                        <div className="py-3 sm:py-4">
                          <div className="grid grid-cols-7 items-center gap-1">
                            {/* Player 1 */}
                            <div className="col-span-2 text-left truncate">
                              <p className="font-display font-bold text-sm sm:text-base text-[#111413] dark:text-[#F5F7F6] truncate flex items-center gap-1.5">
                                {(game.activePlayerIndex ?? 0) === 0 && (
                                  <span className="w-2 h-2 rounded-full bg-[#197A4C] dark:bg-[#1F9D63] shrink-0 animate-pulse" />
                                )}
                                {game.player1}
                              </p>
                              <span className="text-[11px] text-[#5A635E] dark:text-[#8E9B95] font-mono">
                                {game.fouls1 > 0 ? (
                                  <span className="text-rose-500 dark:text-rose-400 font-bold">{game.fouls1} fouls</span>
                                ) : (
                                  'Player 1'
                                )}
                              </span>
                            </div>

                            {/* Score 1 */}
                            <div className="col-span-1 text-center">
                              <AnimatedScore
                                score={game.score1}
                                isLeading={game.score1 > game.score2}
                                sizeClass="text-3xl sm:text-4xl"
                              />
                            </div>

                            {/* Center: Table Countdown Timer & Player Shot Clock Below It */}
                            <div className="col-span-1 flex flex-col items-center justify-center px-1.5 py-1 rounded-xl bg-[#F4F5F3] dark:bg-[#111413] border border-[#E1E3DF] dark:border-[#26302B]">
                              <span
                                className={`text-[11px] sm:text-xs font-mono font-black tracking-wider leading-none ${
                                  tTimer.isExpired
                                    ? 'text-rose-500 dark:text-rose-400 animate-pulse'
                                    : tTimer.isWarning
                                    ? 'text-[#B8892F] dark:text-[#D6A84F]'
                                    : 'text-[#111413] dark:text-[#F5F7F6]'
                                }`}
                              >
                                {tTimer.formatted}
                              </span>

                              {pTimer.enabled && (
                                <span
                                  className={`text-[9px] font-mono font-black px-1 py-0.5 rounded mt-1 leading-none ${
                                    pTimer.isExpired
                                      ? 'bg-rose-500/25 text-rose-500 dark:text-rose-400 border border-rose-500/40 animate-pulse'
                                      : pTimer.isWarning
                                      ? 'bg-[#B8892F]/25 text-[#B8892F] dark:text-[#D6A84F] border border-[#B8892F]/40 animate-pulse'
                                      : 'bg-white dark:bg-[#1D2321] text-[#197A4C] dark:text-[#1F9D63] border border-[#E1E3DF] dark:border-[#26302B]'
                                  }`}
                                >
                                  {pTimer.formatted} • P{(game.activePlayerIndex ?? 0) + 1}
                                </span>
                              )}
                            </div>

                            {/* Score 2 */}
                            <div className="col-span-1 text-center">
                              <AnimatedScore
                                score={game.score2}
                                isLeading={game.score2 > game.score1}
                                sizeClass="text-3xl sm:text-4xl"
                              />
                            </div>

                            {/* Player 2 */}
                            <div className="col-span-2 text-right truncate">
                              <p className="font-display font-bold text-sm sm:text-base text-[#111413] dark:text-[#F5F7F6] truncate flex items-center justify-end gap-1.5">
                                {game.player2}
                                {(game.activePlayerIndex ?? 0) === 1 && (
                                  <span className="w-2 h-2 rounded-full bg-[#197A4C] dark:bg-[#1F9D63] shrink-0 animate-pulse" />
                                )}
                              </p>
                              <span className="text-[11px] text-[#5A635E] dark:text-[#8E9B95] font-mono">
                                {game.fouls2 > 0 ? (
                                  <span className="text-rose-500 dark:text-rose-400 font-bold">{game.fouls2} fouls</span>
                                ) : (
                                  'Player 2'
                                )}
                              </span>
                            </div>
                          </div>

                          {game.targetScore && (
                            <div className="text-center mt-2">
                              <span className="text-[11px] font-mono font-bold text-[#B8892F] dark:text-[#D6A84F] bg-[#B8892F]/10 dark:bg-[#D6A84F]/10 px-2.5 py-0.5 rounded-full border border-[#B8892F]/30 dark:border-[#D6A84F]/30 uppercase tracking-wider">
                                Race to {game.targetScore}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    /* Available State: Render Table QR Code prominently */
                    <div className="py-3 flex flex-col items-center justify-center text-center my-auto">
                      <TableQRBadge tableId={table.id} size={96} label={`Scan for Table 0${table.id}`} />
                      <p className="text-xs text-[#5A635E] dark:text-[#9BA3A0] mt-1.5 font-mono">
                        Scan with smartphone camera to launch match
                      </p>
                    </div>
                  )}

                  {/* Bottom: Table Unit Identifier & Click to Focus */}
                  <div className="border-t border-[#E1E3DF] dark:border-[#26302B] pt-2.5 flex items-center justify-between text-xs text-[#5A635E] dark:text-[#8E9B95]">
                    <span className="font-mono text-[11px] flex items-center gap-1 text-[#111413] dark:text-[#F5F7F6]">
                      <Radio className="w-3.5 h-3.5 text-[#197A4C] dark:text-[#1F9D63]" />
                      UNIT 0{table.id}
                    </span>
                    <span className="text-[#197A4C] dark:text-[#1F9D63] font-semibold text-[11px] font-display uppercase tracking-wider">
                      Click To Enlarge
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Single Table Focus Mode (High Impact Arena Stage) */
          (() => {
            const currentTable = tables.find((t) => t.id === selectedTableId) || tables[0];
            const game = currentTable.currentGameId ? activeGames[currentTable.currentGameId] : undefined;

            return (
              <div className="w-full flex-1 flex flex-col justify-between space-y-2 sm:space-y-3 lg:space-y-4 animate-in fade-in min-h-0">
                {/* Table Navigator */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    {[1, 2, 3, 4, 5, 6].map((id) => (
                      <button
                        key={id}
                        onClick={() => setSelectedTableId(id)}
                        className={`px-3.5 sm:px-4 lg:px-6 py-1.5 sm:py-2 rounded-xl font-display font-bold text-xs sm:text-sm lg:text-base uppercase tracking-wider transition-all cursor-pointer ${
                          selectedTableId === id
                            ? 'bg-[#197A4C] dark:bg-[#1F9D63] text-white shadow-lg shadow-[#1F9D63]/25'
                            : 'bg-white dark:bg-[#151918] text-[#5A635E] dark:text-[#8E9B95] border border-[#E1E3DF] dark:border-[#26302B] hover:text-[#111413] dark:hover:text-[#F5F7F6]'
                        }`}
                      >
                        Unit 0{id}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-xs sm:text-sm lg:text-base text-[#5A635E] dark:text-[#8E9B95] font-mono">
                    <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-[#197A4C] dark:text-[#1F9D63] animate-pulse" />
                    <span>Arena Focus View</span>
                  </div>
                </div>

                {/* Big Arena Feature Scoreboard */}
                <div className="flex-1 flex flex-col justify-between rounded-3xl border-2 border-[#197A4C]/40 dark:border-[#1F9D63]/40 bg-white dark:bg-[#151918] p-4 sm:p-6 lg:p-8 xl:p-10 shadow-2xl shadow-[#1F9D63]/10 text-center relative overflow-hidden min-h-0">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#197A4C] dark:via-[#1F9D63] to-transparent" />

                  {/* Big Table Badge */}
                  <div className="inline-flex items-center gap-2 px-4 sm:px-6 lg:px-8 py-1.5 sm:py-2 rounded-full bg-[#197A4C]/10 dark:bg-[#1F9D63]/15 border border-[#197A4C]/25 dark:border-[#1F9D63]/30 text-[#197A4C] dark:text-[#1F9D63] text-xs sm:text-sm lg:text-base font-black font-display uppercase tracking-wider mx-auto mb-2 sm:mb-4">
                    <span>ARENA TOURNAMENT UNIT 0{currentTable.id}</span>
                  </div>

                  {game ? (
                    (() => {
                      const arenaTableTimer = getTableTimerData(game);
                      const arenaPlayerTimer = getPlayerTimerData(game);

                      return (
                        <div className="flex-1 flex flex-col justify-between space-y-3 sm:space-y-4 lg:space-y-6 my-auto">
                          {/* Contestant Score Battle */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-3 sm:gap-4 lg:gap-6 xl:gap-8 my-auto flex-1">
                            {/* Player 1 */}
                            <div
                              className={`col-span-1 sm:col-span-3 text-center sm:text-right p-3 sm:p-5 lg:p-7 rounded-2xl sm:rounded-3xl transition-all ${
                                (game.activePlayerIndex ?? 0) === 0
                                  ? 'bg-[#197A4C]/10 dark:bg-[#1F9D63]/10 border border-[#197A4C]/30 dark:border-[#1F9D63]/40'
                                  : 'border border-transparent'
                              }`}
                            >
                              <div className="flex items-center justify-center sm:justify-end gap-2 mb-1 lg:mb-2">
                                {(game.activePlayerIndex ?? 0) === 0 && (
                                  <span className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-[#197A4C] dark:bg-[#1F9D63] animate-pulse" />
                                )}
                                <span className="text-xs sm:text-sm lg:text-base font-mono uppercase font-bold text-[#5A635E] dark:text-[#8E9B95]">
                                  Player 1 {(game.activePlayerIndex ?? 0) === 0 ? '• SHOOTING' : ''}
                                </span>
                              </div>
                              <h2 className="font-display font-black text-2xl sm:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl text-[#111413] dark:text-[#F5F7F6] tracking-tight truncate">
                                {game.player1}
                              </h2>
                              <div className="text-xs sm:text-sm lg:text-base xl:text-lg text-[#5A635E] dark:text-[#8E9B95] mt-1 lg:mt-2 font-mono">
                                {game.fouls1 > 0 ? (
                                  <span className="text-rose-500 dark:text-rose-400 font-bold">{game.fouls1} Fouls</span>
                                ) : (
                                  'Clean Run'
                                )}
                              </div>
                            </div>

                            {/* Player 1 Score */}
                            <div className="col-span-1 sm:col-span-2 text-center">
                              <AnimatedScore
                                score={game.score1}
                                isLeading={game.score1 > game.score2}
                                sizeClass="text-7xl sm:text-9xl lg:text-[10rem] xl:text-[12rem] 2xl:text-[14rem] leading-none"
                              />
                            </div>

                            {/* Middle: Table Timer & Player Shot Clock Below It */}
                            <div className="col-span-1 sm:col-span-2 flex flex-col items-center justify-center px-3 sm:px-4 lg:px-6 py-3 sm:py-5 lg:py-7 rounded-2xl sm:rounded-3xl bg-[#F4F5F3] dark:bg-[#111413] border-2 border-[#E1E3DF] dark:border-[#26302B] shadow-2xl my-auto">
                              {/* Table Timer */}
                              <div className="flex flex-col items-center w-full">
                                <span className="text-[10px] sm:text-xs lg:text-sm font-mono uppercase tracking-widest text-[#5A635E] dark:text-[#8E9B95] flex items-center gap-1.5 font-bold">
                                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#197A4C] dark:text-[#1F9D63]" />
                                  {arenaTableTimer.label}
                                </span>
                                <span
                                  className={`font-display font-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl tracking-tight font-mono-digits mt-1 lg:mt-2 leading-none ${
                                    arenaTableTimer.isExpired
                                      ? 'text-rose-500 dark:text-rose-400 animate-pulse'
                                      : arenaTableTimer.isWarning
                                      ? 'text-[#B8892F] dark:text-[#D6A84F]'
                                      : 'text-[#111413] dark:text-[#F5F7F6]'
                                  }`}
                                >
                                  {arenaTableTimer.formatted}
                                </span>
                                <span className="text-[9px] sm:text-xs font-mono text-[#8E9B95] dark:text-[#616B66] uppercase mt-1">
                                  {game.tableTimerMinutes && game.tableTimerMinutes > 0
                                    ? `${game.tableTimerMinutes}m Limit`
                                    : 'Elapsed Time'}
                                </span>
                              </div>

                              <div className="w-full h-px bg-[#E1E3DF] dark:bg-[#26302B] my-2 sm:my-3 lg:my-4" />

                              {/* Player Timer Below It */}
                              <div className="flex flex-col items-center w-full">
                                <div className="flex items-center gap-1 text-[10px] sm:text-xs lg:text-sm font-mono uppercase tracking-wider text-[#5A635E] dark:text-[#8E9B95] font-bold">
                                  <Timer className="w-3.5 h-3.5 text-[#B8892F] dark:text-[#D6A84F]" />
                                  <span>Shot Clock</span>
                                </div>

                                {arenaPlayerTimer.enabled ? (
                                  <div className="flex flex-col items-center mt-1.5 lg:mt-2 w-full">
                                    <div
                                      className={`px-4 sm:px-6 py-1 sm:py-2 rounded-xl sm:rounded-2xl border flex items-center justify-center gap-2 transition-all ${
                                        arenaPlayerTimer.isExpired
                                          ? 'bg-rose-500/20 text-rose-500 dark:text-rose-400 border-rose-500/50 animate-pulse'
                                          : arenaPlayerTimer.isWarning
                                          ? 'bg-[#B8892F]/20 text-[#B8892F] dark:text-[#D6A84F] border-[#B8892F]/50 animate-pulse'
                                          : 'bg-white dark:bg-[#181D1B] text-[#111413] dark:text-[#F5F7F6] border-[#E1E3DF] dark:border-[#26302B]'
                                      }`}
                                    >
                                      <span className="font-display font-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-mono-digits leading-none">
                                        {arenaPlayerTimer.formatted}
                                      </span>
                                    </div>

                                    {/* Active Shooter Switch & Reset Button */}
                                    <div className="flex items-center justify-center gap-1.5 mt-2 lg:mt-3 w-full">
                                      <button
                                        onClick={() => switchActivePlayer(currentTable.id)}
                                        className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs lg:text-sm font-mono font-bold uppercase tracking-wider bg-[#197A4C]/10 dark:bg-[#1F9D63]/15 text-[#197A4C] dark:text-[#1F9D63] border border-[#197A4C]/25 dark:border-[#1F9D63]/30 hover:bg-[#197A4C]/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                                        title="Click to switch active shooter turn"
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#197A4C] dark:bg-[#1F9D63] animate-pulse" />
                                        <span>Turn: {arenaPlayerTimer.activeIndex === 0 ? game.player1 : game.player2}</span>
                                      </button>
                                      <button
                                        onClick={() => resetPlayerTimer(currentTable.id)}
                                        className="p-1 sm:p-1.5 rounded-lg text-[10px] sm:text-xs font-mono bg-white dark:bg-[#181D1B] text-[#5A635E] dark:text-[#8E9B95] border border-[#E1E3DF] dark:border-[#26302B] hover:text-[#111413] dark:hover:text-[#F5F7F6] transition-colors cursor-pointer"
                                        title="Reset Shot Clock"
                                      >
                                        <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-[11px] sm:text-xs font-mono text-[#8E9B95] dark:text-[#616B66] mt-1">
                                    Shot Clock Off
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Player 2 Score */}
                            <div className="col-span-1 sm:col-span-2 text-center">
                              <AnimatedScore
                                score={game.score2}
                                isLeading={game.score2 > game.score1}
                                sizeClass="text-7xl sm:text-9xl lg:text-[10rem] xl:text-[12rem] 2xl:text-[14rem] leading-none"
                              />
                            </div>

                            {/* Player 2 */}
                            <div
                              className={`col-span-1 sm:col-span-3 text-center sm:text-left p-3 sm:p-5 lg:p-7 rounded-2xl sm:rounded-3xl transition-all ${
                                (game.activePlayerIndex ?? 0) === 1
                                  ? 'bg-[#197A4C]/10 dark:bg-[#1F9D63]/10 border border-[#197A4C]/30 dark:border-[#1F9D63]/40'
                                  : 'border border-transparent'
                              }`}
                            >
                              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1 lg:mb-2">
                                {(game.activePlayerIndex ?? 0) === 1 && (
                                  <span className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-[#197A4C] dark:bg-[#1F9D63] animate-pulse" />
                                )}
                                <span className="text-xs sm:text-sm lg:text-base font-mono uppercase font-bold text-[#5A635E] dark:text-[#8E9B95]">
                                  Player 2 {(game.activePlayerIndex ?? 0) === 1 ? '• SHOOTING' : ''}
                                </span>
                              </div>
                              <h2 className="font-display font-black text-2xl sm:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl text-[#111413] dark:text-[#F5F7F6] tracking-tight truncate">
                                {game.player2}
                              </h2>
                              <div className="text-xs sm:text-sm lg:text-base xl:text-lg text-[#5A635E] dark:text-[#8E9B95] mt-1 lg:mt-2 font-mono">
                                {game.fouls2 > 0 ? (
                                  <span className="text-rose-500 dark:text-rose-400 font-bold">{game.fouls2} Fouls</span>
                                ) : (
                                  'Clean Run'
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Game Metadata in Huge Bar */}
                          <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-12 text-sm sm:text-base lg:text-xl text-[#5A635E] dark:text-[#9BA3A0] font-medium pt-3 sm:pt-4 border-t border-[#E1E3DF] dark:border-[#26302B]">
                            <span className="flex items-center gap-2 font-bold text-[#111413] dark:text-[#F5F7F6] font-display">
                              <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-[#B8892F] dark:text-[#D6A84F]" />
                              {game.gameType}
                            </span>
                            {game.targetScore && (
                              <span className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-[#B8892F]/15 dark:bg-[#D6A84F]/15 text-[#B8892F] dark:text-[#D6A84F] font-bold font-mono border border-[#B8892F]/30 dark:border-[#D6A84F]/30 uppercase tracking-wider text-xs sm:text-sm lg:text-base">
                                Race to {game.targetScore}
                              </span>
                            )}
                            <span className="flex items-center gap-2 font-mono text-[#5A635E] dark:text-[#8E9B95]">
                              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#197A4C] dark:text-[#1F9D63]" />
                              Live Real-Time Synced
                            </span>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    /* Large Arena Stage Available State with Prominent QR Code */
                    <div className="py-10 sm:py-14 flex flex-col items-center justify-center text-center space-y-4 my-auto">
                      <TableQRBadge tableId={currentTable.id} size={160} label={`Scan to Control Unit 0${currentTable.id}`} />
                      <h3 className="text-2xl sm:text-3xl font-extrabold font-display text-[#111413] dark:text-[#F5F7F6] tracking-tight uppercase">
                        Unit Table 0{currentTable.id} Ready
                      </h3>
                      <p className="text-sm sm:text-base text-[#5A635E] dark:text-[#8E9B95] max-w-md mx-auto">
                        Players can scan the QR code above with any mobile camera to launch the real-time scoring remote immediately.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()
        )}
      </main>

      {/* TV Footer Bar */}
      <footer className="border-t border-[#E1E3DF] dark:border-[#26302B] pt-2 sm:pt-2.5 mt-2 sm:mt-3 flex items-center justify-between text-xs text-[#5A635E] dark:text-[#8E9B95]">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-[#111413] dark:text-[#F5F7F6] uppercase tracking-wider">
            {lockedTable ? `Table 0${selectedTableId} Live Feed` : 'CueControl Arena Feed'}
          </span>
          <span className="text-[#8E9B95] dark:text-[#616B66]">•</span>
          <span className="text-[#5A635E] dark:text-[#8E9B95]">Independent Table Units & Real-Time Sync</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowShareModal(true)}
            className="font-mono text-[11px] text-[#197A4C] dark:text-[#1F9D63] hover:underline flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Copy Stream / TV URLs</span>
          </button>
        </div>
      </footer>

      {/* Independent URLs Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-2xl w-full bg-white dark:bg-[#151918] border border-[#E1E3DF] dark:border-[#26302B] rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-[#E1E3DF] dark:border-[#26302B]">
              <div>
                <h3 className="font-display font-black text-lg sm:text-xl text-[#111413] dark:text-[#F5F7F6] uppercase tracking-tight">
                  Independent Broadcast & Stream URLs
                </h3>
                <p className="text-xs text-[#5A635E] dark:text-[#8E9B95] mt-1">
                  Each table has its own unique URL to stream or display independently on TV screens and OBS overlays.
                </p>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded-xl text-[#5A635E] dark:text-[#8E9B95] hover:text-[#111413] dark:hover:text-[#F5F7F6] hover:bg-[#EBECE8] dark:hover:bg-[#1D2321] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Main Arena TV URL */}
            <div className="p-3.5 rounded-2xl bg-[#F4F5F3] dark:bg-[#1D2321] border border-[#E1E3DF] dark:border-[#26302B] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold font-display uppercase tracking-wider text-[#111413] dark:text-[#F5F7F6] block">
                    Main Arena Live TV (All Tables)
                  </span>
                  <span className="text-[11px] text-[#5A635E] dark:text-[#8E9B95]">
                    Full venue TV broadcast showing all 6 tables with auto-cycle & independent arena theme.
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(`${origin}/display`, 'main-tv')}
                  className="px-3 py-1.5 rounded-xl bg-[#197A4C] dark:bg-[#1F9D63] hover:bg-[#14643E] dark:hover:bg-[#26B372] text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                >
                  {copiedUrl === 'main-tv' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl === 'main-tv' ? 'Copied!' : 'Copy URL'}</span>
                </button>
              </div>
              <code className="block p-2 rounded-lg bg-white dark:bg-[#111413] border border-[#E1E3DF] dark:border-[#26302B] font-mono text-xs text-[#197A4C] dark:text-[#1F9D63] truncate select-all">
                {origin}/display
              </code>
            </div>

            {/* Per-Table Independent URLs Grid */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#5A635E] dark:text-[#8E9B95]">
                Per-Table Independent Stream & TV URLs (Table 01 – Table 06)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4, 5, 6].map((num) => {
                  const t = tables.find((item) => item.id === num);
                  const streamUrl = `${origin}/stream/${num}`;
                  const tvUrl = `${origin}/tv/${num}`;
                  const remoteUrl = `${origin}/table/${num}`;

                  return (
                    <div
                      key={num}
                      className="p-3.5 rounded-2xl bg-white dark:bg-[#181D1B] border border-[#E1E3DF] dark:border-[#26302B] space-y-2.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-[#197A4C] dark:bg-[#1F9D63] text-white font-mono font-bold text-xs flex items-center justify-center">
                            0{num}
                          </span>
                          <span className="font-display font-bold text-xs text-[#111413] dark:text-[#F5F7F6]">
                            Table 0{num}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#EBECE8] dark:bg-[#26302B] text-[#5A635E] dark:text-[#9BA3A0]">
                          Theme: {t?.theme || 'dark'}
                        </span>
                      </div>

                      {/* OBS Stream Link */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-mono text-[11px] text-[#5A635E] dark:text-[#8E9B95] flex items-center gap-1">
                          <Radio className="w-3 h-3 text-[#B8892F] dark:text-[#D6A84F]" />
                          OBS Stream
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => copyToClipboard(streamUrl, `stream-${num}`)}
                            className="px-2 py-1 rounded-lg bg-[#F4F5F3] dark:bg-[#1D2321] hover:bg-[#EBECE8] dark:hover:bg-[#26302B] border border-[#E1E3DF] dark:border-[#26302B] text-[10px] font-mono font-bold text-[#111413] dark:text-[#F5F7F6] flex items-center gap-1 cursor-pointer"
                            title="Copy OBS Stream URL"
                          >
                            {copiedUrl === `stream-${num}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedUrl === `stream-${num}` ? 'Copied' : 'Copy'}</span>
                          </button>
                          <a
                            href={`/stream/${num}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded-lg text-[#5A635E] dark:text-[#8E9B95] hover:text-[#111413] dark:hover:text-[#F5F7F6]"
                            title="Open in new tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>

                      {/* Dedicated Table TV Link */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-mono text-[11px] text-[#5A635E] dark:text-[#8E9B95] flex items-center gap-1">
                          <Trophy className="w-3 h-3 text-[#197A4C] dark:text-[#1F9D63]" />
                          Table TV Display
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => copyToClipboard(tvUrl, `tv-${num}`)}
                            className="px-2 py-1 rounded-lg bg-[#F4F5F3] dark:bg-[#1D2321] hover:bg-[#EBECE8] dark:hover:bg-[#26302B] border border-[#E1E3DF] dark:border-[#26302B] text-[10px] font-mono font-bold text-[#111413] dark:text-[#F5F7F6] flex items-center gap-1 cursor-pointer"
                            title="Copy Dedicated Table TV URL"
                          >
                            {copiedUrl === `tv-${num}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedUrl === `tv-${num}` ? 'Copied' : 'Copy'}</span>
                          </button>
                          <a
                            href={`/tv/${num}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded-lg text-[#5A635E] dark:text-[#8E9B95] hover:text-[#111413] dark:hover:text-[#F5F7F6]"
                            title="Open in new tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>

                      {/* Mobile Remote Scorer Link */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-mono text-[11px] text-[#5A635E] dark:text-[#8E9B95] flex items-center gap-1">
                          <Smartphone className="w-3 h-3 text-blue-500" />
                          Remote Scorer
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => copyToClipboard(remoteUrl, `remote-${num}`)}
                            className="px-2 py-1 rounded-lg bg-[#F4F5F3] dark:bg-[#1D2321] hover:bg-[#EBECE8] dark:hover:bg-[#26302B] border border-[#E1E3DF] dark:border-[#26302B] text-[10px] font-mono font-bold text-[#111413] dark:text-[#F5F7F6] flex items-center gap-1 cursor-pointer"
                            title="Copy Mobile Remote URL"
                          >
                            {copiedUrl === `remote-${num}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedUrl === `remote-${num}` ? 'Copied' : 'Copy'}</span>
                          </button>
                          <a
                            href={`/table/${num}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded-lg text-[#5A635E] dark:text-[#8E9B95] hover:text-[#111413] dark:hover:text-[#F5F7F6]"
                            title="Open in new tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
