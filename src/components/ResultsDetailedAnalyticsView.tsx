import React, { useState } from 'react';
import { QuizConfig, StudentSubmission, Question, QuizSection, CameraCaptureItem } from '../types';
import { deduplicateSubmissions, findDuplicateSubmissionIds } from '../utils/submissionUtils';
import { StudentDiagnosticPerformanceSlipModal } from './StudentDiagnosticPerformanceSlipModal';
import { StudentIncidentTimelineModal } from './StudentIncidentTimelineModal';
import { fetchCameraCapturesFromFirestore, deleteCameraCapturesFromFirestore } from '../services/firebaseSync';
import * as XLSX from 'xlsx';
import { 
  BarChart3, 
  FileSpreadsheet, 
  Share2, 
  Search, 
  Trash2, 
  Download, 
  ArrowUpDown, 
  Trophy, 
  ChevronRight, 
  Mail, 
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Filter,
  UserCheck,
  Award,
  Printer,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Layers,
  Sparkle,
  Camera,
  CameraOff,
  Video,
  Eye,
  X,
  ExternalLink
} from 'lucide-react';

interface ResultsDetailedAnalyticsViewProps {
  quizzes: QuizConfig[];
  submissions: StudentSubmission[];
  questions?: Question[];
  sections?: QuizSection[];
  initialQuizId?: string;
  currentTeacherEmail?: string;
  currentTeacherName?: string;
  isAdmin?: boolean;
  onBackToOverview?: () => void;
  onOpenEmailFeedback?: (submission: StudentSubmission) => void;
  onDeleteSubmission?: (id: string) => void;
  onClearAllSubmissions?: () => void;
  onCleanDuplicates?: () => Promise<number> | number;
  onOpenGoogleSheetsModal?: () => void;
}

export type SortOrder = 'rank-high' | 'rank-low' | 'name-asc' | 'switches-desc' | 'time-desc';

