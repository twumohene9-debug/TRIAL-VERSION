import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  X,
  Sparkles,
  Layers,
  FileText,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Camera,
  Lock,
  RotateCcw,
  Search,
  BookOpen,
  Info,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  Shuffle,
  Percent,
  Sliders,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Image as ImageIcon,
  HelpCircle,
  Hash,
  FileCheck2,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Maximize2,
  Minimize2,
  Calendar,
  LayoutGrid,
  Zap,
  Play
} from 'lucide-react';
import { QuizConfig, Question, QuizSection, RosterStudent, QuestionTopic } from '../types';
import { MathRenderer } from './MathRenderer';
import {
  validateTimelineDates,
  isoToDatetimeLocal,
  datetimeLocalToIso,
  normalizeTimelinePayload
} from '../utils/timelineUtils';
import {
  parseWordQuestionPoolDocument,
  generateQuestionPoolWordTemplate,
  generateIdealAdditionalMathWordTemplate,
  ParseProgressStatus
} from '../utils/docxQuestionPoolParser';
import { parseStudentRosterFile, generateRosterTemplateExcel } from '../utils/rosterParser';
import { DEFAULT_QUIZ_INSTRUCTIONS } from '../utils/instructionsUtils';
import { SAMPLE_ADDITIONAL_MATH_QUESTIONS } from '../data/sampleAdditionalMathExam40';

interface QuestionPoolCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateQuiz: (newQuiz: QuizConfig) => void;
  onUpdateQuiz?: (updatedQuiz: QuizConfig) => void;
  quizToEdit?: QuizConfig | null;
  teacherName?: string;
}

