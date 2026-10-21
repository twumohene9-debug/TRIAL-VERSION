import React, { useState, useEffect } from 'react';
import { StudentSubmission, Question, QuizConfig, QuizStatus, QuizSection, SystemSettings, RosterStudent } from '../types';
import { MathRenderer } from './MathRenderer';
import { LiveStudentMonitoringView } from './LiveStudentMonitoringView';
import { ResultsDetailedAnalyticsView } from './ResultsDetailedAnalyticsView';
import { QRCodeModal } from './QRCodeModal';
import { QRScannerModal } from './QRScannerModal';
import { EditInstructionsModal } from './EditInstructionsModal';
import { CandidateRosterModal } from './CandidateRosterModal';
import { QuestionPoolCreatorModal } from './QuestionPoolCreatorModal';
import { QuestionPoolWorkspaceView } from './QuestionPoolWorkspaceView';
import { deduplicateSubmissions } from '../utils/submissionUtils';
import { generateStandaloneOfflineHtmlExam } from '../utils/offlineExamGenerator';
import { downloadQuizStudentListExcel } from '../utils/rosterParser';
import { BrandLogo } from './BrandLogo';
import * as XLSX from 'xlsx';
import { 
  BarChart3, 
  Users, 
  Award, 
  Clock, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle,
  Mail,
  ChevronRight,
  Filter,
  ArrowUpRight,
  FileSpreadsheet,
  ShieldAlert,
  Shield,
  Download,
  EyeOff,
  Trash2,
  RefreshCw,
  ArrowUpDown,
  BookOpen,
  Plus,
  Upload,
  Play,
  Pause,
  Copy,
  ExternalLink,
  Activity,
  Edit,
  Check,
  Lock,
  Zap,
  Globe,
  ArrowLeft,
  QrCode,
  ScanLine,
  WifiOff,
  UserCheck,
  FileText,
  LogOut,
  ShieldCheck,
  KeyRound,
  RotateCcw,
  Shuffle,
  Link as LinkIcon,
  Camera,
  X
} from 'lucide-react';

interface TeacherDashboardProps {
  submissions: StudentSubmission[];
  questions: Question[];
  sections?: QuizSection[];
  quizzes?: QuizConfig[];
  teacherName?: string;
  teacherEmail?: string;
  teacherDepartment?: string;
  isRevoked?: boolean;
  onOpenEmailFeedback: (submission: StudentSubmission) => void;
  onOpenImporter?: () => void;
  onCreateQuiz?: () => void;
  onEditQuiz?: (quiz: QuizConfig) => void;
  recentQuizNotification?: { quiz: QuizConfig; type: 'created' | 'updated'; timestamp: number } | null;
  onDismissRecentNotification?: () => void;
  onDeleteSubmission?: (id: string) => void;
  onUnlockStudentAttempt?: (submission: StudentSubmission) => void;
  onClearAllSubmissions?: () => void;
  onCleanDuplicates?: () => Promise<number> | number;
  onUpdateQuizStatus?: (quizId: string, status: QuizStatus) => void;
  onToggleTabPenalty?: (quizId: string) => void;
  onToggleAttemptLimit?: (quizId: string) => void;
  onToggleSecurityShield?: (quizId: string) => void;
  onToggleOptionShuffling?: (quizId: string) => void;
  onToggleFullscreenLockdown?: (quizId: string) => void;
  onDeleteQuiz?: (quizId: string) => void;
  onSelectQuizToMonitor?: (quizId: string) => void;
  onOpenQuestionBank?: () => void;
  onPreviewQuiz?: (quiz: QuizConfig) => void;
  onSaveInstructions?: (quizId: string, bullets: string[]) => void;
  onSavePoolQuiz?: (quiz: QuizConfig) => void;
  onSaveRoster?: (
    quizId: string,
    updatedRoster: RosterStudent[],
    accessMode: 'open' | 'restricted',
    validationField: 'id_only' | 'email_only' | 'id_or_email' | 'both'
  ) => void;
  onLogoutTeacher?: () => void;
  onSyncWithServer?: () => Promise<void> | void;
  systemSettings?: SystemSettings;
  onUpdateSystemSettings?: (settings: Partial<SystemSettings>) => void;
}

