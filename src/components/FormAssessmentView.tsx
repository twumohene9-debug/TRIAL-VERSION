import React, { useState, useEffect, useMemo } from 'react';
import { 
  Question, 
  MCQOption,
  QuizSection, 
  StudentAnswers, 
  StudentSubmission, 
  QuizConfig,
  ProctorWarning,
  IntegrityEvent,
  CameraCaptureItem
} from '../types';
import { MathRenderer } from './MathRenderer';
import { IntegrityWarningModal } from './IntegrityWarningModal';
import { QRCodeModal } from './QRCodeModal';
import { QRScannerModal } from './QRScannerModal';
import { StudentDiagnosticPerformanceSlipModal } from './StudentDiagnosticPerformanceSlipModal';
import { decodeQuizData, cacheQuizOffline, getCachedOfflineQuiz } from '../utils/quizCompression';
import { getExactQuizFromOfflineStorage, saveQuizToOfflineStorage } from '../utils/offlineQuizStorage';
import { 
  fetchQuizFromFirestore, 
  saveSubmissionToFirestore, 
  saveActiveSessionToFirestore, 
  deleteActiveSessionFromFirestore, 
  subscribeToTeacherWarnings,
  acknowledgeTeacherWarningInFirestore,
  saveCameraCaptureToFirestore
} from '../services/firebaseSync';
import { 
  saveOfflineSubmission, 
  checkIfStudentAlreadySubmitted, 
  setQuizSubmissionLock, 
  getOfflineSubmissions,
  isBrowserQuizAttemptLocked,
  setBrowserQuizAttemptLock
} from '../utils/submissionUtils';
import { getQuizInstructionBullets, DEFAULT_QUIZ_INSTRUCTIONS } from '../utils/instructionsUtils';
import { validateCandidateAgainstRoster } from '../utils/rosterParser';
import { selectDeterministicPoolQuestions } from '../utils/questionPoolParser';
import { QUESTIONS_DATA, INITIAL_QUIZ_SECTIONS } from '../data/questionsData';
import { 
  playCountdownBeep, 
  playOneMinuteWarningSound, 
  playForfeitWarningSound,
  getIsCountdownMuted, 
  setIsCountdownMuted, 
  initAudioContext 
} from '../utils/audioUtils';
import { 
  Bookmark, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Lock, 
  Save, 
  Send, 
  RotateCcw, 
  Check, 
  AlertCircle,
  HelpCircle,
  Award,
  ChevronRight,
  ChevronLeft,
  User,
  Mail,
  IdCard,
  Building,
  Layers,
  ShieldAlert,
  Sparkles,
  BookOpenCheck,
  LogOut,
  DoorOpen,
  ArrowLeft,
  QrCode,
  ScanLine,
  WifiOff,
  Copy,
  Download,
  Share2,
  RefreshCw,
  KeyRound,
  EyeOff,
  Eye,
  ShieldCheck,
  LayoutGrid,
  X,
  Megaphone,
  AlertTriangle,
  Zap,
  Maximize2,
  Minimize2,
  Move,
  Timer,
  Users,
  CalendarClock,
  Camera,
  CameraOff,
  Video,
  Loader2
} from 'lucide-react';
import { 
  evaluateTimeline, 
  calculateEffectiveExamDurationSeconds, 
  formatCountdownString 
} from '../utils/timelineUtils';

interface FormAssessmentViewProps {
  questions: Question[];
  sections: QuizSection[];
  config: QuizConfig;
  quizzes?: QuizConfig[];
  submissions?: StudentSubmission[];
  isStandalone?: boolean;
  onNavigateToTeacher?: () => void;
  onOpenAbout?: (tab?: 'about' | 'contact') => void;
  onSubmitAssessment: (submission: StudentSubmission) => void;
  timeRemainingSeconds: number;
  setTimeRemainingSeconds: React.Dispatch<React.SetStateAction<number>>;
  isTimerRunning: boolean;
  setIsTimerRunning: React.Dispatch<React.SetStateAction<boolean>>;
}

