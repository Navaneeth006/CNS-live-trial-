import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  RotateCcw,
  ShieldAlert,
  HelpCircle,
  Pause,
  Play,
  Clock,
  Wifi,
  Trophy,
  History,
  Layers,
  ChevronDown,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  X,
  Volume2,
  VolumeX,
  Timer,
  RotateCw,
  Lock,
  Unlock,
  Smartphone,
  Radio,
  Eye,
  RefreshCw,
  Settings2,
  SlidersHorizontal,
  AlertTriangle,
  XCircle,
  Check,
  Sun,
  Moon,
  Share2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useStore } from '../hooks/useStore.ts';
import { useRouter } from '../context/RouterContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { StartGameModal } from '../components/StartGameModal.tsx';
import { DirectEntryModal } from '../components/DirectEntryModal.tsx';
import { FoulPenaltyModal } from '../components/FoulPenaltyModal.tsx';
import { MatchSetupModal } from '../components/MatchSetupModal.tsx';
import { ScoringMode } from '../types.ts';
import { getDeviceId, getDeviceName } from '../utils/device.ts';

interface BallConfig {
  id: string;
  name: string;
  points: number;
  bgClass: string;
  hoverClass: string;
  textClass: string;
  borderClass: string;
}

const BALLS_ROW_1: BallConfig[] = [
  {
    id: 'red',
    name: 'RED',
    points: 1,
    bgClass: 'bg-[#DC2626]',
    hoverClass: 'hover:bg-[#EF4444]',
    textClass: 'text-white',
    borderClass: 'border border-red-500/40 shadow-red-950/40',
  },
  {
    id: 'yellow',
    name: 'YELLOW',
    points: 2,
    bgClass: 'bg-[#EAB308]',
    hoverClass: 'hover:bg-[#FACC15]',
    textClass: 'text-[#0B0D0C]',
    borderClass: 'border border-yellow-400/50 shadow-yellow-950/30',
  },
  {
    id: 'green',
    name: 'GREEN',
    points: 3,
    bgClass: 'bg-[#15803D]',
    hoverClass: 'hover:bg-[#16A34A]',
    textClass: 'text-white',
    borderClass: 'border border-emerald-500/40 shadow-emerald-950/40',
  },
  {
    id: 'brown',
    name: 'BROWN',
    points: 4,
    bgClass: 'bg-[#854D0E]',
    hoverClass: 'hover:bg-[#92400E]',
    textClass: 'text-white',
    borderClass: 'border border-amber-700/50 shadow-amber-950/40',
  },
];

const BALLS_ROW_2: BallConfig[] = [
  {
    id: 'blue',
    name: 'BLUE',
    points: 5,
    bgClass: 'bg-[#2563EB]',
    hoverClass: 'hover:bg-[#3B82F6]',
    textClass: 'text-white',
    borderClass: 'border border-blue-500/40 shadow-blue-950/40',
  },
  {
    id: 'pink',
    name: 'PINK',
    points: 6,
    bgClass: 'bg-[#DB2777]',
    hoverClass: 'hover:bg-[#EC4899]',
    textClass: 'text-white',
    borderClass: 'border border-pink-500/40 shadow-pink-950/40',
  },
  {
    id: 'black',
    name: 'BLACK',
    points: 7,
    bgClass: 'bg-[#0B0D0C]',
    hoverClass: 'hover:bg-[#161C19]',
    textClass: 'text-white',
    borderClass: 'border-2 border-[#374151] shadow-black/80',
  },
];

interface MobileScoringPageProps {
  tableId: number;
}

