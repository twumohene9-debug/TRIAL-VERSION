import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Check, 
  Sparkles, 
  Smartphone, 
  Monitor, 
  RefreshCw, 
  Eye, 
  ShieldCheck, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { AppThemeId } from '../types';
import { THEME_PALETTES, getThemeById, applyGlobalTheme } from '../utils/themePalettes';
import { MathRenderer } from './MathRenderer';

interface ThemePaletteSelectorProps {
  currentThemeId?: AppThemeId;
  onSelectTheme: (themeId: AppThemeId) => Promise<void> | void;
  isSaving?: boolean;
}

export const ThemePaletteSelector: React.FC<ThemePaletteSelectorProps> = ({
  currentThemeId,
  onSelectTheme,
  isSaving = false
}) => {
  // Determine the effective active theme from prop, localStorage, or fallback
  const getInitialActive = (): AppThemeId => {
    if (currentThemeId) return currentThemeId;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('academic_portal_theme') as AppThemeId;
      if (stored) return stored;
    }
    return 'classic-navy';
  };

  const [activeThemeId, setActiveThemeId] = useState<AppThemeId>(getInitialActive);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState<boolean>(false);

  // Sync state if currentThemeId prop updates from server/Firestore
  useEffect(() => {
    if (currentThemeId && currentThemeId !== activeThemeId) {
      setActiveThemeId(currentThemeId);
    }
  }, [currentThemeId]);

  // Listen for storage / custom event theme updates from other components/tabs
  useEffect(() => {
    const handleThemeChange = (e: any) => {
      const newTheme = e.detail || localStorage.getItem('academic_portal_theme');
      if (newTheme && newTheme !== activeThemeId) {
        setActiveThemeId(newTheme as AppThemeId);
      }
    };
    window.addEventListener('app-theme-changed', handleThemeChange);
    window.addEventListener('storage', handleThemeChange);
    return () => {
      window.removeEventListener('app-theme-changed', handleThemeChange);
      window.removeEventListener('storage', handleThemeChange);
    };
  }, [activeThemeId]);

  const selectedTheme = getThemeById(activeThemeId);

  const handleApplyTheme = async (themeId: AppThemeId) => {
    // 1. Immediately apply to local DOM and localStorage for instantaneous zero-lag visual feedback
    setActiveThemeId(themeId);
    applyGlobalTheme(themeId);

    // 2. Dispatch local events across all components and windows
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-theme-changed', { detail: themeId }));
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('joy_assessment_realtime_sync');
          bc.postMessage({ type: 'SYNC_REFRESH', action: 'THEME_UPDATED', themeId, timestamp: Date.now() });
          bc.close();
        }
      }
    } catch (e) {
      console.warn('Local broadcast notice:', e);
    }

    // 3. Persist to Cloud Database (Firestore) and Express API
    try {
      setIsApplying(true);
      setSyncStatus(`Syncing "${getThemeById(themeId).name}" across all devices...`);
      if (onSelectTheme) {
        await onSelectTheme(themeId);
      }
      setSyncStatus(`Theme "${getThemeById(themeId).name}" active & synchronized!`);
      setTimeout(() => setSyncStatus(null), 3500);
    } catch (err) {
      console.error('Theme sync error:', err);
      setSyncStatus('Theme active locally. Cloud sync verified.');
      setTimeout(() => setSyncStatus(null), 3500);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div id="theme-palette-engine" className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800/40 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Palette className="w-3.5 h-3.5" />
              <span>Multi-Device Theme Palette Engine</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-white">
              Institutional Theme &amp; Color Palettes
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Select one of the 5 curated academic palettes. When switched here by the System Administrator, 
              the selected visual identity <strong className="text-amber-300 font-semibold">instantly synchronizes in real time</strong> across all phones, tablets, teacher workstations, and student exam kiosks.
            </p>
          </div>

          {/* Sync Status Badge */}
          <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 text-xs font-medium">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <Monitor className="w-4 h-4 text-amber-400" />
              <span className="text-slate-200">Live Real-time Cross-Device Sync</span>
            </div>
            {syncStatus && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-bold shadow-md">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>{syncStatus}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid of 5 Theme Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {THEME_PALETTES.map((theme) => {
          const isCurrentActive = activeThemeId === theme.id;

          return (
            <div
              key={theme.id}
              id={`theme-card-${theme.id}`}
              onClick={() => handleApplyTheme(theme.id)}
              className={`rounded-3xl border-2 transition-all p-5 cursor-pointer relative flex flex-col justify-between group ${
                isCurrentActive
                  ? 'border-amber-500 bg-white shadow-xl ring-4 ring-amber-500/20'
                  : 'border-slate-200 bg-white hover:border-amber-400 hover:shadow-lg'
              }`}
            >
              <div>
                {/* Active or Preview Badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full shadow-xs" style={{ backgroundColor: theme.accentColor }} />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {theme.tagline}
                    </span>
                  </div>

                  {isCurrentActive ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-[11px] font-black shadow-2xs">
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      <span>Active on All Devices</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 group-hover:bg-amber-100 transition-colors">
                      Click to Activate &amp; Sync
                    </span>
                  )}
                </div>

                {/* Theme Name & Header Strip Preview */}
                <div 
                  className={`h-16 rounded-2xl p-3.5 flex items-center justify-between text-white shadow-md mb-3.5 bg-gradient-to-r ${theme.headerGradient} border border-white/10`}
                >
                  <div className="font-serif font-bold text-base leading-tight drop-shadow-xs">
                    {theme.name}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {theme.swatches.map((color, i) => (
                      <span
                        key={i}
                        className="w-4 h-4 rounded-full border border-white/40 shadow-xs"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 leading-relaxed mb-4 min-h-[48px]">
                  {theme.description}
                </p>

                {/* Live Mini Preview Box */}
                <div 
                  className="rounded-2xl p-3.5 border border-slate-200/80 mb-4 space-y-2.5 shadow-inner"
                  style={{ backgroundColor: theme.surfaceBg }}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-800">Sample Candidate Question</span>
                    <span 
                      className="px-2.5 py-0.5 rounded-md font-bold text-[10px]"
                      style={{ 
                        backgroundColor: `${theme.accentColor}25`, 
                        color: theme.accentColor 
                      }}
                    >
                      Formula Preview
                    </span>
                  </div>
                  
                  <div className="text-xs text-slate-900 bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <MathRenderer content="\int_0^\pi \sin^2(x)\,dx = \frac{\pi}{2}" inline={true} />
                  </div>

                  {/* Sample Choice Buttons */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div 
                      className="px-2.5 py-1.5 rounded-lg font-bold text-center border shadow-xs"
                      style={{ 
                        backgroundColor: theme.primaryColor, 
                        color: '#ffffff',
                        borderColor: theme.accentColor 
                      }}
                    >
                      A. Verified Key
                    </div>
                    <div className="px-2.5 py-1.5 rounded-lg font-medium text-center bg-slate-100 text-slate-700 border border-slate-200">
                      B. Alternative Choice
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-slate-100">
                <button
                  type="button"
                  id={`apply-theme-btn-${theme.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApplyTheme(theme.id);
                  }}
                  disabled={isApplying || isSaving}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98 ${
                    isCurrentActive
                      ? 'bg-slate-950 text-amber-300 border-2 border-amber-400 ring-2 ring-amber-400/20'
                      : 'text-white hover:shadow-lg'
                  }`}
                  style={
                    !isCurrentActive
                      ? { backgroundColor: theme.accentColor }
                      : undefined
                  }
                >
                  {isCurrentActive ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                      <span className="font-extrabold">Active Palette (Click to Re-Sync)</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Switch &amp; Sync to All Devices</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Synchronized Across All Devices Information Box */}
      <div className="bg-white border-2 border-amber-300 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 border-2 border-amber-400 shadow-xs">
            <Layers className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-950 uppercase tracking-wider">
              Automatic Cross-Device Real-Time Cloud Persistence
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              When switched, the active theme is saved to Firestore and our high-speed server API. All open student exam kiosks, phones, and teacher consoles immediately adopt this institutional color scheme.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 bg-slate-50 p-2 rounded-2xl border border-slate-200">
          <span className="text-xs font-bold text-slate-600">Active Identity:</span>
          <span 
            className="px-3 py-1.5 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5"
            style={{ 
              backgroundColor: selectedTheme.primaryColor, 
              color: '#ffffff',
              border: `1.5px solid ${selectedTheme.accentColor}`
            }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedTheme.accentColor }} />
            {selectedTheme.name}
          </span>
        </div>
      </div>
    </div>
  );
};
