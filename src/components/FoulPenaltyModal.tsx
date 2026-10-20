import React, { useState } from 'react';
import { X, ShieldAlert, Check } from 'lucide-react';

interface FoulPenaltyModalProps {
  isOpen: boolean;
  onClose: () => void;
  player1Name: string;
  player2Name: string;
  defaultFoulingPlayerIndex: 0 | 1;
  onConfirmFoul: (foulingPlayerIndex: 0 | 1, penaltyPoints: number, reason: string) => void;
}

export const FoulPenaltyModal: React.FC<FoulPenaltyModalProps> = ({
  isOpen,
  onClose,
  player1Name,
  player2Name,
  defaultFoulingPlayerIndex,
  onConfirmFoul,
}) => {
  const [foulingPlayerIndex, setFoulingPlayerIndex] = useState<0 | 1>(defaultFoulingPlayerIndex);
  const [selectedPoints, setSelectedPoints] = useState<number>(4);
  const [customReason, setCustomReason] = useState<string>('Standard Foul (In-off / Miss)');

  React.useEffect(() => {
    if (isOpen) {
      setFoulingPlayerIndex(defaultFoulingPlayerIndex);
      setSelectedPoints(4);
      setCustomReason('Standard Foul');
    }
  }, [isOpen, defaultFoulingPlayerIndex]);

  if (!isOpen) return null;

  const foulingName = foulingPlayerIndex === 0 ? player1Name : player2Name;
  const opponentName = foulingPlayerIndex === 0 ? player2Name : player1Name;

  const PENALTY_OPTIONS = [
    { points: 4, label: 'Standard Foul', desc: 'Cue ball in pocket, touch, or miss (+4 pts)' },
    { points: 5, label: 'Blue Ball Foul', desc: 'Foul on Blue ball (+5 pts)' },
    { points: 6, label: 'Pink Ball Foul', desc: 'Foul on Pink ball (+6 pts)' },
    { points: 7, label: 'Black Ball Foul', desc: 'Foul on Black ball (+7 pts)' },
    { points: 0, label: 'Warning Only', desc: 'Foul registered with 0 penalty points' },
  ];

  const handleApply = () => {
    onConfirmFoul(foulingPlayerIndex, selectedPoints, customReason);
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
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#26302B]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold font-display text-rose-400">
                Record Foul & Penalty
              </h3>
              <p className="text-[11px] text-[#8E9B95] font-mono">
                Points awarded to {opponentName}
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

        {/* Fouling Player Selection */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono uppercase font-bold text-[#8E9B95] tracking-wider">
            Who committed the foul?
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFoulingPlayerIndex(0)}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold font-display truncate transition-all cursor-pointer ${
                foulingPlayerIndex === 0
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-md shadow-rose-950/30'
                  : 'bg-[#101412] border-[#26302B] text-[#9BA3A0] hover:text-white'
              }`}
            >
              {player1Name}
            </button>
            <button
              type="button"
              onClick={() => setFoulingPlayerIndex(1)}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold font-display truncate transition-all cursor-pointer ${
                foulingPlayerIndex === 1
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-md shadow-rose-950/30'
                  : 'bg-[#101412] border-[#26302B] text-[#9BA3A0] hover:text-white'
              }`}
            >
              {player2Name}
            </button>
          </div>
        </div>

        {/* Penalty Options */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono uppercase font-bold text-[#8E9B95] tracking-wider">
            Penalty Points (to {opponentName})
          </label>
          <div className="space-y-1.5">
            {PENALTY_OPTIONS.map((opt) => (
              <button
                key={opt.points}
                type="button"
                onClick={() => {
                  setSelectedPoints(opt.points);
                  setCustomReason(opt.label);
                }}
                className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  selectedPoints === opt.points
                    ? 'bg-rose-500/15 border-rose-500/40 text-white'
                    : 'bg-[#0B0D0C] border-[#26302B] text-[#9BA3A0] hover:text-[#F5F7F6]'
                }`}
              >
                <div>
                  <div className="text-xs font-bold font-display text-[#F5F7F6]">
                    {opt.label}
                  </div>
                  <div className="text-[10px] text-[#8E9B95]">
                    {opt.desc}
                  </div>
                </div>
                <span className="text-sm font-mono font-black text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded-lg border border-rose-500/30">
                  +{opt.points}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Summary note */}
        <div className="p-2.5 bg-[#0B0D0C] rounded-xl border border-[#26302B] text-[11px] text-[#8E9B95] leading-relaxed">
          <span className="text-rose-400 font-bold">{foulingName}</span> will be charged with a foul. <span className="text-[#1F9D63] font-bold">+{selectedPoints} points</span> will be awarded to <span className="text-[#F5F7F6] font-bold">{opponentName}</span>, and the shooting turn will pass to <span className="text-[#F5F7F6] font-bold">{opponentName}</span> with a fresh shot clock.
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-[#1E2522] hover:bg-[#28322E] text-[#9BA3A0] rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-rose-950/40 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Apply Foul</span>
          </button>
        </div>
      </div>
    </div>
  );
};