export const MobileScoringPage: React.FC<MobileScoringPageProps> = ({ tableId }) => {
  const {
    getTable,
    getCurrentGame,
    updateScore,
    setDirectScore,
    undoScore,
    reportFoul,
    reportFoulWithPenalty,
    updateGameSetup,
    pauseGame,
    resumeGame,
    endGame,
    callStaff,
    settings,
    updateSettings,
    currentUser,
    switchActivePlayer,
    resetPlayerTimer,
    claimTableRemote,
    heartbeatTableRemote,
    releaseTableRemote,
    takeOverTableRemote,
    getTableRemoteStatus,
    pullTableFromServer,
    setTableTheme,
  } = useStore();
  const { navigate } = useRouter();
  const { showToast } = useToast();

  const deviceId = getDeviceId();
  const deviceName = getDeviceName();

  // Instant single-entity pull on load
  useEffect(() => {
    pullTableFromServer(tableId);
  }, [tableId]);

  const table = getTable(tableId);
  const game = getCurrentGame(tableId);
  const remoteStatus = getTableRemoteStatus(tableId, deviceId);
  const tableTheme = table?.theme || 'dark';

  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const copyToClipboard = (url: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedUrl(key);
        setTimeout(() => setCopiedUrl(null), 2500);
      }).catch(() => {});
    }
  };

  // Synchronize document root theme with this table remote's theme
  useEffect(() => {
    const root = document.documentElement;
    if (tableTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.style.colorScheme = 'light';
    }

    return () => {
      // When leaving mobile remote back to management dashboard, restore admin theme
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
  }, [tableTheme]);

  const [elapsed, setElapsed] = useState<string>('00:00');
  const [tableTimerDisplay, setTableTimerDisplay] = useState<string>('00:00');
  const [playerTimerDisplay, setPlayerTimerDisplay] = useState<string>('0s');
  const [formattedShotClock, setFormattedShotClock] = useState<string>('00:30');
  const [isShotClockActive, setIsShotClockActive] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffReason, setStaffReason] = useState('');
  const [staffCalledSuccess, setStaffCalledSuccess] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showTakeoverModal, setShowTakeoverModal] = useState(false);
  const [showDirectEntryModal, setShowDirectEntryModal] = useState(false);
  const [showFoulModal, setShowFoulModal] = useState(false);
  const [showMatchSetupModal, setShowMatchSetupModal] = useState(false);
  const [showEndMatchModal, setShowEndMatchModal] = useState(false);
  const [isFreeBallActive, setIsFreeBallActive] = useState<boolean>(false);
  const [currentBreak, setCurrentBreak] = useState<number>(0);
  const [targetBall, setTargetBall] = useState<string>('RED');
  const [isSwitchingTurn, setIsSwitchingTurn] = useState<boolean>(false);

  // Exclusive Remote Heartbeat & Lease
  useEffect(() => {
    if (!game || table?.status === 'available' || table?.status === 'maintenance') return;

    // If not controlled by another device, claim it for this device
    const status = getTableRemoteStatus(tableId, deviceId);
    if (!status.isInUseByOther) {
      claimTableRemote(tableId, deviceId, deviceName);
    }

    const heartbeatTimer = setInterval(() => {
      const current = getTableRemoteStatus(tableId, deviceId);
      if (current.isControlledByMe) {
        heartbeatTableRemote(tableId, deviceId);
      }
    }, 6000);

    return () => clearInterval(heartbeatTimer);
  }, [tableId, deviceId, deviceName, game?.id, table?.status]);

  // Match & Shot Clock Timers
  useEffect(() => {
    if (!game) return;

    const updateTimers = () => {
      const now = game.status === 'paused' && game.pausedAt ? game.pausedAt : Date.now();
      const totalPaused = game.totalPausedTime || 0;
      const elapsedMs = Math.max(0, now - game.startTime - totalPaused);

      // Table Timer - always runs backwards towards 0 from the set point
      const setMinutes = game.tableTimerMinutes && game.tableTimerMinutes > 0 ? game.tableTimerMinutes : 45;
      const totalAllocatedMs = setMinutes * 60 * 1000;
      const remainingMs = Math.max(0, totalAllocatedMs - elapsedMs);
      const totalSecs = Math.floor(remainingMs / 1000);
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      setTableTimerDisplay(`${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`);
      setElapsed(`${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`);

      // Player Shot Clock Timer - always runs backwards towards 0 from the set point
      const setSeconds = game.playerTimerSeconds && game.playerTimerSeconds > 0 ? game.playerTimerSeconds : 35;
      setIsShotClockActive(true);
      const turnStart = game.turnStartTime || game.startTime;
      const elapsedTurnSecs = Math.floor(Math.max(0, now - turnStart) / 1000);
      const remainingTurnSecs = Math.max(0, setSeconds - elapsedTurnSecs);
      setPlayerTimerDisplay(`${remainingTurnSecs}s`);
      const clockMins = Math.floor(remainingTurnSecs / 60);
      const clockSecs = remainingTurnSecs % 60;
      setFormattedShotClock(`${clockMins < 10 ? '0' : ''}${clockMins}:${clockSecs < 10 ? '0' : ''}${clockSecs}`);
    };

    updateTimers();
    if (game.status === 'playing') {
      const interval = setInterval(updateTimers, 1000);
      return () => clearInterval(interval);
    }
  }, [game?.startTime, game?.status, game?.turnStartTime, game?.tableTimerMinutes, game?.playerTimerSeconds, game?.totalPausedTime]);

  // Handle Winner Confetti
  useEffect(() => {
    if (game?.winner) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#1F9D63', '#D6A84F', '#F5F7F6', '#26B372'],
        });
      } catch {
        // Safe fallback
      }
    }
  }, [game?.winner]);

  // If table doesn't exist
  if (!table) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center bg-[#0B0D0C] text-[#F5F7F6]">
        <div className="max-w-md bg-[#151918] p-8 rounded-2xl border border-[#26302B] shadow-xl">
          <h2 className="text-xl font-bold font-display text-[#F5F7F6]">
            Table 0{tableId} Not Found
          </h2>
          <p className="text-sm text-[#9BA3A0] mt-2">
            This pool table does not exist in the venue configuration.
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 px-4 py-2 bg-[#1F9D63] text-white rounded-xl text-xs font-bold font-display uppercase tracking-wider cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // If table is in maintenance
  if (table.status === 'maintenance') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0B0D0C] text-[#F5F7F6]">
        <div className="max-w-sm w-full bg-[#151918] p-6 rounded-3xl border border-rose-500/30 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-mono font-bold uppercase tracking-wider">
            Table 0{tableId} In Maintenance
          </span>
          <h2 className="text-2xl font-bold font-display tracking-tight">Felt Under Service</h2>
          <p className="text-xs text-[#9BA3A0] leading-relaxed">
            This physical table is currently undergoing leveling, cloth maintenance, or rail inspection. Scoring is disabled.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 bg-[#1D2321] hover:bg-[#26302B] text-white font-bold font-display uppercase tracking-wider text-xs rounded-xl transition-colors cursor-pointer"
            >
              Back to Overview
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If table is available (No active match currently)
  if (!game || table.status === 'available') {
    return (
      <div className={`min-h-screen flex flex-col justify-between p-4 sm:p-6 ${tableTheme === 'dark' ? 'dark bg-[#0B0D0C] text-[#F5F7F6]' : 'bg-[#F4F5F3] text-[#111413]'} overflow-y-auto transition-colors`}>
        {/* Top bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E1E3DF] dark:border-[#26302B]">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-white dark:bg-[#151918] border border-[#E1E3DF] dark:border-[#26302B] text-[#5A635E] dark:text-[#9BA3A0] hover:text-[#111413] dark:hover:text-[#F5F7F6] cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold font-mono tracking-widest text-[#197A4C] dark:text-[#1F9D63] uppercase">
            {settings.venueName} • T0{tableId}
          </span>
          <div className="flex items-center gap-1.5">
            {/* Sound Toggle */}
            <button
              onClick={() => updateSettings({ soundEffects: !settings.soundEffects })}
              className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                settings.soundEffects
                  ? 'bg-[#197A4C]/10 dark:bg-[#151918] border-[#197A4C]/30 dark:border-[#26302B] text-[#197A4C] dark:text-[#1F9D63]'
                  : 'bg-white dark:bg-[#151918] border-[#E1E3DF] dark:border-[#26302B] text-[#8E9B95] dark:text-[#616B66]'
              }`}
              title="Toggle Sound Effects"
            >
              {settings.soundEffects ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Table Independent Theme Toggle */}
            <button
              id="btn-remote-avail-theme"
              onClick={() => setTableTheme(tableId, tableTheme === 'dark' ? 'light' : 'dark')}
              className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                tableTheme === 'light'
                  ? 'bg-white border-[#E1E3DF] text-[#B8892F] hover:bg-[#F0F2EE]'
                  : 'bg-[#151918] border-[#26302B] text-[#1F9D63] hover:bg-[#1D2321]'
              }`}
              title={`Table 0${tableId} Theme: ${tableTheme === 'dark' ? 'Dark' : 'Light'}. Click to switch`}
            >
              {tableTheme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Center welcome & QR confirmation */}
        <div className="max-w-md w-full mx-auto my-auto py-6 sm:py-10 text-center space-y-4 sm:space-y-5">
          <div className="w-20 h-20 rounded-3xl bg-[#197A4C]/10 dark:bg-[#1F9D63]/10 border border-[#197A4C]/30 dark:border-[#1F9D63]/30 text-[#197A4C] dark:text-[#1F9D63] flex items-center justify-center mx-auto shadow-2xl shadow-[#1F9D63]/10">
            <span className="font-display font-extrabold text-3xl">0{tableId}</span>
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#197A4C]/10 dark:bg-[#1F9D63]/15 text-[#197A4C] dark:text-[#1F9D63] border border-[#197A4C]/25 dark:border-[#1F9D63]/30 text-xs font-mono font-bold uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-[#197A4C] dark:bg-[#1F9D63] animate-ping" />
              Table Connected
            </span>
            <h1 className="text-3xl font-extrabold font-display tracking-tight uppercase text-[#111413] dark:text-[#F5F7F6]">
              TABLE 0{tableId} READY
            </h1>
            <p className="text-xs text-[#5A635E] dark:text-[#9BA3A0] mt-2 max-w-xs mx-auto">
              Connected to physical Table 0{tableId}. You can initiate a match or request staff assistance.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#151918] border border-[#E1E3DF] dark:border-[#26302B] text-left space-y-2 text-xs">
            <div className="flex justify-between text-[#5A635E] dark:text-[#9BA3A0]">
              <span>Venue</span>
              <span className="text-[#111413] dark:text-[#F5F7F6] font-semibold font-display">{settings.venueName}</span>
            </div>
            <div className="flex justify-between text-[#5A635E] dark:text-[#9BA3A0]">
              <span>Table Surface</span>
              <span className="text-[#111413] dark:text-[#F5F7F6] font-semibold font-display">Simonis 860 Tournament Cloth</span>
            </div>
            <div className="flex justify-between text-[#5A635E] dark:text-[#9BA3A0]">
              <span>Status</span>
              <span className="text-[#197A4C] dark:text-[#1F9D63] font-bold font-display uppercase tracking-wider">Open for Play</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              id="btn-mobile-start-match"
              onClick={() => setShowStartModal(true)}
              className="w-full py-4 bg-[#197A4C] dark:bg-[#1F9D63] hover:bg-[#14643E] dark:hover:bg-[#26B372] active:scale-[0.98] text-white font-bold font-display uppercase tracking-wider text-sm rounded-2xl shadow-xl shadow-[#1F9D63]/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-5 h-5" />
              <span>Start Match on Table 0{tableId}</span>
            </button>

            <button
              onClick={() => callStaff(tableId, 'Assistance requested at Table 0' + tableId)}
              className="w-full py-3 bg-white dark:bg-[#151918] hover:bg-[#F4F5F3] dark:hover:bg-[#1D2321] text-[#5A635E] dark:text-[#9BA3A0] hover:text-[#111413] dark:hover:text-[#F5F7F6] font-semibold text-xs rounded-xl border border-[#E1E3DF] dark:border-[#26302B] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <PhoneCall className="w-4 h-4 text-[#8E9B95]" />
              <span>Call Staff / Request Balls</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-[#8E9B95] dark:text-[#616B66] font-mono pb-2">
          CueControl Real-Time Scorer • No App Install Required
        </div>

        <StartGameModal
          tableId={tableId}
          isOpen={showStartModal}
          onClose={() => setShowStartModal(false)}
        />
      </div>
    );
  }

  // IF MATCH IS RUNNING AND ANOTHER DEVICE ALREADY CONTROLS THIS TABLE'S REMOTE
  if (remoteStatus.isInUseByOther) {
    const handleConfirmTakeover = () => {
      takeOverTableRemote(tableId, deviceId, deviceName);
      setShowTakeoverModal(false);
      showToast('Remote Acquired', `This device now has exclusive control of Table 0${tableId}`, 'success');
    };

    return (
      <div className="min-h-screen bg-[#0B0D0C] text-[#F5F7F6] flex flex-col justify-between selection:bg-[#1F9D63]/30 p-4 sm:p-6 select-none">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between border-b border-[#26302B] pb-3">
          <button
            onClick={() => navigate('/')}
            className="p-2.5 rounded-xl bg-[#151918] border border-[#26302B] text-[#9BA3A0] hover:text-[#F5F7F6] active:scale-95 transition-all cursor-pointer"
            title="Overview"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <span className="font-display font-extrabold text-sm text-[#F5F7F6] uppercase tracking-wider">
              TABLE 0{tableId}
            </span>
            <span className="block text-[10px] font-mono text-[#D6A84F] uppercase">
              Match In Progress
            </span>
          </div>
          <div className="w-9" />
        </header>

        {/* Center: Remote In Use Notice & Live Spectator View */}
        <div className="max-w-md w-full mx-auto my-auto py-6 text-center space-y-5">
          {/* Lock Icon and In-Use Badge */}
          <div className="w-20 h-20 rounded-3xl bg-[#D6A84F]/10 border border-[#D6A84F]/30 text-[#D6A84F] flex items-center justify-center mx-auto shadow-2xl shadow-[#D6A84F]/10 relative">
            <Lock className="w-9 h-9 text-[#D6A84F]" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D6A84F] animate-ping opacity-75" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D6A84F] border-2 border-[#0B0D0C]" />
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D6A84F]/15 text-[#D6A84F] border border-[#D6A84F]/30 text-xs font-mono font-bold uppercase tracking-wider mb-2">
              <Lock className="w-3.5 h-3.5" />
              Remote In Use
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-[#F5F7F6] uppercase">
              Table Remote In Use
            </h1>
            <p className="text-xs text-[#9BA3A0] mt-2 max-w-sm mx-auto leading-relaxed">
              Table 0{tableId} is currently being controlled by <strong className="text-[#F5F7F6]">{remoteStatus.controllerName}</strong>. Only one mobile device is permitted to operate the live scoring remote at a time.
            </p>
          </div>

          {/* Live Synchronized Match Overview (Read-Only) */}
          <div className="bg-[#151918] rounded-2xl border border-[#26302B] p-4 text-left space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#26302B] pb-2.5 text-xs">
              <div className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-[#D6A84F]" />
                <span className="font-bold text-[#F5F7F6] font-display">{game.gameType}</span>
                {game.targetScore && (
                  <span className="text-[#9BA3A0] font-mono">• Race to {game.targetScore}</span>
                )}
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#1F9D63]">
                <Radio className="w-3 h-3 animate-pulse" />
                Live Feed
              </span>
            </div>

            {/* Current Scores */}
            <div className="grid grid-cols-2 gap-2 text-center py-2">
              <div className={`p-3 rounded-xl border ${
                (game.activePlayerIndex ?? 0) === 0
                  ? 'bg-[#1D2321] border-[#1F9D63]/50'
                  : 'bg-[#111413] border-[#26302B]'
              }`}>
                <div className="text-[11px] font-display font-semibold text-[#8E9B95] truncate">
                  {game.player1}
                  {(game.activePlayerIndex ?? 0) === 0 && ' (Shooting)'}
                </div>
                <div className="font-display font-black text-4xl text-[#F5F7F6] mt-1 font-mono-digits">
                  {game.score1}
                </div>
              </div>

              <div className={`p-3 rounded-xl border ${
                (game.activePlayerIndex ?? 0) === 1
                  ? 'bg-[#1D2321] border-[#1F9D63]/50'
                  : 'bg-[#111413] border-[#26302B]'
              }`}>
                <div className="text-[11px] font-display font-semibold text-[#8E9B95] truncate">
                  {game.player2}
                  {(game.activePlayerIndex ?? 0) === 1 && ' (Shooting)'}
                </div>
                <div className="font-display font-black text-4xl text-[#F5F7F6] mt-1 font-mono-digits">
                  {game.score2}
                </div>
              </div>
            </div>

            {/* Live Timers */}
            <div className="flex items-center justify-between pt-1 text-xs font-mono text-[#9BA3A0]">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#1F9D63]" />
                <span>Table: <strong className="text-[#F5F7F6]">{tableTimerDisplay}</strong></span>
              </div>
              {isShotClockActive && (
                <div className="flex items-center gap-1">
                  <Timer className="w-3.5 h-3.5 text-[#D6A84F]" />
                  <span>Shot Clock: <strong className="text-[#D6A84F]">{playerTimerDisplay}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Locked Controls Notice Card */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-left text-xs text-amber-300 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-snug text-[11px]">
              <strong>Controls Disabled:</strong> Touch scoring, shot clock resets, and foul actions are locked to prevent accidental duplicate scoring.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            <button
              id="btn-takeover-remote"
              onClick={() => setShowTakeoverModal(true)}
              className="w-full py-3.5 bg-[#D6A84F] hover:bg-[#E2BF72] active:scale-[0.98] text-[#0B0D0C] font-black font-display uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-[#D6A84F]/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Unlock className="w-4 h-4" />
              <span>Take Over Remote Control</span>
            </button>

            <button
              onClick={() => navigate('/')}
              className="w-full py-3 bg-[#151918] hover:bg-[#1D2321] text-[#9BA3A0] hover:text-[#F5F7F6] font-semibold text-xs rounded-xl border border-[#26302B] transition-colors cursor-pointer"
            >
              Back to Arena Dashboard
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-[#616B66] font-mono pb-2">
          CueControl Real-Time Lock • Device {deviceId.slice(-4).toUpperCase()}
        </div>

        {/* Takeover Confirmation Modal */}
        {showTakeoverModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="max-w-sm w-full bg-[#151918] rounded-3xl border border-[#26302B] p-6 text-center space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
                <Unlock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-display text-[#F5F7F6]">
                Take Over Table 0{tableId} Remote?
              </h3>
              <p className="text-xs text-[#9BA3A0] leading-relaxed">
                This will transfer referee scoring control to this device. The current controlling device ({remoteStatus.controllerName}) will be disconnected from scoring controls.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowTakeoverModal(false)}
                  className="flex-1 py-3 bg-[#1D2321] hover:bg-[#26302B] text-[#9BA3A0] rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmTakeover}
                  className="flex-1 py-3 bg-[#1F9D63] hover:bg-[#26B372] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#1F9D63]/20 cursor-pointer"
                >
                  Confirm Takeover
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ACTIVE MATCH SCORING VIEW
  const activeShooterIndex = (game.activePlayerIndex ?? 0) as 0 | 1;
  const activePlayerName = activeShooterIndex === 0 ? game.player1 : game.player2;

  const handlePotBall = (ball: BallConfig) => {
    const res = updateScore(
      tableId,
      activeShooterIndex,
      ball.points,
      activePlayerName,
      false,
      `Potted ${ball.name} (+${ball.points} pts)`
    );

    if (res.success) {
      setCurrentBreak((prev) => prev + ball.points);
      if (ball.id === 'red') {
        setTargetBall('COLOR');
      } else {
        setTargetBall('RED');
      }
    } else if (res.error) {
      showToast('Cannot score', res.error, 'error');
    }
  };

  const handleSwitchTurn = () => {
    if (isSwitchingTurn) return;
    setIsSwitchingTurn(true);
    setTimeout(() => setIsSwitchingTurn(false), 350);

    const nextIndex: 0 | 1 = activeShooterIndex === 0 ? 1 : 0;
    switchActivePlayer(tableId, nextIndex);
    setCurrentBreak(0);
    setTargetBall('RED');
    const nextPlayer = nextIndex === 0 ? game.player1 : game.player2;
    showToast('Turn Switched', `Turn passed to ${nextPlayer}`, 'info');
  };

  const handleDirectScoreSave = (s1: number, s2: number) => {
    setDirectScore(tableId, s1, s2, currentUser.name || 'Referee');
    setCurrentBreak(0);
    showToast('Scores Updated', `${game.player1} ${s1} — ${s2} ${game.player2}`, 'success');
  };

  const handleConfirmFoul = (
    foulingIdx: 0 | 1,
    penaltyPoints: number,
    reason: string
  ) => {
    reportFoulWithPenalty(
      tableId,
      foulingIdx,
      penaltyPoints,
      reason,
      currentUser.name || 'Referee'
    );
    setCurrentBreak(0);
    setTargetBall('RED');
    const opponent = foulingIdx === 0 ? game.player2 : game.player1;
    showToast(
      'Foul Recorded',
      `+${penaltyPoints} pts to ${opponent}. Turn switched.`,
      'info'
    );
  };

  const handleSaveSetup = (updates: {
    player1: string;
    player2: string;
    targetScore?: number;
    playerTimerSeconds: number;
    tableTimerMinutes: number;
  }) => {
    updateGameSetup(tableId, updates);
    showToast('Setup Updated', 'Match rules and names updated', 'success');
  };

  const handleEndMatchConfirm = () => {
    setShowEndMatchModal(true);
  };

  const submitStaffCall = (e: React.FormEvent) => {
    e.preventDefault();
    callStaff(tableId, staffReason || 'Player requested referee / chalk / assist');
    setStaffCalledSuccess(true);
    setTimeout(() => {
      setStaffCalledSuccess(false);
      setShowStaffModal(false);
      setStaffReason('');
    }, 2000);
  };

  return (
    <div className={`min-h-screen ${tableTheme === 'dark' ? 'dark bg-[#0B0D0C] text-[#F5F7F6]' : 'bg-[#F4F5F3] text-[#111413]'} flex flex-col justify-between selection:bg-[#197A4C]/30 select-none pb-4 transition-colors`}>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-20 bg-white/95 dark:bg-[#0B0D0C]/90 backdrop-blur-md border-b border-[#E1E3DF] dark:border-[#26302B] px-3 sm:px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-white dark:bg-[#151918] border border-[#E1E3DF] dark:border-[#26302B] text-[#5A635E] dark:text-[#9BA3A0] hover:text-[#111413] dark:hover:text-[#F5F7F6] active:scale-95 transition-all cursor-pointer shadow-xs"
            title="Overview"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-extrabold text-xs sm:text-sm text-[#111413] dark:text-[#F5F7F6] tracking-tight uppercase">
                REFEREE • TABLE 0{tableId}
              </span>
              <span className="w-2 h-2 rounded-full bg-[#197A4C] dark:bg-[#1F9D63] animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-[#197A4C] dark:text-[#1F9D63] uppercase tracking-wider hidden sm:inline">
                {game.status}
              </span>
            </div>
            <p className="text-[11px] text-[#5A635E] dark:text-[#9BA3A0] font-mono truncate max-w-[200px]">
              Frame {game.currentRack || 1} • {game.scoringMode === 'frames' ? `Race to ${game.targetScore || 7}` : 'Points'} • {game.score1}–{game.score2}
            </p>
          </div>
        </div>

        {/* Status Pills & Match Setup & Sound & Theme Controls */}
        <div className="flex items-center gap-1.5">
          {/* Sound Toggle */}
          <button
            id="btn-remote-sound"
            onClick={() => updateSettings({ soundEffects: !settings.soundEffects })}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              settings.soundEffects
                ? 'bg-[#197A4C]/10 dark:bg-[#1F9D63]/20 border-[#197A4C]/30 dark:border-[#1F9D63]/40 text-[#197A4C] dark:text-[#1F9D63]'
                : 'bg-white dark:bg-[#151918] border-[#E1E3DF] dark:border-[#26302B] text-[#8E9B95] dark:text-[#616B66]'
            }`}
            title="Toggle Sound Effects"
          >
            {settings.soundEffects ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Table Independent Theme Toggle beside sound button */}
          <button
            id="btn-remote-theme-toggle"
            onClick={() => {
              const next = tableTheme === 'dark' ? 'light' : 'dark';
              setTableTheme(tableId, next);
              showToast('Theme Changed', `Table 0${tableId} theme set to ${next.toUpperCase()}`, 'info');
            }}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              tableTheme === 'light'
                ? 'bg-white border-[#E1E3DF] text-[#B8892F] hover:bg-[#F0F2EE]'
                : 'bg-[#151918] border-[#26302B] text-[#1F9D63] hover:bg-[#1D2321]'
            }`}
            title={`Table 0${tableId} Theme: ${tableTheme === 'dark' ? 'Dark' : 'Light'}. Click to switch`}
          >
            {tableTheme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Match Setup */}
          <button
            id="btn-match-setup"
            onClick={() => setShowMatchSetupModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#151918] hover:bg-[#F4F5F3] dark:hover:bg-[#1E2522] border border-[#E1E3DF] dark:border-[#26302B] text-xs font-mono font-bold text-[#111413] dark:text-[#F5F7F6] flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            title="Match setup"
          >
            <Settings2 className="w-3.5 h-3.5 text-[#197A4C] dark:text-[#1F9D63]" />
            <span className="text-xs hidden sm:inline">Setup</span>
          </button>

          {/* Stream & TV URLs Modal trigger */}
          <button
            id="btn-remote-share-urls"
            onClick={() => setShowShareModal(true)}
            className="p-2 rounded-xl bg-white dark:bg-[#151918] border border-[#E1E3DF] dark:border-[#26302B] text-[#5A635E] dark:text-[#9BA3A0] hover:text-[#111413] dark:hover:text-[#F5F7F6] transition-colors cursor-pointer shadow-xs"
            title="Table Stream & TV URLs"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Call Staff */}
          <button
            onClick={() => setShowStaffModal(true)}
            className="p-2 rounded-xl bg-white dark:bg-[#151918] border border-[#E1E3DF] dark:border-[#26302B] text-[#B8892F] dark:text-[#D6A84F] hover:text-[#D6A84F] cursor-pointer shadow-xs"
            title="Call Staff"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Scoring Arena */}
      <main className="flex-1 flex flex-col justify-start px-3 sm:px-4 py-2 max-w-lg w-full mx-auto space-y-2.5">
        {/* Remote Lease Banner */}
        <div className="flex items-center justify-between px-3 py-1 bg-[#197A4C]/10 dark:bg-[#1F9D63]/10 rounded-xl border border-[#197A4C]/25 dark:border-[#1F9D63]/25 text-xs text-[#197A4C] dark:text-[#1F9D63]">
          <div className="flex items-center gap-1.5 truncate">
            <Smartphone className="w-3.5 h-3.5 text-[#197A4C] dark:text-[#1F9D63] shrink-0 animate-pulse" />
            <span className="font-mono font-bold text-[10px] sm:text-[11px] uppercase tracking-wider truncate">
              Exclusive Remote Controller
            </span>
          </div>
          <button
            onClick={() => {
              if (window.confirm('Release remote control for this table? Another device will be able to connect.')) {
                releaseTableRemote(tableId, deviceId);
                showToast('Remote Released', 'Other devices can now operate this table', 'info');
              }
            }}
            className="text-[10px] font-mono text-[#5A635E] dark:text-[#8E9B95] hover:text-[#111413] dark:hover:text-[#F5F7F6] underline cursor-pointer shrink-0 ml-2"
          >
            Release Lock
          </button>
        </div>

        {/* 1. Scoreboard Card */}
        <div className="bg-white dark:bg-[#131715] rounded-3xl border border-[#E1E3DF] dark:border-[#26302B] p-3 sm:p-4 shadow-xl">
          <div className="grid grid-cols-3 items-center">
            {/* Player 1 (Left) */}
            <div
              id="player-1-score-box"
              onClick={() => {
                if (activeShooterIndex !== 0 && !isSwitchingTurn) {
                  setIsSwitchingTurn(true);
                  setTimeout(() => setIsSwitchingTurn(false), 350);
                  switchActivePlayer(tableId, 0);
                  setCurrentBreak(0);
                  setTargetBall('RED');
                  showToast('Turn Switched', `Turn passed to ${game.player1}`, 'info');
                }
              }}
              className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl border-2 transition-colors duration-200 cursor-pointer select-none relative ${
                activeShooterIndex === 0
                  ? 'bg-[#197A4C]/10 dark:bg-[#19221D] border-[#197A4C] dark:border-[#1F9D63] shadow-lg shadow-[#1F9D63]/20 ring-1 ring-[#197A4C]/30 dark:ring-[#1F9D63]/30'
                  : 'bg-[#F4F5F3] dark:bg-[#101412] border-transparent hover:bg-[#EBECE8] dark:hover:bg-[#161C19] hover:border-[#E1E3DF] dark:hover:border-[#26302B]'
              }`}
            >
              <span className="text-xs sm:text-sm font-mono font-extrabold uppercase tracking-wider text-[#5A635E] dark:text-[#9BA3A0] truncate max-w-full">
                {game.player1}
              </span>

              {/* Dedicated Shooter Status Pill */}
              <div className="mt-1">
                {activeShooterIndex === 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#197A4C]/15 dark:bg-[#1F9D63]/25 text-[#197A4C] dark:text-[#1F9D63] border border-[#197A4C]/30 dark:border-[#1F9D63]/40 text-[10px] font-mono font-bold uppercase tracking-wider shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#197A4C] dark:bg-[#1F9D63] animate-pulse" />
                    Shooting
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#EBECE8] dark:bg-[#171D1A] text-[#8E9B95] dark:text-[#616B66] text-[10px] font-mono font-semibold uppercase tracking-wider">
                    Waiting
                  </span>
                )}
              </div>

              <span className="font-display font-black text-5xl sm:text-6xl tracking-tight font-mono-digits mt-1 leading-none text-[#111413] dark:text-[#F5F7F6]">
                {game.score1}
              </span>
              {game.fouls1 > 0 && (
                <span className="text-[10px] font-mono text-rose-500 dark:text-rose-400 font-bold mt-1">
                  {game.fouls1} {game.fouls1 === 1 ? 'Foul' : 'Fouls'}
                </span>
              )}
            </div>

            {/* Center: Current nominated ball / break indicator */}
            <div className="flex flex-col items-center justify-center text-center px-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4F5F3] dark:bg-[#1B221E] border border-[#E1E3DF] dark:border-[#26302B] text-xs font-mono font-bold text-[#111413] dark:text-[#F5F7F6] shadow-xs">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    targetBall === 'COLOR'
                      ? 'bg-amber-400 shadow-amber-400/50'
                      : 'bg-red-500 shadow-red-500/50'
                  } shadow-xs animate-pulse`}
                />
                <span>{targetBall}</span>
              </div>

              {currentBreak > 0 && (
                <div className="mt-1.5 text-[11px] font-mono font-bold text-[#B8892F] dark:text-[#D6A84F]">
                  Break: <span className="text-sm font-black">{currentBreak}</span>
                </div>
              )}

              {game.scoringMode === 'frames' && game.targetScore ? (
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#5A635E] dark:text-[#8E9B95] mt-1">
                  Race to {game.targetScore}
                </span>
              ) : null}
            </div>

            {/* Player 2 (Right) */}
            <div
              id="player-2-score-box"
              onClick={() => {
                if (activeShooterIndex !== 1 && !isSwitchingTurn) {
                  setIsSwitchingTurn(true);
                  setTimeout(() => setIsSwitchingTurn(false), 350);
                  switchActivePlayer(tableId, 1);
                  setCurrentBreak(0);
                  setTargetBall('RED');
                  showToast('Turn Switched', `Turn passed to ${game.player2}`, 'info');
                }
              }}
              className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl border-2 transition-colors duration-200 cursor-pointer select-none relative ${
                activeShooterIndex === 1
                  ? 'bg-[#197A4C]/10 dark:bg-[#19221D] border-[#197A4C] dark:border-[#1F9D63] shadow-lg shadow-[#1F9D63]/20 ring-1 ring-[#197A4C]/30 dark:ring-[#1F9D63]/30'
                  : 'bg-[#F4F5F3] dark:bg-[#101412] border-transparent hover:bg-[#EBECE8] dark:hover:bg-[#161C19] hover:border-[#E1E3DF] dark:hover:border-[#26302B]'
              }`}
            >
              <span className="text-xs sm:text-sm font-mono font-extrabold uppercase tracking-wider text-[#5A635E] dark:text-[#9BA3A0] truncate max-w-full">
                {game.player2}
              </span>

              {/* Dedicated Shooter Status Pill */}
              <div className="mt-1">
                {activeShooterIndex === 1 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#197A4C]/15 dark:bg-[#1F9D63]/25 text-[#197A4C] dark:text-[#1F9D63] border border-[#197A4C]/30 dark:border-[#1F9D63]/40 text-[10px] font-mono font-bold uppercase tracking-wider shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#197A4C] dark:bg-[#1F9D63] animate-pulse" />
                    Shooting
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#EBECE8] dark:bg-[#171D1A] text-[#8E9B95] dark:text-[#616B66] text-[10px] font-mono font-semibold uppercase tracking-wider">
                    Waiting
                  </span>
                )}
              </div>

              <span className="font-display font-black text-5xl sm:text-6xl tracking-tight font-mono-digits mt-1 leading-none text-[#111413] dark:text-[#F5F7F6]">
                {game.score2}
              </span>
              {game.fouls2 > 0 && (
                <span className="text-[10px] font-mono text-rose-500 dark:text-rose-400 font-bold mt-1">
                  {game.fouls2} {game.fouls2 === 1 ? 'Foul' : 'Fouls'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2. AT TABLE Strip (Directly below Scoreboard) */}
        <div className="bg-white dark:bg-[#151918] border border-[#E1E3DF] dark:border-[#26302B] rounded-2xl px-4 py-2 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-black tracking-widest text-[#5A635E] dark:text-[#8E9B95] uppercase">
              AT TABLE
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#197A4C] dark:bg-[#1F9D63] animate-ping" />
            <span className="font-display font-extrabold text-base sm:text-lg text-[#111413] dark:text-[#F5F7F6] tracking-tight truncate max-w-[150px]">
              {activePlayerName}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-mono font-black text-xl sm:text-2xl text-[#B8892F] dark:text-[#D6A84F] tracking-wider font-mono-digits">
              {formattedShotClock}
            </span>
          </div>
        </div>

        {/* Ball Buttons Grid with Colors & Points in the Middle */}
        <div className="space-y-2">
          {/* Row 1: Red (1), Yellow (2), Green (3), Brown (4) */}
          <div className="grid grid-cols-4 gap-2">
            {BALLS_ROW_1.map((ball) => (
              <button
                key={ball.id}
                id={`btn-ball-${ball.id}`}
                type="button"
                onClick={() => handlePotBall(ball)}
                className={`rounded-2xl h-16 sm:h-20 flex flex-col items-center justify-center p-1 shadow-lg transition-all active:scale-95 cursor-pointer select-none ${ball.bgClass} ${ball.hoverClass} ${ball.textClass} ${ball.borderClass}`}
              >
                <span className="text-2xl sm:text-3xl font-black font-mono leading-none tracking-tight">
                  {ball.points}
                </span>
                <span className="text-[10px] sm:text-[11px] font-display font-black uppercase tracking-widest mt-1 opacity-90">
                  {ball.name}
                </span>
              </button>
            ))}
          </div>

          {/* Row 2: Blue (5), Pink (6), Black (7) */}
          <div className="grid grid-cols-3 gap-2">
            {BALLS_ROW_2.map((ball) => (
              <button
                key={ball.id}
                id={`btn-ball-${ball.id}`}
                type="button"
                onClick={() => handlePotBall(ball)}
                className={`rounded-2xl h-16 sm:h-20 flex flex-col items-center justify-center p-1 shadow-lg transition-all active:scale-95 cursor-pointer select-none ${ball.bgClass} ${ball.hoverClass} ${ball.textClass} ${ball.borderClass}`}
              >
                <span className="text-2xl sm:text-3xl font-black font-mono leading-none tracking-tight">
                  {ball.points}
                </span>
                <span className="text-[10px] sm:text-[11px] font-display font-black uppercase tracking-widest mt-1 opacity-90">
                  {ball.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 5. SWITCH TURN Button */}
        <button
          id="btn-switch-turn"
          type="button"
          disabled={isSwitchingTurn}
          onClick={handleSwitchTurn}
          className={`w-full py-3.5 px-4 bg-white dark:bg-[#141A17] hover:bg-[#F4F5F3] dark:hover:bg-[#1A231F] active:scale-[0.98] border-2 border-[#197A4C]/40 dark:border-[#1F9D63]/30 hover:border-[#197A4C] dark:hover:border-[#1F9D63] rounded-2xl text-xs sm:text-sm font-black font-display uppercase tracking-widest text-[#111413] dark:text-[#F5F7F6] flex items-center justify-center gap-2.5 shadow-sm transition-all cursor-pointer select-none ${
            isSwitchingTurn ? 'opacity-70 pointer-events-none' : ''
          }`}
        >
          <RefreshCw className={`w-4 h-4 text-[#197A4C] dark:text-[#1F9D63] ${isSwitchingTurn ? 'animate-spin' : ''}`} />
          <span>SWITCH TURN</span>
          <span className="text-[10px] font-mono text-[#197A4C] dark:text-[#1F9D63] font-bold bg-[#197A4C]/10 dark:bg-[#1F9D63]/10 px-2 py-0.5 rounded-full border border-[#197A4C]/25 dark:border-[#1F9D63]/25">
            Turn: {activePlayerName}
          </span>
        </button>

        {/* 6. Action Bar Grid */}
        <div className="space-y-1.5 pt-0.5">
          {/* Action Row 1 */}
          <div className="grid grid-cols-3 gap-2">
            <button
              id="btn-undo-score"
              type="button"
              onClick={() => {
                const res = undoScore(tableId);
                if (res.success) {
                  setCurrentBreak(0);
                  showToast('Action Undone', 'Last action was reverted', 'info');
                } else if (res.error) {
                  showToast('Cannot Undo', res.error, 'error');
                }
              }}
              className="py-2.5 px-2 bg-white dark:bg-[#151918] hover:bg-[#F4F5F3] dark:hover:bg-[#1E2522] active:scale-95 rounded-xl border border-[#E1E3DF] dark:border-[#26302B] text-xs font-bold font-display uppercase tracking-wider text-[#111413] dark:text-[#F5F7F6] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#5A635E] dark:text-[#8E9B95]" />
              <span>Undo</span>
            </button>

            <button
              id="btn-direct-entry"
              type="button"
              onClick={() => setShowDirectEntryModal(true)}
              className="py-2.5 px-2 bg-white dark:bg-[#151918] hover:bg-[#F4F5F3] dark:hover:bg-[#1E2522] active:scale-95 rounded-xl border border-[#E1E3DF] dark:border-[#26302B] text-xs font-bold font-display uppercase tracking-wider text-[#111413] dark:text-[#F5F7F6] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#5A635E] dark:text-[#8E9B95]" />
              <span>Direct entry</span>
            </button>

            <button
              id="btn-foul-modal"
              type="button"
              onClick={() => setShowFoulModal(true)}
              className="py-2.5 px-2 bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 rounded-xl border border-rose-500/30 text-xs font-bold font-display uppercase tracking-wider text-rose-500 dark:text-rose-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
              <span>Foul...</span>
            </button>
          </div>

          {/* Action Row 2 */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setIsFreeBallActive(!isFreeBallActive);
                showToast(
                  'Free Ball',
                  !isFreeBallActive ? 'Free ball active — any ball may be nominated' : 'Free ball deactivated',
                  'info'
                );
              }}
              className={`py-2.5 px-2 rounded-xl border text-xs font-bold font-display uppercase tracking-wider transition-colors cursor-pointer shadow-xs ${
                isFreeBallActive
                  ? 'bg-[#197A4C]/15 dark:bg-[#1F9D63]/20 border-[#197A4C]/40 dark:border-[#1F9D63]/50 text-[#197A4C] dark:text-[#1F9D63]'
                  : 'bg-white dark:bg-[#151918] hover:bg-[#F4F5F3] dark:hover:bg-[#1D2321] border-[#E1E3DF] dark:border-[#26302B] text-[#5A635E] dark:text-[#9BA3A0]'
              }`}
            >
              <span>{isFreeBallActive ? 'Free ball on' : 'Free ball'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                resetPlayerTimer(tableId);
                showToast('Shot Clock Reset', 'Shot clock reset to full duration', 'info');
              }}
              className="py-2.5 px-2 bg-white dark:bg-[#151918] hover:bg-[#F4F5F3] dark:hover:bg-[#1D2321] active:scale-95 rounded-xl border border-[#E1E3DF] dark:border-[#26302B] text-xs font-bold font-display uppercase tracking-wider text-[#B8892F] dark:text-[#D6A84F] flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Reset Clock</span>
            </button>

            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="py-2.5 px-2 bg-white dark:bg-[#151918] hover:bg-[#F4F5F3] dark:hover:bg-[#1D2321] active:scale-95 rounded-xl border border-[#E1E3DF] dark:border-[#26302B] text-xs font-bold font-display uppercase tracking-wider text-[#5A635E] dark:text-[#9BA3A0] flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
            >
              <History className="w-3.5 h-3.5" />
              <span>Timeline</span>
            </button>
          </div>

          {/* End Match Button */}
          <button
            id="btn-end-match"
            type="button"
            onClick={() => setShowEndMatchModal(true)}
            className="w-full py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.98] border border-rose-500/30 rounded-xl text-xs sm:text-sm font-bold font-display uppercase tracking-wider text-rose-500 dark:text-rose-400 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
            <span>End Match</span>
            {game.scoringMode === 'points' && (
              <span className="text-[10px] font-mono text-rose-500/80 dark:text-rose-400/80 lowercase tracking-normal">
                (finalize points)
              </span>
            )}
          </button>
        </div>

        {/* Bottom Bar: Table Timer & Conclude Match */}
        <div className="pt-1 flex items-center justify-between border-t border-[#E1E3DF] dark:border-[#26302B]/60 text-[11px] font-mono text-[#5A635E] dark:text-[#8E9B95]">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-[#197A4C] dark:text-[#1F9D63]" />
            <span>Table Time: {tableTimerDisplay}</span>
          </div>

          <div className="flex items-center gap-2">
            {game.status === 'playing' ? (
              <button
                type="button"
                onClick={() => pauseGame(tableId)}
                className="text-[#B8892F] dark:text-[#D6A84F] hover:text-[#D6A84F] cursor-pointer"
              >
                Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={() => resumeGame(tableId)}
                className="text-[#197A4C] dark:text-[#1F9D63] hover:text-[#14643E] cursor-pointer"
              >
                Resume
              </button>
            )}
            <span>•</span>
            <button
              type="button"
              onClick={handleEndMatchConfirm}
              className="text-[#5A635E] dark:text-[#616B66] hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
            >
              Finish Match
            </button>
          </div>
        </div>
      </main>

      {/* Direct Entry Modal */}
      <DirectEntryModal
        isOpen={showDirectEntryModal}
        onClose={() => setShowDirectEntryModal(false)}
        player1Name={game.player1}
        player2Name={game.player2}
        initialScore1={game.score1}
        initialScore2={game.score2}
        onSave={handleDirectScoreSave}
      />

      {/* Foul & Penalty Modal */}
      <FoulPenaltyModal
        isOpen={showFoulModal}
        onClose={() => setShowFoulModal(false)}
        player1Name={game.player1}
        player2Name={game.player2}
        defaultFoulingPlayerIndex={activeShooterIndex}
        onConfirmFoul={handleConfirmFoul}
      />

      {/* Match Setup Modal */}
      <MatchSetupModal
        isOpen={showMatchSetupModal}
        onClose={() => setShowMatchSetupModal(false)}
        game={game}
        onSaveSetup={handleSaveSetup}
      />

      {/* History / Action Log Modal */}
      {showHistoryModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            className="bg-[#151918] rounded-2xl border border-[#26302B] p-5 max-w-md w-full max-h-[80vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#26302B]">
              <h3 className="font-bold font-display text-[#F5F7F6] text-base">
                Table 0{tableId} Shot Timeline
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-lg text-[#9BA3A0] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto py-3 space-y-2 flex-1 divide-y divide-[#26302B]/60">
              {game.history.length === 0 ? (
                <p className="text-center text-xs text-[#8E9B95] py-6">No action recorded yet</p>
              ) : (
                [...game.history].reverse().map((h) => (
                  <div key={h.id} className="pt-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-[#F5F7F6]">
                        {h.actor || (h.playerIndex === 0 ? game.player1 : game.player2)}
                      </span>{' '}
                      <span className="text-[#8E9B95] font-mono">
                        ({h.type === 'foul' ? 'Foul' : h.type === 'point' ? (h.change > 0 ? '+1' : '-1') : h.type})
                      </span>
                      <p className="text-[10px] text-[#616B66] font-mono mt-0.5">
                        {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-sm text-[#1F9D63]">
                      {h.score1After} : {h.score2After}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-[#26302B]">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-full py-2.5 bg-[#1D2321] hover:bg-[#26302B] text-white font-bold font-display uppercase tracking-wider text-xs rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Staff Assistance Modal */}
      {showStaffModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowStaffModal(false)}
        >
          <div
            className="bg-[#151918] rounded-2xl border border-[#26302B] p-6 max-w-sm w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold font-display text-[#F5F7F6] text-base">
                Request Staff Assistance
              </h3>
              <button
                onClick={() => setShowStaffModal(false)}
                className="p-1 rounded-lg text-[#9BA3A0] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {staffCalledSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-[#1F9D63] mx-auto" />
                <p className="font-bold text-[#F5F7F6] text-sm font-display">Staff Alerted!</p>
                <p className="text-xs text-[#9BA3A0]">
                  A venue staff member has been notified for Table 0{tableId}.
                </p>
              </div>
            ) : (
              <form onSubmit={submitStaffCall} className="space-y-4">
                <p className="text-xs text-[#9BA3A0]">
                  Need a referee, chalk, ball replacement, or rack assistance?
                </p>
                <div className="space-y-2">
                  {[
                    'Need cue chalk / bridge stick',
                    'Referee rule clarification',
                    'Table leveling or ball issue',
                    'Drink / food service',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setStaffReason(preset)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-colors cursor-pointer ${
                        staffReason === preset
                          ? 'bg-[#1F9D63]/20 text-[#1F9D63] border border-[#1F9D63]/40 font-semibold'
                          : 'bg-[#1D2321] text-[#9BA3A0] hover:text-white hover:bg-[#26302B]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Or type custom request..."
                  value={staffReason}
                  onChange={(e) => setStaffReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#1D2321] border border-[#26302B] rounded-xl text-xs text-[#F5F7F6] placeholder-[#616B66] focus:outline-none focus:ring-2 focus:ring-[#1F9D63]/40"
                />

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowStaffModal(false)}
                    className="flex-1 py-2.5 bg-[#1D2321] hover:bg-[#26302B] text-[#9BA3A0] rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#1F9D63] hover:bg-[#26B372] text-white rounded-xl text-xs font-bold font-display uppercase tracking-wider shadow-md cursor-pointer"
                  >
                    Send Call
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* End Match Confirmation Modal */}
      {showEndMatchModal && (
        <div
          id="modal-end-match-confirm"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowEndMatchModal(false)}
        >
          <div
            className="bg-[#151918] border border-[#26302B] rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-display text-[#F5F7F6]">
                  End Match Confirmation
                </h3>
                <p className="text-[11px] text-[#8E9B95] font-mono">
                  Table 0{tableId} • {game.gameType}
                </p>
              </div>
            </div>

            <div className="bg-[#0B0D0C] border border-[#26302B] rounded-2xl p-3.5 space-y-2">
              <div className="flex justify-between items-center text-sm font-display">
                <span className="text-[#9BA3A0] truncate max-w-[170px]">{game.player1}</span>
                <span className="font-mono font-black text-base text-[#F5F7F6]">{game.score1}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-display border-t border-[#26302B]/60 pt-1.5">
                <span className="text-[#9BA3A0] truncate max-w-[170px]">{game.player2}</span>
                <span className="font-mono font-black text-base text-[#F5F7F6]">{game.score2}</span>
              </div>
              <div className="pt-2 border-t border-[#26302B] flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#8E9B95]">Standing:</span>
                <span className="font-bold text-[#1F9D63]">
                  {game.score1 > game.score2
                    ? `${game.player1} leads (+${game.score1 - game.score2})`
                    : game.score2 > game.score1
                    ? `${game.player2} leads (+${game.score2 - game.score1})`
                    : 'Tied Score'}
                </span>
              </div>
            </div>

            <p className="text-xs text-[#9BA3A0] leading-relaxed">
              Are you sure you want to conclude and end this match? The final score will be recorded into tournament history, and this remote controller will be released.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                id="btn-cancel-end-match"
                type="button"
                onClick={() => setShowEndMatchModal(false)}
                className="py-3 bg-[#1E2522] hover:bg-[#28322E] active:scale-95 text-[#9BA3A0] rounded-xl text-xs font-bold font-display uppercase tracking-wider cursor-pointer transition-all"
              >
                Keep Playing
              </button>
              <button
                id="btn-confirm-end-match"
                type="button"
                onClick={() => {
                  setShowEndMatchModal(false);
                  releaseTableRemote(tableId, deviceId);
                  endGame(tableId);
                  showToast('Match Concluded', 'Final score saved to history', 'success');
                  navigate('/');
                }}
                className="py-3 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white rounded-xl text-xs font-bold font-display uppercase tracking-wider shadow-lg shadow-rose-600/25 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Yes, End Match</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Stream & Broadcast URLs Modal */}
      {showShareModal && (
        <div
          id="modal-remote-share-urls"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="bg-white dark:bg-[#151918] border border-[#E1E3DF] dark:border-[#26302B] rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E1E3DF] dark:border-[#26302B] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#197A4C]/10 dark:bg-[#1F9D63]/15 text-[#197A4C] dark:text-[#1F9D63] border border-[#197A4C]/30 dark:border-[#1F9D63]/30 flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-display uppercase tracking-tight text-[#111413] dark:text-[#F5F7F6]">
                    Table 0{tableId} Stream & TV Feeds
                  </h3>
                  <p className="text-[11px] text-[#5A635E] dark:text-[#8E9B95] font-mono">
                    Independent URLs for streaming, TV, and scoreboard
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded-xl text-[#5A635E] dark:text-[#8E9B95] hover:text-[#111413] dark:hover:text-[#F5F7F6] hover:bg-[#F4F5F3] dark:hover:bg-[#1D2321] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Table Theme Status */}
            <div className="p-3 rounded-xl bg-[#F4F5F3] dark:bg-[#1D2321] border border-[#E1E3DF] dark:border-[#26302B] flex items-center justify-between text-xs">
              <span className="font-mono text-[#5A635E] dark:text-[#8E9B95]">Active Table Theme:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold uppercase text-[#197A4C] dark:text-[#1F9D63]">
                  {tableTheme}
                </span>
                <button
                  onClick={() => {
                    const next = tableTheme === 'dark' ? 'light' : 'dark';
                    setTableTheme(tableId, next);
                    showToast('Theme Updated', `Table 0${tableId} theme changed to ${next.toUpperCase()}`, 'info');
                  }}
                  className="px-2 py-0.5 rounded-md bg-white dark:bg-[#151918] border border-[#E1E3DF] dark:border-[#26302B] text-[10px] font-mono text-[#B8892F] dark:text-[#D6A84F] hover:bg-[#EBECE8] cursor-pointer"
                >
                  Switch to {tableTheme === 'dark' ? 'Light' : 'Dark'}
                </button>
              </div>
            </div>

            {/* 1. Dedicated OBS Stream URL */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#181D1B] border border-[#E1E3DF] dark:border-[#26302B] space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-[#B8892F] dark:text-[#D6A84F]" />
                  <span className="text-xs font-bold font-display uppercase tracking-wider text-[#111413] dark:text-[#F5F7F6]">
                    OBS Stream Overlay URL
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => copyToClipboard(`${origin}/stream/${tableId}`, `remote-stream-${tableId}`)}
                    className="px-2.5 py-1 rounded-lg bg-[#197A4C] dark:bg-[#1F9D63] hover:bg-[#14643E] dark:hover:bg-[#26B372] text-white text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    {copiedUrl === `remote-stream-${tableId}` ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedUrl === `remote-stream-${tableId}` ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <a
                    href={`/stream/${tableId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded-lg text-[#5A635E] dark:text-[#8E9B95] hover:text-[#111413] dark:hover:text-[#F5F7F6]"
                    title="Open Stream Overlay"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
              <p className="text-[11px] text-[#5A635E] dark:text-[#8E9B95]">
                Paste this into OBS / vMix / Twitch studio browser source to stream this table live.
              </p>
              <code className="block p-2 rounded-lg bg-[#F4F5F3] dark:bg-[#111413] border border-[#E1E3DF] dark:border-[#26302B] font-mono text-[11px] text-[#197A4C] dark:text-[#1F9D63] truncate select-all">
                {origin}/stream/{tableId}
              </code>
            </div>

            {/* 2. Dedicated Single Table TV Display URL */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#181D1B] border border-[#E1E3DF] dark:border-[#26302B] space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[#197A4C] dark:text-[#1F9D63]" />
                  <span className="text-xs font-bold font-display uppercase tracking-wider text-[#111413] dark:text-[#F5F7F6]">
                    Dedicated Table TV Screen
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => copyToClipboard(`${origin}/tv/${tableId}`, `remote-tv-${tableId}`)}
                    className="px-2.5 py-1 rounded-lg bg-[#197A4C] dark:bg-[#1F9D63] hover:bg-[#14643E] dark:hover:bg-[#26B372] text-white text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    {copiedUrl === `remote-tv-${tableId}` ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedUrl === `remote-tv-${tableId}` ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <a
                    href={`/tv/${tableId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded-lg text-[#5A635E] dark:text-[#8E9B95] hover:text-[#111413] dark:hover:text-[#F5F7F6]"
                    title="Open Table TV Screen"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
              <p className="text-[11px] text-[#5A635E] dark:text-[#8E9B95]">
                Locks directly to Table 0{tableId}. Follows this table's independent theme in real-time.
              </p>
              <code className="block p-2 rounded-lg bg-[#F4F5F3] dark:bg-[#111413] border border-[#E1E3DF] dark:border-[#26302B] font-mono text-[11px] text-[#197A4C] dark:text-[#1F9D63] truncate select-all">
                {origin}/tv/{tableId}
              </code>
            </div>

            {/* 3. Main Arena Live Broadcast (All Tables) */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#181D1B] border border-[#E1E3DF] dark:border-[#26302B] space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#D6A84F]" />
                  <span className="text-xs font-bold font-display uppercase tracking-wider text-[#111413] dark:text-[#F5F7F6]">
                    Main Arena Live Broadcast (All Tables)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => copyToClipboard(`${origin}/display`, 'remote-main-arena')}
                    className="px-2.5 py-1 rounded-lg bg-[#F4F5F3] dark:bg-[#1D2321] hover:bg-[#EBECE8] dark:hover:bg-[#26302B] border border-[#E1E3DF] dark:border-[#26302B] text-[11px] font-mono font-bold text-[#111413] dark:text-[#F5F7F6] flex items-center gap-1 cursor-pointer transition-all"
                  >
                    {copiedUrl === 'remote-main-arena' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedUrl === 'remote-main-arena' ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <a
                    href="/display"
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded-lg text-[#5A635E] dark:text-[#8E9B95] hover:text-[#111413] dark:hover:text-[#F5F7F6]"
                    title="Open Main Arena Broadcast"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
              <p className="text-[11px] text-[#5A635E] dark:text-[#8E9B95]">
                Full venue TV view displaying all 6 table scoreboards with independent arena theme controls.
              </p>
              <code className="block p-2 rounded-lg bg-[#F4F5F3] dark:bg-[#111413] border border-[#E1E3DF] dark:border-[#26302B] font-mono text-[11px] text-[#197A4C] dark:text-[#1F9D63] truncate select-all">
                {origin}/display
              </code>
            </div>

            <button
              onClick={() => setShowShareModal(false)}
              className="w-full py-2.5 bg-[#F4F5F3] dark:bg-[#1D2321] hover:bg-[#EBECE8] dark:hover:bg-[#26302B] text-xs font-mono font-bold text-[#5A635E] dark:text-[#8E9B95] rounded-xl border border-[#E1E3DF] dark:border-[#26302B] cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
