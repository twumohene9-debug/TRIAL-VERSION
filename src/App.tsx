import React, { useState, useEffect } from 'react';
import { 
  Question, 
  QuizSection, 
  StudentSubmission, 
  QuizConfig,
  TeacherAccessCode,
  QuizStatus,
  SystemSettings,
  AdminProfile,
  RosterStudent,
  PortalSection,
  AdminTab,
  TeacherTab
} from './types';
import { QUESTIONS_DATA, INITIAL_QUIZ_SECTIONS, INITIAL_QUIZ_CONFIG } from './data/questionsData';
import { MOCK_SUBMISSIONS } from './data/mockData';
import { FormAssessmentView } from './components/FormAssessmentView';
import type { AuthenticatedTeacherInfo } from './components/TeacherAuthModal';
import { DEFAULT_ADMIN_SECURITY_SETTINGS, DEFAULT_ADMIN_PROFILE } from './utils/adminSecurityDefaults';
import { FooterCredits } from './components/FooterCredits';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BrandLogo } from './components/BrandLogo';

// Direct Static Imports for Robust Reliability
import { TeacherDashboard } from './components/TeacherDashboard';
import { SectionReleaseManager } from './components/SectionReleaseManager';
import { GoogleSheetsExportModal } from './components/GoogleSheetsExportModal';
import { QuestionBankEditor } from './components/QuestionBankEditor';
import { EmailFeedbackModal } from './components/EmailFeedbackModal';
import { TeacherAuthModal } from './components/TeacherAuthModal';
import { DocumentQuestionImporter } from './components/DocumentQuestionImporter';
import { QuizCreatorModal } from './components/QuizCreatorModal';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminMultiLayerVerification } from './components/AdminMultiLayerVerification';
import { QuizListManager } from './components/QuizListManager';
import { LiveStudentMonitoringView } from './components/LiveStudentMonitoringView';
import { AboutPlatformModal } from './components/AboutPlatformModal';
import { AdminProfileModal } from './components/AdminProfileModal';
import { LandingPageTrustSection } from './components/LandingPageTrustSection';
import { GetStartedModal } from './components/GetStartedModal';
import { StudentAccessLockScreen } from './components/StudentAccessLockScreen';

export type { PortalSection, AdminTab, TeacherTab };
import { syncQuizInstructions, DEFAULT_QUIZ_INSTRUCTIONS } from './utils/instructionsUtils';
import { decodeQuizData } from './utils/quizCompression';
import { getExactQuizFromOfflineStorage, saveQuizToOfflineStorage, saveQuizzesBatchToOfflineStorage } from './utils/offlineQuizStorage';
import { removeQuizSubmissionLock, findDuplicateSubmissionIds, clearBrowserQuizAttemptLock } from './utils/submissionUtils';
import { applyGlobalTheme } from './utils/themePalettes';
import { AppThemeId } from './types';
import {
  fetchQuizFromFirestore,
  subscribeToQuizzes,
  subscribeToSubmissions,
  subscribeToTeacherCodes,
  subscribeToSections,
  subscribeToSystemSettings,
  subscribeToAdminProfile,
  fetchAdminProfileFromFirestore,
  saveAdminProfileToFirestore,
  saveQuizToFirestore,
  deleteQuizFromFirestore,
  saveSubmissionToFirestore,
  deleteSubmissionFromFirestore,
  clearAllSubmissionsInFirestore,
  saveTeacherCodesToFirestore,
  saveSectionsToFirestore,
  saveSystemSettingsToFirestore,
  seedInitialQuizzesIfEmpty,
  performFullBidirectionalSync
} from './services/firebaseSync';
import { 
  Lock, 
  ShieldAlert, 
  GraduationCap, 
  BookOpenCheck, 
  User, 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Activity, 
  BarChart3, 
  CalendarClock, 
  FileSpreadsheet, 
  HelpCircle, 
  Download, 
  ChevronDown,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Shield,
  Building2,
  Home,
  UploadCloud,
  ClipboardList,
  ArrowLeft,
  Globe,
  RefreshCw,
  WifiOff,
  LogOut,
  Clock,
  AlertCircle,
  X,
  Menu,
  Info
} from 'lucide-react';

const DEFAULT_QUIZZES: QuizConfig[] = [
  {
    id: 'quiz-001',
    code: 'ALG-SHS1-2026-001',
    title: 'Algebra & Quadratic Equations Mid-Term Assessment',
    subject: 'Mathematics',
    classGroup: 'SHS 1',
    topic: 'Algebra & Quadratic Equations',
    teacherId: 'teacher-01',
    teacherName: 'Mr. Bismark Twumasi',
    teacherEmail: 'twumasi@joymcq.edu.gh',
    schoolName: 'The Joy Of The Lord Assessment Network',
    instructions: DEFAULT_QUIZ_INSTRUCTIONS.join('\n'),
    instructionBullets: [...DEFAULT_QUIZ_INSTRUCTIONS],
    totalQuestions: 5,
    durationMinutes: 45,
    attemptsAllowed: 1,
    randomizeQuestions: true,
    randomizeOptions: true,
    showScoreImmediately: true,
    showCorrectAnswers: true,
    allowFeedback: true,
    status: 'active',
    createdAt: '2026-03-01',
    questions: [],
    sections: [],
  },
  {
    id: 'quiz-002',
    code: 'GEO-SHS2-2026-002',
    title: 'Trigonometry & Circle Geometry Test',
    subject: 'Mathematics',
    classGroup: 'SHS 2',
    topic: 'Trigonometry & Circle Geometry',
    teacherId: 'teacher-01',
    teacherName: 'Mr. Bismark Twumasi',
    teacherEmail: 'twumasi@joymcq.edu.gh',
    schoolName: 'The Joy Of The Lord Assessment Network',
    instructions: 'Standard mathematical notation is rendered with KaTeX. Submit before time runs out.',
    totalQuestions: 2,
    durationMinutes: 30,
    attemptsAllowed: 1,
    randomizeQuestions: true,
    randomizeOptions: true,
    showScoreImmediately: true,
    showCorrectAnswers: true,
    allowFeedback: true,
    status: 'active',
    createdAt: '2026-03-02',
    questions: [],
    sections: [],
  },
  {
    id: 'quiz-003',
    code: 'DOC-857',
    title: 'ADD MATHS QUIZ',
    subject: 'Additional Mathematics',
    classGroup: 'SHS 2',
    topic: 'Pure Mathematics & Calculus',
    teacherId: 'teacher-02',
    teacherName: 'Mr. Bismark Twum',
    teacherEmail: 'twumbismark304@gmail.com',
    schoolName: 'The Joy Of The Lord Assessment Network',
    instructions: 'Answer all 40 questions carefully. Show all working on scrap paper.',
    totalQuestions: 40,
    durationMinutes: 60,
    attemptsAllowed: 1,
    randomizeQuestions: true,
    randomizeOptions: true,
    showScoreImmediately: true,
    showCorrectAnswers: true,
    allowFeedback: true,
    status: 'active',
    createdAt: '2026-03-03',
    questions: [],
    sections: [],
  },
  {
    id: 'quiz-004',
    code: 'DOC-365',
    title: 'Imported Assessment',
    subject: 'Mathematics',
    classGroup: 'SHS 1 & SHS 2',
    topic: 'General Assessment',
    teacherId: 'teacher-02',
    teacherName: 'Mr. Bismark Twum',
    teacherEmail: 'twumbismark304@gmail.com',
    schoolName: 'The Joy Of The Lord Assessment Network',
    instructions: 'Do not switch tabs or leave the assessment window during the exam.',
    totalQuestions: 40,
    durationMinutes: 30,
    attemptsAllowed: 1,
    randomizeQuestions: true,
    randomizeOptions: true,
    showScoreImmediately: true,
    showCorrectAnswers: true,
    allowFeedback: true,
    status: 'active',
    createdAt: '2026-03-04',
    questions: [],
    sections: [],
  },
  {
    id: 'quiz-005',
    code: 'JOY-MATH-2026-005',
    title: 'Calculus & Integration Master Test',
    subject: 'Additional Mathematics',
    classGroup: 'SHS 3',
    topic: 'Differential & Integral Calculus',
    teacherId: 'teacher-03',
    teacherName: 'Dr. Mensah',
    teacherEmail: 'mensah.math@joymcq.edu.gh',
    schoolName: 'The Joy Of The Lord Assessment Network',
    instructions: 'Comprehensive exam covering derivatives, optimization, and area integrals.',
    totalQuestions: 20,
    durationMinutes: 60,
    attemptsAllowed: 1,
    randomizeQuestions: true,
    randomizeOptions: true,
    showScoreImmediately: true,
    showCorrectAnswers: true,
    allowFeedback: true,
    status: 'active',
    createdAt: '2026-03-05',
    questions: [],
    sections: [],
  },
  {
    id: 'quiz-006',
    code: 'STAT-SHS2-2026-006',
    title: 'Statistics & Probability Mock Exam',
    subject: 'Core Mathematics',
    classGroup: 'SHS 2',
    topic: 'Statistics & Rank Correlation',
    teacherId: 'teacher-01',
    teacherName: 'Mr. Bismark Twumasi',
    teacherEmail: 'twumasi@joymcq.edu.gh',
    schoolName: 'The Joy Of The Lord Assessment Network',
    instructions: 'Calculators are permitted for variance and Spearman rank correlation calculations.',
    totalQuestions: 15,
    durationMinutes: 40,
    attemptsAllowed: 1,
    randomizeQuestions: true,
    randomizeOptions: true,
    showScoreImmediately: true,
    showCorrectAnswers: true,
    allowFeedback: true,
    status: 'active',
    createdAt: '2026-03-06',
    questions: [],
    sections: [],
  },
  {
    id: 'quiz-007',
    code: 'VEC-SHS3-2026-007',
    title: 'Vectors & 3D Geometry Assessment',
    subject: 'Elective Mathematics',
    classGroup: 'SHS 3',
    topic: '3D Vector Equations & Scalar Products',
    teacherId: 'teacher-01',
    teacherName: 'Mr. Twumasi',
    teacherEmail: 'twumbismark90@gmail.com',
    schoolName: 'The Joy Of The Lord Assessment Network',
    instructions: 'Determine vector dot products, cross products, and line intersections.',
    totalQuestions: 10,
    durationMinutes: 50,
    attemptsAllowed: 1,
    randomizeQuestions: true,
    randomizeOptions: true,
    showScoreImmediately: true,
    showCorrectAnswers: true,
    allowFeedback: true,
    status: 'active',
    createdAt: '2026-03-07',
    questions: [],
    sections: [],
  },
  {
    id: 'quiz-008',
    code: 'SET-SHS1-2026-008',
    title: 'Set Theory & Logic Foundations',
    subject: 'Core Mathematics',
    classGroup: 'SHS 1',
    topic: 'Set Notation & Venn Diagrams',
    teacherId: 'teacher-02',
    teacherName: 'Mr. Bismark Twum',
    teacherEmail: 'twumbismark304@gmail.com',
    schoolName: 'The Joy Of The Lord Assessment Network',
    instructions: 'Solve universal sets, subsets, and 3-circle Venn diagram problems.',
    totalQuestions: 10,
    durationMinutes: 30,
    attemptsAllowed: 1,
    randomizeQuestions: true,
    randomizeOptions: true,
    showScoreImmediately: true,
    showCorrectAnswers: true,
    allowFeedback: true,
    status: 'active',
    createdAt: '2026-03-08',
    questions: [],
    sections: [],
  },
];

