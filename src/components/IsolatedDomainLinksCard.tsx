import React, { useState } from 'react';
import { 
  Globe, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode, 
  ShieldCheck, 
  Lock, 
  Unlock,
  GraduationCap, 
  User, 
  ShieldAlert,
  Sparkles,
  Info,
  Layers,
  AlertTriangle,
  Radio,
  Power,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { QuizConfig, SystemSettings } from '../types';
import { QRCodeModal } from './QRCodeModal';
import { encodeQuizToSelfContainedUrl } from '../utils/quizCompression';

interface IsolatedDomainLinksCardProps {
  quizzes: QuizConfig[];
  systemSettings?: SystemSettings;
  onUpdateSystemSettings?: (settings: Partial<SystemSettings>) => void;
  userRole?: 'admin' | 'teacher';
}

export const IsolatedDomainLinksCard: React.FC<IsolatedDomainLinksCardProps> = ({ 
  quizzes,
  systemSettings,
  onUpdateSystemSettings,
  userRole = 'admin'
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedQuizForLink, setSelectedQuizForLink] = useState<string>(quizzes[0]?.code || quizzes[0]?.id || '');
  const [qrModalQuiz, setQrModalQuiz] = useState<QuizConfig | null>(null);
  const [qrModalMode, setQrModalMode] = useState<'online' | 'offline' | 'both'>('online');
  const [customMasterMsg, setCustomMasterMsg] = useState<string>(
    systemSettings?.masterLockMessage || 'Access to this assessment portal is temporarily locked by the administrator.'
  );
  const [isSavingMessage, setIsSavingMessage] = useState<boolean>(false);

  const origin = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';

  const isMasterLocked = Boolean(systemSettings?.isMasterPortalLocked);
  const lockedUrls = systemSettings?.lockedUrls || {};

  const domainLinks = [
    {
      key: 'teacher-student',
      name: 'Teacher & Student Combined Portal',
      badge: 'Academic Portal • Admin Excluded',
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
      icon: Layers,
      iconBg: 'bg-sky-500/10 text-sky-600 border-sky-300',
      url: `${origin}?portal=teacher-student`,
      description: 'Opens strictly into the combined Teacher & Student interface. Allows seamless switching between faculty monitoring and student examination desk, while completely excluding and locking out Master Administrator routes.',
      securityNotice: 'Admin links and controls are completely omitted. Teachers & students can access and interact without seeing master administration.'
    },
    {
      key: 'student',
      name: 'Student Examination Portal',
      badge: 'Strict Student Sandbox',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: User,
      iconBg: 'bg-emerald-500/10 text-emerald-600 border-emerald-300',
      url: `${origin}?portal=student`,
      description: 'Opens strictly and exclusively into the Student Examination Desk. Zero routes or access to Teacher or Admin tools. Students can only take assigned examinations and review results.',
      securityNotice: 'Completely isolated. Navigation bars, teacher dropdowns, and back switches to other portals are permanently suppressed.'
    },
    {
      key: 'teacher',
      name: 'Teacher Management Portal',
      badge: 'Strict Faculty Domain',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      icon: GraduationCap,
      iconBg: 'bg-indigo-500/10 text-indigo-600 border-indigo-300',
      url: `${origin}?portal=teacher`,
      description: 'Opens strictly and exclusively into the Teacher Management Workspace. Dedicated faculty workspace for monitoring student progress, editing question banks, and surveillance. All student test entry and admin controls are strictly omitted.',
      securityNotice: 'Teachers cannot access master admin security codes or administrative permission configuration.'
    },
    {
      key: 'admin',
      name: 'Master Administrator Portal',
      badge: 'Central Root Domain',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      icon: ShieldAlert,
      iconBg: 'bg-amber-500/10 text-amber-600 border-amber-300',
      url: `${origin}?portal=admin`,
      description: 'Opens strictly into the Central Administrator Console. Full system governance, faculty access codes generation, audit logs, and real-time portal lockdown controls.',
      securityNotice: 'Protected by administrator email and security code authentication.'
    }
  ];

  const handleCopy = (key: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleMasterLock = () => {
    if (!onUpdateSystemSettings) return;
    const newLockState = !isMasterLocked;
    onUpdateSystemSettings({
      isMasterPortalLocked: newLockState,
      masterLockMessage: customMasterMsg,
    });
  };

  const handleToggleUrlLock = (urlKey: string) => {
    if (!onUpdateSystemSettings) return;
    const currentLocked = Boolean(lockedUrls[urlKey as keyof typeof lockedUrls]);
    const updatedLockedUrls = {
      ...lockedUrls,
      [urlKey]: !currentLocked,
    };
    onUpdateSystemSettings({
      lockedUrls: updatedLockedUrls,
    });
  };

  const handleLockAllUrls = () => {
    if (!onUpdateSystemSettings) return;
    onUpdateSystemSettings({
      isMasterPortalLocked: true,
      lockedUrls: {
        'teacher-student': true,
        student: true,
        teacher: true,
        admin: true,
      },
    });
  };

  const handleUnlockAllUrls = () => {
    if (!onUpdateSystemSettings) return;
    onUpdateSystemSettings({
      isMasterPortalLocked: false,
      lockedUrls: {
        'teacher-student': false,
        student: false,
        teacher: false,
        admin: false,
      },
    });
  };

  const handleSaveLockMessage = () => {
    if (!onUpdateSystemSettings) return;
    setIsSavingMessage(true);
    onUpdateSystemSettings({
      masterLockMessage: customMasterMsg,
    });
    setTimeout(() => setIsSavingMessage(false), 800);
  };

  const selectedQuizObj = quizzes.find((q) => (q.code || q.id) === selectedQuizForLink) || quizzes[0];
  const currentQuizUrl = `${origin}?quiz=${encodeURIComponent(selectedQuizForLink)}&standalone=true`;
  const currentOfflineQuizUrl = selectedQuizObj
    ? encodeQuizToSelfContainedUrl(selectedQuizObj, selectedQuizObj.questions || [], selectedQuizObj.sections || [])
    : '';

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-600" />
                <span>{userRole === 'teacher' ? 'Academic Faculty • Domain Isolation & Portal Links Engine' : 'Admin Eyes Only • Domain Isolation & Security Lockdown Engine'}</span>
              </span>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                4 Dedicated Interfaces
              </span>
              {isMasterLocked ? (
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  <span>Master Portal Lockdown Active</span>
                </span>
              ) : (
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Portals Active</span>
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold font-serif text-slate-900 mt-1">
              Isolated Domain Access Links & Portals
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {userRole === 'teacher' 
                ? 'Each unique link opens only that specified interface. Distribute isolated candidate exam links, access teacher/student workspaces, and review real-time portal lockdown status.'
                : 'Each unique link opens only that specified interface. Admin can lock or unlock the whole portal or any of the 4 URLs individually in real-time.'}
            </p>
          </div>
        </div>
      </div>

      {/* 4 Domain Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {domainLinks.map((domain) => {
          const Icon = domain.icon;
          const isCopied = copiedKey === domain.key;
          const isThisUrlLocked = Boolean(lockedUrls[domain.key as keyof typeof lockedUrls]);
          const isEffectivelyLocked = isMasterLocked || isThisUrlLocked;

          return (
            <div
              key={domain.key}
              className={`rounded-2xl p-5 flex flex-col justify-between transition-all shadow-2xs space-y-4 border ${
                isEffectivelyLocked
                  ? 'bg-rose-50/40 border-rose-300 shadow-rose-100/50'
                  : 'bg-slate-50/80 hover:bg-slate-50 border-slate-200 hover:border-indigo-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${domain.iconBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${domain.badgeColor}`}>
                    {domain.badge}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-1.5">
                    <h3 className="text-sm font-bold font-serif text-slate-900">
                      {domain.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {domain.description}
                  </p>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700 truncate select-all shadow-inner">
                  {domain.url}
                </div>

                {/* Per-Card Security & Lock Status Badge */}
                <div className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between gap-2 ${
                  isEffectivelyLocked 
                    ? 'bg-rose-100/80 border-rose-300 text-rose-900 font-medium' 
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900 font-medium'
                }`}>
                  <div className="flex items-center gap-1.5 truncate">
                    {isEffectivelyLocked ? (
                      <>
                        <Lock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span className="font-bold">
                          {isMasterLocked ? 'Master Lockdown' : 'URL Locked by Admin'}
                        </span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-bold">
                          Active & Accessible
                        </span>
                      </>
                    )}
                  </div>

                  {/* Quick toggle on card */}
                  <button
                    onClick={() => handleToggleUrlLock(domain.key)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                      isThisUrlLocked
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                        : 'bg-rose-600 hover:bg-rose-700 text-white shadow-2xs'
                    }`}
                    title={isThisUrlLocked ? `Unlock ${domain.name}` : `Lock ${domain.name}`}
                  >
                    {isThisUrlLocked ? (
                      <>
                        <Unlock className="w-3 h-3" />
                        <span>Unlock</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" />
                        <span>Lock</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
                <button
                  onClick={() => handleCopy(domain.key, domain.url)}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                    isCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Link Copied!' : 'Copy Unique Link'}</span>
                </button>

                <a
                  href={domain.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer"
                  title="Test in New Tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MASTER PORTAL & URL LOCKDOWN CONTROL CONSOLE (DIRECTLY UNDER THE 4 CARDS) */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1.5 tracking-wider">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Central Access & Lockdown Governance</span>
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Radio className="w-3 h-3 text-emerald-400 animate-ping" />
                <span>Live Cloud Sync</span>
              </span>
            </div>
            <h3 className="text-lg font-bold font-serif text-white tracking-tight">
              Portal Lockdown & Security Command Console
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Instantly lock down the entire portal (all candidate examination desks, teacher panels, and student links) or selectively lock/unlock any of the 4 URLs individually. Changes take effect on all devices in real-time.
            </p>
          </div>

          {/* Quick Global Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleLockAllUrls}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-rose-950/40 active:scale-95"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock All 4 Portals</span>
            </button>

            <button
              onClick={handleUnlockAllUrls}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-emerald-950/40 active:scale-95"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Unlock All 4 Portals</span>
            </button>
          </div>
        </div>

        {/* Master Global Lock Toggle Switch Banner */}
        <div className={`p-5 rounded-2xl border transition-all ${
          isMasterLocked
            ? 'bg-rose-950/60 border-rose-500/60 shadow-lg shadow-rose-950/50'
            : 'bg-slate-800/60 border-slate-700'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shadow-inner ${
                isMasterLocked ? 'bg-rose-600 text-white animate-bounce' : 'bg-slate-700 text-slate-300'
              }`}>
                {isMasterLocked ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">
                    Master Global Portal Lockdown
                  </h4>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                    isMasterLocked 
                      ? 'bg-rose-500/30 text-rose-200 border-rose-400' 
                      : 'bg-slate-700 text-slate-300 border-slate-600'
                  }`}>
                    {isMasterLocked ? 'LOCKDOWN ENGAGED' : 'UNLOCKED / NORMAL'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  {isMasterLocked
                    ? 'All 4 URLs and assessment entry points are currently locked. Candidates and teachers visiting any URL will see the official locked notice.'
                    : 'All portals operate under standard permissions. You can engage master lockdown during examination grading, moderation, or maintenance.'}
                </p>
              </div>
            </div>

            {/* Toggle Button */}
            <button
              onClick={handleToggleMasterLock}
              className={`px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 shrink-0 ${
                isMasterLocked
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-emerald-900/50'
                  : 'bg-rose-600 hover:bg-rose-500 text-white font-black shadow-rose-900/50'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{isMasterLocked ? 'Deactivate Master Lockdown' : 'Engage Master Lockdown'}</span>
            </button>
          </div>
        </div>

        {/* 4 URLs Individual Lockdown Controls Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Selective Individual URL Lock Controls (4 Dedicated Links)</span>
            </h4>
            <span className="text-[11px] text-slate-400">
              Click individual switches below to lock or unlock specific links
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {domainLinks.map((domain) => {
              const isLocked = Boolean(lockedUrls[domain.key as keyof typeof lockedUrls]);
              const effectivelyLocked = isMasterLocked || isLocked;

              return (
                <div
                  key={`switch-${domain.key}`}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                    effectivelyLocked
                      ? 'bg-rose-950/40 border-rose-700/50'
                      : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-bold text-white truncate">
                        {domain.name}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                        effectivelyLocked ? 'bg-rose-500/30 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {effectivelyLocked ? 'LOCKED' : 'ACTIVE'}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 mt-1 truncate">
                      ?portal={domain.key}
                    </p>
                  </div>

                  <button
                    onClick={() => handleToggleUrlLock(domain.key)}
                    className={`w-full py-1.5 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isLocked
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-rose-600/90 hover:bg-rose-500 text-white'
                    }`}
                  >
                    {isLocked ? (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Unlock URL</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Lock URL</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Lock Announcement Message Editor */}
        <div className="bg-slate-800/40 border border-slate-700/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-400" />
              <span>Lockdown Announcement Message for Candidates & Faculty</span>
            </label>
            <span className="text-[10px] text-slate-400">
              Shown to visitors when any locked URL or Master Lockdown is accessed
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={customMasterMsg}
              onChange={(e) => setCustomMasterMsg(e.target.value)}
              placeholder="e.g. Access to this assessment portal is temporarily locked by the administrator."
              className="flex-1 bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-amber-500 font-sans"
            />

            <button
              onClick={handleSaveLockMessage}
              disabled={isSavingMessage}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shrink-0"
            >
              {isSavingMessage ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{isSavingMessage ? 'Saving...' : 'Save & Sync Notice'}</span>
            </button>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-slate-400">Quick Presets:</span>
            {[
              'Examination window is currently closed for administrative moderation.',
              'Portal under scheduled system maintenance. Will reopen shortly.',
              'Assessment period has officially concluded for this academic session.',
            ].map((preset, idx) => (
              <button
                key={`preset-${idx}`}
                onClick={() => {
                  setCustomMasterMsg(preset);
                  if (onUpdateSystemSettings) {
                    onUpdateSystemSettings({ masterLockMessage: preset });
                  }
                }}
                className="text-[10px] bg-slate-750 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-0.5 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                "{preset.substring(0, 32)}..."
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Specialized Direct-Quiz Student Link Generator (Online & 100% Offline) */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50/50 to-indigo-50/50 border border-emerald-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
              Direct Single-Quiz Student Assessment Links &amp; QR Codes
            </h4>
          </div>
          {selectedQuizObj && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setQrModalMode('online');
                  setQrModalQuiz(selectedQuizObj);
                }}
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                title="View Online URL QR Code"
              >
                <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                <span>Online QR</span>
              </button>
              <button
                onClick={() => {
                  setQrModalMode('offline');
                  setQrModalQuiz(selectedQuizObj);
                }}
                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                title="View Offline URL QR Code (Zero Server)"
              >
                <WifiOff className="w-3.5 h-3.5 text-emerald-300" />
                <span>Offline QR</span>
              </button>
            </div>
          )}
        </div>

        <p className="text-xs text-emerald-900 leading-relaxed">
          Generate isolated assessment URLs and scannable QR codes for specific assessments. Students can enter immediately without dashboard browsing.
        </p>

        {/* Quiz Picker */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1">
            Target Examination:
          </label>
          <select
            value={selectedQuizForLink}
            onChange={(e) => setSelectedQuizForLink(e.target.value)}
            className="w-full bg-white border border-emerald-300 text-slate-800 text-xs rounded-xl px-3.5 py-2.5 font-medium focus:ring-2 focus:ring-emerald-500"
          >
            {quizzes.map((q) => (
              <option key={q.id} value={q.code || q.id}>
                {q.code} — {q.title} ({q.subject})
              </option>
            ))}
          </select>
        </div>

        {/* 1. Online Assessment URL */}
        <div className="space-y-1.5 bg-white/70 border border-indigo-100 p-3 rounded-xl">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-indigo-950 flex items-center gap-1">
              <Wifi className="w-3 h-3 text-indigo-600" />
              Online Assessment URL:
            </span>
            <span className="text-[10px] text-slate-500">Cloud Sync &amp; Surveillance</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white border border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-mono text-indigo-950 truncate select-all">
              {currentQuizUrl}
            </div>
            <button
              onClick={() => handleCopy('quiz-direct', currentQuizUrl)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shrink-0 ${
                copiedKey === 'quiz-direct'
                  ? 'bg-indigo-800 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {copiedKey === 'quiz-direct' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'quiz-direct' ? 'Copied' : 'Copy Online Link'}</span>
            </button>
            {selectedQuizObj && (
              <button
                onClick={() => {
                  setQrModalMode('online');
                  setQrModalQuiz(selectedQuizObj);
                }}
                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg cursor-pointer"
                title="Open Online QR Code"
              >
                <QrCode className="w-4 h-4 text-indigo-600" />
              </button>
            )}
          </div>
        </div>

        {/* 2. 100% Offline Assessment URL */}
        <div className="space-y-1.5 bg-white/70 border border-emerald-200 p-3 rounded-xl">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-emerald-950 flex items-center gap-1">
              <WifiOff className="w-3 h-3 text-emerald-700" />
              100% Offline URL (Self-Contained Data):
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold">Zero Server Required</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-mono text-emerald-950 truncate select-all">
              {currentOfflineQuizUrl.slice(0, 75)}...
            </div>
            <button
              onClick={() => handleCopy('quiz-offline', currentOfflineQuizUrl)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shrink-0 ${
                copiedKey === 'quiz-offline'
                  ? 'bg-emerald-800 text-white'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
            >
              {copiedKey === 'quiz-offline' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'quiz-offline' ? 'Copied' : 'Copy Offline Link'}</span>
            </button>
            {selectedQuizObj && (
              <button
                onClick={() => {
                  setQrModalMode('offline');
                  setQrModalQuiz(selectedQuizObj);
                }}
                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg cursor-pointer"
                title="Open Offline QR Code"
              >
                <QrCode className="w-4 h-4 text-emerald-700" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Standalone QR Code Modal */}
      {qrModalQuiz && (
        <QRCodeModal
          isOpen={Boolean(qrModalQuiz)}
          onClose={() => setQrModalQuiz(null)}
          quiz={qrModalQuiz}
          questions={qrModalQuiz.questions || []}
          sections={qrModalQuiz.sections || []}
          initialMode={qrModalMode}
        />
      )}
    </div>
  );
};
