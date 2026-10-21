import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  Key,
  Flame,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  Clock,
  Fingerprint,
  Zap,
  Save,
  RotateCcw,
  Sliders,
  Shield,
  Layers,
  HelpCircle,
  Check
} from 'lucide-react';
import { AdminSecuritySettings, SystemSettings } from '../types';
import { DEFAULT_ADMIN_SECURITY_SETTINGS } from '../utils/adminSecurityDefaults';

interface AdminSecurityPanelProps {
  systemSettings: SystemSettings;
  onUpdateSystemSettings: (updates: Partial<SystemSettings>) => Promise<void>;
}

export const AdminSecurityPanel: React.FC<AdminSecurityPanelProps> = ({
  systemSettings,
  onUpdateSystemSettings,
}) => {
  const currentSettings: AdminSecuritySettings = {
    ...DEFAULT_ADMIN_SECURITY_SETTINGS,
    ...(systemSettings.adminSecurity || {}),
  };

  // Local editing states
  const [securityMode, setSecurityMode] = useState<AdminSecuritySettings['securityMode']>(
    currentSettings.securityMode || 'all_3'
  );
  const [enabledLayers, setEnabledLayers] = useState({
    layer1: currentSettings.enabledLayers?.layer1 ?? true,
    layer2: currentSettings.enabledLayers?.layer2 ?? true,
    layer3: currentSettings.enabledLayers?.layer3 ?? true,
  });

  // Layer 1
  const [adminEmail, setAdminEmail] = useState(currentSettings.adminEmail || 'twumbismark90@gmail.com');
  const [adminPassword, setAdminPassword] = useState(currentSettings.adminPassword || '2026');
  const [showPassword, setShowPassword] = useState(false);

  // Layer 2
  const [keyTapCountRequired, setKeyTapCountRequired] = useState(currentSettings.keyTapCountRequired || 3);
  const [keyTapTimeWindowMs, setKeyTapTimeWindowMs] = useState(currentSettings.keyTapTimeWindowMs || 2000);

  // Layer 3
  const [passphrase, setPassphrase] = useState(currentSettings.passphrase || 'thejoyoftheLordis mystrength');
  const [showPassphrase, setShowPassphrase] = useState(false);

  // Status feedback
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Interactive Live Sandbox for Layer 2 Test
  const [sandboxTaps, setSandboxTaps] = useState<number[]>([]);
  const [sandboxSuccess, setSandboxSuccess] = useState(false);
  const [sandboxNotice, setSandboxNotice] = useState<string | null>(null);
  const [isSandboxAnimating, setIsSandboxAnimating] = useState(false);

  const handleSandboxTap = () => {
    const now = Date.now();
    setIsSandboxAnimating(true);
    setTimeout(() => setIsSandboxAnimating(false), 200);

    const validTaps = [...sandboxTaps.filter((t) => now - t <= keyTapTimeWindowMs), now];
    setSandboxTaps(validTaps);

    if (validTaps.length >= keyTapCountRequired) {
      setSandboxSuccess(true);
      setSandboxNotice(`Success! Registered ${validTaps.length} touches in under ${(keyTapTimeWindowMs / 1000).toFixed(1)}s.`);
      setSandboxTaps([]);
      setTimeout(() => {
        setSandboxSuccess(false);
        setSandboxNotice(null);
      }, 3500);
    } else {
      setSandboxNotice(`Touch ${validTaps.length} of ${keyTapCountRequired} recorded... Keep tapping quickly!`);
    }
  };

  const handleSaveSecurityPolicy = async () => {
    setIsSaving(true);
    const updatedSettings: AdminSecuritySettings = {
      adminEmail: adminEmail.trim(),
      adminPassword: adminPassword.trim(),
      keyTapCountRequired,
      keyTapTimeWindowMs,
      passphrase: passphrase.trim(),
      securityMode,
      enabledLayers,
    };

    try {
      await onUpdateSystemSettings({
        adminSecurity: updatedSettings,
        adminContactEmail: adminEmail.trim() || systemSettings.adminContactEmail,
      });
      setSaveSuccessNotice('Admin multi-layer security configuration successfully updated & saved.');
      setTimeout(() => setSaveSuccessNotice(null), 4000);
    } catch (err) {
      console.error('Failed to save security settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Reset all 3 admin security locks to factory defaults?')) {
      setSecurityMode('all_3');
      setEnabledLayers({ layer1: true, layer2: true, layer3: true });
      setAdminEmail(DEFAULT_ADMIN_SECURITY_SETTINGS.adminEmail);
      setAdminPassword(DEFAULT_ADMIN_SECURITY_SETTINGS.adminPassword);
      setKeyTapCountRequired(DEFAULT_ADMIN_SECURITY_SETTINGS.keyTapCountRequired);
      setKeyTapTimeWindowMs(DEFAULT_ADMIN_SECURITY_SETTINGS.keyTapTimeWindowMs);
      setPassphrase(DEFAULT_ADMIN_SECURITY_SETTINGS.passphrase);
      setSaveSuccessNotice('Values restored to default. Click "Save & Apply Changes" to persist.');
      setTimeout(() => setSaveSuccessNotice(null), 4000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] rounded-3xl p-6 sm:p-8 text-white border border-slate-700 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Multi-Layer Access Governance</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-white flex items-center gap-3">
              <span>Admin Multi-Lock Configuration</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Configure and customize the 3 authentication layers protecting the Administrator Control Room.
              You can require <strong>all 3 locks simultaneously</strong>, <strong>any 2 locks</strong>, or <strong>any 1 lock</strong>, as well as reset and customize all passwords and passphrases.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleResetToDefaults}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-600 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-4 h-4 text-slate-400" />
              <span>Factory Defaults</span>
            </button>

            <button
              onClick={handleSaveSecurityPolicy}
              disabled={isSaving}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-950/40 flex items-center gap-2 cursor-pointer"
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <Save className="w-4 h-4 text-slate-950" />
              )}
              <span>Save & Apply Changes</span>
            </button>
          </div>
        </div>

        {saveSuccessNotice && (
          <div className="mt-4 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{saveSuccessNotice}</span>
          </div>
        )}
      </div>

      {/* SECTION 1: ACTIVATION MODE SELECTOR */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-serif">Security Enforcement Mode</h3>
              <p className="text-xs text-slate-500">Choose how many layers are required before administrator entrance is granted</p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
            Active: {securityMode === 'all_3' ? 'All 3 Locks' : securityMode === 'any_2' ? 'Any 2 Locks' : securityMode === 'any_1' ? 'Any 1 Lock' : 'Custom'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Mode 1: All 3 Locks */}
          <div
            onClick={() => setSecurityMode('all_3')}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
              securityMode === 'all_3'
                ? 'border-amber-500 bg-amber-50/40 shadow-md ring-1 ring-amber-500'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {securityMode === 'all_3' && (
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                <Check className="w-3.5 h-3.5" />
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-800">
                  Maximum Fortress
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">All 3 Locks Required</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Admin must pass all 3 layers sequentially: <strong>1) Email/Password</strong>, <strong>2) 3-Touch Key in 2s</strong>, and <strong>3) Sacred Passphrase</strong>.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center gap-1.5 text-[11px] font-bold text-amber-800">
              <Shield className="w-3.5 h-3.5" />
              <span>3 of 3 Locks Enforced</span>
            </div>
          </div>

          {/* Mode 2: Any 2 Locks */}
          <div
            onClick={() => setSecurityMode('any_2')}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
              securityMode === 'any_2'
                ? 'border-indigo-500 bg-indigo-50/40 shadow-md ring-1 ring-indigo-500'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {securityMode === 'any_2' && (
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Check className="w-3.5 h-3.5" />
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                  Balanced Security
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Any 2 of the 3 Locks</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Admin can complete any 2 locks of their choice (e.g. Email/Pass + 3-Tap Key, or 3-Tap Key + Passphrase, or Email/Pass + Passphrase).
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center gap-1.5 text-[11px] font-bold text-indigo-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>2 of 3 Locks Enforced</span>
            </div>
          </div>

          {/* Mode 3: Any 1 Lock */}
          <div
            onClick={() => setSecurityMode('any_1')}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
              securityMode === 'any_1'
                ? 'border-emerald-500 bg-emerald-50/40 shadow-md ring-1 ring-emerald-500'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {securityMode === 'any_1' && (
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Check className="w-3.5 h-3.5" />
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                  Quick Access
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Any 1 Single Lock</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Admin can choose and complete any single lock directly from the verification screen to quickly access the control room.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
              <Zap className="w-3.5 h-3.5" />
              <span>1 of 3 Locks Enforced</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: PASSWORD & CREDENTIAL MANAGEMENT FOR ALL 3 LAYERS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LAYER 1 CONFIGURATION */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Layer 1: Email & Password</h4>
                  <p className="text-[11px] text-slate-500">Standard admin credential gate</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">Active</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Administrator Email
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="e.g. twumbismark90@gmail.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Admin Password / Security PIN
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[10px] text-amber-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter new admin password"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-amber-500 tracking-wider"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 block">Master Bypass Fallbacks:</span>
                <p className="text-slate-500 leading-tight">
                  Permanent founder PIN <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-900 font-bold">2026</code> is always active for recovery.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Layer 1 Status</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Configured
            </span>
          </div>
        </div>

        {/* LAYER 2 CONFIGURATION */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs shadow-xs">
                  2
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Layer 2: Golden Key Touch</h4>
                  <p className="text-[11px] text-slate-500">Touch/tap rhythm authentication</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">Interactive</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Required Taps
                  </label>
                  <select
                    value={keyTapCountRequired}
                    onChange={(e) => setKeyTapCountRequired(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-xs bg-white focus:ring-2 focus:ring-amber-500"
                  >
                    <option value={2}>2 Touches</option>
                    <option value={3}>3 Touches (Default)</option>
                    <option value={4}>4 Touches</option>
                    <option value={5}>5 Touches</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Time Window
                  </label>
                  <select
                    value={keyTapTimeWindowMs}
                    onChange={(e) => setKeyTapTimeWindowMs(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-xs bg-white focus:ring-2 focus:ring-amber-500"
                  >
                    <option value={1500}>1.5 Seconds</option>
                    <option value={2000}>2.0 Seconds (Default)</option>
                    <option value={2500}>2.5 Seconds</option>
                    <option value={3000}>3.0 Seconds</option>
                  </select>
                </div>
              </div>

              {/* LIVE INTERACTIVE TEST SANDBOX */}
              <div className="bg-gradient-to-b from-[#0f1223] via-[#13172e] to-[#1a1a2e] p-4 rounded-2xl border border-orange-500/20 text-center space-y-3 text-white">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Live Key Test Sandbox</span>
                  </span>
                  <span className="text-slate-400 text-[10px]">
                    {keyTapCountRequired} taps in {(keyTapTimeWindowMs / 1000).toFixed(1)}s
                  </span>
                </div>

                <div className="flex items-center justify-center py-1">
                  <button
                    type="button"
                    onClick={handleSandboxTap}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all cursor-pointer select-none active:scale-90 ${
                      sandboxSuccess
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50 ring-4 ring-emerald-400/50 animate-bounce'
                        : isSandboxAnimating
                        ? 'bg-amber-400 text-slate-950 scale-110 shadow-lg shadow-amber-500/60 ring-4 ring-amber-300'
                        : 'bg-gradient-to-tr from-amber-600 to-yellow-400 text-slate-950 shadow-md hover:scale-105 ring-2 ring-amber-400/40'
                    }`}
                  >
                    {sandboxSuccess ? <Unlock className="w-7 h-7" /> : <Key className="w-7 h-7" />}
                  </button>
                </div>

                {sandboxNotice ? (
                  <p className={`text-[11px] font-bold ${sandboxSuccess ? 'text-emerald-400' : 'text-amber-300'}`}>
                    {sandboxNotice}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400">
                    Tap the key above to test your timing settings
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Rhythm Threshold</span>
            <span className="font-bold text-amber-700">
              {keyTapCountRequired} Touches / {(keyTapTimeWindowMs / 1000).toFixed(1)}s
            </span>
          </div>
        </div>

        {/* LAYER 3 CONFIGURATION */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Layer 3: Sacred Passphrase</h4>
                  <p className="text-[11px] text-slate-500">Confidential foundation sentence</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">Passphrase</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Sacred Admin Passphrase
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassphrase(!showPassphrase)}
                    className="text-[10px] text-purple-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {showPassphrase ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPassphrase ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="e.g. thejoyoftheLordis mystrength"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-purple-500 leading-relaxed"
                />
              </div>

              <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 text-[11px] text-purple-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Flame className="w-3.5 h-3.5 text-purple-600" />
                  <span>Default Foundation Motto:</span>
                </div>
                <p className="font-mono text-[11px] text-purple-800 bg-white/70 p-1.5 rounded-lg border border-purple-200 select-all font-semibold">
                  thejoyoftheLordis mystrength
                </p>
                <p className="text-[10px] text-purple-700 mt-1">
                  Typing is space-tolerant and case-insensitive.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Phrase Status</span>
            <span className="font-bold text-purple-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready
            </span>
          </div>
        </div>
      </div>

      {/* FOOTER SAVE BAR */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white font-serif">Apply Security Policy to Cloud Network</h4>
            <p className="text-xs text-slate-400">Settings synchronize across all admin verification terminals in real time</p>
          </div>
        </div>

        <button
          onClick={handleSaveSecurityPolicy}
          disabled={isSaving}
          className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSaving ? (
            <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
          ) : (
            <Save className="w-4 h-4 text-slate-950" />
          )}
          <span>Save & Deploy Security Policy</span>
        </button>
      </div>
    </div>
  );
};
