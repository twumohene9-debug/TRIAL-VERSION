import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Unlock,
  Key,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  Clock,
  Fingerprint,
  Zap,
  ArrowRight,
  Flame,
  Award
} from 'lucide-react';
import { AdminSecuritySettings, TeacherAccessCode } from '../types';
import { BrandLogo } from './BrandLogo';
import {
  DEFAULT_ADMIN_SECURITY_SETTINGS,
  validateLayer1,
  validateLayer3,
} from '../utils/adminSecurityDefaults';

interface AdminMultiLayerVerificationProps {
  securitySettings?: AdminSecuritySettings;
  teacherAccessCodes?: TeacherAccessCode[];
  onUnlockSuccess: () => void;
  onCancel?: () => void;
}

export const AdminMultiLayerVerification: React.FC<AdminMultiLayerVerificationProps> = ({
  securitySettings = DEFAULT_ADMIN_SECURITY_SETTINGS,
  teacherAccessCodes = [],
  onUnlockSuccess,
  onCancel,
}) => {
  const settings = { ...DEFAULT_ADMIN_SECURITY_SETTINGS, ...securitySettings };

  // Determine active layers based on mode and enabledLayers
  const getActiveLayersList = (): ('layer1' | 'layer2' | 'layer3')[] => {
    if (settings.securityMode === 'all_3') {
      return ['layer1', 'layer2', 'layer3'];
    }
    if (settings.securityMode === 'custom') {
      const list: ('layer1' | 'layer2' | 'layer3')[] = [];
      if (settings.enabledLayers?.layer1) list.push('layer1');
      if (settings.enabledLayers?.layer2) list.push('layer2');
      if (settings.enabledLayers?.layer3) list.push('layer3');
      return list.length > 0 ? list : ['layer1'];
    }
    // For any_2 or any_1, all 3 locks can be attempted
    return ['layer1', 'layer2', 'layer3'];
  };

  const activeLayers = getActiveLayersList();

  // How many locks are required to unlock?
  const requiredLockCount = (() => {
    if (settings.securityMode === 'all_3') return 3;
    if (settings.securityMode === 'any_2') return 2;
    if (settings.securityMode === 'any_1') return 1;
    // custom
    return activeLayers.length;
  })();

  // Current active step view ('layer1' | 'layer2' | 'layer3')
  const [currentLayerTab, setCurrentLayerTab] = useState<'layer1' | 'layer2' | 'layer3'>(
    activeLayers[0] || 'layer1'
  );

  // Completed layers state
  const [completedLayers, setCompletedLayers] = useState<{
    layer1: boolean;
    layer2: boolean;
    layer3: boolean;
  }>({
    layer1: false,
    layer2: false,
    layer3: false,
  });

  // Layer 1 State (Email & Password)
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [layer1Error, setLayer1Error] = useState<string | null>(null);

  // Layer 2 State (Golden Key Rhythm Authentication)
  const tapRequired = settings.keyTapCountRequired || 3;
  const tapWindowMs = settings.keyTapTimeWindowMs || 2000;
  const [taps, setTaps] = useState<number[]>([]);
  const [tapSuccess, setTapSuccess] = useState<boolean>(false);
  const [tapFailedNotice, setTapFailedNotice] = useState<string | null>(null);
  const [isKeyAnimating, setIsKeyAnimating] = useState<boolean>(false);
  const timerTimeoutRef = useRef<any>(null);

  // Layer 3 State (Passphrase: thejoyoftheLordis mystrength)
  const [passphraseInput, setPassphraseInput] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [layer3Error, setLayer3Error] = useState<string | null>(null);

  // General state
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Count total completed
  const completedCount =
    (completedLayers.layer1 ? 1 : 0) +
    (completedLayers.layer2 ? 1 : 0) +
    (completedLayers.layer3 ? 1 : 0);

  // Check if threshold reached
  useEffect(() => {
    if (completedCount >= requiredLockCount && !isUnlocked) {
      setIsUnlocked(true);
      setTimeout(() => {
        onUnlockSuccess();
      }, 700);
    }
  }, [completedCount, requiredLockCount, isUnlocked, onUnlockSuccess]);

  // Layer 1 Submit Handler
  const handleLayer1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = validateLayer1(emailInput, passwordInput, settings, teacherAccessCodes);
    if (isValid) {
      setLayer1Error(null);
      const nextCompleted = { ...completedLayers, layer1: true };
      setCompletedLayers(nextCompleted);

      // Check next incomplete layer
      const nextCount = (nextCompleted.layer1 ? 1 : 0) + (nextCompleted.layer2 ? 1 : 0) + (nextCompleted.layer3 ? 1 : 0);
      if (nextCount < requiredLockCount) {
        if (!nextCompleted.layer2 && activeLayers.includes('layer2')) {
          setCurrentLayerTab('layer2');
        } else if (!nextCompleted.layer3 && activeLayers.includes('layer3')) {
          setCurrentLayerTab('layer3');
        }
      }
    } else {
      setLayer1Error('Invalid administrator email or security code.');
    }
  };

  // Layer 2 Key Touch / Tap Handler
  const handleKeyTouch = () => {
    if (completedLayers.layer2 || tapSuccess) return;

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(30);
      } catch (e) {}
    }

    setIsKeyAnimating(true);
    setTimeout(() => setIsKeyAnimating(false), 200);

    const now = Date.now();
    setTaps((prev) => {
      // Filter out taps outside the window
      const validTaps = prev.filter((t) => now - t <= tapWindowMs);
      const newTaps = [...validTaps, now];

      // Check if requirement met
      if (newTaps.length >= tapRequired) {
        const firstTap = newTaps[0];
        const elapsed = now - firstTap;
        if (elapsed <= tapWindowMs) {
          // Success!
          setTapSuccess(true);
          setTapFailedNotice(null);
          if (timerTimeoutRef.current) {
            clearTimeout(timerTimeoutRef.current);
          }

          setTimeout(() => {
            const nextCompleted = { ...completedLayers, layer2: true };
            setCompletedLayers(nextCompleted);
            const nextCount = (nextCompleted.layer1 ? 1 : 0) + (nextCompleted.layer2 ? 1 : 0) + (nextCompleted.layer3 ? 1 : 0);
            if (nextCount < requiredLockCount) {
              if (!nextCompleted.layer3 && activeLayers.includes('layer3')) {
                setCurrentLayerTab('layer3');
              } else if (!nextCompleted.layer1 && activeLayers.includes('layer1')) {
                setCurrentLayerTab('layer1');
              }
            }
          }, 600);
          return newTaps;
        }
      }

      return newTaps;
    });
  };

  // Reset taps after window expires without displaying any clue
  useEffect(() => {
    if (taps.length > 0 && !tapSuccess && !completedLayers.layer2) {
      if (timerTimeoutRef.current) {
        clearTimeout(timerTimeoutRef.current);
      }

      timerTimeoutRef.current = setTimeout(() => {
        setTaps([]);
        setTapFailedNotice('Verification unsuccessful. Access denied.');
      }, tapWindowMs + 100);

      return () => {
        if (timerTimeoutRef.current) {
          clearTimeout(timerTimeoutRef.current);
        }
      };
    }
  }, [taps, tapSuccess, completedLayers.layer2, tapWindowMs]);

  // Layer 3 Submit Handler
  const handleLayer3Submit = (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = validateLayer3(passphraseInput, settings.passphrase);
    if (isValid) {
      setLayer3Error(null);
      const nextCompleted = { ...completedLayers, layer3: true };
      setCompletedLayers(nextCompleted);

      const nextCount = (nextCompleted.layer1 ? 1 : 0) + (nextCompleted.layer2 ? 1 : 0) + (nextCompleted.layer3 ? 1 : 0);
      if (nextCount < requiredLockCount) {
        if (!nextCompleted.layer1 && activeLayers.includes('layer1')) {
          setCurrentLayerTab('layer1');
        } else if (!nextCompleted.layer2 && activeLayers.includes('layer2')) {
          setCurrentLayerTab('layer2');
        }
      }
    } else {
      setLayer3Error('Passphrase does not match. Please verify the sacred phrase.');
    }
  };

  return (
    <div className="max-w-lg mx-auto my-8 px-4 sm:px-0">
      <div className="bg-[#0A0E1A] border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center text-white relative overflow-hidden backdrop-blur-md">
        {/* Glow ambient background */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Security Emblem */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30 border border-amber-300 animate-in zoom-in duration-300">
            {isUnlocked ? (
              <Unlock className="w-8 h-8 text-slate-950 animate-bounce" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-slate-950" />
            )}
          </div>
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-900 border border-amber-400/60 text-[10px] font-mono font-bold text-amber-300 uppercase tracking-widest shadow-xs">
            Admin Verification Gate
          </span>
        </div>

        {/* Title & Description */}
        <div className="pt-2">
          <h2 className="text-2xl font-bold font-serif text-white tracking-wide">
            Admin Portal Verification
          </h2>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-sm mx-auto">
            {settings.securityMode === 'all_3'
              ? 'Complete all 3 security layers to unlock administrator access.'
              : settings.securityMode === 'any_2'
              ? 'Complete any 2 security locks below to unlock administrator access.'
              : settings.securityMode === 'any_1'
              ? 'Complete any security lock below to unlock administrator access.'
              : `Complete the ${requiredLockCount} required security verification(s).`}
          </p>
        </div>

        {/* Multi-Lock Progress Stepper */}
        <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs px-2">
            <span className="text-slate-400 font-medium">Security Status:</span>
            <span className="font-mono font-bold text-amber-400">
              {completedCount} / {requiredLockCount} Verified
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Layer 1 Tab / Step */}
            <button
              type="button"
              onClick={() => setCurrentLayerTab('layer1')}
              disabled={completedLayers.layer1}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                completedLayers.layer1
                  ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                  : currentLayerTab === 'layer1'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-2 ring-amber-400/40 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-1">
                {completedLayers.layer1 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                <span className="text-[11px]">Layer 1</span>
              </div>
              <span className="text-[9px] font-normal opacity-80 truncate max-w-[85px]">
                Identity Lock
              </span>
            </button>

            {/* Layer 2 Tab / Step */}
            <button
              type="button"
              onClick={() => setCurrentLayerTab('layer2')}
              disabled={completedLayers.layer2}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                completedLayers.layer2
                  ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                  : currentLayerTab === 'layer2'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-2 ring-amber-400/40 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-1">
                {completedLayers.layer2 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Key className="w-3.5 h-3.5" />
                )}
                <span className="text-[11px]">Layer 2</span>
              </div>
              <span className="text-[9px] font-normal opacity-80 truncate max-w-[85px]">
                Access Key
              </span>
            </button>

            {/* Layer 3 Tab / Step */}
            <button
              type="button"
              onClick={() => setCurrentLayerTab('layer3')}
              disabled={completedLayers.layer3}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                completedLayers.layer3
                  ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                  : currentLayerTab === 'layer3'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-2 ring-amber-400/40 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-1">
                {completedLayers.layer3 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Fingerprint className="w-3.5 h-3.5" />
                )}
                <span className="text-[11px]">Layer 3</span>
              </div>
              <span className="text-[9px] font-normal opacity-80 truncate max-w-[85px]">
                Passcode Lock
              </span>
            </button>
          </div>
        </div>

        {/* ================= LAYER 1: EMAIL & PASSWORD ================= */}
        {currentLayerTab === 'layer1' && (
          <div className="space-y-4 text-left animate-in fade-in duration-200">
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-300">Layer 1: Administrator Credentials</span>
              </div>
              {completedLayers.layer1 && (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified</span>
                </span>
              )}
            </div>

            {layer1Error && (
              <div className="bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{layer1Error}</span>
              </div>
            )}

            {completedLayers.layer1 ? (
              <div className="p-6 bg-emerald-950/30 border border-emerald-500/40 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-sm font-bold text-emerald-300">Layer 1 Authenticated Successfully</p>
                <p className="text-xs text-slate-400">Proceed to the next security layer to complete verification.</p>
              </div>
            ) : (
              <form onSubmit={handleLayer1Submit} className="space-y-4" autoComplete="off">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    ADMINISTRATOR EMAIL
                  </label>
                  <input
                    type="email"
                    placeholder="Enter administrator email"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      setLayer1Error(null);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 text-white font-medium text-xs p-3.5 rounded-xl focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-hidden transition-all"
                    autoComplete="off"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    SECURITY CODE / PASSWORD
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter security code"
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        setLayer1Error(null);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 text-white font-medium text-xs p-3.5 pr-10 rounded-xl focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-hidden transition-all tracking-wider"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-900/40 flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify Credentials</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* ================= LAYER 2: GOLDEN ACCESS KEY ================= */}
        {currentLayerTab === 'layer2' && (
          <div className="space-y-4 text-center animate-in fade-in duration-200">
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between text-left">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-300">
                  Layer 2: Golden Access Key
                </span>
              </div>
              {completedLayers.layer2 && (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Unlocked</span>
                </span>
              )}
            </div>

            {tapFailedNotice && (
              <div className="bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs p-3 rounded-xl flex items-center gap-2 text-left">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{tapFailedNotice}</span>
              </div>
            )}

            {completedLayers.layer2 || tapSuccess ? (
              <div className="p-6 bg-emerald-950/30 border border-emerald-500/40 rounded-2xl text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto shadow-inner animate-bounce">
                  <Key className="w-9 h-9 rotate-90 transition-transform duration-500" />
                </div>
                <p className="text-sm font-bold text-emerald-300">Access Key Verified Successfully</p>
                <p className="text-xs text-slate-400">
                  Security authorization granted.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Interactive Golden Key Button with NO text clue and NO countdown reading bar */}
                <div className="py-6 flex flex-col items-center justify-center">
                  <button
                    type="button"
                    onClick={handleKeyTouch}
                    className={`relative group w-28 h-28 rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-slate-950 p-1 flex items-center justify-center shadow-2xl shadow-amber-500/40 border-2 border-yellow-200 transition-all cursor-pointer select-none active:scale-90 touch-manipulation ${
                      isKeyAnimating ? 'scale-90 ring-4 ring-amber-300' : 'hover:scale-105'
                    }`}
                    style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                  >
                    <div className="w-full h-full rounded-[22px] bg-gradient-to-tr from-amber-500/90 to-yellow-300/90 flex flex-col items-center justify-center shadow-inner">
                      <Key
                        className={`w-12 h-12 text-slate-950 transition-all duration-150 ${
                          isKeyAnimating ? 'rotate-45 scale-110' : 'group-hover:rotate-12'
                        }`}
                      />
                    </div>

                    {/* Radial ripple effect */}
                    <span className="absolute -inset-1 rounded-3xl bg-amber-400/30 animate-ping pointer-events-none opacity-75" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= LAYER 3: PASSPHRASE ================= */}
        {currentLayerTab === 'layer3' && (
          <div className="space-y-4 text-left animate-in fade-in duration-200">
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-300">Layer 3: Security Passphrase</span>
              </div>
              {completedLayers.layer3 && (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified</span>
                </span>
              )}
            </div>

            {layer3Error && (
              <div className="bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{layer3Error}</span>
              </div>
            )}

            {completedLayers.layer3 ? (
              <div className="p-6 bg-emerald-950/30 border border-emerald-500/40 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-sm font-bold text-emerald-300">Passphrase Verified Successfully</p>
                <p className="text-xs text-slate-400">Security authorization approved.</p>
              </div>
            ) : (
              <form onSubmit={handleLayer3Submit} className="space-y-4" autoComplete="off">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    ENTER PASSPHRASE
                  </label>
                  <div className="relative">
                    <input
                      type={showPassphrase ? 'text' : 'password'}
                      placeholder="Enter security passphrase"
                      value={passphraseInput}
                      onChange={(e) => {
                        setPassphraseInput(e.target.value);
                        setLayer3Error(null);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 text-white font-medium text-xs p-3.5 pr-10 rounded-xl focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-hidden transition-all tracking-wider"
                      autoComplete="off"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassphrase(!showPassphrase)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer p-1"
                    >
                      {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-900/40 flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify Passphrase</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Global Footer Notice & Cancellation */}
        <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <BrandLogo size="xs" variant="icon-only" className="w-3.5 h-3.5 shrink-0" />
            <span>MCQ Assessment Hub • Secure Verification</span>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-slate-400 hover:text-white font-medium underline text-[11px] cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