export type SortOption = 
  | 'score-desc' 
  | 'score-asc' 
  | 'percentage-desc' 
  | 'percentage-asc' 
  | 'name-asc' 
  | 'name-desc' 
  | 'tab-switches-desc' 
  | 'date-desc' 
  | 'date-asc';

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  submissions,
  questions,
  sections = [],
  quizzes = [],
  teacherName = 'Mr. Bismark Twum',
  teacherEmail,
  teacherDepartment = 'Mathematics & Computing',
  isRevoked = false,
  onOpenEmailFeedback,
  onOpenImporter,
  onCreateQuiz,
  onEditQuiz,
  recentQuizNotification,
  onDismissRecentNotification,
  onDeleteSubmission,
  onUnlockStudentAttempt,
  onClearAllSubmissions,
  onCleanDuplicates,
  onUpdateQuizStatus,
  onToggleTabPenalty,
  onToggleAttemptLimit,
  onToggleSecurityShield,
  onToggleOptionShuffling,
  onToggleFullscreenLockdown,
  onDeleteQuiz,
  onSelectQuizToMonitor,
  onOpenQuestionBank,
  onPreviewQuiz,
  onSaveInstructions,
  onSavePoolQuiz,
  onSaveRoster,
  onLogoutTeacher,
  onSyncWithServer,
  systemSettings,
  onUpdateSystemSettings,
}) => {
  const [activeViewTab, setActiveViewTab] = useState<'overview' | 'question_pools' | 'surveillance' | 'results'>('overview');
  const [isPoolCreatorOpen, setIsPoolCreatorOpen] = useState<boolean>(false);
  const [editingPoolQuiz, setEditingPoolQuiz] = useState<QuizConfig | null>(null);
  const [monitoringQuizId, setMonitoringQuizId] = useState<string>('all');
  const [resultsQuizId, setResultsQuizId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuizFilter, setSelectedQuizFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('score-desc');
  const [showOnlyTabSwitches, setShowOnlyTabSwitches] = useState<boolean>(false);
  const [isDeduplicated, setIsDeduplicated] = useState<boolean>(true);

  // Compute initials dynamically for the registered teacher
  const teacherInitials = React.useMemo(() => {
    if (!teacherName) return 'FC';
    const clean = teacherName.replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Rev\.)\s+/i, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'FC';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [teacherName]);

  // 1. Strictly isolate quizzes belonging to the authenticated teacher.
  // When a teacher logs in for the first time without any quizzes, this returns [].
  const teacherQuizzes = React.useMemo(() => {
    if (!teacherEmail) return [];
    const cleanAuthEmail = teacherEmail.toLowerCase().trim();
    const cleanAuthName = (teacherName || '').toLowerCase().trim();

    return quizzes.filter((q) => {
      const cleanQuizEmail = (q.teacherEmail || '').toLowerCase().trim();
      const cleanQuizName = (q.teacherName || '').toLowerCase().trim();
      const cleanTeacherId = (q.teacherId || '').toLowerCase().trim();

      if (cleanQuizEmail && cleanQuizEmail === cleanAuthEmail) return true;
      if (cleanTeacherId && cleanTeacherId === cleanAuthEmail) return true;
      if (cleanQuizName && cleanAuthName && (cleanQuizName === cleanAuthName || cleanQuizName.includes(cleanAuthName) || cleanAuthName.includes(cleanQuizName))) return true;
      return false;
    });
  }, [quizzes, teacherEmail, teacherName]);

  const poolQuizzes = React.useMemo(() => teacherQuizzes.filter((q) => Boolean(q.isQuestionPool)), [teacherQuizzes]);
  const standardQuizzes = React.useMemo(() => teacherQuizzes.filter((q) => !q.isQuestionPool), [teacherQuizzes]);

  // 2. Identify all quiz codes and IDs owned by this teacher
  const teacherQuizKeySet = React.useMemo(() => {
    const keySet = new Set<string>();
    teacherQuizzes.forEach((q) => {
      if (q.id) keySet.add(q.id.toLowerCase().trim());
      if (q.code) keySet.add(q.code.toLowerCase().trim());
      if (q.title) keySet.add(q.title.toLowerCase().trim());
    });
    return keySet;
  }, [teacherQuizzes]);

  // 3. Filter Submissions to ONLY submissions belonging to this teacher's quizzes
  const teacherSubmissions = React.useMemo(() => {
    if (!teacherEmail || teacherQuizzes.length === 0) return [];
    return submissions.filter((s) => {
      const subQuizId = (s.quizId || '').toLowerCase().trim();
      const subQuizCode = ((s as any).quizCode || '').toLowerCase().trim();
      const subQuizTitle = (s.quizTitle || '').toLowerCase().trim();
      return (
        teacherQuizKeySet.has(subQuizId) ||
        teacherQuizKeySet.has(subQuizCode) ||
        teacherQuizKeySet.has(subQuizTitle)
      );
    });
  }, [submissions, teacherEmail, teacherQuizzes.length, teacherQuizKeySet]);

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    teacherSubmissions.length > 0 ? teacherSubmissions[0].id : null
  );

  // QR Code Modals State
  const [selectedQuizForQR, setSelectedQuizForQR] = useState<QuizConfig | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  // Quiz Instructions Modal State
  const [selectedQuizForInstructions, setSelectedQuizForInstructions] = useState<QuizConfig | null>(null);
  const [isInstructionsModalOpen, setIsInstructionsModalOpen] = useState<boolean>(false);

  // Candidate Roster Modal State
  const [selectedQuizForRoster, setSelectedQuizForRoster] = useState<QuizConfig | null>(null);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState<boolean>(false);

  // Copied URL & Code feedback state
  const [copiedQuizId, setCopiedQuizId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [downloadingOfflineQuizId, setDownloadingOfflineQuizId] = useState<string | null>(null);
  const [downloadingStudentListQuizId, setDownloadingStudentListQuizId] = useState<string | null>(null);
  const [studentListNotification, setStudentListNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const handleDownloadQuizStudentList = (quiz: QuizConfig) => {
    const quizKey = quiz.id || quiz.code || 'quiz';
    setDownloadingStudentListQuizId(quizKey);

    try {
      const result = downloadQuizStudentListExcel(quiz, submissions);
      if (result.message) {
        setStudentListNotification({ message: result.message, type: 'info' });
      } else {
        setStudentListNotification({
          message: `Successfully downloaded list of ${result.count} students having access to "${quiz.title || quiz.code}".`,
          type: 'success',
        });
      }
    } catch (err: any) {
      console.error('Download student list failed:', err);
      alert('Failed to generate student list spreadsheet. Please try again.');
    } finally {
      setTimeout(() => {
        setDownloadingStudentListQuizId(null);
      }, 2500);
      setTimeout(() => {
        setStudentListNotification(null);
      }, 6500);
    }
  };

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

  // Confirmation Modals State
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState<boolean>(false);
  const [studentToDelete, setStudentToDelete] = useState<StudentSubmission | null>(null);
  const [quizToDelete, setQuizToDelete] = useState<QuizConfig | null>(null);

  // Direct Single-Quiz Student Assessment Link State
  const availableQuizzes = teacherQuizzes.length > 0 ? teacherQuizzes : quizzes;
  const [selectedQuizForDirectLink, setSelectedQuizForDirectLink] = useState<string>(() => {
    const initial = (teacherQuizzes.length > 0 ? teacherQuizzes : quizzes)[0];
    return initial?.code || initial?.id || '';
  });
  const [copiedDirectLink, setCopiedDirectLink] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedQuizForDirectLink && availableQuizzes.length > 0) {
      setSelectedQuizForDirectLink(availableQuizzes[0].code || availableQuizzes[0].id || '');
    }
  }, [availableQuizzes, selectedQuizForDirectLink]);

  const activeSelectedQuiz = availableQuizzes.find(
    (q) => (q.code || q.id) === selectedQuizForDirectLink
  ) || availableQuizzes[0];

  const directQuizCode = activeSelectedQuiz?.code || activeSelectedQuiz?.id || selectedQuizForDirectLink || '';
  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
  const directQuizUrl = directQuizCode ? `${baseUrl}?quiz=${encodeURIComponent(directQuizCode)}&standalone=true` : baseUrl;

  const handleCopyDirectQuizLink = () => {
    if (!directQuizUrl) return;
    navigator.clipboard.writeText(directQuizUrl).then(() => {
      setCopiedDirectLink(true);
      setTimeout(() => setCopiedDirectLink(false), 2500);
    });
  };

  // Filter Submissions by Quiz First and apply Deduplication to prevent duplicate student names
  const effectiveSubmissions = isDeduplicated ? deduplicateSubmissions(teacherSubmissions, 'latest') : teacherSubmissions;

  let filteredByQuiz = effectiveSubmissions;
  if (selectedQuizFilter !== 'all') {
    filteredByQuiz = effectiveSubmissions.filter((s) => {
      const matchDirect = s.quizId === selectedQuizFilter || s.quizTitle === selectedQuizFilter || (s as any).quizCode === selectedQuizFilter;
      const targetQuiz = teacherQuizzes.find((q) => q.id === selectedQuizFilter || q.code === selectedQuizFilter);
      const matchViaQuiz = targetQuiz && (
        s.quizId === targetQuiz.id ||
        s.quizId === targetQuiz.code ||
        s.quizTitle === targetQuiz.title ||
        (s as any).quizCode === targetQuiz.code
      );
      return Boolean(matchDirect || matchViaQuiz);
    });
  }

  // Filter Submissions by Tab Switches Checkbox & Search
  let processedSubmissions = filteredByQuiz.filter((s) => {
    const sName = (s?.studentName || '').toLowerCase();
    const sId = (s?.studentId || '').toLowerCase();
    const sEmail = (s?.studentEmail || '').toLowerCase();
    const cleanSearch = (searchTerm || '').toLowerCase();
    const matchesSearch =
      sName.includes(cleanSearch) ||
      sId.includes(cleanSearch) ||
      sEmail.includes(cleanSearch);
    
    if (showOnlyTabSwitches) {
      return matchesSearch && (s.tabSwitchesCount || 0) > 0;
    }
    return matchesSearch;
  });

  // Sort Submissions
  processedSubmissions = [...processedSubmissions].sort((a, b) => {
    switch (sortOption) {
      case 'score-desc':
        return (b.totalScore ?? 0) - (a.totalScore ?? 0);
      case 'score-asc':
        return (a.totalScore ?? 0) - (b.totalScore ?? 0);
      case 'percentage-desc':
        return (b.percentage ?? 0) - (a.percentage ?? 0);
      case 'percentage-asc':
        return (a.percentage ?? 0) - (b.percentage ?? 0);
      case 'name-asc':
        return (a.studentName || '').localeCompare(b.studentName || '');
      case 'name-desc':
        return (b.studentName || '').localeCompare(a.studentName || '');
      case 'tab-switches-desc':
        return (b.tabSwitchesCount || 0) - (a.tabSwitchesCount || 0);
      case 'date-desc':
        return new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime();
      case 'date-asc':
        return new Date(a.submittedAt || 0).getTime() - new Date(b.submittedAt || 0).getTime();
      default:
        return 0;
    }
  });

  // Compute Aggregate Analytics on filtered list
  const totalSubmissions = processedSubmissions.length;
  const avgPercentage = totalSubmissions > 0
    ? (processedSubmissions.reduce((acc, curr) => acc + (curr.percentage ?? 0), 0) / totalSubmissions).toFixed(1)
    : '0.0';
  const passCount = processedSubmissions.filter((s) => (s.percentage ?? 0) >= 60).length;
  const passRate = totalSubmissions > 0 ? Math.round((passCount / totalSubmissions) * 100) : 0;
  
  const percentages = totalSubmissions > 0 ? processedSubmissions.map((s) => s.percentage ?? 0) : [0];
  const highestPercentage = totalSubmissions > 0 ? percentages.reduce((max, v) => (v > max ? v : max), percentages[0]) : 0;
  const lowestPercentage = totalSubmissions > 0 ? percentages.reduce((min, v) => (v < min ? v : min), percentages[0]) : 0;

  // Copy Quiz URL Handler (Exact same standalone offline candidate URL as Admin Dashboard)
  const handleCopyQuizUrl = (quiz: QuizConfig) => {
    const quizCode = quiz.code || quiz.id;
    const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
    const url = `${baseUrl}?quiz=${encodeURIComponent(quizCode || '')}&standalone=true`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedQuizId(quiz.id || quiz.code || 'copied');
      setTimeout(() => setCopiedQuizId(null), 2500);
    });
  };

  // Copy Quiz Code Handler
  const handleCopyQuizCode = (quiz: QuizConfig) => {
    const quizCode = quiz.code || quiz.id || 'QUIZ';
    navigator.clipboard.writeText(quizCode).then(() => {
      setCopiedCodeId(quiz.id || quiz.code || 'copied');
      setTimeout(() => setCopiedCodeId(null), 2500);
    });
  };

  // Excel Export Handler
  const handleExportToExcel = () => {
    const excelRows = processedSubmissions.map((sub, idx) => ({
      'No.': idx + 1,
      'Student Name': sub.studentName,
      'Student ID': sub.studentId,
      'Email': sub.studentEmail,
      'Class Group': sub.classGroup,
      'School': sub.school,
      'Score': `${sub.totalScore}/${sub.maxScore}`,
      'Percentage (%)': sub.percentage,
      'Grade': sub.percentage >= 80 ? 'Distinction (A)' : sub.percentage >= 60 ? 'Credit (B)' : 'Pass (C)',
      'Status': sub.percentage >= 60 ? 'PASS' : 'FAIL',
      'Time Spent (Mins)': Math.round(sub.timeSpentSeconds / 60),
      'Tab Switches Recorded': sub.tabSwitchesCount || 0,
      'Window Exits Recorded': sub.windowExitsCount || 0,
      'Submission Timestamp': sub.submittedAt,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    XLSX.utils.sheet_add_aoa(worksheet, [[], ['The joy of the Lord is my strength']], { origin: -1 });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Assessment Results');
    XLSX.writeFile(workbook, `THE_JOY_OF_THE_LORD_RESULTS_${Date.now()}.xlsx`);
  };

  const selectedSubmission = processedSubmissions.find((s) => s.id === selectedStudentId) || processedSubmissions[0];

  const handleConfirmDeleteStudent = () => {
    if (studentToDelete && onDeleteSubmission) {
      onDeleteSubmission(studentToDelete.id);
      setStudentToDelete(null);
    }
  };

  const handleConfirmClearAll = () => {
    if (onClearAllSubmissions) {
      onClearAllSubmissions();
      setIsClearAllModalOpen(false);
    }
  };

  const handleConfirmDeleteQuiz = () => {
    if (quizToDelete && onDeleteQuiz && quizToDelete.id) {
      onDeleteQuiz(quizToDelete.id);
      setQuizToDelete(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* SECTION BACK ARROW NAVIGATION BAR */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-xs">
        <div className="flex items-center gap-2">
          {onOpenQuestionBank && (
            <button
              onClick={onOpenQuestionBank}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-300"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>Question Bank & Keys</span>
            </button>
          )}
        </div>

        <div className="text-xs font-bold text-slate-500">
          Faculty Control • Educator: <span className="text-amber-600 font-black">{teacherName}</span>
        </div>
      </div>

      {/* Revocation Alert Banner if Revoked */}
      {isRevoked && (
        <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 shadow-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-xs">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Faculty Privileges Revoked by Admin</h4>
              <p className="text-xs text-rose-700">
                Your teacher access status is set to REVOKED. You can review existing records and results, but editing active tests or creating new assessments is restricted.
              </p>
            </div>
          </div>
          <span className="text-xs bg-rose-200 text-rose-900 font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Revoked Status
          </span>
        </div>
      )}

      {/* 1. EDUCATOR PROFILE BANNER */}
      <div className="bg-slate-900 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 rounded-3xl border border-indigo-900/60 p-4 sm:p-8 shadow-2xl text-white relative overflow-hidden space-y-4 sm:space-y-6">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Square Dynamic Educator Emblem */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-xl flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex flex-col items-center justify-center text-center p-1 relative overflow-hidden">
                <span className="font-serif font-black text-amber-400 text-base sm:text-lg leading-none">{teacherInitials}</span>
                <span className="text-[8px] font-bold text-slate-300 tracking-tighter mt-0.5 max-w-[52px] truncate">{teacherName}</span>
                <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 font-black text-[8px] px-1.5 py-0.2 rounded-md uppercase shadow-xs">
                  PRO
                </span>
              </div>
            </div>

            {/* Tag */}
            <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-1 rounded-full text-xs font-semibold">
              <span>🎗️</span>
              <span>Educator Profile</span>
              <span className="text-slate-400">|</span>
              <span className="text-white font-bold truncate max-w-[140px] sm:max-w-none">{teacherName}</span>
            </div>
          </div>

          <h1 className="text-xl sm:text-3xl font-serif font-bold text-white tracking-tight leading-tight">
            Welcome, {teacherName}!
          </h1>

          <div className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl flex items-center gap-2">
            <BrandLogo size="xs" variant="icon-only" className="w-4 h-4 shrink-0" />
            <span>Multiple Choice Assessment Hub initialized with real-time analytics, Word document import, and live surveillance.</span>
          </div>
        </div>

        {/* Bottom Bar inside Header with Prominent CTAs */}
        <div className="pt-3 sm:pt-4 border-t border-indigo-900/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 text-xs text-amber-300 font-medium">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Active Quizzes: <strong className="text-white font-bold">{teacherQuizzes.filter(q => q.status === 'active').length}</strong></span>
            <span className="text-indigo-800">|</span>
            <span>Attempts: <strong className="text-white font-bold">{teacherSubmissions.length}</strong></span>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 flex-wrap">
            <button
              onClick={onCreateQuiz}
              disabled={isRevoked}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold px-3.5 sm:px-4 py-2.5 rounded-xl shadow-md transition-all text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Create Standard Quiz</span>
            </button>

            <button
              onClick={() => {
                setEditingPoolQuiz(null);
                setIsPoolCreatorOpen(true);
              }}
              disabled={isRevoked}
              className="bg-purple-900 hover:bg-purple-800 border border-purple-400/50 disabled:opacity-50 text-white font-bold px-3.5 sm:px-4 py-2.5 rounded-xl shadow-md transition-all text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
            >
              <Shuffle className="w-4 h-4 text-amber-300 shrink-0" />
              <span>New Question Pool (500+)</span>
            </button>

            {onOpenImporter && (
              <button
                onClick={onOpenImporter}
                disabled={isRevoked}
                className="bg-indigo-900/60 hover:bg-indigo-800/80 disabled:opacity-50 text-white border border-indigo-400/50 font-bold px-3.5 sm:px-4 py-2.5 rounded-xl shadow-sm transition-all text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <Upload className="w-4 h-4 shrink-0" />
                <span>Upload Word Document</span>
              </button>
            )}

            <button
              onClick={onOpenQuestionBank}
              className="bg-amber-700 hover:bg-amber-800 text-white font-bold px-3.5 sm:px-4 py-2.5 rounded-xl shadow-md transition-all text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer col-span-2 sm:col-span-1 min-h-[44px]"
            >
              <Zap className="w-4 h-4 shrink-0" />
              <span>Question Bank (Offline)</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW SELECTION NAVIGATION TABS */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2 sm:pb-3 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setActiveViewTab('overview')}
            className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 min-h-[40px] whitespace-nowrap ${
              activeViewTab === 'overview'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Overview & Hub</span>
          </button>

          <button
            onClick={() => setActiveViewTab('question_pools')}
            className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 min-h-[40px] whitespace-nowrap ${
              activeViewTab === 'question_pools'
                ? 'bg-purple-900 text-white shadow-sm ring-2 ring-purple-400/40'
                : 'bg-white text-purple-950 border border-purple-200 hover:bg-purple-50'
            }`}
          >
            <Shuffle className="w-4 h-4 text-amber-400" />
            <span>🎲 Question Pools (500+ Bank)</span>
            {poolQuizzes.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                {poolQuizzes.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setMonitoringQuizId('all');
              setActiveViewTab('surveillance');
            }}
            className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 min-h-[40px] whitespace-nowrap ${
              activeViewTab === 'surveillance'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Live Monitor</span>
          </button>

          <button
            onClick={() => {
              setResultsQuizId('all');
              setActiveViewTab('results');
            }}
            className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 min-h-[40px] whitespace-nowrap ${
              activeViewTab === 'results'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Results & Analytics</span>
          </button>
        </div>

        {onLogoutTeacher && (
          <button
            onClick={onLogoutTeacher}
            className="px-3 py-2 text-rose-700 hover:bg-rose-50 border border-rose-200 bg-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 min-h-[40px] ml-2"
            title="Lock session and log out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        )}
      </div>

      {/* RENDER FEATURE 1: LIVE SURVEILLANCE VIEW */}
      {activeViewTab === 'surveillance' && (
        <LiveStudentMonitoringView
          quizzes={teacherQuizzes}
          submissions={teacherSubmissions}
          initialQuizId={monitoringQuizId}
          onBackToOverview={() => setActiveViewTab('overview')}
          onNavigateToResults={(qId) => {
            if (qId) setResultsQuizId(qId);
            setActiveViewTab('results');
          }}
          onOpenEmailFeedback={onOpenEmailFeedback}
          onDeleteSubmission={onDeleteSubmission}
          onClearAllSubmissions={onClearAllSubmissions}
          onSyncWithServer={onSyncWithServer}
        />
      )}

      {/* RENDER FEATURE 2: RESULTS & DETAILED ANALYTICS VIEW */}
      {activeViewTab === 'results' && (
        <ResultsDetailedAnalyticsView
          quizzes={teacherQuizzes}
          submissions={teacherSubmissions}
          questions={questions}
          sections={sections}
          initialQuizId={resultsQuizId}
          currentTeacherEmail={teacherEmail}
          currentTeacherName={teacherName}
          isAdmin={false}
          onBackToOverview={() => setActiveViewTab('overview')}
          onOpenEmailFeedback={onOpenEmailFeedback}
          onDeleteSubmission={onDeleteSubmission}
          onClearAllSubmissions={onClearAllSubmissions}
          onCleanDuplicates={onCleanDuplicates}
        />
      )}

      {/* RENDER FEATURE: RANDOMIZED QUESTION POOL WORKSPACE */}
      {activeViewTab === 'question_pools' && (
        <QuestionPoolWorkspaceView
          poolQuizzes={poolQuizzes}
          submissions={teacherSubmissions}
          questions={questions}
          sections={sections}
          onOpenCreatePool={() => {
            setEditingPoolQuiz(null);
            setIsPoolCreatorOpen(true);
          }}
          onEditPoolQuiz={(quiz) => {
            setEditingPoolQuiz(quiz);
            setIsPoolCreatorOpen(true);
          }}
          onDeleteQuiz={(quizId) => {
            const target = teacherQuizzes.find((q) => q.id === quizId || q.code === quizId);
            if (target) setQuizToDelete(target);
          }}
          onPreviewQuiz={onPreviewQuiz}
          onSelectQuizToMonitor={(quizId) => {
            setMonitoringQuizId(quizId);
            setActiveViewTab('surveillance');
            onSelectQuizToMonitor?.(quizId);
          }}
          onSelectQuizForResults={(quizId) => {
            setResultsQuizId(quizId);
            setActiveViewTab('results');
          }}
          onOpenRosterModal={(quiz) => {
            setSelectedQuizForRoster(quiz);
            setIsRosterModalOpen(true);
          }}
          onOpenInstructionsModal={(quiz) => {
            setSelectedQuizForInstructions(quiz);
            setIsInstructionsModalOpen(true);
          }}
          onToggleTabPenalty={onToggleTabPenalty}
          onToggleAttemptLimit={onToggleAttemptLimit}
          onToggleFullscreenLockdown={onToggleFullscreenLockdown}
          onToggleSecurityShield={onToggleSecurityShield}
          onToggleOptionShuffling={onToggleOptionShuffling}
          onUpdateQuizStatus={onUpdateQuizStatus}
          baseUrl={baseUrl}
        />
      )}

      {/* RENDER OVERVIEW TAB */}
      {activeViewTab === 'overview' && (
        <>
          {/* Recent Quiz Setup / Update Indication Banner */}
          {recentQuizNotification && (
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-2 border-emerald-400 rounded-3xl p-5 text-white shadow-xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-xs">
                    <Sparkles className="w-5 h-5 text-emerald-300 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-emerald-500 text-slate-950 text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {recentQuizNotification.type === 'updated' ? '✓ Assessment Updated Successfully' : '✓ Assessment Successfully Set Up'}
                      </span>
                      <span className="text-xs text-slate-300 font-medium">
                        Active on your dashboard & ready for candidates
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold font-serif text-white mt-1">
                      {recentQuizNotification.quiz.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onDismissRecentNotification && (
                    <button
                      type="button"
                      onClick={onDismissRecentNotification}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      <span>Dismiss</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Details Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Access Code</span>
                  <span className="font-mono font-black text-amber-300 text-sm select-all">{recentQuizNotification.quiz.code}</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Duration</span>
                  <span className="font-bold text-white text-sm">{recentQuizNotification.quiz.durationMinutes || 60} Minutes</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Questions</span>
                  <span className="font-bold text-white text-sm">{recentQuizNotification.quiz.totalQuestions || recentQuizNotification.quiz.questions?.length || 0} Questions</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Subject & Class</span>
                  <span className="font-bold text-white text-sm truncate block">{recentQuizNotification.quiz.subject} • {recentQuizNotification.quiz.classGroup || 'All'}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2.5 flex-wrap pt-1">
                <button
                  onClick={() => handleCopyQuizCode(recentQuizNotification.quiz)}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedCodeId === (recentQuizNotification.quiz.id || recentQuizNotification.quiz.code) ? <Check className="w-3.5 h-3.5 text-slate-950" /> : <Copy className="w-3.5 h-3.5 text-slate-950" />}
                  <span>{copiedCodeId === (recentQuizNotification.quiz.id || recentQuizNotification.quiz.code) ? 'Code Copied!' : 'Copy Quiz Code'}</span>
                </button>

                <button
                  onClick={() => handleCopyQuizUrl(recentQuizNotification.quiz)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Copy Direct Exam URL</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedQuizForQR(recentQuizNotification.quiz);
                    setIsQRModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-amber-300" />
                  <span>QR Code</span>
                </button>

                {onSelectQuizToMonitor && (
                  <button
                    onClick={() => onSelectQuizToMonitor(recentQuizNotification.quiz.id || recentQuizNotification.quiz.code || '')}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Monitor Live Surveillance</span>
                  </button>
                )}

                {onEditQuiz && (
                  <button
                    onClick={() => onEditQuiz(recentQuizNotification.quiz)}
                    className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-indigo-200 hover:text-white font-bold text-xs rounded-xl border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Quiz & Setup Again</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 2. SIX METRIC SUMMARY CARDS (Matching Picture 1) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1: Total Quizzes */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold text-slate-600">Total Quizzes</span>
            <BookOpen className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-serif font-bold text-slate-900">{teacherQuizzes.length}</div>
          <div className="text-[10px] text-slate-400 font-medium">Created by you</div>
        </div>

        {/* Card 2: Active Quizzes */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold text-slate-600">Active Quizzes</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-serif font-bold text-slate-900">
            {teacherQuizzes.filter((q) => q.status === 'active').length}
          </div>
          <div className="text-[10px] text-emerald-600 font-medium">Currently open</div>
        </div>

        {/* Card 3: Total Students */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold text-slate-600">Total Students</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-serif font-bold text-slate-900">{totalSubmissions}</div>
          <div className="text-[10px] text-slate-400 font-medium">Unique takers</div>
        </div>

        {/* Card 4: Average Score */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold text-slate-600">Average Score</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-serif font-bold text-slate-900">{avgPercentage}%</div>
          <div className="text-[10px] text-slate-400 font-medium">Class average</div>
        </div>

        {/* Card 5: High / Low Score */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold text-slate-600">High / Low Score</span>
            <Award className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-xl font-serif font-bold text-slate-900 truncate">
            {highestPercentage}% / {lowestPercentage}%
          </div>
          <div className="text-[10px] text-slate-400 font-medium">Score range</div>
        </div>

        {/* Card 6: Pass Rate */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold text-slate-600">Pass Rate</span>
            <BarChart3 className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-serif font-bold text-slate-900">{passRate}%</div>
          <div className="text-[10px] text-teal-600 font-medium">Students passed</div>
        </div>
      </div>

      {/* 3. QUICK MANAGEMENT SHORTCUTS (Matching Picture 2) */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 tracking-wide uppercase">
          <Zap className="w-4 h-4 text-amber-500" />
          <span>Quick Management Shortcuts</span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onCreateQuiz}
            disabled={isRevoked}
            className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-300 hover:bg-amber-100 disabled:opacity-50 text-amber-900 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-amber-600" />
            <span>Create Quiz</span>
          </button>

          <button
            onClick={onOpenImporter}
            disabled={isRevoked}
            className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-300 hover:bg-amber-100 disabled:opacity-50 text-amber-900 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5 text-amber-600" />
            <span>Upload Questions</span>
          </button>

          <button
            onClick={onOpenQuestionBank}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-600" />
            <span>Question Bank</span>
          </button>

          <button
            onClick={() => {
              setMonitoringQuizId('all');
              setActiveViewTab('surveillance');
              if (onSelectQuizToMonitor) {
                onSelectQuizToMonitor('all');
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-900 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span>Live Monitor</span>
          </button>

          <button
            onClick={() => {
              setResultsQuizId('all');
              setActiveViewTab('results');
            }}
            className="px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-900 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Results & Analytics</span>
          </button>
        </div>
      </div>

      {/* DIRECT SINGLE-QUIZ STUDENT ASSESSMENT LINK */}
      <div className="bg-emerald-50/70 border border-emerald-300/80 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-950 font-mono">
              DIRECT SINGLE-QUIZ STUDENT ASSESSMENT LINK
            </h3>
          </div>
          <p className="text-xs text-slate-600 font-medium">
            Generate an isolated direct student link that immediately opens a specific assessment with zero browsing required.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <select
              value={selectedQuizForDirectLink}
              onChange={(e) => setSelectedQuizForDirectLink(e.target.value)}
              className="w-full bg-white border border-slate-300 hover:border-slate-400 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs transition-all cursor-pointer"
            >
              {availableQuizzes.map((q) => (
                <option key={q.id || q.code} value={q.code || q.id}>
                  {q.code || q.id} — {q.title || 'Untitled Assessment'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <input
              type="text"
              readOnly
              value={directQuizUrl}
              className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-3 text-xs font-mono text-slate-700 select-all shadow-2xs"
            />
          </div>

          <button
            onClick={handleCopyDirectQuizLink}
            className="w-full bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-sm py-3.5 px-6 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {copiedDirectLink ? (
              <>
                <Check className="w-4 h-4 text-white stroke-[3]" />
                <span>Copied Direct Quiz Link!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-white" />
                <span>Copy Direct Quiz Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4. YOUR ASSESSMENTS SECTION (Matching Picture 2) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-serif font-bold text-slate-900">Your Assessments</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Each quiz has its own unique student URL & live monitoring feed
            </p>
          </div>
          <span className="text-xs font-mono bg-slate-100 text-slate-700 font-bold px-3 py-1 rounded-full border border-slate-200">
            {teacherQuizzes.length} total quizzes
          </span>
        </div>

        {/* Student List Download Notification Toast */}
        {studentListNotification && (
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-xs animate-fade-in ${
              studentListNotification.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-indigo-50 border-indigo-300 text-indigo-950'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className={`w-4 h-4 shrink-0 ${studentListNotification.type === 'success' ? 'text-emerald-700' : 'text-indigo-700'}`} />
              <span className="font-semibold">{studentListNotification.message}</span>
            </div>
            <button
              onClick={() => setStudentListNotification(null)}
              className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer px-1"
            >
              ×
            </button>
          </div>
        )}

        {/* List of Assessments */}
        <div className="space-y-4">
          {teacherQuizzes.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-500 space-y-3">
              <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-medium text-slate-700">
                Welcome to your private Faculty Workspace, <strong className="text-slate-900 font-bold">{teacherName}</strong>!
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                You have not set up any quizzes in your workspace yet. Only assessments created by you will be displayed here. Click below to publish your first assessment or import questions from a Word document.
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  onClick={onCreateQuiz}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Your First Quiz</span>
                </button>
                {onOpenImporter && (
                  <button
                    onClick={onOpenImporter}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Word Document</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            teacherQuizzes.map((quiz, idx) => {
              const quizCode = quiz.code || quiz.id || `QUIZ-${idx + 1}`;
              const isCopied = copiedQuizId === (quiz.id || quiz.code || 'copied');
              const isActive = quiz.status === 'active';
              const isRecentSetup = Boolean(
                recentQuizNotification && 
                (recentQuizNotification.quiz.id === quiz.id || recentQuizNotification.quiz.code === quiz.code)
              );

              return (
                <div
                  key={`teacher-quiz-${quiz.id || quiz.code || idx}`}
                  className={`rounded-2xl p-5 transition-all space-y-3 bg-white ${
                    isRecentSetup
                      ? 'border-2 border-emerald-500 shadow-md ring-2 ring-emerald-200/60'
                      : 'border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Badge Row & Prominent Quiz Code */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* High-Visibility Quiz Code Pill */}
                      <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 px-3 py-1 rounded-xl shadow-2xs">
                        <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">Quiz Code:</span>
                        <span className="font-mono font-black text-xs text-amber-950 select-all tracking-wide">{quizCode}</span>
                        <button
                          onClick={() => handleCopyQuizCode(quiz)}
                          className="ml-1 text-[10px] font-bold text-amber-900 hover:text-amber-950 underline cursor-pointer"
                          title="Copy Quiz Code"
                        >
                          {copiedCodeId === (quiz.id || quiz.code || 'copied') ? 'Copied!' : 'Copy'}
                        </button>
                      </div>

                      {isRecentSetup && (
                        <span className="bg-emerald-600 text-white px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 shadow-2xs animate-pulse">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                          <span>{recentQuizNotification?.type === 'updated' ? '✓ Updated' : '✓ Just Set Up'}</span>
                        </span>
                      )}

                      <span
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {quiz.status || 'ACTIVE'}
                      </span>

                      {Boolean(quiz.progressiveTabPenalty || quiz.enableTabSwitchPenalties) && (
                        <span className="bg-rose-100 text-rose-800 border border-rose-300 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 shadow-2xs">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                          <span>3-Strike Penalty Active</span>
                        </span>
                      )}

                      {Boolean(quiz.enableCameraProctoring) && (
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 shadow-2xs">
                          <Camera className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{quiz.cameraCaptureCount || 5} Captures Active</span>
                        </span>
                      )}

                      {Boolean(
                        quiz.enforceSingleAttempt !== false &&
                        (quiz.enforceSingleAttempt || quiz.preventMultipleAttempts || (quiz.attemptsAllowed !== undefined && quiz.attemptsAllowed <= 1))
                      ) ? (
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 shadow-2xs">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>1 Attempt Only</span>
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                          <span>Retakes Allowed</span>
                        </span>
                      )}

                      {quiz.enableCandidateWatermark !== false && quiz.enableAntiCopyPrint !== false && (
                        <span className="bg-indigo-50 text-indigo-800 border border-indigo-300 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 shadow-2xs">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Watermark & Shield</span>
                        </span>
                      )}

                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-xl text-xs font-medium border border-slate-200">
                        {quiz.subject || 'Mathematics'} • {quiz.classGroup || 'SHS 1'}
                      </span>
                    </div>
                  </div>

                  {/* Title & Details */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {quiz.title || 'MCQ Assessment Paper'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Duration: {quiz.durationMinutes || 45} mins
                      </span>
                      <span>
                        Questions: {quiz.totalQuestions || 5} ({quiz.totalMarks || quiz.totalQuestions || 5} marks)
                      </span>
                      <span>
                        Attempts Allowed: {quiz.attemptsAllowed || 1}
                      </span>
                    </div>
                  </div>

                  {/* Integrity Indicator */}
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Tab-Switch Integrity Active</span>
                  </div>

                  {/* Action Buttons Row (Matching Picture 2) */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Copy Quiz Code */}
                      <button
                        onClick={() => handleCopyQuizCode(quiz)}
                        className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer border border-amber-300"
                        title="Copy Quiz Code for Students"
                      >
                        {copiedCodeId === (quiz.id || quiz.code || 'copied') ? (
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

                      {/* QR Code */}
                      <button
                        onClick={() => {
                          setSelectedQuizForQR(quiz);
                          setIsQRModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer border border-indigo-200"
                        title="Generate, Print, or Download QR Code"
                      >
                        <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                        <span>QR Code</span>
                      </button>

                      {/* Generate / Download Standalone Offline Exam */}
                      <button
                        onClick={() => handleDownloadOfflineExam(quiz)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer border border-emerald-300 shadow-2xs"
                        title="Generate and download self-contained 100% offline standalone HTML exam package for this test"
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
                      {(onEditQuiz || onSavePoolQuiz) && (
                        <button
                          onClick={() => {
                            if (quiz.isQuestionPool) {
                              setEditingPoolQuiz(quiz);
                              setIsPoolCreatorOpen(true);
                            } else if (onEditQuiz) {
                              onEditQuiz(quiz);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer border shadow-2xs ${
                            quiz.isQuestionPool
                              ? 'bg-purple-900 hover:bg-purple-950 text-white border-purple-800'
                              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-200'
                          }`}
                          title={quiz.isQuestionPool ? 'Edit question pool bank & draw settings' : 'Edit questions, instructions, quiz name, duration, and all delivery settings'}
                        >
                          <Edit className={`w-3.5 h-3.5 ${quiz.isQuestionPool ? 'text-amber-300' : 'text-indigo-700'}`} />
                          <span>{quiz.isQuestionPool ? 'Edit Pool & Draw' : 'Edit Quiz & Setup'}</span>
                        </button>
                      )}

                      {/* Edit Instructions */}
                      <button
                        onClick={() => {
                          setSelectedQuizForInstructions(quiz);
                          setIsInstructionsModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
                        title="Edit 4-5 Bullet Point Instructions for Students"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-600" />
                        <span>Instructions</span>
                      </button>

                      {/* Candidate Roster & Bulk Upload */}
                      <button
                        onClick={() => {
                          setSelectedQuizForRoster(quiz);
                          setIsRosterModalOpen(true);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer border shadow-2xs ${
                          quiz.accessMode === 'restricted'
                            ? 'bg-purple-100 hover:bg-purple-200 text-purple-900 border-purple-300'
                            : 'bg-slate-100 hover:bg-purple-50 text-slate-800 hover:text-purple-900 border-slate-200'
                        }`}
                        title={`Manage registered candidate roster and bulk Excel upload for ${quiz.title || quiz.code}`}
                      >
                        <Users className="w-3.5 h-3.5 text-purple-700" />
                        <span>Roster ({quiz.studentRoster?.length || 0})</span>
                        {quiz.accessMode === 'restricted' && (
                          <Lock className="w-3 h-3 text-purple-800 shrink-0" />
                        )}
                      </button>

                      {/* Download Student List Having Access */}
                      <button
                        onClick={() => handleDownloadQuizStudentList(quiz)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer border border-emerald-300 shadow-2xs"
                        title={`Download the full list of students having access to "${quiz.title || quiz.code}" as an Excel spreadsheet (.xlsx)`}
                      >
                        {downloadingStudentListQuizId === (quiz.id || quiz.code || 'downloaded') ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="text-emerald-800">Downloaded (.xlsx)!</span>
                          </>
                        ) : (
                          <>
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>Student List (.xlsx)</span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-emerald-200 text-emerald-950 rounded-full font-bold">
                              {quiz.studentRoster?.length || 0}
                            </span>
                          </>
                        )}
                      </button>

                      {/* Copy Student URL */}
                      <button
                        onClick={() => handleCopyQuizUrl(quiz)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
                        title="Copy direct candidate exam URL"
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

                      {/* Open Quiz */}
                      <button
                        onClick={() => onPreviewQuiz?.(quiz)}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Quiz View</span>
                      </button>

                      {/* Monitor */}
                      <button
                        onClick={() => {
                          const targetId = quiz.id || quiz.code || 'all';
                          setMonitoringQuizId(targetId);
                          setActiveViewTab('surveillance');
                          onSelectQuizToMonitor?.(targetId);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-900 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        title={`Monitor live student submissions for ${quiz.title || quiz.code}`}
                      >
                        <Activity className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Monitor Test</span>
                      </button>

                      {/* Results */}
                      <button
                        onClick={() => {
                          const targetId = quiz.id || quiz.code || 'all';
                          setResultsQuizId(targetId);
                          setActiveViewTab('results');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-900 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        title={`View student gradebook and results for ${quiz.title || quiz.code}`}
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Quiz Results</span>
                      </button>

                      {/* 1-Click 3-Strike Tab Penalty Toggle */}
                      {onToggleTabPenalty && (
                        <button
                          onClick={() => onToggleTabPenalty(quiz.id || quiz.code || '')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs border ${
                            Boolean(quiz.progressiveTabPenalty || quiz.enableTabSwitchPenalties)
                              ? 'bg-rose-100 hover:bg-rose-200 text-rose-900 border-rose-300 ring-1 ring-rose-300'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                          }`}
                          title={
                            Boolean(quiz.progressiveTabPenalty || quiz.enableTabSwitchPenalties)
                              ? '3-Strike Penalty is ACTIVE: (-2 mins, -5 mins, auto-submit on 3rd tab switch). Click to DEACTIVATE.'
                              : '3-Strike Penalty is INACTIVE. Click to ACTIVATE (-2 mins, -5 mins, auto-submit on 3rd tab switch).'
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
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs border ${
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
                              ? 'Single Attempt is ENFORCED: Candidates are restricted to 1 submission only using Name + ID/Email. Click to allow retakes.'
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
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs border ${
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
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs border ${
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
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs border ${
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
                              <span>Lockdown Kiosk: <strong className="text-purple-900 underline">ON</strong></span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                              <span>Lockdown Kiosk: <span className="text-slate-500 font-semibold">OFF</span></span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Pause / Resume */}
                      {onUpdateQuizStatus && (
                        <button
                          onClick={() =>
                            onUpdateQuizStatus(quiz.id || '', isActive ? 'paused' : 'active')
                          }
                          title={isActive ? 'Pause Quiz' : 'Activate Quiz'}
                          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer"
                        >
                          {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                      )}

                      {/* Edit Quiz & Setup */}
                      <button
                        onClick={() => {
                          if (onEditQuiz) {
                            onEditQuiz(quiz);
                          } else if (onOpenQuestionBank) {
                            onOpenQuestionBank();
                          }
                        }}
                        title="Edit questions, instructions, quiz name, duration, and setup rules"
                        className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 transition-all cursor-pointer"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => setQuizToDelete(quiz)}
                        title="Delete Quiz"
                        className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 5. STUDENT RESULTS & ANALYTICS ROSTER (Scroll Target) */}
      <div id="student-results-roster" className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-serif font-bold text-slate-900">Student Results Roster</h3>
            <p className="text-xs text-slate-500">
              Showing {processedSubmissions.length} student submission records
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportToExcel}
              disabled={processedSubmissions.length === 0}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </button>

            {onClearAllSubmissions && (
              <button
                onClick={() => setIsClearAllModalOpen(true)}
                disabled={teacherSubmissions.length === 0}
                className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50 font-bold text-xs inline-flex items-center gap-1.5 border border-rose-200 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear Records</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-12 gap-3">
          {/* Search */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student name, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
            />
          </div>

          {/* Quiz Filter */}
          <div className="lg:col-span-3">
            <select
              value={selectedQuizFilter}
              onChange={(e) => setSelectedQuizFilter(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-300 text-xs font-medium bg-slate-50/50 focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Quizzes ({teacherQuizzes.length})</option>
              {teacherQuizzes.map((q, idx) => (
                <option key={`teacher-opt-${q.id || q.code || idx}`} value={q.id || q.code}>
                  {q.title || q.code}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Option */}
          <div className="lg:col-span-3">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="w-full p-2 rounded-xl border border-slate-300 text-xs font-medium bg-slate-50/50 focus:ring-2 focus:ring-amber-500"
            >
              <option value="score-desc">Score: High to Low</option>
              <option value="score-asc">Score: Low to High</option>
              <option value="percentage-desc">Percentage: High to Low</option>
              <option value="percentage-asc">Percentage: Low to High</option>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
              <option value="tab-switches-desc">Most Tab Switches</option>
            </select>
          </div>

          {/* Checkbox tab switch filter */}
          <div className="lg:col-span-2 flex items-center justify-end">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showOnlyTabSwitches}
                onChange={(e) => setShowOnlyTabSwitches(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
              />
              <span>Violations Only</span>
            </label>
          </div>
        </div>

        {/* Master-Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          {/* Submissions Roster Column */}
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
              Submissions Roster ({processedSubmissions.length})
            </div>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto border border-slate-200 rounded-2xl bg-white">
              {processedSubmissions.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 space-y-1">
                  <p className="font-semibold text-slate-700">
                    {teacherQuizzes.length === 0
                      ? 'No assessment results yet.'
                      : 'No student results found matching criteria.'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {teacherQuizzes.length === 0
                      ? `Welcome ${teacherName}! Publish a quiz and distribute the link or code to start receiving candidate scores.`
                      : 'Try clearing the search or filter settings.'}
                  </p>
                </div>
              ) : (
                processedSubmissions.map((sub, sIdx) => {
                  const isSelected = sub.id === selectedSubmission?.id;
                  const hasTabSwitches = (sub.tabSwitchesCount || 0) > 0;

                  return (
                    <div
                      key={`teacher-sub-${sub.id || sIdx}`}
                      className={`p-4 transition-all flex items-center justify-between gap-3 ${
                        isSelected ? 'bg-indigo-50/80 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                      }`}
                    >
                      <button
                        onClick={() => setSelectedStudentId(sub.id)}
                        className="flex-1 text-left cursor-pointer space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">{sub.studentName}</span>
                          <span className={`text-xs font-black ${sub.percentage >= 60 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {sub.percentage}%
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span>{sub.studentId}</span>
                          <span>•</span>
                          <span>Score: {sub.totalScore}/{sub.maxScore}</span>
                        </div>
                      </button>

                      <div className="flex items-center gap-1">
                        {onUnlockStudentAttempt && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Unlock candidate ${sub.studentName} (${sub.studentId || sub.studentEmail}) to clear their previous attempt and allow a retake?`)) {
                                onUnlockStudentAttempt(sub);
                              }
                            }}
                            title="Unlock / Allow Retake for this Candidate"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onOpenEmailFeedback(sub)}
                          title="Send Email Feedback"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        {onDeleteSubmission && (
                          <button
                            onClick={() => setStudentToDelete(sub)}
                            title="Delete Record"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Student Inspection Panel Column */}
          <div className="lg:col-span-7">
            {selectedSubmission ? (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-200">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">{selectedSubmission.studentName}</h4>
                    <p className="text-xs text-slate-500">{selectedSubmission.studentEmail} • ID: {selectedSubmission.studentId}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {onUnlockStudentAttempt && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Unlock candidate ${selectedSubmission.studentName} (${selectedSubmission.studentId || selectedSubmission.studentEmail}) to clear lock and permit re-taking the exam?`)) {
                            onUnlockStudentAttempt(selectedSubmission);
                            setSelectedStudentId(null);
                          }
                        }}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Unlock single-attempt lock for this student"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Allow Retake (Unlock)</span>
                      </button>
                    )}

                    <div className="text-right">
                      <div className="text-2xl font-serif font-black text-slate-900">
                        {selectedSubmission.totalScore} / {selectedSubmission.maxScore}
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        selectedSubmission.percentage >= 60 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {selectedSubmission.percentage}% - {selectedSubmission.percentage >= 60 ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section Score Chips */}
                {selectedSubmission.sectionScores && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.keys(selectedSubmission.sectionScores).map((secIdStr, idx) => {
                      const secId = Number(secIdStr);
                      const sec = selectedSubmission.sectionScores[secId];
                      return (
                        <div key={`sec-${secIdStr}-${idx}`} className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                          <span className="text-[11px] text-slate-500 font-medium block">Section {secId}</span>
                          <span className="text-base font-bold text-slate-900">
                            {sec?.score ?? 0} / {sec?.max ?? 0} ({sec?.percentage ?? 0}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Question Grid Breakdown */}
                <div className="space-y-2">
                  {(() => {
                    const submissionQuiz = quizzes?.find((qz) => qz.id === selectedSubmission.quizId || qz.code === selectedSubmission.quizId);
                    const targetQuestions = submissionQuiz?.questions && submissionQuiz.questions.length > 0 ? submissionQuiz.questions : questions;

                    return (
                      <>
                        <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Question Performance Grid ({targetQuestions.length} Items)
                        </h5>

                        <div className="grid grid-cols-5 sm:grid-cols-8 gap-1.5">
                          {targetQuestions.map((q, qIdx) => {
                            const studentAns = selectedSubmission?.answers ? selectedSubmission.answers[q.id] : undefined;
                            const isCorrect = studentAns === q.correctAnswer;

                            return (
                              <div
                                key={`td-q-${selectedSubmission.id}-${q.id || qIdx}-${qIdx}`}
                                className={`p-1.5 rounded-lg border text-center text-[10px] ${
                                  isCorrect ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-rose-50 border-rose-300 text-rose-900'
                                }`}
                              >
                                <span className="font-bold block">Q{qIdx + 1}</span>
                                <span>{studentAns || '-'}</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Action button email feedback */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-end">
                  <button
                    onClick={() => onOpenEmailFeedback(selectedSubmission)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Send Personalized Feedback</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
                Select a student record from the roster to inspect detailed responses.
              </div>
            )}
          </div>
        </div>
      </div>
      </>
      )}

      {/* Confirmation Modal: Clear All */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Clear All Student Records?</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete all student submissions? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setIsClearAllModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClearAll}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Student */}
      {studentToDelete && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Delete Student Record?</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete submission record for <strong>{studentToDelete.studentName}</strong>?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteStudent}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Quiz */}
      {quizToDelete && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Delete Assessment Paper?</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete assessment <strong>{quizToDelete.title || quizToDelete.code}</strong>?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setQuizToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteQuiz}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Delete Assessment
              </button>
            </div>
          </div>
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

      {/* QR Scanner Modal for Offline Student Verification */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onQuizDetected={(loadedQuiz: any) => {
          setIsScannerOpen(false);
          const qId = typeof loadedQuiz === 'string' ? loadedQuiz : (loadedQuiz?.config?.id || loadedQuiz?.id || '');
          if (onSelectQuizToMonitor) onSelectQuizToMonitor(qId);
        }}
      />

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

      {/* Candidate Roster Modal */}
      {selectedQuizForRoster && (
        <CandidateRosterModal
          isOpen={isRosterModalOpen}
          onClose={() => {
            setIsRosterModalOpen(false);
            setSelectedQuizForRoster(null);
          }}
          quiz={selectedQuizForRoster}
          submissions={submissions}
          onSaveRoster={(quizId, updatedRoster, accessMode, validationField) => {
            if (onSaveRoster) {
              onSaveRoster(quizId, updatedRoster, accessMode, validationField);
            }
          }}
        />
      )}

      {/* Question Pool Creator / Editor Modal (500+ Question Bank) */}
      {isPoolCreatorOpen && (
        <QuestionPoolCreatorModal
          isOpen={isPoolCreatorOpen}
          onClose={() => {
            setIsPoolCreatorOpen(false);
            setEditingPoolQuiz(null);
          }}
          onCreateQuiz={(newQuiz) => {
            if (onSavePoolQuiz) {
              onSavePoolQuiz(newQuiz);
            }
            setIsPoolCreatorOpen(false);
            setEditingPoolQuiz(null);
          }}
          onUpdateQuiz={(updatedQuiz) => {
            if (onSavePoolQuiz) {
              onSavePoolQuiz(updatedQuiz);
            }
            setIsPoolCreatorOpen(false);
            setEditingPoolQuiz(null);
          }}
          quizToEdit={editingPoolQuiz}
          teacherName={teacherName}
        />
      )}
    </div>
  );
};
