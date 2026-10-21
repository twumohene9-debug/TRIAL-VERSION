import React from 'react';
import { 
  GraduationCap, 
  BarChart3, 
  CalendarClock, 
  FileSpreadsheet, 
  BookOpenCheck, 
  UserCheck, 
  ShieldCheck,
  Sparkles,
  HelpCircle,
  Lock,
  LogOut,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  CloudCheck,
  Cloud,
  WifiOff,
  Info
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';

export type ViewTab = 'exam' | 'analytics' | 'release-manager' | 'question-bank' | 'submissions-export' | 'admin';

interface HeaderNavbarProps {
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  isTeacherMode: boolean;
  setIsTeacherMode: (mode: boolean) => void;
  isTeacherAuthenticated: boolean;
  onRequestTeacherAuth: (targetTab?: ViewTab) => void;
  onLockTeacher: () => void;
  timeRemainingSeconds?: number;
  isTimerRunning?: boolean;
  totalSubmissionsCount?: number;
  hasActiveDraft?: boolean;
  syncStatus?: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncTime?: string;
  onTriggerSync?: () => void;
  onOpenAbout?: (tab?: 'about' | 'contact' | 'report' | 'privacy') => void;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  activeTab,
  setActiveTab,
  isTeacherMode,
  setIsTeacherMode,
  isTeacherAuthenticated,
  onRequestTeacherAuth,
  onLockTeacher,
  timeRemainingSeconds,
  isTimerRunning,
  totalSubmissionsCount = 0,
  syncStatus = 'synced',
  lastSyncTime,
  onTriggerSync,
  onOpenAbout,
}) => {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectTab = (tab: ViewTab) => {
    if (tab === 'exam') {
      setActiveTab('exam');
      return;
    }

    if (!isTeacherAuthenticated) {
      onRequestTeacherAuth(tab);
    } else {
      setIsTeacherMode(true);
      setActiveTab(tab);
    }
  };

  const handleToggleMode = () => {
    if (!isTeacherMode) {
      if (!isTeacherAuthenticated) {
        onRequestTeacherAuth('analytics');
      } else {
        setIsTeacherMode(true);
        setActiveTab('analytics');
      }
    } else {
      setIsTeacherMode(false);
      setActiveTab('exam');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* Top Banner in Midnight Indigo with Amber Accents */}
      <div className="bg-indigo-950 text-indigo-100 text-xs py-1.5 px-3 sm:px-4 flex justify-between items-center font-sans border-b border-indigo-900/50">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <BrandLogo size="xs" variant="icon-only" className="w-4 h-4 shrink-0" />
          <span className="font-serif font-bold text-amber-300 uppercase tracking-wider text-[10px] sm:text-[11px] truncate">MCQ ASSESSMENT HUB</span>
          <span className="text-indigo-700 hidden md:inline">•</span>
          <span className="text-indigo-200 text-[11px] font-medium hidden md:inline truncate">Digital Mathematics &amp; Academic Evaluation Network</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 text-indigo-200 shrink-0">
          {/* Cloud Sync Indicator */}
          {onTriggerSync && (
            <button
              onClick={onTriggerSync}
              title={`Click to force sync across Firestore & Server. Last synced: ${lastSyncTime || 'Just now'}`}
              className="flex items-center gap-1.5 bg-indigo-900/90 hover:bg-indigo-800 text-indigo-200 hover:text-white px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] border border-indigo-700/50 transition-all cursor-pointer shadow-xs shrink-0"
            >
              {syncStatus === 'syncing' ? (
                <>
                  <RefreshCw className="w-3 h-3 shrink-0 text-amber-400 animate-spin" />
                  <span className="text-amber-300 font-medium">Syncing...</span>
                </>
              ) : syncStatus === 'offline' ? (
                <>
                  <WifiOff className="w-3 h-3 shrink-0 text-amber-400" />
                  <span className="text-amber-300 font-medium hidden sm:inline">Offline</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 shrink-0 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-emerald-300 font-medium hidden sm:inline">Cloud Synced</span>
                  <RefreshCw className="w-2.5 h-2.5 shrink-0 text-amber-400 ml-0.5 hover:text-white" />
                </>
              )}
            </button>
          )}

          <div className="hidden md:flex items-center gap-1.5 bg-indigo-900/90 border border-indigo-800/80 px-2.5 py-0.5 rounded-full text-[11px] text-indigo-200 shrink-0">
            <Sparkles className="w-3 h-3 shrink-0 text-amber-400" />
            <span>KaTeX Math &amp; Integrity Guard</span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 sm:gap-3 bg-white">
        {/* Logo & Brand Identity */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <BrandLogo size="md" variant="horizontal" />
          {isTeacherMode && isTeacherAuthenticated ? (
            <span className="hidden sm:inline-flex bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-200 items-center gap-1.5 shadow-xs shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-amber-600" /> Faculty Unlocked
            </span>
          ) : isTeacherMode ? (
            <span className="hidden sm:inline-flex bg-slate-100 text-slate-800 text-xs font-semibold px-2.5 py-1 rounded-full border border-slate-300 items-center gap-1.5 shadow-xs shrink-0">
              <Lock className="w-3.5 h-3.5 shrink-0 text-slate-600" /> Pin Protected
            </span>
          ) : (
            <span className="hidden sm:inline-flex bg-emerald-50 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-200 items-center gap-1.5 shadow-xs shrink-0">
              <UserCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600" /> Student View
            </span>
          )}
        </div>

        {/* Timer Widget if in exam mode */}
        {activeTab === 'exam' && timeRemainingSeconds !== undefined && isTimerRunning && (
          <div className="flex items-center gap-1.5 sm:gap-2 bg-amber-50 border border-amber-200 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl text-amber-900 font-mono text-xs sm:text-sm font-bold shadow-xs animate-pulse shrink-0">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 shrink-0 rounded-full bg-amber-500"></span>
            <span>⏱ {formatTime(timeRemainingSeconds)}</span>
          </div>
        )}

        {/* Mode Switch & View Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
          {isTeacherAuthenticated && (
            <button
              onClick={onLockTeacher}
              className="text-xs font-semibold px-2 sm:px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all flex items-center gap-1 sm:gap-1.5 shadow-xs cursor-pointer shrink-0 min-h-[36px]"
              title="Lock Faculty Console"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Lock Console</span>
            </button>
          )}

          {/* Mode Toggle Button */}
          <button
            onClick={handleToggleMode}
            className={`text-xs font-bold px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl transition-all flex items-center gap-1.5 sm:gap-2 border shadow-xs cursor-pointer shrink-0 min-h-[36px] ${
              isTeacherMode
                ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
            }`}
          >
            {isTeacherMode ? (
              <>
                <UserCheck className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span className="hidden sm:inline">Switch to Student View</span>
                <span className="sm:hidden">Student</span>
              </>
            ) : (
              <>
                {!isTeacherAuthenticated ? (
                  <Lock className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                ) : (
                  <GraduationCap className="w-3.5 h-3.5 shrink-0 text-indigo-600" />
                )}
                <span className="hidden sm:inline">Teacher / Admin Dashboard</span>
                <span className="sm:hidden">Teacher</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Sub-bar */}
      <div className="bg-slate-50/90 border-t border-slate-200 px-3 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 overflow-x-auto py-1.5 no-scrollbar">
          {/* Main Navigation Tabs */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => handleSelectTab('exam')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
                activeTab === 'exam'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <BookOpenCheck className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'exam' ? 'text-white' : 'text-slate-500'}`} />
              <span>Student Assessment</span>
            </button>

            <span className="text-slate-300 font-light mx-1 shrink-0">|</span>

            <button
              onClick={() => handleSelectTab('analytics')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
                activeTab === 'analytics'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <BarChart3 className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'analytics' ? 'text-white' : 'text-slate-500'}`} />
              <span>Teacher Monitoring</span>
              {!isTeacherAuthenticated && <Lock className="w-3 h-3 shrink-0 text-slate-400 ml-0.5" />}
            </button>

            <button
              onClick={() => handleSelectTab('release-manager')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
                activeTab === 'release-manager'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <CalendarClock className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'release-manager' ? 'text-white' : 'text-slate-500'}`} />
              <span>Section Release Times</span>
              {!isTeacherAuthenticated && <Lock className="w-3 h-3 shrink-0 text-slate-400 ml-0.5" />}
            </button>

            <button
              onClick={() => handleSelectTab('submissions-export')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
                activeTab === 'submissions-export'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'submissions-export' ? 'text-white' : 'text-slate-500'}`} />
              <span>Google Sheets &amp; Email</span>
              {!isTeacherAuthenticated && <Lock className="w-3 h-3 shrink-0 text-slate-400 ml-0.5" />}
              {totalSubmissionsCount > 0 && (
                <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0">
                  {totalSubmissionsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => handleSelectTab('question-bank')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
                activeTab === 'question-bank'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <HelpCircle className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'question-bank' ? 'text-white' : 'text-slate-500'}`} />
              <span>Question Bank &amp; Answer Keys</span>
              {!isTeacherAuthenticated && <Lock className="w-3 h-3 shrink-0 text-slate-400 ml-0.5" />}
            </button>
          </div>

          {/* Admin Console & About Section - Explicitly Separated */}
          <div className="pl-2 border-l border-slate-300 flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => handleSelectTab('admin')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
                activeTab === 'admin'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>System Admin Console</span>
              {!isTeacherAuthenticated && <Lock className="w-3 h-3 shrink-0 text-amber-600 ml-0.5" />}
            </button>

            {onOpenAbout && (
              <button
                onClick={() => onOpenAbout('about')}
                className="px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer shrink-0"
                title="About Assessment Platform & Pedagogical Research"
              >
                <Info className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                <span className="hidden sm:inline">About Platform</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};


