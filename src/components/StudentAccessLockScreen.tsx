import React, { useState } from 'react';
import { 
  Lock, 
  KeyRound, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ArrowRight,
  GraduationCap,
  Shield,
  Sparkles
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface StudentAccessLockScreenProps {
  onUnlockSuccess: () => void;
  onNavigateToTeacher?: () => void;
  onNavigateToAdmin?: () => void;
}

export const StudentAccessLockScreen: React.FC<StudentAccessLockScreenProps> = ({
  onUnlockSuccess,
  onNavigateToTeacher,
  onNavigateToAdmin,
}) => {
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = passcode.trim();

    if (!clean) {
      setError('Please enter the candidate access passcode.');
      return;
    }

    setIsVerifying(true);
    // Student Dashboard Lock Code: bisjoy25
    if (clean.toLowerCase() === 'bisjoy25') {
      setError(null);
      setTimeout(() => {
        setIsVerifying(false);
        onUnlockSuccess();
      }, 300);
    } else {
      setIsVerifying(false);
      setError('Incorrect passcode. Access restricted to authorized candidates.');
    }
  };

  return (
    <div 
      id="student-access-lock-screen"
      className="min-h-[70vh] flex flex-col items-center justify-center p-4 sm:p-6 my-auto"
    >
      <div className="w-full max-w-md bg-white rounded-3xl border-2 border-amber-300/80 shadow-2xl overflow-hidden relative">
        
        {/* Top Decorative Gold/Amber Banner */}
        <div className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 p-6 text-center border-b border-amber-400/80 relative">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center shadow-lg border-2 border-amber-400/60 mb-3 overflow-hidden p-1">
            <BrandLogo size="md" variant="icon-only" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-950/90 text-amber-300 text-[10px] font-black uppercase tracking-wider mb-1.5 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Candidate Portal Protected</span>
          </div>
          <h2 className="text-xl font-black font-serif text-slate-950 tracking-tight">
            MCQ Assessment Hub
          </h2>
          <p className="text-xs text-slate-900 font-medium mt-1 max-w-xs mx-auto">
            Student Assessment Desk • Enter candidate passcode to unlock
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-5 bg-gradient-to-b from-white to-slate-50">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 animate-head-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label 
                htmlFor="student-passcode-input"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Candidate Passcode
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="student-passcode-input"
                  type={showPasscode ? 'text' : 'password'}
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter candidate passcode"
                  autoFocus
                  autoComplete="off"
                  className="w-full pl-10 pr-11 py-3 text-sm font-mono tracking-widest text-slate-900 bg-white rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 outline-hidden transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPasscode ? 'Hide passcode' : 'Show passcode'}
                >
                  {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                <span>Authorized student candidates only. Contact proctor if required.</span>
              </p>
            </div>

            <button
              id="unlock-student-desk-btn"
              type="submit"
              disabled={isVerifying}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-600 hover:to-amber-500 active:scale-98 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-amber-300"
            >
              {isVerifying ? (
                <span>Verifying Authorization...</span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 text-slate-950" />
                  <span>Unlock Student Desk</span>
                  <ArrowRight className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Quick Alternate Navigation */}
          <div className="pt-4 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
            {onNavigateToTeacher && (
              <button
                type="button"
                onClick={onNavigateToTeacher}
                className="inline-flex items-center gap-1.5 font-semibold text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                <span>Faculty Proctor Portal</span>
              </button>
            )}

            {onNavigateToAdmin && (
              <button
                type="button"
                onClick={onNavigateToAdmin}
                className="inline-flex items-center gap-1.5 font-semibold text-slate-700 hover:text-amber-700 transition-colors cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-amber-600" />
                <span>Admin Console</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
