import React, { useState } from 'react';
import { X, Check, Plus, Minus } from 'lucide-react';

interface DirectEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  player1Name: string;
  player2Name: string;
  initialScore1: number;
  initialScore2: number;
  onSave: (score1: number, score2: number) => void;
}

export const DirectEntryModal: React.FC<DirectEntryModalProps> = ({
  isOpen,
  onClose,
  player1Name,
  player2Name,
  initialScore1,
  initialScore2,
  onSave,
}) => {
  const [s1, setS1] = useState<number>(initialScore1);
  const [s2, setS2] = useState<number>(initialScore2);

  // Sync state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setS1(initialScore1);
      setS2(initialScore2);
    }
  }, [isOpen, initialScore1, initialScore2]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(Math.max(0, s1), Math.max(0, s2));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#151918] border border-[#26302B] rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#26302B]">
          <div>
            <h3 className="text-base font-bold font-display text-[#F5F7F6]">
              Direct Score Entry
            </h3>
            <p className="text-[11px] text-[#8E9B95] font-mono">
              Adjust or override points directly
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#9BA3A0] hover:text-white hover:bg-[#1E2522] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Player 1 Entry */}
          <div className="bg-[#0B0D0C] p-3.5 rounded-2xl border border-[#26302B] space-y-2">
            <span className="text-xs font-mono font-bold text-[#1F9D63] uppercase tracking-wider block truncate">
              {player1Name} (Player 1)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setS1((prev) => Math.max(0, prev - 1))}
                className="w-10 h-10 rounded-xl bg-[#1E2522] hover:bg-[#28322E] text-[#9BA3A0] flex items-center justify-center cursor-pointer border border-[#26302B]"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min="0"
                value={s1}
                onChange={(e) => setS1(Math.max(0, parseInt(e.target.value) || 0))}
                className="flex-1 h-10 text-center bg-[#151918] border border-[#26302B] rounded-xl text-xl font-bold font-mono text-[#F5F7F6] focus:outline-none focus:border-[#1F9D63]"
              />
              <button
                type="button"
                onClick={() => setS1((prev) => prev + 1)}
                className="w-10 h-10 rounded-xl bg-[#1E2522] hover:bg-[#28322E] text-[#9BA3A0] flex items-center justify-center cursor-pointer border border-[#26302B]"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setS1((prev) => prev + 5)}
                className="px-2.5 h-10 rounded-xl bg-[#1F9D63]/15 hover:bg-[#1F9D63]/25 text-[#1F9D63] text-xs font-bold font-mono cursor-pointer border border-[#1F9D63]/30"
              >
                +5
              </button>
            </div>
          </div>

          {/* Player 2 Entry */}
          <div className="bg-[#0B0D0C] p-3.5 rounded-2xl border border-[#26302B] space-y-2">
            <span className="text-xs font-mono font-bold text-[#D6A84F] uppercase tracking-wider block truncate">
              {player2Name} (Player 2)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setS2((prev) => Math.max(0, prev - 1))}
                className="w-10 h-10 rounded-xl bg-[#1E2522] hover:bg-[#28322E] text-[#9BA3A0] flex items-center justify-center cursor-pointer border border-[#26302B]"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min="0"
                value={s2}
                onChange={(e) => setS2(Math.max(0, parseInt(e.target.value) || 0))}
                className="flex-1 h-10 text-center bg-[#151918] border border-[#26302B] rounded-xl text-xl font-bold font-mono text-[#F5F7F6] focus:outline-none focus:border-[#D6A84F]"
              />
              <button
                type="button"
                onClick={() => setS2((prev) => prev + 1)}
                className="w-10 h-10 rounded-xl bg-[#1E2522] hover:bg-[#28322E] text-[#9BA3A0] flex items-center justify-center cursor-pointer border border-[#26302B]"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setS2((prev) => prev + 5)}
                className="px-2.5 h-10 rounded-xl bg-[#D6A84F]/15 hover:bg-[#D6A84F]/25 text-[#D6A84F] text-xs font-bold font-mono cursor-pointer border border-[#D6A84F]/30"
              >
                +5
              </button>
            </div>
          </div>

          {/* Actions */}
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
              <span>Apply Scores</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
