import React, { useState } from 'react';
import { 
  BookOpen, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  Clock, 
  Play, 
  Pause, 
  Trash2, 
  Upload, 
  Users, 
  Calendar, 
  CheckCircle2, 
  PlusCircle,
  ExternalLink,
  Sparkles,
  QrCode,
  WifiOff,
  FileText,
  Activity,
  ShieldAlert,
  Shield,
  ShieldCheck,
  RotateCcw,
  Shuffle,
  Edit,
  Eye,
  Lock,
  BarChart3
} from 'lucide-react';
import { QuizConfig, QuizStatus, Question, QuizSection } from '../types';
import { QRCodeModal } from './QRCodeModal';
import { EditInstructionsModal } from './EditInstructionsModal';
import { generateStandaloneOfflineHtmlExam } from '../utils/offlineExamGenerator';

interface QuizListManagerProps {
  quizzes: QuizConfig[];
  activeQuizId: string;
  onSelectActiveQuiz: (quizId: string) => void;
  onCreateNewQuizClick: () => void;
  onOpenImporterClick: () => void;
  onPreviewQuiz?: (quiz: QuizConfig) => void;
  onEditQuiz?: (quiz: QuizConfig) => void;
  onUpdateQuizStatus: (quizId: string, status: QuizStatus) => void;
  onToggleTabPenalty?: (quizId: string) => void;
  onToggleAttemptLimit?: (quizId: string) => void;
  onToggleSecurityShield?: (quizId: string) => void;
  onToggleOptionShuffling?: (quizId: string) => void;
  onToggleFullscreenLockdown?: (quizId: string) => void;
  onDeleteQuiz?: (quizId: string) => void;
  onSaveInstructions?: (quizId: string, bullets: string[]) => void;
  onSelectQuizToMonitor?: (quizId: string) => void;
  onSelectQuizForResults?: (quizId: string) => void;
  questions?: Question[];
  sections?: QuizSection[];
}

