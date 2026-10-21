import React, { useState, useMemo } from 'react';
import {
  QuizConfig,
  StudentSubmission,
  Question,
  QuizSection,
  QuizStatus
} from '../types';
import { generateQuestionPoolWordTemplate } from '../utils/docxQuestionPoolParser';
import { downloadQuizStudentListExcel } from '../utils/rosterParser';
import { generateStandaloneOfflineHtmlExam } from '../utils/offlineExamGenerator';
import {
  Shuffle,
  Sparkles,
  Plus,
  FileSpreadsheet,
  Layers,
  Users,
  Copy,
  Check,
  ExternalLink,
  Activity,
  BarChart3,
  Edit,
  Trash2,
  Lock,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Download,
  AlertTriangle,
  Play,
  Pause,
  Info
} from 'lucide-react';

interface QuestionPoolWorkspaceViewProps {
  poolQuizzes: QuizConfig[];
  submissions: StudentSubmission[];
  questions: Question[];
  sections?: QuizSection[];
  onOpenCreatePool: () => void;
  onEditPoolQuiz: (quiz: QuizConfig) => void;
  onDeleteQuiz?: (quizId: string) => void;
  onPreviewQuiz?: (quiz: QuizConfig) => void;
  onSelectQuizToMonitor?: (quizId: string) => void;
  onSelectQuizForResults?: (quizId: string) => void;
  onOpenRosterModal: (quiz: QuizConfig) => void;
  onOpenInstructionsModal: (quiz: QuizConfig) => void;
  onToggleTabPenalty?: (quizId: string) => void;
  onToggleAttemptLimit?: (quizId: string) => void;
  onToggleFullscreenLockdown?: (quizId: string) => void;
  onToggleSecurityShield?: (quizId: string) => void;
  onToggleOptionShuffling?: (quizId: string) => void;
  onUpdateQuizStatus?: (quizId: string, status: QuizStatus) => void;
  baseUrl: string;
}

