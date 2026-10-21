import React, { useState } from 'react';
import {
  X,
  GraduationCap,
  BookOpenCheck,
  LogIn,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  CheckCircle2,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { QuizConfig } from '../types';
import { BrandLogo } from './BrandLogo';

interface GetStartedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTeacher: () => void;
  onSelectStudent: (passcodeOrQuizCode?: string) => void;
  isTeacherAuthenticated?: boolean;
  teacherName?: string;
  quizzes?: QuizConfig[];
}

export const GetStartedModal: React.FC<GetStartedModalProps> = ({
  isOpen,
  onClose,
  onSelectTeacher,
  onSelectStudent,
  isTeacherAuthenticated = false,
  teacherName,
  quizzes = [],
}) => {
  const [passcodeInput, setPasscodeInput] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = passcodeInput.trim();

    if (!clean) {
      // Empty input -> direct proceed to student portal
      onSelectStudent();
      onClose();
      return;
    }

    // Passcode requirement removed: Direct entry or optional Quiz Code
    setPasscodeError(null);
    onSelectStudent(clean || undefined);
    onClose();
  };

  const handleQuickStudentEntry = () => {
    onSelectStudent();
    onClose();
  };

  const handleTeacherClick = () => {
    onSelectTeacher();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="get-started-title"
    >
      <div
        className="bg-[#0f172a] text-slate-100 border border-slate-700/80 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Top Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-amber-500 to-emerald-500" />

        {/* Header */}
        <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4 flex items-start justify-between border-b border-slate-800">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-bold uppercase tracking-wider text-amber-400">
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Portal Access Gateway</span>
            </div>
            <h2 id="get-started-title" className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <BrandLogo size="xs" variant="icon-only" className="w-6 h-6 shrink-0" />
              <span>Get Started with MCQ Assessment Hub</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Choose an option below to enter as a <strong className="text-indigo-400">Teacher</strong> or enter as a <strong className="text-emerald-400">Student</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5 shrink-0" />
          </button>
        </div>

        {/* Content: Two High-Contrast Options */}
        <div className="p-5 sm:p-7 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* OPTION 1: TEACHER LOGIN */}
          <div className="bg-[#172036] border border-indigo-500/30 hover:border-indigo-500/60 rounded-2xl p-5 flex flex-col justify-between transition-all group relative overflow-hidden">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform shrink-0">
                  <GraduationCap className="w-6 h-6 shrink-0" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Faculty Workspace
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                  Teacher Login
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Sign in with your Faculty Access Code &amp; PIN to author assessments, import Word questions, and view live candidate results.
                </p>
              </div>

              <div className="space-y-2 pt-1 border-t border-slate-800">
                <div className="text-[11px] text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Create &amp; schedule MCQ assessments</span>
                </div>
                <div className="text-[11px] text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Import questions from Word (.docx)</span>
                </div>
                <div className="text-[11px] text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Real-time proctoring &amp; gradebooks</span>
                </div>
              </div>

              {isTeacherAuthenticated && (
                <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-[11px] text-indigo-200 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">Active Session: <strong>{teacherName || 'Faculty Member'}</strong></span>
                </div>
              )}
            </div>

            <div className="pt-5 mt-auto">
              <button
                type="button"
                onClick={handleTeacherClick}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer min-h-[44px]"
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span>{isTeacherAuthenticated ? 'Enter Teacher Workspace' : 'Teacher Login'}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>

          {/* OPTION 2: STUDENT EXAMINATION DESK */}
          <div className="bg-[#112229] border border-emerald-500/30 hover:border-emerald-500/60 rounded-2xl p-5 flex flex-col justify-between transition-all group relative overflow-hidden">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                  <BookOpenCheck className="w-6 h-6 shrink-0" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Candidate Desk
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                  Student Examination Desk
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Browse all active published examinations or enter directly with your teacher-assigned Quiz Code.
                </p>
              </div>

              {/* Quiz Code Form (Optional) */}
              <form onSubmit={handleStudentSubmit} className="space-y-2 pt-1 border-t border-slate-800">
                <div className="relative">
                  <BookOpenCheck className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none shrink-0" />
                  <input
                    type="text"
                    value={passcodeInput}
                    onChange={(e) => {
                      setPasscodeInput(e.target.value);
                      setPasscodeError(null);
                    }}
                    placeholder="Enter Quiz Code (optional, e.g. MATH-01)"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 tracking-wider uppercase"
                  />
                </div>

                <p className="text-[10px] text-slate-400">
                  Leave empty to browse all published examinations and question papers.
                </p>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-black text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer min-h-[42px]"
                >
                  <BookOpenCheck className="w-4 h-4 text-slate-950 shrink-0" />
                  <span>Enter Student Examination Desk</span>
                  <ArrowRight className="w-4 h-4 text-slate-950 shrink-0" />
                </button>
              </form>
            </div>

            <div className="pt-3 mt-auto text-center">
              <button
                type="button"
                onClick={handleQuickStudentEntry}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2 transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <span>Continue to Candidate Portal without passcode</span>
                <ArrowRight className="w-3 h-3 shrink-0" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-5 sm:px-7 py-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Secure Academic Examination Environment</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <Lock className="w-3 h-3 shrink-0" />
            <span>Encrypted Session</span>
          </div>
        </div>
      </div>
    </div>
  );
};