export const QuizListManager: React.FC<QuizListManagerProps> = ({
  quizzes,
  activeQuizId,
  onSelectActiveQuiz,
  onCreateNewQuizClick,
  onOpenImporterClick,
  onPreviewQuiz,
  onEditQuiz,
  onUpdateQuizStatus,
  onToggleTabPenalty,
  onToggleAttemptLimit,
  onToggleSecurityShield,
  onToggleOptionShuffling,
  onToggleFullscreenLockdown,
  onDeleteQuiz,
  onSaveInstructions,
  onSelectQuizToMonitor,
  onSelectQuizForResults,
  questions = [],
  sections = [],
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [selectedQuizForQR, setSelectedQuizForQR] = useState<QuizConfig | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState<boolean>(false);
  const [selectedQuizForInstructions, setSelectedQuizForInstructions] = useState<QuizConfig | null>(null);
  const [isInstructionsModalOpen, setIsInstructionsModalOpen] = useState<boolean>(false);
  const [downloadingOfflineQuizId, setDownloadingOfflineQuizId] = useState<string | null>(null);

  const handleDownloadOfflineExam = (quiz: QuizConfig) => {
    const quizCode = quiz.code || quiz.id || 'QUIZ';
    const quizQuestions = quiz.questions && quiz.questions.length > 0
      ? quiz.questions
      : questions.filter((q) => q.quizId === quiz.id || q.quizCode === quiz.code || (q as any).quizTitle === quiz.title);
    const effectiveQuestions = quizQuestions.length > 0 ? quizQuestions : questions;
    const quizSections = quiz.sections && quiz.sections.length > 0
      ? quiz.sections
      : (sections || []).filter((s) => s.quizId === quiz.id || (s as any).quizCode === quiz.code);

    const htmlContent = generateStandaloneOfflineHtmlExam(quiz, effectiveQuestions, quizSections);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Offline_Exam_${quizCode.replace(/[^a-zA-Z0-9_-]/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadingOfflineQuizId(quiz.id || quiz.code || 'downloaded');
    setTimeout(() => setDownloadingOfflineQuizId(null), 3000);
  };

  const handleCopyQuizLink = (quizCode: string, quizId: string) => {
    const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
    const url = `${baseUrl}?quiz=${encodeURIComponent(quizCode || quizId)}&standalone=true`;
    navigator.clipboard.writeText(url);
    setCopiedId(quizId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyQuizCode = (quizCode: string, quizId: string) => {
    navigator.clipboard.writeText(quizCode || quizId);
    setCopiedCodeId(quizId);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      {/* Top Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 w-fit">
            <WifiOff className="w-3 h-3 text-indigo-600" />
            <span>Multi-Tenant & Offline-Ready Assessment Management</span>
          </span>
          <h2 className="text-xl font-bold font-serif text-slate-900 mt-1">
            Teacher Assessment Repository ({quizzes.length} Quizzes)
          </h2>
          <p className="text-xs text-slate-500">
            Create, manage, monitor, and export QR codes for offline-capable examinations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenImporterClick}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-slate-300 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-indigo-600" />
            <span>Import Word Document</span>
          </button>

          <button
            onClick={onCreateNewQuizClick}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Quiz</span>
          </button>
        </div>
      </div>

      {/* Quizzes Grid */}
      {quizzes.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-500 space-y-3">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-medium text-slate-800">Your Teacher Assessment Repository is currently empty.</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You have not set up any quizzes in your workspace yet. Click below to create a new quiz or import an existing exam.
          </p>
          <div className="pt-2 flex items-center justify-center gap-2">
            <button
              onClick={onCreateNewQuizClick}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Quiz</span>
            </button>
            <button
              onClick={onOpenImporterClick}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer border border-slate-300 shadow-xs"
            >
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>Import Word Document</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizzes.map((quiz, index) => {
          const isActiveQuiz = quiz.id === activeQuizId;
          const isCopied = copiedId === quiz.id;

          return (
            <div
              key={`qlm-quiz-${quiz.id || quiz.code || index}`}
              className={`rounded-2xl border p-5 transition-all space-y-4 ${
                isActiveQuiz
                  ? 'border-indigo-500 bg-indigo-50/20 shadow-md ring-2 ring-indigo-200'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-lg shadow-2xs">
                      <span className="text-[10px] font-extrabold text-amber-800 uppercase">Quiz Code:</span>
                      <span className="text-xs font-mono font-black text-amber-950 select-all">{quiz.code}</span>
                      <button
                        onClick={() => handleCopyQuizCode(quiz.code, quiz.id)}
                        className="ml-1 text-[10px] font-bold text-amber-900 hover:text-amber-950 underline cursor-pointer"
                      >
                        {copiedCodeId === quiz.id ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        quiz.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : quiz.status === 'paused'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {quiz.status}
                    </span>
                    {Boolean(quiz.progressiveTabPenalty || quiz.enableTabSwitchPenalties) && (
                      <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3 text-rose-600" />
                        3-Strike Active
                      </span>
                    )}
                    {Boolean(
                      quiz.enforceSingleAttempt !== false &&
                      (quiz.enforceSingleAttempt || quiz.preventMultipleAttempts || (quiz.attemptsAllowed !== undefined && quiz.attemptsAllowed <= 1))
                    ) ? (
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        1 Attempt Only
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <RotateCcw className="w-3 h-3 text-slate-500" />
                        Retakes Allowed
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-serif leading-snug">
                    {quiz.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {quiz.subject} • {quiz.classGroup} • Created by {quiz.teacherName}
                  </p>
                </div>
              </div>

              {/* Meta Stats */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Questions</span>
                  <span className="font-bold text-slate-800">{quiz.totalQuestions} MCQs</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Duration</span>
                  <span className="font-bold text-slate-800">{quiz.durationMinutes} Mins</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Attempts</span>
                  <span className="font-bold text-slate-800">{quiz.attemptsAllowed} Max</span>
                </div>
              </div>

              {/* Actions & Unique Quiz URL Copy & QR Code Button */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => handleCopyQuizCode(quiz.code, quiz.id)}
                    className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold transition-all flex items-center gap-1.5 cursor-pointer border border-amber-300"
                    title="Copy Quiz Code"
                  >
                    {copiedCodeId === quiz.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-800">Code Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-amber-700" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setSelectedQuizForQR(quiz);
                      setIsQRModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold transition-all flex items-center gap-1.5 cursor-pointer border border-indigo-200"
                    title="Generate, Print, or Download QR Code"
                  >
                    <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                    <span>QR Code</span>
                  </button>

                  <button
                    onClick={() => handleDownloadOfflineExam(quiz)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-semibold transition-all flex items-center gap-1.5 cursor-pointer border border-emerald-300 shadow-2xs"
                    title="Download standalone 100% offline HTML examination file for this test"
                  >
                    {downloadingOfflineQuizId === (quiz.id || quiz.code || 'downloaded') ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-800">Downloaded (.html)!</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Offline Exam (.html)</span>
                      </>
                    )}
                  </button>

                  {/* Edit Quiz & Setup (Questions, Instructions, Name, Duration, Proctoring) */}
                  {onEditQuiz && (
                    <button
                      onClick={() => onEditQuiz(quiz)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-indigo-200 shadow-2xs"
                      title="Edit questions, instructions, quiz name, duration, and all delivery settings"
                    >
                      <Edit className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Edit Quiz & Setup</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedQuizForInstructions(quiz);
                      setIsInstructionsModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200"
                    title="Edit Quiz Guidelines & 4-5 Bullet Instructions"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                    <span>Instructions</span>
                  </button>

                  {onPreviewQuiz && (
                    <button
                      onClick={() => onPreviewQuiz(quiz)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="Open interactive Student Exam Preview for this quiz"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-950" />
                      <span>Preview</span>
                    </button>
                  )}

                  {onSelectQuizToMonitor && (
                    <button
                      onClick={() => onSelectQuizToMonitor(quiz.id || quiz.code || 'all')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-emerald-200"
                      title="Monitor live student submissions and surveillance for this test"
                    >
                      <Activity className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Monitor Live</span>
                    </button>
                  )}

                  {onSelectQuizForResults && (
                    <button
                      onClick={() => onSelectQuizForResults(quiz.id || quiz.code || '')}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-indigo-200 shadow-2xs"
                      title={`View student gradebook and results for ${quiz.title || quiz.code}`}
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Quiz Results</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleCopyQuizLink(quiz.code, quiz.id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-300"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <LinkIcon className="w-3.5 h-3.5 text-slate-600" />}
                    <span>{isCopied ? 'URL Copied!' : 'Copy Link'}</span>
                  </button>

                  {/* 1-Click 3-Strike Tab Penalty Toggle */}
                  {onToggleTabPenalty && (
                    <button
                      onClick={() => onToggleTabPenalty(quiz.id || quiz.code || '')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                        Boolean(quiz.progressiveTabPenalty || quiz.enableTabSwitchPenalties)
                          ? 'bg-rose-100 hover:bg-rose-200 text-rose-900 border-rose-300 ring-1 ring-rose-300'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                      }`}
                      title={
                        Boolean(quiz.progressiveTabPenalty || quiz.enableTabSwitchPenalties)
                          ? '3-Strike Penalty is ACTIVE: (-2m, -5m, auto-submit on 3rd tab switch). Click to DEACTIVATE.'
                          : '3-Strike Penalty is INACTIVE. Click to ACTIVATE (-2m, -5m, auto-submit on 3rd tab switch).'
                      }
                    >
                      {Boolean(quiz.progressiveTabPenalty || quiz.enableTabSwitchPenalties) ? (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                          <span>3-Strike: <strong className="text-rose-800 underline">ON</strong></span>
                        </>
                      ) : (
                        <>
                          <Shield className="w-3.5 h-3.5 text-slate-400" />
                          <span>3-Strike: <span className="text-slate-500 font-semibold">OFF</span></span>
                        </>
                      )}
                    </button>
                  )}

                  {/* 1-Click Single Attempt Restriction Toggle */}
                  {onToggleAttemptLimit && (
                    <button
                      onClick={() => onToggleAttemptLimit(quiz.id || quiz.code || '')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                        Boolean(
                          quiz.enforceSingleAttempt !== false &&
                          (quiz.enforceSingleAttempt || quiz.preventMultipleAttempts || (quiz.attemptsAllowed !== undefined && quiz.attemptsAllowed <= 1))
                        )
                          ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-emerald-300 ring-1 ring-emerald-300'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                      }`}
                      title={
                        Boolean(
                          quiz.enforceSingleAttempt !== false &&
                          (quiz.enforceSingleAttempt || quiz.preventMultipleAttempts || (quiz.attemptsAllowed !== undefined && quiz.attemptsAllowed <= 1))
                        )
                          ? 'Single Attempt is ENFORCED: Candidates can only submit once using Name + ID/Email. Click to ALLOW retakes.'
                          : 'Multiple Attempts are ALLOWED: Candidates can take the quiz multiple times. Click to ENFORCE 1 attempt.'
                      }
                    >
                      {Boolean(
                        quiz.enforceSingleAttempt !== false &&
                        (quiz.enforceSingleAttempt || quiz.preventMultipleAttempts || (quiz.attemptsAllowed !== undefined && quiz.attemptsAllowed <= 1))
                      ) ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                          <span>1-Attempt: <strong className="text-emerald-900 underline">ON</strong></span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                          <span>1-Attempt: <span className="text-slate-500 font-semibold">OFF</span></span>
                        </>
                      )}
                    </button>
                  )}

                  {/* 1-Click Candidate Watermark & Security Shield Toggle */}
                  {onToggleSecurityShield && (
                    <button
                      onClick={() => onToggleSecurityShield(quiz.id || quiz.code || '')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                        quiz.enableCandidateWatermark !== false && quiz.enableAntiCopyPrint !== false
                          ? 'bg-indigo-100 hover:bg-indigo-200 text-indigo-900 border-indigo-300 ring-1 ring-indigo-300'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                      }`}
                      title={
                        quiz.enableCandidateWatermark !== false && quiz.enableAntiCopyPrint !== false
                          ? 'Security Shield & Watermarking ACTIVE: Name/ID watermark + anti-copy/print blocking enabled. Click to disable.'
                          : 'Security Shield & Watermarking INACTIVE: Click to activate dynamic candidate watermarking and anti-copy/print deterrent.'
                      }
                    >
                      {quiz.enableCandidateWatermark !== false && quiz.enableAntiCopyPrint !== false ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
                          <span>Shield/Watermark: <strong className="text-indigo-900 underline">ON</strong></span>
                        </>
                      ) : (
                        <>
                          <Shield className="w-3.5 h-3.5 text-slate-400" />
                          <span>Shield/Watermark: <span className="text-slate-500 font-semibold">OFF</span></span>
                        </>
                      )}
                    </button>
                  )}

                  {/* 1-Click Option Shuffling Toggle */}
                  {onToggleOptionShuffling && (
                    <button
                      onClick={() => onToggleOptionShuffling(quiz.id || quiz.code || '')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                        quiz.randomizeOptions !== false && quiz.shuffleOptions !== false
                          ? 'bg-purple-100 hover:bg-purple-200 text-purple-900 border-purple-300 ring-1 ring-purple-300'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                      }`}
                      title={
                        quiz.randomizeOptions !== false && quiz.shuffleOptions !== false
                          ? 'Option Shuffling ACTIVE: Alternative choices (A, B, C, D) are randomized per student while preserving the canonical answer key. Click to disable.'
                          : 'Option Shuffling INACTIVE: Click to randomize option choices (A, B, C, D) per student.'
                      }
                    >
                      {quiz.randomizeOptions !== false && quiz.shuffleOptions !== false ? (
                        <>
                          <Shuffle className="w-3.5 h-3.5 text-purple-700" />
                          <span>Option Shuffle: <strong className="text-purple-900 underline">ON</strong></span>
                        </>
                      ) : (
                        <>
                          <Shuffle className="w-3.5 h-3.5 text-slate-400" />
                          <span>Option Shuffle: <span className="text-slate-500 font-semibold">OFF</span></span>
                        </>
                      )}
                    </button>
                  )}

                  {/* 1-Click Lockdown Kiosk Toggle */}
                  {onToggleFullscreenLockdown && (
                    <button
                      onClick={() => onToggleFullscreenLockdown(quiz.id || quiz.code || '')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                        Boolean(quiz.enableFullscreenLockdown)
                          ? 'bg-purple-100 hover:bg-purple-200 text-purple-900 border-purple-300 ring-1 ring-purple-300'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                      }`}
                      title={
                        Boolean(quiz.enableFullscreenLockdown)
                          ? 'Lockdown Kiosk is ACTIVE: Fullscreen forced, auxiliary keys frozen, linear exam mode (no back), per-question timer with audio warning, and auto-skip on tab switch. Click to DEACTIVATE.'
                          : 'Lockdown Kiosk is INACTIVE. Click to ACTIVATE Respondus-style lockdown (Fullscreen + Key Freeze + Linear Mode + Question Timer + Auto-skip on tab switch).'
                      }
                    >
                      {Boolean(quiz.enableFullscreenLockdown) ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-purple-700 animate-pulse" />
                          <span>Lockdown: <strong className="text-purple-900 underline">ON</strong></span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Lockdown: <span className="text-slate-500 font-semibold">OFF</span></span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {quiz.status === 'active' ? (
                    <button
                      onClick={() => onUpdateQuizStatus(quiz.id, 'paused')}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-800 font-bold hover:bg-amber-100 border border-amber-200 cursor-pointer flex items-center gap-1"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onUpdateQuizStatus(quiz.id, 'active')}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold hover:bg-emerald-100 border border-emerald-200 cursor-pointer flex items-center gap-1"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Activate</span>
                    </button>
                  )}

                  {onDeleteQuiz && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to permanently delete quiz "${quiz.title}" (${quiz.code})? This will sync immediately to all devices.`)) {
                          onDeleteQuiz(quiz.id);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 border border-rose-200 cursor-pointer flex items-center gap-1 transition-colors"
                      title="Delete this assessment permanently across all devices"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => onSelectActiveQuiz(quiz.id)}
                    className={`px-4 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isActiveQuiz
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>{isActiveQuiz ? 'Currently Selected' : 'Select Quiz'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* QR Code Modal for Selected Quiz */}
      {selectedQuizForQR && (
        <QRCodeModal
          isOpen={isQRModalOpen}
          onClose={() => {
            setIsQRModalOpen(false);
            setSelectedQuizForQR(null);
          }}
          quiz={selectedQuizForQR}
          questions={questions}
          sections={sections}
        />
      )}

      {/* Edit Instructions Modal for Teacher */}
      {selectedQuizForInstructions && (
        <EditInstructionsModal
          isOpen={isInstructionsModalOpen}
          onClose={() => {
            setIsInstructionsModalOpen(false);
            setSelectedQuizForInstructions(null);
          }}
          quiz={selectedQuizForInstructions}
          onSaveInstructions={(quizId, bullets) => {
            if (onSaveInstructions) {
              onSaveInstructions(quizId, bullets);
            }
          }}
        />
      )}
    </div>
  );
};
