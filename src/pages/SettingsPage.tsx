import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Building,
  Volume2,
  Vibrate,
  Shield,
  RotateCcw,
  Download,
  Save,
  CheckCircle2,
  Tv,
  QrCode,
  UserCheck,
  Sun,
  Moon,
} from 'lucide-react';
import { useStore } from '../hooks/useStore.ts';
import { useToast } from '../context/ToastContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { GameType, UserRole } from '../types.ts';

export const SettingsPage: React.FC = () => {
  const {
    settings,
    updateSettings,
    currentUser,
    switchUserRole,
    resetAllData,
    history,
  } = useStore();
  const { showToast } = useToast();
  const { resolvedTheme, setTheme } = useTheme();

  const [venueName, setVenueName] = useState(settings.venueName);
  const [defaultGameType, setDefaultGameType] = useState<GameType>(settings.defaultGameType);
  const [defaultTargetScore, setDefaultTargetScore] = useState(
    settings.defaultTargetScore ? settings.defaultTargetScore.toString() : ''
  );
  const [soundEffects, setSoundEffects] = useState(settings.soundEffects);
  const [vibration, setVibration] = useState(settings.vibration);
  const [autoEndGame, setAutoEndGame] = useState(settings.autoEndGame);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      venueName: venueName.trim() || 'CueControl Arena',
      defaultGameType,
      defaultTargetScore: defaultTargetScore ? parseInt(defaultTargetScore, 10) : undefined,
      soundEffects,
      vibration,
      autoEndGame,
    });
    setSavedSuccess(true);
    showToast('Settings Saved', 'Venue configurations updated successfully', 'success');
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleResetData = () => {
    if (
      window.confirm(
        'Clear all active matches, history records, and reset all 6 physical tables to fresh available state?'
      )
    ) {
      resetAllData();
      showToast('Tables Reset', 'All 6 tables are now available and matches cleared', 'info');
    }
  };

  const handleExportData = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `cuecontrol_history_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Export Complete', 'Match history downloaded as JSON', 'success');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111413] dark:text-[#F5F7F6] font-display uppercase tracking-tight">
          Venue & System Settings
        </h1>
        <p className="text-sm text-[#5A635E] dark:text-[#8E9B95] mt-1">
          Customize venue branding, defaults, audio feedback, roles, and table data.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Venue Information */}
        <div className="bg-white dark:bg-[#151918] rounded-2xl border border-[#E1E3DF] dark:border-[#26302B] p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E1E3DF] dark:border-[#26302B]">
            <Building className="w-5 h-5 text-[#197A4C] dark:text-[#1F9D63]" />
            <h2 className="text-base font-bold text-[#111413] dark:text-[#F5F7F6] font-display uppercase tracking-tight">
              Venue Identity & Tables
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase font-semibold text-[#5A635E] dark:text-[#8E9B95] mb-1.5">
                Pool Hall / Venue Name
              </label>
              <input
                type="text"
                required
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F4F5F3] dark:bg-[#1D2321] border border-[#E1E3DF] dark:border-[#26302B] rounded-xl text-xs text-[#111413] dark:text-[#F5F7F6] focus:ring-1 focus:ring-[#197A4C] dark:focus:ring-[#1F9D63] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase font-semibold text-[#5A635E] dark:text-[#8E9B95] mb-1.5">
                Physical Pool Tables
              </label>
              <input
                type="text"
                disabled
                value="6 Physical Tables (Configured)"
                className="w-full px-3.5 py-2.5 bg-[#EBECE8]/60 dark:bg-[#1D2321]/50 border border-[#E1E3DF] dark:border-[#26302B] rounded-xl text-xs text-[#5A635E] dark:text-[#616B66] cursor-not-allowed font-medium font-mono"
              />
              <span className="text-[10px] text-[#8E9B95] dark:text-[#616B66] mt-1 block font-mono">
                Venue capacity locked to exactly 6 tables (Table 01 - Table 06)
              </span>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase font-semibold text-[#5A635E] dark:text-[#8E9B95] mb-1.5">
                Default Discipline
              </label>
              <select
                value={defaultGameType}
                onChange={(e) => setDefaultGameType(e.target.value as GameType)}
                className="w-full px-3.5 py-2.5 bg-[#F4F5F3] dark:bg-[#1D2321] border border-[#E1E3DF] dark:border-[#26302B] rounded-xl text-xs text-[#111413] dark:text-[#F5F7F6] focus:ring-1 focus:ring-[#197A4C] dark:focus:ring-[#1F9D63] focus:outline-none"
              >
                <option value="8-Ball">8-Ball Pool</option>
                <option value="9-Ball">9-Ball Pool</option>
                <option value="10-Ball">10-Ball Pool</option>
                <option value="Straight Pool">Straight Pool (14.1 Continuous)</option>
                <option value="Custom">Custom Scorer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase font-semibold text-[#5A635E] dark:text-[#8E9B95] mb-1.5">
                Default Race Target Score
              </label>
              <input
                type="number"
                min="1"
                max="50"
                placeholder="e.g. 7"
                value={defaultTargetScore}
                onChange={(e) => setDefaultTargetScore(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F4F5F3] dark:bg-[#1D2321] border border-[#E1E3DF] dark:border-[#26302B] rounded-xl text-xs text-[#111413] dark:text-[#F5F7F6] focus:ring-1 focus:ring-[#197A4C] dark:focus:ring-[#1F9D63] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Theme & Display Appearance */}
        <div className="bg-white dark:bg-[#151918] rounded-2xl border border-[#E1E3DF] dark:border-[#26302B] p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E1E3DF] dark:border-[#26302B]">
            <Sun className="w-5 h-5 text-[#B8892F] dark:text-[#D6A84F]" />
            <h2 className="text-base font-bold text-[#111413] dark:text-[#F5F7F6] font-display uppercase tracking-tight">
              Theme & Visual Appearance
            </h2>
          </div>

          <p className="text-xs text-[#5A635E] dark:text-[#8E9B95]">
            Choose between Dark Mode (designed for pool halls and bar ambient lighting) or Light Mode (high-contrast daylight viewing).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              id="settings-theme-dark"
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                resolvedTheme === 'dark'
                  ? 'border-[#197A4C] dark:border-[#1F9D63] bg-[#197A4C]/10 dark:bg-[#1F9D63]/15 text-[#197A4C] dark:text-[#1F9D63] ring-1 ring-[#197A4C] dark:ring-[#1F9D63]'
                  : 'border-[#E1E3DF] dark:border-[#26302B] bg-[#F4F5F3] dark:bg-[#1D2321] text-[#5A635E] dark:text-[#8E9B95] hover:text-[#111413] dark:hover:text-[#F5F7F6]'
              }`}
            >
              <div className="p-2 rounded-lg bg-[#0B0D0C] text-[#1F9D63] border border-[#26302B]">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs uppercase font-mono tracking-wider font-bold block text-[#111413] dark:text-[#F5F7F6]">
                  Dark Theme {resolvedTheme === 'dark' && '(Active)'}
                </span>
                <span className="text-[11px] text-[#5A635E] dark:text-[#8E9B95] mt-0.5 block">
                  Original neon felt & deep charcoal palette
                </span>
              </div>
            </button>

            <button
              type="button"
              id="settings-theme-light"
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                resolvedTheme === 'light'
                  ? 'border-[#197A4C] dark:border-[#1F9D63] bg-[#197A4C]/10 dark:bg-[#1F9D63]/15 text-[#197A4C] dark:text-[#1F9D63] ring-1 ring-[#197A4C] dark:ring-[#1F9D63]'
                  : 'border-[#E1E3DF] dark:border-[#26302B] bg-[#F4F5F3] dark:bg-[#1D2321] text-[#5A635E] dark:text-[#8E9B95] hover:text-[#111413] dark:hover:text-[#F5F7F6]'
              }`}
            >
              <div className="p-2 rounded-lg bg-white text-[#B8892F] border border-[#E1E3DF]">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs uppercase font-mono tracking-wider font-bold block text-[#111413] dark:text-[#F5F7F6]">
                  Light Theme {resolvedTheme === 'light' && '(Active)'}
                </span>
                <span className="text-[11px] text-[#5A635E] dark:text-[#8E9B95] mt-0.5 block">
                  Clean crisp paper white and slate tones
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Audio & Tactile Preferences */}
        <div className="bg-white dark:bg-[#151918] rounded-2xl border border-[#E1E3DF] dark:border-[#26302B] p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E1E3DF] dark:border-[#26302B]">
            <Volume2 className="w-5 h-5 text-[#197A4C] dark:text-[#1F9D63]" />
            <h2 className="text-base font-bold text-[#111413] dark:text-[#F5F7F6] font-display uppercase tracking-tight">
              Audio & Tactile Feedback
            </h2>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#F4F5F3] dark:bg-[#1D2321] border border-[#E1E3DF] dark:border-[#26302B] cursor-pointer hover:border-[#197A4C]/30 dark:hover:border-[#1F9D63]/30 transition-colors">
              <div>
                <span className="text-xs font-bold text-[#111413] dark:text-[#F5F7F6] block">
                  Ball Pocket & Scoring Sound Effects
                </span>
                <span className="text-[11px] text-[#5A635E] dark:text-[#8E9B95]">
                  Plays audio chime upon score increment, foul, and victory
                </span>
              </div>
              <input
                type="checkbox"
                checked={soundEffects}
                onChange={(e) => setSoundEffects(e.target.checked)}
                className="w-4 h-4 rounded text-[#197A4C] dark:text-[#1F9D63] focus:ring-[#197A4C] dark:focus:ring-[#1F9D63] bg-white dark:bg-[#151918] border-[#E1E3DF] dark:border-[#26302B]"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#F4F5F3] dark:bg-[#1D2321] border border-[#E1E3DF] dark:border-[#26302B] cursor-pointer hover:border-[#197A4C]/30 dark:hover:border-[#1F9D63]/30 transition-colors">
              <div>
                <span className="text-xs font-bold text-[#111413] dark:text-[#F5F7F6] block">
                  Haptic Device Vibration
                </span>
                <span className="text-[11px] text-[#5A635E] dark:text-[#8E9B95]">
                  Vibrates mobile devices on touch-friendly buttons (+1 / Foul)
                </span>
              </div>
              <input
                type="checkbox"
                checked={vibration}
                onChange={(e) => setVibration(e.target.checked)}
                className="w-4 h-4 rounded text-[#197A4C] dark:text-[#1F9D63] focus:ring-[#197A4C] dark:focus:ring-[#1F9D63] bg-white dark:bg-[#151918] border-[#E1E3DF] dark:border-[#26302B]"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#F4F5F3] dark:bg-[#1D2321] border border-[#E1E3DF] dark:border-[#26302B] cursor-pointer hover:border-[#197A4C]/30 dark:hover:border-[#1F9D63]/30 transition-colors">
              <div>
                <span className="text-xs font-bold text-[#111413] dark:text-[#F5F7F6] block">
                  Automatic Game Conclude on Target Score
                </span>
                <span className="text-[11px] text-[#5A635E] dark:text-[#8E9B95]">
                  Automatically declares winner and launches celebration when a player hits race target
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoEndGame}
                onChange={(e) => setAutoEndGame(e.target.checked)}
                className="w-4 h-4 rounded text-[#197A4C] dark:text-[#1F9D63] focus:ring-[#197A4C] dark:focus:ring-[#1F9D63] bg-white dark:bg-[#151918] border-[#E1E3DF] dark:border-[#26302B]"
              />
            </label>
          </div>
        </div>

        {/* Role Testing / Simulator */}
        <div className="bg-white dark:bg-[#151918] rounded-2xl border border-[#E1E3DF] dark:border-[#26302B] p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E1E3DF] dark:border-[#26302B]">
            <UserCheck className="w-5 h-5 text-[#197A4C] dark:text-[#1F9D63]" />
            <h2 className="text-base font-bold text-[#111413] dark:text-[#F5F7F6] font-display uppercase tracking-tight">
              User Role & Permissions Preview
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['admin', 'staff', 'player'] as UserRole[]).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => switchUserRole(role)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  currentUser.role === role
                    ? 'border-[#197A4C] dark:border-[#1F9D63] bg-[#197A4C]/10 dark:bg-[#1F9D63]/15 text-[#197A4C] dark:text-[#1F9D63] font-bold shadow-xs'
                    : 'border-[#E1E3DF] dark:border-[#26302B] bg-[#F4F5F3] dark:bg-[#1D2321] text-[#5A635E] dark:text-[#8E9B95] hover:text-[#111413] dark:hover:text-[#F5F7F6]'
                }`}
              >
                <span className="text-xs uppercase font-mono tracking-wider block font-bold">
                  {role}
                </span>
                <span className="text-[10px] text-[#8E9B95] dark:text-[#616B66] block mt-1">
                  {role === 'admin'
                    ? 'Full venue access, reset & settings'
                    : role === 'staff'
                    ? 'Table controls & referee scoring'
                    : 'Mobile player scoreboard only'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Save CTA */}
        <div className="flex items-center justify-between pt-2">
          {savedSuccess && (
            <span className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#197A4C] dark:text-[#1F9D63]">
              <CheckCircle2 className="w-4 h-4" />
              Settings updated!
            </span>
          )}
          <div className="ml-auto">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-[#197A4C] dark:bg-[#1F9D63] hover:bg-[#14643E] dark:hover:bg-[#26B372] text-white rounded-xl text-xs font-display font-bold uppercase tracking-wider shadow-lg shadow-[#1F9D63]/20 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Venue Settings</span>
            </button>
          </div>
        </div>
      </form>

      {/* Data Operations */}
      <div className="bg-white dark:bg-[#151918] rounded-2xl border border-[#E1E3DF] dark:border-[#26302B] p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-[#111413] dark:text-[#F5F7F6] font-display uppercase tracking-tight">
          Data Management & Reset
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 px-4 py-2 bg-[#F4F5F3] hover:bg-[#EBECE8] dark:bg-[#1D2321] dark:hover:bg-[#26302B] text-[#111413] dark:text-[#F5F7F6] rounded-xl text-xs font-mono font-semibold border border-[#E1E3DF] dark:border-[#26302B] transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#8E9B95]" />
            <span>Export History JSON ({history.length} records)</span>
          </button>

          <button
            onClick={handleResetData}
            className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-mono font-semibold border border-rose-500/30 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset All Tables & Matches</span>
          </button>
        </div>
      </div>
    </div>
  );
};
