import React from 'react';
import { AlertTriangle, ShieldAlert, Clock, ArrowRight, Radio, Flame, FileWarning } from 'lucide-react';

interface IntegrityWarningModalProps {
  isOpen: boolean;
  onAcknowledge: () => void;
  tabSwitchesCount: number;
  timeRemainingSeconds?: number;
  formatTime?: (totalSecs: number) => string;
  hasProgressivePenalties?: boolean;
  penaltyDeductionMinutes?: number;
  isAutoSubmitting?: boolean;
}

export const IntegrityWarningModal: React.FC<IntegrityWarningModalProps> = ({
  isOpen,
  onAcknowledge,
  tabSwitchesCount,
  timeRemainingSeconds,
  formatTime,
  hasProgressivePenalties = false,
  penaltyDeductionMinutes = 0,
  isAutoSubmitting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white border-2 border-rose-600 rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md overflow-hidden transform transition-all animate-in zoom-in-95">
        {/* Compact High-Contrast Header */}
        <div className="bg-gradient-to-r from-rose-800 via-red-700 to-rose-900 text-white px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-rose-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping inline-block" />
                Live Proctor Security Alert
              </div>
              <h3 className="text-sm sm:text-base font-bold font-serif leading-tight">
                Tab Switch Detected
              </h3>
            </div>
          </div>

          <span className="bg-rose-950 text-rose-200 text-[10px] font-black px-2 py-0.5 rounded-full border border-rose-500/50 uppercase tracking-wide">
            {tabSwitchesCount > 0 ? `Switch #${tabSwitchesCount}` : 'Security Notice'}
          </span>
        </div>

        {/* Compact Content */}
        <div className="p-4 sm:p-5 space-y-3">
          {/* Progressive Penalty Strike Alert if active */}
          {hasProgressivePenalties && (
            <div className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
              tabSwitchesCount === 1 
                ? 'bg-amber-50 border-amber-300 text-amber-900' 
                : tabSwitchesCount === 2 
                ? 'bg-orange-50 border-orange-400 text-orange-950' 
                : 'bg-rose-100 border-rose-400 text-rose-950'
            }`}>
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  {tabSwitchesCount === 1 && 'Strike 1 of 3: -2 Mins Penalty Applied'}
                  {tabSwitchesCount === 2 && 'Strike 2 of 3: -5 Mins Penalty Applied'}
                  {tabSwitchesCount >= 3 && 'Strike 3 of 3: Auto-Submit Triggered'}
                  {tabSwitchesCount <= 0 && '3-Strike Penalty Active: Tab switches deduct time'}
                </span>
              </div>
              {penaltyDeductionMinutes > 0 && !isAutoSubmitting && (
                <span className="bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded">
                  -{penaltyDeductionMinutes}m
                </span>
              )}
            </div>
          )}

          {/* Stern Warning Box */}
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-slate-800 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-rose-900 text-xs uppercase tracking-wide">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>STERN INTEGRITY WARNING</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-700 font-medium">
              Every switch away from this exam tab is <strong className="text-rose-900">live reported to your teacher in real-time</strong> and will be <strong className="text-rose-900">permanently attached to your final grade report</strong>.
            </p>
          </div>

          {timeRemainingSeconds !== undefined && formatTime && !isAutoSubmitting && (
            <div className="bg-slate-900 text-amber-300 px-3 py-2 rounded-xl flex items-center justify-between text-xs font-mono font-bold border border-slate-800">
              <span className="text-slate-400 text-[11px] font-sans flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                Current Remaining Time:
              </span>
              <span className="text-sm font-black text-amber-300">{formatTime(timeRemainingSeconds)}</span>
            </div>
          )}

          {isAutoSubmitting ? (
            <div className="p-3 bg-rose-600 text-white text-xs font-bold rounded-xl text-center flex items-center justify-center gap-2 animate-pulse">
              <ShieldAlert className="w-4 h-4" />
              <span>Auto-Submitting Examination Now...</span>
            </div>
          ) : (
            /* Quick 1-Click Acknowledge Action */
            <button
              type="button"
              onClick={onAcknowledge}
              className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-rose-700 via-red-600 to-amber-600 hover:from-rose-800 hover:to-amber-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <span>I Acknowledge & Return to Exam</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

