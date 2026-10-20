import React, { useState } from 'react';
import { X, Check, Settings2 } from 'lucide-react';
import { Game } from '../types.ts';

interface MatchSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: Game;
  onSaveSetup: (updates: {
    player1: string;
    player2: string;
    targetScore?: number;
    playerTimerSeconds: number;
    tableTimerMinutes: number;
  }) => void;
}

export const MatchSetupModal: React.FC<MatchSetupModalProps> = ({
  isOpen,
  onClose,
  game,
  onSaveSetup,
}) => {
  const [p1, setP1] = useState(game.player1);
  const [p2, setP2] = useState(game.player2);
  const [target, setTarget] = useState<number | undefined>(game.targetScore);
  const [shotSecs, setShotSecs] = useState<number>(game.playerTimerSeconds || 30);
  const [tableMins, setTableMins] = useState<number>(game.tableTimerMinutes || 45);

  React.useEffect(() => {
    if (isOpen) {
      setP1(game.player1);
      setP2(game.player2);
      setTarget(game.targetScore);
      setShotSecs(game.playerTimerSeconds || 30);
      setTableMins(game.tableTimerMinutes || 45);
    }
  }, [isOpen, game]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSetup({
      player1: p1.trim() || game.player1,
      player2: p2.trim() || game.player2,
      targetScore: game.scoringMode === 'points' ? undefined : (target && target > 0 ? target : undefined),
      playerTimerSeconds: shotSecs,
      tableTimerMinutes: tableMins,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#151918] border border-[#26302B] rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#26302B]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#1F9D63]/15 text-[#1F9D63] flex items-center justify-center border border-[#1F9D63]/30">
              <Settings2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold font-display text-[#F5F7F6]">
                Match Setup
              </h3>
              <p className="text-[11px] text-[#8E9B95] font-mono">
                Table 0{game.tableId} • {game.gameType}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#9BA3A0] hover:text-white hover:bg-[#1E2522] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-[10px] font-mono uppercase font-bold text-[#8E9B95] tracking-wider block mb-1">
              Player 1 Name
            </label>
            <input
              type="text"
              value={p1}
              onChange={(e) => setP1(e.target.value)}
              className="w-full px-3 py-2 bg-[#0B0D0C] border border-[#26302B] rounded-xl text-sm font-display text-[#F5F7F6] focus:outline-none focus:border-[#1F9D63]"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase font-bold text-[#8E9B95] tracking-wider block mb-1">
              Player 2 Name
            </label>
            <input
              type="text"
              value={p2}
              onChange={(e) => setP2(e.target.value)}
              className="w-full px-3 py-2 bg-[#0B0D0C] border border-[#26302B] rounded-xl text-sm font-display text-[#F5F7F6] focus:outline-none focus:border-[#1F9D63]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-mono uppercase font-bold text-[#8E9B95] tracking-wider block mb-1">
                Target Score (Race To) {game.scoringMode === 'points' && <span className="text-[#616B66] lowercase">(n/a for points)</span>}
              </label>
              <input
                type="number"
                min="1"
                disabled={game.scoringMode === 'points'}
                value={game.scoringMode === 'points' ? '' : (target ?? '')}
                onChange={(e) => setTarget(parseInt(e.target.value) || undefined)}
                placeholder={game.scoringMode === 'points' ? 'Disabled (Points Accum)' : 'None'}
                className="w-full px-3 py-2 bg-[#0B0D0C] border border-[#26302B] rounded-xl text-sm font-mono text-[#F5F7F6] focus:outline-none focus:border-[#D6A84F] disabled:opacity-40 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase font-bold text-[#8E9B95] tracking-wider block mb-1">
                Shot Clock (Seconds)
              </label>
              <select
                value={shotSecs}
                onChange={(e) => setShotSecs(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-[#0B0D0C] border border-[#26302B] rounded-xl text-sm font-mono text-[#F5F7F6] focus:outline-none focus:border-[#1F9D63]"
              >
                <option value={25}>25 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={35}>35 seconds</option>
                <option value={45}>45 seconds</option>
                <option value={60}>60 seconds</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase font-bold text-[#8E9B95] tracking-wider block mb-1">
              Table Timer Limit (Minutes)
            </label>
            <select
              value={tableMins}
              onChange={(e) => setTableMins(parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-[#0B0D0C] border border-[#26302B] rounded-xl text-sm font-mono text-[#F5F7F6] focus:outline-none focus:border-[#1F9D63]"
            >
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={90}>90 minutes</option>
              <option value={120}>120 minutes</option>
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-[#1E2522] hover:bg-[#28322E] text-[#9BA3A0] rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-[#1F9D63] hover:bg-[#26B372] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#1F9D63]/25 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Update Setup</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