export const FormAssessmentView: React.FC<FormAssessmentViewProps> = ({
  questions,
  sections,
  config,
  quizzes = [],
  submissions = [],
  isStandalone = false,
  onNavigateToTeacher,
  onOpenAbout,
  onSubmitAssessment,
  timeRemainingSeconds,
  setTimeRemainingSeconds,
  isTimerRunning,
  setIsTimerRunning,
}) => {
  // Student Profile State
  const [studentInfo, setStudentInfo] = useState({
    name: '',
    email: '',
    studentId: '',
    classGroup: '',
    school: '',
  });

  // Multiple Attempts Blocked State
  const [blockedPriorSubmission, setBlockedPriorSubmission] = useState<StudentSubmission | null>(null);

  // Detect standalone mode
  const [isStandaloneMode] = useState<boolean>(() => {
    if (isStandalone) return true;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('standalone') === 'true' || !!params.get('quiz') || !!params.get('qdata');
    }
    return false;
  });

  // Student Dashboard Repository Access - Default Open (no passcode barrier)
  const [isStudentDashboardUnlocked, setIsStudentDashboardUnlocked] = useState<boolean>(true);
  const [studentPasscodeInput, setStudentPasscodeInput] = useState('');
  const [studentPasscodeError, setStudentPasscodeError] = useState<string | null>(null);
  const [showStudentPasscode, setShowStudentPasscode] = useState(false);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');

  const [hasStartedQuiz, setHasStartedQuiz] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizConfig | null>(null);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [targetQuizCode, setTargetQuizCode] = useState<string | null>(null);
  const [quizCodeInput, setQuizCodeInput] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [copiedLinkQuizId, setCopiedLinkQuizId] = useState<string | null>(null);

  // QR Code Modals State
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedQuizForQR, setSelectedQuizForQR] = useState<QuizConfig | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isResultQRModalOpen, setIsResultQRModalOpen] = useState(false);
  const [isDiagnosticSlipModalOpen, setIsDiagnosticSlipModalOpen] = useState(false);

  const [activeSectionId, setActiveSectionId] = useState<number>(0); // 0 = All 4 Sections Single Mode
  const [answers, setAnswers] = useState<StudentAnswers>({});
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<number[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState<number>(60);
  const [autoSkipNotice, setAutoSkipNotice] = useState<string | null>(null);
  const [keyLockNotice, setKeyLockNotice] = useState<string | null>(null);
  const [isFullscreenExitedModalOpen, setIsFullscreenExitedModalOpen] = useState(false);
  const currentQuestionIndexRef = React.useRef<number>(0);
  const lastQuestionBeepSecondRef = React.useRef<number | null>(null);
  const questionTargetEndTimeRef = React.useRef<number>(Date.now() + 60 * 1000);
  const questionDurationSecRef = React.useRef<number>(60);
  const sessionSyncDebounceTimerRef = React.useRef<any>(null);
  const pendingSessionOverridesRef = React.useRef<Record<string, any>>({});

  useEffect(() => {
    currentQuestionIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex]);

  useEffect(() => {
    if (!keyLockNotice) return;
    const t = setTimeout(() => setKeyLockNotice(null), 3000);
    return () => clearTimeout(t);
  }, [keyLockNotice]);

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [completedSubmission, setCompletedSubmission] = useState<StudentSubmission | null>(null);
  const [enlargedDiagramUrl, setEnlargedDiagramUrl] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [saveDraftNotification, setSaveDraftNotification] = useState(false);
  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState(false);
  // Audio is permanently active on the quiz page - sound deactivation/mute controls are removed
  const isAudioMuted = false;
  useEffect(() => {
    setIsCountdownMuted(false);
  }, []);
  const lastBeepSecondRef = React.useRef<number | null>(null);
  const hasPlayedOneMinuteWarningRef = React.useRef<boolean>(false);
  const tabSwitchesCountRef = React.useRef<number>(0);
  const lastTabSwitchTimestampRef = React.useRef<number>(0);
  const lastBlurTimestampRef = React.useRef<number>(0);
  const tabUnfocusedAtRef = React.useRef<number | null>(null);
  const integrityEventsRef = React.useRef<IntegrityEvent[]>([]);
  const recordTabSwitchViolationRef = React.useRef<(reason?: string) => void>(() => {});
  const triggerScreenshotDefenseRef = React.useRef<(reason: string) => void>(() => {});
  const triggerTopEdgeViolationRef = React.useRef<(reason: string) => void>(() => {});
  const isSubmittingRef = React.useRef<boolean>(false);
  const autoSubmitPendingRef = React.useRef<boolean>(false);
  const autoSubmitTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = React.useRef<{ x: number; y: number; time: number } | null>(null);

  // Default active quizzes fallback if none provided
  const activeQuizzes: QuizConfig[] = (quizzes && quizzes.length > 0 ? quizzes : [
    {
      id: 'quiz-001',
      code: 'ALG-SHS1-2026-001',
      title: 'Algebra & Quadratic Equations Mid-Term Assessment',
      subject: 'Mathematics',
      classGroup: 'SHS 1',
      topic: 'Algebra & Quadratic Equations',
      teacherName: 'Mr. Bismark Twumasi',
      schoolName: 'MCQ Assessment Network',
      instructions: DEFAULT_QUIZ_INSTRUCTIONS.join('\n'),
      instructionBullets: [...DEFAULT_QUIZ_INSTRUCTIONS],
      totalQuestions: 5,
      durationMinutes: 45,
      status: 'active' as const,
      createdAt: '2026-03-01',
    },
    {
      id: 'quiz-002',
      code: 'GEO-SHS2-2026-002',
      title: 'Trigonometry & Circle Geometry Test',
      subject: 'Mathematics',
      classGroup: 'SHS 2',
      topic: 'Trigonometry & Circle Geometry',
      teacherName: 'Mr. Bismark Twumasi',
      schoolName: 'MCQ Assessment Network',
      instructions: DEFAULT_QUIZ_INSTRUCTIONS.join('\n'),
      instructionBullets: [...DEFAULT_QUIZ_INSTRUCTIONS],
      totalQuestions: 2,
      durationMinutes: 30,
      status: 'active' as const,
      createdAt: '2026-03-02',
    },
    {
      id: 'quiz-003',
      code: 'DOC-857',
      title: 'ADD MATHS QUIZ',
      subject: 'Additional Mathematics',
      classGroup: 'SHS 2',
      topic: 'Pure Mathematics & Calculus',
      teacherName: 'Mr. Bismark Twum',
      schoolName: 'MCQ Assessment Network',
      instructions: DEFAULT_QUIZ_INSTRUCTIONS.join('\n'),
      instructionBullets: [...DEFAULT_QUIZ_INSTRUCTIONS],
      totalQuestions: 40,
      durationMinutes: 60,
      status: 'active' as const,
      createdAt: '2026-03-03',
      questions: QUESTIONS_DATA,
      sections: INITIAL_QUIZ_SECTIONS,
    },
    {
      id: 'quiz-004',
      code: 'DOC-365',
      title: 'Imported Assessment',
      subject: 'Mathematics',
      classGroup: 'SHS 1 & SHS 2',
      topic: 'General Assessment',
      teacherName: 'Mr. Bismark Twum',
      schoolName: 'MCQ Assessment Network',
      instructions: DEFAULT_QUIZ_INSTRUCTIONS.join('\n'),
      instructionBullets: [...DEFAULT_QUIZ_INSTRUCTIONS],
      totalQuestions: 40,
      durationMinutes: 30,
      status: 'active' as const,
      createdAt: '2026-03-04',
    },
  ]).filter((q) => q.status !== 'archived');

  // Academic Integrity & Anti-Screenshot Monitoring States
  const [tabSwitchesCount, setTabSwitchesCount] = useState<number>(0);
  const [windowExitsCount, setWindowExitsCount] = useState<number>(0);
  const [warningsAcknowledgedCount, setWarningsAcknowledgedCount] = useState<number>(0);
  const [isIntegrityModalOpen, setIsIntegrityModalOpen] = useState<boolean>(false);
  const [tabSwitchBannerNotice, setTabSwitchBannerNotice] = useState<boolean>(false);
  const [screenshotAlert, setScreenshotAlert] = useState<string | null>(null);
  const [isScreenShieldActive, setIsScreenShieldActive] = useState<boolean>(false);

  // Progressive 3-Tier Tab Penalties & Live Teacher Warning States
  const [activeTeacherWarning, setActiveTeacherWarning] = useState<ProctorWarning | null>(null);
  const [acknowledgedWarningIds, setAcknowledgedWarningIds] = useState<string[]>([]);
  const [isAutoSubmittingDueToPenalties, setIsAutoSubmittingDueToPenalties] = useState<boolean>(false);
  const [lastPenaltyDeductionMinutes, setLastPenaltyDeductionMinutes] = useState<number>(0);

  // Question and Option Alternative Shuffling per student session state (Anti-collaboration randomization)
  const [shuffledQuestionIds, setShuffledQuestionIds] = useState<string[]>([]);
  const [shuffledOptionMaps, setShuffledOptionMaps] = useState<Record<string, ('A' | 'B' | 'C' | 'D')[]>>({});

  // Candidate Roster Verification State
  const [rosterValidationError, setRosterValidationError] = useState<string | null>(null);

  // Screen size awareness for mobile one-screen layout
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load draft from localStorage on mount & check URL parameters for direct quiz access / QR payload
  useEffect(() => {
    if (selectedQuiz && quizzes && quizzes.length > 0) {
      const live = quizzes.find(
        (q) => (q.id && q.id === selectedQuiz.id) || (q.code && q.code === selectedQuiz.code)
      );
      if (live && (live.status !== selectedQuiz.status || live.instructions !== selectedQuiz.instructions || live.durationMinutes !== selectedQuiz.durationMinutes)) {
        setSelectedQuiz((prev) => (prev ? { ...prev, ...live } : live));
      }
    }
  }, [quizzes, selectedQuiz]);

  useEffect(() => {
    if (hasStartedQuiz || isSubmitted) return;

    const savedDraft = localStorage.getItem('addmaths_quiz_draft');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.answers) setAnswers(parsed.answers);
        if (parsed.bookmarkedQuestions) setBookmarkedQuestions(parsed.bookmarkedQuestions);
        if (parsed.studentInfo) setStudentInfo(parsed.studentInfo);
        if (Array.isArray(parsed.shuffledQuestionIds) && parsed.shuffledQuestionIds.length > 0) {
          setShuffledQuestionIds(parsed.shuffledQuestionIds);
        }
        if (parsed.shuffledOptionMaps && typeof parsed.shuffledOptionMaps === 'object') {
          setShuffledOptionMaps(parsed.shuffledOptionMaps);
        }
      } catch (err) {
        console.error('Failed to parse draft');
      }
    }

    // Read target URL quiz code first to prevent cross-quiz session pollution
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const initialUrlCode = urlParams?.get('quiz') || urlParams?.get('quizId') || urlParams?.get('quiz_id') || urlParams?.get('quizCode') || urlParams?.get('id') || (typeof window !== 'undefined' && window.location.hash.startsWith('#quiz=') ? window.location.hash.replace('#quiz=', '') : null);
    const normalizedUrlCode = initialUrlCode ? decodeURIComponent(initialUrlCode).trim() : null;

    // Check for active cheat-proof exam session in localStorage (page refresh / reload recovery)
    const savedSessionRaw = localStorage.getItem('mcq_exam_active_session');
    if (savedSessionRaw) {
      try {
        const savedSession = JSON.parse(savedSessionRaw);
        // CRITICAL: If opening a specific quiz link, ONLY restore session if it matches this exact quiz!
        const sessionMatchesUrl = !normalizedUrlCode || 
          (savedSession.quizId && savedSession.quizId.toUpperCase() === normalizedUrlCode.toUpperCase()) ||
          (savedSession.quizCode && savedSession.quizCode.toUpperCase() === normalizedUrlCode.toUpperCase());

        if (!sessionMatchesUrl) {
          // Stale or previous session from another quiz - clear it immediately so new quiz opens cleanly!
          localStorage.removeItem('mcq_exam_active_session');
          localStorage.removeItem('addmaths_quiz_draft');
        } else {
          const now = Date.now();
          const remaining = Math.max(0, Math.floor((savedSession.targetEndTime - now) / 1000));
          
          if (typeof savedSession.tabSwitchesCount === 'number') {
            setTabSwitchesCount(savedSession.tabSwitchesCount);
            tabSwitchesCountRef.current = savedSession.tabSwitchesCount;
          }
          if (savedSession.studentName && savedSession.studentId) {
            setStudentInfo({
              name: savedSession.studentName,
              email: savedSession.studentEmail || '',
              studentId: savedSession.studentId,
              classGroup: savedSession.classGroup || '',
              school: savedSession.school || '',
            });
          }
          
          if (Array.isArray(savedSession.shuffledQuestionIds) && savedSession.shuffledQuestionIds.length > 0) {
            setShuffledQuestionIds(savedSession.shuffledQuestionIds);
          }
          if (savedSession.shuffledOptionMaps && typeof savedSession.shuffledOptionMaps === 'object') {
            setShuffledOptionMaps(savedSession.shuffledOptionMaps);
          }

          if (savedSession.answers && typeof savedSession.answers === 'object') {
            setAnswers(savedSession.answers);
          }

          // Restore quiz configuration and question bank
          const quizTarget = savedSession.quizId || savedSession.quizCode;
          if (quizTarget) {
            const matched = activeQuizzes.find(
              (q) =>
                (q.id && q.id.toUpperCase() === quizTarget.toUpperCase()) ||
                (q.code && q.code.toUpperCase() === quizTarget.toUpperCase()) ||
                (q.title && q.title.toUpperCase() === quizTarget.toUpperCase())
            );
            if (matched) {
              setSelectedQuiz(matched);
            } else {
              const defaultQuiz = activeQuizzes.find((q) => q.id === 'quiz-003' || q.code === 'DOC-857') || activeQuizzes[0];
              if (defaultQuiz) setSelectedQuiz(defaultQuiz);
            }
          } else {
            const defaultQuiz = activeQuizzes.find((q) => q.id === 'quiz-003' || q.code === 'DOC-857') || activeQuizzes[0];
            if (defaultQuiz) setSelectedQuiz(defaultQuiz);
          }
          
          if (savedSession.isSubmitted || savedSession.status === 'submitted') {
            setIsSubmitted(true);
            setHasStartedQuiz(false);
            setIsTimerRunning(false);
          } else if (remaining > 0) {
            setTimeRemainingSeconds(remaining);
            setHasStartedQuiz(true);
            setIsTimerRunning(true);
          } else {
            // Duration elapsed while away
            setTimeRemainingSeconds(0);
            setHasStartedQuiz(false);
            setIsTimerRunning(false);
          }
        }
      } catch (err) {
        console.error('Failed to parse active exam session:', err);
      }
    }

    // Direct URL parameter or compressed payload auto-decoder
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const qdata = params.get('qdata') || (window.location.hash.includes('qdata=') ? window.location.hash.split('qdata=')[1] : null);

      if (qdata) {
        const decoded = decodeQuizData(qdata);
        if (decoded) {
          cacheQuizOffline(decoded.config, decoded.questions, decoded.sections);
          setSelectedQuiz(decoded.config);
          setTimeRemainingSeconds((decoded.config.durationMinutes || 60) * 60);
          return;
        }
      }

      const codeFromUrl = params.get('quiz') || params.get('quizId') || params.get('quiz_id') || params.get('quizCode') || params.get('id') || (window.location.hash.startsWith('#quiz=') ? window.location.hash.replace('#quiz=', '') : null);
      if (codeFromUrl) {
        const cleanUrlCode = decodeURIComponent(codeFromUrl).trim();
        setTargetQuizCode(cleanUrlCode);

        const isExplicitOfflineParam = params.get('offline') === 'true' || params.get('offline') === '1' || params.get('mode') === 'offline';
        const isOffline = (typeof navigator !== 'undefined' && !navigator.onLine) || isExplicitOfflineParam;

        if (isOffline) {
          // OFFLINE LOGIC: Load that exact quiz from IndexedDB/localStorage only. Do not touch online quiz logic.
          setIsQuizLoading(true);
          setSearchError(null);
          getExactQuizFromOfflineStorage(cleanUrlCode).then((exactOfflineQuiz) => {
            if (exactOfflineQuiz && exactOfflineQuiz.config) {
              const cfg = {
                ...exactOfflineQuiz.config,
                questions: exactOfflineQuiz.questions?.length ? exactOfflineQuiz.questions : (exactOfflineQuiz.config.questions || []),
                sections: exactOfflineQuiz.sections?.length ? exactOfflineQuiz.sections : (exactOfflineQuiz.config.sections || []),
              };
              setSelectedQuiz(cfg);
              setTimeRemainingSeconds((cfg.durationMinutes || 60) * 60);
              setIsQuizLoading(false);
              setSearchError(null);
            } else {
              setIsQuizLoading(false);
              setSelectedQuiz(null);
              setSearchError(`Offline quiz "${cleanUrlCode}" not found in local IndexedDB or localStorage storage. Connect to the internet once to download this paper.`);
            }
          }).catch((err) => {
            console.warn('Offline quiz load error:', err);
            setIsQuizLoading(false);
            setSelectedQuiz(null);
            setSearchError(`Offline quiz "${cleanUrlCode}" could not be loaded from local storage.`);
          });
          return;
        }

        // ONLINE LOGIC (Do not touch online quiz logic):
        // 1. Check in local active quizzes list first with EXACT match priority
        const matched = activeQuizzes.find(
          (q) =>
            (q.code && q.code.trim().toUpperCase() === cleanUrlCode.toUpperCase()) ||
            (q.id && q.id.trim().toUpperCase() === cleanUrlCode.toUpperCase())
        );

        if (matched) {
          setSelectedQuiz(matched);
          setTimeRemainingSeconds((matched.durationMinutes || 60) * 60);
          setIsQuizLoading(false);
        } else {
          // 2. Check offline cached quizzes
          const cached = getCachedOfflineQuiz(cleanUrlCode);
          if (cached && cached.config && cached.questions && cached.questions.length > 0) {
            setSelectedQuiz(cached.config);
            setTimeRemainingSeconds((cached.config.durationMinutes || 60) * 60);
          }

          // 3. Always attempt fresh real-time fetch from Cloud Firestore & API with progressive polling
          setIsQuizLoading(true);
          setSearchError(null);

          let attempts = 0;
          const maxAttempts = 6;

          const executeFetch = async (): Promise<boolean> => {
            attempts++;
            try {
              const cloudQuiz = await fetchQuizFromFirestore(cleanUrlCode);
              if (cloudQuiz) {
                cacheQuizOffline(cloudQuiz, cloudQuiz.questions || [], cloudQuiz.sections || []);
                saveQuizToOfflineStorage(cloudQuiz, cloudQuiz.questions || [], cloudQuiz.sections || []);
                setSelectedQuiz(cloudQuiz);
                setTimeRemainingSeconds((cloudQuiz.durationMinutes || 60) * 60);
                setIsQuizLoading(false);
                setSearchError(null);
                return true;
              }
            } catch (err) {
              console.warn(`Firestore quiz fetch attempt ${attempts} notice:`, err);
            }

            try {
              const apiRes = await fetch(`/api/quizzes/${encodeURIComponent(cleanUrlCode)}`);
              if (apiRes.ok) {
                const apiQuiz = await apiRes.json();
                if (apiQuiz) {
                  cacheQuizOffline(apiQuiz, apiQuiz.questions || [], apiQuiz.sections || []);
                  saveQuizToOfflineStorage(apiQuiz, apiQuiz.questions || [], apiQuiz.sections || []);
                  setSelectedQuiz(apiQuiz);
                  setTimeRemainingSeconds((apiQuiz.durationMinutes || 60) * 60);
                  setIsQuizLoading(false);
                  setSearchError(null);
                  return true;
                }
              }
            } catch (apiErr) {
              console.warn('API fallback notice:', apiErr);
            }

            if (attempts < maxAttempts) {
              setTimeout(executeFetch, 800);
              return false;
            } else {
              setIsQuizLoading(false);
              if (!matched && (!cached || !cached.questions || cached.questions.length === 0)) {
                setSearchError(`Quiz code "${cleanUrlCode}" is still syncing or not found. Please verify the code or refresh.`);
              }
              return false;
            }
          };

          executeFetch();
        }
      }
    }
  }, []);

  // Synchronize matching quiz if URL has parameter or quizzes list updates via Firestore real-time listener
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const codeFromUrl = params.get('quiz') || params.get('quizId') || params.get('quiz_id') || params.get('quizCode') || params.get('id') || (window.location.hash.startsWith('#quiz=') ? window.location.hash.replace('#quiz=', '') : null);
      if (codeFromUrl) {
        const cleanUrlCode = decodeURIComponent(codeFromUrl).trim().toUpperCase();
        const matched = activeQuizzes.find(
          (q) =>
            (q.code && q.code.trim().toUpperCase() === cleanUrlCode) ||
            (q.id && q.id.trim().toUpperCase() === cleanUrlCode)
        );
        if (matched) {
          if (!selectedQuiz || selectedQuiz.id !== matched.id || selectedQuiz.code !== matched.code) {
            setSelectedQuiz(matched);
            setTimeRemainingSeconds((matched.durationMinutes || 60) * 60);
            setIsQuizLoading(false);
            setSearchError(null);
          }
        }
      } else if (isStandaloneMode && !selectedQuiz && activeQuizzes.length > 0 && !codeFromUrl) {
        setSelectedQuiz(activeQuizzes[0]);
        setTimeRemainingSeconds((activeQuizzes[0].durationMinutes || 60) * 60);
      }
    }
  }, [quizzes, isStandaloneMode, selectedQuiz]);

  // Derived effective quiz properties
  const effectiveConfig: QuizConfig = selectedQuiz || config;

  // Wall-clock state to refresh pre-exam timeline countdowns every 1s
  const [currentWallClock, setCurrentWallClock] = useState<number>(Date.now());
  useEffect(() => {
    if (hasStartedQuiz || isSubmitted) return;
    const timer = setInterval(() => {
      setCurrentWallClock(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [hasStartedQuiz, isSubmitted]);

  const currentTimeline = useMemo(() => {
    return evaluateTimeline(effectiveConfig, currentWallClock);
  }, [effectiveConfig, currentWallClock]);

  const rawQuestions: Question[] = useMemo(() => {
    if (selectedQuiz?.questions && selectedQuiz.questions.length > 0) {
      return selectedQuiz.questions;
    }
    if (questions && questions.length > 0) {
      return questions;
    }
    if (effectiveConfig?.questions && effectiveConfig.questions.length > 0) {
      return effectiveConfig.questions;
    }
    return QUESTIONS_DATA;
  }, [selectedQuiz, questions, effectiveConfig]);

  // Compute effective questions applying student's unique randomized question order & option alternative permutations
  const effectiveQuestions: Question[] = useMemo(() => {
    let orderedQuestions = rawQuestions;
    if (shuffledQuestionIds && shuffledQuestionIds.length > 0 && rawQuestions.length > 0) {
      const qMap = new Map<string, Question>();
      rawQuestions.forEach((q) => qMap.set(String(q.id), q));
      const ordered: Question[] = [];
      shuffledQuestionIds.forEach((id) => {
        const q = qMap.get(String(id));
        if (q) ordered.push(q);
      });
      // For Question Pool assessments, strictly limit to the drawn quota (do not append remaining questions from master bank)
      if (effectiveConfig.isQuestionPool && effectiveConfig.poolQuestionsToServe && effectiveConfig.poolQuestionsToServe > 0) {
        orderedQuestions = ordered.slice(0, effectiveConfig.poolQuestionsToServe);
      } else {
        // Append any questions not in the shuffled array for standard quizzes
        rawQuestions.forEach((q) => {
          if (!ordered.some((oq) => String(oq.id) === String(q.id))) {
            ordered.push(q);
          }
        });
        orderedQuestions = ordered.length > 0 ? ordered : rawQuestions;
      }
    } else if (effectiveConfig.isQuestionPool && effectiveConfig.poolQuestionsToServe && effectiveConfig.poolQuestionsToServe > 0 && rawQuestions.length > 0) {
      // Fallback if shuffledQuestionIds hasn't been initialized yet: limit strictly to drawn quota
      orderedQuestions = rawQuestions.slice(0, effectiveConfig.poolQuestionsToServe);
    }

    // Apply student's unique option permutation if option shuffling is active
    let finalList = orderedQuestions;
    if (shuffledOptionMaps && Object.keys(shuffledOptionMaps).length > 0) {
      const slotLabels: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
      finalList = orderedQuestions.map((q) => {
        const optionOrder = shuffledOptionMaps[String(q.id)];
        if (!optionOrder || !Array.isArray(optionOrder) || optionOrder.length === 0) {
          return q;
        }

        const origOptionsMap = new Map<string, MCQOption>();
        (q.options || []).forEach((opt) => origOptionsMap.set(opt.id, opt));

        const permutedOptions: MCQOption[] = optionOrder.map((origKey, idx) => {
          const origOpt = origOptionsMap.get(origKey);
          return {
            id: slotLabels[idx] || origKey,
            originalId: origKey,
            text: origOpt ? origOpt.text : '',
          };
        });

        // Append any options that might have been omitted from permutation array
        (q.options || []).forEach((origOpt) => {
          if (!permutedOptions.some((po) => po.originalId === origOpt.id)) {
            const nextIdx = permutedOptions.length;
            permutedOptions.push({
              id: slotLabels[nextIdx] || origOpt.id,
              originalId: origOpt.id,
              text: origOpt.text,
            });
          }
        });

        return {
          ...q,
          options: permutedOptions,
        };
      });
    }

    // Renumber questions sequentially 1..N for Question Pool exams
    if (effectiveConfig.isQuestionPool && effectiveConfig.poolQuestionsToServe) {
      return finalList.map((q, idx) => ({
        ...q,
        questionNumber: idx + 1
      }));
    }

    return finalList;
  }, [rawQuestions, shuffledQuestionIds, shuffledOptionMaps, effectiveConfig.isQuestionPool, effectiveConfig.poolQuestionsToServe]);

  const effectiveSections: QuizSection[] = useMemo(() => {
    if (selectedQuiz?.sections && selectedQuiz.sections.length > 0) {
      return selectedQuiz.sections;
    }
    if (sections && sections.length > 0) {
      return sections;
    }
    return INITIAL_QUIZ_SECTIONS;
  }, [selectedQuiz, sections]);

  // Strict Institutional Lockdown & Proctored Kiosk Derived Modes
  // Requirement 6: All quizzes automatically enter full screen mode with all shortcut locks.
  // Linearity, auto-skip on tab detection, and per-question timers are ascribed to lockdown mode.
  const isFullscreenLockdown = Boolean(
    effectiveConfig.enableFullscreenLockdown !== undefined
      ? effectiveConfig.enableFullscreenLockdown
      : (effectiveConfig.isQuestionPool ? true : false)
  );
  const isFullscreenEnforced = true; // All quizzes automatically run in full screen
  const isAntiCopyEnabled = true; // Shortcut & gesture locks active on all quizzes
  const isLinearExam = Boolean(
    effectiveConfig.linearExamMode !== undefined
      ? effectiveConfig.linearExamMode
      : isFullscreenLockdown
  );
  const isPerQuestionTimer = Boolean(
    effectiveConfig.perQuestionTimerEnabled !== undefined
      ? effectiveConfig.perQuestionTimerEnabled
      : isFullscreenLockdown
  );

  // Single Attempt Enforcement & Browser-level Attempt Lock
  const isSingleAttemptEnforced = Boolean(
    effectiveConfig.enforceSingleAttempt !== false &&
    (effectiveConfig.enforceSingleAttempt || effectiveConfig.preventMultipleAttempts || (effectiveConfig.attemptsAllowed !== undefined && effectiveConfig.attemptsAllowed <= 1))
  );
  const activeQuizId = effectiveConfig.id || effectiveConfig.code || 'quiz-001';
  const browserQuizLockCheck = isBrowserQuizAttemptLocked(activeQuizId);
  const isThisBrowserLocked = Boolean(isSingleAttemptEnforced && browserQuizLockCheck.locked);
  const isAutoSkipOnTabSwitch = Boolean(
    effectiveConfig.autoSkipOnTabSwitch !== undefined
      ? effectiveConfig.autoSkipOnTabSwitch
      : isFullscreenLockdown
  );

  // Auto-detect browser-level attempt lock when viewing instructions or before starting
  useEffect(() => {
    if (hasStartedQuiz || isSubmitted) return;
    if (isThisBrowserLocked && browserQuizLockCheck.submission) {
      setBlockedPriorSubmission(browserQuizLockCheck.submission);
    }
  }, [hasStartedQuiz, isSubmitted, isThisBrowserLocked, browserQuizLockCheck.submission]);

  // Screen Wake Lock API (keeps device screen awake throughout the quiz until exit)
  const wakeLockRef = React.useRef<any>(null);

  const requestScreenWakeLock = async () => {
    try {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && (navigator as any).wakeLock) {
        if (!wakeLockRef.current) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          wakeLockRef.current.addEventListener('release', () => {
            wakeLockRef.current = null;
          });
        }
      }
    } catch (err) {
      console.debug('Wake lock request notice:', err);
    }
  };

  const releaseScreenWakeLock = async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch (err) {
      console.debug('Wake lock release notice:', err);
    }
  };

  useEffect(() => {
    if (hasStartedQuiz && !isSubmitted) {
      requestScreenWakeLock();

      const handleVisibilityWakeLock = () => {
        if (document.visibilityState === 'visible') {
          requestScreenWakeLock();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityWakeLock);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityWakeLock);
        releaseScreenWakeLock();
      };
    } else {
      releaseScreenWakeLock();
    }
  }, [hasStartedQuiz, isSubmitted]);

  // ==========================================
  // Random Camera Proctoring (Webcam Surveillance)
  // ==========================================
  // REAL-TIME WEBCAM PROCTORING STATE & CONTROLS
  // ==========================================
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean>(false);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [isTestingCamera, setIsTestingCamera] = useState<boolean>(false);
  const [hasAcceptedCameraProctoring, setHasAcceptedCameraProctoring] = useState<boolean>(false);
  const [capturedPhotos, setCapturedPhotos] = useState<CameraCaptureItem[]>([]);
  const [lastCaptureFlash, setLastCaptureFlash] = useState<boolean>(false);
  const [lastCaptureIndex, setLastCaptureIndex] = useState<number>(0);

  // Live video feed playback and readiness tracking
  const [isPreviewVideoLive, setIsPreviewVideoLive] = useState<boolean>(false);
  const [previewCameraError, setPreviewCameraError] = useState<string | null>(null);
  const [isStartingPreviewCamera, setIsStartingPreviewCamera] = useState<boolean>(false);
  const [cameraPositionCorner, setCameraPositionCorner] = useState<'bottom-right' | 'bottom-left' | 'top-right'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      return 'top-right';
    }
    return 'bottom-right';
  });
  const [isCameraPreviewMinimized, setIsCameraPreviewMinimized] = useState<boolean>(false);

  const cameraStreamRef = React.useRef<MediaStream | null>(null);
  const capturedPhotosRef = React.useRef<CameraCaptureItem[]>([]);
  const captureTimeoutsRef = React.useRef<NodeJS.Timeout[]>([]);
  const scheduledCaptureTimesSecRef = React.useRef<number[]>([]);
  const previewVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const preExamVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const hiddenVideoRef = React.useRef<HTMLVideoElement | null>(null);

  // Helper to reliably bind a MediaStream to any HTML5 video element with autoplay and playsinline
  const attachStreamToVideo = React.useCallback((videoEl: HTMLVideoElement | null, stream: MediaStream | null) => {
    if (!videoEl) return;
    if (!stream) {
      videoEl.srcObject = null;
      return;
    }

    try {
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
      }
      videoEl.muted = true;
      videoEl.defaultMuted = true;
      videoEl.playsInline = true;
      videoEl.setAttribute('playsinline', 'true');
      videoEl.setAttribute('webkit-playsinline', 'true');
      videoEl.setAttribute('muted', 'true');

      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (videoEl.videoWidth > 0 && videoEl.readyState >= 2) {
              setIsPreviewVideoLive(true);
              setPreviewCameraError(null);
            }
          })
          .catch((err) => {
            console.warn('AutoPlay preview video warning:', err);
          });
      }
    } catch (err) {
      console.warn('Error attaching media stream to video element:', err);
    }
  }, []);

  // Synchronize stream with video elements whenever it updates
  useEffect(() => {
    cameraStreamRef.current = cameraStream;
    if (cameraStream) {
      if (previewVideoRef.current) {
        attachStreamToVideo(previewVideoRef.current, cameraStream);
      }
      if (preExamVideoRef.current) {
        attachStreamToVideo(preExamVideoRef.current, cameraStream);
      }
      if (hiddenVideoRef.current) {
        attachStreamToVideo(hiddenVideoRef.current, cameraStream);
      }
    }
  }, [cameraStream, attachStreamToVideo]);

  // Clean up all scheduled timers and release media tracks on unmount
  useEffect(() => {
    return () => {
      captureTimeoutsRef.current.forEach(clearTimeout);
      captureTimeoutsRef.current = [];
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {}
        });
        cameraStreamRef.current = null;
      }
    };
  }, []);

  // Universal camera stream starter with comprehensive browser, HTTPS, and device detection
  const startCameraStream = async (): Promise<MediaStream> => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      throw new Error('Camera access is only available in a browser environment.');
    }

    // Verify secure context (HTTPS / localhost required by all modern browsers for getUserMedia)
    if (window.isSecureContext === false && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      const secureMsg = 'Webcam access requires a secure connection (HTTPS). Please ensure you are accessing the quiz via HTTPS.';
      setCameraPermissionError(secureMsg);
      setPreviewCameraError(secureMsg);
      throw new Error(secureMsg);
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const supportMsg = 'Webcam media devices API is not supported or blocked by browser security settings.';
      setCameraPermissionError(supportMsg);
      setPreviewCameraError(supportMsg);
      throw new Error(supportMsg);
    }

    // Stop stale or ended tracks first
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (e) {}
      });
      cameraStreamRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
          frameRate: { ideal: 30, min: 15 },
        },
        audio: false,
      });

      // Monitor for unexpected stream termination or hardware disconnect
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          setIsPreviewVideoLive(false);
          setPreviewCameraError('Camera stream was closed or disconnected.');
        };
      });

      setCameraStream(stream);
      cameraStreamRef.current = stream;
      setCameraPermissionGranted(true);
      setIsCameraActive(true);
      setCameraPermissionError(null);
      setPreviewCameraError(null);

      // Attach immediately to available video DOM nodes
      if (previewVideoRef.current) {
        attachStreamToVideo(previewVideoRef.current, stream);
      }
      if (preExamVideoRef.current) {
        attachStreamToVideo(preExamVideoRef.current, stream);
      }
      if (hiddenVideoRef.current) {
        attachStreamToVideo(hiddenVideoRef.current, stream);
      }

      return stream;
    } catch (err: any) {
      console.error('Camera access error:', err);
      let msg = 'Camera access was denied or no camera device was detected. Camera permission is required for this proctored examination.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please click the camera icon in your browser address bar to allow camera access and retry.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera or webcam was detected on this device. Please connect a working webcam to proceed.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Camera is currently in use by another program or tab. Please close other video applications and retry.';
      } else if (err.name === 'OverconstrainedError') {
        // Fallback to basic video constraints
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280, min: 640 }, height: { ideal: 720, min: 480 } },
            audio: false,
          });
          setCameraStream(fallbackStream);
          cameraStreamRef.current = fallbackStream;
          setCameraPermissionGranted(true);
          setIsCameraActive(true);
          setCameraPermissionError(null);
          setPreviewCameraError(null);
          if (previewVideoRef.current) attachStreamToVideo(previewVideoRef.current, fallbackStream);
          if (preExamVideoRef.current) attachStreamToVideo(preExamVideoRef.current, fallbackStream);
          if (hiddenVideoRef.current) attachStreamToVideo(hiddenVideoRef.current, fallbackStream);
          return fallbackStream;
        } catch (fallbackErr) {
          msg = 'Could not access camera with requested constraints.';
        }
      }
      setCameraPermissionGranted(false);
      setCameraPermissionError(msg);
      setPreviewCameraError(msg);
      setIsPreviewVideoLive(false);
      throw new Error(msg);
    }
  };

  const requestCameraPermission = async () => {
    setIsTestingCamera(true);
    setCameraPermissionError(null);
    try {
      await startCameraStream();
    } catch (err) {
      // Handled and stored in state by startCameraStream
    } finally {
      setIsTestingCamera(false);
    }
  };

  // Automatically start and connect camera stream whenever student enters live quiz
  useEffect(() => {
    if (!effectiveConfig.enableCameraProctoring || !hasStartedQuiz || isSubmitted) {
      return;
    }

    let isMounted = true;
    setIsStartingPreviewCamera(true);

    const initActiveQuizCamera = async () => {
      let stream = cameraStreamRef.current;
      const isTrackActive =
        stream &&
        stream.getVideoTracks().length > 0 &&
        stream.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled);

      if (!isTrackActive) {
        try {
          stream = await startCameraStream();
        } catch (err: any) {
          if (!isMounted) return;
          setIsStartingPreviewCamera(false);
          setPreviewCameraError(err?.message || 'Camera permission required for proctoring.');
          return;
        }
      }

      if (!isMounted || !stream) return;

      if (previewVideoRef.current) {
        attachStreamToVideo(previewVideoRef.current, stream);
      }
      if (hiddenVideoRef.current) {
        attachStreamToVideo(hiddenVideoRef.current, stream);
      }

      setIsStartingPreviewCamera(false);
    };

    initActiveQuizCamera();

    return () => {
      isMounted = false;
    };
  }, [hasStartedQuiz, isSubmitted, effectiveConfig.enableCameraProctoring, attachStreamToVideo]);

  // Periodic heartbeat watcher to ensure live video preview is playing smoothly throughout exam
  useEffect(() => {
    if (!hasStartedQuiz || !effectiveConfig.enableCameraProctoring || isSubmitted) {
      return;
    }

    const interval = setInterval(() => {
      const vid = previewVideoRef.current;
      const stream = cameraStreamRef.current;

      if (vid && stream) {
        if (vid.srcObject !== stream) {
          attachStreamToVideo(vid, stream);
        } else if (vid.paused) {
          vid.play().catch(() => {});
        }

        if (vid.readyState >= 2 && vid.videoWidth > 0 && !vid.paused) {
          setIsPreviewVideoLive(true);
          setPreviewCameraError(null);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [hasStartedQuiz, effectiveConfig.enableCameraProctoring, isSubmitted, attachStreamToVideo]);

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      cameraStreamRef.current = null;
    }
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = null;
    }
    if (preExamVideoRef.current) {
      preExamVideoRef.current.srcObject = null;
    }
    if (hiddenVideoRef.current) {
      hiddenVideoRef.current.srcObject = null;
    }
    setCameraStream(null);
    setIsCameraActive(false);
    setIsPreviewVideoLive(false);
  };

  const generateRandomCaptureScheduleSeconds = (
    totalSec: number,
    count: number
  ): number[] => {
    if (count <= 0) return [];
    const safeTotal = Math.max(60, totalSec);

    // 1. First capture must be truly random shortly after the quiz starts
    const maxFirst = Math.min(45, Math.max(20, Math.floor(safeTotal / (count * 2))));
    const minFirst = Math.min(12, maxFirst - 5);
    const firstCapture = Math.floor(minFirst + Math.random() * (maxFirst - minFirst + 1));

    if (count === 1) return [firstCapture];

    // 2. The remaining count - 1 captures must be unpredictably scattered
    const remainingCount = count - 1;
    const availableSpan = Math.max(remainingCount * 25, safeTotal - firstCapture - 30);
    const segmentLength = availableSpan / remainingCount;
    const times: number[] = [firstCapture];

    for (let i = 0; i < remainingCount; i++) {
      const segStart = firstCapture + 15 + i * segmentLength;
      const segEnd = segStart + segmentLength;
      // High random non-uniform jitter inside segment
      const randSec = Math.floor(segStart + Math.random() * (segEnd - segStart));
      times.push(randSec);
    }

    times.sort((a, b) => a - b);

    // Enforce minimum separation of 15 seconds so captures don't clump
    for (let i = 1; i < times.length; i++) {
      if (times[i] <= times[i - 1] + 12) {
        times[i] = times[i - 1] + 15 + Math.floor(Math.random() * 10);
      }
    }

    return times;
  };

  const takeCameraSnapshot = (captureIndex: number, totalScheduled: number) => {
    const stream = cameraStreamRef.current;
    if (!stream) return;

    try {
      let video = previewVideoRef.current;
      if (!video || video.readyState < 2) {
        video = hiddenVideoRef.current;
      }
      if (!video || !video.videoWidth || !video.videoHeight) {
        // If video not fully initialized yet, retry in 1.5 seconds
        setTimeout(() => takeCameraSnapshot(captureIndex, totalScheduled), 1500);
        return;
      }

      const canvas = document.createElement('canvas');
      const vWidth = video.videoWidth || 1280;
      const vHeight = video.videoHeight || 720;

      // High-resolution snapshot capture: up to 1440x810 / 1280x720 for crisp facial and identity clarity
      const targetWidth = Math.min(Math.max(vWidth, 960), 1440);
      const targetHeight = Math.round((vHeight / vWidth) * targetWidth) || 720;
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      // High quality bicubic smoothing for ultra-sharp proctor photographs
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Mirror horizontally so the picture appears as seen by student
      ctx.save();
      ctx.translate(targetWidth, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      ctx.restore();

      // Forensic watermark footer across the bottom of the photo
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      const barHeight = Math.max(30, Math.round(targetHeight * 0.055));
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, targetHeight - barHeight, targetWidth, barHeight);

      // Green live indicator dot
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(16, targetHeight - Math.round(barHeight / 2), 5, 0, 2 * Math.PI);
      ctx.fill();

      // Text label: Do NOT disclose totalScheduled count to student
      ctx.fillStyle = '#ffffff';
      const fontSize = Math.max(11, Math.round(targetWidth * 0.0125));
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.fillText(
        `PROCTOR REC • ${studentInfo.name || 'Candidate'} • ${timeStr} (${dateStr}) • Photo #${captureIndex} • LIVE PROCTOR VERIFIED`,
        30,
        targetHeight - Math.round(barHeight / 2) + Math.round(fontSize / 3)
      );

      // High quality JPEG (0.90 quality for crisp facial details and sharp resolution)
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.90);

      const captureId = `cap-${(studentInfo.studentId || studentInfo.email || 'std').replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}-${captureIndex}`;
      const captureItem: CameraCaptureItem = {
        id: captureId,
        studentId: studentInfo.studentId || studentInfo.email || 'STD',
        studentName: studentInfo.name || 'Candidate',
        quizId: effectiveConfig.id || effectiveConfig.code || 'quiz-001',
        quizTitle: effectiveConfig.title || effectiveConfig.subject || 'Examination',
        timestamp: now.toISOString(),
        imageDataUrl: compressedDataUrl,
        captureIndex,
        totalScheduled,
        createdAt: now.toISOString(),
      };

      capturedPhotosRef.current = [...capturedPhotosRef.current, captureItem];
      setCapturedPhotos([...capturedPhotosRef.current]);

      setLastCaptureFlash(true);
      setLastCaptureIndex(captureIndex);
      setTimeout(() => setLastCaptureFlash(false), 3000);

      // Upload to Node Server
      fetch('/api/camera-captures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(captureItem),
      }).catch((err) => console.warn('Camera capture server upload notice:', err));

      // Upload to Firestore
      saveCameraCaptureToFirestore(captureItem).catch((err) =>
        console.warn('Camera capture Firestore upload notice:', err)
      );
    } catch (err) {
      console.warn('Error taking camera snapshot:', err);
    }
  };

  // Ref to track legitimate internal user clicks so button clicks NEVER trigger tab switch alerts
  const isInternalInteractionRef = React.useRef<boolean>(false);

  const markInternalInteraction = () => {
    isInternalInteractionRef.current = true;
    setTimeout(() => {
      isInternalInteractionRef.current = false;
    }, 1000);
  };

  // Safe navigation handlers that prevent spurious tab switch / blur triggers on button clicks
  const goToNextQuestion = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    markInternalInteraction();
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const curr = currentQuestionIndexRef.current;
    if (curr < effectiveQuestions.length - 1) {
      const nextIdx = curr + 1;
      setCurrentQuestionIndex(nextIdx);
      currentQuestionIndexRef.current = nextIdx;
      questionTargetEndTimeRef.current = Date.now() + perQuestionDurationSeconds * 1000;
      setQuestionTimeRemaining(perQuestionDurationSeconds);
      lastQuestionBeepSecondRef.current = null;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setShowConfirmModal(true);
    }
  };

  const goToPrevQuestion = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    markInternalInteraction();
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const curr = currentQuestionIndexRef.current;
    if (curr > 0) {
      const prevIdx = curr - 1;
      setCurrentQuestionIndex(prevIdx);
      currentQuestionIndexRef.current = prevIdx;
      questionTargetEndTimeRef.current = Date.now() + perQuestionDurationSeconds * 1000;
      setQuestionTimeRemaining(perQuestionDurationSeconds);
      lastQuestionBeepSecondRef.current = null;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Per-Question Duration calculation (total time divided by number of questions)
  const totalExamDurationSeconds = Math.max(60, (effectiveConfig.durationMinutes || 60) * 60);
  const totalQuestionsCount = Math.max(1, effectiveQuestions.length || effectiveConfig.totalQuestions || 40);
  const perQuestionDurationSeconds = Math.max(15, Math.floor(totalExamDurationSeconds / totalQuestionsCount));
  questionDurationSecRef.current = perQuestionDurationSeconds;
  const safeQuestionIndex = Math.min(currentQuestionIndex, Math.max(0, effectiveQuestions.length - 1));
  const isPaginated = isMobileScreen || isLinearExam || effectiveConfig.questionPaginationMode === 'one-question-per-page';

  // Per-Question Countdown Timer Effect with Wall-Clock Calculation, Audible Warning (<10s) & Auto-Advance
  useEffect(() => {
    if (!hasStartedQuiz || isSubmitted || !isPerQuestionTimer) return;

    // Initialize target end time on start or question transition
    questionTargetEndTimeRef.current = Date.now() + perQuestionDurationSeconds * 1000;
    setQuestionTimeRemaining(perQuestionDurationSeconds);

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((questionTargetEndTimeRef.current - Date.now()) / 1000));
      setQuestionTimeRemaining(remaining);

      // Audible countdown warning beep when remaining time is 10s down to 1s
      if (remaining <= 10 && remaining > 0) {
        if (lastQuestionBeepSecondRef.current !== remaining) {
          lastQuestionBeepSecondRef.current = remaining;
          playCountdownBeep(remaining, isAudioMuted);
        }
      }

      // Auto-save answer and advance to next question when time elapses (hits 0)
      if (remaining <= 0) {
        playForfeitWarningSound(isAudioMuted);
        const currentIdx = currentQuestionIndexRef.current;
        if (currentIdx < effectiveQuestions.length - 1) {
          const nextIdx = currentIdx + 1;
          setCurrentQuestionIndex(nextIdx);
          currentQuestionIndexRef.current = nextIdx;
          lastQuestionBeepSecondRef.current = null;
          questionTargetEndTimeRef.current = Date.now() + perQuestionDurationSeconds * 1000;
          setQuestionTimeRemaining(perQuestionDurationSeconds);
        } else {
          // Last question time expired -> complete exam
          handleFinalSubmit();
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [hasStartedQuiz, isSubmitted, isPerQuestionTimer, perQuestionDurationSeconds, effectiveQuestions.length, isAudioMuted]);

  // Helper to sync active student session with server for teacher live monitoring.
  // Implements queue buffering: local session & broadcast update immediately, while cloud network
  // dispatches (Firestore + Node server) are debounced by 2.5 seconds (or flushed immediately on critical events)
  const syncActiveStudentSession = (overrides?: Record<string, any>, isImmediate: boolean = false) => {
    try {
      const raw = localStorage.getItem('mcq_exam_active_session');
      let baseSession: any = {};
      if (raw) {
        try {
          baseSession = JSON.parse(raw);
        } catch (e) {}
      }

      const mergedOverrides = {
        ...pendingSessionOverridesRef.current,
        ...(overrides || {}),
      };
      pendingSessionOverridesRef.current = mergedOverrides;

      const now = Date.now();
      const targetEndTime = mergedOverrides?.targetEndTime !== undefined
        ? mergedOverrides.targetEndTime
        : (baseSession.targetEndTime || (now + (effectiveConfig.durationMinutes || 60) * 60 * 1000));
      const remaining = mergedOverrides?.remainingSeconds !== undefined
        ? mergedOverrides.remainingSeconds
        : Math.max(0, Math.floor((targetEndTime - now) / 1000));
      
      const qId = effectiveConfig.id || effectiveConfig.code || baseSession.quizId || 'quiz-001';
      const sId = studentInfo.studentId || baseSession.studentId || 'std-1';

      const currentTabCount = typeof mergedOverrides?.tabSwitchesCount === 'number'
        ? mergedOverrides.tabSwitchesCount
        : (typeof tabSwitchesCountRef.current === 'number' && tabSwitchesCountRef.current > 0 ? tabSwitchesCountRef.current : tabSwitchesCount);

      const payload = {
        id: baseSession.id || `sess-${sId}-${qId}`,
        quizId: qId,
        quizTitle: effectiveConfig.title || effectiveConfig.subject || baseSession.quizTitle || 'MCQ Assessment',
        quizCode: effectiveConfig.code || baseSession.quizCode || '',
        subject: effectiveConfig.subject || baseSession.subject || 'Mathematics',
        studentId: sId,
        studentName: studentInfo.name || baseSession.studentName || 'Student Candidate',
        studentEmail: studentInfo.email || baseSession.studentEmail || '',
        classGroup: studentInfo.classGroup || baseSession.classGroup || '',
        school: studentInfo.school || baseSession.school || '',
        startTime: baseSession.startTime || now,
        targetEndTime,
        durationMinutes: baseSession.durationMinutes || effectiveConfig.durationMinutes || 60,
        totalDurationSeconds: baseSession.totalDurationSeconds || (effectiveConfig.durationMinutes || 60) * 60,
        remainingSeconds: remaining,
        tabSwitchesCount: currentTabCount,
        windowExitsCount: typeof mergedOverrides?.windowExitsCount === 'number' ? mergedOverrides.windowExitsCount : windowExitsCount,
        questionsAnsweredCount: typeof mergedOverrides?.questionsAnsweredCount === 'number' ? mergedOverrides.questionsAnsweredCount : Object.keys(answers).length,
        totalQuestions: effectiveQuestions.length || effectiveConfig.totalQuestions || 40,
        lastHeartbeat: new Date().toISOString(),
        status: (isSubmitted ? 'submitted' : 'in_progress') as 'in_progress' | 'submitted' | 'expired',
        ...mergedOverrides,
      };

      // 1. Keep local session updated immediately for resilience
      try {
        localStorage.setItem('mcq_exam_active_session', JSON.stringify({ ...baseSession, ...payload }));
      } catch (e) {}

      // 2. Instant Browser Tab Broadcast (zero network cost)
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const channel = new BroadcastChannel('mcq_exam_channel');
          channel.postMessage({
            type: 'ACTIVE_SESSION_UPDATE',
            session: payload,
          });
          channel.close();
        } catch (e) {}
      }

      // 3. Network Dispatches: Execute immediately if critical (e.g. submit/expired/proctor penalty) or debounce by 2.5s
      const dispatchCloudSync = () => {
        pendingSessionOverridesRef.current = {};
        // Direct Firestore Real-Time Sync
        saveActiveSessionToFirestore(payload).catch((err) => console.warn('Active session Firestore sync notice:', err));
        // Node Server Sync
        fetch('/api/sync/active-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch((err) => console.warn('Active session server sync notice:', err));
      };

      if (isImmediate || isSubmitted || payload.status === 'submitted' || payload.status === 'expired') {
        if (sessionSyncDebounceTimerRef.current) {
          clearTimeout(sessionSyncDebounceTimerRef.current);
          sessionSyncDebounceTimerRef.current = null;
        }
        dispatchCloudSync();
      } else {
        if (sessionSyncDebounceTimerRef.current) {
          clearTimeout(sessionSyncDebounceTimerRef.current);
        }
        sessionSyncDebounceTimerRef.current = setTimeout(() => {
          sessionSyncDebounceTimerRef.current = null;
          dispatchCloudSync();
        }, 2500);
      }
    } catch (err) {
      console.warn('Session sync warning:', err);
    }
  };

  // Helper to ensure examination remains in strict fullscreen mode & locks hardware shortcuts
  const requestKeyboardLock = () => {
    if (typeof navigator !== 'undefined' && 'keyboard' in navigator && (navigator as any).keyboard?.lock) {
      try {
        (navigator as any).keyboard.lock([
          'Escape',
          'Meta',
          'MetaLeft',
          'MetaRight',
          'Alt',
          'AltLeft',
          'AltRight',
          'Tab',
          'F1',
          'F2',
          'F3',
          'F4',
          'F5',
          'F6',
          'F7',
          'F8',
          'F9',
          'F10',
          'F11',
          'F12',
        ]).catch(() => {
          try {
            (navigator as any).keyboard.lock().catch(() => {});
          } catch (e) {}
        });
      } catch (e) {}
    }
  };

  const ensureFullscreen = () => {
    try {
      const doc = document as any;
      const isCurrentlyFullscreen = Boolean(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      if (!isCurrentlyFullscreen) {
        const docEl = document.documentElement as any;
        const options = { navigationUI: 'hide' } as any;
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen(options).then(() => {
            requestKeyboardLock();
          }).catch(() => {
            docEl.requestFullscreen().then(() => {
              requestKeyboardLock();
            }).catch(() => {});
          });
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen(options);
          setTimeout(requestKeyboardLock, 250);
        } else if (docEl.mozRequestFullScreen) {
          docEl.mozRequestFullScreen(options);
          setTimeout(requestKeyboardLock, 250);
        } else if (docEl.msRequestFullscreen) {
          docEl.msRequestFullscreen(options);
          setTimeout(requestKeyboardLock, 250);
        }
      } else {
        requestKeyboardLock();
      }
    } catch (err) {
      console.warn('ensureFullscreen failed:', err);
    }
  };

  // CHEAT-PROOF REAL-TIME TIMER ENGINE & PAGE VISIBILITY API
  // Calculates remaining time accurately via wall-clock targetEndTime - Date.now()
  useEffect(() => {
    if (!hasStartedQuiz || isSubmitted) return;

    let heartbeatCount = 0;
    const checkAndSyncExamClock = () => {
      const rawSession = localStorage.getItem('mcq_exam_active_session');
      if (rawSession) {
        try {
          const session = JSON.parse(rawSession);
          const now = Date.now();
          const remaining = Math.max(0, Math.floor((session.targetEndTime - now) / 1000));
          
          setTimeRemainingSeconds(remaining);

          // Trigger 1-minute warning sound once when entering final 60 seconds
          if (remaining <= 60 && remaining > 50 && !hasPlayedOneMinuteWarningRef.current) {
            hasPlayedOneMinuteWarningRef.current = true;
            playOneMinuteWarningSound(isAudioMuted);
          }

          // Trigger audible countdown beeps for each second in the final 10 seconds down to 0
          if (remaining <= 10 && remaining >= 0) {
            if (lastBeepSecondRef.current !== remaining) {
              lastBeepSecondRef.current = remaining;
              playCountdownBeep(remaining, isAudioMuted);
            }
          }

          // Periodic live heartbeat every ~3 seconds (6 ticks of 500ms)
          heartbeatCount++;
          if (heartbeatCount % 6 === 0) {
            syncActiveStudentSession({ remainingSeconds: remaining });
          }

          if (remaining <= 0) {
            // Auto-submit immediately when clock hits 0
            handleFinalSubmit();
          }
          return remaining;
        } catch (e) {
          console.error('Error syncing exam clock:', e);
        }
      } else {
        // Fallback if session storage missing
        setTimeRemainingSeconds((prev) => {
          if (prev <= 1) {
            handleFinalSubmit();
            return 0;
          }
          return prev - 1;
        });
      }
      return 0;
    };

    // Frequent interval check (every 500ms) ensuring continuous background/foreground precision
    const interval = setInterval(checkAndSyncExamClock, 500);

    // Page Visibility & Window Switch Integrity Handler with Immutable Incident Logging
    const recordTabSwitchViolation = (triggerReason: string = 'Tab unfocused / switched away') => {
      // If already submitted, currently submitting, or auto-submit countdown is active, freeze counting immediately
      if (isSubmittingRef.current || autoSubmitPendingRef.current || isSubmitted) {
        return;
      }

      // Suppress spurious violations caused by internal UI clicks (e.g. Next / Previous / Option buttons)
      if (isInternalInteractionRef.current) {
        return;
      }

      const now = Date.now();
      // 1500ms debounce strictly prevents synthetic duplicate increments between blur and visibilitychange
      if (now - lastTabSwitchTimestampRef.current < 1500) {
        tabUnfocusedAtRef.current = now;
        return;
      }
      lastTabSwitchTimestampRef.current = now;
      tabUnfocusedAtRef.current = now;

      const rawCount = (tabSwitchesCountRef.current || 0) + 1;
      const hasPenalties = Boolean(effectiveConfig.progressiveTabPenalty || effectiveConfig.enableTabSwitchPenalties);
      // When progressive penalties are enabled, cap strict count at 3 strikes to avoid phantom 4/5 counts
      const nextCount = hasPenalties ? Math.min(rawCount, 3) : rawCount;

      tabSwitchesCountRef.current = nextCount;
      setTabSwitchesCount(nextCount);

      // Append to immutable incident log
      const violationTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const incidentEvent: IntegrityEvent = {
        id: `ev-${now}-${Math.random().toString(36).substring(2, 7)}`,
        type: 'tab_switch',
        timestamp: new Date().toISOString(),
        studentName: studentInfo.name || 'Candidate',
        studentId: studentInfo.studentId || 'N/A',
        details: `${triggerReason} (Incident #${nextCount}) at ${violationTimeStr}`,
        severity: nextCount >= 3 ? 'critical' : nextCount === 2 ? 'high' : 'medium',
      };
      integrityEventsRef.current.push(incidentEvent);

      let deductionSec = 0;
      let willAutoSubmit = false;

      if (hasPenalties) {
        if (nextCount === 1) {
          deductionSec = 120; // 1st strike: 2 minutes penalty
          setLastPenaltyDeductionMinutes(2);
        } else if (nextCount === 2) {
          deductionSec = 300; // 2nd strike: 5 minutes penalty
          setLastPenaltyDeductionMinutes(5);
        } else if (nextCount >= 3) {
          willAutoSubmit = true;
          autoSubmitPendingRef.current = true;
          setIsAutoSubmittingDueToPenalties(true);
          setLastPenaltyDeductionMinutes(0);
        }
      }

      let updatedRemaining = 0;
      let newTargetEndTime = 0;
      try {
        const raw = localStorage.getItem('mcq_exam_active_session');
        if (raw) {
          const sess = JSON.parse(raw);
          sess.tabSwitchesCount = nextCount;
          sess.integrityEvents = integrityEventsRef.current;
          if (hasPenalties && deductionSec > 0) {
            sess.targetEndTime = Math.max(Date.now() + 3000, Number(sess.targetEndTime) - (deductionSec * 1000));
          }
          newTargetEndTime = sess.targetEndTime;
          localStorage.setItem('mcq_exam_active_session', JSON.stringify(sess));
          updatedRemaining = Math.max(0, Math.floor((sess.targetEndTime - Date.now()) / 1000));
        }
      } catch (err) {
        console.warn('Tab switch penalty calculation error:', err);
      }

      if (updatedRemaining > 0) {
        setTimeRemainingSeconds(updatedRemaining);
      }

      // Immediately sync tab switch count and audit events to server for live teacher surveillance
      syncActiveStudentSession({
        tabSwitchesCount: nextCount,
        integrityEvents: integrityEventsRef.current,
        ...(newTargetEndTime ? { targetEndTime: newTargetEndTime } : {}),
        ...(updatedRemaining > 0 ? { remainingSeconds: updatedRemaining } : {}),
      });

      setTabSwitchBannerNotice(true);

      // Modification 3: Auto-Skip on Tab Switch / Leaving Page
      // When a student leaves the quiz page or switches tabs, mark current question as blank and advance
      if (isAutoSkipOnTabSwitch && !isSubmitted && !isSubmittingRef.current && !willAutoSubmit) {
        const currIdx = currentQuestionIndexRef.current;
        const currentQ = effectiveQuestions[currIdx];
        const qNum = currIdx + 1;

        // 1. Mark current question as BLANK by removing it from answers
        if (currentQ) {
          setAnswers((prev) => {
            const next = { ...prev };
            delete next[currentQ.id];
            return next;
          });
        }

        playForfeitWarningSound(isAudioMuted);

        // 2. Record immutable audit timeline event
        const skipEvent: IntegrityEvent = {
          id: `ev-skip-${now}-${Math.random().toString(36).substring(2, 7)}`,
          type: 'tab_switch',
          timestamp: new Date().toISOString(),
          studentName: studentInfo.name || 'Candidate',
          studentId: studentInfo.studentId || 'N/A',
          details: `Kiosk Rule: Left quiz page / switched tab on Question #${qNum}. Marked BLANK & auto-skipped.`,
          severity: 'high',
        };
        integrityEventsRef.current.push(skipEvent);

        // 3. Move to next question or submit if on final question
        if (currIdx < effectiveQuestions.length - 1) {
          const nextIdx = currIdx + 1;
          setCurrentQuestionIndex(nextIdx);
          currentQuestionIndexRef.current = nextIdx;
          setQuestionTimeRemaining(perQuestionDurationSeconds);
          lastQuestionBeepSecondRef.current = null;
          setAutoSkipNotice(`⚠️ Integrity Rule: Question #${qNum} was forfeited (marked BLANK) because you navigated away from the exam.`);
        } else {
          setAutoSkipNotice(`⚠️ Integrity Rule: Navigated away on final Question #${qNum}. Marked BLANK and assessment submitted.`);
          if (!autoSubmitTimerRef.current) {
            autoSubmitTimerRef.current = setTimeout(() => {
              handleFinalSubmit();
            }, 1200);
          }
        }
      }

      if (willAutoSubmit && !autoSubmitTimerRef.current) {
        autoSubmitTimerRef.current = setTimeout(() => {
          handleFinalSubmit();
        }, 1800);
      }
    };
    recordTabSwitchViolationRef.current = recordTabSwitchViolation;

    // Page Visibility API - detects tab switches, window minimization, or app backgrounding
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 1. Student switched away or minimized tab
        setIsScreenShieldActive(true);
        recordTabSwitchViolation('Tab switched away / application backgrounded');
      } else {
        // 2. Student returned to the exam tab: measure duration unfocused and update last incident details
        if (tabUnfocusedAtRef.current) {
          const durationUnfocusedSec = Math.max(1, Math.round((Date.now() - tabUnfocusedAtRef.current) / 1000));
          if (integrityEventsRef.current.length > 0) {
            const lastEvent = integrityEventsRef.current[integrityEventsRef.current.length - 1];
            if (lastEvent && lastEvent.type === 'tab_switch' && !lastEvent.durationSeconds) {
              lastEvent.durationSeconds = durationUnfocusedSec;
              lastEvent.details += ` (Unfocused for ${durationUnfocusedSec}s)`;
            }
          }
          tabUnfocusedAtRef.current = null;
        }

        checkAndSyncExamClock();
        if (tabSwitchesCountRef.current > 0) {
          setIsIntegrityModalOpen(true);
          setTabSwitchBannerNotice(true);
        }
        setIsScreenShieldActive(false);
      }
    };

    const handleWindowBlur = () => {
      // Suppress blur if candidate just clicked an internal quiz control (e.g. Next, Previous, Option button)
      if (isInternalInteractionRef.current) {
        return;
      }

      // Debounce window blur to 600ms to avoid false alarms from transient OS notifications or native permission prompts
      setTimeout(() => {
        if (isInternalInteractionRef.current) return;
        if (typeof document !== 'undefined' && document.hasFocus && document.hasFocus()) {
          return;
        }
        // If document is already hidden, visibilitychange handles genuine tab/app switch
        if (document.hidden) {
          return;
        }
        // Verify genuine loss of focus before recording a violation
        if (typeof document !== 'undefined' && !document.hasFocus()) {
          // Shield exam contents immediately so external screen-grabbers only capture the protective layer
          setIsScreenShieldActive(true);
          recordTabSwitchViolation('Exam window lost focus / external application activated');
        }
      }, 600);
    };

    const handleWindowFocus = () => {
      if (tabUnfocusedAtRef.current) {
        const durationUnfocusedSec = Math.max(1, Math.round((Date.now() - tabUnfocusedAtRef.current) / 1000));
        if (integrityEventsRef.current.length > 0) {
          const lastEvent = integrityEventsRef.current[integrityEventsRef.current.length - 1];
          if (lastEvent && lastEvent.type === 'tab_switch' && !lastEvent.durationSeconds) {
            lastEvent.durationSeconds = durationUnfocusedSec;
            lastEvent.details += ` (Unfocused for ${durationUnfocusedSec}s)`;
          }
        }
        tabUnfocusedAtRef.current = null;
      }

      checkAndSyncExamClock();
      if (tabSwitchesCountRef.current > 0) {
        setIsIntegrityModalOpen(true);
        setTabSwitchBannerNotice(true);
      }
      // Remove shield when window is actively refocused
      setIsScreenShieldActive(false);
    };

    const triggerScreenshotDefense = (reason: string) => {
      // Overwrite clipboard immediately to neutralize any captured screen content
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('⚠️ Examination Content Protected - Screen capture is strictly prohibited for test integrity.');
        }
      } catch (err) {
        console.warn('Clipboard clear prevented:', err);
      }

      setIsScreenShieldActive(true);
      setScreenshotAlert(reason);

      // Increment integrity violation count
      setWindowExitsCount((prev) => prev + 1);

      // Append security incident to immutable audit timeline
      const violationTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const secEvent: IntegrityEvent = {
        id: `ev-sec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type: 'screenshot_attempt',
        timestamp: new Date().toISOString(),
        studentName: studentInfo.name || 'Candidate',
        studentId: studentInfo.studentId || 'N/A',
        details: `${reason} at ${violationTimeStr}`,
        severity: 'high',
      };
      integrityEventsRef.current.push(secEvent);

      setTimeout(() => {
        if (!document.hidden && document.hasFocus()) {
          setIsScreenShieldActive(false);
        }
      }, 2500);

      setTimeout(() => {
        setScreenshotAlert(null);
      }, 5000);
    };
    triggerScreenshotDefenseRef.current = triggerScreenshotDefense;

    // Top-Edge Tab Switch Detection: Active detection zone & violation trigger without terminating or exiting fullscreen
    let lastEdgeTriggerTime = 0;
    const triggerTopEdgeViolation = (actionDetail: string) => {
      if (!hasStartedQuiz || isSubmitted) return;
      const now = Date.now();
      if (now - lastEdgeTriggerTime < 1200) return;
      lastEdgeTriggerTime = now;

      ensureFullscreen();
      triggerScreenshotDefense(actionDetail);
      recordTabSwitchViolation(actionDetail);
      setIsIntegrityModalOpen(true);
      setTabSwitchBannerNotice(true);
    };
    triggerTopEdgeViolationRef.current = triggerTopEdgeViolation;

    // Window-level top-edge detection: cursor/pointer moving near or at the top edge (calibrated to extreme edge)
    const handlePointerMoveTopEdge = (e: MouseEvent | PointerEvent) => {
      if (!hasStartedQuiz || isSubmitted) return;
      if (e.clientY <= 12) {
        triggerTopEdgeViolation('Cursor/Pointer moved to top screen edge zone (browser tab/toolbar access attempt)');
      }
    };

    // Stricter detection for all presses at the extreme top edge (mouse click, touch tap, pointer press)
    const handlePointerDownTopEdge = (e: MouseEvent | PointerEvent) => {
      if (!hasStartedQuiz || isSubmitted) return;
      if (e.clientY <= 15) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        triggerTopEdgeViolation('Top screen edge press/click intercepted (attempted tab switch)');
      }
    };

    // Detect cursor leaving window across the top boundary (towards tabs or browser address bar)
    const handleMouseLeaveTopBoundary = (e: MouseEvent) => {
      if (!hasStartedQuiz || isSubmitted) return;
      if (e.clientY <= 5 || (e.relatedTarget === null && e.clientY <= 15)) {
        triggerTopEdgeViolation('Cursor moved outside top boundary of exam viewport (attempted tab switch)');
      }
    };

    // Mobile Phone Screen Toggle and Gesture Interceptors (Prevent switches from up, down, sides, multi-finger)
    const handleTouchStart = (e: TouchEvent) => {
      if (!hasStartedQuiz || isSubmitted) return;

      const target = e.target as HTMLElement | null;
      if (target && (target.closest('button') || target.closest('input') || target.closest('.quiz-option-button'))) {
        // Interactive button or option tap inside quiz area - do not intercept
        markInternalInteraction();
        return;
      }

      // Multi-finger gesture detection on phones (e.g. 2-finger swipe, 3-finger screenshot, pinch, zoom, app switch)
      if (e.touches && e.touches.length >= 2) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        ensureFullscreen();
        triggerScreenshotDefense('Multi-finger gesture / swipe blocked on phone!');
        recordTabSwitchViolation('Multi-finger swipe/screenshot gesture detected on phone');
        setIsIntegrityModalOpen(true);
        setTabSwitchBannerNotice(true);
        return;
      }

      // Screen toggles from extreme edges on phones (pulling notification bar, app switcher bar, back swipe)
      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        const clientX = touch.clientX;
        const clientY = touch.clientY;
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        touchStartRef.current = { x: clientX, y: clientY, time: Date.now() };

        const isTopToggle = clientY <= 40; // Top notification / status bar pull
        const isBottomToggle = clientY >= screenH - 40; // Bottom home bar / app switcher
        const isLeftToggle = clientX <= 35; // Left edge swipe back
        const isRightToggle = clientX >= screenW - 35; // Right edge swipe back / side panel

        if (isTopToggle || isBottomToggle || isLeftToggle || isRightToggle) {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          ensureFullscreen();
          const sideName = isTopToggle
            ? 'Top Notification/Status bar'
            : isBottomToggle
            ? 'Bottom Navigation/Home bar'
            : isLeftToggle
            ? 'Left Edge Back Gesture'
            : 'Right Edge Gesture / Side Panel';
          triggerScreenshotDefense(`Screen toggle blocked from ${sideName}!`);
          recordTabSwitchViolation(`Phone screen toggle blocked from ${sideName}`);
          setIsIntegrityModalOpen(true);
          setTabSwitchBannerNotice(true);
          return;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!hasStartedQuiz || isSubmitted) return;

      const target = e.target as HTMLElement | null;
      const isScrollableContent = target && target.closest('.quiz-content-area');

      // Multi-finger swipe during move
      if (e.touches && e.touches.length >= 2) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        ensureFullscreen();
        triggerScreenshotDefense('Multi-finger swipe blocked on phone!');
        recordTabSwitchViolation('Multi-finger swipe gesture detected on phone');
        setIsIntegrityModalOpen(true);
        setTabSwitchBannerNotice(true);
        return;
      }

      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        const clientX = touch.clientX;
        const clientY = touch.clientY;
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        const isTopToggle = clientY <= 40;
        const isBottomToggle = clientY >= screenH - 40;
        const isLeftToggle = clientX <= 35;
        const isRightToggle = clientX >= screenW - 35;

        if (isTopToggle || isBottomToggle || isLeftToggle || isRightToggle) {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          ensureFullscreen();
          const sideName = isTopToggle ? 'Top' : isBottomToggle ? 'Bottom' : isLeftToggle ? 'Left Edge' : 'Right Edge';
          triggerScreenshotDefense(`Screen toggle swipe blocked from ${sideName}!`);
          recordTabSwitchViolation(`Phone screen toggle swipe blocked from ${sideName}`);
          setIsIntegrityModalOpen(true);
          setTabSwitchBannerNotice(true);
          return;
        }

        // Horizontal swipe gesture across phone (to switch tabs / apps / go back)
        if (touchStartRef.current) {
          const dx = clientX - touchStartRef.current.x;
          const dy = clientY - touchStartRef.current.y;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) {
            if (!isScrollableContent) {
              if (e.cancelable) e.preventDefault();
              e.stopPropagation();
              ensureFullscreen();
              triggerScreenshotDefense('Horizontal navigation swipe blocked on phone!');
              recordTabSwitchViolation('Horizontal navigation swipe gesture detected on phone');
              setIsIntegrityModalOpen(true);
              setTabSwitchBannerNotice(true);
              touchStartRef.current = null;
              return;
            }
          }
        }
      }
    };

    const handleTouchCancel = (e: TouchEvent) => {
      if (isInternalInteractionRef.current) return;
      if (hasStartedQuiz && !isSubmitted) {
        ensureFullscreen();
        recordTabSwitchViolation('Phone screen toggle / system notification overlay intercepted exam viewport');
        setIsIntegrityModalOpen(true);
        setTabSwitchBannerNotice(true);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!hasStartedQuiz || isSubmitted) return;

      const key = e.key;
      const code = e.code || '';
      const isAlt = e.altKey;
      const isCtrl = e.ctrlKey;
      const isMeta = e.metaKey; // Windows / Command / Super key
      const isShift = e.shiftKey;

      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInput = targetTag === 'input' || targetTag === 'textarea';

      // Identify Forward Navigation keys
      const isForwardNav =
        key === 'ArrowRight' ||
        key === 'ArrowDown' ||
        key === 'PageDown' ||
        code === 'ArrowRight' ||
        code === 'ArrowDown' ||
        code === 'PageDown';

      // Identify Backward Navigation keys
      const isBackwardNav =
        key === 'ArrowLeft' ||
        key === 'ArrowUp' ||
        key === 'PageUp' ||
        code === 'ArrowLeft' ||
        code === 'ArrowUp' ||
        code === 'PageUp' ||
        (!isInput && (key === 'Backspace' || code === 'Backspace'));

      // If user is inside an input field (e.g. calculator input) and pressing standard typing keys:
      if (isInput && !isAlt && !isCtrl && !isMeta && key !== 'Escape' && key !== 'Tab') {
        return;
      }

      // CASE 1: LOCKDOWN MODE (Only Forward navigation is allowed. Backward is locked and triggers tab switch violation alert)
      if (isFullscreenLockdown || isLinearExam) {
        if (isBackwardNav) {
          e.preventDefault();
          e.stopPropagation();
          ensureFullscreen();
          triggerScreenshotDefense('🔒 Lockdown Exam: Backward navigation is locked. Only forward navigation is permitted.');
          setKeyLockNotice('🔒 Lockdown Exam: Backward navigation is locked. Only forward navigation is permitted.');
          recordTabSwitchViolation('Backward navigation attempt in lockdown exam mode');
          setIsIntegrityModalOpen(true);
          setTabSwitchBannerNotice(true);
          return;
        }

        if (isForwardNav) {
          e.preventDefault();
          e.stopPropagation();
          goToNextQuestion();
          return;
        }
      } else {
        // CASE 2: NOT LOCKDOWN (Both Forward and Backward navigation are allowed)
        if (isForwardNav) {
          e.preventDefault();
          e.stopPropagation();
          goToNextQuestion();
          return;
        }

        if (isBackwardNav) {
          e.preventDefault();
          e.stopPropagation();
          goToPrevQuestion();
          return;
        }
      }

      // Option selection keys (A, B, C, D / 1, 2, 3, 4) without modifier keys
      if (!isAlt && !isCtrl && !isMeta && !isShift && !isInput) {
        const currQ = effectiveQuestions[currentQuestionIndexRef.current];
        if (currQ && currQ.options) {
          let optIdx = -1;
          if (key === 'a' || key === 'A' || key === '1') optIdx = 0;
          else if (key === 'b' || key === 'B' || key === '2') optIdx = 1;
          else if (key === 'c' || key === 'C' || key === '3') optIdx = 2;
          else if (key === 'd' || key === 'D' || key === '4') optIdx = 3;

          if (optIdx >= 0 && currQ.options[optIdx]) {
            e.preventDefault();
            e.stopPropagation();
            markInternalInteraction();
            const targetKey = (currQ.options[optIdx] as any).originalId || currQ.options[optIdx].id;
            handleSelectOption(currQ.id, targetKey);
            return;
          }
        }
      }

      // ALL OTHER KEYS: Locked! Any press capable of leaving or interfering triggers the tab switch alert
      e.preventDefault();
      e.stopPropagation();
      ensureFullscreen();

      const keyLabel = isMeta
        ? 'Windows/Cmd'
        : key === 'Escape' || key === 'Esc'
        ? 'Escape'
        : isAlt && (key === 'Tab' || code === 'Tab')
        ? 'Alt+Tab'
        : isCtrl && (key === 'Tab' || code === 'Tab')
        ? 'Ctrl+Tab'
        : key === 'Tab'
        ? 'Tab'
        : isAlt
        ? 'Alt shortcut'
        : isCtrl
        ? 'Ctrl shortcut'
        : key;

      triggerScreenshotDefense(`Shortcut / key '${keyLabel}' is locked!`);
      setKeyLockNotice(`🔒 Exam Alert: Key '${keyLabel}' is locked! Exiting or navigating away is strictly prohibited.`);
      recordTabSwitchViolation(`Unauthorized key press / tab switch attempt ('${keyLabel}')`);
      setIsIntegrityModalOpen(true);
      setTabSwitchBannerNotice(true);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        e.stopPropagation();
        triggerScreenshotDefense('PrintScreen capture attempt detected and neutralized!');
      }
    };

    const handleClipboardCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      triggerScreenshotDefense('Copying question content is disabled during exams.');
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleFullscreenChange = () => {
      const doc = document as any;
      const isCurrentlyFullscreen = Boolean(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );

      if (hasStartedQuiz && !isSubmitted) {
        if (!isCurrentlyFullscreen) {
          ensureFullscreen();
          setIsFullscreenExitedModalOpen(true);
          triggerScreenshotDefense('Fullscreen mode exited! Institutional proctoring requires full screen mode during the exam.');
          const violationTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const exitEvent: IntegrityEvent = {
            id: `ev-fs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            type: 'tab_switch',
            timestamp: new Date().toISOString(),
            studentName: studentInfo.name || 'Candidate',
            studentId: studentInfo.studentId || 'N/A',
            details: `Fullscreen exited at ${violationTimeStr} during exam`,
            severity: 'high',
          };
          integrityEventsRef.current.push(exitEvent);
          recordTabSwitchViolation('Fullscreen exited / window focus shift detected');
          setIsIntegrityModalOpen(true);
          setTabSwitchBannerNotice(true);
        } else {
          setIsFullscreenExitedModalOpen(false);
        }
      }
    };

    let resizeTimer: any = null;
    const handleWindowResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const violationTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const resizeEvent: IntegrityEvent = {
          id: `ev-res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          type: 'window_resized',
          timestamp: new Date().toISOString(),
          studentName: studentInfo.name || 'Candidate',
          studentId: studentInfo.studentId || 'N/A',
          details: `Window resized / split-screen attempted (${window.innerWidth}x${window.innerHeight}) at ${violationTimeStr}`,
          severity: 'medium',
        };
        integrityEventsRef.current.push(resizeEvent);
      }, 1000);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('resize', handleWindowResize);

    // Requirement 1: In fullscreen mode, attach all keyboard, touch/gesture, copy, and fullscreen monitors
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    document.addEventListener('copy', handleClipboardCopy, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchcancel', handleTouchCancel);

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);

    // Active Top-Edge Guard Listeners: detect cursor/touch moving to or pressing at top edge
    window.addEventListener('mousemove', handlePointerMoveTopEdge, { passive: true });
    window.addEventListener('pointermove', handlePointerMoveTopEdge, { passive: true });
    window.addEventListener('mousedown', handlePointerDownTopEdge, true);
    window.addEventListener('pointerdown', handlePointerDownTopEdge, true);
    document.addEventListener('mouseleave', handleMouseLeaveTopBoundary);
    document.addEventListener('mouseout', handleMouseLeaveTopBoundary);

    // Requirement 2: Prevent leaving the quiz page before submitting (it is either you submit or nothing else)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasStartedQuiz && !isSubmitted) {
        e.preventDefault();
        e.returnValue = 'Institutional Exam Lockdown: You must submit your examination before leaving the quiz page!';
        return e.returnValue;
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      if (hasStartedQuiz && !isSubmitted) {
        e.preventDefault();
        window.history.pushState({ examLocked: true }, '', window.location.href);
        ensureFullscreen();
        triggerScreenshotDefense('Back navigation blocked! It is either you submit or nothing else.');
        recordTabSwitchViolation('Back button / swipe navigation attempted during fullscreen exam');
        setIsIntegrityModalOpen(true);
        setTabSwitchBannerNotice(true);
      }
    };

    window.history.pushState({ examLocked: true }, '', window.location.href);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      clearInterval(interval);
      clearTimeout(resizeTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('resize', handleWindowResize);

      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      document.removeEventListener('copy', handleClipboardCopy, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchcancel', handleTouchCancel);

      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);

      window.removeEventListener('mousemove', handlePointerMoveTopEdge);
      window.removeEventListener('pointermove', handlePointerMoveTopEdge);
      window.removeEventListener('mousedown', handlePointerDownTopEdge, true);
      window.removeEventListener('pointerdown', handlePointerDownTopEdge, true);
      document.removeEventListener('mouseleave', handleMouseLeaveTopBoundary);
      document.removeEventListener('mouseout', handleMouseLeaveTopBoundary);

      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasStartedQuiz, isSubmitted, answers, studentInfo, effectiveConfig, isFullscreenLockdown]);

  // Safe helper to exit fullscreen mode immediately
  const safeExitFullscreen = () => {
    try {
      if (typeof navigator !== 'undefined' && 'keyboard' in navigator && (navigator as any).keyboard?.unlock) {
        try {
          (navigator as any).keyboard.unlock();
        } catch (e) {}
      }
      const doc = document as any;
      if (
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      ) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Auto exit fullscreen notice:', err);
    }
  };

  // Requirement 3: When the quiz runs in fullscreen mode, immediately after submission, automatically exit fullscreen mode
  useEffect(() => {
    if (isSubmitted) {
      safeExitFullscreen();
      setIsFullscreenExitedModalOpen(false);
    }
  }, [isSubmitted]);

  // Listen for Live Direct Proctor Warnings and Generic Announcements from Invigilator / Teacher
  useEffect(() => {
    if (!hasStartedQuiz || isSubmitted) return;

    const studentId = (studentInfo.studentId || '').trim();
    const studentName = (studentInfo.name || '').trim().toLowerCase();

    // Helper to evaluate and trigger an incoming warning
    const processIncomingWarning = (w: ProctorWarning) => {
      if (!w || w.acknowledged) return;
      const warnIdentifier = w.id || w.timestamp;
      if (acknowledgedWarningIds.includes(warnIdentifier)) return;

      const targetId = (w.studentId || '').trim().toLowerCase();
      const targetName = (w.studentName || '').trim().toLowerCase();
      const cleanSId = studentId.toLowerCase();

      const isMatch =
        targetId === 'all' ||
        targetId === '*' ||
        !targetId ||
        (cleanSId && (targetId === cleanSId || targetId.includes(cleanSId) || cleanSId.includes(targetId))) ||
        (studentName && targetName && (targetName === studentName || targetName.includes(studentName) || studentName.includes(targetName)));

      if (isMatch) {
        setActiveTeacherWarning(w);
        playOneMinuteWarningSound();
      }
    };

    // 1. Check BroadcastChannel for instant cross-tab delivery
    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel('mcq_exam_channel');
        channel.onmessage = (event) => {
          if (event.data && event.data.type === 'TEACHER_PROCTOR_WARNING' && event.data.warning) {
            processIncomingWarning(event.data.warning);
          }
        };
      } catch (e) {}
    }

    // 2. Real-time Firestore subscription
    let unsubscribeFirestore: (() => void) | null = null;
    try {
      unsubscribeFirestore = subscribeToTeacherWarnings(studentId || undefined, (warnings) => {
        if (Array.isArray(warnings) && warnings.length > 0) {
          const unacked = warnings.find((w) => !w.acknowledged && !acknowledgedWarningIds.includes(w.id || w.timestamp));
          if (unacked) {
            processIncomingWarning(unacked);
          }
        }
      });
    } catch (e) {}

    // 3. Local storage listener for same-browser instant sync
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'teacher_student_warnings' && e.newValue) {
        try {
          const list: ProctorWarning[] = JSON.parse(e.newValue);
          if (Array.isArray(list) && list.length > 0) {
            processIncomingWarning(list[0]);
          }
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    // Initial check from localStorage
    try {
      const raw = localStorage.getItem('teacher_student_warnings');
      if (raw) {
        const list: ProctorWarning[] = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) {
          processIncomingWarning(list[0]);
        }
      }
    } catch (err) {}

    // 4. Fallback server polling every 2 seconds
    const pollWarnings = async () => {
      try {
        const queryParams = new URLSearchParams();
        if (studentId) queryParams.append('studentId', studentId);
        if (studentName) queryParams.append('studentName', studentName);
        const activeQuizId = effectiveConfig.id || config.id || '';
        if (activeQuizId) queryParams.append('quizId', activeQuizId);

        const res = await fetch(`/api/sync/teacher-warnings?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.warnings) && data.warnings.length > 0) {
            for (const w of data.warnings) {
              processIncomingWarning(w);
            }
          }
        }
      } catch (e) {}
    };

    const warnInterval = setInterval(pollWarnings, 2000);
    pollWarnings();

    return () => {
      clearInterval(warnInterval);
      if (channel) channel.close();
      if (unsubscribeFirestore) unsubscribeFirestore();
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [hasStartedQuiz, isSubmitted, studentInfo, acknowledgedWarningIds, effectiveConfig.id, config.id]);

  const handleAcknowledgeProctorWarning = async () => {
    if (!activeTeacherWarning) return;
    const warnIdentifier = activeTeacherWarning.id || activeTeacherWarning.timestamp;
    setAcknowledgedWarningIds((prev) => [...prev, warnIdentifier]);
    const currentWarn = activeTeacherWarning;
    setActiveTeacherWarning(null);
    setWarningsAcknowledgedCount((prev) => prev + 1);

    if (currentWarn.id) {
      acknowledgeTeacherWarningInFirestore(currentWarn.id).catch(() => {});
      try {
        await fetch('/api/sync/teacher-warnings/acknowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            warningId: currentWarn.id,
            studentId: studentInfo.studentId,
          }),
        });
      } catch (e) {}
    }
  };

  // Handle Option Select with atomic draft & active session auto-save & live progress sync
  const handleSelectOption = (questionId: number, optionId: 'A' | 'B' | 'C' | 'D') => {
    if (isSubmitted) return;
    setAnswers((prev) => {
      const next = {
        ...prev,
        [questionId]: optionId,
      };
      try {
        localStorage.setItem(
          'addmaths_quiz_draft',
          JSON.stringify({ answers: next, bookmarkedQuestions, studentInfo })
        );
        // Atomically update active exam session answers for instant crash recovery on refresh
        const rawSession = localStorage.getItem('mcq_exam_active_session');
        if (rawSession) {
          const parsedSession = JSON.parse(rawSession);
          parsedSession.answers = next;
          localStorage.setItem('mcq_exam_active_session', JSON.stringify(parsedSession));
        }
      } catch (e) {
        console.warn('Draft/session auto-save warning:', e);
      }
      // Broadcast updated progress live
      syncActiveStudentSession({ questionsAnsweredCount: Object.keys(next).length });
      return next;
    });
  };

  // Toggle Bookmark with draft auto-save
  const toggleBookmark = (questionId: number) => {
    setBookmarkedQuestions((prev) => {
      const next = prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId];
      try {
        localStorage.setItem(
          'addmaths_quiz_draft',
          JSON.stringify({ answers, bookmarkedQuestions: next, studentInfo })
        );
        const rawSession = localStorage.getItem('mcq_exam_active_session');
        if (rawSession) {
          const parsedSession = JSON.parse(rawSession);
          parsedSession.bookmarkedQuestions = next;
          localStorage.setItem('mcq_exam_active_session', JSON.stringify(parsedSession));
        }
      } catch (e) {
        console.warn('Draft auto-save warning:', e);
      }
      return next;
    });
  };

  // Save draft manually
  const handleSaveDraft = () => {
    try {
      localStorage.setItem(
        'addmaths_quiz_draft',
        JSON.stringify({ answers, bookmarkedQuestions, studentInfo })
      );
      const rawSession = localStorage.getItem('mcq_exam_active_session');
      if (rawSession) {
        const parsedSession = JSON.parse(rawSession);
        parsedSession.answers = answers;
        parsedSession.bookmarkedQuestions = bookmarkedQuestions;
        localStorage.setItem('mcq_exam_active_session', JSON.stringify(parsedSession));
      }
    } catch (e) {
      console.warn('Manual save warning:', e);
    }
    setSaveDraftNotification(true);
    setTimeout(() => setSaveDraftNotification(false), 3000);
  };

  // Format seconds helper with HH:MM:SS or MM:SS support
  const formatTime = (totalSecs: number): string => {
    if (totalSecs <= 0) return '00:00';
    const hrs = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Start Assessment with cheat-proof start timestamp & absolute target end time
  const handleStartAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentInfo.name.trim()) {
      alert('Please enter your full name to begin the assessment.');
      return;
    }

    const rawStudentId = studentInfo.studentId.trim();
    const rawStudentEmail = studentInfo.email.trim();

    // Verify candidate identifier: either Student ID OR Email Address must be provided
    if (!rawStudentId && !rawStudentEmail) {
      alert('Please provide either your Student ID / Roll No OR your Email Address to verify candidate identity.');
      return;
    }
    
    const quizId = effectiveConfig.id || effectiveConfig.code || 'quiz-001';
    const candidateIdentifier = rawStudentId || rawStudentEmail;

    // Reset previous roster validation error
    setRosterValidationError(null);

    // Strict Bulk Student Registration & Candidate Roster Gate
    if (
      effectiveConfig.accessMode === 'restricted' &&
      effectiveConfig.studentRoster &&
      effectiveConfig.studentRoster.length > 0
    ) {
      const rosterValidation = validateCandidateAgainstRoster(
        effectiveConfig.studentRoster,
        studentInfo.name.trim(),
        rawStudentId,
        rawStudentEmail,
        effectiveConfig.rosterValidationField || 'id_or_email'
      );

      if (!rosterValidation.authorized) {
        setRosterValidationError(rosterValidation.message);
        return;
      }

      // If matched, normalize student records with official roster details
      if (rosterValidation.matchedStudent) {
        const matched = rosterValidation.matchedStudent;
        setStudentInfo((prev) => ({
          ...prev,
          name: matched.name || prev.name,
          studentId: matched.studentId || prev.studentId,
          email: matched.email || prev.email,
          classGroup: matched.classGroup || prev.classGroup,
        }));
      }
    }

    // Check Single Attempt Enforcement (if active on this quiz or configured by teacher)
    const isSingleAttemptEnforced = Boolean(
      effectiveConfig.enforceSingleAttempt !== false &&
      (effectiveConfig.enforceSingleAttempt || effectiveConfig.preventMultipleAttempts || (effectiveConfig.attemptsAllowed !== undefined && effectiveConfig.attemptsAllowed <= 1))
    );

    if (isSingleAttemptEnforced) {
      // 1. Check if this browser has already submitted an attempt
      const browserAttempt = isBrowserQuizAttemptLocked(quizId);
      if (browserAttempt.locked && browserAttempt.submission) {
        setBlockedPriorSubmission(browserAttempt.submission);
        return;
      }

      const existingSubmission = checkIfStudentAlreadySubmitted(
        submissions || [],
        quizId,
        studentInfo.name.trim(),
        candidateIdentifier
      );

      if (existingSubmission) {
        setBlockedPriorSubmission(existingSubmission);
        return;
      }
    }
    
    // Paused examination check
    if (effectiveConfig.status === 'paused') {
      alert('This examination is currently paused by the instructor. You cannot begin at this time.');
      return;
    }

    // Timeline schedule validation (release date & deadline)
    const timeline = evaluateTimeline(effectiveConfig);
    if (!timeline.isEntryAllowed) {
      alert(timeline.message);
      return;
    }

    // Camera Proctoring Permission & Consent Gate
    if (effectiveConfig.enableCameraProctoring) {
      if (!cameraPermissionGranted || !cameraStreamRef.current) {
        setCameraPermissionError('Webcam permission is strictly required for this examination. Please click "Grant Camera Access & Test Webcam" to allow camera access before starting.');
        return;
      }
      if (!hasAcceptedCameraProctoring) {
        alert('Please check the consent box to accept the random camera proctoring terms before beginning the assessment.');
        return;
      }
    }

    const { effectiveSeconds } = calculateEffectiveExamDurationSeconds(
      effectiveConfig.durationMinutes || 60,
      effectiveConfig.endDate || effectiveConfig.submissionDeadline
    );
    const totalDurationSeconds = effectiveSeconds;
    const durationMinutes = Math.ceil(totalDurationSeconds / 60);
    const now = Date.now();
    const targetEndTime = now + totalDurationSeconds * 1000;
    const studentId = rawStudentId || (rawStudentEmail ? rawStudentEmail.split('@')[0].toUpperCase() : `STD-${Math.floor(1000 + Math.random() * 9000)}`);

    // Generate randomized Fisher-Yates question order & option permutations for this student's exam attempt
    const baseQuestions = (selectedQuiz?.questions && selectedQuiz.questions.length > 0)
      ? selectedQuiz.questions
      : (questions && questions.length > 0 ? questions : []);
    
    const shouldShuffleQuestions = effectiveConfig.randomizeQuestions !== false && effectiveConfig.shuffleQuestions !== false;
    const shouldShuffleOptions = effectiveConfig.randomizeOptions !== false && effectiveConfig.shuffleOptions !== false;

    let questionIds: string[] = [];
    if (effectiveConfig.isQuestionPool && effectiveConfig.poolQuestionsToServe && effectiveConfig.poolQuestionsToServe > 0) {
      const studentKey = `${studentId}-${effectiveConfig.code || ''}`;
      const sampled = selectDeterministicPoolQuestions(
        baseQuestions,
        effectiveConfig.poolQuestionsToServe,
        studentKey,
        effectiveConfig.poolSelectionStrategy || 'random'
      );
      questionIds = sampled.map((q) => String(q.id));
    } else {
      questionIds = baseQuestions.map((q) => String(q.id));
      if (shouldShuffleQuestions) {
        for (let i = questionIds.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const temp = questionIds[i];
          questionIds[i] = questionIds[j];
          questionIds[j] = temp;
        }
      }
    }
    setShuffledQuestionIds(questionIds);

    // Generate randomized option permutation per question for this student
    const optionPermutations: Record<string, ('A' | 'B' | 'C' | 'D')[]> = {};
    baseQuestions.forEach((q) => {
      const origIds = (q.options || []).map((o) => o.id as ('A' | 'B' | 'C' | 'D'));
      if (shouldShuffleOptions && origIds.length > 1) {
        // Detect dependent options like "All of the above" or "None of the above"
        const isDependentOption = (text: string) => {
          const lower = (text || '').toLowerCase();
          return lower.includes('all of the above') ||
                 lower.includes('none of the above') ||
                 lower.includes('all the above') ||
                 lower.includes('none of these') ||
                 lower.includes('both a and b') ||
                 lower.includes('both b and c') ||
                 lower.includes('neither a nor b');
        };

        const depIdx = (q.options || []).findIndex((o) => isDependentOption(o.text));
        if (depIdx >= 0) {
          // Pin dependent option at its slot and shuffle other alternatives
          const nonDep = (q.options || []).filter((_, idx) => idx !== depIdx).map((o) => o.id as ('A' | 'B' | 'C' | 'D'));
          for (let i = nonDep.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = nonDep[i];
            nonDep[i] = nonDep[j];
            nonDep[j] = temp;
          }
          const result = [...nonDep];
          result.splice(depIdx, 0, q.options[depIdx].id as ('A' | 'B' | 'C' | 'D'));
          optionPermutations[String(q.id)] = result;
        } else {
          const shuffled = [...origIds];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = shuffled[i];
            shuffled[i] = shuffled[j];
            shuffled[j] = temp;
          }
          optionPermutations[String(q.id)] = shuffled;
        }
      } else {
        optionPermutations[String(q.id)] = origIds;
      }
    });
    setShuffledOptionMaps(optionPermutations);

    const sessionData = {
      id: `sess-${studentId}-${quizId}`,
      quizId,
      quizTitle: effectiveConfig.title || effectiveConfig.subject || 'MCQ Assessment',
      quizCode: effectiveConfig.code || '',
      subject: effectiveConfig.subject || 'Mathematics',
      studentId,
      studentName: studentInfo.name.trim(),
      studentEmail: studentInfo.email.trim() || '',
      classGroup: studentInfo.classGroup || '',
      school: studentInfo.school || '',
      startTime: now,
      targetEndTime,
      durationMinutes,
      totalDurationSeconds,
      remainingSeconds: totalDurationSeconds,
      tabSwitchesCount: 0,
      windowExitsCount: 0,
      questionsAnsweredCount: Object.keys(answers).length,
      totalQuestions: (effectiveConfig.isQuestionPool && effectiveConfig.poolQuestionsToServe) ? effectiveConfig.poolQuestionsToServe : (baseQuestions.length || effectiveConfig.totalQuestions || 40),
      shuffledQuestionIds: questionIds,
      shuffledOptionMaps: optionPermutations,
      status: 'in_progress' as const,
      lastHeartbeat: new Date().toISOString(),
    };

    try {
      localStorage.setItem('mcq_exam_active_session', JSON.stringify(sessionData));
      localStorage.setItem(
        'addmaths_quiz_draft',
        JSON.stringify({
          answers,
          bookmarkedQuestions,
          studentInfo: { ...studentInfo, studentId },
          shuffledQuestionIds: questionIds,
          shuffledOptionMaps: optionPermutations,
        })
      );
    } catch (e) {
      console.warn('Could not save session to localStorage:', e);
    }

    // Broadcast active session immediately to Firestore, Node Server, and Browser Tabs for instant live surveillance
    saveActiveSessionToFirestore(sessionData).catch((err) => console.warn('Start session Firestore sync error:', err));
    fetch('/api/sync/active-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData),
    }).catch((err) => console.warn('Start session sync error:', err));

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('mcq_exam_channel');
        bc.postMessage({ type: 'ACTIVE_SESSION_START', session: sessionData });
        bc.close();
      } catch (e) {}
    }

    initAudioContext();
    // In fullscreen mode: request fullscreen and lock hardware shortcuts
    ensureFullscreen();
    setQuestionTimeRemaining(perQuestionDurationSeconds);
    currentQuestionIndexRef.current = 0;
    setCurrentQuestionIndex(0);
    lastQuestionBeepSecondRef.current = null;
    setTimeRemainingSeconds(totalDurationSeconds);
    tabSwitchesCountRef.current = 0;
    lastTabSwitchTimestampRef.current = 0;
    lastBlurTimestampRef.current = 0;
    setTabSwitchesCount(0);
    setWindowExitsCount(0);
    setLastPenaltyDeductionMinutes(0);
    setIsAutoSubmittingDueToPenalties(false);
    setHasStartedQuiz(true);
    setIsTimerRunning(true);

    // Initialize Random Camera Proctoring captures
    if (effectiveConfig.enableCameraProctoring) {
      const scheduledCount = effectiveConfig.cameraCaptureCount || 5;
      const schedule = generateRandomCaptureScheduleSeconds(totalDurationSeconds, scheduledCount);
      scheduledCaptureTimesSecRef.current = schedule;

      // Clear any prior capture timers
      captureTimeoutsRef.current.forEach(clearTimeout);
      captureTimeoutsRef.current = [];

      // Schedule truly random snapshot timers
      schedule.forEach((secOffset, idx) => {
        const timer = setTimeout(() => {
          takeCameraSnapshot(idx + 1, scheduledCount);
        }, secOffset * 1000);
        captureTimeoutsRef.current.push(timer);
      });
    }
  };

  // Controlled submit confirmation: on lockdown mode, early submission is strictly blocked until the final question
  const triggerSubmitConfirmation = () => {
    markInternalInteraction();
    const safeQIdx = Math.min(currentQuestionIndex, Math.max(0, effectiveQuestions.length - 1));
    if (isFullscreenLockdown && safeQIdx < effectiveQuestions.length - 1) {
      setKeyLockNotice(`🔒 Lockdown Mode: Early submission is not permitted. You must complete questions up to Question ${effectiveQuestions.length} before submitting.`);
      setTimeout(() => setKeyLockNotice(null), 5000);
      return;
    }
    setShowConfirmModal(true);
  };

  // Calculate & Submit final assessment
  const handleFinalSubmit = () => {
    if (isSubmittingRef.current || isSubmitted) {
      return;
    }
    isSubmittingRef.current = true;
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }

    setShowConfirmModal(false);
    setIsTimerRunning(false);

    const finalTabSwitches = tabSwitchesCountRef.current || tabSwitchesCount || 0;

    let score = 0;
    const sectionScores: Record<number, { score: number; max: number; percentage: number }> = {};
    const topicScores: Record<string, { score: number; max: number; percentage: number }> = {};

    let computedMaxScore = 0;

    effectiveQuestions.forEach((q) => {
      const qMark = typeof q.marks === 'number' && q.marks > 0 ? q.marks : 1;
      computedMaxScore += qMark;
      const isCorrect = answers[q.id] === q.correctAnswer;
      if (isCorrect) {
        score += qMark;
      }

      // Section tracking
      const sId = q.sectionId || 1;
      if (!sectionScores[sId]) {
        sectionScores[sId] = { score: 0, max: 0, percentage: 0 };
      }
      sectionScores[sId].max += qMark;
      if (isCorrect) {
        sectionScores[sId].score += qMark;
      }

      // Topic tracking
      const topicName = q.topic || 'General Mathematics';
      if (!topicScores[topicName]) {
        topicScores[topicName] = { score: 0, max: 0, percentage: 0 };
      }
      topicScores[topicName].max += qMark;
      if (isCorrect) {
        topicScores[topicName].score += qMark;
      }
    });

    // Compute percentages
    Object.keys(sectionScores).forEach((secIdStr) => {
      const secId = Number(secIdStr);
      const sec = sectionScores[secId];
      sec.percentage = sec.max > 0 ? Math.round((sec.score / sec.max) * 100) : 0;
    });

    Object.keys(topicScores).forEach((topicKey) => {
      const top = topicScores[topicKey];
      top.percentage = top.max > 0 ? Math.round((top.score / top.max) * 100) : 0;
    });

    const maxQuestions = computedMaxScore || effectiveQuestions.length || effectiveConfig.totalQuestions || 1;
    
    // Read start session if available for exact seconds calculation
    let computedSecondsSpent = ((effectiveConfig.durationMinutes || 60) * 60) - timeRemainingSeconds;
    const rawSession = localStorage.getItem('mcq_exam_active_session');
    if (rawSession) {
      try {
        const session = JSON.parse(rawSession);
        const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
        computedSecondsSpent = Math.max(1, Math.min(session.totalDurationSeconds, elapsed));
      } catch (e) {
        console.warn(e);
      }
    }

    const totalSecondsSpent = computedSecondsSpent > 0 ? computedSecondsSpent : 1800;
    const percentage = Math.round((score / maxQuestions) * 1000) / 10;

    const localTimeStr = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    const timeZoneStr = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    const uniqueSubId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const submission: StudentSubmission = {
      id: uniqueSubId,
      quizId: effectiveConfig.id || effectiveConfig.code || 'quiz-001',
      quizCode: effectiveConfig.code || effectiveConfig.id,
      quizTitle: effectiveConfig.title || effectiveConfig.subject || 'Core Mathematics Assessment',
      studentName: studentInfo.name,
      studentEmail: studentInfo.email,
      studentId: studentInfo.studentId,
      school: effectiveConfig.schoolName || config.schoolName || 'MCQ Assessment Network',
      classGroup: studentInfo.classGroup,
      answers,
      bookmarkedQuestions,
      shuffledQuestionIds,
      shuffledOptionMaps,
      submittedAt: new Date().toISOString(),
      submittedAtLocal: localTimeStr,
      timeZone: timeZoneStr,
      timeSpentSeconds: totalSecondsSpent > 0 ? totalSecondsSpent : 1800,
      totalScore: score,
      maxScore: maxQuestions,
      percentage,
      sectionScores,
      topicScores,
      tabSwitchesCount: finalTabSwitches,
      windowExitsCount,
      warningsAcknowledgedCount,
      integrityEvents: [...integrityEventsRef.current],
      cameraCapturesCount: capturedPhotosRef.current.length,
      cameraCaptures: [...capturedPhotosRef.current],
    };

    // Stop camera stream immediately and cancel any scheduled capture timers
    stopCamera();
    captureTimeoutsRef.current.forEach(clearTimeout);
    captureTimeoutsRef.current = [];

    setCompletedSubmission(submission);
    setIsSubmitted(true);
    safeExitFullscreen();
    setIsFullscreenExitedModalOpen(false);
    saveOfflineSubmission(submission);

    // Record Single-Attempt Permanent Lock for this candidate and quiz
    const candidateIdentifier = submission.studentId || submission.studentEmail || submission.studentName;
    const targetQuizKey = submission.quizId || effectiveConfig.id || effectiveConfig.code || 'quiz-001';
    setQuizSubmissionLock(
      targetQuizKey,
      submission.studentName,
      candidateIdentifier,
      submission.id,
      score,
      maxQuestions,
      percentage
    );

    // Enforce device/browser-level lock so this browser cannot take this quiz again
    setBrowserQuizAttemptLock(targetQuizKey, submission);

    onSubmitAssessment(submission);
    saveSubmissionToFirestore(submission).catch((err) => console.warn('Direct Firestore submission sync notice:', err));
    fetch('/api/sync/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission),
    }).catch((err) => console.warn('Direct server submission sync notice:', err));
    
    // Immediately remove active exam session from Firestore, Node Server, and Surveillance Dashboard
    // Once submitted, student results move to Results Dashboard and leave the Live Monitor
    const candidateSessionId = `sess-${submission.studentId || studentInfo.studentId || 'std'}-${effectiveConfig.id || effectiveConfig.code || 'quiz-001'}`;
    const cleanStudentId = submission.studentId || studentInfo.studentId || '';
    const cleanQuizId = (targetQuizKey || 'quiz').replace(/[^a-zA-Z0-9_-]/g, '_');
    const underscoreSessionId = `sess_${(cleanStudentId || submission.studentName || 'std').replace(/[^a-zA-Z0-9_-]/g, '_')}_${cleanQuizId}`;

    // Mark as submitted on server & Firestore immediately to guarantee real-time listeners drop candidate
    saveActiveSessionToFirestore({
      id: candidateSessionId,
      studentId: cleanStudentId,
      studentName: submission.studentName,
      quizId: targetQuizKey,
      status: 'submitted',
    }).catch(() => {});
    fetch('/api/sync/active-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: candidateSessionId,
        studentId: cleanStudentId,
        studentName: submission.studentName,
        quizId: targetQuizKey,
        status: 'submitted',
      }),
    }).catch(() => {});

    // 1. Delete from Firestore
    deleteActiveSessionFromFirestore(candidateSessionId, submission.studentName, targetQuizKey).catch(() => {});
    deleteActiveSessionFromFirestore(underscoreSessionId, submission.studentName, targetQuizKey).catch(() => {});
    if (cleanStudentId) {
      deleteActiveSessionFromFirestore(cleanStudentId, submission.studentName, targetQuizKey).catch(() => {});
    }

    // 2. Delete from Node Server Surveillance Store
    if (cleanStudentId) {
      fetch(`/api/sync/active-sessions/${encodeURIComponent(cleanStudentId)}`, { method: 'DELETE' }).catch(() => {});
    }
    if (candidateSessionId) {
      fetch(`/api/sync/active-sessions/${encodeURIComponent(candidateSessionId)}`, { method: 'DELETE' }).catch(() => {});
    }
    if (underscoreSessionId) {
      fetch(`/api/sync/active-sessions/${encodeURIComponent(underscoreSessionId)}`, { method: 'DELETE' }).catch(() => {});
    }
    if (submission.studentName) {
      fetch(`/api/sync/active-sessions/${encodeURIComponent(submission.studentName)}`, { method: 'DELETE' }).catch(() => {});
    }

    // 3. Broadcast to all open teacher surveillance tabs so candidate leaves monitoring dashboard immediately
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel('mcq_exam_channel');
        channel.postMessage({
          type: 'ACTIVE_SESSION_COMPLETED',
          studentId: cleanStudentId,
          studentName: submission.studentName,
          quizId: targetQuizKey,
          id: candidateSessionId,
        });
        channel.postMessage({
          type: 'STUDENT_SESSION_REMOVED',
          studentId: cleanStudentId,
          studentName: submission.studentName,
          id: candidateSessionId,
        });
        channel.close();
      } catch (e) {}
    }

    // 4. Clear active exam session and drafts from local storage
    localStorage.removeItem('mcq_exam_active_session');
    localStorage.removeItem('addmaths_quiz_draft');
  };

  const handleSearchQuizByCode = async (codeToSearch: string) => {
    if (!codeToSearch || !codeToSearch.trim()) return;
    const query = codeToSearch.trim().toUpperCase();
    const found = activeQuizzes.find(
      (q) => (q.code && q.code.toUpperCase() === query) || (q.id && q.id.toUpperCase() === query)
    );
    if (found) {
      setSelectedQuiz(found);
      setTimeRemainingSeconds((found.durationMinutes || 60) * 60);
      setSearchError(null);
    } else {
      setIsQuizLoading(true);
      try {
        const cloudQuiz = await fetchQuizFromFirestore(query);
        if (cloudQuiz) {
          cacheQuizOffline(cloudQuiz, cloudQuiz.questions || [], cloudQuiz.sections || []);
          setSelectedQuiz(cloudQuiz);
          setTimeRemainingSeconds((cloudQuiz.durationMinutes || 60) * 60);
          setSearchError(null);
          setIsQuizLoading(false);
          return;
        }
      } catch (err) {
        console.warn(err);
      }
      setIsQuizLoading(false);
      setSearchError(`No active examination found matching code "${codeToSearch}". Please check the code provided by your teacher.`);
    }
  };

  // Section Release Filter
  const isAllSectionsMode = activeSectionId === 0 || effectiveSections.length === 0;

  const activeSection = isAllSectionsMode
    ? {
        id: 0,
        title: `All Assessment Items (${effectiveQuestions.length} Questions)`,
        description: `Complete ${effectiveConfig.title || effectiveConfig.subject} Assessment presented in a focused examination format.`,
        questionRange: [1, Math.max(1, effectiveQuestions.length)] as [number, number],
        timeAllocationMinutes: effectiveConfig.durationMinutes || 60,
        status: 'released' as const,
      }
    : effectiveSections.find((s) => s.id === activeSectionId) || effectiveSections[0] || {
        id: 1,
        title: 'Section 1',
        description: 'Assessment Items',
        questionRange: [1, Math.max(1, effectiveQuestions.length)] as [number, number],
        timeAllocationMinutes: effectiveConfig.durationMinutes || 60,
        status: 'released' as const,
      };

  const activeSectionQuestions = isAllSectionsMode
    ? effectiveQuestions
    : effectiveQuestions.filter(
        (q) => (q.sectionId === activeSection.id) || (q.id >= activeSection.questionRange[0] && q.id <= activeSection.questionRange[1])
      );

  const totalAnsweredCount = Object.keys(answers).length;

  if (!hasStartedQuiz && !isSubmitted) {
    // 1. Loading State for Deep Links
    if (isQuizLoading) {
      return (
        <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-xl font-bold font-serif text-slate-900">Loading Examination Portal...</h2>
          <p className="text-xs text-slate-500">
            Fetching examination details {targetQuizCode ? `for code "${targetQuizCode}"` : ''} from the cloud assessment network.
          </p>
        </div>
      );
    }

    // 2. Dedicated Single Examination Intake View (when a specific quiz is targeted or selected)
    if (selectedQuiz) {
      return (
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Header Card */}
          <div className="bg-gradient-to-b from-[#0f1223] via-[#13172e] to-[#1a1a2e] rounded-3xl p-6 sm:p-8 text-white border border-orange-500/20 shadow-2xl space-y-4 relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="bg-amber-500 text-slate-950 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider font-mono shadow-xs">
                  {selectedQuiz.code || selectedQuiz.id}
                </span>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <WifiOff className="w-3 h-3" />
                  <span>100% Offline Ready</span>
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs font-bold text-amber-300">
                <span className="flex items-center gap-1 bg-slate-800/90 border border-slate-700 px-3 py-1 rounded-xl">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{selectedQuiz.durationMinutes || 60} mins</span>
                </span>
                <span className="flex items-center gap-1 bg-slate-800/90 border border-slate-700 px-3 py-1 rounded-xl text-slate-200">
                  <BookOpenCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>{effectiveQuestions.length} Questions</span>
                </span>
              </div>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-serif text-white tracking-tight leading-tight">
                {selectedQuiz.title || 'Official Assessment'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                {selectedQuiz.subject || 'Subject'} • {selectedQuiz.classGroup || 'All Streams'} • Instructor: {selectedQuiz.teacherName || 'Faculty Head'}
              </p>
            </div>

            {/* Quick Actions in Header */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedQuizForQR(selectedQuiz);
                  setIsQRModalOpen(true);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 text-amber-400" />
                <span>Share QR Code</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}${window.location.pathname}?portal=student&quiz=${encodeURIComponent(selectedQuiz.code || selectedQuiz.id || '')}`;
                  navigator.clipboard.writeText(url);
                  setCopiedLinkQuizId(selectedQuiz.id || selectedQuiz.code || 'copied');
                  setTimeout(() => setCopiedLinkQuizId(null), 2500);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {copiedLinkQuizId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copiedLinkQuizId ? 'Copied Link!' : 'Copy Direct Exam Link'}</span>
              </button>
            </div>
          </div>

          {/* 3-Strike Tab Integrity Penalty Notice (Prominent Warning) */}
          {(selectedQuiz.progressiveTabPenalty || selectedQuiz.enableTabSwitchPenalties) && (
            <div className="bg-gradient-to-r from-rose-950 via-[#180a0a] to-[#250d0d] border-2 border-rose-500 rounded-3xl p-5 text-white space-y-3.5 shadow-xl animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-rose-600 text-white rounded-2xl shrink-0 shadow-md">
                  <ShieldAlert className="w-5 h-5 font-black animate-pulse" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-rose-300">
                      3-Strike Tab Integrity Penalty Activated
                    </h3>
                    <span className="bg-rose-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest">
                      Strict Mode
                    </span>
                  </div>
                  <p className="text-xs text-rose-100/90 leading-relaxed font-medium">
                    This examination strictly enforces tab surveillance. Leaving this exam window, switching apps, opening search tabs, or minimizing the browser incurs progressive penalties:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center text-xs pt-1">
                <div className="p-3 bg-slate-900/90 border border-rose-500/40 rounded-2xl space-y-1 shadow-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                    ⚡ 1st Tab Switch
                  </span>
                  <div className="text-sm font-extrabold text-white">-2 Minutes</div>
                  <div className="text-[10px] text-slate-400">Exam time reduced</div>
                </div>

                <div className="p-3 bg-slate-900/90 border border-rose-500/40 rounded-2xl space-y-1 shadow-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                    ⚡ 2nd Tab Switch
                  </span>
                  <div className="text-sm font-extrabold text-white">-5 Minutes</div>
                  <div className="text-[10px] text-slate-400">Additional time deducted</div>
                </div>

                <div className="p-3 bg-rose-950 border-2 border-rose-500 rounded-2xl space-y-1 shadow-md ring-1 ring-rose-400/50">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-300 block">
                    🚨 3rd Tab Switch
                  </span>
                  <div className="text-sm font-black text-rose-200 uppercase tracking-tight">Auto-Submit</div>
                  <div className="text-[10px] text-rose-300 font-bold">Session terminated</div>
                </div>
              </div>
            </div>
          )}

          {/* Institutional Fullscreen Lockdown & Kiosk Protocol Notice */}
          {(selectedQuiz.enableFullscreenLockdown || effectiveConfig.enableFullscreenLockdown) && (
            <div className="bg-gradient-to-r from-purple-950 via-[#180a22] to-[#250d30] border-2 border-purple-500 rounded-3xl p-5 text-white space-y-3.5 shadow-xl animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-purple-600 text-white rounded-2xl shrink-0 shadow-md">
                  <Maximize2 className="w-5 h-5 font-black" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-purple-300">
                      Institutional Fullscreen Lockdown Kiosk Active
                    </h3>
                    <span className="bg-purple-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest">
                      Kiosk Mode
                    </span>
                  </div>
                  <p className="text-xs text-purple-100/90 leading-relaxed font-medium">
                    This quiz runs under institutional lockdown proctoring. The browser will expand to full screen upon start and auxiliary shortcuts will be frozen:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center text-xs pt-1">
                <div className="p-3 bg-slate-900/90 border border-purple-500/40 rounded-2xl space-y-1 shadow-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 block">
                    🔒 Linear Flow
                  </span>
                  <div className="text-sm font-extrabold text-white">No Going Back</div>
                  <div className="text-[10px] text-slate-400">Past questions locked</div>
                </div>

                <div className="p-3 bg-slate-900/90 border border-purple-500/40 rounded-2xl space-y-1 shadow-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 block">
                    ⏱️ Per-Question Time
                  </span>
                  <div className="text-sm font-extrabold text-white">{perQuestionDurationSeconds}s / Question</div>
                  <div className="text-[10px] text-slate-400">Audio beeps at &lt;10s</div>
                </div>

                <div className="p-3 bg-slate-900/90 border border-purple-500/40 rounded-2xl space-y-1 shadow-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 block">
                    ⚡ Auto-Skip on Exit
                  </span>
                  <div className="text-sm font-extrabold text-white">Marked Blank</div>
                  <div className="text-[10px] text-slate-400">Skipped on tab switch</div>
                </div>
              </div>
            </div>
          )}

          {/* Official Instructions */}
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-5 text-xs text-amber-950 space-y-2.5 shadow-xs">
            <h3 className="font-extrabold uppercase tracking-wider text-[11px] text-amber-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Official Examination Rules & Proctoring Notice:</span>
            </h3>
            <ul className="space-y-1.5 pl-1">
              {getQuizInstructionBullets(selectedQuiz).map((bullet, bIdx) => (
                <li key={`sel-bullet-${bIdx}`} className="flex items-start gap-2 leading-relaxed font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Examination Schedule & Timeline Status Card */}
          {currentTimeline.hasTimeline && (
            <div
              className={`p-5 rounded-2xl border-2 shadow-md flex items-start gap-4 animate-in fade-in ${
                currentTimeline.status === 'upcoming'
                  ? 'bg-amber-500/15 border-amber-500 text-amber-950'
                  : currentTimeline.status === 'expired'
                  ? 'bg-rose-500/15 border-rose-500 text-rose-950'
                  : 'bg-emerald-500/15 border-emerald-500 text-emerald-950'
              }`}
            >
              <div
                className={`p-3 rounded-xl shrink-0 mt-0.5 shadow-sm text-white ${
                  currentTimeline.status === 'upcoming'
                    ? 'bg-amber-600'
                    : currentTimeline.status === 'expired'
                    ? 'bg-rose-600'
                    : 'bg-emerald-600'
                }`}
              >
                <CalendarClock className="w-6 h-6 font-black" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-black text-sm uppercase tracking-wide">
                    {currentTimeline.status === 'upcoming'
                      ? 'Examination Scheduled — Not Yet Open'
                      : currentTimeline.status === 'expired'
                      ? 'Examination Window Closed'
                      : 'Scheduled Assessment Active'}
                  </h4>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      currentTimeline.status === 'upcoming'
                        ? 'bg-amber-500 text-slate-950'
                        : currentTimeline.status === 'expired'
                        ? 'bg-rose-600 text-white'
                        : 'bg-emerald-500 text-slate-950'
                    }`}
                  >
                    {currentTimeline.status === 'upcoming'
                      ? `Opens in ${formatCountdownString(currentTimeline.secondsUntilRelease || 0)}`
                      : currentTimeline.status === 'expired'
                      ? 'Deadline Passed'
                      : currentTimeline.secondsUntilDeadline
                      ? `Closes in ${formatCountdownString(currentTimeline.secondsUntilDeadline)}`
                      : 'Open Access'}
                  </span>
                </div>
                <p className="text-xs leading-relaxed font-semibold">
                  {currentTimeline.message}
                </p>
                {currentTimeline.status === 'active' && currentTimeline.formattedDeadline && (
                  <p className="text-[11px] opacity-80 font-medium">
                    Please ensure you submit your assessment before the submission deadline at {currentTimeline.formattedDeadline}.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Paused Examination Warning Banner */}
          {selectedQuiz.status === 'paused' && (
            <div className="p-5 rounded-2xl bg-amber-500/15 border-2 border-amber-500 text-amber-950 shadow-md flex items-start gap-4 animate-in fade-in">
              <div className="p-3 bg-amber-500 text-slate-950 rounded-xl shrink-0 mt-0.5 shadow-sm">
                <AlertCircle className="w-6 h-6 font-black" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-sm text-amber-950 uppercase tracking-wide">
                    Examination Paused by Instructor
                  </h4>
                  <span className="bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                    PAUSED
                  </span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed font-semibold">
                  The teacher has temporarily paused access to this assessment ({selectedQuiz.code || selectedQuiz.title}). You cannot begin the exam right now. Please wait for your instructor to activate or resume the test paper.
                </p>
              </div>
            </div>
          )}

          {/* Multiple Attempts Blocked Notice */}
          {blockedPriorSubmission && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold font-serif text-rose-950">
                      Assessment Already Completed (Single Attempt Enforced)
                    </h3>
                    <span className="bg-rose-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                      {isThisBrowserLocked ? 'BROWSER LOCKED' : '1 ATTEMPT LIMIT'}
                    </span>
                  </div>
                  <p className="text-xs text-rose-800 leading-relaxed font-medium">
                    {isThisBrowserLocked ? (
                      <>
                        <strong className="text-rose-950">One-Attempt Mode Active:</strong> This device/browser has already submitted an exam attempt for candidate <strong className="text-rose-950">{blockedPriorSubmission.studentName}</strong>. To ensure academic integrity, retakes or re-entries from the same browser are strictly locked. If an instructor has authorized a retake, request an unlock from the teacher console.
                      </>
                    ) : (
                      <>
                        Candidate <strong className="text-rose-950">{blockedPriorSubmission.studentName}</strong> ({blockedPriorSubmission.studentId || blockedPriorSubmission.studentEmail || 'Registered'}) has already taken and submitted this assessment paper. Retakes are prohibited by the course instructor.
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="bg-white border border-rose-200 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Previous Score</p>
                  <p className="text-sm font-black text-rose-900 mt-0.5">
                    {blockedPriorSubmission.totalScore} / {blockedPriorSubmission.maxScore}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Percentage</p>
                  <p className="text-sm font-black text-rose-900 mt-0.5">
                    {blockedPriorSubmission.percentage}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Status</p>
                  <p className="text-xs font-bold text-emerald-700 mt-1 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Submitted</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Submitted At</p>
                  <p className="text-[11px] font-medium text-slate-700 mt-1">
                    {new Date(blockedPriorSubmission.submittedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                {isThisBrowserLocked ? (
                  <div className="px-3.5 py-2 bg-rose-100 border border-rose-300 text-rose-900 rounded-xl text-xs font-bold inline-flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-rose-600" />
                    <span>Device Locked — Single Attempt Enforced</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setBlockedPriorSubmission(null)}
                    className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-500" />
                    <span>Use Different Candidate Credentials</span>
                  </button>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCompletedSubmission(blockedPriorSubmission);
                      setIsSubmitted(true);
                    }}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>View Submission Result & Certificate</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Candidate Registration Form */}
          {!blockedPriorSubmission && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold font-serif text-slate-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-amber-600" />
                    <span>Candidate Verification & Credentials</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Enter your Full Name and either your Student ID or Email Address to access the examination.
                  </p>
                </div>

                {effectiveConfig.accessMode === 'restricted' && effectiveConfig.studentRoster && effectiveConfig.studentRoster.length > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-300 text-amber-900 rounded-full text-[11px] font-bold self-start">
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Official Roster Enforced ({effectiveConfig.studentRoster.length} Candidates)</span>
                  </div>
                )}

                {Boolean(
                  effectiveConfig.enforceSingleAttempt !== false &&
                  (effectiveConfig.enforceSingleAttempt || effectiveConfig.preventMultipleAttempts || (effectiveConfig.attemptsAllowed !== undefined && effectiveConfig.attemptsAllowed <= 1))
                ) ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-full text-[11px] font-bold self-start">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>1 Attempt Allowed (Single Submission)</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-300 text-slate-700 rounded-full text-[11px] font-medium self-start">
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Multiple Retakes Permitted</span>
                  </div>
                )}
              </div>

              {/* Roster Validation Error Alert */}
              {rosterValidationError && (
                <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-2 shadow-xs animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-rose-900">Access Denied: Candidate Not Verified on Official Roster</h4>
                      <p className="text-xs text-rose-800 leading-relaxed font-medium">
                        {rosterValidationError}
                      </p>
                      <p className="text-[11px] text-rose-600">
                        Please check for typos in your Student ID or Email. If you believe this is an error, please inform your exam proctor or teacher immediately.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Roster Information Banner */}
              {effectiveConfig.accessMode === 'restricted' && effectiveConfig.studentRoster && effectiveConfig.studentRoster.length > 0 && !rosterValidationError && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-indigo-950 flex items-center gap-2.5 text-xs">
                  <Users className="w-4 h-4 text-indigo-700 shrink-0" />
                  <span className="leading-snug">
                    <strong>Official Roster Verification Active:</strong> This examination is restricted to pre-registered candidates. Please enter your registered Student ID or Email to proceed.
                  </span>
                </div>
              )}

              <form onSubmit={handleStartAssessment} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={studentInfo.name}
                        onChange={(e) => setStudentInfo({ ...studentInfo, name: e.target.value })}
                        placeholder="e.g. Kofi Mensah"
                        className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Student ID / Roll No <span className="text-amber-700 text-[11px] font-medium">(Provide ID OR Email)</span>
                    </label>
                    <div className="relative">
                      <IdCard className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={studentInfo.studentId}
                        onChange={(e) => setStudentInfo({ ...studentInfo, studentId: e.target.value })}
                        placeholder="e.g. SDA-2026-014"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Student Email <span className="text-amber-700 text-[11px] font-medium">(Provide ID OR Email)</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="email"
                        value={studentInfo.email}
                        onChange={(e) => setStudentInfo({ ...studentInfo, email: e.target.value })}
                        placeholder="e.g. kofi.mensah@sdashs.edu.gh"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Class / Stream <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={studentInfo.classGroup}
                      onChange={(e) => setStudentInfo({ ...studentInfo, classGroup: e.target.value })}
                      placeholder="e.g. Year 2 Science A"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
                    />
                  </div>
                </div>

                {/* Camera Proctoring Requirement & Webcam Consent Gate */}
                {effectiveConfig.enableCameraProctoring && (
                  <div className={`p-4 sm:p-5 rounded-2xl border-2 space-y-3.5 transition-all ${
                    cameraPermissionGranted
                      ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950'
                      : 'bg-amber-50/90 border-amber-400 text-amber-950'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl shrink-0 ${cameraPermissionGranted ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'} shadow-xs`}>
                        <Camera className="w-5 h-5" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black uppercase tracking-wider">
                              Live Camera Proctoring Active
                            </h4>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              cameraPermissionGranted ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-900 animate-pulse'
                            }`}>
                              {cameraPermissionGranted ? 'Camera Ready' : 'Permission Required'}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs leading-relaxed font-semibold">
                          This examination requires active webcam proctoring. The application will automatically take <strong>unannounced random pictures</strong> of you during the exam to verify candidate identity and deter proxy test-taking.
                        </p>
                        <ul className="text-[11px] text-slate-600 list-disc pl-4 space-y-0.5 pt-1">
                          <li><strong>Truly Unpredictable Timing:</strong> Unannounced pictures are taken randomly throughout your exam session.</li>
                          <li><strong>Continuous Live Preview:</strong> Your camera remains live so you can confirm your face stays centered in frame.</li>
                          <li><strong>Privacy & 7-Day Auto Purge:</strong> Photos are compressed to save data, restricted exclusively to your instructor ({effectiveConfig.teacherName || 'Quiz Instructor'}), and automatically permanently deleted after 7 days.</li>
                          <li><strong>Automatic Shutdown:</strong> The camera turns off immediately when you submit your exam.</li>
                        </ul>
                      </div>
                    </div>

                    {/* Camera Permission Verification Action */}
                    {!cameraPermissionGranted ? (
                      <div className="space-y-2 pt-1 border-t border-amber-200">
                        <button
                          type="button"
                          onClick={requestCameraPermission}
                          disabled={isTestingCamera}
                          className="w-full sm:w-auto px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <Camera className="w-4 h-4" />
                          <span>{isTestingCamera ? 'Testing & Accessing Camera...' : 'Grant Camera Access & Test Webcam'}</span>
                        </button>
                        {cameraPermissionError && (
                          <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <span>{cameraPermissionError}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2 border-t border-emerald-200">
                        <div className="relative w-36 h-28 bg-black rounded-xl overflow-hidden border-2 border-emerald-500 shadow-md shrink-0">
                          <video
                            ref={(el) => {
                              preExamVideoRef.current = el;
                              if (el && cameraStreamRef.current) {
                                attachStreamToVideo(el, cameraStreamRef.current);
                              }
                            }}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover transform -scale-x-100"
                            style={{ transform: 'scaleX(-1)' }}
                          />
                          <div className="absolute bottom-1 left-1 right-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded text-center">
                            Live Preview
                          </div>
                        </div>
                        <div className="space-y-2 flex-1">
                          <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Webcam Verified & Operational: Face framed clearly.</span>
                          </div>
                          <label className="flex items-start gap-2 text-xs text-slate-800 font-semibold cursor-pointer select-none bg-white/70 p-2.5 rounded-xl border border-emerald-200">
                            <input
                              type="checkbox"
                              checked={hasAcceptedCameraProctoring}
                              onChange={(e) => setHasAcceptedCameraProctoring(e.target.checked)}
                              className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span>
                              I acknowledge and agree that this examination will automatically take random pictures of me during the exam, and I agree to leave my camera active and keep my face visible until final submission.
                            </span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {!isStandaloneMode && (
                    <button
                      type="button"
                      onClick={() => setSelectedQuiz(null)}
                      className="w-full sm:w-auto px-4 py-3 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px]"
                    >
                      <ArrowLeft className="w-4 h-4 text-slate-600" />
                      <span>Browse Other Quizzes</span>
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={selectedQuiz.status === 'paused' || !currentTimeline.isEntryAllowed}
                    className={`w-full sm:w-auto font-black text-xs px-8 py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 uppercase tracking-wider ml-auto min-h-[48px] ${
                      selectedQuiz.status === 'paused' || !currentTimeline.isEntryAllowed
                        ? 'bg-slate-300 text-slate-600 cursor-not-allowed border border-slate-300'
                        : 'bg-amber-600 hover:bg-amber-500 text-slate-950 cursor-pointer shadow-amber-600/20'
                    }`}
                  >
                    <span>
                      {selectedQuiz.status === 'paused'
                        ? 'EXAMINATION PAUSED BY TEACHER'
                        : currentTimeline.status === 'upcoming'
                        ? `OPENS IN ${formatCountdownString(currentTimeline.secondsUntilRelease || 0)}`
                        : currentTimeline.status === 'expired'
                        ? 'EXAMINATION CLOSED (DEADLINE PASSED)'
                        : 'BEGIN EXAMINATION NOW'}
                    </span>
                    {currentTimeline.isEntryAllowed && selectedQuiz.status !== 'paused' && (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      );
    }

    // If in standalone mode but no quiz is loaded yet, show a dedicated loading / retry card instead of the full directory
    if (isStandaloneMode) {
      return (
        <div className="max-w-xl mx-auto my-12 p-6">
          <div className="bg-gradient-to-b from-[#0f1223] via-[#13172e] to-[#1a1a2e] border border-orange-500/20 rounded-3xl p-8 text-center text-white shadow-2xl space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-7 h-7" />
            </div>
            
            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-bold font-serif text-white">
                Assigned Examination Desk
              </h2>
              <p className="text-xs text-slate-300">
                {targetQuizCode ? `Loading assessment paper for Code: ${targetQuizCode}...` : 'Accessing your designated test paper...'}
              </p>
            </div>

            {isQuizLoading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-amber-400 text-xs font-bold">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Connecting to Examination Cloud...</span>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {searchError && (
                  <p className="text-xs font-bold text-rose-400 bg-rose-950/40 border border-rose-800/60 p-3 rounded-xl">
                    {searchError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    const fallbackQuiz = activeQuizzes[0];
                    if (fallbackQuiz) {
                      setSelectedQuiz(fallbackQuiz);
                      setTimeRemainingSeconds((fallbackQuiz.durationMinutes || 60) * 60);
                    }
                  }}
                  className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs py-3 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)] flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                >
                  <span>Load Available Examination Paper</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    // 3. Unlocked Full Student & Visitor Landing Page with Trust Overview and Examinations Directory
    const subjectList = ['all', ...Array.from(new Set(activeQuizzes.map((q) => q.subject).filter(Boolean)))];
    const filteredQuizzes = activeQuizzes.filter((quiz) => {
      const matchesSubject = selectedSubjectFilter === 'all' || quiz.subject?.toLowerCase() === selectedSubjectFilter.toLowerCase();
      const matchesQuery =
        !quizCodeInput.trim() ||
        (quiz.code && quiz.code.toLowerCase().includes(quizCodeInput.toLowerCase().trim())) ||
        (quiz.title && quiz.title.toLowerCase().includes(quizCodeInput.toLowerCase().trim())) ||
        (quiz.subject && quiz.subject.toLowerCase().includes(quizCodeInput.toLowerCase().trim())) ||
        (quiz.teacherName && quiz.teacherName.toLowerCase().includes(quizCodeInput.toLowerCase().trim()));
      return matchesSubject && matchesQuery;
    });

    return (
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-6 sm:space-y-8">
        {/* Assessment Entry & Examination Repository Section */}
        <div id="assessment-entry-portal" className="scroll-mt-20 space-y-6 sm:space-y-8">
          {/* Top Banner with Quiz Code & QR Scanner */}
          <div className="bg-gradient-to-b from-[#0f1223] via-[#13172e] to-[#1a1a2e] border border-orange-500/20 rounded-3xl p-4 sm:p-8 md:p-10 shadow-2xl text-center relative overflow-hidden text-white space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Student Assessment Desk</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <WifiOff className="w-3 h-3" />
                  <span>100% Offline</span>
                </span>
              </div>
            </div>

            <h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold font-serif tracking-tight text-white leading-tight">
              Enter Your Quiz Code to Start
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Enter your assigned Quiz Code, scan your instructor&apos;s QR Code, or select an active examination from the repository below.
            </p>

          {/* Search Bar & Camera QR Scan Buttons */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await handleSearchQuizByCode(quizCodeInput);
            }}
            className="max-w-2xl mx-auto pt-1 sm:pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
          >
            <div className="relative w-full flex-1">
              <Building className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={quizCodeInput}
                onChange={(e) => {
                  setQuizCodeInput(e.target.value);
                  if (searchError) setSearchError(null);
                }}
                placeholder="Enter Quiz Code (e.g. ALG-SHS1-2026-001)"
                className="w-full bg-[#111827] border border-slate-700 text-white font-mono text-xs pl-10 pr-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder:text-slate-500 shadow-inner tracking-wider min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2 sm:w-auto shrink-0">
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-xs px-3.5 py-3 rounded-2xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer shrink-0 min-h-[44px]"
                title="Scan QR code using camera or image upload"
              >
                <ScanLine className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">Scan QR Code</span>
              </button>

              <button
                type="submit"
                className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs px-5 py-3 rounded-2xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider shrink-0 min-h-[44px]"
              >
                <span>START TEST</span>
                <ChevronRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </form>

          {searchError && (
            <div className="max-w-2xl mx-auto mt-2 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}
        </div>

        {/* Subject Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {subjectList.map((subj) => (
            <button
              key={`subj-tab-${subj}`}
              type="button"
              onClick={() => setSelectedSubjectFilter(subj)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedSubjectFilter.toLowerCase() === subj.toLowerCase()
                  ? 'bg-[#090D1A] text-amber-400 shadow-sm border border-slate-800'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {subj === 'all' ? 'All Subjects' : subj}
            </button>
          ))}
        </div>

        {/* All Available Published Examinations Grid on Student Dashboard */}
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
              <div>
                <h2 className="text-lg font-bold font-serif text-slate-900 flex items-center gap-2">
                  <BookOpenCheck className="w-5 h-5 text-amber-600" />
                  <span>All Examinations Repository ({filteredQuizzes.length} Quizzes)</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Click any quiz to begin, generate/view its QR code, or copy its standalone direct link.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsStudentDashboardUnlocked(false);
                    if (typeof window !== 'undefined') {
                      sessionStorage.removeItem('joy_student_dashboard_unlocked');
                    }
                  }}
                  className="px-3 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg flex items-center gap-1 cursor-pointer"
                  title="Lock repository"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Lock</span>
                </button>
                <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                  <WifiOff className="w-3.5 h-3.5 text-emerald-600" />
                  <span>100% Offline Ready</span>
                </span>
                <span className="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold px-3 py-1 rounded-full">
                  {filteredQuizzes.length} Tests Available
                </span>
              </div>
            </div>

            {filteredQuizzes.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
                <BookOpenCheck className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">No Examinations Found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  No active tests match the current subject filter or search query. Try switching to &quot;All Subjects&quot; or clearing your search.
                </p>
                <button
                  onClick={() => {
                    setSelectedSubjectFilter('all');
                    setQuizCodeInput('');
                  }}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {filteredQuizzes.map((quiz, idx) => {
                  const isCopied = copiedLinkQuizId === (quiz.id || quiz.code);
                  const isPaused = quiz.status === 'paused';
                  const quizTimeline = evaluateTimeline(quiz, currentWallClock);

                  return (
                    <div
                      key={`fav-quiz-${quiz.id || quiz.code || idx}`}
                      className={`bg-white rounded-2xl border p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 ${
                        isPaused
                          ? 'border-rose-200 bg-rose-50/20'
                          : quizTimeline.status === 'upcoming'
                          ? 'border-amber-200 bg-amber-50/10 hover:border-amber-400'
                          : quizTimeline.status === 'expired'
                          ? 'border-slate-200 opacity-80'
                          : 'border-slate-200 hover:border-amber-400/60'
                      }`}
                    >
                      <div>
                        {/* Card Top Row */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-lg text-xs font-black tracking-wider uppercase shadow-2xs font-mono">
                            {quiz.code || `MCQ-${idx + 1}`}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            {isPaused ? (
                              <span className="text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                <span>Paused by Teacher</span>
                              </span>
                            ) : quizTimeline.hasTimeline ? (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                                  quizTimeline.status === 'upcoming'
                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                    : quizTimeline.status === 'expired'
                                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                }`}
                              >
                                <CalendarClock className="w-3 h-3" />
                                <span>
                                  {quizTimeline.status === 'upcoming'
                                    ? `Opens in ${formatCountdownString(quizTimeline.secondsUntilRelease || 0)}`
                                    : quizTimeline.status === 'expired'
                                    ? 'Deadline Passed'
                                    : quizTimeline.secondsUntilDeadline
                                    ? `Closes in ${formatCountdownString(quizTimeline.secondsUntilDeadline)}`
                                    : 'Scheduled'}
                                </span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <WifiOff className="w-3 h-3" />
                                <span>Offline Ready</span>
                              </span>
                            )}
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{quiz.durationMinutes || 45} mins</span>
                            </span>
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-bold font-serif text-slate-900 line-clamp-2 leading-snug">
                          {quiz.title || 'MCQ Assessment'}
                        </h3>

                        {/* Tags */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border border-slate-200">
                            {quiz.subject || 'Mathematics'}
                          </span>
                          {quiz.classGroup && (
                            <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border border-slate-200">
                              {quiz.classGroup}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-500 font-medium ml-1">
                            Teacher: {quiz.teacherName || 'Mr. Bismark Twumasi'}
                          </span>
                        </div>
                      </div>

                      {/* Card Footer & Action Buttons */}
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedQuizForQR(quiz);
                              setIsQRModalOpen(true);
                            }}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer border border-slate-300 flex items-center gap-1 text-xs font-semibold"
                            title="View & Download QR Code"
                          >
                            <QrCode className="w-4 h-4 text-amber-600" />
                            <span className="hidden sm:inline">QR Code</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const url = `${window.location.origin}${window.location.pathname}?portal=student&quiz=${encodeURIComponent(quiz.code || quiz.id || '')}`;
                              navigator.clipboard.writeText(url);
                              setCopiedLinkQuizId(quiz.id || quiz.code || 'copied');
                              setTimeout(() => setCopiedLinkQuizId(null), 2500);
                            }}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer border border-slate-300 flex items-center gap-1 text-xs font-semibold"
                            title="Copy Standalone Quiz URL"
                          >
                            {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                            <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Direct Link'}</span>
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedQuiz(quiz);
                            setTimeRemainingSeconds((quiz.durationMinutes || 60) * 60);
                            setSearchError(null);
                          }}
                          disabled={isPaused}
                          className={`font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm group ml-auto ${
                            isPaused
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              : quizTimeline.status === 'upcoming'
                              ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 cursor-pointer'
                              : quizTimeline.status === 'expired'
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer'
                              : 'bg-[#090D1A] hover:bg-amber-600 text-white cursor-pointer'
                          }`}
                        >
                          <span>
                            {isPaused
                              ? 'Exam Paused'
                              : quizTimeline.status === 'upcoming'
                              ? 'View Schedule'
                              : quizTimeline.status === 'expired'
                              ? 'Closed'
                              : 'Begin Exam'}
                          </span>
                          {!isPaused && <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-current group-hover:translate-x-0.5 transition-all" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        {/* Bottom Banner (Technical Requirements) */}
        <div className="bg-gradient-to-b from-[#0f1223] via-[#13172e] to-[#1a1a2e] border border-orange-500/20 rounded-2xl p-6 text-slate-300 shadow-xl space-y-3">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>EXAMINATION GUIDELINES & TECHNICAL REQUIREMENTS</span>
          </h3>

          <ul className="text-xs text-slate-300 space-y-2 pl-1 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
              <span>Mathematical notation is formatted cleanly using KaTeX math rendering.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
              <span>Ensure you maintain active focus on the browser window; integrity surveillance monitors tab switches.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
              <span>Answers are automatically saved every 5 seconds.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
              <span>Upon submission, your score and detailed AI pedagogical feedback will be displayed immediately.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
    );
  }

  // SUBMITTED RESULTS REVIEW VIEW
  if (isSubmitted && completedSubmission) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* TOP PRIORITY ACTION BAR - Download Results Slip as PDF */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-xl border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="p-3.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              <Download className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                  Official Academic Slip
                </span>
                <span className="text-xs font-mono font-bold text-slate-300">
                  ID: {completedSubmission.studentId}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold font-serif text-white mt-1">
                Official Examination Results Slip Ready
              </h2>
              <p className="text-xs text-slate-300 max-w-xl">
                Download your official performance transcript and diagnostics as PDF, or open print preview with authentic institutional seal and verification stamps.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setIsDiagnosticSlipModalOpen(true)}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:scale-98 text-slate-950 font-black text-sm px-6 py-3 rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-950 shrink-0" />
              <span>Download Results Slip as PDF</span>
            </button>

            <button
              type="button"
              onClick={() => setIsResultQRModalOpen(true)}
              className="w-full sm:w-auto bg-indigo-600/80 hover:bg-indigo-600 text-amber-200 font-bold text-xs px-4 py-3 rounded-xl border border-indigo-400/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-amber-300" />
              <span>Result QR</span>
            </button>
          </div>
        </div>

        {/* Score Banner Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="h-3 bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600" />
          <div className="p-6 sm:p-8 text-center">
            <div className="inline-flex p-3 rounded-full bg-emerald-50 text-emerald-600 mb-3">
              <Award className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 font-serif">Assessment Submitted Successfully!</h2>
            <p className="text-slate-600 text-sm mt-1">
              {completedSubmission.studentName} ({completedSubmission.studentId}) • {completedSubmission.school}
            </p>

            <div className="mt-6 inline-flex items-center gap-6 bg-slate-50 border border-slate-200 px-8 py-4 rounded-2xl">
              <div>
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Score</span>
                <span className="text-3xl font-extrabold text-indigo-900">
                  {completedSubmission.totalScore} / {completedSubmission.maxScore}
                </span>
              </div>
              <div className="h-10 w-px bg-slate-300" />
              <div>
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Percentage</span>
                <span className="text-3xl font-extrabold text-emerald-600">
                  {completedSubmission.percentage}%
                </span>
              </div>
              <div className="h-10 w-px bg-slate-300" />
              <div>
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Grade</span>
                <span className="text-2xl font-bold text-indigo-700">
                  {completedSubmission.percentage >= 80 ? 'Distinction (A)' : completedSubmission.percentage >= 60 ? 'Credit (B)' : 'Pass (C)'}
                </span>
              </div>
            </div>

            {/* Direct Slip Download Action Button in Score Card */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsDiagnosticSlipModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-200" />
                <span>Download Results Slip as PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setIsResultQRModalOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-amber-400" />
                <span>Show Result QR Code</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section Score Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4 font-serif">Section Performance Breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {effectiveSections.map((sec) => {
              const secScore = completedSubmission.sectionScores[sec.id] || { score: 0, max: 10, percentage: 0 };
              return (
                <div key={`fav-review-sec-${sec.id}`} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-800">{sec.title}</span>
                    <span className="text-xs font-bold text-indigo-700">
                      {secScore.score} / {secScore.max} ({secScore.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all"
                      style={{ width: `${secScore.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Question Review */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900 font-serif">
              Step-by-Step Question Review & Correct Key Analysis
            </h3>
            <span className="text-xs text-slate-500">
              Showing all {effectiveQuestions.length} questions
            </span>
          </div>

          {effectiveQuestions.map((q, qIndex) => {
            const studentAns = completedSubmission.answers[q.id];
            const isCorrect = studentAns === q.correctAnswer;

            return (
              <div
                key={`fav-review-q-${q.id}`}
                className={`bg-white rounded-2xl border p-5 shadow-xs transition-all ${
                  isCorrect ? 'border-emerald-200 bg-emerald-50/20' : 'border-rose-200 bg-rose-50/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-mono">
                      Question {qIndex + 1}
                    </span>
                  </div>
                  {isCorrect ? (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Correct (+1)
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full flex items-center gap-1 border border-rose-200">
                      <XCircle className="w-3.5 h-3.5" /> Incorrect
                    </span>
                  )}
                </div>

                <div className="text-sm font-medium text-slate-900 my-3 leading-relaxed">
                  <MathRenderer math={q.questionText} />
                </div>

                {/* Attached Diagram in Review Mode */}
                {q.imageUrl && (
                  <div className="my-3 flex flex-col items-center justify-center p-2.5 bg-slate-50 border border-slate-200 rounded-2xl">
                    <img
                      src={q.imageUrl}
                      alt={`Diagram for Question ${q.id}`}
                      onClick={() => setEnlargedDiagramUrl(q.imageUrl || null)}
                      className="max-h-64 max-w-full rounded-xl border border-slate-200 shadow-2xs object-contain bg-white cursor-zoom-in hover:opacity-95"
                    />
                    <span className="text-[11px] text-slate-500 mt-1.5 font-medium">Click diagram to inspect full-size</span>
                  </div>
                )}

                {/* Options List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-3">
                  {q.options.map((opt, optIdx) => {
                    const targetKey = opt.originalId || opt.id;
                    const isSelected = studentAns === targetKey;
                    const isKey = q.correctAnswer === targetKey;

                    let optionBg = 'bg-slate-50 border-slate-200 text-slate-700';
                    if (isKey) {
                      optionBg = 'bg-emerald-100 border-emerald-400 text-emerald-900 font-semibold';
                    } else if (isSelected && !isCorrect) {
                      optionBg = 'bg-rose-100 border-rose-400 text-rose-900 font-semibold line-through';
                    }

                    return (
                      <div
                        key={`fav-review-opt-${q.id || 'q'}-${opt.id || optIdx}-${optIdx}`}
                        className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${optionBg}`}
                      >
                        <span className="w-5 h-5 rounded-full bg-white/80 border border-slate-300 flex items-center justify-center font-bold text-[11px]">
                          {opt.id}
                        </span>
                        <MathRenderer math={opt.text} />
                        {isKey && <Check className="w-4 h-4 text-emerald-700 ml-auto" />}
                      </div>
                    );
                  })}
                </div>

                {/* Step by step explanation */}
                <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                  <span className="font-bold text-slate-900 block">Explanation & Formula Step:</span>
                  <MathRenderer math={q.explanation} />
                  {q.officialKeyNote && (
                    <p className="text-[11px] text-amber-700 italic pt-1 border-t border-slate-200 mt-1">
                       Note on Answer Key: {q.officialKeyNote}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Retake or Return */}
        <div className="text-center pt-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {completedSubmission && (
              <button
                onClick={() => setIsDiagnosticSlipModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-200" />
                <span>Download Official Result Slip (PDF / Print)</span>
              </button>
            )}

            <button
              onClick={() => setIsResultQRModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-amber-300" />
              <span>Show My Result QR Code (Offline Proof)</span>
            </button>

            <button
              onClick={() => {
                setIsSubmitted(false);
                setHasStartedQuiz(false);
                setAnswers({});
                setShuffledQuestionIds([]);
                setShuffledOptionMaps({});
                setCompletedSubmission(null);
                setTimeRemainingSeconds((effectiveConfig.durationMinutes || 60) * 60);
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isStandaloneMode ? 'Retake This Assessment' : 'Take Another Assessment'}</span>
            </button>

            {!isStandaloneMode && (
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setHasStartedQuiz(false);
                  setSelectedQuiz(null);
                  setAnswers({});
                  setShuffledQuestionIds([]);
                  setShuffledOptionMaps({});
                  setCompletedSubmission(null);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm px-6 py-2.5 rounded-xl shadow-xs border border-slate-300 transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600" />
                <span>Back to All Quizzes</span>
              </button>
            )}
          </div>
        </div>

        {/* Student Result QR Code Modal */}
        {isResultQRModalOpen && completedSubmission && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Official Examination Result</span>
                  <h3 className="text-base font-bold text-slate-900 font-serif">{completedSubmission.studentName}</h3>
                </div>
                <button
                  onClick={() => setIsResultQRModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                <div className="text-2xl font-black text-indigo-900">
                  Score: {completedSubmission.totalScore} / {completedSubmission.maxScore} ({completedSubmission.percentage}%)
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  ID: {completedSubmission.studentId} • {completedSubmission.classGroup}
                </p>
                <div className="text-[11px] text-slate-500 font-mono">
                  Timestamp: {new Date(completedSubmission.submittedAt).toLocaleString()}
                </div>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-2xl inline-block shadow-inner">
                {/* Result QR Code */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    JSON.stringify({
                      subId: completedSubmission.id,
                      name: completedSubmission.studentName,
                      id: completedSubmission.studentId,
                      score: completedSubmission.totalScore,
                      max: completedSubmission.maxScore,
                      pct: completedSubmission.percentage,
                      date: completedSubmission.submittedAt,
                    })
                  )}`}
                  alt="Student Result Verification QR"
                  className="w-44 h-44 mx-auto object-contain"
                />
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Show this QR Code to your teacher to scan and sync your score offline with zero internet connection required.
              </p>

              <button
                onClick={() => setIsResultQRModalOpen(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl"
              >
                Close Verification Card
              </button>
            </div>
          </div>
        )}

        {/* Student Diagnostic Performance Slip Modal */}
        {isDiagnosticSlipModalOpen && completedSubmission && (
          <StudentDiagnosticPerformanceSlipModal
            submission={completedSubmission}
            questions={effectiveQuestions}
            sections={effectiveSections}
            onClose={() => setIsDiagnosticSlipModalOpen(false)}
          />
        )}
      </div>
    );
  }

  // ACTIVE QUIZ ASSESSMENT VIEW
  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      className={`max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-6 pb-20 lg:pb-6 relative secure-exam-viewport select-none max-lg:fixed max-lg:inset-0 max-lg:h-[100dvh] max-lg:w-full max-lg:flex max-lg:flex-col max-lg:overflow-hidden max-lg:p-0 max-lg:bg-slate-50 ${
        hasStartedQuiz && !isSubmitted ? 'pt-[48px]' : ''
      } ${
        isScreenShieldActive ? 'filter blur-xl transition-all duration-150' : ''
      }`}
    >
      {/* Exam Top Edge Guard - Active Detection Zone across screen top edge to intercept any attempt to reach browser tabs/chrome */}
      {hasStartedQuiz && !isSubmitted && (
        <div
          id="exam-top-edge-guard"
          className="exam-top-edge-guard fixed top-0 left-0 right-0 w-full z-[70] bg-transparent cursor-default select-none"
          style={{ height: '48px', pointerEvents: 'all' }}
          aria-hidden="true"
          onMouseEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            triggerTopEdgeViolationRef.current('Cursor moved into top screen edge zone (browser tab/chrome switch attempt)');
          }}
          onMouseMove={(e) => {
            e.preventDefault();
            e.stopPropagation();
            triggerTopEdgeViolationRef.current('Cursor moving across top screen edge zone (browser tab/chrome switch attempt)');
          }}
          onPointerEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            triggerTopEdgeViolationRef.current('Pointer entered top screen edge zone');
          }}
          onPointerMove={(e) => {
            e.preventDefault();
            e.stopPropagation();
            triggerTopEdgeViolationRef.current('Pointer moving across top screen edge zone');
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            triggerTopEdgeViolationRef.current('Click blocked at top screen edge (attempted tab switch)');
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            triggerTopEdgeViolationRef.current('Mouse press intercepted at top screen edge (attempted tab switch)');
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            triggerTopEdgeViolationRef.current('Pointer press intercepted at top screen edge (attempted tab switch)');
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            triggerTopEdgeViolationRef.current('Right-click blocked at top screen edge');
          }}
          onAuxClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            triggerTopEdgeViolationRef.current('Auxiliary click blocked at top screen edge');
          }}
          onTouchStart={(e) => {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();
            triggerTopEdgeViolationRef.current('Top screen edge pull / notification bar attempt blocked!');
          }}
          onTouchMove={(e) => {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();
            triggerTopEdgeViolationRef.current('Top screen edge swipe blocked!');
          }}
        />
      )}

      {/* Dynamic Anti-Leak Forensic Proctoring Watermark Overlay */}
      <div className="pointer-events-none fixed inset-0 z-20 select-none overflow-hidden opacity-[0.022] mix-blend-multiply flex flex-wrap content-around justify-around p-4" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={`watermark-${i}`}
            className="transform -rotate-25 text-center font-mono text-[10px] sm:text-xs font-black text-slate-900 tracking-wider whitespace-nowrap p-4"
          >
            <div>{studentInfo.name || 'Candidate'} • {studentInfo.studentId || 'Joy Assessment'}</div>
            <div>{effectiveConfig.code || 'EXAM'} • CONFIDENTIAL & PROTECTED</div>
          </div>
        ))}
      </div>

      {/* Anti-Screenshot Privacy Shield Overlay */}
      {isScreenShieldActive && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-rose-500 rounded-3xl p-8 max-w-md w-full text-center text-white shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8 animate-bounce" />
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest bg-rose-500/20 text-rose-300 px-3 py-1 rounded-full border border-rose-500/40 inline-block">
                Protected Viewport
              </span>
              <h3 className="text-xl font-bold font-serif text-white">
                Screen Capture Protected
              </h3>
              <p className="text-xs text-rose-300 font-medium leading-relaxed">
                Examination questions are strictly protected against screenshots, screen recorders, and clipping tools. Refocus this browser window to resume your examination session.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Screenshot Warning Banner */}
      {screenshotAlert && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-rose-900 text-rose-100 border border-rose-500/80 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-200">
          <ShieldAlert className="w-5 h-5 text-rose-300 shrink-0" />
          <div className="text-xs font-bold">
            <span>{screenshotAlert}</span>
          </div>
          <button
            onClick={() => setScreenshotAlert(null)}
            className="text-rose-300 hover:text-white text-xs font-black ml-2 px-1.5 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Prominent Floating Banner for Final Minute (<= 60s and > 10s) */}
      {hasStartedQuiz && !isSubmitted && timeRemainingSeconds <= 60 && timeRemainingSeconds > 10 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-rose-700 via-amber-600 to-rose-700 text-white px-5 py-2.5 rounded-2xl shadow-2xl border border-white/30 flex items-center gap-3 animate-pulse">
          <Clock className="w-5 h-5 animate-spin text-amber-200 shrink-0" />
          <div className="text-xs font-black tracking-wide">
            <span>⚠️ FINAL MINUTE COUNTDOWN: Less than 1 minute remaining ({formatTime(timeRemainingSeconds)})! Automatic submission occurs at 00:00.</span>
          </div>
        </div>
      )}

      {/* 10-Second High-Urgency Auto-Submit Countdown Modal with Beeps and Animated Counter */}
      {hasStartedQuiz && !isSubmitted && timeRemainingSeconds <= 10 && timeRemainingSeconds >= 0 && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-rose-500 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl text-white space-y-5 animate-in zoom-in-95">
            <div className="relative flex items-center justify-center mx-auto my-2">
              <div className="absolute w-28 h-28 rounded-full bg-rose-500/25 animate-ping" />
              <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-rose-500 to-rose-700 text-white flex items-center justify-center font-mono font-black text-5xl shadow-2xl ring-4 ring-rose-400/50">
                {timeRemainingSeconds}
              </div>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider animate-pulse">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>Automatic Submission In Progress</span>
              </div>
              <h3 className="text-xl font-bold font-serif">
                {timeRemainingSeconds === 0 ? 'Submitting Assessment Now...' : 'Time Almost Up!'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {timeRemainingSeconds === 0 
                  ? 'Saving your final answers and submitting your assessment to your instructor...' 
                  : `Your quiz will automatically finalize and submit in ${timeRemainingSeconds} second${timeRemainingSeconds === 1 ? '' : 's'}.`}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center">
              <button
                onClick={handleFinalSubmit}
                className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-500 shadow-xl cursor-pointer transition-all flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Submit Immediately</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Teacher Pause Freeze Overlay */}
      {effectiveConfig.status === 'paused' && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border-2 border-amber-400 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 border border-amber-300 flex items-center justify-center mx-auto shadow-inner">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-200">
                Session Frozen
              </span>
              <h3 className="text-xl font-black font-serif text-slate-900">
                Assessment Paused by Teacher
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Your instructor has temporarily paused this quiz. The countdown timer is frozen and all your answers have been safely saved. The examination will automatically resume once your instructor unpauses it.
              </p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-900 border border-amber-200 flex items-center justify-center gap-2 font-semibold">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
              <span>Real-time sync active • Waiting for teacher...</span>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Top Action Bar - Sticky Compressed Timers Header (Permanently pinned at top, no scrolling required) */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b lg:border border-slate-200 lg:rounded-2xl px-2 sm:px-4 py-1.5 sm:py-2.5 mb-1 lg:mb-4 shadow-xs flex items-center justify-between gap-1.5 sm:gap-2 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span className="text-xs sm:text-sm font-extrabold text-slate-900 bg-slate-100 border border-slate-200 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl font-mono whitespace-nowrap shrink-0">
            Q {safeQuestionIndex + 1}/{effectiveQuestions.length}
          </span>
          <div className="hidden sm:block min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-slate-800 font-serif truncate max-w-[140px] md:max-w-[200px] lg:max-w-none">
              {config.subject || 'Assessment'}
            </h2>
            <p className="text-[10px] sm:text-[11px] text-slate-500 hidden lg:block truncate">
              Candidate: <span className="font-semibold text-slate-700">{studentInfo.name}</span> ({studentInfo.studentId})
            </p>
          </div>
        </div>

        {/* Timers Container: Total Exam Timer & Question Timer side-by-side on top */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Total Exam Countdown Timer */}
          <div
            title="Total Exam Time Remaining"
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl border transition-all shadow-xs ${
              timeRemainingSeconds <= 60
                ? 'bg-rose-950/95 border-rose-500 text-white animate-pulse ring-1 ring-rose-400/50'
                : timeRemainingSeconds <= 300
                ? 'bg-amber-950/95 border-amber-500 text-white ring-1 ring-amber-400/30'
                : 'bg-slate-900 border-slate-700 text-white'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
              timeRemainingSeconds <= 60
                ? 'text-rose-400 animate-spin'
                : timeRemainingSeconds <= 300
                ? 'text-amber-400 animate-pulse'
                : 'text-amber-300'
            }`} />
            <div className="flex items-baseline gap-1">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase hidden md:inline">Total:</span>
              <span className={`font-mono text-xs sm:text-sm md:text-base font-black tracking-wider leading-none ${
                timeRemainingSeconds <= 60
                  ? 'text-rose-400'
                  : 'text-amber-300'
              }`}>
                {formatTime(timeRemainingSeconds)}
              </span>
            </div>
          </div>

          {/* Per-Question Live Countdown Timer */}
          {isPerQuestionTimer && (
            <div
              title={`Question ${safeQuestionIndex + 1} Time Remaining`}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl border transition-all shadow-xs ${
                questionTimeRemaining <= 10
                  ? 'bg-rose-600 border-rose-700 text-white animate-pulse ring-2 ring-rose-400'
                  : questionTimeRemaining <= 25
                  ? 'bg-amber-600 border-amber-700 text-white'
                  : 'bg-indigo-950 border-indigo-700 text-white'
              }`}
            >
              <Timer className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                questionTimeRemaining <= 10 ? 'text-white animate-bounce' : 'text-indigo-300'
              }`} />
              <div className="flex items-baseline gap-1">
                <span className="text-[9px] sm:text-[10px] font-bold text-indigo-200 uppercase hidden md:inline">Q-Timer:</span>
                <span className={`font-mono text-xs sm:text-sm md:text-base font-black tracking-wider leading-none ${
                  questionTimeRemaining <= 10 ? 'text-white' : questionTimeRemaining <= 25 ? 'text-amber-200' : 'text-indigo-200'
                }`}>
                  0:{(questionTimeRemaining % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Icons Embedded in Top Header */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Bookmark / Review Flag Button */}
          {effectiveQuestions[safeQuestionIndex] && (
            <button
              type="button"
              onClick={() => {
                markInternalInteraction();
                toggleBookmark(effectiveQuestions[safeQuestionIndex].id);
              }}
              title={bookmarkedQuestions.includes(effectiveQuestions[safeQuestionIndex].id) ? "Bookmarked" : "Bookmark"}
              className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center min-h-[34px] min-w-[34px] ${
                bookmarkedQuestions.includes(effectiveQuestions[safeQuestionIndex].id)
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${bookmarkedQuestions.includes(effectiveQuestions[safeQuestionIndex].id) ? 'fill-current' : ''}`} />
            </button>
          )}

          {/* Desktop Submit Button: Only shown when questions are paginated (one question per page) */}
          {isPaginated && (!isFullscreenLockdown || safeQuestionIndex >= effectiveQuestions.length - 1) && (
            <button
              type="button"
              onClick={triggerSubmitConfirmation}
              className="hidden lg:flex bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-sm transition-all items-center gap-1.5 cursor-pointer animate-pulse"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit</span>
            </button>
          )}
        </div>
      </div>

      {/* Sleek Sub-Header Question Progress Bar (Directly attached under top bar, eliminates need to scroll) */}
      {isPerQuestionTimer && (
        <div className="w-full h-1 bg-slate-200 -mt-1 mb-1.5 lg:mb-3 overflow-hidden rounded-full shrink-0">
          <div
            className={`h-full transition-all duration-1000 ${
              questionTimeRemaining <= 10
                ? 'bg-rose-600'
                : questionTimeRemaining <= 25
                ? 'bg-amber-500'
                : 'bg-indigo-600'
            }`}
            style={{
              width: `${Math.min(100, Math.max(0, (questionTimeRemaining / perQuestionDurationSeconds) * 100))}%`
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-lg:flex-1 max-lg:flex max-lg:flex-col max-lg:overflow-hidden max-lg:gap-0">
        {/* Main Form Questions Column */}
        <div className="lg:col-span-3 space-y-6 max-lg:flex-1 max-lg:flex max-lg:flex-col max-lg:overflow-y-auto max-lg:p-3 max-lg:pb-48 max-lg:space-y-0 scroll-smooth mobile-question-scroll-container">
          {/* Question Cards List */}
          {(() => {
            const isPaginated = isMobileScreen || isLinearExam || effectiveConfig.questionPaginationMode === 'one-question-per-page';
            const safeQuestionIndex = Math.min(currentQuestionIndex, Math.max(0, effectiveQuestions.length - 1));
            const displayedQuestions = isPaginated
              ? [effectiveQuestions[safeQuestionIndex]].filter(Boolean)
              : effectiveQuestions;

            return (
              <>
                {/* Auto-Skip Incident Notification Banner */}
                {autoSkipNotice && (
                  <div className="p-4 rounded-2xl bg-rose-600 text-white font-semibold text-xs shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 shrink-0 text-amber-300" />
                      <span>{autoSkipNotice}</span>
                    </div>
                    <button
                      onClick={() => setAutoSkipNotice(null)}
                      className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white text-[11px] font-bold cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Linear Mode Indicator */}
                {isLinearExam && (
                  <div className="px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      <span className="font-semibold">Linear Mode: Strict forward progression (No Going Back).</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Q{safeQuestionIndex + 1}/{effectiveQuestions.length}
                    </span>
                  </div>
                )}

                {displayedQuestions.map((q) => {
                  const selectedOpt = answers[q.id];
                  const isBookmarked = bookmarkedQuestions.includes(q.id);

                  // Calculate 1-based sequential number in this candidate's exam session
                  const candidateQIndex = effectiveQuestions.findIndex((item) => String(item.id) === String(q.id));
                  const displayQuestionNumber = candidateQIndex >= 0 ? candidateQIndex + 1 : q.id;

                  return (
                    <div
                      key={`fav-qfrag-${q.id}`}
                      id={`question-card-${q.id}`}
                      className={`bg-white rounded-2xl border transition-all p-5 shadow-xs hover:shadow-md ${
                        selectedOpt ? 'border-indigo-300 bg-indigo-50/10' : 'border-slate-200'
                      }`}
                    >
                      {/* Question Header */}
                      <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center font-mono shadow-xs">
                            {displayQuestionNumber}
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            Question {displayQuestionNumber} of {effectiveQuestions.length}
                          </span>
                        </div>

                        <button
                          onClick={() => toggleBookmark(q.id)}
                          className={`p-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                            isBookmarked
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                          }`}
                          title="Bookmark for later review"
                        >
                          <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500 text-amber-500' : ''}`} />
                          <span className="hidden sm:inline">{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                        </button>
                      </div>

                      {/* Question Body with LaTeX Math Renderer */}
                      <div className="quiz-question-body font-medium text-slate-900 my-4 leading-relaxed">
                        <MathRenderer math={q.questionText} />
                      </div>

                      {/* Attached Diagram in Active Exam Mode */}
                      {q.imageUrl && (
                        <div className="my-4 flex flex-col items-center justify-center p-3 bg-slate-50/80 border border-slate-200 rounded-2xl">
                          <img
                            src={q.imageUrl}
                            alt={`Figure for Question ${q.id}`}
                            onClick={() => setEnlargedDiagramUrl(q.imageUrl || null)}
                            className="max-h-72 max-w-full rounded-xl border border-slate-200 shadow-2xs object-contain bg-white cursor-zoom-in hover:opacity-95 transition-transform"
                          />
                          <span className="text-[11px] text-slate-500 mt-1.5 font-medium">Click figure to enlarge</span>
                        </div>
                      )}

                      {/* Option Choice Buttons */}
                      <div className="space-y-2 sm:space-y-2.5">
                        {q.options.map((opt, optIdx) => {
                          const targetKey = opt.originalId || opt.id;
                          const isSelected = selectedOpt === targetKey;

                          return (
                            <button
                              key={`fav-qopt-${q.id || 'q'}-${opt.id || optIdx}-${optIdx}`}
                              type="button"
                              onClick={() => {
                                markInternalInteraction();
                                handleSelectOption(q.id, targetKey);
                              }}
                              className={`quiz-option-button w-full text-left p-2.5 sm:p-3.5 rounded-xl border transition-all flex items-center gap-2.5 sm:gap-3 cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-semibold shadow-xs ring-2 ring-indigo-200'
                                  : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <span
                                className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                                  isSelected
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'border-slate-300 text-slate-600 bg-slate-50'
                                }`}
                              >
                                {opt.id}
                              </span>
                              <div className="quiz-option-text text-xs sm:text-sm flex-1 min-w-0 leading-relaxed text-left">
                                <MathRenderer math={opt.text} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* For Quiz Mode when all questions are on one page: Submit button/icon at the bottom of the app */}
                {!isPaginated && effectiveQuestions.length > 0 && (
                  <div className="bg-white border-2 border-emerald-500/30 rounded-2xl p-6 sm:p-8 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 bg-gradient-to-r from-emerald-50/50 to-white">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold shadow-inner shrink-0">
                        <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-900 font-serif">Completed answering all questions?</h4>
                        <p className="text-xs text-slate-600 font-medium">
                          {totalAnsweredCount} of {effectiveQuestions.length} questions answered. Review your selections before submitting.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={triggerSubmitConfirmation}
                      className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
                    >
                      <Send className="w-4 h-4" />
                      <span>Submit Quiz</span>
                    </button>
                  </div>
                )}

                {/* Paginated Navigation Control Bar - Hidden on mobile so there is strictly ONE navigation control on phones */}
                {isPaginated && effectiveQuestions.length > 0 && (
                  <div className="hidden lg:flex bg-white border border-slate-200 rounded-2xl p-4 shadow-xs items-center justify-between gap-4 mt-2">
                    {isFullscreenLockdown ? (
                      /* Lockdown Mode: Only Next (until last question, then Submit) - No Previous */
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 font-mono">
                            Question {safeQuestionIndex + 1} of {effectiveQuestions.length}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                            • {totalAnsweredCount} answered
                          </span>
                        </div>

                        {safeQuestionIndex < effectiveQuestions.length - 1 ? (
                          <button
                            type="button"
                            onClick={goToNextQuestion}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <span>Next Question</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={triggerSubmitConfirmation}
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md animate-pulse"
                          >
                            <span>Submit Exam</span>
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    ) : (
                      /* Normal Mode: Next / Previous / Submit */
                      <>
                        <button
                          type="button"
                          disabled={safeQuestionIndex === 0}
                          onClick={goToPrevQuestion}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl disabled:opacity-40 disabled:hover:bg-slate-100 transition-all flex items-center gap-1 cursor-pointer border border-slate-300"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Previous</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 font-mono">
                            Question {safeQuestionIndex + 1} of {effectiveQuestions.length}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {safeQuestionIndex < effectiveQuestions.length - 1 ? (
                            <button
                              type="button"
                              onClick={goToNextQuestion}
                              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <span>Next</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => {
                              markInternalInteraction();
                              setShowConfirmModal(true);
                            }}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <span>Submit Quiz</span>
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Sidebar Question Navigation Palette - Hidden on phones so phone UI is clean and distraction-free */}
        <div className="hidden lg:block space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Question Palette ({effectiveQuestions.length} Questions)
            </h3>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-indigo-600" /> Answered
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300" /> Unanswered
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-400" /> Bookmarked
              </div>
            </div>

            {/* Question Grid */}
            {isLinearExam && (
              <div className="mb-2.5 p-2 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-1.5 text-[11px] text-purple-900 font-medium">
                <Lock className="w-3.5 h-3.5 shrink-0 text-purple-600" />
                <span>Linear Mode: Sequential answering required.</span>
              </div>
            )}
            <div className="grid grid-cols-5 gap-1.5 max-h-80 overflow-y-auto pr-1">
              {effectiveQuestions.map((q, qIdx) => {
                const isAnswered = !!answers[q.id];
                const isBookmarked = bookmarkedQuestions.includes(q.id);
                const displayNum = qIdx + 1;
                const isCurrent = qIdx === currentQuestionIndex;
                const isPast = qIdx < currentQuestionIndex;

                if (isLinearExam) {
                  return (
                    <button
                      key={`fav-qpal-${q.id}`}
                      disabled={!isCurrent}
                      title={
                        isCurrent
                          ? `Question ${displayNum} (Current active question)`
                          : isPast
                          ? `Question ${displayNum} (Answered)`
                          : `Question ${displayNum} (Sequential)`
                      }
                      className={`h-8 rounded-lg text-xs font-bold transition-all relative flex items-center justify-center border font-mono ${
                        isCurrent
                          ? 'bg-purple-700 border-purple-800 text-white ring-2 ring-purple-400 shadow-sm'
                          : isPast
                          ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-70'
                          : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-40'
                      }`}
                    >
                      <span>{displayNum}</span>
                      {isPast && <Lock className="w-2.5 h-2.5 ml-0.5 opacity-60" />}
                    </button>
                  );
                }

                return (
                  <button
                    key={`fav-qpal-${q.id}`}
                    onClick={() => {
                      markInternalInteraction();
                      const isPaginated = effectiveConfig.questionPaginationMode === 'one-question-per-page';
                      if (isPaginated) {
                        setCurrentQuestionIndex(qIdx);
                        currentQuestionIndexRef.current = qIdx;
                      } else {
                        const elem = document.getElementById(`question-card-${q.id}`);
                        elem?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                    className={`h-8 rounded-lg text-xs font-bold transition-all relative flex items-center justify-center border font-mono cursor-pointer ${
                      isBookmarked
                        ? 'bg-amber-100 border-amber-400 text-amber-900 ring-2 ring-amber-200'
                        : isAnswered
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {displayNum}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
              <div className="flex justify-between text-xs text-slate-600 font-medium">
                <span>Completed</span>
                <span className="font-bold text-indigo-700">
                  {Math.round((totalAnsweredCount / Math.max(1, effectiveQuestions.length)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all"
                  style={{ width: `${(totalAnsweredCount / Math.max(1, effectiveQuestions.length)) * 100}%` }}
                />
              </div>

              {isFullscreenLockdown ? (
                safeQuestionIndex === effectiveQuestions.length - 1 ? (
                  <button
                    onClick={triggerSubmitConfirmation}
                    className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Exam</span>
                  </button>
                ) : (
                  <div className="w-full mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 text-[11px] font-medium flex items-center justify-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Submit unlocks on Question #{effectiveQuestions.length}</span>
                  </div>
                )
              ) : (
                <button
                  onClick={triggerSubmitConfirmation}
                  className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Quiz</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY BOTTOM DOCK (Visible on mobile/tablet) - Single unified navigation dock with NO palette */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090D1A]/95 backdrop-blur-md border-t border-slate-800 p-2.5 px-4 shadow-2xl flex items-center justify-between gap-3 safe-bottom-dock">
        {isFullscreenLockdown || isLinearExam ? (
          /* Lockdown / Linear Mode on Phones: Only Question counter and Next/Submit */
          <>
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-xs font-bold text-white font-mono truncate">
                Question {safeQuestionIndex + 1} of {effectiveQuestions.length}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {totalAnsweredCount}/{effectiveQuestions.length} answered
              </span>
            </div>

            {safeQuestionIndex < effectiveQuestions.length - 1 ? (
              <button
                type="button"
                onClick={goToNextQuestion}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={triggerSubmitConfirmation}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer animate-pulse"
              >
                <Send className="w-4 h-4" />
                <span>Submit Exam</span>
              </button>
            )}
          </>
        ) : (
          /* Normal Mode on Phones: Prev, Next, Submit - Palette removed as requested */
          <>
            <button
              type="button"
              disabled={safeQuestionIndex === 0}
              onClick={goToPrevQuestion}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold disabled:opacity-40 min-h-[44px]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex flex-col min-w-0 px-1 text-center">
              <span className="text-xs font-bold text-white font-mono">
                {safeQuestionIndex + 1}/{effectiveQuestions.length}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {totalAnsweredCount} answered
              </span>
            </div>

            {safeQuestionIndex < effectiveQuestions.length - 1 ? (
              <button
                type="button"
                onClick={goToNextQuestion}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={triggerSubmitConfirmation}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer animate-pulse"
              >
                <Send className="w-4 h-4" />
                <span>Submit Exam</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Exit Examination Early Modal - strictly disabled during full-screen lockdown */}
      {!isFullscreenLockdown && showExitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-2xl text-rose-700">
                <DoorOpen className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
                  Student Examination Session
                </span>
                <h3 className="text-lg font-bold text-slate-900 font-serif">Exit Examination Early?</h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              If you feel you cannot continue the assessment right now, you may exit. Your current answers (<span className="font-bold text-slate-900">{totalAnsweredCount} answered</span>) can be saved as a draft so you can resume later, or you can submit what you have completed.
            </p>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Time Remaining: {formatTime(timeRemainingSeconds)}</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Exiting will return you to the Student Assessment Portal main view.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  stopCamera();
                  captureTimeoutsRef.current.forEach(clearTimeout);
                  captureTimeoutsRef.current = [];
                  handleSaveDraft();
                  setShowExitModal(false);
                  setHasStartedQuiz(false);
                  setSelectedQuiz(null);
                }}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4 text-emerald-400" />
                <span>Save Draft & Exit Examination</span>
              </button>

              <button
                onClick={() => {
                  setShowExitModal(false);
                  handleFinalSubmit();
                }}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Submit Completed Answers & Exit</span>
              </button>

              <button
                onClick={() => setShowExitModal(false)}
                className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel & Resume Answering
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-indigo-600">
              <AlertCircle className="w-7 h-7" />
              <h3 className="text-lg font-bold text-slate-900 font-serif">Submit Assessment?</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              You have answered <span className="font-bold text-indigo-600">{totalAnsweredCount} out of {effectiveQuestions.length} questions</span>. 
              {totalAnsweredCount < effectiveQuestions.length ? (
                <span className="text-amber-700 font-semibold block mt-1">
                  Warning: You have {effectiveQuestions.length - totalAnsweredCount} unanswered question{effectiveQuestions.length - totalAnsweredCount === 1 ? '' : 's'} remaining.
                </span>
              ) : (
                <span className="text-emerald-700 font-semibold block mt-1">
                  All {effectiveQuestions.length} questions have been answered.
                </span>
              )}
            </p>

            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Continue Answering
              </button>
              <button
                onClick={handleFinalSubmit}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
              >
                Yes, Submit Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Academic Integrity Warning Modal with live countdown */}
      <IntegrityWarningModal
        isOpen={isIntegrityModalOpen}
        tabSwitchesCount={tabSwitchesCount}
        timeRemainingSeconds={timeRemainingSeconds}
        formatTime={formatTime}
        hasProgressivePenalties={Boolean(effectiveConfig.progressiveTabPenalty || effectiveConfig.enableTabSwitchPenalties)}
        penaltyDeductionMinutes={lastPenaltyDeductionMinutes}
        isAutoSubmitting={isAutoSubmittingDueToPenalties}
        onAcknowledge={() => {
          setIsIntegrityModalOpen(false);
          setWarningsAcknowledgedCount((prev) => prev + 1);
        }}
      />

      {/* 8. LIVE DIRECT PROCTOR INTERVENTION & BROADCAST ANNOUNCEMENT OVERLAY MODAL */}
      {activeTeacherWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className={`bg-white border-2 ${activeTeacherWarning.studentId === 'all' || activeTeacherWarning.type === 'broadcast' ? 'border-indigo-500' : 'border-red-600'} rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95`}>
            {/* Header */}
            <div className={`p-4 sm:p-5 flex items-center gap-3 text-white ${
              activeTeacherWarning.studentId === 'all' || activeTeacherWarning.type === 'broadcast'
                ? 'bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-950'
                : 'bg-gradient-to-r from-red-700 via-rose-800 to-red-700'
            }`}>
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-amber-300 shrink-0 animate-bounce">
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                  {activeTeacherWarning.studentId === 'all' || activeTeacherWarning.type === 'broadcast'
                    ? '📢 Live Class Announcement'
                    : '⚠️ Direct Proctor Warning'}
                </div>
                <h3 className="text-base font-bold text-white font-serif">
                  {activeTeacherWarning.studentId === 'all' || activeTeacherWarning.type === 'broadcast'
                    ? 'Notice to All Candidates'
                    : `Direct Warning for ${studentInfo.name || 'Candidate'}`}
                </h3>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-4 text-xs">
              <div className={`p-4 rounded-2xl space-y-2 border ${
                activeTeacherWarning.studentId === 'all' || activeTeacherWarning.type === 'broadcast'
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-950'
                  : 'bg-red-50 border-red-200 text-red-950'
              }`}>
                <div className="text-[11px] font-bold flex items-center gap-1.5">
                  <AlertTriangle className={`w-4 h-4 shrink-0 ${
                    activeTeacherWarning.studentId === 'all' || activeTeacherWarning.type === 'broadcast' ? 'text-indigo-600' : 'text-red-600'
                  }`} />
                  <span>Message from {activeTeacherWarning.teacherName || 'Examination Proctor / Invigilator'}:</span>
                </div>
                <p className={`text-xs sm:text-sm font-semibold leading-relaxed bg-white/80 p-3 rounded-xl border ${
                  activeTeacherWarning.studentId === 'all' || activeTeacherWarning.type === 'broadcast'
                    ? 'text-indigo-950 border-indigo-100'
                    : 'text-red-900 border-red-100'
                }`}>
                  {activeTeacherWarning.message}
                </p>
                <div className="text-[10px] text-slate-500 font-medium text-right">
                  Transmitted: {new Date(activeTeacherWarning.timestamp).toLocaleTimeString()}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-700 space-y-1">
                <p className="font-bold text-slate-900">Official Exam Room Notice:</p>
                <p>
                  {activeTeacherWarning.studentId === 'all' || activeTeacherWarning.type === 'broadcast'
                    ? 'This announcement is live-streamed to all active examination screens. Please adhere to instructions.'
                    : 'You are required to acknowledge this directive immediately. All examination activity and screen focus events continue to be audited in real-time.'}
                </p>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleAcknowledgeProctorWarning}
                className={`w-full py-3.5 px-4 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 uppercase tracking-wider ${
                  activeTeacherWarning.studentId === 'all' || activeTeacherWarning.type === 'broadcast'
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800'
                    : 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800'
                }`}
              >
                <Check className="w-4 h-4 text-white" />
                <span>
                  {activeTeacherWarning.studentId === 'all' || activeTeacherWarning.type === 'broadcast'
                    ? 'I Acknowledge Announcement & Continue Exam'
                    : 'I Acknowledge & Comply with Invigilator'}
                </span>
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

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onQuizDetected={(detected) => {
          setIsScannerOpen(false);
          if (typeof detected === 'string') {
            handleSearchQuizByCode(detected);
          } else if (detected && (detected as any).config) {
            setSelectedQuiz((detected as any).config);
            setTimeRemainingSeconds(((detected as any).config.durationMinutes || 60) * 60);
            setSearchError(null);
          }
        }}
      />

      {/* Diagram Lightbox Modal */}
      {enlargedDiagramUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setEnlargedDiagramUrl(null)}
        >
          <div
            className="bg-white rounded-3xl p-4 max-w-4xl max-h-[90vh] flex flex-col items-center relative shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setEnlargedDiagramUrl(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
              title="Close zoom"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="p-2 w-full flex justify-center items-center overflow-auto max-h-[80vh]">
              <img
                src={enlargedDiagramUrl}
                alt="Enlarged Diagram View"
                className="max-h-[75vh] max-w-full object-contain rounded-xl"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">Click outside or press Esc to close</p>
          </div>
        </div>
      )}

      {/* Kiosk Key Lock Toast */}
      {keyLockNotice && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-amber-300 border border-amber-500/50 px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 backdrop-blur-md">
          <Lock className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{keyLockNotice}</span>
          <button
            onClick={() => setKeyLockNotice(null)}
            className="ml-2 text-slate-400 hover:text-white text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Fullscreen Recovery Overlay */}
      {isFullscreenExitedModalOpen && hasStartedQuiz && !isSubmitted && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl border-2 border-purple-500">
            <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-700 mx-auto flex items-center justify-center shadow-inner">
              <Maximize2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">
                Fullscreen Kiosk Required
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                This examination is operating under institutional lockdown proctoring. You must return to full-screen view to continue answering questions.
              </p>
            </div>
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-[11px] text-left font-medium">
              ⚠️ Exiting fullscreen is logged as an integrity incident and transmitted to the instructor dashboard.
            </div>
            <button
              type="button"
              onClick={() => {
                try {
                  const docEl = document.documentElement as any;
                  const options = { navigationUI: 'hide' } as any;
                  if (docEl.requestFullscreen) {
                    docEl.requestFullscreen(options).then(() => {
                      requestKeyboardLock();
                    }).catch(() => {
                      docEl.requestFullscreen().then(() => {
                        requestKeyboardLock();
                      }).catch(() => {});
                    });
                  } else if (docEl.webkitRequestFullscreen) {
                    docEl.webkitRequestFullscreen(options);
                    setTimeout(requestKeyboardLock, 250);
                  }
                } catch (e) {}
                setIsFullscreenExitedModalOpen(false);
              }}
              className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Return to Fullscreen Mode</span>
            </button>
          </div>
        </div>
      )}

      {/* Live Webcam Proctoring Preview Widget during Exam - Avoids overlapping mobile bottom dock and question options */}
      {effectiveConfig.enableCameraProctoring && hasStartedQuiz && !isSubmitted && (
        isCameraPreviewMinimized ? (
          /* Minimized Compact Live Pill Mode on Mobile / Desktop */
          <button
            type="button"
            onClick={() => setIsCameraPreviewMinimized(false)}
            className={`camera-proctoring-pill fixed z-50 rounded-full px-3 py-1.5 shadow-2xl flex items-center gap-2 cursor-pointer backdrop-blur-md transition-all border select-none ${
              cameraPositionCorner === 'bottom-left'
                ? 'pos-left max-lg:top-14 max-lg:left-2 lg:bottom-4 lg:left-4'
                : cameraPositionCorner === 'top-right'
                ? 'pos-right max-lg:top-14 max-lg:right-2 lg:top-16 lg:right-4'
                : 'pos-right max-lg:top-14 max-lg:right-2 lg:bottom-4 lg:right-4'
            } ${
              isPreviewVideoLive
                ? 'bg-slate-900/95 border-emerald-500 text-emerald-300 hover:bg-slate-800'
                : previewCameraError
                ? 'bg-slate-900/95 border-rose-500 text-rose-300 hover:bg-slate-800'
                : 'bg-slate-900/95 border-amber-500 text-amber-300 hover:bg-slate-800'
            }`}
            title="Click to expand camera proctoring preview"
          >
            {isPreviewVideoLive ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] font-mono font-black uppercase tracking-wider">LIVE CAMERA</span>
              </>
            ) : previewCameraError ? (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <CameraOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-[10px] font-mono font-bold uppercase">OFFLINE</span>
              </>
            ) : (
              <>
                <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                <span className="text-[10px] font-mono font-bold uppercase">STARTING</span>
              </>
            )}
            <Maximize2 className="w-3 h-3 text-slate-400 ml-0.5 hover:text-white" />
          </button>
        ) : (
          /* Full Live Camera Widget with responsive corner positioning & mobile clearance */
          <div
            className={`camera-proctoring-widget fixed z-50 bg-slate-900/95 text-white border-2 border-emerald-500 rounded-2xl p-2 sm:p-2.5 shadow-2xl backdrop-blur-md flex flex-col items-center gap-1.5 transition-all select-none w-32 sm:w-40 lg:w-44 ${
              cameraPositionCorner === 'bottom-left'
                ? 'pos-left max-lg:top-14 max-lg:left-2 lg:bottom-4 lg:left-4'
                : cameraPositionCorner === 'top-right'
                ? 'pos-right max-lg:top-14 max-lg:right-2 lg:top-16 lg:right-4'
                : 'pos-right max-lg:top-14 max-lg:right-2 lg:bottom-4 lg:right-4'
            }`}
          >
            <div className="flex items-center justify-between w-full px-1 text-[10px] font-bold text-slate-300">
              {isPreviewVideoLive ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <Camera className="w-3 h-3" />
                  <span className="text-[9px] font-bold">Active</span>
                </span>
              ) : previewCameraError ? (
                <span className="flex items-center gap-1 text-rose-400">
                  <CameraOff className="w-3 h-3" />
                  <span className="text-[9px] font-bold">Issue</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400">
                  <Camera className="w-3 h-3 animate-pulse" />
                  <span className="text-[9px]">Starting...</span>
                </span>
              )}

              <div className="flex items-center gap-1">
                {isPreviewVideoLive ? (
                  <span className="px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                ) : previewCameraError ? (
                  <span className="px-1 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[8.5px] font-black uppercase tracking-wider">
                    OFF
                  </span>
                ) : (
                  <span className="px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[8.5px] font-bold uppercase flex items-center gap-1">
                    <Loader2 className="w-2 h-2 animate-spin text-amber-400" />
                  </span>
                )}

                {/* Move corner toggle (repositions camera away from any question text/options) */}
                <button
                  type="button"
                  onClick={() =>
                    setCameraPositionCorner((prev) =>
                      prev === 'bottom-right' || prev === 'top-right' ? 'bottom-left' : 'top-right'
                    )
                  }
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                  title="Move camera to opposite corner"
                >
                  <Move className="w-2.5 h-2.5" />
                </button>

                {/* Minimize toggle */}
                <button
                  type="button"
                  onClick={() => setIsCameraPreviewMinimized(true)}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                  title="Minimize camera preview"
                >
                  <Minimize2 className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>

            <div className="camera-video-container relative w-28 h-20 sm:w-36 sm:h-25 lg:w-40 lg:h-28 bg-black rounded-xl overflow-hidden border border-slate-700 shadow-inner">
              <video
                ref={(el) => {
                  previewVideoRef.current = el;
                  if (el && cameraStreamRef.current) {
                    attachStreamToVideo(el, cameraStreamRef.current);
                  }
                }}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={(e) => {
                  const vid = e.currentTarget;
                  vid.play().catch(() => {});
                  if (vid.videoWidth > 0) {
                    setIsPreviewVideoLive(true);
                    setPreviewCameraError(null);
                  }
                }}
                onCanPlay={(e) => {
                  const vid = e.currentTarget;
                  vid.play().catch(() => {});
                  if (vid.videoWidth > 0) {
                    setIsPreviewVideoLive(true);
                    setPreviewCameraError(null);
                  }
                }}
                onPlaying={() => {
                  setIsPreviewVideoLive(true);
                  setPreviewCameraError(null);
                }}
                onError={(e) => {
                  console.warn('Live preview video error event:', e);
                  setIsPreviewVideoLive(false);
                }}
                className="w-full h-full object-cover transform -scale-x-100"
                style={{ transform: 'scaleX(-1)' }}
              />

              {/* Loading / Starting Camera State */}
              {!isPreviewVideoLive && !previewCameraError && (
                <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center gap-1 text-slate-300 z-10 px-2 text-center pointer-events-none">
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                  <span className="text-[9px] font-bold text-emerald-300 leading-tight">Starting camera...</span>
                  <span className="text-[7.5px] text-slate-400 leading-tight">Connecting live video</span>
                </div>
              )}

              {/* Error Message & Retry Action if Camera Blocked, Not Found or Offline */}
              {previewCameraError && (
                <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center gap-1 text-rose-300 z-20 p-2 text-center">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="text-[8.5px] font-bold text-rose-300 leading-tight">Camera Unavailable</span>
                  <span className="text-[7px] text-slate-300 leading-tight line-clamp-2">
                    {previewCameraError}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewCameraError(null);
                      setIsStartingPreviewCamera(true);
                      startCameraStream()
                        .then((stream) => {
                          if (previewVideoRef.current && stream) {
                            attachStreamToVideo(previewVideoRef.current, stream);
                          }
                        })
                        .catch((err) => {
                          setPreviewCameraError(err?.message || 'Could not access webcam.');
                        })
                        .finally(() => {
                          setIsStartingPreviewCamera(false);
                        });
                    }}
                    className="mt-0.5 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[7.5px] font-bold rounded shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-2 h-2" />
                    <span>Retry</span>
                  </button>
                </div>
              )}

              {lastCaptureFlash && (
                <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center text-slate-900 text-[9px] font-black animate-in fade-in duration-150 z-30">
                  <Camera className="w-4 h-4 text-emerald-600 mb-0.5 animate-pulse" />
                  <span>Recorded</span>
                </div>
              )}
            </div>

            <div className="text-[8px] sm:text-[9px] text-center font-medium leading-tight px-1">
              {previewCameraError ? (
                <span className="text-rose-400 font-semibold">Camera access required</span>
              ) : (
                <span className="text-emerald-400">Keep face visible in frame</span>
              )}
            </div>
          </div>
        )
      )}

      {/* Hidden Video for Reliable Background Snapshots */}
      <video
        ref={(el) => {
          hiddenVideoRef.current = el;
          if (el && cameraStreamRef.current) {
            attachStreamToVideo(el, cameraStreamRef.current);
          }
        }}
        autoPlay
        playsInline
        muted
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
};
