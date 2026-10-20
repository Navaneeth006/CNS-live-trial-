import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Trophy,
  Calendar,
  Clock,
  ArrowUpDown,
  ExternalLink,
  Award,
  ChevronRight,
} from 'lucide-react';
import { useStore } from '../hooks/useStore.ts';
import { Game, GameType } from '../types.ts';
import { GameDetailsModal } from '../components/GameDetailsModal.tsx';

export const GameHistoryPage: React.FC = () => {
  const { history } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTable, setSelectedTable] = useState<string>('all');
  const [selectedGameType, setSelectedGameType] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedGameForModal, setSelectedGameForModal] = useState<Game | null>(null);

  const filteredGames = useMemo(() => {
    return history
      .filter((game) => {
        // Search query (player names, match title)
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          game.player1.toLowerCase().includes(q) ||
          game.player2.toLowerCase().includes(q) ||
          (game.matchName && game.matchName.toLowerCase().includes(q));

        // Table filter
        const matchesTable =
          selectedTable === 'all' || game.tableId.toString() === selectedTable;

        // Game type filter
        const matchesType =
          selectedGameType === 'all' || game.gameType === selectedGameType;

        return matchesQuery && matchesTable && matchesType;
      })
      .sort((a, b) => {
        if (sortOrder === 'newest') {
          return (b.endTime || b.startTime) - (a.endTime || a.startTime);
        } else {
          return (a.endTime || a.startTime) - (b.endTime || b.startTime);
        }
      });
  }, [history, searchQuery, selectedTable, selectedGameType, sortOrder]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111413] dark:text-[#F5F7F6] font-display uppercase tracking-tight">
          Game History
        </h1>
        <p className="text-sm text-[#5A635E] dark:text-[#8E9B95] mt-1">
          Detailed archive of concluded matches, final scores, shot timelines, and winners.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#151918] p-4 rounded-2xl border border-[#E1E3DF] dark:border-[#26302B] shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#8E9B95] absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search player or match..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#F4F5F3] dark:bg-[#1D2321] border border-[#E1E3DF] dark:border-[#26302B] rounded-xl text-xs text-[#111413] dark:text-[#F5F7F6] placeholder-[#8E9B95] focus:outline-none focus:ring-1 focus:ring-[#197A4C] dark:focus:ring-[#1F9D63]"
            />
          </div>

          {/* Table Filter */}
          <div>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="w-full px-3 py-2 bg-[#F4F5F3] dark:bg-[#1D2321] border border-[#E1E3DF] dark:border-[#26302B] rounded-xl text-xs text-[#111413] dark:text-[#F5F7F6] focus:outline-none focus:ring-1 focus:ring-[#197A4C] dark:focus:ring-[#1F9D63]"
            >
              <option value="all">All Tables (1-6)</option>
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <option key={num} value={num.toString()}>
                  Table 0{num}
                </option>
              ))}
            </select>
          </div>

          {/* Game Type Filter */}
          <div>
            <select
              value={selectedGameType}
              onChange={(e) => setSelectedGameType(e.target.value)}
              className="w-full px-3 py-2 bg-[#F4F5F3] dark:bg-[#1D2321] border border-[#E1E3DF] dark:border-[#26302B] rounded-xl text-xs text-[#111413] dark:text-[#F5F7F6] focus:outline-none focus:ring-1 focus:ring-[#197A4C] dark:focus:ring-[#1F9D63]"
            >
              <option value="all">All Disciplines</option>
              <option value="8-Ball">8-Ball</option>
              <option value="9-Ball">9-Ball</option>
              <option value="10-Ball">10-Ball</option>
              <option value="Straight Pool">Straight Pool</option>
              <option value="Custom">Custom</option>
            </select>
          </div>

          {/* Sort Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#F4F5F3] dark:bg-[#1D2321] border border-[#E1E3DF] dark:border-[#26302B] rounded-xl text-xs font-semibold text-[#111413] dark:text-[#F5F7F6] hover:bg-[#EBECE8] dark:hover:bg-[#26302B] transition-colors cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#8E9B95]" />
              <span>{sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* History Records Table / Cards */}
      {filteredGames.length === 0 ? (
        <div className="bg-white dark:bg-[#151918] rounded-2xl border border-[#E1E3DF] dark:border-[#26302B] p-12 text-center max-w-md mx-auto shadow-xs">
          <History className="w-10 h-10 text-[#8E9B95] mx-auto mb-3" />
          <p className="text-base font-bold text-[#111413] dark:text-[#F5F7F6] font-display uppercase tracking-tight">
            No Match Records Found
          </p>
          <p className="text-xs text-[#5A635E] dark:text-[#8E9B95] mt-1">
            Try adjusting your search criteria or conclude a match from the live scoring screen.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#151918] rounded-2xl border border-[#E1E3DF] dark:border-[#26302B] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F4F5F3] dark:bg-[#1D2321] border-b border-[#E1E3DF] dark:border-[#26302B] text-xs text-[#5A635E] dark:text-[#8E9B95] font-display uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Table</th>
                  <th className="py-3.5 px-4">Discipline</th>
                  <th className="py-3.5 px-4">Matchup</th>
                  <th className="py-3.5 px-4">Final Score</th>
                  <th className="py-3.5 px-4">Winner</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E3DF] dark:divide-[#26302B]">
                {filteredGames.map((game) => {
                  const durationSecs = Math.floor(
                    ((game.endTime || Date.now()) - game.startTime) / 1000
                  );
                  const durationMins = Math.floor(durationSecs / 60);

                  return (
                    <tr
                      key={game.id}
                      onClick={() => setSelectedGameForModal(game)}
                      className="hover:bg-[#F4F5F3]/70 dark:hover:bg-[#1D2321]/60 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono text-xs text-[#5A635E] dark:text-[#8E9B95]">
                        <div className="text-[#111413] dark:text-[#F5F7F6] font-semibold">
                          {new Date(game.startTime).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-[#8E9B95] dark:text-[#616B66]">
                          {durationMins}m duration
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-[#F4F5F3] dark:bg-[#1D2321] border border-[#E1E3DF] dark:border-[#26302B] text-[#111413] dark:text-[#F5F7F6] font-mono font-bold text-xs">
                          T0{game.tableId}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-semibold text-[#5A635E] dark:text-[#8E9B95]">
                        {game.gameType}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#111413] dark:text-[#F5F7F6]">
                          <span className={game.winner === game.player1 ? 'text-[#197A4C] dark:text-[#1F9D63] font-extrabold' : ''}>
                            {game.player1}
                          </span>
                          <span className="text-[#8E9B95] dark:text-[#616B66] mx-1.5 font-normal">vs</span>
                          <span className={game.winner === game.player2 ? 'text-[#197A4C] dark:text-[#1F9D63] font-extrabold' : ''}>
                            {game.player2}
                          </span>
                        </div>
                        {game.matchName && (
                          <p className="text-[11px] text-[#5A635E] dark:text-[#8E9B95]">{game.matchName}</p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-display font-bold text-base text-[#111413] dark:text-[#F5F7F6] font-mono-digits">
                        {game.score1} <span className="text-[#8E9B95] dark:text-[#616B66]">—</span> {game.score2}
                      </td>

                      <td className="py-3.5 px-4">
                        {game.winner ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-[#B8892F]/10 text-[#B8892F] dark:bg-[#D6A84F]/15 dark:text-[#D6A84F] border border-[#B8892F]/30 dark:border-[#D6A84F]/30">
                            <Award className="w-3.5 h-3.5" />
                            <span>{game.winner}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-[#8E9B95] dark:text-[#616B66] italic">Draw / Concluded</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedGameForModal(game);
                          }}
                          className="p-1.5 text-[#8E9B95] hover:text-[#F5F7F6] rounded-lg hover:bg-[#1D2321] cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Game Details Modal */}
      <GameDetailsModal
        game={selectedGameForModal}
        isOpen={Boolean(selectedGameForModal)}
        onClose={() => setSelectedGameForModal(null)}
      />
    </div>
  );
};
