import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  StopCircle,
  QrCode,
  Wrench,
  RotateCcw,
  ExternalLink,
  Clock,
  Trophy,
  ChevronRight,
  Plus,
  Minus,
  Smartphone,
  Sun,
  Moon,
  Radio,
  Tv,
  Video,
} from 'lucide-react';
import { Table, Game } from '../types.ts';
import { useStore } from '../hooks/useStore.ts';
import { useRouter } from '../context/RouterContext.tsx';
import { useToast } from '../context/ToastContext.tsx';

interface TableCardProps {
  table: Table;
  game?: Game;
  onOpenQR: (tableId: number) => void;
  onStartGame: (tableId: number) => void;
}

export const TableCard: React.FC<TableCardProps> = ({
  table,
  game,
  onOpenQR,
  onStartGame,
}) => {
  const { navigate } = useRouter();
  const { showToast } = useToast();
  const {
    updateScore,
    pauseGame,
    resumeGame,
    endGame,
    resetGame,
    setTableMaintenance,
    setTableTheme,
    currentUser,
  } = useStore();

  const [elapsed, setElapsed] = useState<string>('00:00');
  const [tableTimerDisplay, setTableTimerDisplay] = useState<string>('00:00');
  const [playerTimerDisplay, setPlayerTimerDisplay] = useState<string>('0s');
  const [isShotClockActive, setIsShotClockActive] = useState<boolean>(false);

  useEffect(() => {
    if (!game) return;

    const updateTimers = () => {
      const now = game.status === 'paused' && game.pausedAt ? game.pausedAt : Date.now();
      const totalPaused = game.totalPausedTime || 0;
      const elapsedMs = Math.max(0, now - game.startTime - totalPaused);

      // Table Timer - runs backwards towards 0 from the set point
      const setMinutes = game.tableTimerMinutes && game.tableTimerMinutes > 0 ? game.tableTimerMinutes : 45;
      const totalAllocatedMs = setMinutes * 60 * 1000;
      const remainingMs = Math.max(0, totalAllocatedMs - elapsedMs);
      const totalSecs = Math.floor(remainingMs / 1000);
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      setTableTimerDisplay(`${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`);

      // Player Shot Clock Timer - runs backwards towards 0 from the set point
      const setSeconds = game.playerTimerSeconds && game.playerTimerSeconds > 0 ? game.playerTimerSeconds : 35;
      setIsShotClockActive(true);
      const turnStart = game.turnStartTime || game.startTime;
      const elapsedTurnSecs = Math.floor(Math.max(0, now - turnStart) / 1000);
      const remainingTurnSecs = Math.max(0, setSeconds - elapsedTurnSecs);
      setPlayerTimerDisplay(`${remainingTurnSecs}s`);
    };

    updateTimers();
    if (game.status === 'playing') {
      const interval = setInterval(updateTimers, 1000);
      return () => clearInterval(interval);
    }
  }, [game?.startTime, game?.status, game?.turnStartTime, game?.tableTimerMinutes, game?.playerTimerSeconds, game?.totalPausedTime]);

  const getStatusBadge = () => {
    switch (table.status) {
      case 'playing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-display uppercase tracking-wider bg-[#197A4C]/10 text-[#197A4C] dark:bg-[#1F9D63]/15 dark:text-[#1F9D63] border border-[#197A4C]/30 dark:border-[#1F9D63]/40">
            <span className="w-2 h-2 rounded-full bg-[#197A4C] dark:bg-[#1F9D63] animate-pulse" />
            Live Match
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-display uppercase tracking-wider bg-[#B8892F]/10 text-[#B8892F] dark:bg-[#D6A84F]/15 dark:text-[#D6A84F] border border-[#B8892F]/30 dark:border-[#D6A84F]/40">
            <span className="w-2 h-2 rounded-full bg-[#D6A84F]" />
            Paused
          </span>
        );
      case 'maintenance':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-display uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <Wrench className="w-3 h-3" />
            Maintenance
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-display uppercase tracking-wider bg-[#EBECE8] dark:bg-[#1D2321] text-[#5A635E] dark:text-[#9BA3A0] border border-[#E1E3DF] dark:border-[#26302B]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8E9B95] dark:bg-[#616B66]" />
            Available
          </span>
        );
    }
  };

  const handleEndGameConfirm = () => {
    if (window.confirm(`Are you sure you want to end the match on Table 0${table.id}?`)) {
      endGame(table.id);
      showToast(`Table 0${table.id} Concluded`, 'Match has been moved to history', 'info');
    }
  };

  const isStaffOrAdmin = currentUser.role === 'admin' || currentUser.role === 'staff';

  return (
    <div
      id={`table-card-${table.id}`}
      className="group relative rounded-2xl border border-[#E1E3DF] dark:border-[#26302B] bg-white dark:bg-[#151918] p-5 shadow-xs hover:border-[#197A4C]/50 dark:hover:border-[#1F9D63]/50 transition-all flex flex-col justify-between"
    >
      {/* Top Bar: Table Number & Status & QR Button */}
      <div>
        <div className="flex items-center justify-between pb-3.5 border-b border-[#E1E3DF] dark:border-[#26302B]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F4F5F3] dark:bg-[#1D2321] text-[#111413] dark:text-[#F5F7F6] border border-[#E1E3DF] dark:border-[#26302B] flex items-center justify-center font-display font-extrabold text-sm shadow-xs">
              0{table.id}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-[#111413] dark:text-[#F5F7F6] font-display uppercase tracking-tight leading-tight">
                  {table.name}
                </h3>
              </div>
              <p className="text-[11px] text-[#8E9B95] dark:text-[#616B66] font-medium">
                {table.status === 'playing' ? `${game?.gameType || 'Match'} in progress` : 'Tournament Simonis Cloth'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {table.activeRemoteDeviceId && (
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                title={`Live Mobile Scorer: ${table.activeRemoteDeviceName || 'Mobile Device'}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <Smartphone className="w-3 h-3 text-emerald-500" />
                <span>Phone Connected</span>
              </span>
            )}
            {getStatusBadge()}

            {/* Table Independent Theme Toggle */}
            <button
              id={`btn-table-theme-${table.id}`}
              onClick={() => {
                const next = (table.theme || 'dark') === 'dark' ? 'light' : 'dark';
                setTableTheme(table.id, next);
                showToast('Theme Changed', `Table 0${table.id} theme set to ${next.toUpperCase()}`, 'info');
              }}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                table.theme === 'light'
                  ? 'bg-[#F4F5F3] border-[#E1E3DF] text-[#B8892F] hover:bg-[#EBECE8]'
                  : 'bg-[#1D2321] border-[#26302B] text-[#1F9D63] hover:bg-[#26302B]'
              }`}
              title={`Table 0${table.id} Theme: ${table.theme === 'light' ? 'Light' : 'Dark'}. Click to toggle`}
            >
              {table.theme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              id={`btn-table-qr-${table.id}`}
              onClick={() => onOpenQR(table.id)}
              className="p-1.5 text-[#5A635E] hover:text-[#111413] dark:text-[#9BA3A0] dark:hover:text-[#F5F7F6] hover:bg-[#EBECE8] dark:hover:bg-[#1D2321] rounded-lg transition-colors cursor-pointer"
              title="Table QR Code & Link"
            >
              <QrCode className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {game && (table.status === 'playing' || table.status === 'paused') ? (
          <div className="py-4 space-y-3">
            {/* Players and Live Score */}
            <div className="grid grid-cols-7 items-center bg-[#F4F5F3] dark:bg-[#1D2321] p-3 rounded-xl border border-[#E1E3DF] dark:border-[#26302B]">
              {/* Player 1 */}
              <div className="col-span-2 text-left min-w-0">
                <p className="text-xs font-bold text-[#111413] dark:text-[#F5F7F6] truncate font-display">
                  {game.player1}
                </p>
                <span className="text-[10px] font-mono font-medium text-[#8E9B95] dark:text-[#616B66]">
                  {game.fouls1 > 0 ? `${game.fouls1} fouls` : 'Player 1'}
                </span>
                {/* Quick point adjustment */}
                {isStaffOrAdmin && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <button
                      onClick={() => updateScore(table.id, 0, 1, 'Quick +1')}
                      className="w-5 h-5 rounded bg-[#197A4C]/10 dark:bg-[#1F9D63]/20 hover:bg-[#197A4C]/25 text-[#197A4C] dark:text-[#1F9D63] flex items-center justify-center text-xs font-bold font-mono cursor-pointer"
                      title="Add 1 to Player 1"
                    >
                      +
                    </button>
                    <button
                      onClick={() => updateScore(table.id, 0, -1, 'Quick -1')}
                      className="w-5 h-5 rounded bg-[#EBECE8] dark:bg-[#26302B] hover:bg-[#E1E3DF] text-[#5A635E] dark:text-[#9BA3A0] flex items-center justify-center text-xs font-bold font-mono cursor-pointer"
                      title="Subtract 1 from Player 1"
                    >
                      -
                    </button>
                  </div>
                )}
              </div>

              {/* Score Display with Table Timer in middle span and Player Timer below it */}
              <div className="col-span-3 text-center flex flex-col items-center justify-center min-w-0 px-0.5 overflow-hidden">
                <div className="font-display font-extrabold text-xl sm:text-2xl tracking-tighter text-[#111413] dark:text-[#F5F7F6] font-mono-digits flex items-center justify-center gap-0.5 sm:gap-1 w-full">
                  <span className={game.score1 > game.score2 ? 'text-[#197A4C] dark:text-[#1F9D63]' : ''}>
                    {game.score1}
                  </span>

                  {/* Table Timer sitting inside middle span between scores without exceeding */}
                  <span className="inline-flex flex-col items-center justify-center mx-0.5 px-1 py-0.5 rounded bg-[#EBECE8] dark:bg-[#111413] border border-[#D5D8D3] dark:border-[#26302B] text-[8px] font-mono font-bold tracking-tight text-[#111413] dark:text-[#F5F7F6] leading-none shrink-0 shadow-xs max-w-[46px]">
                    <span className="text-[6px] uppercase font-mono text-[#8E9B95] dark:text-[#616B66] leading-none mb-0.5 tracking-wider">Timer</span>
                    <span className="font-mono-digits text-[#197A4C] dark:text-[#1F9D63] text-[8.5px] leading-none font-bold">{tableTimerDisplay}</span>
                  </span>

                  <span className={game.score2 > game.score1 ? 'text-[#197A4C] dark:text-[#1F9D63]' : ''}>
                    {game.score2}
                  </span>
                </div>

                {/* Player Timer running below it */}
                {isShotClockActive && (
                  <span className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#197A4C]/10 dark:bg-[#1F9D63]/15 border border-[#197A4C]/25 dark:border-[#1F9D63]/30 text-[8px] font-mono font-bold text-[#197A4C] dark:text-[#1F9D63] max-w-full truncate">
                    <span>Shot: {playerTimerDisplay}</span>
                    <span className="opacity-75">• P{(game.activePlayerIndex ?? 0) + 1}</span>
                  </span>
                )}

                {game.targetScore && (
                  <span className="text-[8.5px] font-bold font-mono uppercase tracking-wider text-[#B8892F] dark:text-[#D6A84F] block mt-0.5 truncate max-w-full">
                    Race to {game.targetScore}
                  </span>
                )}
              </div>

              {/* Player 2 */}
              <div className="col-span-2 text-right min-w-0">
                <p className="text-xs font-bold text-[#111413] dark:text-[#F5F7F6] truncate font-display">
                  {game.player2}
                </p>
                <span className="text-[10px] font-mono font-medium text-[#8E9B95] dark:text-[#616B66]">
                  {game.fouls2 > 0 ? `${game.fouls2} fouls` : 'Player 2'}
                </span>
                {/* Quick point adjustment */}
                {isStaffOrAdmin && (
                  <div className="flex items-center justify-end gap-1 mt-1.5">
                    <button
                      onClick={() => updateScore(table.id, 1, -1, 'Quick -1')}
                      className="w-5 h-5 rounded bg-[#EBECE8] dark:bg-[#26302B] hover:bg-[#E1E3DF] text-[#5A635E] dark:text-[#9BA3A0] flex items-center justify-center text-xs font-bold font-mono cursor-pointer"
                      title="Subtract 1 from Player 2"
                    >
                      -
                    </button>
                    <button
                      onClick={() => updateScore(table.id, 1, 1, 'Quick +1')}
                      className="w-5 h-5 rounded bg-[#197A4C]/10 dark:bg-[#1F9D63]/20 hover:bg-[#197A4C]/25 text-[#197A4C] dark:text-[#1F9D63] flex items-center justify-center text-xs font-bold font-mono cursor-pointer"
                      title="Add 1 to Player 2"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Game Meta: Type, Duration, Match Name */}
            <div className="flex items-center justify-between text-xs text-[#5A635E] dark:text-[#9BA3A0] px-1">
              <span className="flex items-center gap-1.5 font-display font-semibold">
                <Trophy className="w-3.5 h-3.5 text-[#B8892F] dark:text-[#D6A84F]" />
                {game.gameType}
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-[#8E9B95] dark:text-[#616B66]">
                <Clock className="w-3.5 h-3.5 text-[#8E9B95] dark:text-[#616B66]" />
                {elapsed}
              </span>
            </div>
          </div>
        ) : table.status === 'maintenance' ? (
          <div className="py-7 text-center">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-2">
              <Wrench className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold font-display text-[#111413] dark:text-[#F5F7F6]">Under Maintenance</p>
            <p className="text-[11px] text-[#8E9B95] dark:text-[#616B66] mt-0.5">Table cloth re-felting & leveling</p>
          </div>
        ) : (
          <div className="py-7 text-center">
            <div className="w-8 h-8 rounded-full bg-[#197A4C]/10 dark:bg-[#1F9D63]/10 text-[#197A4C] dark:text-[#1F9D63] flex items-center justify-center mx-auto mb-1.5">
              <span className="w-2 h-2 rounded-full bg-[#197A4C] dark:bg-[#1F9D63]" />
            </div>
            <p className="text-xs font-bold font-display text-[#111413] dark:text-[#F5F7F6]">Table Ready for Match</p>
            <p className="text-[11px] text-[#8E9B95] dark:text-[#616B66] mt-0.5">Scan table QR code or start from venue console</p>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-3.5 border-t border-[#E1E3DF] dark:border-[#26302B] flex items-center justify-between gap-2">
        {table.status === 'playing' || table.status === 'paused' ? (
          <>
            <button
              id={`btn-open-scoring-${table.id}`}
              onClick={() => navigate(`/table/${table.id}`)}
              className="flex-1 py-2 px-3 bg-[#197A4C] dark:bg-[#1F9D63] hover:bg-[#14643E] dark:hover:bg-[#26B372] active:scale-[0.98] text-white text-xs font-bold font-display uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-sm shadow-[#1F9D63]/15 transition-all cursor-pointer"
            >
              <span>Score Remote</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            <button
              id={`btn-open-stream-${table.id}`}
              onClick={() => navigate(`/stream/${table.id}`)}
              className="p-2 rounded-xl text-[#5A635E] hover:text-[#B8892F] dark:text-[#9BA3A0] dark:hover:text-[#D6A84F] hover:bg-[#B8892F]/10 transition-colors cursor-pointer"
              title={`OBS Stream Overlay • Table 0${table.id}`}
            >
              <Radio className="w-4 h-4" />
            </button>

            <button
              id={`btn-open-tv-${table.id}`}
              onClick={() => navigate(`/tv/${table.id}`)}
              className="p-2 rounded-xl text-[#5A635E] hover:text-[#197A4C] dark:text-[#9BA3A0] dark:hover:text-[#1F9D63] hover:bg-[#197A4C]/10 transition-colors cursor-pointer"
              title={`Dedicated TV Feed • Table 0${table.id}`}
            >
              <Tv className="w-4 h-4" />
            </button>

            <button
              id={`btn-open-cam-${table.id}`}
              onClick={() => navigate('/videos')}
              className="p-2 rounded-xl text-[#5A635E] hover:text-sky-500 dark:text-[#9BA3A0] dark:hover:text-sky-400 hover:bg-sky-500/10 transition-colors cursor-pointer"
              title={`Live IP Camera Feed • Table 0${table.id}`}
            >
              <Video className="w-4 h-4" />
            </button>

            {isStaffOrAdmin && (
              <div className="flex items-center gap-1">
                {table.status === 'playing' ? (
                  <button
                    onClick={() => pauseGame(table.id)}
                    className="p-2 rounded-xl text-[#5A635E] hover:text-[#B8892F] dark:text-[#9BA3A0] dark:hover:text-[#D6A84F] hover:bg-[#B8892F]/10 transition-colors cursor-pointer"
                    title="Pause Match"
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => resumeGame(table.id)}
                    className="p-2 rounded-xl text-[#5A635E] hover:text-[#197A4C] dark:text-[#9BA3A0] dark:hover:text-[#1F9D63] hover:bg-[#197A4C]/10 transition-colors cursor-pointer"
                    title="Resume Match"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={handleEndGameConfirm}
                  className="p-2 rounded-xl text-[#5A635E] hover:text-rose-500 dark:text-[#9BA3A0] dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Conclude / End Game"
                >
                  <StopCircle className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : table.status === 'maintenance' ? (
          <>
            <button
              onClick={() => setTableMaintenance(table.id, false)}
              className="w-full py-2 px-3 bg-[#111413] dark:bg-[#1D2321] hover:bg-black dark:hover:bg-[#26302B] text-white text-xs font-bold font-display uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
            >
              Restore to Available
            </button>
          </>
        ) : (
          <>
            <button
              id={`btn-start-game-${table.id}`}
              onClick={() => onStartGame(table.id)}
              className="flex-1 py-2 px-3 bg-[#197A4C] dark:bg-[#1F9D63] hover:bg-[#14643E] dark:hover:bg-[#26B372] active:scale-[0.98] text-white text-xs font-bold font-display uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-sm shadow-[#1F9D63]/15 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Match</span>
            </button>

            <button
              id={`btn-open-empty-table-${table.id}`}
              onClick={() => navigate(`/table/${table.id}`)}
              className="py-2 px-2.5 text-[#5A635E] dark:text-[#9BA3A0] hover:bg-[#EBECE8] dark:hover:bg-[#1D2321] hover:text-[#111413] dark:hover:text-[#F5F7F6] rounded-xl text-xs font-medium transition-colors cursor-pointer"
              title="View Player Scoring Interface"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            {isStaffOrAdmin && (
              <button
                onClick={() => setTableMaintenance(table.id, true)}
                className="p-2 rounded-xl text-[#8E9B95] dark:text-[#616B66] hover:text-[#B8892F] dark:hover:text-[#D6A84F] hover:bg-[#B8892F]/10 transition-colors cursor-pointer"
                title="Mark Maintenance"
              >
                <Wrench className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
