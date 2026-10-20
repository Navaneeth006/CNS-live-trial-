import React, { useState } from 'react';
import {
  LayoutGrid,
  List,
  PlusCircle,
  QrCode,
  Wrench,
  Play,
  Pause,
  StopCircle,
  RotateCcw,
  ExternalLink,
  Printer,
  ShieldAlert,
  CheckCircle,
  Clock,
  Trophy,
} from 'lucide-react';
import { useStore } from '../hooks/useStore.ts';
import { TableCard } from '../components/TableCard.tsx';
import { StartGameModal } from '../components/StartGameModal.tsx';
import { QRCodeView } from '../components/QRCodeView.tsx';
import { useRouter } from '../context/RouterContext.tsx';
import { useToast } from '../context/ToastContext.tsx';

export const TablesPage: React.FC = () => {
  const {
    tables,
    activeGames,
    pauseGame,
    resumeGame,
    endGame,
    resetGame,
    setTableMaintenance,
    currentUser,
  } = useStore();
  const { navigate } = useRouter();
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<number>(1);
  const [activeQrModalId, setActiveQrModalId] = useState<number | null>(null);
  const [showAllQrsModal, setShowAllQrsModal] = useState(false);

  const handleStartGame = (tableId: number) => {
    setSelectedTableId(tableId);
    setStartModalOpen(true);
  };

  const handleEndGame = (tableId: number) => {
    if (window.confirm(`Are you sure you want to conclude the match on Table 0${tableId}?`)) {
      endGame(tableId);
      showToast(`Match Concluded`, `Table 0${tableId} moved to history`, 'info');
    }
  };

  const handleResetGame = (tableId: number) => {
    if (window.confirm(`Clear Table 0${tableId} back to available state?`)) {
      resetGame(tableId);
      showToast(`Table Reset`, `Table 0${tableId} is now available`, 'info');
    }
  };

  const isStaff = currentUser.role === 'admin' || currentUser.role === 'staff';

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111413] dark:text-[#F5F7F6] font-display uppercase tracking-tight">
            Table Management
          </h1>
          <p className="text-sm text-[#5A635E] dark:text-[#8E9B95] mt-1">
            Manage table states, QR identifiers, live scoring matches, and venue maintenance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-white dark:bg-[#151918] rounded-xl border border-[#E1E3DF] dark:border-[#26302B]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[#197A4C] dark:bg-[#1F9D63] text-white shadow-sm'
                  : 'text-[#5A635E] hover:text-[#111413] dark:text-[#8E9B95] dark:hover:text-[#F5F7F6]'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[#197A4C] dark:bg-[#1F9D63] text-white shadow-sm'
                  : 'text-[#5A635E] hover:text-[#111413] dark:text-[#8E9B95] dark:hover:text-[#F5F7F6]'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Print All QRs Button */}
          <button
            onClick={() => setShowAllQrsModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#EBECE8] dark:bg-[#151918] dark:hover:bg-[#1D2321] text-[#111413] dark:text-[#F5F7F6] rounded-xl text-xs font-display font-bold uppercase tracking-wider border border-[#E1E3DF] dark:border-[#26302B] transition-colors cursor-pointer"
            title="View & Print All 6 Table QR Placards"
          >
            <QrCode className="w-4 h-4 text-[#197A4C] dark:text-[#1F9D63]" />
            <span className="hidden sm:inline">QR Placards</span>
          </button>

          {/* New Match CTA */}
          <button
            onClick={() => handleStartGame(1)}
            className="flex items-center gap-2 px-4 py-2 bg-[#197A4C] dark:bg-[#1F9D63] hover:bg-[#14643E] dark:hover:bg-[#26B372] text-white rounded-xl text-xs font-display font-bold uppercase tracking-wider shadow-lg shadow-[#1F9D63]/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Launch Match</span>
          </button>
        </div>
      </div>

      {/* Grid or List Views */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((table) => {
            const game = table.currentGameId ? activeGames[table.currentGameId] : undefined;
            return (
              <TableCard
                key={table.id}
                table={table}
                game={game}
                onOpenQR={(id) => setActiveQrModalId(id)}
                onStartGame={(id) => handleStartGame(id)}
              />
            );
          })}
        </div>
      ) : (
        /* Compact List View */
        <div className="bg-white dark:bg-[#151918] rounded-2xl border border-[#E1E3DF] dark:border-[#26302B] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F4F5F3] dark:bg-[#1D2321] border-b border-[#E1E3DF] dark:border-[#26302B] text-xs text-[#5A635E] dark:text-[#8E9B95] font-display uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Table</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Match / Contestants</th>
                  <th className="py-3.5 px-4">Live Score</th>
                  <th className="py-3.5 px-4">Discipline</th>
                  <th className="py-3.5 px-4">QR Link</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E3DF] dark:divide-[#26302B]">
                {tables.map((table) => {
                  const game = table.currentGameId ? activeGames[table.currentGameId] : undefined;

                  return (
                    <tr key={table.id} className="hover:bg-[#F4F5F3]/70 dark:hover:bg-[#1D2321]/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#111413] dark:text-[#F5F7F6] font-display">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-[#197A4C] dark:bg-[#1F9D63] text-white flex items-center justify-center text-xs font-mono font-bold">
                            0{table.id}
                          </span>
                          <span>{table.name}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {table.status === 'playing' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-[#197A4C]/10 text-[#197A4C] dark:bg-[#1F9D63]/15 dark:text-[#1F9D63] border border-[#197A4C]/30 dark:border-[#1F9D63]/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#197A4C] dark:bg-[#1F9D63] animate-pulse" />
                            Playing
                          </span>
                        ) : table.status === 'paused' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-[#B8892F]/10 text-[#B8892F] dark:bg-[#D6A84F]/15 dark:text-[#D6A84F] border border-[#B8892F]/30 dark:border-[#D6A84F]/30">
                            Paused
                          </span>
                        ) : table.status === 'maintenance' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                            Maintenance
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-[#EBECE8] dark:bg-[#1D2321] text-[#5A635E] dark:text-[#8E9B95] border border-[#E1E3DF] dark:border-[#26302B]">
                            Available
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {game ? (
                          <div>
                            <p className="font-bold text-[#111413] dark:text-[#F5F7F6]">
                              {game.player1} vs {game.player2}
                            </p>
                            <p className="text-xs text-[#5A635E] dark:text-[#8E9B95]">{game.matchName}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-[#8E9B95] dark:text-[#616B66] italic">No active match</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-[#111413] dark:text-[#F5F7F6]">
                        {game ? (
                          <span className="text-base font-display text-[#197A4C] dark:text-[#1F9D63]">
                            {game.score1} <span className="text-[#8E9B95] dark:text-[#616B66]">—</span> {game.score2}
                          </span>
                        ) : (
                          <span className="text-[#8E9B95] dark:text-[#616B66]">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs font-medium text-[#5A635E] dark:text-[#8E9B95]">
                        {game?.gameType || '—'}
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => setActiveQrModalId(table.id)}
                          className="flex items-center gap-1 text-xs text-[#197A4C] dark:text-[#1F9D63] font-mono font-bold hover:underline cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>/table/{table.id}</span>
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {table.status === 'playing' || table.status === 'paused' ? (
                            <>
                              <button
                                onClick={() => navigate(`/table/${table.id}`)}
                                className="px-2.5 py-1 bg-[#197A4C] dark:bg-[#1F9D63] hover:bg-[#14643E] dark:hover:bg-[#26B372] text-white rounded-lg text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                              >
                                <span>Score</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                              {isStaff && (
                                <button
                                  onClick={() => handleEndGame(table.id)}
                                  className="p-1.5 text-[#5A635E] dark:text-[#8E9B95] hover:text-rose-500 dark:hover:text-rose-400 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                                  title="End Match"
                                >
                                  <StopCircle className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          ) : table.status === 'maintenance' ? (
                            <button
                              onClick={() => setTableMaintenance(table.id, false)}
                              className="px-3 py-1 bg-[#EBECE8] hover:bg-[#E1E3DF] dark:bg-[#1D2321] dark:hover:bg-[#26302B] text-[#111413] dark:text-[#F5F7F6] border border-[#E1E3DF] dark:border-[#26302B] text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Restore
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartGame(table.id)}
                                className="px-3 py-1 bg-[#197A4C] dark:bg-[#1F9D63] hover:bg-[#14643E] dark:hover:bg-[#26B372] text-white rounded-lg text-xs font-bold font-display uppercase tracking-wider cursor-pointer"
                              >
                                Start Match
                              </button>
                              {isStaff && (
                                <button
                                  onClick={() => setTableMaintenance(table.id, true)}
                                  className="p-1.5 text-[#5A635E] dark:text-[#8E9B95] hover:text-[#B8892F] dark:hover:text-[#D6A84F] rounded-lg hover:bg-[#B8892F]/10 cursor-pointer"
                                  title="Put in Maintenance"
                                >
                                  <Wrench className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Start Game Modal */}
      <StartGameModal
        tableId={selectedTableId}
        isOpen={startModalOpen}
        onClose={() => setStartModalOpen(false)}
        onGameStarted={(id) => navigate(`/table/${id}`)}
      />

      {/* Single Table QR Modal */}
      {activeQrModalId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
          onClick={() => setActiveQrModalId(null)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <QRCodeView
              tableId={activeQrModalId}
              tableName={`Table 0${activeQrModalId}`}
              onClose={() => setActiveQrModalId(null)}
            />
          </div>
        </div>
      )}

      {/* All 6 QR Codes Placards Preview Modal */}
      {showAllQrsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowAllQrsModal(false)}
        >
          <div
            className="bg-white dark:bg-[#151918] rounded-2xl border border-[#E1E3DF] dark:border-[#26302B] p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E1E3DF] dark:border-[#26302B] pb-4">
              <div>
                <h2 className="text-xl font-bold font-display uppercase tracking-tight text-[#111413] dark:text-[#F5F7F6]">
                  Table QR Code Placards (All 6 Tables)
                </h2>
                <p className="text-xs text-[#5A635E] dark:text-[#8E9B95] mt-0.5">
                  Print or place these QR cards at the edge of each physical table for instant player scanning.
                </p>
              </div>
              <button
                onClick={() => setShowAllQrsModal(false)}
                className="text-xs font-bold font-display uppercase tracking-wider px-3.5 py-1.5 bg-[#EBECE8] hover:bg-[#E1E3DF] dark:bg-[#1D2321] dark:hover:bg-[#26302B] text-[#111413] dark:text-[#F5F7F6] border border-[#E1E3DF] dark:border-[#26302B] rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {tables.map((t) => (
                <QRCodeView key={t.id} tableId={t.id} tableName={`Table 0${t.id}`} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