export default function App() {
  // Domain Isolation State (URL parameter locked mode: ?portal=admin | ?portal=teacher | ?portal=student | ?portal=teacher-student | ?quiz=...)
  const [isolatedPortal, setIsolatedPortal] = useState<'admin' | 'teacher' | 'student' | 'teacher-student' | null>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const p = (urlParams.get('portal') || urlParams.get('domain') || urlParams.get('role') || '').toLowerCase();
      if (p === 'teacher-student' || p === 'teacher_student' || p === 'combined') return 'teacher-student';
      if (p === 'student' || p === 'teacher' || p === 'admin') return p as 'admin' | 'teacher' | 'student';
      if (urlParams.get('quiz') || urlParams.get('quizId') || urlParams.get('quiz_id') || urlParams.get('quizCode') || urlParams.get('qdata')) return 'student';
    }
    return null;
  });

  // Main Portal Section State & Navigation History
  const [activePortalSection, setActivePortalSection] = useState<PortalSection>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const p = (urlParams.get('portal') || urlParams.get('domain') || urlParams.get('role') || '').toLowerCase();
      if (p === 'teacher-student' || p === 'teacher_student' || p === 'combined') return 'student';
      if (p === 'student') return 'student';
      if (p === 'teacher') return 'teacher';
      if (p === 'admin') return 'admin';
      if (urlParams.get('quiz') || urlParams.get('quizId') || urlParams.get('quiz_id') || urlParams.get('quizCode') || urlParams.get('qdata')) return 'student';
    }
    return 'admin';
  });

  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('overview');
  const [activeTeacherTab, setActiveTeacherTab] = useState<TeacherTab>('analytics');
  const [selectedQuizToMonitorId, setSelectedQuizToMonitorId] = useState<string>('all');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Landing Page Display State (Defaults to true for all domains to display their tailored domain landing pages; skips to test only when a direct quiz parameter is passed)
  const [showLandingPage, setShowLandingPage] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('quiz') || urlParams.get('quizId') || urlParams.get('quiz_id') || urlParams.get('qdata') || urlParams.get('standalone') === 'true' || urlParams.get('quizCode') || urlParams.get('direct') === 'true') {
        return false;
      }
    }
    return true;
  });

  // Admin authentication trigger on locked portal screen
  const [showAdminAuthOnLock, setShowAdminAuthOnLock] = useState<boolean>(false);

  // Portal Navigation History Stack
  const [portalHistory, setPortalHistory] = useState<{ section: PortalSection; adminTab?: AdminTab; teacherTab?: TeacherTab }[]>([]);

  // Detect URL parameter changes and lock into specified domain
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const p = (urlParams.get('portal') || urlParams.get('domain') || urlParams.get('role') || '').toLowerCase();
      const quizParam = urlParams.get('quiz') || urlParams.get('quizId') || urlParams.get('quiz_id') || urlParams.get('quizCode') || (window.location.hash.startsWith('#quiz=') ? window.location.hash.replace('#quiz=', '') : null);
      const qdataParam = urlParams.get('qdata');
      const directParam = urlParams.get('direct');

      if (p === 'teacher-student' || p === 'teacher_student' || p === 'combined') {
        setIsolatedPortal('teacher-student');
        setActivePortalSection((prev) => (prev === 'admin' ? 'student' : prev));
        if (quizParam || qdataParam || directParam === 'true') {
          setShowLandingPage(false);
        }
      } else if (p === 'student' || p === 'teacher' || p === 'admin') {
        setIsolatedPortal(p as 'admin' | 'teacher' | 'student');
        setActivePortalSection(p as PortalSection);
        if (quizParam || qdataParam || directParam === 'true') {
          setShowLandingPage(false);
        }
      } else if (quizParam || qdataParam) {
        setIsolatedPortal('student');
        setActivePortalSection('student');
        setShowLandingPage(false);
      }

      if (quizParam) {
        const cleanQuizCode = decodeURIComponent(quizParam).trim();
        setActiveQuizId(cleanQuizCode);
        const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

        if (isOffline) {
          // OFFLINE LOGIC: Read quiz ID from URL param, and load that exact quiz from IndexedDB/localStorage ONLY.
          getExactQuizFromOfflineStorage(cleanQuizCode).then((offlineQuiz) => {
            if (offlineQuiz) {
              const synced = syncQuizInstructions(offlineQuiz.config);
              setConfig(synced);
              if (offlineQuiz.questions && offlineQuiz.questions.length > 0) {
                setQuestions(offlineQuiz.questions);
              }
              if (offlineQuiz.sections && offlineQuiz.sections.length > 0) {
                setSections(offlineQuiz.sections);
              }
              setQuizzes((prev) => {
                const map = new Map();
                map.set(synced.id, synced);
                if (synced.code) map.set(synced.code, synced);
                prev.forEach((q) => { if (!map.has(q.id) && (!q.code || !map.has(q.code))) map.set(q.id, syncQuizInstructions(q)); });
                return Array.from(map.values());
              });
            }
          }).catch((err) => console.warn('App offline quiz load notice:', err));
        } else {
          // ONLINE LOGIC: Do not touch online quiz logic.
          fetchQuizFromFirestore(cleanQuizCode).then((cloudQuiz) => {
            if (cloudQuiz) {
              const synced = syncQuizInstructions(cloudQuiz);
              setConfig(synced);
              saveQuizToOfflineStorage(cloudQuiz, cloudQuiz.questions || [], cloudQuiz.sections || []);
              if (cloudQuiz.questions && cloudQuiz.questions.length > 0) {
                setQuestions(cloudQuiz.questions);
              }
              if (cloudQuiz.sections && cloudQuiz.sections.length > 0) {
                setSections(cloudQuiz.sections);
              }
              setQuizzes((prev) => {
                const map = new Map();
                map.set(synced.id, synced);
                if (synced.code) map.set(synced.code, synced);
                prev.forEach((q) => { if (!map.has(q.id) && (!q.code || !map.has(q.code))) map.set(q.id, syncQuizInstructions(q)); });
                return Array.from(map.values());
              });
            }
          }).catch((err) => console.warn('App cloud quiz fetch notice:', err));
        }
      }

      if (qdataParam) {
        const decoded = decodeQuizData(qdataParam);
        if (decoded) {
          const synced = syncQuizInstructions(decoded.config);
          setConfig(synced);
          if (decoded.questions && decoded.questions.length > 0) {
            setQuestions(decoded.questions);
          }
          if (decoded.sections && decoded.sections.length > 0) {
            setSections(decoded.sections);
          }
          setQuizzes((prev) => [synced, ...prev.filter((q) => q.id !== synced.id && q.code !== synced.code)]);
        }
      }
    }
  }, []);

  const handleNavigatePortal = (section: PortalSection, adminTab?: AdminTab, teacherTab?: TeacherTab) => {
    // If locked into teacher-student combined domain, block admin portal access
    if (isolatedPortal === 'teacher-student') {
      if (section === 'admin') return;
    } else if (isolatedPortal && isolatedPortal !== section) {
      return;
    }
    setShowLandingPage(false);
    setPortalHistory((prev) => [...prev, { section: activePortalSection, adminTab: activeAdminTab, teacherTab: activeTeacherTab }]);
    setActivePortalSection(section);
    if (adminTab) setActiveAdminTab(adminTab);
    if (teacherTab) setActiveTeacherTab(teacherTab);
  };

  const handleGoBack = () => {
    if (portalHistory.length > 0) {
      const last = portalHistory[portalHistory.length - 1];
      setPortalHistory((prev) => prev.slice(0, prev.length - 1));
      if (!isolatedPortal || (isolatedPortal === 'teacher-student' && (last.section === 'teacher' || last.section === 'student')) || isolatedPortal === last.section) {
        setActivePortalSection(last.section);
      }
      if (last.adminTab) setActiveAdminTab(last.adminTab);
      if (last.teacherTab) setActiveTeacherTab(last.teacherTab);
    } else if (isolatedPortal === 'teacher-student') {
      setActivePortalSection((prev) => (prev === 'teacher' ? 'student' : 'teacher'));
    } else if (!isolatedPortal) {
      // Default fallback cycle only when not isolated
      if (activePortalSection === 'student') {
        setActivePortalSection('teacher');
      } else if (activePortalSection === 'teacher') {
        setActivePortalSection('admin');
      } else {
        setActivePortalSection('student');
      }
    }
  };

  // Admin Verification State
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(false);
  const [adminEmailInput, setAdminEmailInput] = useState<string>('');
  const [adminSecurityCode, setAdminSecurityCode] = useState<string>('');
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);

  // Dynamic Admin / Founder Profile State
  const [adminProfile, setAdminProfile] = useState<AdminProfile>(DEFAULT_ADMIN_PROFILE);
  const [isAdminProfileModalOpen, setIsAdminProfileModalOpen] = useState<boolean>(false);

  // Global System Settings (e.g. Teacher registration lock/unlock, Master Portal & URL Locks)
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    isTeacherSelfRegistrationLocked: false,
    adminContactEmail: 'twumbismark90@gmail.com',
    schoolName: 'MCQ Assessment Network',
    isMasterPortalLocked: false,
    masterLockMessage: 'Access to this assessment portal is temporarily locked by the administrator.',
    activeThemeId: 'classic-navy',
    deletedQuizIds: [] as string[],
    lockedUrls: {
      'teacher-student': false,
      student: false,
      teacher: false,
      admin: false,
    },
    urlLockMessages: {
      'teacher-student': 'The Teacher & Student combined portal is currently closed by the administrator.',
      student: 'The Student Examination portal is currently locked for maintenance or moderation.',
      teacher: 'The Faculty Teacher portal is currently locked by the administrator.',
      admin: 'The Master Administrator portal access is locked.',
    },
  });

  // Teacher Access Codes State (Admin Generated & Self-Registered)
  const [teacherAccessCodes, setTeacherAccessCodes] = useState<TeacherAccessCode[]>([
    {
      id: 'code-1',
      code: '0061',
      pin: '0061',
      teacherName: 'Mr. Bismark Twum',
      teacherEmail: 'twumbismark304@gmail.com',
      department: 'Mathematics & Computing',
      status: 'active',
      source: 'admin-created',
      createdAt: '2026-01-10',
    },
    {
      id: 'code-2',
      code: '0061',
      pin: '0061',
      teacherName: 'Mr. Twumasi',
      teacherEmail: 'twumbismark90@gmail.com',
      department: 'Mathematics & Computing',
      status: 'active',
      source: 'admin-created',
      createdAt: '2026-01-15',
    },
    {
      id: 'code-3',
      code: 'JOY-9821',
      pin: 'JOY-9821',
      teacherName: 'Dr. Mensah',
      teacherEmail: 'mensah.math@joymcq.edu.gh',
      department: 'Pure Mathematics',
      status: 'active',
      source: 'admin-created',
      createdAt: '2026-02-01',
    },
  ]);

  // Teacher Authentication State (No persistent credential retention when logged out)
  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState<boolean>(false);
  const [currentTeacher, setCurrentTeacher] = useState<AuthenticatedTeacherInfo | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('joy_current_teacher');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.warn(e);
        }
      }
    }
    return null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isGetStartedModalOpen, setIsGetStartedModalOpen] = useState<boolean>(false);

  // Student Examination Desk Lock State (Protected with passcode 'bisjoy25')
  const [isStudentUnlocked, setIsStudentUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('joy_student_unlocked') === 'true';
    }
    return false;
  });

  // Inactivity Auto-Logout Tracker (60 minutes = 1 hour)
  const [lastActivityTime, setLastActivityTime] = useState<number>(() => Date.now());
  const [logoutNotice, setLogoutNotice] = useState<string | null>(null);

  // Modal States
  const [isImporterOpen, setIsImporterOpen] = useState<boolean>(false);
  const [isQuizCreatorOpen, setIsQuizCreatorOpen] = useState<boolean>(false);
  const [editingQuiz, setEditingQuiz] = useState<QuizConfig | null>(null);
  const [recentQuizNotification, setRecentQuizNotification] = useState<{ quiz: QuizConfig; type: 'created' | 'updated'; timestamp: number } | null>(null);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState<boolean>(false);
  const [aboutModalInitialTab, setAboutModalInitialTab] = useState<'about' | 'contact' | 'report' | 'privacy'>('about');
  const [lastExtractedCount, setLastExtractedCount] = useState<number | undefined>(undefined);
  const [loadedExamFileName, setLoadedExamFileName] = useState<string | undefined>(undefined);
  const [lastImportedQuestions, setLastImportedQuestions] = useState<Question[]>([]);

  // Multi-Tenant Quizzes
  const [quizzes, setQuizzes] = useState<QuizConfig[]>([
    {
      ...INITIAL_QUIZ_CONFIG,
      questions: QUESTIONS_DATA,
      sections: INITIAL_QUIZ_SECTIONS,
    },
  ]);

  const [activeQuizId, setActiveQuizId] = useState<string>(INITIAL_QUIZ_CONFIG.id);

  // Global State
  const [questions, setQuestions] = useState<Question[]>(QUESTIONS_DATA);
  const [sections, setSections] = useState<QuizSection[]>(INITIAL_QUIZ_SECTIONS);
  const [config, setConfig] = useState<QuizConfig>(INITIAL_QUIZ_CONFIG);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>(MOCK_SUBMISSIONS);

  // Timer State for Student
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(3600); // 1 hour
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Email Feedback Modal State
  const [selectedSubmissionForEmail, setSelectedSubmissionForEmail] = useState<StudentSubmission | null>(null);

  // 1-Hour Inactivity Auto-Logout Guard & Activity Listener
  useEffect(() => {
    const handleUserActivity = () => {
      setLastActivityTime(Date.now());
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));

    const checkInactivityInterval = setInterval(() => {
      const ONE_HOUR_MS = 60 * 60 * 1000; // 1 hour (60 minutes)
      const inactiveDuration = Date.now() - lastActivityTime;

      if (inactiveDuration >= ONE_HOUR_MS) {
        if (isAdminUnlocked || isTeacherAuthenticated) {
          setIsAdminUnlocked(false);
          setIsTeacherAuthenticated(false);
          setIsAuthModalOpen(false);
          setAdminEmailInput('');
          setAdminSecurityCode('');
          setAdminAuthError(null);
          localStorage.removeItem('joy_teacher_authenticated');
          sessionStorage.removeItem('joy_teacher_authenticated');
          sessionStorage.removeItem('joy_admin_unlocked');
          setActivePortalSection('student');
          setLogoutNotice('Automatic Session Timeout: You were inactive for 1 hour. Credentials have been safely cleared.');
        }
      }
    }, 15000); // Check every 15 seconds

    return () => {
      activityEvents.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
      clearInterval(checkInactivityInterval);
    };
  }, [lastActivityTime, isAdminUnlocked, isTeacherAuthenticated]);

  // Logout Handlers for Admin and Teacher
  const handleLogoutAdmin = () => {
    setIsAdminUnlocked(false);
    setAdminEmailInput('');
    setAdminSecurityCode('');
    setAdminAuthError(null);
    sessionStorage.removeItem('joy_admin_unlocked');
    localStorage.removeItem('joy_admin_unlocked');
    setLogoutNotice('Administrator logged out successfully. Credentials cleared.');
    setTimeout(() => setLogoutNotice((prev) => (prev?.includes('Administrator') ? null : prev)), 5000);
  };

  const handleLogoutTeacher = () => {
    setCurrentTeacher(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('joy_current_teacher');
      sessionStorage.removeItem('joy_teacher_authenticated');
      localStorage.removeItem('joy_teacher_authenticated');
    }
    setIsTeacherAuthenticated(false);
    setIsAuthModalOpen(false);
    setActivePortalSection('student');
    setLogoutNotice('Teacher logged out successfully. Credentials cleared.');
    setTimeout(() => setLogoutNotice((prev) => (prev?.includes('Teacher') ? null : prev)), 5000);
  };

  const handleLogoutAll = () => {
    handleLogoutAdmin();
    handleLogoutTeacher();
    setActivePortalSection('student');
  };

  // Sync and Status State
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString());
  const [syncMessage, setSyncMessage] = useState<string>('');

  // Cross-Tab Broadcast Dispatcher
  const broadcastSyncEvent = (action: string) => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('joy_assessment_realtime_sync');
        bc.postMessage({ type: 'SYNC_REFRESH', action, timestamp: Date.now() });
        bc.close();
      }
    } catch (e) {}
  };

  // Full Centralized Bidirectional Sync Engine (Firestore + Express Server + LocalStorage)
  const handleTriggerBidirectionalSync = async () => {
    setSyncStatus('syncing');
    try {
      const result = await performFullBidirectionalSync({
        quizzes,
        submissions,
        teacherAccessCodes,
        sections,
        config,
        systemSettings,
      });

      if (result.quizzes && result.quizzes.length > 0) {
        setQuizzes(result.quizzes.map((q: any) => syncQuizInstructions(q)));
      }

      if (result.submissions && Array.isArray(result.submissions)) {
        setSubmissions(result.submissions);
      }

      if (result.teacherAccessCodes && Array.isArray(result.teacherAccessCodes) && result.teacherAccessCodes.length > 0) {
        setTeacherAccessCodes(result.teacherAccessCodes);
      }

      if (result.sections && Array.isArray(result.sections) && result.sections.length > 0) {
        setSections(result.sections);
      }

      if (result.systemSettings) {
        setSystemSettings((prev) => ({ ...prev, ...result.systemSettings }));
      }

      setLastSyncTime(result.timestamp || new Date().toLocaleTimeString());
      setSyncMessage(result.message);
      setSyncStatus(result.source === 'local-cached' ? 'offline' : 'synced');
    } catch (err) {
      console.warn('Bidirectional sync error notice:', err);
      setSyncStatus('offline');
    }
  };

  const syncWithServer = async () => {
    try {
      const res = await fetch('/api/sync');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.submissions)) {
          setSubmissions(data.submissions);
        }
        if (data.systemSettings) {
          setSystemSettings((prev) => ({ ...prev, ...data.systemSettings }));
        }
        if (Array.isArray(data.quizzes)) {
          const deletedSet = new Set<string>();
          const settings = data.systemSettings || systemSettings;
          if (settings?.deletedQuizIds && Array.isArray(settings.deletedQuizIds)) {
            settings.deletedQuizIds.forEach((id: string) => deletedSet.add(id.toUpperCase()));
          }
          const filteredQuizzes = data.quizzes.filter((q: any) => {
            const key = (q.code || q.id || '').toUpperCase();
            return !deletedSet.has(key) && !deletedSet.has((q.id || '').toUpperCase());
          });
          const processedQuizzes = filteredQuizzes.map((q: any) => {
            const synced = syncQuizInstructions(q);
            if (!synced.questions || synced.questions.length === 0) {
              if (synced.id === 'quiz-003' || synced.code === 'DOC-857' || filteredQuizzes.length === 1) {
                synced.questions = QUESTIONS_DATA;
                synced.totalQuestions = 40;
                synced.sections = INITIAL_QUIZ_SECTIONS;
              }
            }
            return synced;
          });
          setQuizzes(processedQuizzes);
        }
        if (Array.isArray(data.teacherAccessCodes) && data.teacherAccessCodes.length > 0) {
          setTeacherAccessCodes(data.teacherAccessCodes);
        }
        if (Array.isArray(data.sections) && data.sections.length > 0) {
          setSections(data.sections);
        }
        if (data.quizConfig && data.quizConfig.subject) {
          setConfig((prev) => syncQuizInstructions({ ...prev, ...data.quizConfig }));
        }
        if (data.adminProfile && data.adminProfile.name) {
          setAdminProfile((prev) => ({ ...prev, ...data.adminProfile }));
        }
        setLastSyncTime(new Date().toLocaleTimeString());
        setSyncStatus('synced');
      }
    } catch (err) {
      console.warn('Sync server call notice:', err);
      setSyncStatus('offline');
    }
  };

  // Handle Save & Global Sync of Admin Profile
  const handleSaveAdminProfile = async (updated: AdminProfile) => {
    setAdminProfile(updated);
    try {
      await saveAdminProfileToFirestore(updated);
    } catch (e) {
      console.warn('Firestore admin profile save notice:', e);
    }
    try {
      await fetch('/api/admin/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (e) {
      console.warn('Express server admin profile sync notice:', e);
    }
    broadcastSyncEvent('ADMIN_PROFILE_UPDATED');
  };

  useEffect(() => {
    // Initial bidirectional sync
    handleTriggerBidirectionalSync();
    
    // Initial Admin Profile Fetch
    fetchAdminProfileFromFirestore().then((p) => {
      if (p) setAdminProfile(p);
    }).catch((e) => console.warn('Admin profile initial fetch notice:', e));
    
    // Adaptive periodic sync: 4s when tab is active, 30s when backgrounded
    let syncInterval: any = null;
    const startSyncInterval = (ms: number) => {
      if (syncInterval) clearInterval(syncInterval);
      syncInterval = setInterval(syncWithServer, ms);
    };
    startSyncInterval(4000);

    // Event-driven Instant Sync on Tab Focus, Visibility Change, and Network Reconnect
    const handleActiveResume = () => {
      syncWithServer();
      handleTriggerBidirectionalSync();
    };

    window.addEventListener('focus', handleActiveResume);
    window.addEventListener('online', handleActiveResume);

    // Cross-tab / Cross-window Instant Sync via BroadcastChannel
    let broadcastChannel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        broadcastChannel = new BroadcastChannel('joy_assessment_realtime_sync');
        broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'SYNC_REFRESH' || event.data?.type === 'ADMIN_PROFILE_UPDATED' || event.data?.type === 'SETTINGS_UPDATED') {
            syncWithServer();
            handleTriggerBidirectionalSync();
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported or restricted:', e);
    }

    // 1. Seed initial quizzes to Firestore if empty
    seedInitialQuizzesIfEmpty(DEFAULT_QUIZZES);

    // 2. Lifecycle-Aware Firestore Subscriptions:
    // Automatically dispose active snapshot listeners when tab is hidden to eliminate quota consumption
    let unsubs: Array<() => void> = [];

    const attachFirestoreListeners = () => {
      // Clear any prior listeners before attaching
      unsubs.forEach((unsub) => {
        try { unsub(); } catch (e) {}
      });
      unsubs = [];

      try {
        const unsubQuizzes = subscribeToQuizzes((cloudQuizzes) => {
          if (cloudQuizzes) {
            const syncedList = cloudQuizzes.map((q) => syncQuizInstructions(q));
            setQuizzes(syncedList);
            saveQuizzesBatchToOfflineStorage(syncedList);
            setLastSyncTime(new Date().toLocaleTimeString());
            setSyncStatus('synced');

            const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
            const urlQuizCode = urlParams?.get('quiz')?.trim() || urlParams?.get('quizId')?.trim() || urlParams?.get('quiz_id')?.trim() || urlParams?.get('quizCode')?.trim();
            if (urlQuizCode) {
              const matched = syncedList.find(
                (q) => (q.code && q.code.toUpperCase() === urlQuizCode.toUpperCase()) || (q.id && q.id.toUpperCase() === urlQuizCode.toUpperCase())
              );
              if (matched) {
                setConfig(matched);
                if (matched.questions && matched.questions.length > 0) {
                  setQuestions(matched.questions);
                }
                if (matched.sections && matched.sections.length > 0) {
                  setSections(matched.sections);
                }
              }
            }
          }
        });
        unsubs.push(unsubQuizzes);

        const unsubSubmissions = subscribeToSubmissions((cloudSubmissions) => {
          if (cloudSubmissions) {
            setSubmissions(cloudSubmissions);
            setLastSyncTime(new Date().toLocaleTimeString());
            setSyncStatus('synced');
          }
        });
        unsubs.push(unsubSubmissions);

        const unsubTeacherCodes = subscribeToTeacherCodes((cloudCodes) => {
          if (cloudCodes && cloudCodes.length > 0) {
            setTeacherAccessCodes(cloudCodes);
          }
        });
        unsubs.push(unsubTeacherCodes);

        const unsubSections = subscribeToSections((cloudSections) => {
          if (cloudSections && cloudSections.length > 0) {
            setSections(cloudSections);
          }
        });
        unsubs.push(unsubSections);

        const unsubSystemSettings = subscribeToSystemSettings((cloudSettings) => {
          if (cloudSettings) {
            setSystemSettings((prev) => ({ ...prev, ...cloudSettings }));
          }
        });
        unsubs.push(unsubSystemSettings);

        const unsubAdminProfile = subscribeToAdminProfile((cloudProfile) => {
          if (cloudProfile) {
            setAdminProfile((prev) => ({ ...prev, ...cloudProfile }));
          }
        });
        unsubs.push(unsubAdminProfile);
      } catch (err) {
        console.warn('Subscription attach notice:', err);
      }
    };

    const detachFirestoreListeners = () => {
      unsubs.forEach((unsub) => {
        try { unsub(); } catch (e) {}
      });
      unsubs = [];
    };

    // Attach listeners initially
    attachFirestoreListeners();

    // Visibility-driven listener management & adaptive sync rate
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined') {
        if (document.visibilityState === 'visible') {
          // Reconnect listeners and run immediate catch-up sync
          attachFirestoreListeners();
          startSyncInterval(4000);
          handleActiveResume();
        } else {
          // Background state: teardown listeners to prevent idle read cost; switch to slow backup poll
          detachFirestoreListeners();
          startSyncInterval(30000);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (syncInterval) clearInterval(syncInterval);
      window.removeEventListener('focus', handleActiveResume);
      window.removeEventListener('online', handleActiveResume);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (broadcastChannel) {
        try {
          broadcastChannel.close();
        } catch (e) {}
      }
      detachFirestoreListeners();
    };
  }, []);

  // Multi-Device Real-Time Theme Synchronization
  useEffect(() => {
    const activeTheme = systemSettings?.activeThemeId || (localStorage.getItem('academic_portal_theme') as AppThemeId) || 'classic-navy';
    applyGlobalTheme(activeTheme);
  }, [systemSettings?.activeThemeId]);

  // Save and Sync 4-5 Bullet Point Instructions for any quiz
  const handleSaveQuizInstructions = (quizId: string, bullets: string[]) => {
    setQuizzes((prev) => {
      const updated = prev.map((q) =>
        q.id === quizId
          ? {
              ...q,
              instructionBullets: bullets,
              instructions: bullets.join('. '),
            }
          : q
      );

      const target = updated.find((q) => q.id === quizId);
      if (target) {
        saveQuizToFirestore(target).catch((err) => console.warn('Firestore quiz save error:', err));
        fetch('/api/sync/quizzes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(target),
        }).catch((err) => console.error('Failed to sync updated quiz instructions:', err));
      }

      return updated;
    });

    if (config.id === quizId) {
      setConfig((prev) => ({
        ...prev,
        instructionBullets: bullets,
        instructions: bullets.join('. '),
      }));
    }
    broadcastSyncEvent('QUIZ_INSTRUCTIONS_SAVED');
  };

  // Save Candidate Roster for a quiz (Bulk Upload / Manual Management)
  const handleSaveQuizRoster = (
    quizId: string,
    updatedRoster: RosterStudent[],
    accessMode: 'open' | 'restricted',
    validationField: 'id_only' | 'email_only' | 'id_or_email' | 'both'
  ) => {
    const updatedAt = new Date().toISOString();
    const targetQuiz = quizzes.find((q) => q.id === quizId || q.code === quizId);
    if (!targetQuiz) return;

    const updatedQuiz: QuizConfig = {
      ...targetQuiz,
      studentRoster: updatedRoster,
      accessMode,
      rosterValidationField: validationField,
      updatedAt,
    };

    setQuizzes((prev) =>
      prev.map((q) => (q.id === quizId || q.code === quizId ? updatedQuiz : q))
    );

    saveQuizToFirestore(updatedQuiz).catch((err) =>
      console.warn('Firestore quiz roster save warning:', err)
    );
    fetch('/api/sync/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedQuiz),
    }).catch((err) => console.error(err));
    fetch('/api/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedQuiz),
    }).catch((err) => console.error(err));

    setConfig((prev) => {
      if (prev && (prev.id === quizId || prev.code === quizId)) {
        return {
          ...prev,
          studentRoster: updatedRoster,
          accessMode,
          rosterValidationField: validationField,
          updatedAt,
        };
      }
      return prev;
    });

    broadcastSyncEvent('QUIZ_ROSTER_UPDATED');
  };

  // Handle Admin Unlock
  const handleUnlockAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = adminEmailInput.trim().toLowerCase();
    const cleanCode = adminSecurityCode.trim();

    const isMasterEmail = cleanEmail === 'twumbismark304@gmail.com' || cleanEmail === 'admin@joymcq.edu.gh' || cleanEmail === 'twumbismark90@gmail.com' || cleanEmail === 'twumohene9@gmail.com';
    const isMasterCode = cleanCode === '2026' || cleanCode === '0061' || cleanCode === 'JOY-ADMIN-2026';

    const matchedCode = teacherAccessCodes.some(
      (c) => c.status === 'active' && c.teacherEmail.toLowerCase() === cleanEmail && c.code === cleanCode
    );

    if ((isMasterEmail && isMasterCode) || cleanCode === '2026' || (cleanEmail && isMasterCode) || matchedCode) {
      setIsAdminUnlocked(true);
      setAdminAuthError(null);
      setLastActivityTime(Date.now());
      sessionStorage.setItem('joy_admin_unlocked', 'true');
    } else {
      setAdminAuthError('Invalid administrator email or security code. Please check your credentials.');
    }
  };

  // Teacher Access Code Handlers
  const handleAddTeacherCode = (newCode: TeacherAccessCode) => {
    setTeacherAccessCodes((prev) => {
      const updated = [newCode, ...prev];
      saveTeacherCodesToFirestore(updated).catch((err) => console.warn('Firestore teacher codes save error:', err));
      fetch('/api/sync/teacher-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes: updated }),
      }).catch((err) => console.error(err));
      return updated;
    });
  };

  const handleRevokeTeacherCode = (id: string) => {
    setTeacherAccessCodes((prev) => {
      const updated: TeacherAccessCode[] = prev.map((tc) =>
        tc.id === id ? { ...tc, status: (tc.status === 'active' ? 'revoked' : 'active') as 'active' | 'used' | 'revoked' } : tc
      );
      saveTeacherCodesToFirestore(updated).catch((err) => console.warn('Firestore teacher codes save error:', err));
      fetch('/api/sync/teacher-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes: updated }),
      }).catch((err) => console.error(err));
      return updated;
    });
  };

  const handleRegenerateTeacherCode = (id: string) => {
    const newDigits = Math.floor(1000 + Math.random() * 9000).toString();
    setTeacherAccessCodes((prev) => {
      const updated = prev.map((tc) => (tc.id === id ? { ...tc, code: newDigits } : tc));
      saveTeacherCodesToFirestore(updated).catch((err) => console.warn('Firestore teacher codes save error:', err));
      fetch('/api/sync/teacher-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes: updated }),
      }).catch((err) => console.error(err));
      return updated;
    });
  };

  const handleDeleteTeacherCode = (id: string) => {
    setTeacherAccessCodes((prev) => {
      const updated = prev.filter((tc) => tc.id !== id);
      saveTeacherCodesToFirestore(updated).catch((err) => console.warn('Firestore teacher codes save error:', err));
      fetch('/api/sync/teacher-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes: updated }),
      }).catch((err) => console.error(err));
      return updated;
    });
  };

  const handleUpdateTeacherCode = (id: string, updates: Partial<TeacherAccessCode>) => {
    setTeacherAccessCodes((prev) => {
      const updated = prev.map((tc) => (tc.id === id ? { ...tc, ...updates } : tc));
      saveTeacherCodesToFirestore(updated).catch((err) => console.warn('Firestore teacher codes save error:', err));
      fetch('/api/sync/teacher-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes: updated }),
      }).catch((err) => console.error(err));
      return updated;
    });
  };

  const handleUpdateSystemSettings = async (updates: Partial<SystemSettings>) => {
    const next = { ...systemSettings, ...updates, lastUpdated: new Date().toISOString() };
    setSystemSettings(next);
    try {
      await saveSystemSettingsToFirestore(next);
    } catch (err) {
      console.warn('Firestore system settings save error:', err);
    }
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
    } catch (err) {
      console.error('Server settings update error:', err);
    }
    broadcastSyncEvent('SETTINGS_UPDATED');
  };

  const handleRegisterTeacher = (newTeacher: TeacherAccessCode) => {
    setTeacherAccessCodes((prev) => {
      if (prev.some((tc) => tc.id === newTeacher.id || tc.teacherEmail.toLowerCase() === newTeacher.teacherEmail.toLowerCase())) {
        const updated = prev.map((tc) => (tc.teacherEmail.toLowerCase() === newTeacher.teacherEmail.toLowerCase() ? { ...tc, ...newTeacher } : tc));
        saveTeacherCodesToFirestore(updated).catch((err) => console.warn('Firestore teacher codes save error:', err));
        fetch('/api/sync/teacher-codes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codes: updated }),
        }).catch((err) => console.error(err));
        return updated;
      }
      const updated = [newTeacher, ...prev];
      saveTeacherCodesToFirestore(updated).catch((err) => console.warn('Firestore teacher codes save error:', err));
      fetch('/api/sync/teacher-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes: updated }),
      }).catch((err) => console.error(err));
      return updated;
    });
  };

  const handleUpdateQuizStatus = (quizId: string, status: QuizStatus) => {
    const updatedAt = new Date().toISOString();
    setQuizzes((prev) => {
      const updated = prev.map((q) => (q.id === quizId || q.code === quizId ? { ...q, status, updatedAt } : q));
      const target = updated.find((q) => q.id === quizId || q.code === quizId);
      if (target) {
        saveQuizToFirestore(target).catch((err) => console.warn('Firestore quiz update error:', err));
        fetch('/api/sync/quizzes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(target),
        }).catch((err) => console.error(err));
      }
      return updated;
    });

    setConfig((prev) => {
      if (prev.id === quizId || prev.code === quizId) {
        return { ...prev, status, updatedAt };
      }
      return prev;
    });
    broadcastSyncEvent('QUIZ_STATUS_UPDATED');
  };

  const handleToggleQuizTabPenalty = (quizId: string) => {
    const updatedAt = new Date().toISOString();
    setQuizzes((prev) => {
      const updated = prev.map((q) => {
        if (q.id === quizId || q.code === quizId) {
          const currentVal = Boolean(q.progressiveTabPenalty || q.enableTabSwitchPenalties);
          const nextVal = !currentVal;
          return {
            ...q,
            progressiveTabPenalty: nextVal,
            enableTabSwitchPenalties: nextVal,
            tabSwitchMonitoring: nextVal ? true : q.tabSwitchMonitoring,
            enableTabMonitoring: nextVal ? true : q.enableTabMonitoring,
            updatedAt,
          };
        }
        return q;
      });
      const target = updated.find((q) => q.id === quizId || q.code === quizId);
      if (target) {
        saveQuizToFirestore(target).catch((err) => console.warn('Firestore quiz update error:', err));
        fetch('/api/sync/quizzes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(target),
        }).catch((err) => console.error(err));
      }
      return updated;
    });

    setConfig((prev) => {
      if (prev.id === quizId || prev.code === quizId) {
        const currentVal = Boolean(prev.progressiveTabPenalty || prev.enableTabSwitchPenalties);
        const nextVal = !currentVal;
        return {
          ...prev,
          progressiveTabPenalty: nextVal,
          enableTabSwitchPenalties: nextVal,
          tabSwitchMonitoring: nextVal ? true : prev.tabSwitchMonitoring,
          enableTabMonitoring: nextVal ? true : prev.enableTabMonitoring,
          updatedAt,
        };
      }
      return prev;
    });
    broadcastSyncEvent('QUIZ_STATUS_UPDATED');
  };

  const handleToggleQuizAttemptLimit = (quizId: string) => {
    const targetQuiz = quizzes.find((q) => q.id === quizId || q.code === quizId);
    if (!targetQuiz) return;

    // Toggle single attempt lock
    const currentIsSingle = Boolean(
      targetQuiz.enforceSingleAttempt !== false &&
      (targetQuiz.enforceSingleAttempt || targetQuiz.preventMultipleAttempts || (targetQuiz.attemptsAllowed !== undefined && targetQuiz.attemptsAllowed <= 1))
    );
    const nextEnforceSingle = !currentIsSingle;
    const updatedAt = new Date().toISOString();

    const updatedQuiz: QuizConfig = {
      ...targetQuiz,
      enforceSingleAttempt: nextEnforceSingle,
      preventMultipleAttempts: nextEnforceSingle,
      attemptsAllowed: nextEnforceSingle ? 1 : 99,
      updatedAt,
    };

    setQuizzes((prev) =>
      prev.map((q) => (q.id === quizId || q.code === quizId ? updatedQuiz : q))
    );

    saveQuizToFirestore(updatedQuiz).catch((err) =>
      console.warn('Firestore quiz attempt lock update error:', err)
    );
    fetch('/api/sync/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedQuiz),
    }).catch((err) => console.error(err));
    fetch('/api/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedQuiz),
    }).catch((err) => console.error(err));

    setConfig((prev) => {
      if (prev && (prev.id === quizId || prev.code === quizId)) {
        return {
          ...prev,
          enforceSingleAttempt: nextEnforceSingle,
          preventMultipleAttempts: nextEnforceSingle,
          attemptsAllowed: nextEnforceSingle ? 1 : 99,
          updatedAt,
        };
      }
      return prev;
    });
    broadcastSyncEvent('QUIZ_STATUS_UPDATED');
  };

  const handleToggleQuizSecurityShield = (quizId: string) => {
    const targetQuiz = quizzes.find((q) => q.id === quizId || q.code === quizId);
    if (!targetQuiz) return;

    const currentActive = targetQuiz.enableCandidateWatermark !== false && targetQuiz.enableAntiCopyPrint !== false;
    const nextVal = !currentActive;
    const updatedAt = new Date().toISOString();

    const updatedQuiz: QuizConfig = {
      ...targetQuiz,
      enableCandidateWatermark: nextVal,
      enableAntiCopyPrint: nextVal,
      updatedAt,
    };

    setQuizzes((prev) =>
      prev.map((q) => (q.id === quizId || q.code === quizId ? updatedQuiz : q))
    );

    saveQuizToFirestore(updatedQuiz).catch((err) =>
      console.warn('Firestore quiz security shield update error:', err)
    );
    fetch('/api/sync/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedQuiz),
    }).catch((err) => console.error(err));
    fetch('/api/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedQuiz),
    }).catch((err) => console.error(err));

    setConfig((prev) => {
      if (prev && (prev.id === quizId || prev.code === quizId)) {
        return {
          ...prev,
          enableCandidateWatermark: nextVal,
          enableAntiCopyPrint: nextVal,
          updatedAt,
        };
      }
      return prev;
    });
    broadcastSyncEvent('QUIZ_STATUS_UPDATED');
  };

  const handleToggleOptionShuffling = (quizId: string) => {
    const targetQuiz = quizzes.find((q) => q.id === quizId || q.code === quizId);
    if (!targetQuiz) return;

    const currentVal = targetQuiz.randomizeOptions !== false && targetQuiz.shuffleOptions !== false;
    const nextVal = !currentVal;
    const updatedAt = new Date().toISOString();

    const updatedQuiz: QuizConfig = {
      ...targetQuiz,
      randomizeOptions: nextVal,
      shuffleOptions: nextVal,
      updatedAt,
    };

    setQuizzes((prev) =>
      prev.map((q) => (q.id === quizId || q.code === quizId ? updatedQuiz : q))
    );

    saveQuizToFirestore(updatedQuiz).catch((err) =>
      console.warn('Firestore quiz option shuffle update error:', err)
    );
    fetch('/api/sync/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedQuiz),
    }).catch((err) => console.error(err));
    fetch('/api/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedQuiz),
    }).catch((err) => console.error(err));

    setConfig((prev) => {
      if (prev && (prev.id === quizId || prev.code === quizId)) {
        return {
          ...prev,
          randomizeOptions: nextVal,
          shuffleOptions: nextVal,
          updatedAt,
        };
      }
      return prev;
    });
    broadcastSyncEvent('QUIZ_STATUS_UPDATED');
  };

  const handleToggleQuizFullscreenLockdown = (quizId: string) => {
    const updatedAt = new Date().toISOString();
    setQuizzes((prev) => {
      const updated = prev.map((q) => {
        if (q.id === quizId || q.code === quizId) {
          const currentVal = Boolean(q.enableFullscreenLockdown);
          const nextVal = !currentVal;
          return {
            ...q,
            enableFullscreenLockdown: nextVal,
            enableFullscreenEnforcement: nextVal ? true : q.enableFullscreenEnforcement,
            linearExamMode: nextVal ? true : q.linearExamMode,
            perQuestionTimerEnabled: nextVal ? true : q.perQuestionTimerEnabled,
            autoSkipOnTabSwitch: nextVal ? true : q.autoSkipOnTabSwitch,
            updatedAt,
          };
        }
        return q;
      });
      const target = updated.find((q) => q.id === quizId || q.code === quizId);
      if (target) {
        saveQuizToFirestore(target).catch((err) => console.warn('Firestore quiz update error:', err));
        fetch('/api/sync/quizzes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(target),
        }).catch((err) => console.error(err));
      }
      return updated;
    });

    setConfig((prev) => {
      if (prev.id === quizId || prev.code === quizId) {
        const currentVal = Boolean(prev.enableFullscreenLockdown);
        const nextVal = !currentVal;
        return {
          ...prev,
          enableFullscreenLockdown: nextVal,
          enableFullscreenEnforcement: nextVal ? true : prev.enableFullscreenEnforcement,
          linearExamMode: nextVal ? true : prev.linearExamMode,
          perQuestionTimerEnabled: nextVal ? true : prev.perQuestionTimerEnabled,
          autoSkipOnTabSwitch: nextVal ? true : prev.autoSkipOnTabSwitch,
          updatedAt,
        };
      }
      return prev;
    });
    broadcastSyncEvent('QUIZ_STATUS_UPDATED');
  };

  const handleDeleteQuiz = (quizId: string) => {
    const targetQuiz = quizzes.find((q) => q.id === quizId || q.code === quizId);
    const quizCode = targetQuiz?.code;

    // Track deleted quizzes to prevent re-animation in multi-device sync
    const nextDeletedIds = [...(systemSettings?.deletedQuizIds || [])];
    if (quizId && !nextDeletedIds.includes(quizId)) nextDeletedIds.push(quizId);
    if (quizCode && !nextDeletedIds.includes(quizCode)) nextDeletedIds.push(quizCode);
    handleUpdateSystemSettings({ ...systemSettings, deletedQuizIds: nextDeletedIds });

    setQuizzes((prev) => prev.filter((q) => q.id !== quizId && q.code !== quizId));
    deleteQuizFromFirestore(quizId, quizCode).catch((err) => console.warn('Firestore quiz delete error:', err));
    fetch(`/api/sync/quizzes/${encodeURIComponent(quizId)}`, { method: 'DELETE' }).catch((err) => console.error(err));
    fetch(`/api/quizzes/${encodeURIComponent(quizId)}`, { method: 'DELETE' }).catch((err) => console.error(err));
    if (quizCode && quizCode !== quizId) {
      fetch(`/api/sync/quizzes/${encodeURIComponent(quizCode)}`, { method: 'DELETE' }).catch(() => {});
      fetch(`/api/quizzes/${encodeURIComponent(quizCode)}`, { method: 'DELETE' }).catch(() => {});
    }
    broadcastSyncEvent('QUIZ_DELETED');
  };

  const handleDeleteSubmission = (submissionId: string) => {
    const targetSub = submissions.find((s) => s.id === submissionId);
    if (targetSub) {
      const qId = targetSub.quizId || (targetSub as any).quizCode || '';
      if (targetSub.studentId) removeQuizSubmissionLock(qId, targetSub.studentId);
      if (targetSub.studentEmail) removeQuizSubmissionLock(qId, targetSub.studentEmail);
      if (targetSub.studentName) removeQuizSubmissionLock(qId, targetSub.studentName);
      if (qId) clearBrowserQuizAttemptLock(qId);
    }
    setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
    deleteSubmissionFromFirestore(submissionId).catch((err) => console.warn('Firestore submission delete error:', err));
    fetch(`/api/sync/submissions/${encodeURIComponent(submissionId)}`, { method: 'DELETE' }).catch((err) => console.error(err));
    broadcastSyncEvent('SUBMISSION_DELETED');
  };

  const handleUnlockStudentAttempt = (submission: StudentSubmission) => {
    if (!submission) return;
    const qId = submission.quizId || (submission as any).quizCode || '';
    if (submission.studentId) removeQuizSubmissionLock(qId, submission.studentId);
    if (submission.studentEmail) removeQuizSubmissionLock(qId, submission.studentEmail);
    if (submission.studentName) removeQuizSubmissionLock(qId, submission.studentName);
    if (qId) clearBrowserQuizAttemptLock(qId);
    handleDeleteSubmission(submission.id);
  };

  const handleClearAllSubmissions = (filterQuizId?: string) => {
    try {
      localStorage.removeItem('joy_submitted_locks');
      clearBrowserQuizAttemptLock(filterQuizId);
    } catch {}

    if (filterQuizId && filterQuizId !== 'all') {
      const matchedQuiz = quizzes.find((q) => q.id === filterQuizId || q.code === filterQuizId);
      const targetId = (matchedQuiz?.id || filterQuizId).toUpperCase();
      const targetCode = (matchedQuiz?.code || filterQuizId).toUpperCase();

      setSubmissions((prev) => {
        const remaining: StudentSubmission[] = [];
        for (const s of prev) {
          const sQuizId = (s.quizId || '').toUpperCase();
          const sQuizCode = ((s as any).quizCode || '').toUpperCase();
          const sQuizTitle = (s.quizTitle || '').toUpperCase();
          const isMatch = sQuizId === targetId || sQuizId === targetCode || sQuizCode === targetId || sQuizCode === targetCode || sQuizTitle === targetId;

          if (isMatch) {
            deleteSubmissionFromFirestore(s.id).catch(() => {});
            fetch(`/api/sync/submissions/${encodeURIComponent(s.id)}`, { method: 'DELETE' }).catch(() => {});
          } else {
            remaining.push(s);
          }
        }
        return remaining;
      });
      fetch(`/api/sync/submissions/quiz/${encodeURIComponent(filterQuizId)}`, { method: 'DELETE' }).catch(() => {});
      broadcastSyncEvent('SUBMISSIONS_CLEARED');
    } else {
      setSubmissions([]);
      clearAllSubmissionsInFirestore().catch((err) => console.warn('Firestore clear submissions error:', err));
      fetch('/api/sync/submissions/all', { method: 'DELETE' }).catch((err) => console.error(err));
      broadcastSyncEvent('SUBMISSIONS_CLEARED');
    }
  };

  // Clean and permanently purge duplicate submissions from database & memory
  const handleCleanDuplicates = async (): Promise<number> => {
    const dupeIds = findDuplicateSubmissionIds(submissions);
    if (dupeIds.length === 0) {
      return 0;
    }

    const removedCount = dupeIds.length;
    // Filter local state to keep only unique clean submissions
    setSubmissions((prev) => prev.filter((s) => !dupeIds.includes(s.id)));

    // Clean from Firestore and server storage asynchronously
    for (const dupId of dupeIds) {
      deleteSubmissionFromFirestore(dupId).catch((err) => console.warn('Firestore dupe clean notice:', err));
      fetch(`/api/sync/submissions/${encodeURIComponent(dupId)}`, { method: 'DELETE' }).catch(() => {});
    }

    // Clean from offline local cache
    try {
      const rawOffline = localStorage.getItem('joy_offline_submissions');
      if (rawOffline) {
        const parsed: StudentSubmission[] = JSON.parse(rawOffline);
        const cleaned = parsed.filter((s) => !dupeIds.includes(s.id));
        localStorage.setItem('joy_offline_submissions', JSON.stringify(cleaned));
      }
    } catch (e) {
      console.warn('Offline cache cleanup notice:', e);
    }

    broadcastSyncEvent('SUBMISSION_DELETED');
    return removedCount;
  };

  // Handle new student submission
  const handleSubmitAssessment = (newSubmission: StudentSubmission) => {
    // Ensure accurate local ISO timestamp without time drift
    const syncedSubmission: StudentSubmission = {
      ...newSubmission,
      submittedAt: newSubmission.submittedAt || new Date().toISOString(),
    };

    setSubmissions((prev) => {
      // Check for rapid synthetic duplicate from same student within 15 seconds
      const normStudent = (syncedSubmission.studentId || syncedSubmission.studentEmail || syncedSubmission.studentName || '').toLowerCase().trim();
      const normQuiz = (syncedSubmission.quizId || (syncedSubmission as any).quizCode || syncedSubmission.quizTitle || '').toLowerCase().trim();
      
      const subMap = new Map<string, StudentSubmission>();
      let replacedExisting = false;

      prev.forEach((s) => {
        if (!s || !s.id) return;
        const sStudent = (s.studentId || s.studentEmail || s.studentName || '').toLowerCase().trim();
        const sQuiz = (s.quizId || (s as any).quizCode || s.quizTitle || '').toLowerCase().trim();
        
        // If exact same student & quiz was submitted very recently (< 20s), replace with latest instead of duplicating
        const timeDiff = Math.abs(new Date(syncedSubmission.submittedAt).getTime() - new Date(s.submittedAt || 0).getTime());
        if (normStudent && normStudent === sStudent && normQuiz && normQuiz === sQuiz && timeDiff < 20000) {
          subMap.set(syncedSubmission.id, syncedSubmission);
          replacedExisting = true;
        } else {
          subMap.set(s.id, s);
        }
      });

      if (!replacedExisting) {
        subMap.set(syncedSubmission.id, syncedSubmission);
      }

      const list = Array.from(subMap.values());
      list.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
      return list;
    });

    // Cloud Firestore Sync
    saveSubmissionToFirestore(syncedSubmission).catch((err) => console.warn('Firestore submission save error:', err));

    // Centralized Server Sync
    fetch('/api/sync/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(syncedSubmission),
    }).catch((err) => console.error('Failed to sync submission to server:', err));

    if (config.googleSheetsWebhookUrl) {
      fetch(config.googleSheetsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncedSubmission),
      }).catch((err) => console.error('Failed to sync to Google Sheets webhook:', err));
    }
    broadcastSyncEvent('SUBMISSION_ADDED');
  };

  // Handle imported questions from Document Importer
  const handleImportedQuestions = (imported: Question[], fileName?: string) => {
    setLastImportedQuestions(imported);
    setLoadedExamFileName(fileName);
    setQuestions((prev) => [...imported, ...prev]);
    setLastExtractedCount(imported.length);
    setIsImporterOpen(false);
    setIsQuizCreatorOpen(true);
  };

  // Handle Discard Loaded Exam
  const handleDiscardLoadedExam = () => {
    if (lastImportedQuestions.length > 0) {
      const importedIds = new Set(lastImportedQuestions.map((q) => q.id));
      setQuestions((prev) => prev.filter((q) => !importedIds.has(q.id)));
      setLastImportedQuestions([]);
    }
    setLastExtractedCount(undefined);
    setLoadedExamFileName(undefined);
    setIsQuizCreatorOpen(false);
  };

  // Handle Reload Exam
  const handleReloadExam = () => {
    setIsQuizCreatorOpen(false);
    setIsImporterOpen(true);
  };

  // Handle newly created quiz
  const handleCreateNewQuiz = async (newQuiz: QuizConfig) => {
    const teacherEmail = currentTeacher?.email || newQuiz.teacherEmail || 'twumbismark90@gmail.com';
    const teacherName = currentTeacher?.name || newQuiz.teacherName || 'Mr. Twumasi';
    const synced = syncQuizInstructions({
      ...newQuiz,
      teacherId: teacherEmail,
      teacherEmail: teacherEmail,
      teacherName: teacherName,
    });
    setQuizzes((prev) => [synced, ...prev.filter((q) => q.id !== synced.id && q.code !== synced.code)]);
    setActiveQuizId(synced.id);
    setConfig(synced);

    if (synced.questions && synced.questions.length > 0) {
      setQuestions(synced.questions);
    }
    if (synced.sections && synced.sections.length > 0) {
      setSections(synced.sections);
    }

    // Set confirmation notification & close creator modal (leave interface to dashboard)
    setRecentQuizNotification({ quiz: synced, type: 'created', timestamp: Date.now() });
    setIsQuizCreatorOpen(false);
    setEditingQuiz(null);

    // Save to Cloud Firestore for multi-device & cloud synchronization
    try {
      await saveQuizToFirestore(synced);
      setLastSyncTime(new Date().toLocaleTimeString());
      setSyncStatus('synced');
    } catch (err) {
      console.warn('Firestore quiz save notice:', err);
    }

    fetch('/api/sync/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(synced),
    }).catch((err) => console.error('Failed to sync quiz to server:', err));
    broadcastSyncEvent('QUIZ_CREATED');
  };

  // Handle updating an existing quiz (quiz name, questions, instructions, duration, attempts, delivery rules)
  const handleUpdateExistingQuiz = async (updatedQuiz: QuizConfig) => {
    const teacherEmail = currentTeacher?.email || updatedQuiz.teacherEmail || 'twumbismark90@gmail.com';
    const teacherName = currentTeacher?.name || updatedQuiz.teacherName || 'Mr. Twumasi';
    const synced = syncQuizInstructions({
      ...updatedQuiz,
      teacherId: teacherEmail,
      teacherEmail: teacherEmail,
      teacherName: teacherName,
    });

    setQuizzes((prev) =>
      prev.map((q) => (q.id === synced.id || (q.code && synced.code && q.code === synced.code) ? synced : q))
    );

    if (activeQuizId === synced.id || activeQuizId === synced.code || config.id === synced.id) {
      setConfig(synced);
      if (synced.questions && synced.questions.length > 0) {
        setQuestions(synced.questions);
      }
      if (synced.sections && synced.sections.length > 0) {
        setSections(synced.sections);
      }
    }

    // Set confirmation notification & close creator modal (leave interface to dashboard)
    setRecentQuizNotification({ quiz: synced, type: 'updated', timestamp: Date.now() });
    setIsQuizCreatorOpen(false);
    setEditingQuiz(null);

    // Save to Cloud Firestore
    try {
      await saveQuizToFirestore(synced);
      setLastSyncTime(new Date().toLocaleTimeString());
      setSyncStatus('synced');
    } catch (err) {
      console.warn('Firestore quiz update notice:', err);
    }

    fetch('/api/sync/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(synced),
    }).catch((err) => console.error('Failed to sync quiz update to server:', err));
    broadcastSyncEvent('QUIZ_UPDATED');
  };

  // Handle opening the full QuizCreatorModal in edit mode
  const handleOpenEditQuiz = (quiz: QuizConfig) => {
    let quizWithQuestions = { ...quiz };
    if (
      (!quizWithQuestions.questions || quizWithQuestions.questions.length === 0) &&
      (activeQuizId === quiz.id || activeQuizId === quiz.code)
    ) {
      quizWithQuestions.questions = questions;
    }
    setEditingQuiz(quizWithQuestions);
    setIsQuizCreatorOpen(true);
  };

  // Handle section schedule updates
  const handleUpdateSections = (updatedSections: QuizSection[]) => {
    setSections(updatedSections);
    saveSectionsToFirestore(updatedSections).catch((err) => console.warn('Firestore sections save error:', err));
    fetch('/api/sync/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections: updatedSections }),
    }).catch((err) => console.error('Failed to sync sections to server:', err));
  };

  // Handle question editing
  const handleUpdateQuestion = (updatedQuestion: Question) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === updatedQuestion.id ? updatedQuestion : q))
    );
  };

  // Handle question deletion from bank
  const handleDeleteQuestion = (questionId: number) => {
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
  };

  const handleOpenAbout = (tab: 'about' | 'contact' | 'report' | 'privacy' = 'about') => {
    setAboutModalInitialTab(tab);
    setIsAboutModalOpen(true);
  };

  // Handle feedback sent status update
  const handleFeedbackSentSuccess = (submissionId: string, summary: string) => {
    setSubmissions((prev) =>
      prev.map((sub) =>
        sub.id === submissionId
          ? {
              ...sub,
              feedbackSent: true,
              feedbackSentAt: new Date().toISOString(),
              feedbackSummary: summary,
            }
          : sub
      )
    );
  };

  // Dedicated Standalone Quiz Assessment Link Detection (Direct, standalone quiz URLs)
  const isDirectStandaloneQuizUrl = typeof window !== 'undefined' && (
    !!new URLSearchParams(window.location.search).get('quiz') ||
    !!new URLSearchParams(window.location.search).get('quizId') ||
    !!new URLSearchParams(window.location.search).get('quiz_id') ||
    !!new URLSearchParams(window.location.search).get('qdata') ||
    !!new URLSearchParams(window.location.search).get('quizCode')
  );

  if (isDirectStandaloneQuizUrl) {
    const isStandaloneLocked =
      systemSettings?.isMasterPortalLocked ||
      systemSettings?.lockedUrls?.student ||
      systemSettings?.lockedUrls?.['teacher-student'];

    if (isStandaloneLocked && !isAdminUnlocked) {
      return (
        <div className="min-h-screen bg-slate-900 font-sans text-slate-100 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-950 border-2 border-rose-500/60 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-inner animate-pulse">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-extrabold uppercase tracking-wider">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Assessment Desk Locked</span>
              </div>
              <h2 className="text-2xl font-bold font-serif text-white tracking-wide">
                {systemSettings?.isMasterPortalLocked ? 'Master System Lockdown' : 'Examination Desk Closed'}
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                {systemSettings?.isMasterPortalLocked
                  ? (systemSettings?.masterLockMessage || 'Master access lock is active.')
                  : (systemSettings?.urlLockMessages?.student || 'Student assessments are temporarily closed.')}
              </p>
            </div>
            <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 text-left space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Notice: Please Consult Your Administrator</span>
              </div>
              <p className="text-[12px] text-slate-400 leading-relaxed">
                Access to this assessment link has been restricted. If you require access or believe this is an error, please contact your administrator at <span className="text-amber-300 font-semibold">{systemSettings?.adminContactEmail || 'twumbismark90@gmail.com'}</span>.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleTriggerBidirectionalSync}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer inline-flex items-center justify-center gap-2 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Check Reopen Status</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex flex-col">
        {/* Distraction-Free Header for Standalone Quiz Candidate (Hidden during active quiz to keep timers pinned at top) */}
        {!isTimerRunning && (
          <header className="bg-[#0f1223] bg-gradient-to-r from-[#0f1223] via-[#13172e] to-[#1a1a2e] border-b border-orange-500/20 px-4 sm:px-6 py-3 flex items-center justify-between text-xs sticky top-0 z-40 shadow-md">
            <div className="flex items-center gap-3">
              <BrandLogo size="sm" variant="icon-only" className="w-8 h-8 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold font-serif text-sm tracking-wide">
                    {config.schoolName || 'MCQ Assessment Hub'}
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Standalone Quiz Desk</span>
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Single Candidate Examination Desk • Real-time Sync Active
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  window.location.href = window.location.pathname + '?portal=student';
                }}
                className="text-amber-400 hover:text-amber-300 text-xs font-bold px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Student Dashboard</span>
              </button>
            </div>
          </header>
        )}

        <main className="flex-1">
          <FormAssessmentView
            questions={questions}
            sections={sections}
            config={config}
            quizzes={quizzes}
            submissions={submissions}
            isStandalone={true}
            onSubmitAssessment={handleSubmitAssessment}
            timeRemainingSeconds={timeRemainingSeconds}
            setTimeRemainingSeconds={setTimeRemainingSeconds}
            isTimerRunning={isTimerRunning}
            setIsTimerRunning={setIsTimerRunning}
          />
        </main>

        {/* Global Academic Bright Footer on Standalone View (hidden during active quiz to give full viewport focus) */}
        {!isTimerRunning && <FooterCredits onOpenAbout={handleOpenAbout} />}

        {/* Global modals */}
        {isImporterOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-5xl my-8">
              <DocumentQuestionImporter
                onImportQuestions={handleImportedQuestions}
                onClose={() => setIsImporterOpen(false)}
              />
            </div>
          </div>
        )}
        <QuizCreatorModal
          isOpen={isQuizCreatorOpen}
          onClose={() => setIsQuizCreatorOpen(false)}
          onCreateQuiz={handleCreateNewQuiz}
          onRunQuiz={(quiz) => {
            setConfig(quiz);
            if (quiz.questions && quiz.questions.length > 0) {
              setQuestions(quiz.questions);
            }
            setIsQuizCreatorOpen(false);
            setActivePortalSection('student');
          }}
          onOpenSurveillance={(quizId) => {
            setSelectedQuizToMonitorId(quizId);
            setIsQuizCreatorOpen(false);
            setActivePortalSection('teacher');
            setActiveTeacherTab('surveillance');
          }}
          extractedQuestionsCount={lastExtractedCount}
          importedQuestions={lastImportedQuestions}
          onReloadExam={handleReloadExam}
          onDiscardLoadedExam={handleDiscardLoadedExam}
          loadedFileName={loadedExamFileName}
          teacherEmail={currentTeacher?.email}
          teacherName={currentTeacher?.name}
          teacherDepartment={currentTeacher?.department}
        />
        <TeacherAuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={(teacher) => {
            setCurrentTeacher(teacher);
            setIsTeacherAuthenticated(true);
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('joy_current_teacher', JSON.stringify(teacher));
              sessionStorage.setItem('joy_teacher_authenticated', 'true');
            }
            setIsAuthModalOpen(false);
            setActivePortalSection('teacher');
            setActiveTeacherTab('analytics');
          }}
          teacherAccessCodes={teacherAccessCodes}
          isSelfRegistrationLocked={systemSettings.isTeacherSelfRegistrationLocked}
          adminContactEmail={systemSettings.adminContactEmail}
          onRegisterTeacher={handleRegisterTeacher}
        />
        {selectedSubmissionForEmail && (
          <EmailFeedbackModal
            submission={selectedSubmissionForEmail}
            questions={questions}
            onClose={() => setSelectedSubmissionForEmail(null)}
            onFeedbackSentSuccess={handleFeedbackSentSuccess}
          />
        )}
        </div>
    );
  }

  return (
    <div className="h-screen w-full bg-slate-100 font-sans flex flex-col md:flex-row text-slate-800 overflow-hidden">
      {/* Mobile Slide-Over Drawer (Comprehensive & Responsive Navigation Drawer) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-[88%] max-w-[350px] h-[100dvh] max-h-[100dvh] flex flex-col bg-[#080e22] bg-gradient-to-b from-[#080e22] via-[#0c1530] to-[#111c3e] border-r border-amber-500/20 text-slate-200 p-4 sm:p-5 shadow-2xl z-10 animate-in slide-in-from-left duration-200 overflow-hidden">
            {/* Ambient blur accents */}
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-amber-500/10 blur-[60px] rounded-full pointer-events-none" />
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-orange-500/10 blur-[60px] rounded-full pointer-events-none" />

            {/* TOP CONTAINER: Branding, Mode Badge & Nav Links (scrollable) */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 relative z-10 overscroll-contain">
              {/* Close Button & Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 sticky top-0 bg-[#080e22]/95 backdrop-blur-xs z-20">
                <div className="flex items-center gap-2">
                  <BrandLogo variant="dark" size="sm" showSubtitle={true} subtitle="Anointed Learning" />
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors border border-slate-700 min-h-[36px] min-w-[36px] flex items-center justify-center"
                  title="Close menu"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Context / Mode Pill */}
              <div className="bg-[#121936] border border-amber-500/20 px-3 py-2 rounded-xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-[11px] font-bold text-amber-300 truncate">
                    {isolatedPortal === 'student' ? 'Student Exam Desk'
                      : isolatedPortal === 'teacher' ? 'Faculty Workspace'
                      : isolatedPortal === 'admin' ? 'Administrative Console'
                      : isolatedPortal === 'teacher-student' ? 'Campus Portal'
                      : showLandingPage ? 'Platform Overview'
                      : `${activePortalSection.toUpperCase()} PORTAL`}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-amber-500/15 border border-amber-400/30 text-amber-300 px-1.5 py-0.5 rounded shrink-0">
                  v2.4.2
                </span>
              </div>

              {/* PRIMARY KEY LINKS */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block px-1">
                  MAIN NAVIGATION
                </span>

                {/* Home Overview */}
                <button
                  type="button"
                  onClick={() => {
                    setShowLandingPage(true);
                    setIsMobileMenuOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer group ${
                    showLandingPage
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md border border-amber-400/40'
                      : 'text-slate-300 hover:bg-[#151c38] hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Home className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                    <span>Home Overview</span>
                  </div>
                  {showLandingPage && (
                    <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono">Current</span>
                  )}
                </button>

                {/* Browse Examination Catalog */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (!showLandingPage) {
                      setShowLandingPage(true);
                      setTimeout(() => {
                        document.getElementById('quiz-catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                      }, 120);
                    } else {
                      document.getElementById('quiz-catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-[#151c38] hover:text-white transition-all flex items-center gap-2.5 cursor-pointer group"
                >
                  <ClipboardList className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span>Exam Catalog & Tests</span>
                </button>

                {/* Candidate Examination Rules & Guides */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (!showLandingPage) {
                      setShowLandingPage(true);
                      setTimeout(() => {
                        document.getElementById('faq-guides-section')?.scrollIntoView({ behavior: 'smooth' });
                      }, 120);
                    } else {
                      document.getElementById('faq-guides-section')?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-[#151c38] hover:text-white transition-all flex items-center gap-2.5 cursor-pointer group"
                >
                  <HelpCircle className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span>Candidate Rules & FAQ</span>
                </button>
              </div>

              {/* Key Links Section 2: Student Desk */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest block px-1">
                  STUDENT DESK
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setShowLandingPage(false);
                    handleNavigatePortal('student');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer group ${
                    !showLandingPage && activePortalSection === 'student'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md border border-emerald-400/40'
                      : 'text-slate-300 hover:bg-[#151c38] hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpenCheck className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span>Take Active Assessment</span>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    Desk
                  </span>
                </button>
              </div>

              {/* Key Links Section 3: Faculty & Teacher Workspace */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-widest block px-1">
                  FACULTY & TEACHERS
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setShowLandingPage(false);
                    handleNavigatePortal('teacher');
                    if (!isTeacherAuthenticated) setIsAuthModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer group ${
                    !showLandingPage && activePortalSection === 'teacher'
                      ? 'bg-gradient-to-r from-indigo-600 to-amber-600 text-white shadow-md border border-indigo-400/40'
                      : 'text-slate-300 hover:bg-[#151c38] hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <GraduationCap className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                    <span>Faculty Workspace & Proctors</span>
                  </div>
                </button>

                {/* Import Word .docx Exam */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (!isTeacherAuthenticated) {
                      setIsAuthModalOpen(true);
                    } else {
                      setShowLandingPage(false);
                      handleNavigatePortal('teacher');
                      setIsImporterOpen(true);
                    }
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-[#151c38] hover:text-white transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <UploadCloud className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                    <span>Import Word (.docx) Exam</span>
                  </div>
                  <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                    Docx
                  </span>
                </button>

                {/* Live Student Surveillance */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setShowLandingPage(false);
                    handleNavigatePortal('teacher');
                    setSelectedQuizToMonitorId('all');
                    setActiveTeacherTab('surveillance');
                    if (!isTeacherAuthenticated) setIsAuthModalOpen(true);
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-[#151c38] hover:text-white transition-all flex items-center gap-2.5 cursor-pointer group"
                >
                  <Activity className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span>Live Student Surveillance</span>
                </button>

                {/* Authoring Guide */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (!showLandingPage) {
                      setShowLandingPage(true);
                      setTimeout(() => {
                        document.getElementById('faq-guides-section')?.scrollIntoView({ behavior: 'smooth' });
                      }, 120);
                    } else {
                      document.getElementById('faq-guides-section')?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-[#151c38] hover:text-white transition-all flex items-center gap-2.5 cursor-pointer group"
                >
                  <BookOpen className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span>Question Authoring Guide</span>
                </button>
              </div>

              {/* Key Links Section 4: Administration (Unless in student isolated mode) */}
              {isolatedPortal !== 'student' && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest block px-1">
                    ADMINISTRATION
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setShowLandingPage(false);
                      handleNavigatePortal('admin');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer group ${
                      !showLandingPage && activePortalSection === 'admin'
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md border border-orange-400/40'
                        : 'text-slate-300 hover:bg-[#151c38] hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldAlert className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                      <span>Master Governance Console</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowLandingPage(false);
                      handleNavigatePortal('admin');
                      setActiveAdminTab('domain-links');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-[#151c38] hover:text-white transition-all flex items-center gap-2.5 cursor-pointer group"
                  >
                    <Globe className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                    <span>Domain Links & Routing</span>
                  </button>
                </div>
              )}

              {/* PORTAL SPECIFIC SUB-TABS (When user is inside Portal View !showLandingPage) */}
              {!showLandingPage && (
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  {/* Portal Switcher Buttons if multiple roles available */}
                  {!isolatedPortal && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block px-1">
                        SWITCH PORTAL
                      </span>
                      <div className="grid grid-cols-3 gap-1.5 bg-[#121936] p-1.5 rounded-xl border border-slate-800">
                        <button
                          onClick={() => {
                            handleNavigatePortal('admin');
                            setIsMobileMenuOpen(false);
                          }}
                          className={`py-2 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                            activePortalSection === 'admin'
                              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                          }`}
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Admin</span>
                        </button>

                        <button
                          onClick={() => {
                            handleNavigatePortal('teacher');
                            if (!isTeacherAuthenticated) setIsAuthModalOpen(true);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`py-2 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                            activePortalSection === 'teacher'
                              ? 'bg-gradient-to-r from-indigo-600 to-amber-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                          }`}
                        >
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>Teacher</span>
                        </button>

                        <button
                          onClick={() => {
                            handleNavigatePortal('student');
                            setIsMobileMenuOpen(false);
                          }}
                          className={`py-2 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                            activePortalSection === 'student'
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                          }`}
                        >
                          <User className="w-3.5 h-3.5" />
                          <span>Student</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Active Admin Portal Sub-tabs */}
                  {activePortalSection === 'admin' && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block px-1">
                        ADMIN TABS
                      </span>
                      <button
                        onClick={() => {
                          setActiveAdminTab('overview');
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                          activeAdminTab === 'overview' ? 'bg-amber-600 text-white' : 'text-slate-300 hover:bg-[#151c38]'
                        }`}
                      >
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        <span>Overview & Setup</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveAdminTab('teacher-codes');
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                          activeAdminTab === 'teacher-codes' ? 'bg-amber-600 text-white' : 'text-slate-300 hover:bg-[#151c38]'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Teacher Access Codes</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveAdminTab('all-quizzes');
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                          activeAdminTab === 'all-quizzes' ? 'bg-amber-600 text-white' : 'text-slate-300 hover:bg-[#151c38]'
                        }`}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>All Quizzes Overview</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveAdminTab('surveillance');
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                          activeAdminTab === 'surveillance' ? 'bg-amber-600 text-white' : 'text-slate-300 hover:bg-[#151c38]'
                        }`}
                      >
                        <Activity className="w-3.5 h-3.5 text-emerald-400" />
                        <span>System Surveillance</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveAdminTab('admin-manual');
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                          activeAdminTab === 'admin-manual' ? 'bg-amber-600 text-white' : 'text-amber-300 hover:bg-[#151c38]'
                        }`}
                      >
                        <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                        <span>Admin Operations Manual</span>
                      </button>
                    </div>
                  )}

                  {/* Active Teacher Portal Sub-tabs */}
                  {activePortalSection === 'teacher' && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block px-1">
                        TEACHER TABS
                      </span>
                      <button
                        onClick={() => {
                          setActiveTeacherTab('analytics');
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                          activeTeacherTab === 'analytics' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-[#151c38]'
                        }`}
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>Assessments & Overview</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveTeacherTab('release-manager');
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                          activeTeacherTab === 'release-manager' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-[#151c38]'
                        }`}
                      >
                        <CalendarClock className="w-3.5 h-3.5" />
                        <span>Section Release Times</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveTeacherTab('submissions-export');
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                          activeTeacherTab === 'submissions-export' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-[#151c38]'
                        }`}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Sheets Sync & Export</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveTeacherTab('question-bank');
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                          activeTeacherTab === 'question-bank' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-[#151c38]'
                        }`}
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Question Bank & Keys</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Key Links Section 5: Platform & About */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleOpenAbout('about');
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#131a37] border border-amber-500/20 text-amber-300 hover:text-white hover:border-amber-500/40 transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
                    <span>About Platform & Architect</span>
                  </div>
                  <Info className="w-3.5 h-3.5 text-amber-400/70" />
                </button>

                {/* Cloud & Server Sync Button */}
                <button
                  type="button"
                  onClick={() => {
                    handleTriggerBidirectionalSync();
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#131a37]/70 border border-slate-800 text-slate-300 hover:text-amber-300 transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <RefreshCw className={`w-4 h-4 text-amber-400 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                    <span>Force Cloud & Server Sync</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold">
                    {syncStatus === 'syncing' ? 'Syncing...' : 'Online'}
                  </span>
                </button>
              </div>
            </div>

            {/* SEPARATE BOTTOM CONTAINER: Dedicated Login & Authentication */}
            <div className="shrink-0 pt-3 space-y-2.5 relative z-10 border-t border-slate-800/90 pb-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block px-1">
                ACCOUNT & ACCESS
              </span>

              {isTeacherAuthenticated || isAdminUnlocked ? (
                /* Authenticated User Status Card */
                <div className="bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {isAdminUnlocked ? <ShieldCheck className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-indigo-300 block uppercase">
                          {isAdminUnlocked ? 'Admin Session' : 'Faculty Member'}
                        </span>
                        <h4 className="text-xs font-bold text-white truncate">
                          {isAdminUnlocked ? 'System Administrator' : (currentTeacher?.name || 'Authenticated Faculty')}
                        </h4>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30 shrink-0">
                      Active
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleLogoutAll();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-2 px-3 bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-rose-500/40"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                /* Separate Login & Passcode Action Buttons (Unauthenticated) */
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsAuthModalOpen(true);
                    }}
                    className="w-full py-2.5 px-3 bg-[#17203d] hover:bg-[#1e2a52] text-amber-300 hover:text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-amber-500/30 shadow-sm"
                  >
                    <User className="w-4 h-4 text-amber-400" />
                    <span>Teacher / Faculty Login</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setShowLandingPage(false);
                      setActivePortalSection('student');
                    }}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <GraduationCap className="w-4 h-4 text-slate-950" />
                    <span>Candidate Passcode Entry</span>
                  </button>
                </div>
              )}

              {/* Copyright Micro-footer */}
              <div className="text-center pt-1">
                <p className="text-[10px] font-medium text-slate-400 tracking-wide select-all">
                  &copy; {new Date().getFullYear()} - The joy of the Lord is my strength. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Dark Navy Left Sidebar (Hidden on mobile devices and on full landing page) */}
      {isolatedPortal !== 'student' && !showLandingPage && (
        <aside className="hidden md:flex md:w-72 bg-[#08142c] bg-gradient-to-b from-[#08142c] via-[#0d1e3d] to-[#060e20] border-r border-[#DFC15D]/25 flex-col justify-between shrink-0 text-slate-300 h-full min-h-screen overflow-y-auto z-20 relative p-5 gap-4">
          {/* Subtle background ambient blur patterns */}
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-[#DFC15D]/10 blur-[60px] rounded-full pointer-events-none" />
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-[#9E7D3B]/10 blur-[60px] rounded-full pointer-events-none" />

          {/* TOP SECTION: Branding, Home Button, Portal Selector, Nav Menu */}
          <div className="space-y-4 relative z-10">
            {/* Branding Header Box */}
            <div className="bg-[#0b162f]/95 border border-[#DFC15D]/30 rounded-2xl p-4 text-center space-y-2 relative shadow-xl backdrop-blur-md">
              <div className="flex justify-center pb-1">
                <BrandLogo variant="full" theme="dark" size="md" showSubtitle={false} />
              </div>

              <p className="text-[11px] font-medium text-slate-300 leading-snug font-sans">
                Academic Assessment & Testing Ecosystem
              </p>

              <div className="pt-1">
                <span className="bg-[#060e20] border border-[#DFC15D]/30 text-[#DFC15D] text-[10px] font-medium px-3 py-1 rounded-lg inline-block shadow-inner font-sans">
                  Created by Bismark Twum, MPhil
                </span>
              </div>
            </div>

            {/* Quick Platform Home Button (Only accessible on master root domain) */}
            {!isolatedPortal && (
              <button
                type="button"
                onClick={() => setShowLandingPage(true)}
                className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border group ${
                  showLandingPage
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 border-amber-300 font-black shadow-[0_0_20px_rgba(249,115,22,0.35)]'
                    : 'bg-[#151932]/90 hover:bg-[#1e2345] text-amber-300 border-slate-800 hover:border-orange-500/40 hover:shadow-[0_0_15px_rgba(249,115,22,0.2)]'
                }`}
              >
                <Globe className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" />
                <span>Platform Overview / Home</span>
              </button>
            )}

            {/* Portal Section Switcher (Only shown in master mode when not locked into an isolated domain link) */}
            {!isolatedPortal ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                    SELECT ACTIVE PORTAL
                  </span>
                  <button
                    onClick={handleGoBack}
                    className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                    title="Go back to previous view"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5 bg-[#151932]/90 p-1.5 rounded-xl border border-slate-800/80">
                  <button
                    onClick={() => handleNavigatePortal('admin')}
                    className={`group py-2.5 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      activePortalSection === 'admin'
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] border border-orange-400/40'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                    <span>Admin</span>
                  </button>

                  <button
                    onClick={() => {
                      handleNavigatePortal('teacher');
                      if (!isTeacherAuthenticated) setIsAuthModalOpen(true);
                    }}
                    className={`group py-2.5 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      activePortalSection === 'teacher'
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] border border-orange-400/40'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                    <span>Teacher</span>
                  </button>

                  <button
                    onClick={() => handleNavigatePortal('student')}
                    className={`group py-2.5 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      activePortalSection === 'student'
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] border border-orange-400/40'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <User className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                    <span>Student</span>
                  </button>
                </div>
              </div>
            ) : isolatedPortal === 'teacher-student' ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest block">
                    TEACHER & STUDENT PORTAL
                  </span>
                  <button
                    onClick={handleGoBack}
                    className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                    title="Go back to previous view"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 bg-[#151932]/90 p-1.5 rounded-xl border border-slate-800/80">
                  <button
                    onClick={() => {
                      handleNavigatePortal('teacher');
                      if (!isTeacherAuthenticated) setIsAuthModalOpen(true);
                    }}
                    className={`group py-2.5 px-2 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      activePortalSection === 'teacher'
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] border border-orange-400/40'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                    <span>Teacher</span>
                  </button>

                  <button
                    onClick={() => handleNavigatePortal('student')}
                    className={`group py-2.5 px-2 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      activePortalSection === 'student'
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] border border-orange-400/40'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <User className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                    <span>Student</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="bg-[#151932]/90 border border-slate-800 px-3.5 py-2.5 rounded-xl text-center space-y-1">
                  <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest block">
                    {isolatedPortal === 'admin' ? 'ADMINISTRATOR DOMAIN (LOCKED)' : 'FACULTY DOMAIN (LOCKED)'}
                  </span>
                  <p className="text-[10px] text-slate-400">
                    {isolatedPortal === 'admin' ? 'Secure administrative management portal.' : 'Dedicated faculty exam monitoring workspace.'}
                  </p>
                </div>
              </div>
            )}

            {/* Main Navigation Menu */}
            <div className="space-y-3 pt-1">
              {activePortalSection === 'admin' && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block px-1 mb-1">
                    MAIN ADMIN CONTROL
                  </span>
                  <button
                    onClick={() => setActiveAdminTab('overview')}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer group ${
                      activeAdminTab === 'overview'
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] border border-orange-400/40'
                        : 'text-slate-300 hover:bg-[#1a203d] hover:text-white'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                    <span>Admin Overview & Setup</span>
                  </button>

                  <button
                    onClick={() => setActiveAdminTab('domain-links')}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer group ${
                      activeAdminTab === 'domain-links'
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] border border-orange-400/40'
                        : 'text-slate-300 hover:bg-[#1a203d] hover:text-white'
                    }`}
                  >
                    <Globe className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                    <span>Isolated Domain Links</span>
                  </button>

                  <button
                    onClick={() => setActiveAdminTab('teacher-codes')}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer group ${
                      activeAdminTab === 'teacher-codes'
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] border border-orange-400/40'
                        : 'text-slate-300 hover:bg-[#1a203d] hover:text-white'
                    }`}
                  >
                    <Users className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                    <span>Teacher Access Codes</span>
                  </button>

                  <button
                    onClick={() => setActiveAdminTab('all-quizzes')}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer group ${
                      activeAdminTab === 'all-quizzes'
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] border border-orange-400/40'
                        : 'text-slate-300 hover:bg-[#1a203d] hover:text-white'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                    <span>All Quizzes Overview</span>
                  </button>

                  <button
                    onClick={() => setActiveAdminTab('surveillance')}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer group ${
                      activeAdminTab === 'surveillance'
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] border border-orange-400/40'
                        : 'text-slate-300 hover:bg-[#1a203d] hover:text-white'
                    }`}
                  >
                    <Activity className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform duration-200" />
                    <span>System Surveillance</span>
                  </button>

                  <button
                    onClick={() => setActiveAdminTab('admin-manual')}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer group ${
                      activeAdminTab === 'admin-manual'
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] border border-orange-400/40'
                        : 'text-amber-400 hover:bg-[#1a203d] hover:text-amber-300'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform duration-200" />
                    <span>Admin Operations Manual</span>
                  </button>
                </div>
              )}

              {activePortalSection === 'teacher' && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block px-1 mb-1">
                    TEACHER CONTROLS
                  </span>
                  <button
                    onClick={() => setActiveTeacherTab('analytics')}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer group ${
                      activeTeacherTab === 'analytics'
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] border border-orange-400/40'
                        : 'text-slate-300 hover:bg-[#1a203d] hover:text-white'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                    <span>Teacher Overview & Assessments</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedQuizToMonitorId('all');
                      setActiveTeacherTab('surveillance');
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer group ${
                      activeTeacherTab === 'surveillance'
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] border border-orange-400/40'
                        : 'text-slate-300 hover:bg-[#1a203d] hover:text-white'
                    }`}
                  >
                    <Activity className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform duration-200" />
                    <span>Live Student Surveillance</span>
                  </button>

                  <button
                    onClick={() => setActiveTeacherTab('release-manager')}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer group ${
                      activeTeacherTab === 'release-manager'
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] border border-orange-400/40'
                        : 'text-slate-300 hover:bg-[#1a203d] hover:text-white'
                    }`}
                  >
                    <CalendarClock className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                    <span>Section Release Times</span>
                  </button>

                  <button
                    onClick={() => setActiveTeacherTab('submissions-export')}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer group ${
                      activeTeacherTab === 'submissions-export'
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] border border-orange-400/40'
                        : 'text-slate-300 hover:bg-[#1a203d] hover:text-white'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                    <span>Google Sheets Sync & Email</span>
                  </button>

                  <button
                    onClick={() => setActiveTeacherTab('question-bank')}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer group ${
                      activeTeacherTab === 'question-bank'
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] border border-orange-400/40'
                        : 'text-slate-300 hover:bg-[#1a203d] hover:text-white'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                    <span>Question Bank & Answer Keys</span>
                  </button>
                </div>
              )}

              {activePortalSection === 'student' && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block px-1 mb-1">
                    STUDENT ASSESSMENT
                  </span>
                  <button
                    className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] border border-orange-400/40 flex items-center gap-2.5 cursor-pointer group"
                  >
                    <BookOpenCheck className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                    <span>Active MCQ Assessment Paper</span>
                  </button>
                </div>
              )}

              {/* About Platform & Author Card in Left Sidebar */}
              <div className="pt-2">
                <div className="p-3.5 rounded-2xl bg-[#151932] border border-orange-500/20 space-y-2.5 shadow-inner">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                      <Info className="w-3.5 h-3.5" />
                      <span>About Platform</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">
                      v2.4.2
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 pt-0.5">
                    <img
                      src="/admin-photo.jpg"
                      alt="Bismark Twum"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                      className="w-9 h-9 rounded-full object-cover border border-amber-500/40 shadow-xs shrink-0"
                    />
                    <div className="text-[11px] leading-snug">
                      <span className="text-slate-400 block text-[10px]">Lead Developer & Educator</span>
                      <strong className="text-white font-semibold">Bismark Twum, MPhil</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenAbout('about')}
                    className="w-full py-1.5 px-2.5 bg-[#1a203d] hover:bg-[#252c54] text-amber-300 hover:text-white rounded-xl text-[11px] font-bold transition-all border border-orange-500/20 hover:border-orange-500/40 flex items-center justify-center gap-1 cursor-pointer group"
                  >
                    <span>Platform Details & Contact</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: Premium Assessment Card, Sign Out & Footer */}
          <div className="space-y-3 relative z-10 pt-2 border-t border-slate-800/80">
            {/* Premium Assessment Card */}
            <div className="bg-gradient-to-br from-orange-500/20 via-amber-500/15 to-yellow-500/20 border border-orange-500/30 rounded-2xl p-4 shadow-lg backdrop-blur-md relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-orange-500/20 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-start justify-between gap-2 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 text-slate-950 font-black flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.4)] border border-amber-300/40">
                      {activePortalSection === 'student' ? (
                        <User className="w-5 h-5 text-slate-950" />
                      ) : activePortalSection === 'teacher' ? (
                        <GraduationCap className="w-5 h-5 text-slate-950" />
                      ) : (
                        <ShieldCheck className="w-5 h-5 text-slate-950" />
                      )}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#0f1223] rounded-full animate-pulse" />
                  </div>

                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-400 block">
                      {activePortalSection === 'student' ? 'Student Candidate' : activePortalSection === 'teacher' ? 'Faculty Proctor' : 'System Admin'}
                    </span>
                    <h4 className="text-xs font-bold text-white truncate max-w-[130px]">
                      {activePortalSection === 'student'
                        ? 'Active Candidate'
                        : activePortalSection === 'teacher'
                        ? (currentTeacher?.name || 'Faculty Member')
                        : 'Administrator'}
                    </h4>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-orange-500/20 border border-orange-400/30 text-amber-300 shadow-[0_0_15px_rgba(249,115,22,0.3)] animate-pulse shrink-0">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-orange-500/20 flex items-center justify-between text-[11px] relative z-10">
                <span className="text-amber-200/90 font-medium">
                  {activePortalSection === 'student'
                    ? 'Ready for Assessment?'
                    : activePortalSection === 'teacher'
                    ? 'Live Proctor Mode'
                    : 'System Governance'}
                </span>
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Active
                </span>
              </div>
            </div>

            {/* Sidebar Logout Action */}
            {(isAdminUnlocked || isTeacherAuthenticated) && (
              <button
                onClick={handleLogoutAll}
                className="w-full py-2.5 px-3 bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer border border-rose-500/40"
                title="Log out of all administrative/teacher consoles and clear credentials"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out & Lock Console</span>
              </button>
            )}

            {/* Lock Candidate Desk Action */}
            {activePortalSection === 'student' && isStudentUnlocked && (
              <button
                onClick={() => {
                  setIsStudentUnlocked(false);
                  sessionStorage.removeItem('joy_student_unlocked');
                }}
                className="w-full py-2.5 px-3 bg-amber-600/90 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer border border-amber-500/40"
                title="Lock the candidate examination desk"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Candidate Desk</span>
              </button>
            )}

            {/* Footer Text */}
            <div className="text-center pt-1 pb-1">
              <p className="text-[11px] font-medium text-slate-400 tracking-wide select-all">
                &copy; {new Date().getFullYear()} - The joy of the Lord is my strength. All rights reserved.
              </p>
            </div>
          </div>
        </aside>
      )}

      {/* Main Right Content Section */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto bg-[#F0F4F8]">
        {/* Top Bar Header */}
        {showLandingPage ? (
          <header className="bg-[#070f26] border-b border-slate-800/90 px-3 sm:px-6 lg:px-8 py-2.5 sticky top-0 z-30 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
              {/* Left: Brand Logo & Title */}
              <div 
                className="flex items-center gap-2.5 shrink-0 cursor-pointer select-none" 
                onClick={() => setShowLandingPage(true)}
              >
                <BrandLogo size="sm" variant="icon-only" className="w-9 h-9 shrink-0" />
                <div className="flex items-center gap-1.5 font-sans whitespace-nowrap">
                  <span className="text-[#f59e0b] font-black text-base sm:text-lg tracking-wide">MCQ</span>
                  <span className="text-white font-extrabold text-base sm:text-lg tracking-wider">ASSESSMENT HUB</span>
                  {isolatedPortal === 'student' && (
                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-md hidden md:inline tracking-wider">
                      STUDENT DESK
                    </span>
                  )}
                  {isolatedPortal === 'teacher' && (
                    <span className="text-[10px] font-bold text-indigo-300 bg-indigo-950/80 border border-indigo-500/40 px-2 py-0.5 rounded-md hidden md:inline tracking-wider">
                      FACULTY WORKSPACE
                    </span>
                  )}
                  {isolatedPortal === 'admin' && (
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded-md hidden md:inline tracking-wider">
                      ADMIN CONSOLE
                    </span>
                  )}
                  {isolatedPortal === 'teacher-student' && (
                    <span className="text-[10px] font-bold text-amber-300 bg-slate-900 border border-amber-500/40 px-2 py-0.5 rounded-md hidden md:inline tracking-wider">
                      CAMPUS PORTAL
                    </span>
                  )}
                </div>
              </div>

              {/* Center Navigation Links (Visible on desktop - Tailored to isolated domain) */}
              <nav className="hidden lg:flex items-center gap-6 text-sm">
                {/* Home */}
                <button
                  type="button"
                  onClick={() => setShowLandingPage(true)}
                  className="flex items-center gap-1.5 font-bold text-amber-400 border-b-2 border-amber-400 pb-0.5 pt-0.5 transition-colors cursor-pointer"
                >
                  <Home className="w-4 h-4 text-amber-400" />
                  <span>Home</span>
                </button>

                {/* DOMAIN SPECIFIC CENTER NAVS */}
                {isolatedPortal === 'student' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLandingPage(false);
                        handleNavigatePortal('student');
                      }}
                      className="flex items-center gap-1 text-slate-300 hover:text-white font-medium transition-colors cursor-pointer py-1"
                    >
                      <BookOpenCheck className="w-4 h-4 text-emerald-400" />
                      <span>Take Active Exam</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('faq-guides-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="flex items-center gap-1.5 text-slate-300 hover:text-white font-medium transition-colors cursor-pointer"
                    >
                      <HelpCircle className="w-4 h-4 text-slate-400" />
                      <span>Candidate Rules</span>
                    </button>
                  </>
                ) : isolatedPortal === 'teacher' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLandingPage(false);
                        handleNavigatePortal('teacher');
                        if (!isTeacherAuthenticated) setIsAuthModalOpen(true);
                      }}
                      className="flex items-center gap-1 text-slate-300 hover:text-white font-medium transition-colors cursor-pointer py-1"
                    >
                      <GraduationCap className="w-4 h-4 text-indigo-400" />
                      <span>Faculty Workspace</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isTeacherAuthenticated) {
                          setIsAuthModalOpen(true);
                          return;
                        }
                        setShowLandingPage(false);
                        handleNavigatePortal('teacher');
                        setIsImporterOpen(true);
                      }}
                      className="flex items-center gap-1 text-slate-300 hover:text-white font-medium transition-colors cursor-pointer py-1"
                    >
                      <UploadCloud className="w-4 h-4 text-indigo-400" />
                      <span>Import Word (.docx)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('faq-guides-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="flex items-center gap-1.5 text-slate-300 hover:text-white font-medium transition-colors cursor-pointer"
                    >
                      <HelpCircle className="w-4 h-4 text-slate-400" />
                      <span>Authoring Guide</span>
                    </button>
                  </>
                ) : isolatedPortal === 'admin' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLandingPage(false);
                        handleNavigatePortal('admin');
                      }}
                      className="flex items-center gap-1 text-slate-300 hover:text-white font-medium transition-colors cursor-pointer py-1"
                    >
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      <span>Master Governance</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('faq-guides-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="flex items-center gap-1.5 text-slate-300 hover:text-white font-medium transition-colors cursor-pointer"
                    >
                      <Shield className="w-4 h-4 text-slate-400" />
                      <span>Security Policies</span>
                    </button>
                  </>
                ) : (
                  /* COMBINED OR MAIN NAV */
                  <>
                    {/* Teacher Section Dropdown */}
                    <div className="relative group">
                      <button
                        type="button"
                        onClick={() => {
                          setShowLandingPage(false);
                          handleNavigatePortal('teacher');
                          if (!isTeacherAuthenticated) setIsAuthModalOpen(true);
                        }}
                        className="flex items-center gap-1 text-slate-300 hover:text-white font-medium transition-colors cursor-pointer py-1"
                      >
                        <GraduationCap className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
                        <span>Teacher Section</span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform group-hover:rotate-180" />
                      </button>
                      <div className="absolute left-0 top-full mt-1 w-56 bg-[#0c142b] border border-slate-700/80 rounded-xl p-1.5 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                        <button
                          type="button"
                          onClick={() => {
                            setShowLandingPage(false);
                            handleNavigatePortal('teacher');
                            if (!isTeacherAuthenticated) setIsAuthModalOpen(true);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:bg-amber-500/20 hover:text-amber-300 transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                          <span>Teacher Workspace & Proctor</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!isTeacherAuthenticated) {
                              setIsAuthModalOpen(true);
                              return;
                            }
                            setShowLandingPage(false);
                            handleNavigatePortal('teacher');
                            setIsImporterOpen(true);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:bg-amber-500/20 hover:text-amber-300 transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Import Word (.docx) Exam</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowLandingPage(false);
                            handleNavigatePortal('teacher');
                            setActiveTeacherTab('surveillance');
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:bg-amber-500/20 hover:text-amber-300 transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <Activity className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Live Student Surveillance</span>
                        </button>
                      </div>
                    </div>

                    {/* Student Section Dropdown */}
                    <div className="relative group">
                      <button
                        type="button"
                        onClick={() => {
                          setShowLandingPage(false);
                          handleNavigatePortal('student');
                        }}
                        className="flex items-center gap-1 text-slate-300 hover:text-white font-medium transition-colors cursor-pointer py-1"
                      >
                        <Users className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
                        <span>Student Section</span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform group-hover:rotate-180" />
                      </button>
                      <div className="absolute left-0 top-full mt-1 w-52 bg-[#0c142b] border border-slate-700/80 rounded-xl p-1.5 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                        <button
                          type="button"
                          onClick={() => {
                            setShowLandingPage(false);
                            handleNavigatePortal('student');
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:bg-amber-500/20 hover:text-amber-300 transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <BookOpenCheck className="w-3.5 h-3.5 text-amber-400" />
                          <span>Take Active Assessment</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById('quiz-catalog-section');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:bg-amber-500/20 hover:text-amber-300 transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <ClipboardList className="w-3.5 h-3.5 text-blue-400" />
                          <span>Browse All Examinations</span>
                        </button>
                      </div>
                    </div>

                    {/* Guides */}
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('faq-guides-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="flex items-center gap-1.5 text-slate-300 hover:text-white font-medium transition-colors cursor-pointer"
                    >
                      <HelpCircle className="w-4 h-4 text-slate-400" />
                      <span>Guides</span>
                    </button>
                  </>
                )}

                {/* About Architect */}
                <button
                  type="button"
                  onClick={() => handleOpenAbout('about')}
                  className="flex items-center gap-1.5 text-slate-300 hover:text-white font-medium transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-slate-400" />
                  <span>About</span>
                </button>
              </nav>

              {/* Right Controls */}
              <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                {/* Status Indicator Dot - Hidden on small mobile */}
                <div className="hidden sm:flex w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white items-center justify-center shadow-xs shrink-0" title="Online System Status">
                  <div className={`w-3.5 h-3.5 rounded-full ${
                    isolatedPortal === 'student' ? 'bg-emerald-500' : isolatedPortal === 'teacher' ? 'bg-indigo-500' : 'bg-[#f59e0b]'
                  }`} />
                </div>

                {/* Synced Badge - Hidden on small mobile */}
                <div className="hidden sm:flex bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0] px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold items-center gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="hidden md:inline">Synced</span>
                </div>

                {/* Sync Now Button - Desktop & Tablet */}
                <button
                  type="button"
                  onClick={handleTriggerBidirectionalSync}
                  title="Force Cloud & Server Sync"
                  className="hidden md:flex bg-[#3f2108] hover:bg-[#542d0c] text-[#f59e0b] border border-[#f59e0b]/40 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer shrink-0 min-h-[34px]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 shrink-0 text-[#f59e0b] ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                  <span className="hidden md:inline">Sync Now</span>
                </button>

                {/* DOMAIN SPECIFIC ACTION BUTTONS & LOGIN */}
                {isolatedPortal === 'student' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowLandingPage(false);
                      handleNavigatePortal('student');
                    }}
                    className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold px-2.5 sm:px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer shrink-0 min-h-[34px]"
                  >
                    <BookOpenCheck className="w-3.5 h-3.5 shrink-0 text-slate-950" />
                    <span className="hidden sm:inline">Enter Exam Desk</span>
                    <span className="sm:hidden">Exam Desk</span>
                  </button>
                ) : isolatedPortal === 'teacher' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowLandingPage(false);
                      handleNavigatePortal('teacher');
                      if (!isTeacherAuthenticated) setIsAuthModalOpen(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold px-2.5 sm:px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer shrink-0 min-h-[34px]"
                  >
                    <GraduationCap className="w-3.5 h-3.5 shrink-0 text-white" />
                    <span className="hidden sm:inline">Faculty Workspace</span>
                    <span className="sm:hidden">Faculty</span>
                  </button>
                ) : isolatedPortal === 'admin' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowLandingPage(false);
                      handleNavigatePortal('admin');
                    }}
                    className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold px-2.5 sm:px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer shrink-0 min-h-[34px]"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-slate-950" />
                    <span className="hidden sm:inline">Admin Console</span>
                    <span className="sm:hidden">Admin</span>
                  </button>
                ) : (
                  <>
                    {/* Login Button - Kept separate on mobile so it does not crowd primary navigation */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!isTeacherAuthenticated) setIsAuthModalOpen(true);
                        else {
                          setShowLandingPage(false);
                          handleNavigatePortal('teacher');
                        }
                      }}
                      className="bg-[#131b2e] hover:bg-[#1a2540] text-white border border-slate-700 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer shrink-0 min-h-[34px]"
                      title="Faculty and Teacher Login"
                    >
                      <User className="w-3.5 h-3.5 shrink-0 text-slate-300" />
                      <span>Login</span>
                    </button>

                    {/* Get Started Button - Visible on tablet/desktop, available in drawer on mobile */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsGetStartedModalOpen(true);
                      }}
                      className="hidden sm:flex bg-[#ff9500] hover:bg-[#e68500] active:scale-95 text-slate-950 font-bold px-2.5 sm:px-4 py-1.5 rounded-lg text-xs items-center gap-1 sm:gap-1.5 shadow-md transition-all cursor-pointer shrink-0 min-h-[34px]"
                      title="Get Started Free - Choose Teacher Login or Student Passcode Entry"
                    >
                      <GraduationCap className="w-3.5 h-3.5 shrink-0 text-slate-950" />
                      <span className="hidden xs:inline sm:inline">Get Started Free</span>
                      <span className="xs:hidden sm:hidden">Start Free</span>
                    </button>
                  </>
                )}

                {/* Mobile Navigation Drawer Toggle - Compresses the menu into a clean drawer */}
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="lg:hidden p-1.5 sm:p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700 transition-colors flex items-center justify-center cursor-pointer min-h-[34px] min-w-[34px] shadow-sm shrink-0"
                  title="Open Navigation Menu"
                  aria-label="Open Navigation Menu"
                >
                  <Menu className="w-4.5 h-4.5 text-amber-400 shrink-0" />
                </button>
              </div>
            </div>
          </header>
        ) : !isTimerRunning ? (
        <header className="bg-white border-b border-slate-200 px-2.5 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-1.5 sm:gap-4 sticky top-0 z-30 shadow-xs">
          {/* Mobile Menu Trigger & Active Portal Section Badges */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            {/* Hamburger Button for Mobile screens */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-1.5 sm:p-2 rounded-xl bg-slate-900 text-amber-400 hover:bg-slate-800 transition-colors shrink-0 cursor-pointer shadow-xs min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-4 h-4 shrink-0" />
            </button>

            {!isolatedPortal ? (
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={handleGoBack}
                  className="px-2 sm:px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold text-xs transition-all flex items-center gap-1 shadow-sm cursor-pointer border border-amber-500/30 shrink-0 min-h-[36px]"
                  title="Go back to previous section or view"
                >
                  <ArrowLeft className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span className="hidden sm:inline">Back</span>
                </button>

                {/* Role Toggle Pills with Touch-Friendly Heights */}
                <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200 shrink-0">
                  <button
                    onClick={() => handleNavigatePortal('student')}
                    className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer min-h-[34px] ${
                      activePortalSection === 'student'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">Student</span>
                  </button>

                  <button
                    onClick={() => {
                      handleNavigatePortal('teacher');
                      if (!isTeacherAuthenticated) setIsAuthModalOpen(true);
                    }}
                    className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer min-h-[34px] ${
                      activePortalSection === 'teacher'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">Teacher</span>
                  </button>

                  <button
                    onClick={() => handleNavigatePortal('admin')}
                    className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer min-h-[34px] ${
                      activePortalSection === 'admin'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">Admin</span>
                  </button>
                </div>
              </div>
            ) : isolatedPortal === 'teacher-student' ? (
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={handleGoBack}
                  className="px-2 sm:px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold text-xs transition-all flex items-center gap-1 shadow-sm cursor-pointer border border-amber-500/30 shrink-0 min-h-[36px]"
                  title="Go back to previous section or view"
                >
                  <ArrowLeft className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span className="hidden sm:inline">Back</span>
                </button>

                <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200 shrink-0">
                  <button
                    onClick={() => handleNavigatePortal('student')}
                    className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer min-h-[34px] ${
                      activePortalSection === 'student'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">Student</span>
                  </button>

                  <button
                    onClick={() => {
                      handleNavigatePortal('teacher');
                      if (!isTeacherAuthenticated) setIsAuthModalOpen(true);
                    }}
                    className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer min-h-[34px] ${
                      activePortalSection === 'teacher'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">Teacher</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                {portalHistory.length > 0 && portalHistory[portalHistory.length - 1].section === isolatedPortal && (
                  <button
                    onClick={handleGoBack}
                    className="px-2 sm:px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold text-xs transition-all flex items-center gap-1 shadow-sm cursor-pointer border border-amber-500/30 shrink-0 min-h-[36px]"
                    title="Go back to previous view"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    <span className="hidden sm:inline">Back</span>
                  </button>
                )}
                <div className={`px-2 sm:px-3 py-1.5 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 truncate max-w-[150px] sm:max-w-none ${
                  isolatedPortal === 'teacher'
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-800'
                    : isolatedPortal === 'student'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-900'
                }`}>
                  {isolatedPortal === 'admin' && <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />}
                  {isolatedPortal === 'teacher' && <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />}
                  {isolatedPortal === 'student' && <BookOpenCheck className="w-4 h-4 text-emerald-600 shrink-0" />}
                  <span className="truncate">
                    {isolatedPortal === 'admin' && (
                      <>
                        <span className="hidden sm:inline">Administrator Portal • Master Console</span>
                        <span className="sm:hidden">Admin Portal</span>
                      </>
                    )}
                    {isolatedPortal === 'teacher' && (
                      <>
                        <span className="hidden sm:inline">Teacher Portal • Strict Faculty Domain</span>
                        <span className="sm:hidden">Faculty Portal</span>
                      </>
                    )}
                    {isolatedPortal === 'student' && (
                      <>
                        <span className="hidden sm:inline">Student Portal • Strict Candidate Sandbox</span>
                        <span className="sm:hidden">Student Portal</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right Top Bar Controls */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Cloud & Server Sync Indicator & Trigger */}
            <button
              onClick={handleTriggerBidirectionalSync}
              title={`Click to force sync across Firestore & Server. Last synced: ${lastSyncTime || 'Just now'}`}
              className="flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-700 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold border border-slate-300 transition-all cursor-pointer shadow-xs min-h-[36px] shrink-0"
            >
              {syncStatus === 'syncing' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 shrink-0 text-amber-600 animate-spin" />
                  <span className="text-amber-700 font-semibold hidden md:inline">Syncing...</span>
                </>
              ) : syncStatus === 'offline' ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                  <span className="text-amber-800 font-medium hidden sm:inline">Offline</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 shrink-0 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-slate-800 hidden md:inline">Synced</span>
                  <RefreshCw className="w-3 h-3 shrink-0 text-slate-400 hover:text-slate-700" />
                </>
              )}
            </button>

            {!showLandingPage && (
              <button
                onClick={() => setShowLandingPage(true)}
                className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-all flex items-center gap-1 sm:gap-1.5 border border-slate-300 shadow-xs cursor-pointer min-h-[36px] shrink-0"
                title="Return to Platform Overview / Home"
              >
                <Globe className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                <span className="hidden md:inline">Overview</span>
              </button>
            )}

            <button
              onClick={() => handleOpenAbout('about')}
              className="hidden sm:flex bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-all items-center gap-1 sm:gap-1.5 border border-slate-300 shadow-xs cursor-pointer min-h-[36px] shrink-0"
              title="About the Platform & Academic Purpose"
            >
              <Info className="w-3.5 h-3.5 shrink-0 text-indigo-600" />
              <span className="hidden md:inline">About</span>
            </button>

            {/* Profile Pill & Quick Logout */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-2 bg-slate-100 border border-slate-200 pl-1.5 pr-3 py-1 rounded-full shrink-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-900 text-amber-400 font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                  {activePortalSection === 'student' ? 'S' : activePortalSection === 'teacher' ? 'T' : 'M'}
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-900 block leading-tight truncate max-w-[90px]">
                    {activePortalSection === 'student' ? 'Student' : activePortalSection === 'teacher' ? (currentTeacher?.name || 'Teacher') : 'Admin'}
                  </span>
                </div>
              </div>

              {/* Immediate Logout Action Button */}
              {activePortalSection === 'admin' && isAdminUnlocked && (
                <button
                  onClick={handleLogoutAdmin}
                  className="px-2 sm:px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer min-h-[36px] shrink-0"
                  title="Log out of Admin Portal"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Log Out</span>
                </button>
              )}

              {activePortalSection === 'teacher' && isTeacherAuthenticated && (
                <button
                  onClick={handleLogoutTeacher}
                  className="px-2 sm:px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer min-h-[36px] shrink-0"
                  title="Log out of Teacher Console"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Log Out</span>
                </button>
              )}
            </div>
          </div>
        </header>
        ) : null}

        {/* Main View Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-slate-100/80">
          {/* Security & Inactivity Notice Toast */}
          {logoutNotice && (
            <div className="mb-6 bg-slate-900 text-white border-l-4 border-amber-500 p-4 rounded-xl shadow-lg flex items-center justify-between gap-3 animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">Security Notice</p>
                  <p className="text-xs text-slate-200 mt-0.5">{logoutNotice}</p>
                </div>
              </div>
              <button
                onClick={() => setLogoutNotice(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
                title="Dismiss notice"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Active Portal Lockdown Screen (When active portal or Master Lockdown is engaged and not authenticated as Admin) */}
          {!isAdminUnlocked &&
            (systemSettings?.isMasterPortalLocked ||
              (isolatedPortal && systemSettings?.lockedUrls?.[isolatedPortal as keyof typeof systemSettings.lockedUrls]) ||
              (!isolatedPortal && systemSettings?.lockedUrls?.[activePortalSection as keyof typeof systemSettings.lockedUrls])) ? (
            showAdminAuthOnLock ? (
              <div className="max-w-xl mx-auto my-12">
                <AdminMultiLayerVerification
                  securitySettings={systemSettings.adminSecurity || DEFAULT_ADMIN_SECURITY_SETTINGS}
                  teacherAccessCodes={teacherAccessCodes}
                  onUnlockSuccess={() => {
                    setIsAdminUnlocked(true);
                    setShowAdminAuthOnLock(false);
                    setAdminAuthError(null);
                    setLastActivityTime(Date.now());
                    if (typeof window !== 'undefined') {
                      sessionStorage.setItem('joy_admin_unlocked', 'true');
                    }
                  }}
                  onCancel={() => {
                    setShowAdminAuthOnLock(false);
                  }}
                />
              </div>
            ) : (
            <div className="max-w-xl mx-auto my-12">
              {(() => {
                const currentScope = (isolatedPortal || activePortalSection || 'student') as 'teacher-student' | 'student' | 'teacher' | 'admin';
                const lockTitle = systemSettings?.isMasterPortalLocked
                  ? 'Master Portal Lockdown Engaged'
                  : 'This Dedicated Access URL is Temporarily Closed';
                const lockMsg = systemSettings?.isMasterPortalLocked
                  ? (systemSettings?.masterLockMessage || 'Access to this assessment portal is currently suspended for administrative moderation or maintenance.')
                  : ((systemSettings?.urlLockMessages && (systemSettings.urlLockMessages as any)[currentScope]) ||
                     systemSettings?.masterLockMessage ||
                     'Access to this assessment portal is currently suspended for administrative moderation or maintenance.');

                return (
                  <div className="bg-slate-900 border-2 border-rose-500/60 rounded-3xl p-8 shadow-2xl space-y-6 text-center text-white">
                    <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-inner animate-pulse">
                      <Lock className="w-8 h-8" />
                    </div>

                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-extrabold uppercase tracking-wider">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Portal Access Locked by Administrator</span>
                      </div>
                      <h2 className="text-2xl font-bold font-serif text-white tracking-wide">
                        {lockTitle}
                      </h2>
                      <p className="text-sm text-slate-300 leading-relaxed max-w-md mx-auto pt-1">
                        {lockMsg}
                      </p>
                    </div>

                    <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-left space-y-2 text-xs text-slate-400">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="font-medium">Portal / Scope:</span>
                        <span className="font-bold text-amber-400 capitalize">
                          {currentScope} Portal
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="font-medium">Institution:</span>
                        <span className="font-bold text-slate-200">
                          {systemSettings?.schoolName || 'The Joy Of The Lord Assessment Network'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="font-medium">Lockout Status:</span>
                        <span className="font-bold text-rose-400">Active Lockdown</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="font-medium">Support / Contact:</span>
                        <span className="font-bold text-slate-200">
                          {systemSettings?.adminContactEmail || 'twumbismark90@gmail.com'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-left space-y-2 text-xs text-slate-300">
                      <div className="flex items-center gap-2 text-amber-400 font-bold">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Notice: Please Consult Your Administrator</span>
                      </div>
                      <p className="text-[12px] text-slate-400 leading-relaxed">
                        This portal has been locked by the system administrator. If you require access or have questions, please contact your administrator directly at <span className="text-amber-300 font-semibold">{systemSettings?.adminContactEmail || 'twumbismark90@gmail.com'}</span>.
                      </p>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        onClick={handleTriggerBidirectionalSync}
                        className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer inline-flex items-center justify-center gap-2 shadow-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Check Reopen Status</span>
                      </button>
                      <button
                        onClick={() => setShowAdminAuthOnLock(true)}
                        className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-2 shadow-md"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Administrator Master Unlock</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
            )
          ) : showLandingPage ? (
            /* Platform Landing & Trust Ecosystem Overview (Default Homepage / Overview) */
            <div className="mb-8">
              <LandingPageTrustSection
                portalMode={isolatedPortal || 'main'}
                totalQuizzesCount={quizzes.length}
                quizzes={quizzes}
                adminProfile={adminProfile}
                teacherAccessCodes={teacherAccessCodes}
                submissions={submissions}
                isTeacherAuthenticated={isTeacherAuthenticated}
                onRequestTeacherAuth={() => setIsAuthModalOpen(true)}
                onOpenGetStarted={() => setIsGetStartedModalOpen(true)}
                onProceedToStudent={(quizCode?: string) => {
                  setShowLandingPage(false);
                  handleNavigatePortal('student');
                  if (quizCode && quizCode.trim()) {
                    const clean = quizCode.trim().toUpperCase();
                    const matched = quizzes.find(
                      (q) => (q.code && q.code.toUpperCase() === clean) || (q.id && q.id.toUpperCase() === clean)
                    );
                    if (matched) {
                      setConfig(matched);
                    }
                  }
                }}
                onProceedToTeacher={() => {
                  setShowLandingPage(false);
                  handleNavigatePortal('teacher');
                  if (!isTeacherAuthenticated) setIsAuthModalOpen(true);
                }}
                onProceedToAdmin={() => {
                  setShowLandingPage(false);
                  handleNavigatePortal('admin');
                }}
                onNavigateToTeacher={() => {
                  setShowLandingPage(false);
                  handleNavigatePortal('teacher');
                  if (!isTeacherAuthenticated) setIsAuthModalOpen(true);
                }}
                onOpenImporter={() => {
                  if (!isTeacherAuthenticated) {
                    setIsAuthModalOpen(true);
                  } else {
                    setShowLandingPage(false);
                    handleNavigatePortal('teacher');
                    setIsImporterOpen(true);
                  }
                }}
                onScrollToAssessments={() => {
                  setShowLandingPage(false);
                  handleNavigatePortal('student');
                }}
                onOpenAbout={handleOpenAbout}
              />
            </div>
          ) : (
            <>
              {/* Admin Section View */}
              {!showLandingPage && activePortalSection === 'admin' && (
            <>
              {!isAdminUnlocked ? (
                /* Multi-Layer Admin Security Verification (Layer 1: Email/Password, Layer 2: 3-Tap Key in 2s, Layer 3: Sacred Passphrase) */
                <AdminMultiLayerVerification
                  securitySettings={systemSettings.adminSecurity || DEFAULT_ADMIN_SECURITY_SETTINGS}
                  teacherAccessCodes={teacherAccessCodes}
                  onUnlockSuccess={() => {
                    setIsAdminUnlocked(true);
                    setAdminAuthError(null);
                    setLastActivityTime(Date.now());
                    if (typeof window !== 'undefined') {
                      sessionStorage.setItem('joy_admin_unlocked', 'true');
                    }
                  }}
                  onCancel={() => {
                    setActivePortalSection('student');
                  }}
                />
              ) : (
                <AdminDashboard
                  activeAdminTab={activeAdminTab}
                  setActiveAdminTab={setActiveAdminTab}
                  teacherAccessCodes={teacherAccessCodes}
                  onAddTeacherCode={handleAddTeacherCode}
                  onRevokeTeacherCode={handleRevokeTeacherCode}
                  onRegenerateTeacherCode={handleRegenerateTeacherCode}
                  onDeleteTeacherCode={handleDeleteTeacherCode}
                  onUpdateTeacherCode={handleUpdateTeacherCode}
                  systemSettings={systemSettings}
                  onUpdateSystemSettings={handleUpdateSystemSettings}
                  quizzes={quizzes}
                  onUpdateQuizStatus={handleUpdateQuizStatus}
                  onToggleTabPenalty={handleToggleQuizTabPenalty}
                  onToggleAttemptLimit={handleToggleQuizAttemptLimit}
                  onToggleFullscreenLockdown={handleToggleQuizFullscreenLockdown}
                  onDeleteQuiz={handleDeleteQuiz}
                  submissions={submissions}
                  onBackToTeacher={() => setActivePortalSection('teacher')}
                  questions={questions}
                  onOpenEmailFeedback={(sub) => setSelectedSubmissionForEmail(sub)}
                  onOpenImporter={() => setIsImporterOpen(true)}
                  onCreateQuiz={() => setIsQuizCreatorOpen(true)}
                  onDeleteSubmission={handleDeleteSubmission}
                  onClearAllSubmissions={handleClearAllSubmissions}
                  onSaveInstructions={handleSaveQuizInstructions}
                  onSyncWithServer={handleTriggerBidirectionalSync}
                  onLogoutAdmin={handleLogoutAdmin}
                  adminProfile={adminProfile}
                  onSaveAdminProfile={handleSaveAdminProfile}
                />
              )}
            </>
          )}

          {/* Teacher Section View */}
          {!showLandingPage && activePortalSection === 'teacher' && (
            <div className="space-y-6">
              {!isTeacherAuthenticated ? (
                <div className="max-w-md mx-auto my-12 bg-white border border-slate-200 rounded-3xl p-8 shadow-xl text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
                    <Lock className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold font-serif text-slate-900">Faculty Authentication Required</h2>
                    <p className="text-xs text-slate-600 mt-1">
                      Enter verified teacher PIN to access student monitoring, question editor, and release settings.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>Enter Faculty PIN</span>
                  </button>
                </div>
              ) : (
                <>
                  {activeTeacherTab === 'analytics' && (
                    <div className="space-y-6">
                      <ErrorBoundary fallbackTitle="Teacher Dashboard Display Error">
                        <TeacherDashboard
                          submissions={submissions}
                          questions={questions}
                          quizzes={quizzes}
                          teacherName={currentTeacher?.name || 'Faculty Member'}
                          teacherEmail={currentTeacher?.email}
                          teacherDepartment={currentTeacher?.department || 'Mathematics'}
                          isRevoked={teacherAccessCodes.some((tc) => tc.status === 'revoked' && (tc.teacherEmail || '').toLowerCase() === (currentTeacher?.email || '').toLowerCase())}
                          onOpenEmailFeedback={(sub) => setSelectedSubmissionForEmail(sub)}
                          onOpenImporter={() => setIsImporterOpen(true)}
                          onCreateQuiz={() => {
                            setEditingQuiz(null);
                            setIsQuizCreatorOpen(true);
                          }}
                          onEditQuiz={handleOpenEditQuiz}
                          onSavePoolQuiz={(poolQuiz) => {
                            const exists = quizzes.some((q) => q.id === poolQuiz.id || q.code === poolQuiz.code);
                            if (exists) {
                              handleUpdateExistingQuiz(poolQuiz);
                            } else {
                              handleCreateNewQuiz(poolQuiz);
                            }
                          }}
                          recentQuizNotification={recentQuizNotification}
                          onDismissRecentNotification={() => setRecentQuizNotification(null)}
                          onDeleteSubmission={handleDeleteSubmission}
                          onUnlockStudentAttempt={handleUnlockStudentAttempt}
                          onClearAllSubmissions={handleClearAllSubmissions}
                          onCleanDuplicates={handleCleanDuplicates}
                          onUpdateQuizStatus={handleUpdateQuizStatus}
                          onToggleTabPenalty={handleToggleQuizTabPenalty}
                          onToggleAttemptLimit={handleToggleQuizAttemptLimit}
                          onToggleSecurityShield={handleToggleQuizSecurityShield}
                          onToggleOptionShuffling={handleToggleOptionShuffling}
                          onToggleFullscreenLockdown={handleToggleQuizFullscreenLockdown}
                          onDeleteQuiz={handleDeleteQuiz}
                          onOpenQuestionBank={() => setActiveTeacherTab('question-bank')}
                          onSelectQuizToMonitor={(quizId) => {
                            setSelectedQuizToMonitorId(quizId || 'all');
                            setActiveTeacherTab('surveillance');
                          }}
                          onPreviewQuiz={(quiz) => {
                            setConfig(quiz);
                            if (quiz.questions && quiz.questions.length > 0) {
                              setQuestions(quiz.questions);
                            }
                            if (quiz.sections && quiz.sections.length > 0) {
                              setSections(quiz.sections);
                            }
                            if (quiz.durationMinutes) {
                              setTimeRemainingSeconds(quiz.durationMinutes * 60);
                            }
                            setIsImporterOpen(false);
                            setShowLandingPage(false);
                            setActivePortalSection('student');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          onSaveInstructions={handleSaveQuizInstructions}
                          onSaveRoster={handleSaveQuizRoster}
                          onLogoutTeacher={handleLogoutTeacher}
                          systemSettings={systemSettings}
                          onUpdateSystemSettings={handleUpdateSystemSettings}
                        />
                      </ErrorBoundary>
                      <QuizListManager
                        quizzes={quizzes.filter((q) => {
                          if (!currentTeacher?.email) return false;
                          const authEmail = currentTeacher.email.toLowerCase().trim();
                          const authName = (currentTeacher.name || '').toLowerCase().trim();
                          const quizEmail = (q.teacherEmail || '').toLowerCase().trim();
                          const quizName = (q.teacherName || '').toLowerCase().trim();
                          const teacherId = (q.teacherId || '').toLowerCase().trim();
                          if (quizEmail && quizEmail === authEmail) return true;
                          if (teacherId && teacherId === authEmail) return true;
                          if (quizName && authName && (quizName === authName || quizName.includes(authName) || authName.includes(quizName))) return true;
                          return false;
                        })}
                        activeQuizId={activeQuizId}
                        onSelectActiveQuiz={(id) => {
                          setActiveQuizId(id);
                          const selected = quizzes.find((q) => q.id === id);
                          if (selected) setConfig(selected);
                        }}
                        onCreateNewQuizClick={() => {
                          setEditingQuiz(null);
                          setIsQuizCreatorOpen(true);
                        }}
                        onOpenImporterClick={() => setIsImporterOpen(true)}
                        onPreviewQuiz={(quiz) => {
                          setConfig(quiz);
                          if (quiz.questions && quiz.questions.length > 0) {
                            setQuestions(quiz.questions);
                          }
                          if (quiz.sections && quiz.sections.length > 0) {
                            setSections(quiz.sections);
                          }
                          if (quiz.durationMinutes) {
                            setTimeRemainingSeconds(quiz.durationMinutes * 60);
                          }
                          setIsImporterOpen(false);
                          setShowLandingPage(false);
                          setActivePortalSection('student');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        onEditQuiz={handleOpenEditQuiz}
                        onUpdateQuizStatus={handleUpdateQuizStatus}
                        onToggleTabPenalty={handleToggleQuizTabPenalty}
                        onToggleAttemptLimit={handleToggleQuizAttemptLimit}
                        onToggleSecurityShield={handleToggleQuizSecurityShield}
                        onToggleOptionShuffling={handleToggleOptionShuffling}
                        onToggleFullscreenLockdown={handleToggleQuizFullscreenLockdown}
                        onDeleteQuiz={handleDeleteQuiz}
                        onSelectQuizToMonitor={(quizId) => {
                          setSelectedQuizToMonitorId(quizId || 'all');
                          setActiveTeacherTab('surveillance');
                        }}
                      />
                    </div>
                  )}

                  {activeTeacherTab === 'surveillance' && (
                    <LiveStudentMonitoringView
                      quizzes={quizzes.filter((q) => {
                        if (!currentTeacher?.email) return false;
                        const authEmail = currentTeacher.email.toLowerCase().trim();
                        const authName = (currentTeacher.name || '').toLowerCase().trim();
                        const quizEmail = (q.teacherEmail || '').toLowerCase().trim();
                        const quizName = (q.teacherName || '').toLowerCase().trim();
                        const teacherId = (q.teacherId || '').toLowerCase().trim();
                        if (quizEmail && quizEmail === authEmail) return true;
                        if (teacherId && teacherId === authEmail) return true;
                        if (quizName && authName && (quizName === authName || quizName.includes(authName) || authName.includes(quizName))) return true;
                        return false;
                      })}
                      submissions={submissions.filter((sub) => {
                        if (!currentTeacher?.email) return false;
                        const myQuizzes = quizzes.filter((q) => {
                          const authEmail = currentTeacher.email.toLowerCase().trim();
                          const authName = (currentTeacher.name || '').toLowerCase().trim();
                          const quizEmail = (q.teacherEmail || '').toLowerCase().trim();
                          const quizName = (q.teacherName || '').toLowerCase().trim();
                          const teacherId = (q.teacherId || '').toLowerCase().trim();
                          if (quizEmail && quizEmail === authEmail) return true;
                          if (teacherId && teacherId === authEmail) return true;
                          if (quizName && authName && (quizName === authName || quizName.includes(authName) || authName.includes(quizName))) return true;
                          return false;
                        });
                        if (myQuizzes.length === 0) return false;
                        const keySet = new Set(myQuizzes.flatMap((q) => [q.id?.toLowerCase(), q.code?.toLowerCase(), q.title?.toLowerCase()].filter(Boolean)));
                        return keySet.has((sub.quizId || '').toLowerCase()) || keySet.has(((sub as any).quizCode || '').toLowerCase()) || keySet.has((sub.quizTitle || '').toLowerCase());
                      })}
                      initialQuizId={selectedQuizToMonitorId}
                      onBackToOverview={() => setActiveTeacherTab('analytics')}
                      onOpenEmailFeedback={(sub) => setSelectedSubmissionForEmail(sub)}
                      onDeleteSubmission={handleDeleteSubmission}
                      onSyncWithServer={handleTriggerBidirectionalSync}
                    />
                  )}

                  {activeTeacherTab === 'release-manager' && (
                    <SectionReleaseManager
                      sections={sections}
                      onUpdateSections={handleUpdateSections}
                    />
                  )}

                  {activeTeacherTab === 'submissions-export' && (
                    <GoogleSheetsExportModal
                      submissions={submissions}
                      googleSheetsWebhookUrl={config.googleSheetsWebhookUrl}
                      onUpdateWebhookUrl={(url) => setConfig((prev) => ({ ...prev, googleSheetsWebhookUrl: url }))}
                    />
                  )}

                  {activeTeacherTab === 'question-bank' && (
                    <QuestionBankEditor
                      questions={questions}
                      onUpdateQuestion={handleUpdateQuestion}
                      onDeleteQuestion={handleDeleteQuestion}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {/* Student Section View - Locked by default with 'bisjoy25' */}
          {!showLandingPage && activePortalSection === 'student' && (
            !isStudentUnlocked ? (
              <StudentAccessLockScreen
                onUnlockSuccess={() => {
                  setIsStudentUnlocked(true);
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem('joy_student_unlocked', 'true');
                  }
                }}
                onNavigateToTeacher={() => handleNavigatePortal('teacher')}
                onNavigateToAdmin={() => handleNavigatePortal('admin')}
              />
            ) : (
              <FormAssessmentView
                questions={questions}
                sections={sections}
                config={config}
                quizzes={quizzes}
                submissions={submissions}
                onNavigateToTeacher={() => handleNavigatePortal('teacher')}
                onOpenAbout={(tab) => handleOpenAbout(tab || 'about')}
                onSubmitAssessment={handleSubmitAssessment}
                timeRemainingSeconds={timeRemainingSeconds}
                setTimeRemainingSeconds={setTimeRemainingSeconds}
                isTimerRunning={isTimerRunning}
                setIsTimerRunning={setIsTimerRunning}
              />
            )
          )}
        </>
      )}
        </main>

        {/* Professional Academic Footer */}
        <FooterCredits 
          onOpenAbout={handleOpenAbout} 
        />
      </div>

      {/* Document Importer Modal Overlay - Protected behind Teacher Authentication */}
      {isImporterOpen && (
        isTeacherAuthenticated || isAdminUnlocked ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-5xl my-8">
              <DocumentQuestionImporter
                onImportQuestions={handleImportedQuestions}
                onClose={() => setIsImporterOpen(false)}
              />
            </div>
          </div>
        ) : (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-md my-8 bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-serif text-slate-900">Faculty Authentication Required</h2>
                <p className="text-xs text-slate-600 mt-1">
                  Document question import is strictly restricted to verified faculty members. Please enter your teacher PIN to proceed.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsImporterOpen(false);
                    setIsAuthModalOpen(true);
                  }}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Log In as Teacher
                </button>
                <button
                  type="button"
                  onClick={() => setIsImporterOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      )}

      {/* Quiz Creator Modal Overlay */}
      <QuizCreatorModal
        isOpen={isQuizCreatorOpen}
        onClose={() => {
          setIsQuizCreatorOpen(false);
          setEditingQuiz(null);
        }}
        quizToEdit={editingQuiz}
        onUpdateQuiz={handleUpdateExistingQuiz}
        onCreateQuiz={handleCreateNewQuiz}
        onRunQuiz={(quiz) => {
          setConfig(quiz);
          if (quiz.questions && quiz.questions.length > 0) {
            setQuestions(quiz.questions);
          }
          setIsQuizCreatorOpen(false);
          setEditingQuiz(null);
          setActivePortalSection('student');
        }}
        onOpenSurveillance={(quizId) => {
          setSelectedQuizToMonitorId(quizId);
          setIsQuizCreatorOpen(false);
          setEditingQuiz(null);
          setActivePortalSection('teacher');
          setActiveTeacherTab('surveillance');
        }}
        extractedQuestionsCount={lastExtractedCount}
        importedQuestions={lastImportedQuestions}
        onReloadExam={handleReloadExam}
        onDiscardLoadedExam={handleDiscardLoadedExam}
        loadedFileName={loadedExamFileName}
        teacherEmail={currentTeacher?.email}
        teacherName={currentTeacher?.name}
        teacherDepartment={currentTeacher?.department}
      />

      {/* Get Started Choice Modal (Teacher Login vs Student Passcode Entry) */}
      <GetStartedModal
        isOpen={isGetStartedModalOpen}
        onClose={() => setIsGetStartedModalOpen(false)}
        isTeacherAuthenticated={isTeacherAuthenticated}
        teacherName={currentTeacher?.name}
        quizzes={quizzes}
        onSelectTeacher={() => {
          setShowLandingPage(false);
          handleNavigatePortal('teacher');
          if (!isTeacherAuthenticated) {
            setIsAuthModalOpen(true);
          }
        }}
        onSelectStudent={(codeOrPasscode?: string) => {
          setShowLandingPage(false);
          handleNavigatePortal('student');
          if (codeOrPasscode && codeOrPasscode.trim()) {
            const clean = codeOrPasscode.trim().toUpperCase();
            const matched = quizzes.find(
              (q) => (q.code && q.code.toUpperCase() === clean) || (q.id && q.id.toUpperCase() === clean)
            );
            if (matched) {
              setConfig(matched);
            }
          }
        }}
      />

      {/* Teacher Authentication Modal */}
      <TeacherAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(teacher) => {
          setCurrentTeacher(teacher);
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('joy_current_teacher', JSON.stringify(teacher));
            sessionStorage.setItem('joy_teacher_authenticated', 'true');
          }
          setIsTeacherAuthenticated(true);
          setIsAuthModalOpen(false);
          setActivePortalSection('teacher');
          setActiveTeacherTab('analytics');
        }}
        teacherAccessCodes={teacherAccessCodes}
        isSelfRegistrationLocked={systemSettings.isTeacherSelfRegistrationLocked}
        adminContactEmail={systemSettings.adminContactEmail || 'twumbismark90@gmail.com'}
        onRegisterTeacher={handleRegisterTeacher}
      />

      {/* Email Feedback Modal */}
      {selectedSubmissionForEmail && (
        <EmailFeedbackModal
          submission={selectedSubmissionForEmail}
          questions={questions}
          onClose={() => setSelectedSubmissionForEmail(null)}
          onFeedbackSentSuccess={handleFeedbackSentSuccess}
        />
      )}

      {/* Academic & Platform Information Modal */}
      <AboutPlatformModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
        initialTab={aboutModalInitialTab}
        adminProfile={adminProfile}
      />

      {/* Admin / Founder Profile Edit Modal */}
      {isAdminProfileModalOpen && (
        <AdminProfileModal
          isOpen={isAdminProfileModalOpen}
          onClose={() => setIsAdminProfileModalOpen(false)}
          adminProfile={adminProfile}
          onSaveProfile={handleSaveAdminProfile}
        />
      )}
      </div>
  );
}



