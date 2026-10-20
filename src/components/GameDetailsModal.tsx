import React from 'react';
import { X, Trophy, Clock, Calendar, User, ShieldAlert, Award, Activity } from 'lucide-react';
import { Game } from '../types.ts';

interface GameDetailsModalProps {
  game: Game | null;
  isOpen: boolean;
  onClose: () => void;
}

export const GameDetailsModal: React.FC<GameDetailsModalProps> = ({ game, isOpen, onClose }) => {
  if (!isOpen || !game) return null;

  const durationSecs = Math.floor(((game.endTime || Date.now()) - game.startTime) / 1000);
  const durationMins = Math.floor(durationSecs / 60);

  // Score progression points
  const pointsHistory = game.history.filter((h) => h.type === 'point');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#151918] border border-[#E1E3DF] dark:border-[#26302B] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E1E3DF] dark:border-[#26302B] bg-[#F4F5F3] dark:bg-[#1D2321]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#B8892F]/15 dark:bg-[#D6A84F]/15 border border-[#B8892F]/30 dark:border-[#D6A84F]/30 text-[#B8892F] dark:text-[#D6A84F] flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111413] dark:text-[#F5F7F6] font-display uppercase tracking-tight">
                {game.matchName || `${game.gameType} Match`}
              </h2>
              <p className="text-xs text-[#5A635E] dark:text-[#8E9B95]">
                Table 0{game.tableId} • {game.gameType} • {game.scoringMode === 'frames' ? 'Frame Scoring' : 'Points Accum.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#5A635E] hover:text-[#111413] dark:text-[#8E9B95] dark:hover:text-[#F5F7F6] p-1.5 rounded-lg hover:bg-[#EBECE8] dark:hover:bg-[#26302B] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Winner banner */}
          {game.winner && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#F4F5F3] dark:bg-[#1D2321] border border-[#B8892F]/30 dark:border-[#D6A84F]/40 shadow-xs">
              <div className="flex items-center gap-3">
                <Award className="w-6 h-6 text-[#B8892F] dark:text-[#D6A84F]" />
                <div>
                  <p className="text-xs font-mono font-bold uppercase tracking-wider text-[#B8892F] dark:text-[#D6A84F]">
                    Match Winner
                  </p>
                  <p className="text-lg font-bold text-[#111413] dark:text-[#F5F7F6] font-display uppercase tracking-tight">
                    {game.winner}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black font-display text-[#197A4C] dark:text-[#1F9D63] font-mono-digits">
                  {game.score1} <span className="text-[#8E9B95] dark:text-[#616B66]">—</span> {game.score2}
                </span>
                {game.targetScore && (
                  <p className="text-[10px] font-mono text-[#5A635E] dark:text-[#8E9B95] uppercase">Target: {game.targetScore}</p>
                )}
              </div>
            </div>
          )}

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-[#F4F5F3] dark:bg-[#1D2321] rounded-xl border border-[#E1E3DF] dark:border-[#26302B]">
              <Clock className="w-4 h-4 mx-auto text-[#5A635E] dark:text-[#8E9B95] mb-1" />
              <p className="text-xs text-[#5A635E] dark:text-[#8E9B95]">Duration</p>
              <p className="text-sm font-bold font-mono text-[#111413] dark:text-[#F5F7F6] mt-0.5">
                {durationMins} mins
              </p>
            </div>
            <div className="p-3 bg-[#F4F5F3] dark:bg-[#1D2321] rounded-xl border border-[#E1E3DF] dark:border-[#26302B]">
              <ShieldAlert className="w-4 h-4 mx-auto text-rose-500 mb-1" />
              <p className="text-xs text-[#5A635E] dark:text-[#8E9B95]">Fouls</p>
              <p className="text-sm font-bold font-mono text-[#111413] dark:text-[#F5F7F6] mt-0.5">
                {game.fouls1} vs {game.fouls2}
              </p>
            </div>
            <div className="p-3 bg-[#F4F5F3] dark:bg-[#1D2321] rounded-xl border border-[#E1E3DF] dark:border-[#26302B]">
              <Calendar className="w-4 h-4 mx-auto text-[#197A4C] dark:text-[#1F9D63] mb-1" />
              <p className="text-xs text-[#5A635E] dark:text-[#8E9B95]">Date</p>
              <p className="text-sm font-bold font-mono text-[#111413] dark:text-[#F5F7F6] mt-0.5">
                {new Date(game.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Player Breakdown */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#5A635E] dark:text-[#8E9B95]">
              Contestants
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`p-3.5 rounded-xl border ${
                  game.winner === game.player1
                    ? 'border-[#197A4C]/50 dark:border-[#1F9D63]/50 bg-[#197A4C]/10 dark:bg-[#1F9D63]/10'
                    : 'border-[#E1E3DF] dark:border-[#26302B] bg-[#F4F5F3] dark:bg-[#1D2321]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-[#5A635E] dark:text-[#8E9B95]">Player 1</span>
                  {game.winner === game.player1 && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#197A4C] dark:bg-[#1F9D63] text-white">
                      WINNER
                    </span>
                  )}
                </div>
                <p className="text-base font-bold text-[#111413] dark:text-[#F5F7F6] mt-1 truncate">
                  {game.player1}
                </p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E1E3DF] dark:border-[#26302B] text-xs">
                  <span className="text-[#5A635E] dark:text-[#8E9B95]">Score</span>
                  <span className="font-bold text-[#111413] dark:text-[#F5F7F6] font-mono">
                    {game.score1}
                  </span>
                </div>
              </div>

              <div
                className={`p-3.5 rounded-xl border ${
                  game.winner === game.player2
                    ? 'border-[#197A4C]/50 dark:border-[#1F9D63]/50 bg-[#197A4C]/10 dark:bg-[#1F9D63]/10'
                    : 'border-[#E1E3DF] dark:border-[#26302B] bg-[#F4F5F3] dark:bg-[#1D2321]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-[#5A635E] dark:text-[#8E9B95]">Player 2</span>
                  {game.winner === game.player2 && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#197A4C] dark:bg-[#1F9D63] text-white">
                      WINNER
                    </span>
                  )}
                </div>
                <p className="text-base font-bold text-[#111413] dark:text-[#F5F7F6] mt-1 truncate">
                  {game.player2}
                </p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E1E3DF] dark:border-[#26302B] text-xs">
                  <span className="text-[#5A635E] dark:text-[#8E9B95]">Score</span>
                  <span className="font-bold text-[#111413] dark:text-[#F5F7F6] font-mono">
                    {game.score2}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Score Timeline / Action Log */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#5A635E] dark:text-[#8E9B95] flex items-center justify-between">
              <span>Shot Timeline ({game.history.length})</span>
              <Activity className="w-3.5 h-3.5 text-[#5A635E] dark:text-[#8E9B95]" />
            </h4>

            <div className="max-h-56 overflow-y-auto space-y-1.5 p-2 bg-[#F4F5F3] dark:bg-[#1D2321] rounded-xl border border-[#E1E3DF] dark:border-[#26302B]">
              {game.history.length === 0 ? (
                <p className="text-xs text-center text-[#5A635E] dark:text-[#8E9B95] py-4">No logged shot events</p>
              ) : (
                game.history.map((h) => {
                  return (
                    <div
                      key={h.id}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#151918] text-xs border border-[#E1E3DF] dark:border-[#26302B]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#5A635E] dark:text-[#8E9B95] font-mono">
                          {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className="font-medium text-[#111413] dark:text-[#F5F7F6]">
                          {h.type === 'game_start'
                            ? 'Match started'
                            : h.type === 'foul'
                            ? `Foul (${h.playerIndex === 0 ? game.player1 : game.player2})`
                            : h.type === 'game_end'
                            ? 'Match concluded'
                            : `${h.actor || (h.playerIndex === 0 ? game.player1 : game.player2)} point`}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-[#197A4C] dark:text-[#1F9D63]">
                        {h.score1After} — {h.score2After}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E1E3DF] dark:border-[#26302B] bg-[#F4F5F3] dark:bg-[#1D2321] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#197A4C] dark:bg-[#1F9D63] hover:bg-[#14643E] dark:hover:bg-[#26B372] text-white text-xs font-bold font-display uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
