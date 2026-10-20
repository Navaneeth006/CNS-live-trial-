import React, { useState } from 'react';
import {
  CircleDot,
  Flame,
  CheckCircle2,
  PlusCircle,
  Tv,
  ArrowRight,
} from 'lucide-react';
import { useStore } from '../hooks/useStore.ts';
import { TableCard } from '../components/TableCard.tsx';
import { StartGameModal } from '../components/StartGameModal.tsx';
import { QRCodeView } from '../components/QRCodeView.tsx';
import { useRouter } from '../context/RouterContext.tsx';

export const DashboardPage: React.FC = () => {
  const { tables, activeGames, history } = useStore();
  const { navigate } = useRouter();

  const [startModalOpen, setStartModalOpen] = useState(false);
  const [startTableId, setStartTableId] = useState<number>(1);
  const [qrModalTableId, setQrModalTableId] = useState<number | null>(null);

  // Metrics
  const totalTables = 6;
  const activeGamesCount = Object.keys(activeGames).length;
  const availableTablesCount = tables.filter((t) => t.status === 'available').length;
  const completedTodayCount = history.length;

  const handleOpenStart = (tableId?: number) => {
    setStartTableId(tableId || 1);
    setStartModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#197A4C]/10 text-[#197A4C] dark:bg-[#1F9D63]/15 dark:text-[#1F9D63] border border-[#197A4C]/20 dark:border-[#1F9D63]/30 text-xs font-mono font-bold tracking-wider uppercase mb-2">
            <span className="w-2 h-2 rounded-full bg-[#197A4C] dark:bg-[#1F9D63] animate-pulse" />
            Arena Telemetry Active
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111413] dark:text-[#F5F7F6] font-display tracking-tight">
            Midnight Arena Control
          </h1>
          <p className="text-sm text-[#5A635E] dark:text-[#9BA3A0] mt-1">
            Real-time scoring, table status, and broadcast telemetry for 6 physical tables.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-dash-tv-display"
            onClick={() => navigate('/display')}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-[#EBECE8] hover:bg-[#E1E3DF] dark:bg-[#1D2321] dark:hover:bg-[#222927] text-[#111413] dark:text-[#F5F7F6] rounded-xl text-xs font-bold font-display uppercase tracking-wider border border-[#E1E3DF] dark:border-[#26302B] transition-colors cursor-pointer"
          >
            <Tv className="w-4 h-4 text-[#197A4C] dark:text-[#1F9D63]" />
            <span>TV Scoreboard</span>
          </button>

          <button
            id="btn-dash-start-match"
            onClick={() => handleOpenStart()}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#197A4C] dark:bg-[#1F9D63] hover:bg-[#14643E] dark:hover:bg-[#26B372] text-white rounded-xl text-xs font-bold font-display uppercase tracking-wider shadow-md shadow-[#1F9D63]/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Match</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tables */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151918] border border-[#E1E3DF] dark:border-[#26302B] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#8E9B95] dark:text-[#616B66] font-display">Total Tables</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#111413] dark:text-[#F5F7F6] font-display mt-1 font-mono-digits">
              0{totalTables}
            </p>
            <span className="text-[11px] text-[#8E9B95] dark:text-[#616B66]">Tournament Standard</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#F4F5F3] dark:bg-[#1D2321] text-[#111413] dark:text-[#F5F7F6] border border-[#E1E3DF] dark:border-[#26302B] flex items-center justify-center font-black">
            <CircleDot className="w-5 h-5 text-[#197A4C] dark:text-[#1F9D63]" />
          </div>
        </div>

        {/* Active Games */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151918] border border-[#E1E3DF] dark:border-[#26302B] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#8E9B95] dark:text-[#616B66] font-display">Live Matches</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#197A4C] dark:text-[#1F9D63] font-display mt-1 font-mono-digits">
              0{activeGamesCount}
            </p>
            <span className="text-[11px] text-[#197A4C] dark:text-[#1F9D63] font-medium">In play or rack break</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#197A4C]/10 dark:bg-[#1F9D63]/15 border border-[#197A4C]/25 dark:border-[#1F9D63]/30 text-[#197A4C] dark:text-[#1F9D63] flex items-center justify-center font-black">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Available Tables */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151918] border border-[#E1E3DF] dark:border-[#26302B] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#8E9B95] dark:text-[#616B66] font-display">Available Tables</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#111413] dark:text-[#F5F7F6] font-display mt-1 font-mono-digits">
              0{availableTablesCount}
            </p>
            <span className="text-[11px] text-[#8E9B95] dark:text-[#616B66]">Ready for players</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#F4F5F3] dark:bg-[#1D2321] text-[#5A635E] dark:text-[#9BA3A0] border border-[#E1E3DF] dark:border-[#26302B] flex items-center justify-center font-black">
            <CircleDot className="w-5 h-5 text-[#8E9B95] dark:text-[#616B66]" />
          </div>
        </div>

        {/* Completed Today */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151918] border border-[#E1E3DF] dark:border-[#26302B] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#8E9B95] dark:text-[#616B66] font-display">Completed Today</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#B8892F] dark:text-[#D6A84F] font-display mt-1 font-mono-digits">
              {completedTodayCount < 10 ? `0${completedTodayCount}` : completedTodayCount}
            </p>
            <span className="text-[11px] text-[#8E9B95] dark:text-[#616B66]">Archived frames</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#B8892F]/10 dark:bg-[#D6A84F]/15 border border-[#B8892F]/25 dark:border-[#D6A84F]/30 text-[#B8892F] dark:text-[#D6A84F] flex items-center justify-center font-black">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 6-Table Overview Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#111413] dark:text-[#F5F7F6] font-display uppercase tracking-tight">
              Venue Tables (6 Physical Tables)
            </h2>
            <p className="text-xs text-[#5A635E] dark:text-[#9BA3A0]">
              Instant real-time telemetry across player mobile screens, TV scoreboard, and OBS stream
            </p>
          </div>
          <button
            onClick={() => navigate('/tables')}
            className="text-xs font-bold font-display uppercase tracking-wider text-[#197A4C] dark:text-[#1F9D63] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Configure Tables</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((table) => {
            const game = table.currentGameId ? activeGames[table.currentGameId] : undefined;
            return (
              <TableCard
                key={table.id}
                table={table}
                game={game}
                onOpenQR={(id) => setQrModalTableId(id)}
                onStartGame={(id) => handleOpenStart(id)}
              />
            );
          })}
        </div>
      </section>

      {/* Start Game Modal */}
      <StartGameModal
        tableId={startTableId}
        isOpen={startModalOpen}
        onClose={() => setStartModalOpen(false)}
        onGameStarted={(id) => navigate(`/table/${id}`)}
      />

      {/* QR Code Modal */}
      {qrModalTableId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
          onClick={() => setQrModalTableId(null)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <QRCodeView
              tableId={qrModalTableId}
              onClose={() => setQrModalTableId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