export const ResultsDetailedAnalyticsView: React.FC<ResultsDetailedAnalyticsViewProps> = ({
  quizzes,
  submissions,
  questions = [],
  sections = [],
  initialQuizId = 'all',
  currentTeacherEmail,
  currentTeacherName,
  isAdmin = false,
  onBackToOverview,
  onOpenEmailFeedback,
  onDeleteSubmission,
  onClearAllSubmissions,
  onCleanDuplicates,
  onOpenGoogleSheetsModal,
}) => {
  const [selectedQuizId, setSelectedQuizId] = useState<string>(initialQuizId);

  // Sync state if initialQuizId prop changes from parent
  React.useEffect(() => {
    if (initialQuizId) {
      setSelectedQuizId(initialQuizId);
    }
  }, [initialQuizId]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('rank-high');
  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<StudentSubmission | null>(null);
  const [isDeduplicated, setIsDeduplicated] = useState<boolean>(true);
  const [selectedSubmissionForSlip, setSelectedSubmissionForSlip] = useState<StudentSubmission | null>(null);
  const [selectedSubmissionForAudit, setSelectedSubmissionForAudit] = useState<StudentSubmission | null>(null);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [cleanNotice, setCleanNotice] = useState<string | null>(null);

  // Camera Proctoring Photo Gallery States
  const [selectedSubmissionForGallery, setSelectedSubmissionForGallery] = useState<StudentSubmission | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<CameraCaptureItem[]>([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState<boolean>(false);
  const [enlargedGalleryPhoto, setEnlargedGalleryPhoto] = useState<CameraCaptureItem | null>(null);
  const [unauthorizedNotice, setUnauthorizedNotice] = useState<{ quizTitle: string; ownerName: string } | null>(null);
  const [isPurgeQuizPhotosModalOpen, setIsPurgeQuizPhotosModalOpen] = useState<boolean>(false);
  const [isPurgingQuizPhotos, setIsPurgingQuizPhotos] = useState<boolean>(false);

  // Ownership verification helper: Only the teacher who created the quiz or admin can view captures
  const isTeacherOwnerOfQuiz = (quiz?: QuizConfig | null): boolean => {
    if (isAdmin) return true;
    if (!quiz) return true;

    const curEmail = (currentTeacherEmail || '').toLowerCase().trim();
    const curName = (currentTeacherName || '').toLowerCase().trim();
    const quizEmail = (quiz.teacherEmail || '').toLowerCase().trim();
    const quizName = (quiz.teacherName || '').toLowerCase().trim();

    if (quizEmail && curEmail && curEmail === quizEmail) return true;
    if (quizName && curName && (curName === quizName || curName.includes(quizName) || quizName.includes(curName))) return true;
    if (!quizEmail && !quizName) return true;
    return false;
  };

  const handleOpenGalleryForSubmission = async (sub: StudentSubmission) => {
    const targetQuiz = quizzes.find(
      (q) =>
        (q.id && (q.id === sub.quizId || q.id === (sub as any).quizCode)) ||
        (q.code && (q.code === sub.quizId || q.code === (sub as any).quizCode)) ||
        (q.title && q.title.toLowerCase() === (sub.quizTitle || '').toLowerCase())
    ) || quizzes.find((q) => q.id === selectedQuizId || q.code === selectedQuizId);

    // Enforce privacy rule: only the teacher who owns the quiz can view photos
    if (!isTeacherOwnerOfQuiz(targetQuiz)) {
      setUnauthorizedNotice({
        quizTitle: targetQuiz?.title || sub.quizTitle || 'Assessment',
        ownerName: targetQuiz?.teacherName || targetQuiz?.teacherEmail || 'The Quiz Instructor',
      });
      return;
    }

    setSelectedSubmissionForGallery(sub);
    setIsLoadingGallery(true);
    setGalleryPhotos([]);

    try {
      const qParam = sub.quizId || (sub as any).quizCode || '';
      const sParam = sub.studentId || sub.studentName || '';

      // 1. Fetch from server
      const res = await fetch(`/api/camera-captures?quizId=${encodeURIComponent(qParam)}&studentId=${encodeURIComponent(sParam)}`);
      let serverCaptures: CameraCaptureItem[] = [];
      if (res.ok) {
        const json = await res.json();
        serverCaptures = json.captures || [];
      }

      // 2. Fetch from Firestore
      const firestoreCaptures = await fetchCameraCapturesFromFirestore(qParam, sParam);

      // 3. Fallback to embedded submission captures
      const embedded = sub.cameraCaptures || [];

      // Combine and deduplicate by ID
      const photoMap = new Map<string, CameraCaptureItem>();
      [...serverCaptures, ...firestoreCaptures, ...embedded].forEach((p) => {
        if (p && p.imageDataUrl) {
          photoMap.set(p.id, p);
        }
      });

      const combined = Array.from(photoMap.values()).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      setGalleryPhotos(combined);
    } catch (err) {
      console.warn('Error fetching gallery photos:', err);
      setGalleryPhotos(sub.cameraCaptures || []);
    } finally {
      setIsLoadingGallery(false);
    }
  };

  const handleDeleteSinglePhoto = async (photoId: string) => {
    try {
      await fetch(`/api/camera-captures/${encodeURIComponent(photoId)}`, { method: 'DELETE' });
      setGalleryPhotos((prev) => prev.filter((p) => p.id !== photoId));
      if (selectedSubmissionForGallery && selectedSubmissionForGallery.cameraCaptures) {
        selectedSubmissionForGallery.cameraCaptures = selectedSubmissionForGallery.cameraCaptures.filter((p) => p.id !== photoId);
        selectedSubmissionForGallery.cameraCapturesCount = selectedSubmissionForGallery.cameraCaptures.length;
      }
    } catch (err) {
      console.error('Error deleting photo:', err);
    }
  };

  const handleDeleteAllStudentPhotos = async () => {
    if (!selectedSubmissionForGallery) return;
    const sub = selectedSubmissionForGallery;
    const qId = sub.quizId || (sub as any).quizCode || 'quiz';
    const sId = sub.studentId || sub.studentName;

    if (!window.confirm(`Permanently delete all ${galleryPhotos.length} proctoring photos for ${sub.studentName}? This cannot be undone.`)) {
      return;
    }

    try {
      await fetch(`/api/camera-captures/student/${encodeURIComponent(qId)}/${encodeURIComponent(sId)}`, {
        method: 'DELETE',
      });
      await deleteCameraCapturesFromFirestore(qId, sId);
      setGalleryPhotos([]);
      sub.cameraCaptures = [];
      sub.cameraCapturesCount = 0;
      setCleanNotice(`Deleted all proctoring photos for ${sub.studentName}.`);
      setTimeout(() => setCleanNotice(null), 4000);
    } catch (err) {
      console.error('Error deleting student photos:', err);
    }
  };

  const handleConfirmPurgeQuizPhotos = async () => {
    const activeQ = quizzes.find((q) => q.id === selectedQuizId || q.code === selectedQuizId);
    if (!activeQ) return;
    const qId = activeQ.id || activeQ.code || 'quiz';

    if (!isTeacherOwnerOfQuiz(activeQ)) {
      alert('Only the owner of this quiz can purge proctoring photos.');
      setIsPurgeQuizPhotosModalOpen(false);
      return;
    }

    setIsPurgingQuizPhotos(true);
    try {
      await fetch(`/api/camera-captures/quiz/${encodeURIComponent(qId)}`, { method: 'DELETE' });
      await deleteCameraCapturesFromFirestore(qId);
      setIsPurgeQuizPhotosModalOpen(false);
      setCleanNotice(`Permanently deleted and purged all proctoring photos for ${activeQ.title}.`);
      setTimeout(() => setCleanNotice(null), 5000);
    } catch (err) {
      console.error('Error purging quiz photos:', err);
    } finally {
      setIsPurgingQuizPhotos(false);
    }
  };

  // Calculate redundant duplicate count across all submissions in this view
  const duplicateCount = React.useMemo(() => {
    return findDuplicateSubmissionIds(submissions).length;
  }, [submissions]);

  const handleTriggerCleanDuplicates = async () => {
    if (duplicateCount === 0) return;
    setIsCleaning(true);
    try {
      let purged = 0;
      if (onCleanDuplicates) {
        purged = await onCleanDuplicates();
      } else {
        const dupIds = findDuplicateSubmissionIds(submissions);
        dupIds.forEach((id) => onDeleteSubmission?.(id));
        purged = dupIds.length;
      }
      setCleanNotice(`Cleaned and purged ${purged} duplicate submission${purged > 1 ? 's' : ''} from database & roster.`);
      setTimeout(() => setCleanNotice(null), 5000);
    } catch (err) {
      console.error('Error cleaning duplicates:', err);
    } finally {
      setIsCleaning(false);
    }
  };

  const formatSubmissionTime = (isoString?: string, localStr?: string) => {
    if (localStr) {
      const parts = localStr.split(',');
      return parts.length > 1 ? parts[1].trim() : localStr;
    }
    if (!isoString) return 'N/A';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
    } catch {
      return isoString;
    }
  };

  const formatSubmissionDate = (isoString?: string, localStr?: string) => {
    if (localStr) {
      const parts = localStr.split(',');
      if (parts.length > 1) return parts[0].trim();
    }
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const currentQuiz = quizzes.find((q) => {
    if (!selectedQuizId || selectedQuizId === 'all') return false;
    const target = selectedQuizId.toLowerCase().trim();
    return (
      (q.id && q.id.toLowerCase().trim() === target) ||
      (q.code && q.code.toLowerCase().trim() === target) ||
      (q.title && q.title.toLowerCase().trim() === target)
    );
  });

  // Normalize selectedQuizId to match the option value in the dropdown
  const activeSelectedQuizId = React.useMemo(() => {
    if (!selectedQuizId || selectedQuizId === 'all') return 'all';
    const match = quizzes.find((q) => {
      const target = selectedQuizId.toLowerCase().trim();
      return (
        (q.id && q.id.toLowerCase().trim() === target) ||
        (q.code && q.code.toLowerCase().trim() === target) ||
        (q.title && q.title.toLowerCase().trim() === target)
      );
    });
    return match ? (match.id || match.code || selectedQuizId) : selectedQuizId;
  }, [quizzes, selectedQuizId]);

  // Apply Deduplication to submissions
  const effectiveSubmissions = isDeduplicated ? deduplicateSubmissions(submissions, 'latest') : submissions;

  // Filter Submissions
  let filteredSubmissions = effectiveSubmissions.filter((s) => {
    const targetQ = (selectedQuizId || '').toLowerCase().trim();
    const subQId = (s.quizId || '').toLowerCase().trim();
    const subQCode = ((s as any).quizCode || '').toLowerCase().trim();
    const subQTitle = (s.quizTitle || '').toLowerCase().trim();

    const matchesQuiz =
      selectedQuizId === 'all' ||
      (subQId && subQId === targetQ) ||
      (subQCode && subQCode === targetQ) ||
      (subQTitle && subQTitle === targetQ) ||
      (currentQuiz && (
        (subQId && (subQId === (currentQuiz.id || '').toLowerCase().trim() || subQId === (currentQuiz.code || '').toLowerCase().trim())) ||
        (subQCode && (subQCode === (currentQuiz.code || '').toLowerCase().trim() || subQCode === (currentQuiz.id || '').toLowerCase().trim())) ||
        (subQTitle && currentQuiz.title && subQTitle === currentQuiz.title.toLowerCase().trim())
      ));
    
    const matchesSearch =
      s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentEmail.toLowerCase().includes(searchTerm.toLowerCase());

    return Boolean(matchesQuiz && matchesSearch);
  });

  // Sort Submissions
  filteredSubmissions = [...filteredSubmissions].sort((a, b) => {
    switch (sortOrder) {
      case 'rank-high':
        return b.percentage - a.percentage;
      case 'rank-low':
        return a.percentage - b.percentage;
      case 'name-asc':
        return a.studentName.localeCompare(b.studentName);
      case 'switches-desc':
        return (b.tabSwitchesCount || 0) - (a.tabSwitchesCount || 0);
      case 'time-desc':
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      default:
        return 0;
    }
  });

  // Excel Export Handler
  const handleExportExcel = () => {
    const rows = filteredSubmissions.map((sub, idx) => ({
      'Rank': idx + 1,
      'Student Name': sub.studentName,
      'Student ID': sub.studentId,
      'Email': sub.studentEmail,
      'Class Group': sub.classGroup,
      'Score': `${sub.totalScore} / ${sub.maxScore}`,
      'Percentage (%)': sub.percentage,
      'Grade': sub.percentage >= 80 ? 'A+ (Distinction)' : sub.percentage >= 60 ? 'Credit (Passed)' : 'Fail',
      'Tab Switches': sub.tabSwitchesCount || 0,
      'Submitted At': sub.submittedAt,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.sheet_add_aoa(worksheet, [[], ['The joy of the Lord is my strength']], { origin: -1 });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results Cohort');
    XLSX.writeFile(workbook, `THE_JOY_OF_THE_LORD_RESULTS_${Date.now()}.xlsx`);
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    const headers = ['Rank,Student Name,Student ID,Class,Score,Percentage,Grade,Tab Switches,Submitted At'];
    const rowData = filteredSubmissions.map((sub, idx) => 
      `${idx + 1},"${sub.studentName}",${sub.studentId},${sub.classGroup},"${sub.totalScore}/${sub.maxScore}",${sub.percentage}%,${sub.percentage >= 60 ? 'PASSED' : 'FAILED'},${sub.tabSwitchesCount || 0},"${sub.submittedAt}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rowData, '', '"The joy of the Lord is my strength"'].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RESULTS_COHORT_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. HEADER BANNER (Exact Match to Picture 2) */}
      <div className="bg-[#0B132B] bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 border border-indigo-900/60 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight flex items-center gap-2">
              Results & Detailed Analytics
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
              Analyze student performance, item difficulty, export Excel gradebooks, and synchronize live results with Google Sheets.
            </p>
          </div>

          {/* Action Buttons Top Right (Picture 2) */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              onClick={handleExportExcel}
              disabled={filteredSubmissions.length === 0}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel (.xlsx)</span>
            </button>

            <button
              onClick={onOpenGoogleSheetsModal}
              className="px-4 py-2.5 bg-transparent border border-amber-400/60 hover:bg-amber-400/10 text-amber-300 font-bold text-xs rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Share2 className="w-4 h-4 text-amber-400" />
              <span>Google Sheets Sync</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. SELECT ASSESSMENT & CLEAR / CSV BAR (Picture 2) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <label className="text-xs font-bold text-slate-800 whitespace-nowrap">
            Select Assessment:
          </label>
          <select
            value={activeSelectedQuizId}
            onChange={(e) => setSelectedQuizId(e.target.value)}
            className="w-full sm:w-auto flex-1 max-w-xl p-2.5 rounded-xl border border-slate-300 text-xs font-bold font-mono text-slate-900 bg-slate-50 focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">
              All Quizzes / Combined Submissions ({submissions.length} Total)
            </option>
            {quizzes.map((q, idx) => (
              <option key={`res-opt-${q.id || q.code || idx}`} value={q.id || q.code}>
                {q.code || `ALG-SHS1-2026-001`} – {q.title || 'Algebra & Quadratic Equations Mid-Term Assessment'} ({q.classGroup || 'SHS 1'})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Deduplication Toggle */}
          <button
            onClick={() => setIsDeduplicated(!isDeduplicated)}
            className={`px-3 py-2 border font-bold text-xs rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer ${
              isDeduplicated
                ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-2xs'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
            title="Toggle between single deduplicated attempt per student and all attempts"
          >
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            <span>{isDeduplicated ? 'Deduplicated (1/Student)' : 'All Submissions'}</span>
          </button>

          {/* Clean Duplicates Button */}
          {duplicateCount > 0 && (
            <button
              onClick={handleTriggerCleanDuplicates}
              disabled={isCleaning}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer animate-pulse"
              title="Permanently remove all duplicate submissions from the database"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>{isCleaning ? 'Purging...' : `Clean ${duplicateCount} Duplicate${duplicateCount > 1 ? 's' : ''}`}</span>
            </button>
          )}

          {/* Purge Proctoring Photos for Selected Quiz */}
          {currentQuiz && (Boolean(currentQuiz.enableCameraProctoring) || Boolean(currentQuiz.cameraCaptureCount)) && (
            <button
              onClick={() => setIsPurgeQuizPhotosModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
              title="Delete all proctoring photos captured for this assessment"
            >
              <Camera className="w-4 h-4 text-emerald-600" />
              <span>Purge Photos</span>
            </button>
          )}

          <button
            onClick={() => setIsClearModalOpen(true)}
            disabled={submissions.length === 0}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Clear Outdated / All</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredSubmissions.length === 0}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>CSV Export</span>
          </button>
        </div>
      </div>

      {/* Clean Success or Notice Banner */}
      {cleanNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-semibold animate-fade-in shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{cleanNotice}</span>
          </div>
          <button
            onClick={() => setCleanNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Duplicate detected informational banner */}
      {duplicateCount > 0 && !cleanNotice && (
        <div className="bg-amber-50/80 border border-amber-200/80 text-amber-900 px-4 py-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">{duplicateCount} duplicate submission{duplicateCount > 1 ? 's' : ''} detected</span>
              <span className="text-amber-800 ml-1">in the results folder. Clean now to permanently retain only the latest legitimate submission per student.</span>
            </div>
          </div>
          <button
            onClick={handleTriggerCleanDuplicates}
            disabled={isCleaning}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Clean Folder Now</span>
          </button>
        </div>
      )}

      {/* 3. SEARCH & RANKING FILTER BAR (Picture 2) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        {/* Search Bar */}
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student results by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium bg-slate-50 focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Rank Sort Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="w-full sm:w-auto p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <option value="rank-high">Rank: Highest Score First (1st → Last)</option>
            <option value="rank-low">Rank: Lowest Score First</option>
            <option value="name-asc">Student Name: A to Z</option>
            <option value="switches-desc">Most Tab Switches First</option>
            <option value="time-desc">Most Recent Submission</option>
          </select>
        </div>
      </div>

      {/* 4. STUDENT COHORT RANKING TABLE (Picture 2) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 font-serif flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Student Cohort Ranking ({filteredSubmissions.length} Submissions)
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            {currentQuiz?.title || 'Algebra & Quadratic Equations Mid-Term Assessment'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 uppercase font-bold text-[11px] tracking-wider">
                <th className="py-3.5 px-4">RANK</th>
                <th className="py-3.5 px-4">STUDENT NAME</th>
                <th className="py-3.5 px-4">ID / CLASS</th>
                <th className="py-3.5 px-4">SUBMIT TIME</th>
                <th className="py-3.5 px-4">SCORE</th>
                <th className="py-3.5 px-4">GRADE</th>
                <th className="py-3.5 px-4">TAB SWITCHES</th>
                <th className="py-3.5 px-4">CAMERA PROCTORING</th>
                <th className="py-3.5 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubmissions.map((s, idx) => {
                const rankNum = idx + 1;
                const isPass = s.percentage >= 60;
                const tabCount = s.tabSwitchesCount || 0;

                return (
                  <tr key={`rank-row-${s.id || idx}`} className="hover:bg-slate-50 transition-colors">
                    {/* RANK Badge */}
                    <td className="py-4 px-4 font-bold">
                      {rankNum === 1 ? (
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 font-black px-2.5 py-1 rounded-full text-xs inline-flex items-center gap-1 shadow-2xs">
                          🥇 #1
                        </span>
                      ) : rankNum === 2 ? (
                        <span className="bg-slate-200 text-slate-800 border border-slate-300 font-black px-2.5 py-1 rounded-full text-xs inline-flex items-center gap-1 shadow-2xs">
                          🥈 #2
                        </span>
                      ) : rankNum === 3 ? (
                        <span className="bg-amber-200/60 text-amber-950 border border-amber-300 font-black px-2.5 py-1 rounded-full text-xs inline-flex items-center gap-1 shadow-2xs">
                          🥉 #3
                        </span>
                      ) : (
                        <span className="text-slate-500 font-bold px-2 py-1 font-mono">
                          #{rankNum}
                        </span>
                      )}
                    </td>

                    {/* STUDENT NAME */}
                    <td className="py-4 px-4 font-bold text-slate-900 text-sm">{s.studentName}</td>

                    {/* ID / CLASS */}
                    <td className="py-4 px-4 font-mono font-medium text-slate-600">
                      {s.studentId} ({s.classGroup || 'SHS 1A'})
                    </td>

                    {/* SUBMIT TIME */}
                    <td className="py-4 px-4 font-mono text-slate-700">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{formatSubmissionTime(s.submittedAt, s.submittedAtLocal)}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                        <span>{formatSubmissionDate(s.submittedAt, s.submittedAtLocal)}</span>
                        {s.timeZone && (
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-sm border border-slate-200">
                            {s.timeZone.split('/').pop()?.replace('_', ' ') || s.timeZone}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* SCORE */}
                    <td className="py-4 px-4 font-bold text-slate-900 font-mono text-xs">
                      {s.totalScore} / {s.maxScore} <span className="text-slate-500 font-normal">({s.percentage}%)</span>
                    </td>

                    {/* GRADE */}
                    <td className="py-4 px-4">
                      {isPass ? (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                          A+ (PASSED)
                        </span>
                      ) : (
                        <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                          FAILED
                        </span>
                      )}
                    </td>

                    {/* TAB SWITCHES & PROCTORED AUDIT LOG */}
                    <td className="py-4 px-4 font-mono">
                      {tabCount === 0 && (!s.integrityEvents || s.integrityEvents.length === 0) ? (
                        <button
                          onClick={() => setSelectedSubmissionForAudit(s)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold font-mono transition-all cursor-pointer"
                          title="Click to view Immutable Integrity Audit Log"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>0 (Clean)</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedSubmissionForAudit(s)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold font-mono transition-all cursor-pointer group shadow-2xs"
                          title="Click to review exact violation timestamps in Immutable Incident Timeline"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-600 group-hover:scale-110 transition-transform" />
                          <span>{tabCount} violation{tabCount === 1 ? '' : 's'}</span>
                        </button>
                      )}
                    </td>

                    {/* CAMERA PROCTORING PHOTOS */}
                    <td className="py-4 px-4 font-mono">
                      {(s.cameraCapturesCount !== undefined && s.cameraCapturesCount > 0) || (s.cameraCaptures && s.cameraCaptures.length > 0) ? (
                        <button
                          onClick={() => handleOpenGalleryForSubmission(s)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-all cursor-pointer shadow-2xs group"
                          title="Click to view Proctoring Photos Gallery"
                        >
                          <Camera className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                          <span>{s.cameraCapturesCount !== undefined ? s.cameraCapturesCount : s.cameraCaptures!.length} Photos</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenGalleryForSubmission(s)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 text-xs font-medium transition-all cursor-pointer"
                          title="Inspect Proctoring Photo Gallery"
                        >
                          <Camera className="w-3.5 h-3.5 text-slate-400" />
                          <span>Gallery</span>
                        </button>
                      )}
                    </td>

                    {/* ACTIONS */}
                    <td className="py-4 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* View Proctoring Photos Action */}
                      <button
                        onClick={() => handleOpenGalleryForSubmission(s)}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-xl shadow-2xs transition-all inline-flex items-center gap-1 cursor-pointer"
                        title="View Proctoring Camera Photos"
                      >
                        <Camera className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">Photos</span>
                      </button>

                      {/* Diagnostic Result Slip Button (PDF / Print) */}
                      <button
                        onClick={() => setSelectedSubmissionForSlip(s)}
                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl shadow-2xs transition-all inline-flex items-center gap-1 cursor-pointer"
                        title="Download / Print Official Diagnostic Result Slip with Topic Mastery & Recommendations"
                      >
                        <Award className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="hidden sm:inline">Official Slip</span>
                      </button>

                      <button
                        onClick={() => onOpenEmailFeedback?.(s)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all inline-flex items-center gap-1 cursor-pointer"
                        title="Candidate Performance Report"
                      >
                        <span>Report</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      {onDeleteSubmission && (
                        <button
                          onClick={() => setSubmissionToDelete(s)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredSubmissions.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
                    No student results match the active filter or search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal: Clear All */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-serif">Clear All Results Records?</h3>
              <p className="text-xs text-slate-600 mt-1">
                Are you sure you want to permanently clear all student submissions for this view? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsClearModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClearAllSubmissions?.();
                  setIsClearModalOpen(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Clear All Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Single Submission */}
      {submissionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-serif">Delete Student Record?</h3>
              <p className="text-xs text-slate-600 mt-1">
                Are you sure you want to delete the submission record for <strong>{submissionToDelete.studentName}</strong>?
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSubmissionToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (submissionToDelete && onDeleteSubmission) {
                    onDeleteSubmission(submissionToDelete.id);
                  }
                  setSubmissionToDelete(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Proctored Window & Tab-Switch Immutable Incident Audit Timeline Modal */}
      {selectedSubmissionForAudit && (
        <StudentIncidentTimelineModal
          submission={selectedSubmissionForAudit}
          onClose={() => setSelectedSubmissionForAudit(null)}
        />
      )}

      {/* 2. Automated Student Diagnostic Performance Slip (PDF / Print) Modal */}
      {selectedSubmissionForSlip && (
        <StudentDiagnosticPerformanceSlipModal
          submission={selectedSubmissionForSlip}
          questions={currentQuiz?.questions || questions}
          sections={sections}
          onClose={() => setSelectedSubmissionForSlip(null)}
        />
      )}

      {/* 3. Random Camera Proctoring Photo Gallery Modal */}
      {selectedSubmissionForGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-xl">
                    <Camera className="w-5 h-5" />
                  </span>
                  <h3 className="text-lg font-bold font-serif text-white">
                    Proctoring Camera Gallery ({galleryPhotos.length} Captures)
                  </h3>
                </div>
                <p className="text-xs text-slate-300">
                  Candidate: <strong>{selectedSubmissionForGallery.studentName}</strong> • ID: <span className="font-mono">{selectedSubmissionForGallery.studentId || 'N/A'}</span> • Score: <strong className="text-amber-300">{selectedSubmissionForGallery.totalScore}/{selectedSubmissionForGallery.maxScore} ({selectedSubmissionForGallery.percentage}%)</strong>
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {galleryPhotos.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteAllStudentPhotos}
                    className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Permanently delete all captured photos for this student"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Delete All Photos</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedSubmissionForGallery(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                  title="Close Gallery"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Privacy & Auto-Purge Banner */}
            <div className="bg-emerald-50/90 border-b border-emerald-200 p-3 sm:px-6 flex items-start gap-2.5 text-xs text-emerald-950">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Strict Privacy & 7-Day Auto Purge:</strong> All camera captures are JPEG-compressed for minimal storage footprint, restricted exclusively to you as the quiz creator, and automatically permanently purged from the server after 7 days.
              </div>
            </div>

            {/* Modal Body: Gallery Grid */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {isLoadingGallery ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">Retrieving proctoring captures from secure cloud vault...</p>
                </div>
              ) : galleryPhotos.length === 0 ? (
                <div className="py-16 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <CameraOff className="w-12 h-12 text-slate-400 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-800">No Proctoring Photos Found</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    No camera photos were recorded for this attempt, or proctoring photos have already been manually or automatically purged.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {galleryPhotos.map((photo, pIdx) => (
                    <div
                      key={`photo-card-${photo.id || pIdx}`}
                      className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between"
                    >
                      {/* Photo Thumbnail */}
                      <div
                        className="relative aspect-[4/3] bg-black cursor-pointer overflow-hidden"
                        onClick={() => setEnlargedGalleryPhoto(photo)}
                      >
                        <img
                          src={photo.imageDataUrl}
                          alt={`Capture ${photo.captureIndex || pIdx + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-700 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Capture #{photo.captureIndex || pIdx + 1} of {photo.totalScheduled || galleryPhotos.length}</span>
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                          <Eye className="w-4 h-4" />
                          <span>Click to Enlarge</span>
                        </div>
                      </div>

                      {/* Photo Footer with Exact Time and Delete Button */}
                      <div className="p-3 bg-slate-950 text-slate-300 flex items-center justify-between gap-2 border-t border-slate-800 text-[11px]">
                        <div className="flex items-center gap-1.5 font-mono text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{formatSubmissionTime(photo.timestamp)}</span>
                          <span className="text-[10px] text-slate-500">({formatSubmissionDate(photo.timestamp)})</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Delete this photo capture?')) {
                              handleDeleteSinglePhoto(photo.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Delete this capture photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500 font-medium">
                Showing {galleryPhotos.length} proctoring photo{galleryPhotos.length === 1 ? '' : 's'} for this examination attempt.
              </span>
              <button
                type="button"
                onClick={() => setSelectedSubmissionForGallery(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Close Gallery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Full-Resolution Lightbox for Proctoring Photo */}
      {enlargedGalleryPhoto && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setEnlargedGalleryPhoto(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-3xl p-4 max-w-3xl max-h-[92vh] flex flex-col items-center relative shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setEnlargedGalleryPhoto(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer transition-colors shadow-md z-10"
              title="Close full-resolution view"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-2 w-full flex justify-center items-center overflow-auto max-h-[75vh]">
              <img
                src={enlargedGalleryPhoto.imageDataUrl}
                alt="Enlarged Proctoring Capture"
                className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-2xl border border-slate-800"
              />
            </div>

            <div className="w-full pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300 font-mono px-2">
              <div>
                Candidate: <strong className="text-white">{enlargedGalleryPhoto.studentName}</strong> • Capture #{enlargedGalleryPhoto.captureIndex} of {enlargedGalleryPhoto.totalScheduled}
              </div>
              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatSubmissionTime(enlargedGalleryPhoto.timestamp)} ({formatSubmissionDate(enlargedGalleryPhoto.timestamp)})</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Privacy Violation Alert: Unauthorized Access Attempt Modal */}
      {unauthorizedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border-2 border-rose-300 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900 font-serif">
                Access Restricted: Quiz Owner Only
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Under student examination privacy regulations, webcam surveillance photos are strictly confidential. Only <strong>{unauthorizedNotice.ownerName}</strong> (the faculty member who created <em>{unauthorizedNotice.quizTitle}</em>) or the system administrator is authorized to view student photos.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setUnauthorizedNotice(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* 6. Purge All Proctoring Photos for Quiz Modal */}
      {isPurgeQuizPhotosModalOpen && currentQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 font-serif">
                Purge All Proctoring Photos?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to permanently delete all student webcam captures recorded for <strong>{currentQuiz.title}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsPurgeQuizPhotosModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPurgingQuizPhotos}
                onClick={handleConfirmPurgeQuizPhotos}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isPurgingQuizPhotos ? 'Purging...' : 'Purge All Photos'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
