import React, { useState } from 'react';
import {
  Flame,
  Tv,
  PlusCircle,
  ExternalLink,
  Pause,
  Play,
  StopCircle,
  Clock,
  Trophy,
  ShieldAlert,
} from 'lucide-react';
import { useStore } from '../hooks/useStore.ts';
import { useRouter } from '../context/RouterContext.tsx';
import { StartGameModal } from '../components/StartGameModal.tsx';
import { useToast } from '../context/ToastContext.tsx';

export const LiveGamesPage: React.FC = () => {
  const {
    tables,
    activeGames,
    updateScore,
    pauseGame,
    resumeGame,
    endGame,
    currentUser,
  } = useStore();
  const { navigate } = useRouter();
  const { showToast } = useToast();

  const [startModalOpen, setStartModalOpen] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState(1);

  const activeGamesList = Object.values(activeGames);
  const isStaff = currentUser.role === 'admin' || currentUser.role === 'staff';

  const handleEnd = (tableId: number) => {
    if (window.confirm(`Are you sure you want to conclude Table 0${tableId}?`)) {
      endGame(tableId);
      showToast('Game Concluded', `Table 0${tableId} moved to history`, 'info');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#197A4C]/10 dark:bg-[#1F9D63]/15 text-[#197A4C] dark:text-[#1F9D63] border border-[#197A4C]/25 dark:border-[#1F9D63]/30 text-xs font-mono font-bold uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-[#197A4C] dark:bg-[#1F9D63] animate-pulse" />
            Live Scorer Feeds
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111413] dark:text-[#F5F7F6] font-display uppercase tracking-tight">
            Live Matches ({activeGamesList.length})
          </h1>
          <p className="text-sm text-[#5A635E] dark:text-[#8E9B95] mt-1">
            Real-time feed across all active tables. Changes sync immediately to all screens.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/display')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#EBECE8] hover:bg-[#E1E3DF] dark:bg-[#151918] dark:hover:bg-[#1D2321] text-[#111413] dark:text-[#F5F7F6] rounded-xl text-xs font-display font-bold uppercase tracking-wider border border-[#E1E3DF] dark:border-[#26302B] transition-colors cursor-pointer"
          >
            <Tv className="w-4 h-4 text-[#197A4C] dark:text-[#1F9D63]" />
            <span>TV Broadcast</span>
          </button>

          <button
            onClick={() => {
              const freeTable = tables.find((t) => t.status === 'available');
              setSelectedTableId(freeTable ? freeTable.id : 1);
              setStartModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#197A4C] dark:bg-[#1F9D63] hover:bg-[#14643E] dark:hover:bg-[#1F9D63]/90 text-white rounded-xl text-xs font-display font-bold uppercase tracking-wider shadow-lg shadow-[#1F9D63]/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Start Match</span>
          </button>
        </div>
      </div>

      {/* Active Games Grid */}
      {activeGamesList.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#151918] rounded-3xl border border-[#E1E3DF] dark:border-[#26302B] shadow-sm space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[#F4F5F3] dark:bg-[#1D2321] text-[#8E9B95] flex items-center justify-center mx-auto border border-[#E1E3DF] dark:border-[#26302B]">
            <Flame className="w-8 h-8 text-[#B8892F] dark:text-[#D6A84F]" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-display uppercase tracking-tight text-[#111413] dark:text-[#F5F7F6]">
              No Matches Currently In Play
            </h3>
            <p className="text-xs text-[#5A635E] dark:text-[#8E9B95] mt-1">
              All 6 tables are available or under maintenance. Launch a match or scan a table QR code.
            </p>
          </div>
          <button
            onClick={() => setStartModalOpen(true)}
            className="px-5 py-2.5 bg-[#197A4C] dark:bg-[#1F9D63] hover:bg-[#14643E] dark:hover:bg-[#1F9D63]/90 text-white text-xs font-display font-bold uppercase tracking-wider rounded-xl shadow-md transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Launch New Match</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {activeGamesList.map((game) => {
            const table = tables.find((t) => t.id === game.tableId);

            return (
              <div
                key={game.id}
                className="bg-white dark:bg-[#151918] rounded-2xl border border-[#E1E3DF] dark:border-[#26302B] p-5 shadow-sm space-y-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#E1E3DF] dark:border-[#26302B]">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded-xl bg-[#197A4C] dark:bg-[#1F9D63] text-white font-mono font-bold text-xs">
                      Table 0{game.tableId}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-[#111413] dark:text-[#F5F7F6] font-display uppercase tracking-tight">
                        {game.matchName || `${game.gameType} Match`}
                      </h3>
                      <p className="text-[11px] text-[#5A635E] dark:text-[#8E9B95]">
                        {game.gameType} • {game.scoringMode === 'frames' ? 'Frames' : 'Points'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                        game.status === 'playing'
                          ? 'bg-[#197A4C]/10 dark:bg-[#1F9D63]/15 text-[#197A4C] dark:text-[#1F9D63] border border-[#197A4C]/25 dark:border-[#1F9D63]/30'
                          : 'bg-[#B8892F]/10 dark:bg-[#D6A84F]/15 text-[#B8892F] dark:text-[#D6A84F] border border-[#B8892F]/25 dark:border-[#D6A84F]/30'
                      }`}
                    >
                      {game.status}
                    </span>
                    <button
                      onClick={() => navigate(`/table/${game.tableId}`)}
                      className="p-1.5 text-[#5A635E] dark:text-[#8E9B95] hover:text-[#197A4C] dark:hover:text-[#1F9D63] rounded-lg hover:bg-[#EBECE8] dark:hover:bg-[#1D2321] transition-colors cursor-pointer"
                      title="Open Fullscreen Scorer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Scoreboard Display with Quick Controls */}
                <div className="grid grid-cols-5 items-center p-4 bg-[#F4F5F3] dark:bg-[#1D2321] rounded-2xl border border-[#E1E3DF] dark:border-[#26302B]">
                  {/* Player 1 */}
                  <div className="col-span-2 text-left">
                    <span className="text-[10px] font-mono uppercase text-[#5A635E] dark:text-[#8E9B95]">P1</span>
                    <p className="text-base font-bold text-[#111413] dark:text-[#F5F7F6] truncate">
                      {game.player1}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      <button
                        onClick={() => updateScore(game.tableId, 0, 1)}
                        className="w-7 h-7 rounded-lg bg-[#197A4C] dark:bg-[#1F9D63] text-white flex items-center justify-center font-bold text-xs hover:bg-[#14643E] dark:hover:bg-[#1F9D63]/90 cursor-pointer"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => updateScore(game.tableId, 0, -1)}
                        disabled={game.score1 <= 0}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-[#151918] border border-[#E1E3DF] dark:border-[#26302B] text-[#111413] dark:text-[#F5F7F6] flex items-center justify-center font-bold text-xs disabled:opacity-40 cursor-pointer"
                      >
                        -1
                      </button>
                    </div>
                  </div>

                  {/* Digits */}
                  <div className="col-span-1 text-center">
                    <span className="font-display font-black text-3xl sm:text-4xl text-[#111413] dark:text-[#F5F7F6] font-mono-digits">
                      {game.score1} <span className="text-[#8E9B95] dark:text-[#616B66]">:</span> {game.score2}
                    </span>
                    {game.targetScore && (
                      <span className="text-[10px] font-mono font-bold text-[#B8892F] dark:text-[#D6A84F] block mt-1 uppercase tracking-wider">
                        Race to {game.targetScore}
                      </span>
                    )}
                  </div>

                  {/* Player 2 */}
                  <div className="col-span-2 text-right">
                    <span className="text-[10px] font-mono uppercase text-[#5A635E] dark:text-[#8E9B95]">P2</span>
                    <p className="text-base font-bold text-[#111413] dark:text-[#F5F7F6] truncate">
                      {game.player2}
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-2">
                      <button
                        onClick={() => updateScore(game.tableId, 1, -1)}
                        disabled={game.score2 <= 0}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-[#151918] border border-[#E1E3DF] dark:border-[#26302B] text-[#111413] dark:text-[#F5F7F6] flex items-center justify-center font-bold text-xs disabled:opacity-40 cursor-pointer"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => updateScore(game.tableId, 1, 1)}
                        className="w-7 h-7 rounded-lg bg-[#197A4C] dark:bg-[#1F9D63] text-white flex items-center justify-center font-bold text-xs hover:bg-[#14643E] dark:hover:bg-[#1F9D63]/90 cursor-pointer"
                      >
                        +1
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[#5A635E] dark:text-[#8E9B95] font-mono flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Started {new Date(game.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  <div className="flex items-center gap-2">
                    {game.status === 'playing' ? (
                      <button
                        onClick={() => pauseGame(game.tableId)}
                        className="px-2.5 py-1 rounded-lg bg-[#EBECE8] hover:bg-[#E1E3DF] dark:bg-[#1D2321] dark:hover:bg-[#26302B] border border-[#E1E3DF] dark:border-[#26302B] text-[#B8892F] dark:text-[#D6A84F] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => resumeGame(game.tableId)}
                        className="px-2.5 py-1 rounded-lg bg-[#197A4C]/10 dark:bg-[#1F9D63]/15 text-[#197A4C] dark:text-[#1F9D63] border border-[#197A4C]/25 dark:border-[#1F9D63]/30 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Resume</span>
                      </button>
                    )}

                    {isStaff && (
                      <button
                        onClick={() => handleEnd(game.tableId)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <StopCircle className="w-3.5 h-3.5" />
                        <span>Finish</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <StartGameModal
        tableId={selectedTableId}
        isOpen={startModalOpen}
        onClose={() => setStartModalOpen(false)}
        onGameStarted={(id) => navigate(`/table/${id}`)}
      />
    </div>
  );
};