export const QuestionPoolWorkspaceView: React.FC<QuestionPoolWorkspaceViewProps> = ({
  poolQuizzes,
  submissions,
  questions,
  sections,
  onOpenCreatePool,
  onEditPoolQuiz,
  onDeleteQuiz,
  onPreviewQuiz,
  onSelectQuizToMonitor,
  onSelectQuizForResults,
  onOpenRosterModal,
  onOpenInstructionsModal,
  onToggleTabPenalty,
  onToggleAttemptLimit,
  onToggleFullscreenLockdown,
  onToggleSecurityShield,
  onToggleOptionShuffling,
  onUpdateQuizStatus,
  baseUrl
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedQuizId, setCopiedQuizId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [downloadingStudentListId, setDownloadingStudentListId] = useState<string | null>(null);
  const [downloadingOfflineId, setDownloadingOfflineId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Aggregated KPIs
  const totalPoolQuestions = useMemo(() => {
    return poolQuizzes.reduce((acc, q) => {
      return acc + (q.questions?.length || q.poolOriginalSize || 0);
    }, 0);
  }, [poolQuizzes]);

  const poolQuizKeys = useMemo(() => {
    const set = new Set<string>();
    poolQuizzes.forEach((q) => {
      if (q.id) set.add(q.id.toLowerCase());
      if (q.code) set.add(q.code.toLowerCase());
      if (q.title) set.add(q.title.toLowerCase());
    });
    return set;
  }, [poolQuizzes]);

  const poolSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      const qId = (s.quizId || '').toLowerCase();
      const qCode = ((s as any).quizCode || '').toLowerCase();
      const qTitle = (s.quizTitle || '').toLowerCase();
      return poolQuizKeys.has(qId) || poolQuizKeys.has(qCode) || poolQuizKeys.has(qTitle);
    });
  }, [submissions, poolQuizKeys]);

  const filteredQuizzes = useMemo(() => {
    if (!searchQuery.trim()) return poolQuizzes;
    const clean = searchQuery.toLowerCase().trim();
    return poolQuizzes.filter((q) => {
      return (
        (q.title || '').toLowerCase().includes(clean) ||
        (q.code || '').toLowerCase().includes(clean) ||
        (q.subject || '').toLowerCase().includes(clean) ||
        (q.classGroup || '').toLowerCase().includes(clean)
      );
    });
  }, [poolQuizzes, searchQuery]);

  const handleCopyCode = (quiz: QuizConfig) => {
    const code = quiz.code || quiz.id;
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCodeId(quiz.id || quiz.code || 'code');
      setTimeout(() => setCopiedCodeId(null), 2500);
    });
  };

  const handleCopyUrl = (quiz: QuizConfig) => {
    const code = quiz.code || quiz.id;
    if (!code) return;
    const examUrl = `${baseUrl}?quiz=${encodeURIComponent(code)}&standalone=true`;
    navigator.clipboard.writeText(examUrl).then(() => {
      setCopiedQuizId(quiz.id || quiz.code || 'url');
      setTimeout(() => setCopiedQuizId(null), 2500);
    });
  };

  const handleDownloadStudentList = (quiz: QuizConfig) => {
    const qKey = quiz.id || quiz.code || 'pool-quiz';
    setDownloadingStudentListId(qKey);
    try {
      const res = downloadQuizStudentListExcel(quiz, submissions);
      if (res.message) {
        setNotification({ message: res.message, type: 'info' });
      } else {
        setNotification({
          message: `Exported access list with ${res.count} candidates for "${quiz.title || quiz.code}".`,
          type: 'success'
        });
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate student list spreadsheet.');
    } finally {
      setTimeout(() => setDownloadingStudentListId(null), 2500);
      setTimeout(() => setNotification(null), 6000);
    }
  };

  const handleDownloadOfflineExam = (quiz: QuizConfig) => {
    const quizCode = quiz.code || quiz.id || 'POOL_EXAM';
    setDownloadingOfflineId(quiz.id || quiz.code || 'offline');
    try {
      const qList = quiz.questions && quiz.questions.length > 0 ? quiz.questions : questions;
      const secList = quiz.sections && quiz.sections.length > 0 ? quiz.sections : (sections || []);
      const html = generateStandaloneOfflineHtmlExam(quiz, qList, secList);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Offline_QuestionPool_${quizCode.replace(/[^a-zA-Z0-9_-]/g, '_')}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to generate offline HTML package.');
    } finally {
      setTimeout(() => setDownloadingOfflineId(null), 3000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg border transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-indigo-50 text-indigo-900 border-indigo-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-500 hover:text-slate-800 text-xs px-2 py-0.5 rounded cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hero Workspace Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border-2 border-purple-400/40 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-purple-500 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                <Shuffle className="w-3.5 h-3.5 text-amber-300" />
                <span>Randomized Question Pool Workspace</span>
              </span>
              <span className="bg-amber-400 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Anti-Collusion Seeded PRNG
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-white tracking-tight">
              500+ Question Banking & Randomized Exam Draws
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/90 leading-relaxed">
              Upload hundreds of questions into a master repository. The engine deterministically serves a randomized, unique question draw (e.g. 50 items) to each candidate. No two adjacent students receive the exact same test, and page reloads deterministically retain their assigned questions.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => generateQuestionPoolWordTemplate('Master_Question_Bank_500_Template')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              title="Download standardized Microsoft Word template formatted for 500+ questions"
            >
              <FileText className="w-4 h-4 text-purple-300 shrink-0" />
              <span>Download 500+ Word Template (.docx)</span>
            </button>

            <button
              type="button"
              onClick={onOpenCreatePool}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 rounded-xl text-xs font-black inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg hover:shadow-xl hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>+ New Question Pool Exam</span>
            </button>
          </div>
        </div>

        {/* Aggregate KPI Stats */}
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider block">
              Active Question Pools
            </span>
            <span className="font-bold text-white text-lg mt-0.5 block">
              {poolQuizzes.length} {poolQuizzes.length === 1 ? 'Exam' : 'Exams'}
            </span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider block">
              Master Questions in Bank
            </span>
            <span className="font-bold text-amber-300 text-lg mt-0.5 block">
              {totalPoolQuestions.toLocaleString()} Items
            </span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider block">
              Student Submissions
            </span>
            <span className="font-bold text-emerald-300 text-lg mt-0.5 block">
              {poolSubmissions.length} Completed
            </span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider block">
              Proctoring Architecture
            </span>
            <span className="font-bold text-white text-xs mt-1 block flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 inline" />
              3-Strike & Lockdown Active
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search question pool exams by title, subject, or code..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{filteredQuizzes.length}</strong> of{' '}
            <strong className="text-slate-800">{poolQuizzes.length}</strong> pool exams
          </span>
        </div>
      </div>

      {/* Empty State when no pool quizzes exist */}
      {poolQuizzes.length === 0 && (
        <div className="bg-white border-2 border-dashed border-purple-200 rounded-3xl p-8 sm:p-12 text-center max-w-3xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto border border-purple-200">
            <Shuffle className="w-8 h-8 text-purple-700" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg sm:text-xl font-bold font-serif text-slate-900">
              No Randomized Question Pools Yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
              Create your first question pool to upload 100 to 1,000+ questions. The engine will randomly draw a designated number of questions (e.g. 50 items) for each candidate.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto text-left text-xs">
            <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100">
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center mb-1.5">
                1
              </span>
              <span className="font-bold text-slate-900 block">Download Template</span>
              <span className="text-slate-500 text-[11px]">Get our formatted Excel sheet for 500+ items.</span>
            </div>

            <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100">
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center mb-1.5">
                2
              </span>
              <span className="font-bold text-slate-900 block">Set Draw Quota</span>
              <span className="text-slate-500 text-[11px]">Specify how many questions each student receives.</span>
            </div>

            <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100">
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center mb-1.5">
                3
              </span>
              <span className="font-bold text-slate-900 block">Distribute Code</span>
              <span className="text-slate-500 text-[11px]">Share access code or standalone offline HTML.</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenCreatePool}
              className="px-6 py-3 bg-purple-900 hover:bg-purple-950 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-300" />
              <span>+ Create First Question Pool Exam</span>
            </button>
          </div>
        </div>
      )}

      {/* Grid of Question Pool Exams */}
      {filteredQuizzes.length > 0 && (
        <div className="grid grid-cols-1 gap-5">
          {filteredQuizzes.map((quiz, idx) => {
            const masterCount = quiz.questions?.length || quiz.poolOriginalSize || 0;
            const quota = quiz.poolQuestionsToServe || 50;
            const quizKey = quiz.id || quiz.code || `quiz-${idx}`;
            const isCopied = copiedQuizId === (quiz.id || quiz.code);
            const isCodeCopied = copiedCodeId === (quiz.id || quiz.code);
            const isDownloadingList = downloadingStudentListId === quizKey;
            const isDownloadingOffline = downloadingOfflineId === quizKey;

            const examSubmissions = submissions.filter((s) => {
              const subQ = (s.quizId || '').toLowerCase();
              const subCode = ((s as any).quizCode || '').toLowerCase();
              const targetId = (quiz.id || '').toLowerCase();
              const targetCode = (quiz.code || '').toLowerCase();
              return (targetId && subQ === targetId) || (targetCode && subCode === targetCode);
            });

            return (
              <div
                key={quizKey}
                className="bg-white border-2 border-purple-100 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                {/* Top Section */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-900 text-amber-300 border border-purple-700 uppercase tracking-wider flex items-center gap-1">
                        <Shuffle className="w-3 h-3 text-amber-300" />
                        <span>Question Pool</span>
                      </span>

                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                        {quiz.subject || 'Core Mathematics'}
                      </span>

                      {quiz.classGroup && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {quiz.classGroup}
                        </span>
                      )}

                      {/* Lockdown Badge */}
                      {quiz.enableFullscreenLockdown ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1" title="Lockdown Kiosk Active: Forced Fullscreen, Frozen Aux Keys, Linear Mode, Per-Question Timer, Auto-Skip on Tab Switch">
                          <Lock className="w-2.5 h-2.5 text-purple-700" />
                          <span>Lockdown: ON</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-slate-400" />
                          <span>Lockdown: OFF</span>
                        </span>
                      )}

                      {/* 3-Strike Tab Penalty Badge */}
                      {quiz.progressiveTabPenalty !== false ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1" title="3-Strike Tab Penalty: 1st: -2m, 2nd: -5m, 3rd: Auto-Submit">
                          <ShieldAlert className="w-2.5 h-2.5 text-rose-600" />
                          <span>3-Strike Penalty: ON</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1">
                          <span>Penalty: OFF</span>
                        </span>
                      )}

                      {/* Pagination Badge */}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-900 border border-indigo-200 flex items-center gap-1">
                        <Layers className="w-2.5 h-2.5 text-indigo-600" />
                        <span>{quiz.questionPaginationMode === 'single-page' ? 'All Questions / Page' : '1 Question / Page'}</span>
                      </span>

                      {/* Single Attempt Badge */}
                      {quiz.preventMultipleAttempts !== false ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1">
                          <span>1 Attempt</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1">
                          <span>Multi-Attempt</span>
                        </span>
                      )}

                      {quiz.status === 'active' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          <span>Active Exam</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                          <Pause className="w-2.5 h-2.5" />
                          <span>Paused</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold font-serif text-slate-900">
                      {quiz.title}
                    </h3>
                  </div>

                  {/* Access Code & Direct Copy Pill */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="bg-slate-900 text-white px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-xs font-mono font-bold shadow-xs">
                      <span className="text-[10px] text-amber-400 font-sans uppercase font-bold tracking-wider">
                        Code:
                      </span>
                      <span className="text-white text-sm tracking-wider select-all">{quiz.code}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(quiz)}
                        className="text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5"
                        title="Copy Exam Access Code"
                      >
                        {isCodeCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {onUpdateQuizStatus && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateQuizStatus(
                            quiz.id || quiz.code || '',
                            quiz.status === 'active' ? 'paused' : 'active'
                          )
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer border ${
                          quiz.status === 'active'
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}
                        title={quiz.status === 'active' ? 'Pause candidate access' : 'Activate exam for candidates'}
                      >
                        {quiz.status === 'active' ? (
                          <>
                            <Pause className="w-3.5 h-3.5 text-amber-700" />
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Activate</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Pool Architecture Highlight Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="bg-purple-50/80 border border-purple-200/80 rounded-2xl p-3">
                    <span className="text-[10px] text-purple-700 font-bold uppercase tracking-wider block">
                      Master Question Bank
                    </span>
                    <span className="font-bold text-purple-950 text-sm mt-0.5 block">
                      {masterCount} Questions
                    </span>
                    <span className="text-[10px] text-purple-600">Full repository</span>
                  </div>

                  <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3">
                    <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">
                      Candidate Draw Quota
                    </span>
                    <span className="font-bold text-amber-950 text-sm mt-0.5 block">
                      {quota} Questions / Student
                    </span>
                    <span className="text-[10px] text-amber-700">Deterministic Seeded PRNG</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                      Distribution Strategy
                    </span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block truncate">
                      {quiz.poolSelectionStrategy === 'balanced_sections'
                        ? 'Topic-Balanced'
                        : 'Uniform Random'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {quiz.poolSelectionStrategy === 'balanced_sections'
                        ? 'Proportional per section'
                        : 'Equal probability'}
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                      Duration & Roster
                    </span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                      {quiz.durationMinutes || 60} Mins • {quiz.studentRoster?.length || 0} Students
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {quiz.accessMode === 'restricted' ? 'Restricted Roster' : 'Open Access'}
                    </span>
                  </div>
                </div>

                {/* Quick Integrity & Proctoring 1-Click Controls */}
                <div className="flex items-center gap-2 flex-wrap bg-slate-50/80 p-2.5 rounded-2xl border border-slate-200 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-purple-700" />
                    <span>Quick Controls:</span>
                  </span>

                  {/* 1-Click Lockdown Kiosk Mode Toggle */}
                  {onToggleFullscreenLockdown && (
                    <button
                      type="button"
                      onClick={() => onToggleFullscreenLockdown(quiz.id || quiz.code || '')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer border ${
                        quiz.enableFullscreenLockdown
                          ? 'bg-purple-100 hover:bg-purple-200 text-purple-950 border-purple-300 shadow-2xs'
                          : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                      title="Toggle Institutional Lockdown Kiosk Mode (Fullscreen, Linear progression, per-question timer, auto-skip on tab switch)"
                    >
                      <Lock className={`w-3 h-3 ${quiz.enableFullscreenLockdown ? 'text-purple-700' : 'text-slate-400'}`} />
                      <span>Lockdown Kiosk: {quiz.enableFullscreenLockdown ? 'ON' : 'OFF'}</span>
                    </button>
                  )}

                  {/* 1-Click 3-Strike Tab Penalty Toggle */}
                  {onToggleTabPenalty && (
                    <button
                      type="button"
                      onClick={() => onToggleTabPenalty(quiz.id || quiz.code || '')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer border ${
                        quiz.progressiveTabPenalty !== false
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-300 shadow-2xs'
                          : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                      title="Toggle 3-Strike Tab Penalty (1st: -2m, 2nd: -5m, 3rd: Auto-Submit)"
                    >
                      <ShieldAlert className={`w-3 h-3 ${quiz.progressiveTabPenalty !== false ? 'text-rose-600' : 'text-slate-400'}`} />
                      <span>3-Strike Penalty: {quiz.progressiveTabPenalty !== false ? 'ON' : 'OFF'}</span>
                    </button>
                  )}

                  {/* 1-Click Single Attempt Toggle */}
                  {onToggleAttemptLimit && (
                    <button
                      type="button"
                      onClick={() => onToggleAttemptLimit(quiz.id || quiz.code || '')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer border ${
                        quiz.preventMultipleAttempts !== false
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-300 shadow-2xs'
                          : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                      title="Toggle Single Attempt Lockout"
                    >
                      <CheckCircle2 className={`w-3 h-3 ${quiz.preventMultipleAttempts !== false ? 'text-amber-700' : 'text-slate-400'}`} />
                      <span>Single Attempt: {quiz.preventMultipleAttempts !== false ? 'ON' : 'OFF'}</span>
                    </button>
                  )}

                  {/* 1-Click Option Shuffling Toggle */}
                  {onToggleOptionShuffling && (
                    <button
                      type="button"
                      onClick={() => onToggleOptionShuffling(quiz.id || quiz.code || '')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer border ${
                        quiz.randomizeOptions !== false
                          ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-300 shadow-2xs'
                          : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                      title="Toggle Alternative Option Order Randomization (A, B, C, D)"
                    >
                      <Shuffle className={`w-3 h-3 ${quiz.randomizeOptions !== false ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span>Option Shuffle: {quiz.randomizeOptions !== false ? 'ON' : 'OFF'}</span>
                    </button>
                  )}
                </div>

                {/* Complete Action Toolbar */}
                <div className="pt-2 flex items-center justify-between gap-2 flex-wrap border-t border-slate-100">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Standalone Offline HTML Exam */}
                    <button
                      type="button"
                      onClick={() => handleDownloadOfflineExam(quiz)}
                      className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-950 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer border border-purple-300 shadow-2xs"
                      title="Download offline HTML package with self-contained seeded random question draw engine"
                    >
                      {isDownloadingOffline ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-purple-800">Downloaded (.html)!</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5 text-purple-700" />
                          <span>Offline HTML Exam</span>
                        </>
                      )}
                    </button>

                    {/* Candidate Roster & Bulk Upload */}
                    <button
                      type="button"
                      onClick={() => onOpenRosterModal(quiz)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer border shadow-2xs ${
                        quiz.accessMode === 'restricted'
                          ? 'bg-purple-100 hover:bg-purple-200 text-purple-900 border-purple-300'
                          : 'bg-slate-100 hover:bg-purple-50 text-slate-800 hover:text-purple-900 border-slate-200'
                      }`}
                      title={`Manage candidate roster and bulk upload for ${quiz.title}`}
                    >
                      <Users className="w-3.5 h-3.5 text-purple-700" />
                      <span>Roster ({quiz.studentRoster?.length || 0})</span>
                      {quiz.accessMode === 'restricted' && (
                        <Lock className="w-3 h-3 text-purple-800 shrink-0" />
                      )}
                    </button>

                    {/* Download Student List Having Access */}
                    <button
                      type="button"
                      onClick={() => handleDownloadStudentList(quiz)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer border border-emerald-300 shadow-2xs"
                      title="Download full list of authorized students as an Excel file (.xlsx)"
                    >
                      {isDownloadingList ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-800">Downloaded (.xlsx)!</span>
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Student List (.xlsx)</span>
                        </>
                      )}
                    </button>

                    {/* Edit Instructions */}
                    <button
                      type="button"
                      onClick={() => onOpenInstructionsModal(quiz)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-600" />
                      <span>Instructions</span>
                    </button>

                    {/* Copy Exam URL */}
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(quiz)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
                      title="Copy candidate direct exam URL"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">URL Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-600" />
                          <span>Copy URL</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Open Quiz View */}
                    <button
                      type="button"
                      onClick={() => onPreviewQuiz?.(quiz)}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Quiz</span>
                    </button>

                    {/* Monitor Test */}
                    <button
                      type="button"
                      onClick={() => onSelectQuizToMonitor?.(quiz.id || quiz.code || '')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-900 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      title="Monitor live candidate test progress"
                    >
                      <Activity className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Monitor Test</span>
                    </button>

                    {/* Results */}
                    <button
                      type="button"
                      onClick={() => onSelectQuizForResults?.(quiz.id || quiz.code || '')}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-900 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      title="View gradebook and analytics"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Results ({examSubmissions.length})</span>
                    </button>

                    {/* Edit Pool Exam & Settings */}
                    <button
                      type="button"
                      onClick={() => onEditPoolQuiz(quiz)}
                      className="px-3 py-1.5 rounded-xl bg-purple-900 hover:bg-purple-950 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      title="Edit master question bank and draw settings"
                    >
                      <Edit className="w-3.5 h-3.5 text-amber-300" />
                      <span>Edit Bank & Draw</span>
                    </button>

                    {/* Delete Quiz */}
                    {onDeleteQuiz && (
                      <button
                        type="button"
                        onClick={() => onDeleteQuiz(quiz.id || quiz.code || '')}
                        className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 border border-rose-200 transition-all cursor-pointer"
                        title="Delete question pool exam"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
