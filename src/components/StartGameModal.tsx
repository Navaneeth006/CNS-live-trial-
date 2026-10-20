import React, { useState, useEffect } from 'react';
import { X, Play, ShieldAlert, Sparkles, User, Trophy, Layers, Clock, Timer } from 'lucide-react';
import { GameType, ScoringMode, Table } from '../types.ts';
import { useStore } from '../hooks/useStore.ts';
import { useToast } from '../context/ToastContext.tsx';
import { getDeviceId, getDeviceName } from '../utils/device.ts';

interface StartGameModalProps {
  tableId?: number;
  isOpen: boolean;
  onClose: () => void;
  onGameStarted?: (tableId: number) => void;
}

const GAME_TYPES: GameType[] = ['8-Ball', '9-Ball', '10-Ball', 'Straight Pool', 'Custom'];

export const StartGameModal: React.FC<StartGameModalProps> = ({
  tableId: initialTableId,
  isOpen,
  onClose,
  onGameStarted,
}) => {
  const { tables, startGame } = useStore();
  const { showToast } = useToast();

  const [selectedTableId, setSelectedTableId] = useState<number>(initialTableId || 1);
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [gameType, setGameType] = useState<GameType>('8-Ball');
  const [scoringMode, setScoringMode] = useState<ScoringMode>('frames');
  const [targetScore, setTargetScore] = useState<string>('7');
  const [matchName, setMatchName] = useState('');
  const [tableTimerMinutes, setTableTimerMinutes] = useState<string>('45');
  const [playerTimerSeconds, setPlayerTimerSeconds] = useState<string>('35');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTableId) {
      setSelectedTableId(initialTableId);
    }
  }, [initialTableId, isOpen]);

  if (!isOpen) return null;

  // Available tables
  const availableTables = tables.filter((t) => t.status !== 'playing');
  const targetTable = tables.find((t) => t.id === selectedTableId);
  const isTableOccupied = targetTable?.status === 'playing';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!player1.trim() || !player2.trim()) {
      setError('Please provide names for both Player 1 and Player 2.');
      return;
    }
    if (player1.trim().toLowerCase() === player2.trim().toLowerCase()) {
      setError('Player 1 and Player 2 must be different people.');
      return;
    }
    if (isTableOccupied) {
      setError(`Table 0${selectedTableId} already has an active game.`);
      return;
    }

    const parsedTarget = scoringMode === 'points' ? undefined : (targetScore ? parseInt(targetScore, 10) : undefined);
    const parsedTableTimer = tableTimerMinutes ? parseInt(tableTimerMinutes, 10) : 0;
    const parsedPlayerTimer = playerTimerSeconds ? parseInt(playerTimerSeconds, 10) : 0;

    const deviceId = getDeviceId();
    const deviceName = getDeviceName();

    const result = startGame(
      selectedTableId,
      {
        player1: player1.trim(),
        player2: player2.trim(),
        gameType,
        scoringMode,
        targetScore: parsedTarget && parsedTarget > 0 ? parsedTarget : undefined,
        matchName: matchName.trim() || undefined,
        tableTimerMinutes: parsedTableTimer,
        playerTimerSeconds: parsedPlayerTimer,
      },
      deviceId,
      deviceName
    );

    if (!result.success) {
      setError(result.error || 'Failed to start match');
      return;
    }

    showToast(
      'Match Started!',
      `Table 0${selectedTableId}: ${player1} vs ${player2} (${gameType})`,
      'success'
    );

    if (onGameStarted) {
      onGameStarted(selectedTableId);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#151918] border border-[#E1E3DF] dark:border-[#26302B] rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed at Top */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#E1E3DF] dark:border-[#26302B] bg-[#F4F5F3] dark:bg-[#1D2321]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#197A4C]/15 dark:bg-[#1F9D63]/20 text-[#197A4C] dark:text-[#1F9D63] border border-[#197A4C]/30 dark:border-[#1F9D63]/30 flex items-center justify-center font-bold">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#111413] dark:text-[#F5F7F6] font-display uppercase tracking-tight">
                Start New Match
              </h2>
              <p className="text-[11px] sm:text-xs text-[#5A635E] dark:text-[#8E9B95]">
                Initialize live scoring session for Table 0{selectedTableId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#5A635E] hover:text-[#111413] dark:text-[#8E9B95] dark:hover:text-[#F5F7F6] p-1.5 rounded-lg hover:bg-[#EBECE8] dark:hover:bg-[#151918] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form - Flex column with scrollable body and sticky footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          {/* Scrollable Form Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Table Selector - Hidden when pre-selected via table QR code or table card */}
            {!initialTableId && (
              <div>
                <label className="block text-xs font-semibold text-[#5A635E] dark:text-[#8E9B95] uppercase tracking-wider mb-1.5">
                  Select Arena Table
                </label>
                <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                  {tables.map((tbl) => {
                    const isSelected = selectedTableId === tbl.id;
                    const isBusy = tbl.status === 'playing';
                    const isMaint = tbl.status === 'maintenance';

                    return (
                      <button
                        key={tbl.id}
                        type="button"
                        disabled={isBusy || isMaint}
                        onClick={() => setSelectedTableId(tbl.id)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          isSelected
                            ? 'bg-[#197A4C] dark:bg-[#1F9D63] text-white border-[#197A4C] dark:border-[#1F9D63] shadow-md shadow-[#1F9D63]/20'
                            : isBusy
                            ? 'bg-[#EBECE8]/40 dark:bg-[#151918]/40 text-[#8E9B95] dark:text-[#616B66] border-[#E1E3DF] dark:border-[#26302B] cursor-not-allowed opacity-50'
                            : isMaint
                            ? 'bg-[#B8892F]/10 dark:bg-[#D6A84F]/10 text-[#B8892F] dark:text-[#D6A84F] border-[#B8892F]/30 dark:border-[#D6A84F]/30 cursor-not-allowed'
                            : 'bg-[#F4F5F3] dark:bg-[#1D2321] text-[#111413] dark:text-[#F5F7F6] border-[#E1E3DF] dark:border-[#26302B] hover:border-[#197A4C]/50 dark:hover:border-[#1F9D63]/50'
                        }`}
                      >
                        T{tbl.id}
                        <span className="block text-[9px] font-mono font-normal uppercase opacity-80">
                          {isBusy ? 'Busy' : isMaint ? 'Maint' : 'Ready'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Players Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-[#5A635E] dark:text-[#8E9B95] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#197A4C] dark:text-[#1F9D63]" />
                  Player 1 Name *
                </label>
                <input
                  id="input-player-1"
                  type="text"
                  required
                  placeholder="e.g. Alex"
                  value={player1}
                  onChange={(e) => setPlayer1(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F4F5F3] dark:bg-[#1D2321] border border-[#E1E3DF] dark:border-[#26302B] rounded-xl text-sm text-[#111413] dark:text-[#F5F7F6] placeholder-[#8E9B95] focus:outline-none focus:border-[#197A4C] dark:focus:border-[#1F9D63]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A635E] dark:text-[#8E9B95] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#B8892F] dark:text-[#D6A84F]" />
                  Player 2 Name *
                </label>
                <input
                  id="input-player-2"
                  type="text"
                  required
                  placeholder="e.g. Marcus"
                  value={player2}
                  onChange={(e) => setPlayer2(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F4F5F3] dark:bg-[#1D2321] border border-[#E1E3DF] dark:border-[#26302B] rounded-xl text-sm text-[#111413] dark:text-[#F5F7F6] placeholder-[#8E9B95] focus:outline-none focus:border-[#197A4C] dark:focus:border-[#1F9D63]"
                />
              </div>
            </div>

            {/* Game Type & Scoring Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#5A635E] dark:text-[#8E9B95] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-[#B8892F] dark:text-[#D6A84F]" />
                  Discipline / Game Type
                </label>
                <select
                  id="select-game-type"
                  value={gameType}
                  onChange={(e) => setGameType(e.target.value as GameType)}
                  className="w-full px-3 py-2.5 bg-[#F4F5F3] dark:bg-[#1D2321] border border-[#E1E3DF] dark:border-[#26302B] rounded-xl text-sm text-[#111413] dark:text-[#F5F7F6] focus:outline-none focus:border-[#197A4C] dark:focus:border-[#1F9D63] cursor-pointer"
                >
                  {GAME_TYPES.map((gt) => (
                    <option key={gt} value={gt} className="bg-white dark:bg-[#151918] text-[#111413] dark:text-[#F5F7F6]">
                      {gt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A635E] dark:text-[#8E9B95] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#197A4C] dark:text-[#1F9D63]" />
                  Scoring System
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F4F5F3] dark:bg-[#1D2321] rounded-xl border border-[#E1E3DF] dark:border-[#26302B]">
                  <button
                    type="button"
                    onClick={() => setScoringMode('frames')}
                    className={`py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                      scoringMode === 'frames'
                        ? 'bg-[#197A4C] dark:bg-[#1F9D63] text-white shadow-xs font-semibold'
                        : 'text-[#5A635E] dark:text-[#8E9B95] hover:text-[#111413] dark:hover:text-[#F5F7F6]'
                    }`}
                  >
                    Frames / Racks
                  </button>
                  <button
                    type="button"
                    onClick={() => setScoringMode('points')}
                    className={`py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                      scoringMode === 'points'
                        ? 'bg-[#197A4C] dark:bg-[#1F9D63] text-white shadow-xs font-semibold'
                        : 'text-[#5A635E] dark:text-[#8E9B95] hover:text-[#111413] dark:hover:text-[#F5F7F6]'
                    }`}
                  >
                    Points Accum.
                  </button>
                </div>
              </div>
            </div>

            {/* Target Score & Match Label */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#5A635E] dark:text-[#8E9B95] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Race To / Target Score</span>
                  {scoringMode === 'points' && (
                    <span className="text-[10px] text-[#8E9B95] dark:text-[#616B66] font-mono lowercase tracking-normal">
                      (disabled in points accum)
                    </span>
                  )}
                </label>
                <div
                  id="target-score-selector-group"
                  className={`flex gap-1.5 transition-opacity ${
                    scoringMode === 'points' ? 'opacity-40 pointer-events-none' : ''
                  }`}
                >
                  {['5', '7', '9', '11'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      disabled={scoringMode === 'points'}
                      onClick={() => setTargetScore(val)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-colors ${
                        scoringMode !== 'points' && targetScore === val
                          ? 'bg-[#197A4C]/15 dark:bg-[#1F9D63]/20 border-[#197A4C] dark:border-[#1F9D63] text-[#197A4C] dark:text-[#1F9D63] font-bold'
                          : 'border-[#E1E3DF] dark:border-[#26302B] bg-[#F4F5F3] dark:bg-[#1D2321] text-[#5A635E] dark:text-[#8E9B95]'
                      } ${
                        scoringMode === 'points'
                          ? 'cursor-not-allowed'
                          : 'hover:text-[#111413] dark:hover:text-[#F5F7F6] cursor-pointer'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A635E] dark:text-[#8E9B95] uppercase tracking-wider mb-1.5">
                  Match Title (Optional)
                </label>
                <input
                  id="input-match-name"
                  type="text"
                  placeholder="e.g. Arena Masters - R1"
                  value={matchName}
                  onChange={(e) => setMatchName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F4F5F3] dark:bg-[#1D2321] border border-[#E1E3DF] dark:border-[#26302B] rounded-xl text-sm text-[#111413] dark:text-[#F5F7F6] placeholder-[#8E9B95] focus:outline-none focus:border-[#197A4C] dark:focus:border-[#1F9D63]"
                />
              </div>
            </div>

            {/* Tournament & Player Timers */}
            <div className="p-3.5 bg-[#F4F5F3] dark:bg-[#151918] rounded-xl border border-[#E1E3DF] dark:border-[#26302B] space-y-3">
              <div className="flex items-center justify-between border-b border-[#E1E3DF] dark:border-[#26302B] pb-2">
                <span className="text-xs font-bold text-[#111413] dark:text-[#F5F7F6] font-display uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#197A4C] dark:text-[#1F9D63]" />
                  Tournament Timers
                </span>
                <span className="text-[10px] font-mono text-[#5A635E] dark:text-[#8E9B95] uppercase">
                  Table & Shot Clocks
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Table Timer */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#5A635E] dark:text-[#8E9B95] uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Table Timer</span>
                    <span className="font-mono text-[#197A4C] dark:text-[#1F9D63] font-bold">
                      {tableTimerMinutes === '0' || !tableTimerMinutes ? 'Count Up' : `${tableTimerMinutes}m`}
                    </span>
                  </label>
                  <div className="flex gap-1 mb-1.5">
                    {['30', '45', '60', '0'].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setTableTimerMinutes(mins)}
                        className={`flex-1 py-1.5 text-[11px] font-mono font-bold rounded-lg border transition-colors cursor-pointer ${
                          tableTimerMinutes === mins
                            ? 'bg-[#197A4C] dark:bg-[#1F9D63] text-white border-[#197A4C] dark:border-[#1F9D63] shadow-xs'
                            : 'bg-white dark:bg-[#1D2321] text-[#5A635E] dark:text-[#8E9B95] border-[#E1E3DF] dark:border-[#26302B] hover:text-[#111413] dark:hover:text-[#F5F7F6]'
                        }`}
                      >
                        {mins === '0' ? 'Count Up' : `${mins}m`}
                      </button>
                    ))}
                  </div>
                  <input
                    id="input-table-timer"
                    type="number"
                    min="0"
                    max="180"
                    placeholder="Minutes (0 for count-up)"
                    value={tableTimerMinutes}
                    onChange={(e) => setTableTimerMinutes(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-[#1D2321] border border-[#E1E3DF] dark:border-[#26302B] rounded-lg text-xs font-mono text-[#111413] dark:text-[#F5F7F6] focus:outline-none focus:border-[#197A4C] dark:focus:border-[#1F9D63]"
                  />
                </div>

                {/* Player Timer / Shot Clock */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#5A635E] dark:text-[#8E9B95] uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Player Shot Clock</span>
                    <span className="font-mono text-[#B8892F] dark:text-[#D6A84F] font-bold">
                      {playerTimerSeconds === '0' || !playerTimerSeconds ? 'Off' : `${playerTimerSeconds}s`}
                    </span>
                  </label>
                  <div className="flex gap-1 mb-1.5">
                    {['30', '35', '45', '60'].map((secs) => (
                      <button
                        key={secs}
                        type="button"
                        onClick={() => setPlayerTimerSeconds(secs)}
                        className={`flex-1 py-1.5 text-[11px] font-mono font-bold rounded-lg border transition-colors cursor-pointer ${
                          playerTimerSeconds === secs
                            ? 'bg-[#B8892F] dark:bg-[#D6A84F] text-white dark:text-[#0B0D0C] border-[#B8892F] dark:border-[#D6A84F] shadow-xs'
                            : 'bg-white dark:bg-[#1D2321] text-[#5A635E] dark:text-[#8E9B95] border-[#E1E3DF] dark:border-[#26302B] hover:text-[#111413] dark:hover:text-[#F5F7F6]'
                        }`}
                      >
                        {secs}s
                      </button>
                    ))}
                  </div>
                  <input
                    id="input-player-timer"
                    type="number"
                    min="0"
                    max="120"
                    placeholder="Seconds (0 to disable)"
                    value={playerTimerSeconds}
                    onChange={(e) => setPlayerTimerSeconds(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-[#1D2321] border border-[#E1E3DF] dark:border-[#26302B] rounded-lg text-xs font-mono text-[#111413] dark:text-[#F5F7F6] focus:outline-none focus:border-[#B8892F] dark:focus:border-[#D6A84F]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Footer CTA - Always visible on mobile */}
          <div className="shrink-0 flex items-center justify-between sm:justify-end gap-3 px-4 sm:px-6 py-3.5 border-t border-[#E1E3DF] dark:border-[#26302B] bg-[#F4F5F3] dark:bg-[#151918] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.3)] z-10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-[#5A635E] hover:text-[#111413] dark:text-[#8E9B95] dark:hover:text-[#F5F7F6] rounded-xl hover:bg-[#EBECE8] dark:hover:bg-[#1D2321] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="btn-submit-start-game"
              type="submit"
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#197A4C] dark:bg-[#1F9D63] hover:bg-[#14643E] dark:hover:bg-[#26B372] active:scale-[0.98] text-white text-xs sm:text-sm font-bold font-display uppercase tracking-wider rounded-xl shadow-lg shadow-[#1F9D63]/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch Table 0{selectedTableId}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