export const QuestionPoolCreatorModal: React.FC<QuestionPoolCreatorModalProps> = ({
  isOpen,
  onClose,
  onCreateQuiz,
  onUpdateQuiz,
  quizToEdit,
  teacherName
}) => {
  if (!isOpen) return null;

  // Basic Info
  const [title, setTitle] = useState(quizToEdit?.title || '');
  const [subject, setSubject] = useState(quizToEdit?.subject || 'Mathematics');
  const [classGroup, setClassGroup] = useState(quizToEdit?.classGroup || 'SHS 2 Science A');
  const [durationMinutes, setDurationMinutes] = useState<number>(quizToEdit?.durationMinutes || 60);

  // Timeline Evaluation & Integrity Engine states (Open Access by default)
  const [startDate, setStartDate] = useState<string>(() => isoToDatetimeLocal(quizToEdit?.startDate || quizToEdit?.releaseDate));
  const [endDate, setEndDate] = useState<string>(() => isoToDatetimeLocal(quizToEdit?.endDate || quizToEdit?.submissionDeadline));
  const [timelineError, setTimelineError] = useState<string | null>(null);

  const validateTimeline = (start?: string, end?: string): boolean => {
    const s = start !== undefined ? start : startDate;
    const e = end !== undefined ? end : endDate;
    const check = validateTimelineDates(datetimeLocalToIso(s), datetimeLocalToIso(e));
    if (!check.isValid) {
      setTimelineError(check.error || 'The submission deadline must be scheduled after the start date & release time.');
      return false;
    }
    setTimelineError(null);
    return true;
  };

  const handleClearAllDates = () => {
    setStartDate('');
    setEndDate('');
    setTimelineError(null);
  };

  // Pool Configuration
  const [poolQuestionsToServe, setPoolQuestionsToServe] = useState<number>(
    quizToEdit?.poolQuestionsToServe || 50
  );
  const [poolSelectionStrategy, setPoolSelectionStrategy] = useState<'random' | 'balanced_sections'>(
    quizToEdit?.poolSelectionStrategy || 'random'
  );

  // Uploaded Master Pool State
  const [masterQuestions, setMasterQuestions] = useState<Question[]>(quizToEdit?.questions || []);
  const [sections, setSections] = useState<QuizSection[]>(quizToEdit?.sections || []);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<ParseProgressStatus | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [showWordGuide, setShowWordGuide] = useState<boolean>(false);

  const [uploadFeedback, setUploadFeedback] = useState<{
    success: boolean;
    count: number;
    mediaCount?: number;
    warnings: string[];
    errors: string[];
  } | null>(null);

  // Proctoring & Lockdown Kiosk Settings
  const [enableFullscreenLockdown, setEnableFullscreenLockdown] = useState<boolean>(
    quizToEdit?.enableFullscreenLockdown ?? true
  );
  const [enableFullscreenEnforcement, setEnableFullscreenEnforcement] = useState<boolean>(
    quizToEdit?.enableFullscreenEnforcement ?? true
  );
  const [linearExamMode, setLinearExamMode] = useState<boolean>(
    quizToEdit?.linearExamMode ?? true
  );
  const [perQuestionTimerEnabled, setPerQuestionTimerEnabled] = useState<boolean>(
    quizToEdit?.perQuestionTimerEnabled ?? true
  );
  const [autoSkipOnTabSwitch, setAutoSkipOnTabSwitch] = useState<boolean>(
    quizToEdit?.autoSkipOnTabSwitch ?? true
  );

  // Question Presentation & Pagination Mode ('one-question-per-page' vs 'single-page')
  const [questionPaginationMode, setQuestionPaginationMode] = useState<'single-page' | 'one-question-per-page'>(
    quizToEdit?.questionPaginationMode || 'one-question-per-page'
  );

  // Proctoring & Integrity Protocols
  const [progressiveTabPenalty, setProgressiveTabPenalty] = useState<boolean>(
    quizToEdit?.progressiveTabPenalty ?? true
  );
  const [tabSwitchMonitoring, setTabSwitchMonitoring] = useState<boolean>(
    quizToEdit?.tabSwitchMonitoring ?? true
  );
  const [enableCandidateWatermark, setEnableCandidateWatermark] = useState<boolean>(
    quizToEdit?.enableCandidateWatermark ?? true
  );
  const [enableAntiCopyPrint, setEnableAntiCopyPrint] = useState<boolean>(
    quizToEdit?.enableAntiCopyPrint ?? true
  );
  const [enableCameraProctoring, setEnableCameraProctoring] = useState<boolean>(
    quizToEdit?.enableCameraProctoring ?? false
  );
  const [cameraCaptureCount, setCameraCaptureCount] = useState<number>(
    quizToEdit?.cameraCaptureCount || 5
  );
  const [preventMultipleAttempts, setPreventMultipleAttempts] = useState<boolean>(
    quizToEdit?.preventMultipleAttempts ?? true
  );
  const [randomizeQuestions, setRandomizeQuestions] = useState<boolean>(
    quizToEdit?.randomizeQuestions ?? true
  );
  const [randomizeOptions, setRandomizeOptions] = useState<boolean>(
    quizToEdit?.randomizeOptions ?? true
  );
  const [showScoreImmediately, setShowScoreImmediately] = useState<boolean>(
    quizToEdit?.showScoreImmediately ?? true
  );
  const [showCorrectAnswers, setShowCorrectAnswers] = useState<boolean>(
    quizToEdit?.showCorrectAnswers ?? true
  );
  const [allowFeedback, setAllowFeedback] = useState<boolean>(
    quizToEdit?.allowFeedback ?? true
  );

  // Candidate Roster State (Optional)
  const [accessMode, setAccessMode] = useState<'open' | 'restricted'>(
    quizToEdit?.accessMode || 'open'
  );
  const [studentRoster, setStudentRoster] = useState<RosterStudent[]>(
    quizToEdit?.studentRoster || []
  );
  const [isUploadingRoster, setIsUploadingRoster] = useState<boolean>(false);

  // Modal Navigation & Preview Controls
  const [activeTab, setActiveTab] = useState<'setup' | 'preview'>('setup');
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [previewLayout, setPreviewLayout] = useState<'simulation' | 'grid'>('simulation');
  const [singleQuestionIndex, setSingleQuestionIndex] = useState<number>(0);
  const [showPaletteModal, setShowPaletteModal] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [jumpInput, setJumpInput] = useState<string>('');
  const [selectedQuestionNavIdx, setSelectedQuestionNavIdx] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const rosterInputRef = useRef<HTMLInputElement>(null);

  // Load 40 Authentic Additional Mathematics Questions as a Try Test
  const handleLoadTryTest = () => {
    setMasterQuestions(SAMPLE_ADDITIONAL_MATH_QUESTIONS);
    if (!title || title === 'Untitled Master Question Pool' || title.trim() === '') {
      setTitle('Additional Mathematics - 40 Question Examination');
    }
    setSubject('Additional Mathematics');
    setClassGroup('SHS 2 Additional Mathematics');
    setPoolQuestionsToServe(Math.min(40, SAMPLE_ADDITIONAL_MATH_QUESTIONS.length));
    setUploadFeedback({
      success: true,
      count: SAMPLE_ADDITIONAL_MATH_QUESTIONS.length,
      warnings: [],
      errors: []
    });
    setUploadedFileName('Additional_Mathematics_40Q_TryTest.docx');
    setActiveTab('preview');
    setPreviewLayout('simulation');
    setSingleQuestionIndex(0);
    setSuccessToast('40-Question Additional Mathematics Try Test loaded successfully! Press [f] to experience fullscreen mode.');
    setTimeout(() => setSuccessToast(null), 5000);
  };

  // Native Fullscreen Handlers (matches normal quiz page FormAssessmentView)
  const enterNativeFullscreen = () => {
    try {
      const docEl = document.documentElement as any;
      const options = { navigationUI: 'hide' } as any;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen(options).catch(() => {
          docEl.requestFullscreen().catch(() => {});
        });
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen(options);
      } else if (docEl.mozRequestFullScreen) {
        docEl.mozRequestFullScreen(options);
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen(options);
      }
    } catch (err) {
      console.warn('Native fullscreen request fallback:', err);
    }
    setIsFullScreen(true);
  };

  const exitNativeFullscreen = () => {
    try {
      const doc = document as any;
      if (
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      ) {
        if (doc.exitFullscreen) {
          doc.exitFullscreen().catch(() => {});
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Native fullscreen exit fallback:', err);
    }
    setIsFullScreen(false);
  };

  const handleToggleFullScreen = () => {
    const doc = document as any;
    const isCurrentlyFullscreen = Boolean(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement ||
      isFullScreen
    );

    if (!isCurrentlyFullscreen) {
      enterNativeFullscreen();
    } else {
      exitNativeFullscreen();
    }
  };

  // Synchronize fullscreen state with browser events (e.g. Esc key pressed)
  useEffect(() => {
    const handleFsChange = () => {
      const doc = document as any;
      const isNativeFs = Boolean(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setIsFullScreen(isNativeFs);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, []);

  // Reset page when search or topic changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedQuestionNavIdx(0);
  }, [searchQuery, selectedTopic, pageSize]);

  // Keyboard navigation & 'f' shortcut for preview tab
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      // Keyboard shortcut 'f' or 'F' to toggle fullscreen during preview
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleToggleFullScreen();
        return;
      }

      if (e.key === 'Escape' && isFullScreen) {
        e.preventDefault();
        exitNativeFullscreen();
        return;
      }

      if (activeTab !== 'preview' || masterQuestions.length === 0) return;

      if (previewLayout === 'simulation') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setSingleQuestionIndex((prev) => Math.max(0, prev - 1));
          return;
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setSingleQuestionIndex((prev) => Math.min(masterQuestions.length - 1, prev + 1));
          return;
        }
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedQuestionNavIdx((prev) => {
          const next = Math.max(0, prev - 1);
          const el = document.getElementById(`pool-preview-q-${next}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          return next;
        });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedQuestionNavIdx((prev) => {
          const next = prev + 1;
          const el = document.getElementById(`pool-preview-q-${next}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, masterQuestions.length, isFullScreen, previewLayout]);

  // Extract distinct topics from questions
  const availableTopics = useMemo(() => {
    const set = new Set<string>();
    masterQuestions.forEach((q) => {
      if (q.topic) set.add(q.topic);
      else if (q.sectionName) set.add(q.sectionName);
    });
    return Array.from(set);
  }, [masterQuestions]);

  // Handle Question Bank File Upload (MS Word: .docx, .doc)
  const processWordFile = async (file: File) => {
    const fileName = file.name.toLowerCase();
    const isSupported = fileName.endsWith('.docx') || fileName.endsWith('.doc');

    if (!isSupported) {
      setUploadFeedback({
        success: false,
        count: 0,
        warnings: [],
        errors: [
          `File "${file.name}" is not supported. The Question Pool supports Microsoft Word (.docx, .doc) documents for high-fidelity equation, diagram, and formatting extraction.`
        ]
      });
      return;
    }

    setIsUploading(true);
    setUploadFeedback(null);
    setUploadedFileName(file.name);
    setUploadProgress({
      stage: 'reading',
      message: 'Reading Microsoft Word document archive...',
      percent: 10
    });

    try {
      const result = await parseWordQuestionPoolDocument(file, (progress) => {
        setUploadProgress(progress);
      });

      if (result.success && result.questions.length > 0) {
        setMasterQuestions(result.questions);
        setSections(result.sections);

        // Adjust candidate quota if needed
        if (poolQuestionsToServe > result.questions.length || poolQuestionsToServe <= 0) {
          setPoolQuestionsToServe(Math.min(50, result.questions.length));
        }

        setUploadFeedback({
          success: true,
          count: result.questions.length,
          mediaCount: result.mediaCount,
          warnings: result.warnings,
          errors: []
        });
      } else {
        setUploadFeedback({
          success: false,
          count: 0,
          warnings: result.warnings,
          errors: result.errors.length > 0 ? result.errors : ['Could not extract valid questions from the Word document.']
        });
      }
    } catch (err: any) {
      console.error('Question Bank upload error:', err);
      setUploadFeedback({
        success: false,
        count: 0,
        warnings: [],
        errors: [`Upload failed: ${err.message || 'Unknown error'}`]
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processWordFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processWordFile(file);
  };

  // Handle Roster File Upload
  const handleRosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingRoster(true);
    try {
      const result = await parseStudentRosterFile(file);
      if (result.success && result.students.length > 0) {
        setStudentRoster(result.students);
        setAccessMode('restricted');
      } else {
        alert(`Failed to parse roster: ${result.errors.join(', ')}`);
      }
    } catch (err: any) {
      alert(`Roster upload failed: ${err.message}`);
    } finally {
      setIsUploadingRoster(false);
      if (rosterInputRef.current) rosterInputRef.current.value = '';
    }
  };

  // Save / Submit Quiz
  const handleSave = () => {
    if (!title.trim()) {
      alert('Please enter an assessment title.');
      return;
    }

    if (masterQuestions.length === 0) {
      alert('Please upload a Microsoft Word document containing questions into the Question Bank before publishing.');
      return;
    }

    if (!validateTimeline()) {
      alert(timelineError || 'The submission deadline must be scheduled after the start date and release time.');
      return;
    }

    const cleanStart = datetimeLocalToIso(startDate);
    const cleanEnd = datetimeLocalToIso(endDate);

    const quota = Math.max(1, Math.min(poolQuestionsToServe, masterQuestions.length));
    const cleanTitle = title.trim();
    const subjectPrefix = subject.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'MATH';
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const generatedCode = quizToEdit?.code || `POOL-${subjectPrefix}-${randomSuffix}`;

    const poolQuiz: QuizConfig = {
      id: quizToEdit?.id || `quiz-pool-${Date.now()}`,
      code: generatedCode,
      title: cleanTitle,
      subject: subject.trim() || 'Mathematics',
      classGroup: classGroup.trim() || 'SHS 2',
      schoolName: quizToEdit?.schoolName || 'Senior High School',
      teacherName: teacherName || quizToEdit?.teacherName || 'Faculty Member',
      durationMinutes: durationMinutes > 0 ? durationMinutes : 60,
      startDate: cleanStart,
      releaseDate: cleanStart,
      endDate: cleanEnd,
      submissionDeadline: cleanEnd,
      totalQuestions: quota, // The number of questions each student sees
      totalMarks: quota,
      attemptsAllowed: preventMultipleAttempts ? 1 : 2,
      preventMultipleAttempts,
      enforceSingleAttempt: preventMultipleAttempts,
      progressiveTabPenalty,
      enableTabSwitchPenalties: progressiveTabPenalty,
      tabSwitchMonitoring,
      enableTabMonitoring: tabSwitchMonitoring,
      enableCandidateWatermark,
      enableAntiCopyPrint,
      enableCameraProctoring,
      cameraCaptureCount: enableCameraProctoring ? cameraCaptureCount : undefined,
      enableFullscreenLockdown,
      enableFullscreenEnforcement: enableFullscreenEnforcement || enableFullscreenLockdown,
      linearExamMode: linearExamMode || enableFullscreenLockdown,
      perQuestionTimerEnabled: perQuestionTimerEnabled || enableFullscreenLockdown,
      autoSkipOnTabSwitch: autoSkipOnTabSwitch || enableFullscreenLockdown,
      questionPaginationMode,
      randomizeQuestions,
      shuffleQuestions: randomizeQuestions,
      randomizeOptions,
      shuffleOptions: randomizeOptions,
      showScoreImmediately,
      showCorrectAnswers,
      allowFeedback,
      enableAIFeedback: allowFeedback,
      isQuestionPool: true,
      poolQuestionsToServe: quota,
      poolSelectionStrategy,
      poolOriginalSize: masterQuestions.length,
      questions: masterQuestions,
      sections: sections.length > 0 ? sections : undefined,
      accessMode,
      studentRoster: accessMode === 'restricted' ? studentRoster : undefined,
      status: quizToEdit?.status || 'active',
      instructions: typeof quizToEdit?.instructions === 'string'
        ? quizToEdit.instructions
        : (Array.isArray(DEFAULT_QUIZ_INSTRUCTIONS) ? DEFAULT_QUIZ_INSTRUCTIONS.join('\n') : String(DEFAULT_QUIZ_INSTRUCTIONS || '')),
      instructionBullets: Array.isArray(quizToEdit?.instructionBullets)
        ? quizToEdit.instructionBullets
        : (Array.isArray(DEFAULT_QUIZ_INSTRUCTIONS) ? DEFAULT_QUIZ_INSTRUCTIONS : []),
      createdAt: quizToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (quizToEdit && onUpdateQuiz) {
      onUpdateQuiz(poolQuiz);
    } else {
      onCreateQuiz(poolQuiz);
    }

    onClose();
  };

  // Remove a question from the master bank
  const handleDeleteQuestion = (questionId: number | string) => {
    const updated = masterQuestions
      .filter((q) => q.id !== questionId)
      .map((q, idx) => ({ ...q, id: idx + 1 }));
    setMasterQuestions(updated);
    if (poolQuestionsToServe > updated.length) {
      setPoolQuestionsToServe(Math.max(1, updated.length));
    }
  };

  // Filter questions for the preview tab
  const filteredQuestions = useMemo(() => {
    return masterQuestions.filter((q) => {
      // Topic filter
      if (selectedTopic !== 'all') {
        const topicMatch = q.topic === selectedTopic || q.sectionName === selectedTopic;
        if (!topicMatch) return false;
      }

      // Search filter
      if (!searchQuery.trim()) return true;
      const cleanQ = searchQuery.toLowerCase().trim();

      // Match question ID directly (e.g. "45" or "#45")
      const idStr = String(q.id);
      if (cleanQ === idStr || cleanQ === `#${idStr}`) return true;

      const stemMatch = (q.questionText || '').toLowerCase().includes(cleanQ);
      const topicTextMatch = (q.topic || '').toLowerCase().includes(cleanQ);
      const optMatch = q.options?.some((opt) => (opt.text || '').toLowerCase().includes(cleanQ));
      const expMatch = (q.explanation || '').toLowerCase().includes(cleanQ);

      return stemMatch || topicTextMatch || optMatch || expMatch;
    });
  }, [masterQuestions, selectedTopic, searchQuery]);

  // Pagination calculation
  const totalFiltered = filteredQuestions.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedQuestions = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredQuestions.slice(start, start + pageSize);
  }, [filteredQuestions, safeCurrentPage, pageSize]);

  // Jump to question handler
  const handleJumpToQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    const targetQNum = parseInt(jumpInput.replace(/[^0-9]/g, ''), 10);
    if (isNaN(targetQNum) || targetQNum <= 0) return;

    // Find position in filtered list
    const foundIdx = filteredQuestions.findIndex((q) => q.id === targetQNum);
    if (foundIdx !== -1) {
      const page = Math.floor(foundIdx / pageSize) + 1;
      setCurrentPage(page);
      setJumpInput('');
    } else {
      alert(`Question #${targetQNum} not found in the current filter or bank.`);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs ${
        isFullScreen ? 'p-0' : 'p-3 sm:p-4'
      } overflow-y-auto animate-fade-in`}
    >
      <div
        className={`bg-white border border-slate-200 shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullScreen
            ? 'w-screen h-screen max-w-none max-h-none rounded-none'
            : 'w-full max-w-5xl max-h-[92vh] rounded-3xl'
        }`}
      >
        {/* Header - Hidden in fullscreen mode so questions alone occupy the screen */}
        {!isFullScreen && (
          <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white p-5 sm:p-6 shrink-0 relative">
            <div className="absolute top-5 right-5 flex items-center gap-2">
              <button
                type="button"
                id="btn-pool-toggle-fullscreen"
                onClick={handleToggleFullScreen}
                className="text-slate-300 hover:text-white px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold border border-white/20 shadow-xs"
                title={isFullScreen ? 'Exit Full Screen View (Press f or Esc)' : 'Expand to Full Screen View (Press f)'}
              >
                {isFullScreen ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-amber-300" />
                    <span className="hidden sm:inline">Exit Full Screen</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
                    <span className="hidden sm:inline">Full Screen</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
                <Shuffle className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold font-serif text-white">
                    {quizToEdit ? 'Edit Question Pool Exam' : 'Randomized Question Pool Setup'}
                  </h2>
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                    500+ Question Banking
                  </span>
                  <span className="bg-blue-500/20 text-blue-200 border border-blue-400/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    MS Word Only (.docx)
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                  Upload your large question repository (500 to 1,000+ items) in Microsoft Word (.docx). Each candidate receives a unique, randomized draw with full mathematical equation and diagram rendering.
                </p>
              </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-purple-900/60">
              <button
                type="button"
                onClick={() => setActiveTab('setup')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'setup'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Pool Setup & Word Upload</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'preview'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview Master Bank ({masterQuestions.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className={`overflow-y-auto flex-1 ${isFullScreen ? 'p-3 sm:p-4 flex flex-col' : 'p-5 sm:p-6 space-y-6'}`}>
          {/* Success Toast Banner */}
          {successToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessToast(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 cursor-pointer p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {activeTab === 'setup' ? (
            <>
              {/* Section 1: Basic Details */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                  1. Assessment Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Assessment Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Core Mathematics Master Bank 2026"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-600 bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Mathematics"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-600 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Class / Cohort
                    </label>
                    <input
                      type="text"
                      value={classGroup}
                      onChange={(e) => setClassGroup(e.target.value)}
                      placeholder="e.g. SHS 2 Science"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-600 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Upload 500+ Question Bank (Only MS Word formats) */}
              <div className="bg-purple-50/40 border-2 border-dashed border-purple-200 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-700" />
                      2. Master Question Bank (Upload 500 to 1,000+ Questions in MS Word)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Strictly supports Microsoft Word documents (<strong className="text-purple-900">.docx, .doc</strong>) with high-fidelity OMATH equation, formula, and diagram extraction.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setShowWordGuide(!showWordGuide)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                      <span>{showWordGuide ? 'Hide Format Guide' : 'Word Format Guide'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => generateIdealAdditionalMathWordTemplate()}
                      className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      title="Download the authentic Additional Mathematics 40-question template in ideal Word format"
                    >
                      <Download className="w-4 h-4 text-emerald-200" />
                      <span>Download Ideal Word Template (.docx)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => generateQuestionPoolWordTemplate(title || 'Question_Bank_500_Template')}
                      className="px-3.5 py-2 bg-purple-900 hover:bg-purple-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      title="Download blank clean Microsoft Word template formatted for 500+ questions"
                    >
                      <Download className="w-4 h-4 text-amber-400" />
                      <span>500+ Blank Template</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleLoadTryTest}
                      className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-98"
                      title="Instantly load the 40 Additional Mathematics sample questions to try and test extraction / fullscreen simulation"
                    >
                      <Zap className="w-4 h-4 text-slate-950 fill-current" />
                      <span>Load 40-Q Try Test</span>
                    </button>
                  </div>
                </div>

                {/* Collapsible Word Formatting Guide */}
                {showWordGuide && (
                  <div className="p-4 bg-white border border-purple-200 rounded-2xl text-xs space-y-2 text-slate-700 shadow-xs animate-fade-in">
                    <p className="font-bold text-purple-950 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      How to Structure 500 to 1,000+ Questions in Microsoft Word:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                        <strong className="text-slate-900 block">Question & Option Format:</strong>
                        <p className="text-[11px] text-slate-600 font-mono">
                          1. Solve $x^2 - 5x + 6 = 0$ for x.<br />
                          A. x = 1 or x = 6<br />
                          B. x = 2 or x = 3<br />
                          C. x = -2 or x = -3<br />
                          D. x = 0 or x = 5<br />
                          Answer: B<br />
                          Explanation: Factoring gives (x - 2)(x - 3) = 0.
                        </p>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                        <strong className="text-slate-900 block">Supported Capabilities:</strong>
                        <ul className="list-disc pl-4 text-[11px] text-slate-600 space-y-0.5">
                          <li>Word Equation Editor (Alt+= / OMATH) and LaTeX ($...$)</li>
                          <li>Embedded figures and diagrams attached to question numbers</li>
                          <li>Section markers: <code className="bg-purple-100 text-purple-900 px-1 rounded">SECTION A: ALGEBRA</code></li>
                          <li>Answers specified per question or as an answer key at the bottom</li>
                          <li>Scaled architecture supporting over 1,000 questions without lag</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload Action Area / Dropzone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center space-y-3 transition-all ${
                    isDragOver
                      ? 'border-purple-600 bg-purple-100/50 scale-[1.01]'
                      : 'border-purple-200 bg-white hover:border-purple-400'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,.doc"
                    onChange={handleFileInputChange}
                    className="hidden"
                    id="pool-word-upload"
                  />

                  <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
                    {isUploading ? (
                      <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
                    ) : (
                      <UploadCloud className="w-6 h-6 text-purple-700" />
                    )}
                  </div>

                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900">
                      Drag & drop your Microsoft Word document (.docx, .doc) here
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Dedicated Microsoft Word extractor (.docx, .doc). Extracts equations, options A–D, answer keys, explanations, and diagrams.
                    </p>
                  </div>

                  {/* Progress Indicator for large files */}
                  {isUploading && uploadProgress && (
                    <div className="max-w-md mx-auto space-y-2 pt-2 animate-fade-in">
                      <div className="flex items-center justify-between text-xs text-purple-950 font-bold">
                        <span className="flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-600" />
                          {uploadProgress.message}
                        </span>
                        <span>{uploadProgress.percent}%</span>
                      </div>
                      <div className="w-full h-2 bg-purple-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-300"
                          style={{ width: `${uploadProgress.percent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {!isUploading && (
                    <div className="pt-2 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-5 py-2.5 bg-purple-950 hover:bg-purple-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 shadow-xs"
                      >
                        <FileText className="w-4 h-4 text-amber-400" />
                        <span>Select Word Document (.docx, .doc)</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Feedback Banner */}
                {uploadFeedback && (
                  <div
                    className={`p-4 rounded-2xl border text-xs animate-fade-in ${
                      uploadFeedback.success
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                        : 'bg-rose-50 border-rose-300 text-rose-950'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold">
                      {uploadFeedback.success ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            ✓ Successfully imported {uploadFeedback.count} questions from "{uploadedFileName}" into the Master Bank!
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Upload Encountered Errors</span>
                        </>
                      )}
                    </div>

                    {uploadFeedback.success && uploadFeedback.mediaCount !== undefined && uploadFeedback.mediaCount > 0 && (
                      <p className="text-[11px] text-emerald-800 mt-1 pl-6">
                        🖼️ Extracted and mapped <strong>{uploadFeedback.mediaCount} embedded diagrams / figures</strong> from the document.
                      </p>
                    )}

                    {uploadFeedback.errors.length > 0 && (
                      <ul className="list-disc pl-5 mt-2 space-y-0.5 text-rose-700">
                        {uploadFeedback.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    )}

                    {uploadFeedback.warnings.length > 0 && (
                      <ul className="list-disc pl-5 mt-1 space-y-0.5 text-amber-700">
                        {uploadFeedback.warnings.slice(0, 3).map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Bank Stats pill if questions loaded */}
                {masterQuestions.length > 0 && (
                  <div className="bg-emerald-50/70 border border-emerald-300 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-950">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-600 text-white rounded-xl">
                        <Check className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-sm font-bold text-emerald-950">
                          {masterQuestions.length} Questions Loaded
                        </strong>
                        <p className="text-[11px] text-emerald-800">
                          {sections.length > 0
                            ? `${sections.length} topics detected (${sections.map((s) => s.title).join(', ')})`
                            : 'Standard topic distribution'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('preview')}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all text-xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review Bank Questions ({masterQuestions.length})</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Section 3: Random Draw & Quota Configuration */}
              <div className="bg-amber-50/50 border border-amber-300/80 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                  <Shuffle className="w-4 h-4 text-amber-700" />
                  3. Randomized Question Quota & Strategy
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Quota Input */}
                  <div className="bg-white border border-amber-200 rounded-2xl p-4 space-y-2 shadow-2xs">
                    <label className="block text-xs font-bold text-slate-800">
                      Questions Served to Each Candidate *
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        max={masterQuestions.length || 1000}
                        value={poolQuestionsToServe}
                        onChange={(e) => setPoolQuestionsToServe(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-28 px-3.5 py-2.5 text-base font-black text-center rounded-xl border border-amber-300 focus:ring-2 focus:ring-amber-500 bg-amber-50/40 text-amber-950"
                      />
                      <span className="text-xs text-slate-600">
                        out of <strong className="text-slate-900">{masterQuestions.length || 500}</strong> in the master repository
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                      Each student will be deterministically allocated exactly {poolQuestionsToServe} questions. Total marks and grade percentages automatically scale to this quota.
                    </p>
                  </div>

                  {/* Draw Strategy */}
                  <div className="bg-white border border-amber-200 rounded-2xl p-4 space-y-2 shadow-2xs">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Selection Strategy
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all hover:bg-slate-50">
                        <input
                          type="radio"
                          name="poolSelectionStrategy"
                          value="random"
                          checked={poolSelectionStrategy === 'random'}
                          onChange={() => setPoolSelectionStrategy('random')}
                          className="mt-0.5 text-amber-600 focus:ring-amber-500"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">Pure Random Draw</span>
                          <span className="text-[11px] text-slate-500 block">
                            Randomly selects {poolQuestionsToServe} items from the entire pool with equal probability.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all hover:bg-slate-50">
                        <input
                          type="radio"
                          name="poolSelectionStrategy"
                          value="balanced_sections"
                          checked={poolSelectionStrategy === 'balanced_sections'}
                          onChange={() => setPoolSelectionStrategy('balanced_sections')}
                          className="mt-0.5 text-amber-600 focus:ring-amber-500"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">Topic / Section Balanced Draw</span>
                          <span className="text-[11px] text-slate-500 block">
                            Pulls an equal or proportional share of questions from each detected topic (e.g. Algebra, Geometry, Calculus).
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Exam Delivery, Presentation & Proctoring Protocols */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-700" />
                    4. Exam Delivery, Presentation & Security Protocols
                  </h3>
                  <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">
                    Proctoring & layout parity with standard exams
                  </span>
                </div>

                {/* Duration & Single Attempt Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Duration */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Total Exam Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="300"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Math.max(5, parseInt(e.target.value) || 60))}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-600 bg-white"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Candidates have {durationMinutes} mins total for their {poolQuestionsToServe} questions.
                    </span>
                  </div>

                  {/* Single Attempt */}
                  <div
                    onClick={() => setPreventMultipleAttempts(!preventMultipleAttempts)}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all shadow-2xs ${
                      preventMultipleAttempts ? 'bg-white border-purple-300 ring-1 ring-purple-200' : 'bg-white border-slate-200 opacity-75'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Single Attempt Only</span>
                      <span className="text-[10.5px] text-slate-500">Locks candidate ID & browser after 1 submission</span>
                    </div>
                    <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${preventMultipleAttempts ? 'bg-purple-700 text-white' : 'border-2 border-slate-300'}`}>
                      {preventMultipleAttempts && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  {/* Watermark & Anti-Copy */}
                  <div
                    onClick={() => {
                      const nextVal = !(enableCandidateWatermark && enableAntiCopyPrint);
                      setEnableCandidateWatermark(nextVal);
                      setEnableAntiCopyPrint(nextVal);
                    }}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all shadow-2xs ${
                      enableCandidateWatermark && enableAntiCopyPrint ? 'bg-white border-purple-300 ring-1 ring-purple-200' : 'bg-white border-slate-200 opacity-75'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Candidate Watermark & Shield</span>
                      <span className="text-[10.5px] text-slate-500">Blocks copy/print/Ctrl+P & stamps student ID</span>
                    </div>
                    <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${enableCandidateWatermark && enableAntiCopyPrint ? 'bg-purple-700 text-white' : 'border-2 border-slate-300'}`}>
                      {enableCandidateWatermark && enableAntiCopyPrint && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                </div>

                {/* Timeline Evaluation & Integrity Engine Section for Pool Exam */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-300 flex items-center justify-center text-purple-700 shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex flex-wrap items-center gap-2">
                          <span>Exam Schedule & Timeline</span>
                          {!startDate && !endDate && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 normal-case">
                              Open Access by Default
                            </span>
                          )}
                          {(startDate || endDate) && !timelineError && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 normal-case">
                              Scheduled Window Active
                            </span>
                          )}
                          {timelineError && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 normal-case">
                              Validation Error
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Set opening release time and closing deadline for this pooled examination. Leave blank for unrestricted open access.
                        </p>
                      </div>
                    </div>

                    {/* One-click Clear All Dates (Open Access) */}
                    {(startDate || endDate) && (
                      <button
                        type="button"
                        onClick={handleClearAllDates}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-purple-300 bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-900 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-center shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                        <span>Clear All Dates (Open Access)</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Start Date & Release Time */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Start Date & Release Time <span className="text-[11px] font-normal text-slate-400">(Optional)</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          validateTimeline(e.target.value, endDate);
                        }}
                        className="w-full px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-600 text-slate-900 bg-white"
                      />
                      <p className="text-[10.5px] text-slate-500 mt-1">
                        When candidate registration unlocks. Prior to this timestamp, student access is blocked with a countdown.
                      </p>
                    </div>

                    {/* End Date & Submission Deadline */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        End Date / Submission Deadline <span className="text-[11px] font-normal text-slate-400">(Optional)</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          validateTimeline(startDate, e.target.value);
                        }}
                        className={`w-full px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl border focus:ring-2 text-slate-900 bg-white ${
                          timelineError
                            ? 'border-rose-400 focus:ring-rose-500'
                            : 'border-slate-300 focus:ring-purple-600'
                        }`}
                      />
                      <p className="text-[10.5px] text-slate-500 mt-1">
                        Final cutoff timestamp. When reached, student entry closes and active exams auto-submit immediately.
                      </p>
                    </div>
                  </div>

                  {/* Validation Error Alert */}
                  {timelineError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="font-semibold">{timelineError}</span>
                    </div>
                  )}

                  {/* Timeline Status Preview */}
                  {!startDate && !endDate && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2">
                      <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Open Access by Default:</strong> No schedule restrictions configured. Students can start the exam anytime and will have their complete <strong>{durationMinutes} minutes</strong> timer without early cutoff.
                      </span>
                    </div>
                  )}

                  {(startDate || endDate) && !timelineError && (
                    <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start gap-2">
                      <Clock className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-bold">
                          Timer Synchronization Active
                        </p>
                        <p className="text-[11px] text-purple-800">
                          Students will receive up to <strong>{durationMinutes} minutes</strong>, dynamically constrained by the hard submission deadline if that deadline expires first.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Institutional Lockdown Kiosk Mode (Master Suite & Sub-Features) */}
                <div className={`border-2 rounded-2xl p-5 transition-all space-y-4 ${
                  enableFullscreenLockdown || linearExamMode || perQuestionTimerEnabled || autoSkipOnTabSwitch
                    ? 'bg-purple-50/70 border-purple-400 shadow-sm ring-2 ring-purple-200/50'
                    : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-md bg-purple-200 text-purple-900">
                          <ShieldAlert className="w-4 h-4" />
                        </span>
                        <h4 className="text-sm font-black text-slate-900 tracking-tight">
                          Institutional Lockdown Kiosk Mode
                        </h4>
                        {(enableFullscreenLockdown || (linearExamMode && perQuestionTimerEnabled && autoSkipOnTabSwitch)) && (
                          <span className="bg-purple-700 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider animate-pulse">
                            Full Lockdown Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        Approximates institutional lockdown browser enforcement (Respondus-style): forces fullscreen, freezes unauthorized keyboard keys, enforces strict linear progression, and automatically skips questions if the candidate navigates away.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = !enableFullscreenLockdown;
                        setEnableFullscreenLockdown(nextVal);
                        if (nextVal) {
                          setEnableFullscreenEnforcement(true);
                          setLinearExamMode(true);
                          setPerQuestionTimerEnabled(true);
                          setAutoSkipOnTabSwitch(true);
                          setQuestionPaginationMode('one-question-per-page');
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer shadow-xs ${
                        enableFullscreenLockdown
                          ? 'bg-purple-700 text-white hover:bg-purple-800'
                          : 'bg-slate-100 text-slate-700 hover:bg-purple-100 hover:text-purple-900 border border-slate-300'
                      }`}
                    >
                      {enableFullscreenLockdown ? 'Lockdown Active' : 'Enable All 3'}
                    </button>
                  </div>

                  {/* The 3 Specific Lockdown Sub-Features */}
                  <div className="pt-2 border-t border-purple-200/70 space-y-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900 block">
                      Individual Lockdown Policies:
                    </span>

                    {/* 1. Linear Exam Mode (No Going Back) */}
                    <div
                      onClick={() => {
                        const nextVal = !linearExamMode;
                        setLinearExamMode(nextVal);
                        if (nextVal) setQuestionPaginationMode('one-question-per-page');
                      }}
                      className={`p-3 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition-all ${
                        linearExamMode
                          ? 'bg-white border-purple-500 shadow-2xs ring-1 ring-purple-400'
                          : 'bg-white/60 border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                          <span className="text-xs font-bold text-slate-900">
                            1. Linear Exam Mode (No Going Back)
                          </span>
                          {linearExamMode && (
                            <span className="text-[9px] font-extrabold bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded">
                              Strictly Linear
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-tight">
                          Students must answer sequentially. Once they proceed to the next question, the previous button is disabled and they cannot go back.
                        </p>
                      </div>
                      <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 ${linearExamMode ? 'bg-purple-700 text-white' : 'border-2 border-slate-300'}`}>
                        {linearExamMode && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    {/* 2. Per-Question Timer with Audible Warning */}
                    <div
                      onClick={() => setPerQuestionTimerEnabled(!perQuestionTimerEnabled)}
                      className={`p-3 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition-all ${
                        perQuestionTimerEnabled
                          ? 'bg-white border-purple-500 shadow-2xs ring-1 ring-purple-400'
                          : 'bg-white/60 border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                          <span className="text-xs font-bold text-slate-900">
                            2. Per-Question Timer with Audible Warning
                          </span>
                          {perQuestionTimerEnabled && (
                            <span className="text-[9px] font-extrabold bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded">
                              Audio Alert &lt;10s
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-tight">
                          Allocates time per question (Total Time / Number of Questions). Plays audible countdown beeps under 10 seconds and automatically auto-advances.
                        </p>
                      </div>
                      <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 ${perQuestionTimerEnabled ? 'bg-purple-700 text-white' : 'border-2 border-slate-300'}`}>
                        {perQuestionTimerEnabled && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    {/* 3. Auto-Skip on Tab Switch / Leaving Page */}
                    <div
                      onClick={() => setAutoSkipOnTabSwitch(!autoSkipOnTabSwitch)}
                      className={`p-3 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition-all ${
                        autoSkipOnTabSwitch
                          ? 'bg-white border-purple-500 shadow-2xs ring-1 ring-purple-400'
                          : 'bg-white/60 border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span className="text-xs font-bold text-slate-900">
                            3. Auto-Skip on Tab Switch / Leaving Page
                          </span>
                          {autoSkipOnTabSwitch && (
                            <span className="text-[9px] font-extrabold bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded">
                              Instant Blank Forfeit
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-tight">
                          If a student switches tabs, minimizes the browser, or unfocuses the exam, the current question is instantly forfeited as blank and advances forward.
                        </p>
                      </div>
                      <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 ${autoSkipOnTabSwitch ? 'bg-rose-600 text-white' : 'border-2 border-slate-300'}`}>
                        {autoSkipOnTabSwitch && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Question Presentation & Pagination Mode */}
                <div className="border border-slate-300 bg-white rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">
                          Question Presentation & Layout
                        </h4>
                        <p className="text-xs text-slate-500">
                          Choose how drawn questions appear to candidates during the examination
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Option 1: One question per page */}
                    <div
                      onClick={() => setQuestionPaginationMode('one-question-per-page')}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-2.5 ${
                        questionPaginationMode === 'one-question-per-page'
                          ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-500/20'
                          : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            One Question Per Page
                          </span>
                          <span className="text-[11px] text-slate-600 leading-tight block mt-1">
                            Displays 1 question at a time with <strong>Previous</strong> and <strong>Next</strong> navigation buttons beneath (or linear progression in lockdown).
                          </span>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          questionPaginationMode === 'one-question-per-page'
                            ? 'border-indigo-600 bg-indigo-600'
                            : 'border-slate-400 bg-white'
                        }`}>
                          {questionPaginationMode === 'one-question-per-page' && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md w-fit">
                        Focused Mode (Recommended for Pools)
                      </span>
                    </div>

                    {/* Option 2: All questions on one page */}
                    <div
                      onClick={() => setQuestionPaginationMode('single-page')}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-2.5 ${
                        questionPaginationMode === 'single-page'
                          ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-500/20'
                          : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            All Questions on One Page
                          </span>
                          <span className="text-[11px] text-slate-600 leading-tight block mt-1">
                            Continuous full examination paper format where candidates can scroll through all {poolQuestionsToServe} questions.
                          </span>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          questionPaginationMode === 'single-page'
                            ? 'border-indigo-600 bg-indigo-600'
                            : 'border-slate-400 bg-white'
                        }`}>
                          {questionPaginationMode === 'single-page' && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded-md w-fit">
                        Full Paper Scroll
                      </span>
                    </div>
                  </div>
                </div>

                {/* Proctoring & Integrity Protocols */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                    Anti-Cheat Protocols & Result Options
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 3-Strike Tab Penalty System */}
                    <div
                      onClick={() => setProgressiveTabPenalty(!progressiveTabPenalty)}
                      className={`p-3 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition-all ${
                        progressiveTabPenalty
                          ? 'bg-rose-50/70 border-rose-400 ring-1 ring-rose-200'
                          : 'bg-white border-slate-200 opacity-75'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span className="text-xs font-bold text-slate-900">
                            3-Strike Tab Penalty System
                          </span>
                          {progressiveTabPenalty && (
                            <span className="text-[9px] font-extrabold bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-tight">
                          1st tab switch: -2m penalty. 2nd switch: -5m penalty. 3rd switch: Instant auto-submit.
                        </p>
                      </div>
                      <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 ${progressiveTabPenalty ? 'bg-rose-600 text-white' : 'border-2 border-slate-300'}`}>
                        {progressiveTabPenalty && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    {/* Tab Switch Monitoring */}
                    <div
                      onClick={() => setTabSwitchMonitoring(!tabSwitchMonitoring)}
                      className={`p-3 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition-all ${
                        tabSwitchMonitoring
                          ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-200'
                          : 'bg-white border-slate-200 opacity-75'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-900 block">
                          Tab Switch Live Monitoring
                        </span>
                        <p className="text-[11px] text-slate-500 leading-tight">
                          Logs every tab change, blur event, and screen unfocus in teacher live surveillance.
                        </p>
                      </div>
                      <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 ${tabSwitchMonitoring ? 'bg-indigo-600 text-white' : 'border-2 border-slate-300'}`}>
                        {tabSwitchMonitoring && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    {/* Random Camera Proctoring (Webcam Surveillance) */}
                    <div className={`p-3.5 rounded-xl border-2 transition-all space-y-3 col-span-1 md:col-span-2 ${
                      enableCameraProctoring
                        ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-200/50'
                        : 'bg-white border-slate-200 opacity-90'
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Camera className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="text-xs font-bold text-slate-900">
                              Random Camera Proctoring (Webcam Surveillance)
                            </span>
                            {enableCameraProctoring && (
                              <span className="text-[9px] font-black uppercase bg-emerald-600 text-white px-1.5 py-0.5 rounded-full">
                                {cameraCaptureCount} Captures Active
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 leading-tight">
                            Requires candidate camera permission. Automatically snaps unpredictable random photos during the exam. Images are compressed, private to the quiz author, and auto-deleted after 7 days.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEnableCameraProctoring(!enableCameraProctoring)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all shrink-0 ${
                            enableCameraProctoring
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                          }`}
                        >
                          {enableCameraProctoring ? 'Enabled' : 'Enable'}
                        </button>
                      </div>

                      {enableCameraProctoring && (
                        <div className="pt-2 border-t border-emerald-200 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-slate-700">Random Captures:</span>
                          {[5, 10, 15].map((preset) => (
                            <button
                              key={`pool-preset-${preset}`}
                              type="button"
                              onClick={() => setCameraCaptureCount(preset)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                                cameraCaptureCount === preset
                                  ? 'bg-emerald-700 text-white ring-1 ring-emerald-400'
                                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              {preset} Photos
                            </button>
                          ))}
                          <div className="flex items-center gap-1 ml-1">
                            <span className="text-xs text-slate-500">Custom:</span>
                            <input
                              type="number"
                              min="1"
                              max="30"
                              value={cameraCaptureCount}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val) && val >= 1 && val <= 50) {
                                  setCameraCaptureCount(val);
                                }
                              }}
                              className="w-14 px-2 py-0.5 bg-white border border-slate-300 rounded text-xs font-bold text-center text-slate-800"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Randomize Option Order */}
                    <div
                      onClick={() => setRandomizeOptions(!randomizeOptions)}
                      className={`p-3 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition-all ${
                        randomizeOptions
                          ? 'bg-slate-50/70 border-slate-300 ring-1 ring-slate-200'
                          : 'bg-white border-slate-200 opacity-75'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Shuffle className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                          <span className="text-xs font-bold text-slate-900">
                            Randomize Option Order (A, B, C, D)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-tight">
                          Permutes alternative choice letters per candidate while preserving the answer key.
                        </p>
                      </div>
                      <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 ${randomizeOptions ? 'bg-purple-700 text-white' : 'border-2 border-slate-300'}`}>
                        {randomizeOptions && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    {/* Randomize Question Order */}
                    <div
                      onClick={() => setRandomizeQuestions(!randomizeQuestions)}
                      className={`p-3 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition-all ${
                        randomizeQuestions
                          ? 'bg-slate-50/70 border-slate-300 ring-1 ring-slate-200'
                          : 'bg-white border-slate-200 opacity-75'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-900 block">
                          Randomize Question Order
                        </span>
                        <p className="text-[11px] text-slate-500 leading-tight">
                          Presents the drawn question quota in a unique random sequence for each candidate.
                        </p>
                      </div>
                      <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 ${randomizeQuestions ? 'bg-purple-700 text-white' : 'border-2 border-slate-300'}`}>
                        {randomizeQuestions && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    {/* Show Score Immediately */}
                    <div
                      onClick={() => setShowScoreImmediately(!showScoreImmediately)}
                      className={`p-3 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition-all ${
                        showScoreImmediately
                          ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-200'
                          : 'bg-white border-slate-200 opacity-75'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-900 block">
                          Show Score Immediately
                        </span>
                        <p className="text-[11px] text-slate-500 leading-tight">
                          Candidate sees total score and percentage upon finishing the assessment.
                        </p>
                      </div>
                      <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 ${showScoreImmediately ? 'bg-emerald-600 text-white' : 'border-2 border-slate-300'}`}>
                        {showScoreImmediately && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    {/* Show Correct Answers */}
                    <div
                      onClick={() => setShowCorrectAnswers(!showCorrectAnswers)}
                      className={`p-3 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition-all ${
                        showCorrectAnswers
                          ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-200'
                          : 'bg-white border-slate-200 opacity-75'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-900 block">
                          Show Correct Answers in Review
                        </span>
                        <p className="text-[11px] text-slate-500 leading-tight">
                          Displays the full answer key and explanations on the candidate completion screen.
                        </p>
                      </div>
                      <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 ${showCorrectAnswers ? 'bg-emerald-600 text-white' : 'border-2 border-slate-300'}`}>
                        {showCorrectAnswers && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: Candidate Access Roster (Optional) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-purple-700" />
                      5. Candidate Access Security
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Choose whether any student with the code can take the test, or restrict to an authorized roster.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAccessMode('open')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        accessMode === 'open'
                          ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Open Access (Any Student)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccessMode('restricted')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        accessMode === 'restricted'
                          ? 'bg-purple-100 text-purple-950 border border-purple-300'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Restricted to Roster ({studentRoster.length})
                    </button>
                  </div>
                </div>

                {accessMode === 'restricted' && (
                  <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-2xl space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs font-bold text-purple-950">
                        {studentRoster.length > 0
                          ? `✓ ${studentRoster.length} Candidates Registered on Roster`
                          : 'No candidates registered yet. Upload your student roster spreadsheet.'}
                      </span>

                      <div className="flex items-center gap-2">
                        <input
                          ref={rosterInputRef}
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleRosterUpload}
                          className="hidden"
                          id="pool-roster-upload"
                        />
                        <button
                          type="button"
                          onClick={() => rosterInputRef.current?.click()}
                          disabled={isUploadingRoster}
                          className="px-3 py-1.5 bg-purple-900 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        >
                          <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isUploadingRoster ? 'Uploading...' : 'Upload Student Roster'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => generateRosterTemplateExcel(title)}
                          className="px-3 py-1.5 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                          title="Download Roster Template (.xlsx)"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-500" />
                          <span>Roster Template</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Preview Master Question Bank (Full Math & Diagram Rendering with 500-1000 items pagination) */
            <div className={`space-y-4 ${isFullScreen ? 'flex-1 flex flex-col' : ''}`}>
              {/* Controls Bar: In Fullscreen, render only the sleek top toggle bar so questions alone occupy the screen */}
              {isFullScreen ? (
                <div className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl flex items-center justify-between gap-3 shadow-md border border-slate-800 shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-slate-200">
                      {previewLayout === 'simulation' ? (
                        <>
                          Simulation: Question <strong className="text-amber-400">{Math.min(Math.max(0, singleQuestionIndex) + 1, masterQuestions.length)}</strong> of <strong className="text-amber-400">{masterQuestions.length}</strong>
                        </>
                      ) : (
                        <>
                          Pool: <strong className="text-amber-400">{masterQuestions.length} Questions</strong>
                        </>
                      )}
                    </span>

                    {/* Simulation Question Navigation directly inside top bar */}
                    {previewLayout === 'simulation' && (
                      <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-xl border border-white/10">
                        <button
                          type="button"
                          onClick={() => setSingleQuestionIndex((p) => Math.max(0, p - 1))}
                          disabled={singleQuestionIndex <= 0}
                          className="p-1 rounded-lg hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-bold transition-all cursor-pointer"
                          title="Previous Question (←)"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-mono font-bold text-amber-300 px-1.5">
                          {Math.min(Math.max(0, singleQuestionIndex) + 1, masterQuestions.length)} / {masterQuestions.length}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSingleQuestionIndex((p) => Math.min(masterQuestions.length - 1, p + 1))}
                          disabled={singleQuestionIndex >= masterQuestions.length - 1}
                          className="p-1 rounded-lg hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-bold transition-all cursor-pointer"
                          title="Next Question (→)"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Grid/List Pagination Navigation directly inside top bar */}
                    {previewLayout === 'grid' && totalPages > 1 && (
                      <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-xl border border-white/10">
                        <button
                          type="button"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={safeCurrentPage <= 1}
                          className="p-1 rounded-lg hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-bold transition-all cursor-pointer"
                          title="Previous Page"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-bold text-slate-200 px-1.5">
                          Page {safeCurrentPage} / {totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={safeCurrentPage >= totalPages}
                          className="p-1 rounded-lg hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-bold transition-all cursor-pointer"
                          title="Next Page"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Toggle bars: Layout switch, Jump to Q#, and Fullscreen toggle */}
                  <div className="flex items-center gap-2.5">
                    {/* Preview Layout Switcher Toggle */}
                    <div className="flex items-center bg-white/10 p-0.5 rounded-xl border border-white/15">
                      <button
                        type="button"
                        onClick={() => setPreviewLayout('simulation')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          previewLayout === 'simulation'
                            ? 'bg-amber-400 text-slate-950 shadow-xs'
                            : 'text-slate-300 hover:text-white'
                        }`}
                        title="Candidate exam simulation: 1 question per page"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>1-Question</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewLayout('grid')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          previewLayout === 'grid'
                            ? 'bg-amber-400 text-slate-950 shadow-xs'
                            : 'text-slate-300 hover:text-white'
                        }`}
                        title="All questions list"
                      >
                        <LayoutGrid className="w-3 h-3" />
                        <span>All Questions</span>
                      </button>
                    </div>

                    {/* Question Palette in Simulation */}
                    {previewLayout === 'simulation' && (
                      <button
                        type="button"
                        onClick={() => setShowPaletteModal(!showPaletteModal)}
                        className="px-2.5 py-1 bg-purple-800/80 hover:bg-purple-700 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border border-purple-600/40"
                        title="Open Question Palette"
                      >
                        <LayoutGrid className="w-3 h-3" />
                        <span className="hidden md:inline">Palette</span>
                      </button>
                    )}

                    {/* Jump to Question Number */}
                    <form onSubmit={handleJumpToQuestion} className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        max={masterQuestions.length || 1000}
                        value={jumpInput}
                        onChange={(e) => setJumpInput(e.target.value)}
                        placeholder="Q#"
                        className="w-14 px-2 py-1 text-xs rounded-lg border border-white/20 bg-white/10 text-white placeholder-slate-400 text-center font-bold focus:bg-white focus:text-slate-900"
                        title="Jump to question number"
                      />
                      <button
                        type="submit"
                        className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Go
                      </button>
                    </form>

                    {/* Exit Full Screen Toggle */}
                    <button
                      type="button"
                      id="btn-pool-preview-fullscreen"
                      onClick={handleToggleFullScreen}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                      title="Exit Full Screen View (Press f or Esc)"
                    >
                      <Minimize2 className="w-3.5 h-3.5" />
                      <span>Exit Full Screen</span>
                      <kbd className="px-1.5 py-0.5 bg-black/15 text-[10px] rounded font-mono font-bold">Esc</kbd>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-purple-700" />
                        Master Question Repository ({masterQuestions.length} Items)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Each candidate will randomly receive a deterministic draw of <strong className="text-purple-900">{poolQuestionsToServe} questions</strong> with complete mathematical formulas and diagrams rendered.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Preview Layout Switcher */}
                      <div className="flex items-center bg-slate-200/90 p-0.5 rounded-xl border border-slate-300">
                        <button
                          type="button"
                          onClick={() => setPreviewLayout('simulation')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            previewLayout === 'simulation'
                              ? 'bg-purple-900 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title="Candidate exam simulation: 1 question per page"
                        >
                          <Play className="w-3 h-3 text-amber-300 fill-current" />
                          <span>Exam Simulation (1-Q)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewLayout('grid')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            previewLayout === 'grid'
                              ? 'bg-purple-900 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title="Master repository multi-card list"
                        >
                          <LayoutGrid className="w-3 h-3" />
                          <span>List / Grid</span>
                        </button>
                      </div>

                      {/* Full Screen Mode Toggle Button */}
                      <button
                        type="button"
                        id="btn-pool-preview-fullscreen"
                        onClick={handleToggleFullScreen}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs bg-purple-900 hover:bg-purple-800 text-white border border-purple-950"
                        title="Expand to Full Screen View (Press f to toggle)"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
                        <span>Full Screen Mode</span>
                        <kbd className="ml-1 px-1.5 py-0.2 bg-white/20 text-[10px] rounded font-mono font-bold">f</kbd>
                      </button>

                      {/* Jump to Question Number Form */}
                      <form onSubmit={handleJumpToQuestion} className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                          <Hash className="w-3.5 h-3.5 text-slate-400" />
                          Jump to Q#:
                        </span>
                        <input
                          type="number"
                          min="1"
                          max={masterQuestions.length || 1000}
                          value={jumpInput}
                          onChange={(e) => setJumpInput(e.target.value)}
                          placeholder="e.g. 450"
                          className="w-20 px-2.5 py-1 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-600 bg-white text-center font-bold"
                        />
                        <button
                          type="submit"
                          className="px-2.5 py-1 bg-purple-900 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          Go
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Filters & Search */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-200">
                    <div className="flex items-center gap-2 flex-wrap flex-1">
                      {/* Search */}
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search question text, options, explanation, or ID..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-600 bg-white"
                        />
                      </div>

                      {/* Topic Filter */}
                      {availableTopics.length > 1 && (
                        <select
                          value={selectedTopic}
                          onChange={(e) => setSelectedTopic(e.target.value)}
                          className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-600 bg-white font-medium text-slate-700"
                        >
                          <option value="all">All Topics ({masterQuestions.length})</option>
                          {availableTopics.map((topic) => (
                            <option key={topic} value={topic}>
                              {topic}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Page Size Selector */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <span className="text-[11px]">Show:</span>
                        <select
                          value={pageSize}
                          onChange={(e) => setPageSize(Number(e.target.value))}
                          className="px-2 py-1 text-xs rounded-lg border border-slate-300 bg-white"
                        >
                          <option value={25}>25 / page</option>
                          <option value={50}>50 / page</option>
                          <option value={100}>100 / page</option>
                          <option value={250}>250 / page</option>
                          <option value={500}>All (500) / page</option>
                          <option value={1000}>All (1000) / page</option>
                        </select>
                      </div>
                    </div>

                    {/* Summary Indicator */}
                    <div className="text-xs text-slate-600 font-medium shrink-0">
                      Showing <strong className="text-slate-900">{totalFiltered === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1}</strong>–
                      <strong className="text-slate-900">{Math.min(safeCurrentPage * pageSize, totalFiltered)}</strong> of{' '}
                      <strong className="text-purple-900">{totalFiltered}</strong> questions
                    </div>
                  </div>
                </div>
              )}

              {/* Master Questions View: Simulation (1-Q) or List / Grid Mode */}
              {previewLayout === 'simulation' ? (
                (() => {
                  const safeIdx = Math.min(Math.max(0, singleQuestionIndex), masterQuestions.length - 1);
                  const currentQ = masterQuestions[safeIdx];
                  if (!currentQ) return null;
                  return (
                    <div className={isFullScreen ? 'flex-1 overflow-y-auto space-y-4 pr-1' : 'space-y-4'}>
                      {/* Question Palette Drawer Overlay */}
                      {showPaletteModal && (
                        <div className="p-4 bg-slate-950/95 rounded-xl border border-purple-500/40 space-y-3 animate-in fade-in duration-150 shadow-xl">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                              <LayoutGrid className="w-3.5 h-3.5" />
                              Jump to any question (1 to {masterQuestions.length}):
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowPaletteModal(false)}
                              className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                            >
                              Close ✕
                            </button>
                          </div>
                          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-20 gap-1.5 max-h-48 overflow-y-auto p-1">
                            {masterQuestions.map((_, qIdx) => (
                              <button
                                key={qIdx}
                                type="button"
                                onClick={() => {
                                  setSingleQuestionIndex(qIdx);
                                  setShowPaletteModal(false);
                                }}
                                className={`h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                                  qIdx === safeIdx
                                    ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 font-black shadow-xs'
                                    : 'bg-white/10 text-white hover:bg-purple-700/60'
                                }`}
                              >
                                {qIdx + 1}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Question Card: in fullscreen, questions alone occupy the screen without outer bars */}
                      <div className={isFullScreen ? 'space-y-4' : 'bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-purple-900/60 space-y-4'}>
                        {/* Only show kiosk header bar in non-fullscreen */}
                        {!isFullScreen && (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="px-3 py-1 bg-amber-400 text-slate-950 font-black rounded-lg text-xs tracking-wider uppercase shadow-xs">
                                Question {safeIdx + 1} of {masterQuestions.length}
                              </span>
                              {currentQ.topic && (
                                <span className="px-2.5 py-0.5 bg-white/15 text-white font-semibold rounded-lg text-xs">
                                  {currentQ.topic}
                                </span>
                              )}
                              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold">
                                1 Mark
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setShowPaletteModal(!showPaletteModal)}
                                className="px-3 py-1.5 bg-purple-800 hover:bg-purple-700 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-purple-600/50 shadow-xs"
                              >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                <span>Question Palette ({masterQuestions.length})</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setPreviewLayout('grid')}
                                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                                title="Switch to full list view"
                              >
                                <Layers className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">List View</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Question Stem */}
                        <div className={isFullScreen ? 'bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3' : 'bg-slate-800/80 rounded-xl p-4 sm:p-5 border border-white/5 space-y-3'}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-7 h-7 rounded-xl bg-purple-100 text-purple-900 font-black text-xs flex items-center justify-center shrink-0 border border-purple-200 shadow-2xs">
                              {safeIdx + 1}
                            </span>
                            {currentQ.topic && (
                              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs">
                                {currentQ.topic}
                              </span>
                            )}
                          </div>
                          <div className={`text-base sm:text-lg font-medium leading-relaxed ${isFullScreen ? 'text-slate-900' : 'text-slate-100'}`}>
                            <MathRenderer text={currentQ.questionText} />
                          </div>

                          {/* Image Diagram if present */}
                          {currentQ.imageUrl && (
                            <div className="p-3 bg-white border border-slate-200 rounded-xl inline-block max-w-full shadow-xs">
                              <img
                                src={currentQ.imageUrl}
                                alt={`Question ${safeIdx + 1} Diagram`}
                                className="max-h-80 max-w-full object-contain rounded-lg"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                        </div>

                        {/* Options A, B, C, D */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {currentQ.options.map((opt) => {
                            const isCorrect = opt.id === currentQ.correctAnswer;
                            return (
                              <div
                                key={opt.id}
                                className={`p-4 rounded-xl border text-sm flex items-start gap-3 transition-all ${
                                  isFullScreen
                                    ? isCorrect
                                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                                      : 'bg-white border-slate-200 text-slate-800 hover:border-purple-300 shadow-2xs'
                                    : isCorrect
                                      ? 'bg-emerald-950/40 border-emerald-500/80 text-emerald-100 shadow-xs ring-1 ring-emerald-500/30'
                                      : 'bg-slate-800/60 border-white/10 text-slate-200'
                                }`}
                              >
                                <span
                                  className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 mt-0.5 ${
                                    isCorrect
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : isFullScreen
                                        ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                        : 'bg-white/15 text-slate-300'
                                  }`}
                                >
                                  {opt.id}
                                </span>
                                <div className="flex-1 leading-snug break-words">
                                  <MathRenderer text={opt.text} />
                                </div>
                                {isCorrect && (
                                  <span className="text-[11px] text-emerald-700 font-bold shrink-0 flex items-center gap-1 self-center bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                                    Correct Answer
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Solution & Explanation */}
                        {currentQ.explanation && (
                          <div className={isFullScreen ? 'p-4 bg-purple-50/70 border border-purple-200 rounded-xl text-xs text-purple-950 leading-relaxed shadow-2xs' : 'p-4 bg-purple-950/60 border border-purple-500/30 rounded-xl text-xs text-purple-200 leading-relaxed'}>
                            <span className="font-bold text-purple-900 block mb-1">
                              💡 Solution / Explanation:
                            </span>
                            <MathRenderer text={currentQ.explanation} />
                          </div>
                        )}

                        {/* Navigation Footer - hidden in fullscreen mode */}
                        {!isFullScreen && (
                          <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
                            <button
                              type="button"
                              onClick={() => setSingleQuestionIndex((p) => Math.max(0, p - 1))}
                              disabled={safeIdx === 0}
                              className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                            >
                              <ChevronLeft className="w-4 h-4" />
                              <span>Previous Question (←)</span>
                            </button>

                            <div className="text-center text-xs text-slate-400 font-medium hidden sm:block">
                              Use <kbd className="px-1.5 py-0.5 bg-white/10 text-amber-300 rounded font-mono font-bold text-[10px]">←</kbd> and{' '}
                              <kbd className="px-1.5 py-0.5 bg-white/10 text-amber-300 rounded font-mono font-bold text-[10px]">→</kbd> to navigate,{' '}
                              <kbd className="px-1.5 py-0.5 bg-white/10 text-amber-300 rounded font-mono font-bold text-[10px]">f</kbd> for fullscreen
                            </div>

                            <button
                              type="button"
                              onClick={() => setSingleQuestionIndex((p) => Math.min(masterQuestions.length - 1, p + 1))}
                              disabled={safeIdx === masterQuestions.length - 1}
                              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-30 disabled:pointer-events-none text-slate-950 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                            >
                              <span>Next Question (→)</span>
                              <ChevronRight className="w-4 h-4 text-slate-950" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <>
                <div
                  className={`space-y-4 pr-1 ${
                    isFullScreen
                      ? 'flex-1 overflow-y-auto max-h-[calc(100vh-90px)]'
                      : 'max-h-[55vh] overflow-y-auto'
                  }`}
                >
                  {paginatedQuestions.map((q, idx) => {
                    const globalIdx = (safeCurrentPage - 1) * pageSize + idx + 1;
                    const isSelected = selectedQuestionNavIdx === idx;
                    return (
                      <div
                        key={q.id || globalIdx}
                        id={`pool-preview-q-${idx}`}
                        onClick={() => setSelectedQuestionNavIdx(idx)}
                        className={`bg-white border rounded-2xl p-4 sm:p-5 space-y-3 transition-all relative cursor-pointer ${
                          isSelected
                            ? 'border-purple-500 ring-2 ring-purple-500/25 shadow-md bg-purple-50/15'
                            : 'border-slate-200 hover:border-purple-300 shadow-2xs'
                        }`}
                      >
                        {/* Question Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-7 h-7 rounded-xl bg-purple-100 text-purple-900 font-black text-xs flex items-center justify-center shrink-0 border border-purple-200 shadow-2xs">
                              {q.id || globalIdx}
                            </span>

                            {q.topic && (
                              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10.5px] font-bold">
                                {q.topic}
                              </span>
                            )}

                            {q.sectionName && q.sectionName !== q.topic && (
                              <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-semibold">
                                {q.sectionName}
                              </span>
                            )}

                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                              1 Mark
                            </span>
                          </div>

                          {/* Delete from pool action */}
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove question from pool"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Question Stem rendered with MathRenderer */}
                        <div className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed pl-1">
                          <MathRenderer text={q.questionText} />
                        </div>

                        {/* Embedded Diagram if extracted from Word document */}
                        {q.imageUrl && (
                          <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl inline-block max-w-full">
                            <img
                              src={q.imageUrl}
                              alt={`Question ${q.id} Diagram`}
                              className="max-h-56 max-w-full object-contain rounded-lg bg-white shadow-xs"
                              referrerPolicy="no-referrer"
                            />
                            <span className="text-[10px] text-slate-500 font-medium block mt-1 flex items-center gap-1">
                              <ImageIcon className="w-3 h-3 text-purple-600 inline" />
                              Extracted Word Diagram
                            </span>
                          </div>
                        )}

                        {/* Options A–D rendered with MathRenderer */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt) => {
                            const isCorrect = opt.id === q.correctAnswer;
                            return (
                              <div
                                key={opt.id}
                                className={`px-3.5 py-2 rounded-xl text-xs flex items-start gap-2.5 transition-all ${
                                  isCorrect
                                    ? 'bg-emerald-50/90 border-2 border-emerald-400 text-emerald-950 font-bold shadow-2xs'
                                    : 'bg-slate-50/80 border border-slate-200 text-slate-800'
                                }`}
                              >
                                <span
                                  className={`w-5 h-5 rounded-lg text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                                    isCorrect
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {opt.id}
                                </span>
                                <div className="flex-1 leading-snug break-words">
                                  <MathRenderer text={opt.text} />
                                </div>
                                {isCorrect && (
                                  <span className="text-[10px] text-emerald-700 font-bold shrink-0 flex items-center gap-0.5 self-center">
                                    <Check className="w-3 h-3" />
                                    Correct
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation rendered with MathRenderer */}
                        {q.explanation && (
                          <div className="p-3 bg-indigo-50/50 border border-indigo-200/60 rounded-xl text-[11px] text-indigo-950 leading-relaxed">
                            <span className="font-bold text-indigo-900 block mb-0.5">
                              💡 Solution / Explanation:
                            </span>
                            <MathRenderer text={q.explanation} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

              {/* Pagination Controls - Hidden in fullscreen because page navigation is integrated into the top bar */}
              {!isFullScreen && totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
                  <div className="text-xs text-slate-500 font-medium">
                    Page <strong className="text-slate-900">{safeCurrentPage}</strong> of{' '}
                    <strong className="text-slate-900">{totalPages}</strong> ({totalFiltered} total items)
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* First Page */}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(1)}
                      disabled={safeCurrentPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                      title="First Page"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>

                    {/* Previous Page */}
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safeCurrentPage === 1}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1 px-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum = safeCurrentPage - 2 + i;
                        if (pageNum < 1) pageNum = i + 1;
                        if (pageNum > totalPages) return null;

                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              safeCurrentPage === pageNum
                                ? 'bg-purple-950 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    {/* Next Page */}
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safeCurrentPage === totalPages}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Last Page */}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={safeCurrentPage === totalPages}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                      title="Last Page"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions - Hidden in fullscreen mode so questions alone occupy the full screen */}
        {!isFullScreen && (
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-600">
              {masterQuestions.length > 0 ? (
                <span>
                  Master Pool: <strong className="text-slate-900">{masterQuestions.length} Questions</strong> • Draw:{' '}
                  <strong className="text-purple-900">{poolQuestionsToServe} Per Candidate</strong>
                </span>
              ) : (
                <span className="text-amber-700">Upload a Microsoft Word document (.docx) to enable publishing</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={masterQuestions.length === 0 || !title.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-950 to-indigo-950 hover:from-purple-900 hover:to-indigo-900 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md inline-flex items-center gap-2"
              >
                <Shuffle className="w-4 h-4 text-amber-400" />
                <span>{quizToEdit ? 'Save Changes' : 'Publish Question Pool Exam'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
