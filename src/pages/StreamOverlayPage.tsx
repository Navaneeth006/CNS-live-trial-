import React, { useState, useEffect } from 'react';
import {
  Radio,
  Sliders,
  Eye,
  EyeOff,
  Trophy,
  Wifi,
  Sun,
  Moon,
  Copy,
  Check,
  Plus,
  Minus,
  RotateCw,
  Clock,
  Sparkles,
  Layers,
  Zap,
  ExternalLink,
  Shield,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useStore } from '../hooks/useStore.ts';
import { Game } from '../types.ts';
import { CsnLiveLogo } from '../components/CsnLiveLogo.tsx';
import { useToast } from '../context/ToastContext.tsx';

interface StreamOverlayPageProps {
  initialTableId?: number;
}

export const StreamOverlayPage: React.FC<StreamOverlayPageProps> = ({ initialTableId = 1 }) => {
  const {
    tables,
    activeGames,
    settings,
    setTableTheme,
    updateScore,
    switchActivePlayer,
    resetPlayerTimer,
  } = useStore();
  const { showToast } = useToast();

  const [tableId, setTableId] = useState<number>(initialTableId);
  const [layout, setLayout] = useState<'lower-third' | 'top-bar' | 'compact-bug' | 'broadcast-suite'>('lower-third');
  const [backgroundType, setBackgroundType] = useState<'transparent' | 'camera' | 'green' | 'black'>('transparent');
  const [showControls, setShowControls] = useState(true);
  const [showSimControls, setShowSimControls] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const table = tables.find((t) => t.id === tableId) || tables[0];
  const game: Game | undefined = table.currentGameId ? activeGames[table.currentGameId] : undefined;
  const tableTheme = table.theme || 'dark';
  const feed = table.cameraFeed;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const currentStreamUrl = `${origin}/stream/${tableId}`;

  // Real-time timers calculation
  const [tableTimerDisplay, setTableTimerDisplay] = useState<string>('45:00');
  const [shotClockSeconds, setShotClockSeconds] = useState<number>(35);

  useEffect(() => {
    if (!game) return;

    const updateClocks = () => {
      const now = game.status === 'paused' && game.pausedAt ? game.pausedAt : Date.now();
      const totalPaused = game.totalPausedTime || 0;
      const elapsedMs = Math.max(0, now - game.startTime - totalPaused);

      // Match timer countdown
      const setMinutes = game.tableTimerMinutes && game.tableTimerMinutes > 0 ? game.tableTimerMinutes : 45;
      const totalAllocatedMs = setMinutes * 60 * 1000;
      const remainingMs = Math.max(0, totalAllocatedMs - elapsedMs);
      const totalSecs = Math.floor(remainingMs / 1000);
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      setTableTimerDisplay(`${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`);

      // Shot clock countdown
      const setShotSeconds = game.playerTimerSeconds && game.playerTimerSeconds > 0 ? game.playerTimerSeconds : 35;
      const turnStart = game.turnStartTime || game.startTime;
      const elapsedTurnSecs = Math.floor(Math.max(0, now - turnStart) / 1000);
      const remainingTurn = Math.max(0, setShotSeconds - elapsedTurnSecs);
      setShotClockSeconds(remainingTurn);
    };

    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, [game?.startTime, game?.status, game?.turnStartTime, game?.tableTimerMinutes, game?.playerTimerSeconds, game?.totalPausedTime]);

  const copyUrl = (targetUrl: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(targetUrl);
      setCopiedUrl(targetUrl);
      setTimeout(() => setCopiedUrl(null), 2500);
      showToast('OBS Link Copied', `Copied ${label} Browser Source URL`, 'success');
    }
  };

  const getBgClass = () => {
    if (backgroundType === 'green') return 'bg-[#00ff00]';
    if (backgroundType === 'black') return 'bg-[#0B0D0C]';
    if (backgroundType === 'camera') return 'bg-black/40';
    return 'bg-transparent';
  };

  const activePlayer = game ? (game.activePlayerIndex ?? 0) : 0;
  const isShotClockUrgent = shotClockSeconds <= 10 && shotClockSeconds > 0;

  return (
    <div className={`min-h-screen w-full relative flex flex-col justify-between overflow-hidden p-4 sm:p-6 lg:p-8 ${tableTheme === 'dark' ? 'dark' : ''} ${getBgClass()}`}>
      {/* Top Floating OBS Toolbar (Hover to Reveal / Toggle) */}
      <div
        className={`fixed top-4 inset-x-4 max-w-5xl mx-auto z-50 transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 hover:opacity-100 hover:translate-y-0'
        }`}
      >
        <div className="bg-[#151918]/95 backdrop-blur-md border border-[#26302B] rounded-2xl p-3 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-white">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FF002B]/15 text-[#FF002B] border border-[#FF002B]/30 font-bold font-display uppercase tracking-wider">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>OBS Studio Overlay</span>
            </div>
            <span className="text-zinc-500 font-mono hidden sm:inline">•</span>
            <span className="font-mono text-zinc-300 font-bold hidden sm:inline">1080p 60FPS Transparent</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Table select */}
            <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-zinc-800">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  onClick={() => setTableId(num)}
                  className={`px-2 py-1 rounded-lg font-mono font-bold text-xs transition-colors cursor-pointer ${
                    tableId === num
                      ? 'bg-[#FF002B] text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  T0{num}
                </button>
              ))}
            </div>

            {/* Layout Style */}
            <select
              value={layout}
              onChange={(e) => setLayout(e.target.value as any)}
              className="px-2.5 py-1.5 bg-black/60 border border-zinc-800 rounded-xl text-zinc-200 text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="lower-third">Lower-Third Banner</option>
              <option value="top-bar">Top Match Bug</option>
              <option value="compact-bug">Corner Score Bug</option>
              <option value="broadcast-suite">Full Broadcast Suite</option>
            </select>

            {/* Backdrop Type */}
            <select
              value={backgroundType}
              onChange={(e) => setBackgroundType(e.target.value as any)}
              className="px-2.5 py-1.5 bg-black/60 border border-zinc-800 rounded-xl text-zinc-200 text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="transparent">Transparent (OBS Native)</option>
              <option value="camera">Live Camera Underlay</option>
              <option value="green">Green Screen Chroma</option>
              <option value="black">Dark Solid</option>
            </select>

            {/* Live Interactive Score Simulator Toggle */}
            <button
              onClick={() => setShowSimControls(!showSimControls)}
              className={`px-2.5 py-1.5 rounded-xl border transition-colors cursor-pointer font-bold font-display uppercase tracking-wider text-[10px] flex items-center gap-1 ${
                showSimControls
                  ? 'bg-[#FF6600]/20 border-[#FF6600]/40 text-[#FF6600]'
                  : 'bg-black/60 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
              title="Test real-time scoring updates live"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Test Scoring</span>
            </button>

            {/* 1-Click Copy OBS URL */}
            <button
              onClick={() => copyUrl(currentStreamUrl, `Table 0${tableId}`)}
              className="px-3 py-1.5 bg-[#FF002B] hover:bg-[#D60024] active:scale-95 text-white rounded-xl font-display text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              title="Copy OBS Browser Source URL"
            >
              {copiedUrl === currentStreamUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl === currentStreamUrl ? 'Copied' : 'Copy OBS URL'}</span>
            </button>

            <button
              onClick={() => setShowControls(!showControls)}
              className="p-1.5 bg-black/60 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white border border-zinc-800 cursor-pointer"
              title="Hide overlay toolbar"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Real-time Interactive Scoring Test Pad */}
        {showSimControls && (
          <div className="mt-2 bg-[#111413]/95 backdrop-blur-md border border-[#26302B] rounded-2xl p-3 shadow-2xl animate-in slide-in-from-top-2 duration-150 flex flex-wrap items-center justify-between gap-3 text-xs text-white">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-[#FF6600] uppercase text-[11px]">
                Live Test Pad (Table 0{tableId}):
              </span>
              <span className="text-zinc-400">{game ? `${game.player1} vs ${game.player2}` : 'Table Open'}</span>
            </div>

            {game ? (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Player 1 Score Controls */}
                <div className="flex items-center gap-1 bg-black/70 p-1 rounded-lg border border-zinc-800">
                  <span className="px-2 text-zinc-300 font-bold truncate max-w-[80px]">{game.player1}</span>
                  <button
                    onClick={() => updateScore(tableId, 0, -1, 'OBS Test')}
                    className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => updateScore(tableId, 0, 1, 'OBS Test')}
                    className="px-2 py-0.5 bg-[#FF002B] hover:bg-[#D60024] rounded text-white font-bold cursor-pointer"
                  >
                    +1
                  </button>
                </div>

                {/* Player 2 Score Controls */}
                <div className="flex items-center gap-1 bg-black/70 p-1 rounded-lg border border-zinc-800">
                  <span className="px-2 text-zinc-300 font-bold truncate max-w-[80px]">{game.player2}</span>
                  <button
                    onClick={() => updateScore(tableId, 1, -1, 'OBS Test')}
                    className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => updateScore(tableId, 1, 1, 'OBS Test')}
                    className="px-2 py-0.5 bg-[#FF002B] hover:bg-[#D60024] rounded text-white font-bold cursor-pointer"
                  >
                    +1
                  </button>
                </div>

                {/* Switch Shooter Turn */}
                <button
                  onClick={() => switchActivePlayer(tableId)}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-mono text-[10px] text-zinc-300 cursor-pointer"
                >
                  Switch Turn
                </button>

                {/* Reset Shot Clock */}
                <button
                  onClick={() => resetPlayerTimer(tableId)}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-mono text-[10px] text-zinc-300 cursor-pointer"
                >
                  Reset Clock
                </button>
              </div>
            ) : (
              <span className="text-zinc-500 font-mono text-[11px]">Start a match on Table 0{tableId} to test live score changes</span>
            )}
          </div>
        )}
      </div>

      {/* BACKGROUND CAMERA VIDEO LAYER (Optional Preview) */}
      {backgroundType === 'camera' && feed && feed.enabled && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {feed.type === 'embed' ? (
            <iframe
              src={feed.url}
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media; picture-in-picture"
            />
          ) : (
            <video
              src={feed.url === 'demo' ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' : feed.url}
              autoPlay
              playsInline
              muted
              loop
              className="w-full h-full object-cover"
            />
          )}
        </div>
      )}

      {/* BROADCAST OVERLAY GRAPHICS VIEWPORT */}
      <div className="w-full flex-1 flex flex-col justify-end relative z-10 pointer-events-none">
        {/* ========================================================================= */}
        {/* LAYOUT 1: LOWER-THIRD TOURNAMENT BANNER (Matchroom / ESPN / World 9-Ball) */}
        {/* ========================================================================= */}
        {(layout === 'lower-third' || layout === 'broadcast-suite') && (
          <div className="max-w-4xl w-full mx-auto animate-in slide-in-from-bottom duration-300">
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-black/90 backdrop-blur-xl text-white">
              {/* Broadcast Header Ribbon */}
              <div className="px-4 py-1.5 bg-gradient-to-r from-black via-[#151918] to-black border-b border-white/10 flex items-center justify-between text-[11px] font-black font-display tracking-wider uppercase">
                <div className="flex items-center gap-3">
                  <CsnLiveLogo size="sm" variant="dark" />
                  <span className="text-zinc-500">•</span>
                  <span className="text-zinc-200">TABLE 0{table.id}</span>
                  {game?.currentRack && (
                    <>
                      <span className="text-zinc-500">•</span>
                      <span className="text-[#FF6600]">RACK {game.currentRack}</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2.5 font-mono text-[10px]">
                  <span className="text-zinc-300 font-bold">{game?.gameType || '8-BALL'}</span>
                  {game?.targetScore && (
                    <span className="bg-[#FF002B] text-white px-2 py-0.5 rounded font-black tracking-wider">
                      RACE TO {game.targetScore}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                </div>
              </div>

              {/* Main Scoreboard Bar */}
              <div className="grid grid-cols-12 items-center p-3 sm:p-4 divide-x divide-white/10">
                {/* Player 1 Card */}
                <div className={`col-span-5 px-3 flex items-center justify-between transition-all ${
                  game && activePlayer === 0 ? 'ring-1 ring-[#FF002B]/60 bg-[#FF002B]/10 rounded-xl p-2' : ''
                }`}>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                        PLAYER 1
                      </span>
                      {game && activePlayer === 0 && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-black bg-[#FF002B] text-white animate-pulse uppercase">
                          ON SHOT
                        </span>
                      )}
                    </div>
                    <span className="font-display font-black text-xl sm:text-2xl tracking-tight text-white truncate block">
                      {game ? game.player1 : 'Table Open'}
                    </span>
                  </div>
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/20 flex items-center justify-center font-display font-black text-3xl text-white font-mono-digits shrink-0 ml-2 shadow-inner">
                    {game ? game.score1 : 0}
                  </div>
                </div>

                {/* Center Match Clock & Shot Clock */}
                <div className="col-span-2 text-center px-1 space-y-1">
                  {/* Shot Clock */}
                  <div className={`p-1 rounded-lg border font-mono font-black text-sm tracking-wider ${
                    isShotClockUrgent
                      ? 'bg-[#FF002B] text-white border-[#FF002B] animate-bounce'
                      : 'bg-zinc-900 text-[#FF6600] border-zinc-800'
                  }`}>
                    {shotClockSeconds}s
                  </div>
                  {/* Match Time */}
                  <div className="text-[10px] font-mono text-zinc-400 font-bold">
                    {tableTimerDisplay}
                  </div>
                </div>

                {/* Player 2 Card */}
                <div className={`col-span-5 px-3 flex items-center justify-between transition-all ${
                  game && activePlayer === 1 ? 'ring-1 ring-[#FF002B]/60 bg-[#FF002B]/10 rounded-xl p-2' : ''
                }`}>
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/20 flex items-center justify-center font-display font-black text-3xl text-white font-mono-digits shrink-0 mr-2 shadow-inner">
                    {game ? game.score2 : 0}
                  </div>
                  <div className="text-right truncate">
                    <div className="flex items-center justify-end gap-1.5">
                      {game && activePlayer === 1 && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-black bg-[#FF002B] text-white animate-pulse uppercase">
                          ON SHOT
                        </span>
                      )}
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                        PLAYER 2
                      </span>
                    </div>
                    <span className="font-display font-black text-xl sm:text-2xl tracking-tight text-white truncate block">
                      {game ? game.player2 : 'Waiting for Match'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* LAYOUT 2: TOP BUG STRIP (ESPN / Sky Sports Style)                        */}
        {/* ========================================================================= */}
        {layout === 'top-bar' && (
          <div className="fixed top-6 inset-x-6 max-w-5xl mx-auto animate-in slide-in-from-top duration-300 pointer-events-none">
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-black/90 backdrop-blur-xl text-white flex items-center justify-between p-3">
              {/* Player 1 */}
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 bg-[#FF002B] text-white rounded-lg font-black font-display text-xs uppercase tracking-wider">
                  T0{table.id}
                </span>
                <span className="font-display font-bold text-base truncate max-w-xs text-white">
                  {game ? game.player1 : 'Table Open'}
                </span>
                <span className="px-3 py-1 bg-zinc-800 border border-white/15 rounded-lg font-mono font-black text-xl text-white">
                  {game ? game.score1 : 0}
                </span>
              </div>

              {/* Match info & Shot clock */}
              <div className="flex items-center gap-3 font-mono text-xs text-zinc-400">
                <span className="font-bold text-white">{game?.gameType || 'Live Stream'}</span>
                {game?.targetScore && <span className="text-[#FF6600] font-bold">(Race {game.targetScore})</span>}
                <span className={`px-2 py-0.5 rounded font-black ${isShotClockUrgent ? 'bg-red-600 text-white animate-pulse' : 'bg-zinc-800 text-emerald-400'}`}>
                  {shotClockSeconds}s
                </span>
              </div>

              {/* Player 2 */}
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-zinc-800 border border-white/15 rounded-lg font-mono font-black text-xl text-white">
                  {game ? game.score2 : 0}
                </span>
                <span className="font-display font-bold text-base truncate max-w-xs text-white">
                  {game ? game.player2 : 'Waiting for Match'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* LAYOUT 3: COMPACT FLOATING SCORE BUG                                    */}
        {/* ========================================================================= */}
        {layout === 'compact-bug' && (
          <div className="fixed bottom-6 right-6 animate-in fade-in duration-300 pointer-events-none">
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-black/90 backdrop-blur-xl text-white w-80">
              <div className="px-3 py-1.5 bg-[#FF002B] text-[10px] font-bold font-display uppercase tracking-wider text-white flex justify-between items-center">
                <span>TABLE 0{table.id}</span>
                <span className="font-mono">{game?.gameType || 'AVAILABLE'}</span>
              </div>
              <div className="p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {game && activePlayer === 0 && <span className="w-2 h-2 rounded-full bg-[#FF002B] animate-pulse" />}
                    <span className="font-display font-bold text-sm truncate text-white">{game ? game.player1 : 'Table Open'}</span>
                  </div>
                  <span className="font-mono font-black text-xl text-white px-2 py-0.5 bg-zinc-800 rounded">
                    {game ? game.score1 : 0}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-2">
                  <div className="flex items-center gap-1.5">
                    {game && activePlayer === 1 && <span className="w-2 h-2 rounded-full bg-[#FF002B] animate-pulse" />}
                    <span className="font-display font-bold text-sm truncate text-white">{game ? game.player2 : 'Waiting for Match'}</span>
                  </div>
                  <span className="font-mono font-black text-xl text-white px-2 py-0.5 bg-zinc-800 rounded">
                    {game ? game.score2 : 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
