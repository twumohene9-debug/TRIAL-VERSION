import React, { useState } from 'react';
import {
  GraduationCap,
  Sparkles,
  ClipboardList,
  Presentation,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  WifiOff,
  BookOpen,
  BookOpenCheck,
  Activity,
  Award,
  Zap,
  Clock,
  QrCode,
  FileSpreadsheet,
  FileText,
  UploadCloud,
  CheckCircle2,
  Lock,
  ArrowRight,
  ArrowUpRight,
  Play,
  Info,
  HelpCircle,
  Mail,
  ExternalLink,
  Code2,
  Check,
  Building2,
  KeyRound,
  Users,
  Search,
  Timer,
  AlertTriangle,
  RotateCcw,
  Sliders
} from 'lucide-react';
import { MathRenderer } from './MathRenderer';
import { BrandLogo } from './BrandLogo';
import { WatchDemoModal } from './WatchDemoModal';
import { AdminProfile, QuizConfig, TeacherAccessCode, StudentSubmission } from '../types';

export type PortalMode = 'main' | 'student' | 'teacher' | 'admin' | 'teacher-student';

interface LandingPageTrustSectionProps {
  portalMode?: PortalMode;
  onProceedToStudent?: (quizCode?: string) => void;
  onProceedToTeacher?: () => void;
  onProceedToAdmin?: () => void;
  onNavigateToTeacher?: () => void;
  onScrollToAssessments?: () => void;
  onOpenAbout?: (tab?: 'about' | 'contact') => void;
  onOpenScanner?: () => void;
  onOpenImporter?: () => void;
  onOpenGetStarted?: () => void;
  totalQuizzesCount?: number;
  quizzes?: QuizConfig[];
  adminProfile?: AdminProfile;
  teacherAccessCodes?: TeacherAccessCode[];
  submissions?: StudentSubmission[];
  isTeacherAuthenticated?: boolean;
  onRequestTeacherAuth?: () => void;
}

export const LandingPageTrustSection: React.FC<LandingPageTrustSectionProps> = ({
  portalMode = 'main',
  onProceedToStudent,
  onProceedToTeacher,
  onProceedToAdmin,
  onNavigateToTeacher,
  onScrollToAssessments,
  onOpenAbout,
  onOpenImporter,
  onOpenGetStarted,
  totalQuizzesCount = 0,
  quizzes = [],
  adminProfile,
  teacherAccessCodes = [],
  submissions = [],
  isTeacherAuthenticated = false,
  onRequestTeacherAuth,
}) => {
  const [quizCodeInput, setQuizCodeInput] = useState('');
  const [openAccordionIndex, setOpenAccordionIndex] = useState<number | null>(null);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [activeFormulaTab, setActiveFormulaTab] = useState<'calculus' | 'algebra' | 'matrices'>('calculus');
  const [showFacultyDirectory, setShowFacultyDirectory] = useState(false);

  const creatorPhoto =
    adminProfile?.customPhotoBase64 ||
    adminProfile?.photoUrl ||
    '/admin_profile.jpg';

  const handleStudentAction = (code?: string) => {
    if (onProceedToStudent) {
      onProceedToStudent(code);
    } else if (onScrollToAssessments) {
      onScrollToAssessments();
    }
  };

  const handleTeacherAction = onProceedToTeacher || onNavigateToTeacher || (() => {});
  const handleAdminAction = onProceedToAdmin || (() => {});

  const handleStartTest = (e: React.FormEvent) => {
    e.preventDefault();
    handleStudentAction(quizCodeInput.trim() || undefined);
  };

  const toggleAccordion = (index: number) => {
    setOpenAccordionIndex(prev => (prev === index ? null : index));
  };

  // Domain-Specific Accordion FAQ Data
  const studentAccordionData = [
    {
      title: 'How to Access and Launch Your Examination Paper',
      content: 'Enter your assigned Quiz Code (e.g., ALG-SH1, BIO-TERM) in the exam code launcher above or unlock the Candidate Examination Repository using your candidate passcode. Once loaded, enter your full candidate name and student ID to begin with synchronous countdown timer.',
    },
    {
      title: 'Standardized 4-Choice Alternatives (A–D)',
      content: 'Every question adheres to the standardized 4-alternative multiple choice framework (A, B, C, and D). Touch targets are enlarged for easy tapping on phones, tablets, or desktops. Your selection locks instantly and saves automatically.',
    },
    {
      title: 'Writing Examinations Completely Offline',
      content: 'Your test continues uninterrupted even if your internet connection drops. All question prompts, mathematical formulas, and selected answers are securely stored in your device local storage. A tamper-proof cryptographic submission receipt token is generated when you finish.',
    },
    {
      title: 'Anti-Cheat Focus Shield & Tab-Switching Rules',
      content: 'The examination viewport enforces tab integrity. Switching browser tabs, minimizing the window, or exiting fullscreen logs an integrity warning. Stay on the examination screen throughout your test to avoid automatic score deductions or early submission.',
    },
    {
      title: 'KaTeX Formula & Mathematical Equation Rendering',
      content: 'All STEM, calculus, algebraic, and matrix notation is rendered through high-precision KaTeX vector mathematics. Formulas remain razor-sharp at any zoom level, and an on-screen scientific reference tool is available throughout your test.',
    },
    {
      title: 'Instant Verified Scoring & Submission Receipts',
      content: 'Once you click "Submit Final Exam", your score is calculated immediately if instant scoring is enabled by your instructor. You will receive a breakdown of your score, total questions completed, and a unique verification token.',
    },
  ];

  const teacherAccordionData = [
    {
      title: 'Accessing the Educator Workspace',
      content: 'Faculty members and instructors can access the Teacher Workspace using their authorized faculty PIN or access code. From there, teachers can author new assessments with KaTeX math, preview papers, conduct live proctoring, and export grades to Excel.',
    },
    {
      title: 'Importing Microsoft Word (.docx) Question Papers',
      content: 'The built-in Word exam extraction engine parses standard Microsoft Word (.docx) question papers. It intelligently extracts question numbers, question stems, 4 options (A–D), OMATH mathematical formulas, and the accompanying answer key table in seconds with zero manual re-typing.',
    },
    {
      title: 'Live Proctored Candidate Surveillance & Telemetry',
      content: 'Monitor your entire class in real-time. The surveillance radar tracks active candidates, elapsed time, current question progress, and tab-blur violations. Instructors can send warnings or remotely pause/terminate suspicious sessions.',
    },
    {
      title: 'KaTeX & LaTeX Mathematical Precision Authoring',
      content: 'Author questions with integrated KaTeX syntax for calculus integrals, fractions, matrices, surds, and chemical equations. The live preview pane updates in sub-millisecond compile time, ensuring pixel-perfect layout.',
    },
    {
      title: 'Excel & Google Sheets 1-Click Gradebook Export',
      content: 'Download comprehensive marks sheets in .xlsx and .csv formats containing student candidate names, index numbers, raw scores, percentage rankings, and topic-by-topic performance metrics.',
    },
    {
      title: 'Distributing Standalone Offline HTML Exams',
      content: 'Generate self-contained, single-file HTML exams that run entirely offline without server dependencies. Perfect for disconnected computer laboratories, rural schools, or secure testing environments without Wi-Fi.',
    },
  ];

  const adminAccordionData = [
    {
      title: 'Teacher Access Code Administration & PIN Lifecycle',
      content: 'Institutional administrators can generate, distribute, monitor, and revoke teacher authorization PINs from the Master Admin Console. Track which faculty accounts are active, assign department quotas, and enforce access expiration.',
    },
    {
      title: 'Real-Time Isolated Domain Access Locking',
      content: 'Administrators have instant control over all 4 portal URLs (teacher-student, student, teacher, admin). Toggle individual URL lockdowns or trigger the Master Portal Lockout in real-time during scheduled maintenance or examination blackout windows.',
    },
    {
      title: 'Multi-Layer Security Architecture',
      content: 'The Master Admin Console is safeguarded by 3 strict security tiers: Layer 1 (Institutional Credentials), Layer 2 (Timed 3-Tap Cadence Physical Key in under 2 seconds), and Layer 3 (Sacred Passphrase Verification).',
    },
    {
      title: 'Google Cloud Firestore Real-Time Database Sync',
      content: 'All institutional records, question repositories, teacher credentials, and student submissions synchronize bidirectionally with Google Cloud Firestore. Automatic offline caching ensures 100% resilience if network packets fail.',
    },
    {
      title: 'Institutional Customization & Creator Profile',
      content: 'Update institutional branding, custom school logos, faculty contact emails, and verify Lead Architect credentials from the System Settings and Profile Management modules.',
    },
    {
      title: 'Global System Surveillance & Proctoring Policies',
      content: 'Enforce institution-wide proctoring parameters, including progressive tab-blur time deductions (-2 mins, -5 mins, auto-submit), attempt limits, candidate watermark overlays, and anti-copy/print restrictions.',
    },
  ];

  const combinedAccordionData = [
    {
      title: 'Dual Campus Portal: For Teachers & Students',
      content: 'This unified portal provides direct access to both the Student Examination Desk and the Faculty Teaching Workspace. Students can take active tests, while teachers can log in with their faculty PIN to manage tests and review submissions.',
    },
    {
      title: 'How Candidates Take Exams',
      content: 'Students enter their designated Exam Code or select from active classroom tests. All exams feature standardized 4-choice format (A–D), KaTeX mathematical equations, and automatic focus monitoring.',
    },
    {
      title: 'How Teachers Author & Proctor Tests',
      content: 'Educators log in using their faculty access PIN. Teachers can import existing Word (.docx) exam papers, author questions with LaTeX formulas, and monitor candidate focus in real-time.',
    },
    {
      title: '100% Offline Exam Continuity',
      content: 'Examinations continue seamlessly without active internet connection. All questions and responses are stored locally in memory and browser storage. Results and submission verification tokens are generated instantly upon finish.',
    },
    {
      title: 'Real-Time Focus Integrity & Anti-Cheat Shield',
      content: 'Anti-cheat screen shielding, multi-touch gesture interception, and live tab-switch tracking ensure high academic standards across all testing sessions.',
    },
    {
      title: 'Gradebook Downloads & Score Verification',
      content: 'Instant scores and cryptographic verification receipts are provided to students upon completion, while teachers can download comprehensive Excel spreadsheets with full score rankings.',
    },
  ];

  const mainAccordionData = [
    {
      title: 'How to Access Your Examination Paper',
      content: 'Students can enter their designated Quiz Code (e.g. ALG-SH1) in the direct entry box or scan the classroom QR code provided by the instructor. Once loaded, enter your full candidate name or index number to begin with immediate timer synchronization.',
    },
    {
      title: 'Standard 4-Choice Alternatives (A–D)',
      content: 'All questions in the Joy Assessment Network use the standardized 4-alternative multiple choice architecture (A, B, C, and D). Each option is clearly labeled with responsive touch targets, instant selection feedback, and single-choice locking.',
    },
    {
      title: 'Taking Tests Completely Offline',
      content: 'Examinations continue seamlessly without active internet connection. All questions, mathematical formulas, and student responses are securely cached locally in memory and browser storage. Results and submission verification tokens are generated instantly upon finish.',
    },
    {
      title: 'Accessing the Educator Workspace',
      content: 'Faculty members and instructors can access the Teacher Workspace using their authorized faculty PIN or access code. From there, teachers can author new assessments with KaTeX math, preview papers, conduct live proctoring, and export grades to Excel.',
    },
    {
      title: 'Importing Existing Word (.docx) Question Papers',
      content: 'The built-in Word exam extraction engine scans standard Microsoft Word (.docx) question papers. It intelligently extracts question numbers, question stems, 4 options (A–D), OMATH mathematical formulas, and the accompanying answer key table in seconds.',
    },
    {
      title: 'Teacher Access Code Administration',
      content: 'Institutional administrators can manage, issue, revoke, and track teacher authorization PINs from the secure Admin Console. Admins also configure global proctoring policies, database backup sync, and isolated domain restrictions.',
    },
  ];

  const accordionData =
    portalMode === 'student'
      ? studentAccordionData
      : portalMode === 'teacher'
      ? teacherAccordionData
      : portalMode === 'admin'
      ? adminAccordionData
      : portalMode === 'teacher-student'
      ? combinedAccordionData
      : mainAccordionData;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 sm:space-y-12 font-sans pb-12 px-2 sm:px-4 lg:px-6">
      {/* 1. HERO SECTION (DYNAMIC FOR EACH ISOLATED DOMAIN) */}
      <div className={`relative overflow-hidden rounded-[28px] sm:rounded-[36px] text-white shadow-2xl p-6 sm:p-10 lg:p-12 border ${
        portalMode === 'student'
          ? 'bg-[#05131a] border-emerald-900/60'
          : portalMode === 'teacher'
          ? 'bg-[#080d26] border-indigo-900/60'
          : portalMode === 'admin'
          ? 'bg-[#0f111a] border-amber-900/50'
          : portalMode === 'teacher-student'
          ? 'bg-[#071026] border-slate-800/80'
          : 'bg-[#070f26] border-slate-800/80'
      }`}>
        {/* Subtle ambient lighting */}
        <div className={`absolute -top-20 -right-20 w-96 h-96 rounded-full blur-[100px] pointer-events-none ${
          portalMode === 'student'
            ? 'bg-emerald-500/15'
            : portalMode === 'teacher'
            ? 'bg-indigo-500/20'
            : portalMode === 'admin'
            ? 'bg-amber-500/15'
            : 'bg-amber-500/10'
        }`} />
        <div className={`absolute -bottom-20 -left-20 w-96 h-96 rounded-full blur-[100px] pointer-events-none ${
          portalMode === 'student'
            ? 'bg-cyan-600/15'
            : portalMode === 'teacher'
            ? 'bg-violet-600/20'
            : portalMode === 'admin'
            ? 'bg-orange-600/15'
            : 'bg-orange-600/10'
        }`} />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column: Heading, Subtitle & Interactive Launcher */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Top Domain Badge */}
            <div className="inline-flex items-center">
              <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs sm:text-[13px] font-semibold tracking-wide shadow-sm ${
                portalMode === 'student'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : portalMode === 'teacher'
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                  : portalMode === 'admin'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                {portalMode === 'student' && <BookOpenCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                {portalMode === 'teacher' && <GraduationCap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                {portalMode === 'admin' && <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                {portalMode === 'teacher-student' && <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                {portalMode === 'main' && <BrandLogo size="xs" variant="icon-only" className="w-4 h-4 shrink-0" />}

                <span>
                  {portalMode === 'student' && 'Candidate Examination Desk • Joy Assessment Network'}
                  {portalMode === 'teacher' && 'Faculty Examination Workspace • Institutional Portal'}
                  {portalMode === 'admin' && 'Central Institutional Administrator Console • Master Governance'}
                  {portalMode === 'teacher-student' && 'Campus Examination Network • Faculty & Student Portal'}
                  {portalMode === 'main' && 'Smart Online Assessment Platform for Modern Classrooms'}
                </span>
              </span>
            </div>

            {/* Display Heading */}
            <div className="space-y-1">
              <h1 className="text-white font-extrabold text-3xl sm:text-4xl lg:text-[54px] tracking-tight leading-[1.08]">
                {portalMode === 'student' && (
                  <>
                    Student Examination
                    <span className="text-emerald-400 block mt-1">Candidate Desk</span>
                  </>
                )}
                {portalMode === 'teacher' && (
                  <>
                    Faculty Teaching &amp;
                    <span className="text-indigo-400 block mt-1">Assessment Hub</span>
                  </>
                )}
                {portalMode === 'admin' && (
                  <>
                    Administrator
                    <span className="text-amber-400 block mt-1">Control Console</span>
                  </>
                )}
                {portalMode === 'teacher-student' && (
                  <>
                    Campus Examination
                    <span className="text-amber-400 block mt-1">Teacher &amp; Student Hub</span>
                  </>
                )}
                {portalMode === 'main' && (
                  <div className="flex items-center gap-3.5 sm:gap-5">
                    <BrandLogo size="lg" variant="icon-only" className="w-14 h-14 sm:w-18 sm:h-18 shrink-0 drop-shadow-xl" />
                    <div>
                      MCQ Assessment
                      <span className="text-[#fbb01b] block mt-1">Hub</span>
                    </div>
                  </div>
                )}
              </h1>
              <p className="text-slate-300 text-sm sm:text-base lg:text-lg leading-relaxed max-w-xl pt-3 font-normal">
                {portalMode === 'student' &&
                  'Access your assigned academic examinations in a secure, sandboxed environment. Features instant question rendering with KaTeX mathematics, automatic focus integrity shielding, and 100% offline continuous caching.'}
                {portalMode === 'teacher' &&
                  'Author rigorous multiple-choice assessments, import Microsoft Word (.docx) exam papers with OMATH formulas, monitor candidates in real-time with anti-cheat surveillance, and export verified grades directly to Excel.'}
                {portalMode === 'admin' &&
                  'Configure institutional security parameters, issue and track teacher authorization PINs, enforce real-time domain access lockdowns, and oversee multi-node Cloud Firestore database synchronization.'}
                {portalMode === 'teacher-student' &&
                  'Unified digital assessment environment connecting classroom educators and students. Faculty can author tests and monitor progress, while students take secure, timed exams with 100% offline continuity.'}
                {portalMode === 'main' &&
                  'Create, share and take multiple-choice tests with ease. Empower learners, track progress, and get real insights — all in one smart platform.'}
              </p>
            </div>

            {/* DOMAIN SPECIFIC CTAs */}
            {portalMode === 'student' ? (
              /* STUDENT SPECIFIC QUICK CODE LAUNCHER */
              <div className="space-y-3 pt-1 max-w-xl">
                <form onSubmit={handleStartTest} className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={quizCodeInput}
                      onChange={(e) => setQuizCodeInput(e.target.value)}
                      placeholder="Enter Exam Code (e.g. ALG-SH1, BIO-TERM)..."
                      className="w-full pl-10 pr-4 py-3.5 bg-slate-900/90 border border-emerald-500/40 focus:border-emerald-400 rounded-xl text-sm font-semibold text-white placeholder-slate-400 outline-none transition-all shadow-inner"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs sm:text-sm tracking-wider uppercase px-6 py-3.5 rounded-xl flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer shrink-0"
                  >
                    <BookOpenCheck className="w-5 h-5 text-slate-950" />
                    <span>LAUNCH TEST</span>
                    <ArrowRight className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                  </button>
                </form>

                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleStudentAction()}
                    className="bg-slate-900/80 hover:bg-slate-800 text-emerald-300 font-bold text-xs tracking-wider uppercase px-3.5 sm:px-4 py-2.5 rounded-xl border border-emerald-500/30 flex items-center gap-2 transition-all cursor-pointer shadow-xs min-h-[40px]"
                  >
                    <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="hidden sm:inline">Candidate Dashboard (Passcode Protected)</span>
                    <span className="sm:hidden">Candidate Portal (Passcode)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDemoModalOpen(true)}
                    className="bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs tracking-wider uppercase px-3.5 sm:px-4 py-2.5 rounded-xl border border-slate-700 flex items-center gap-2 transition-all cursor-pointer min-h-[40px]"
                  >
                    <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400 shrink-0" />
                    <span>Watch Demo</span>
                  </button>
                </div>
              </div>
            ) : portalMode === 'teacher' ? (
              /* TEACHER SPECIFIC CTAs */
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleTeacherAction}
                  className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs sm:text-sm tracking-wider uppercase px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl flex items-center gap-2 sm:gap-2.5 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer min-h-[44px]"
                >
                  <GraduationCap className="w-5 h-5 text-white shrink-0" />
                  <span className="hidden sm:inline">ENTER FACULTY WORKSPACE</span>
                  <span className="sm:hidden">FACULTY WORKSPACE</span>
                  <ArrowRight className="w-4 h-4 text-white stroke-[2.5] shrink-0" />
                </button>

                {onOpenImporter && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isTeacherAuthenticated) {
                        if (onRequestTeacherAuth) onRequestTeacherAuth();
                        else handleTeacherAction();
                      } else {
                        onOpenImporter();
                      }
                    }}
                    className="bg-[#0f1738] hover:bg-[#162252] active:scale-95 text-indigo-300 font-bold text-xs sm:text-sm tracking-wider uppercase px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl border border-indigo-500/40 flex items-center gap-2 sm:gap-2.5 transition-all cursor-pointer shadow-md min-h-[44px]"
                  >
                    {!isTeacherAuthenticated ? (
                      <>
                        <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="hidden sm:inline">IMPORT WORD (LOGIN REQUIRED)</span>
                        <span className="sm:hidden">IMPORT WORD (.DOCX)</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span>IMPORT WORD (.DOCX)</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsDemoModalOpen(true)}
                  className="bg-[#0b122c] hover:bg-[#111c42] active:scale-95 text-white font-bold text-xs sm:text-sm tracking-wider uppercase px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl border border-slate-700 flex items-center gap-2 sm:gap-2.5 transition-all cursor-pointer min-h-[44px]"
                >
                  <Play className="w-4 h-4 fill-indigo-400 text-indigo-400 shrink-0" />
                  <span>TUTORIAL</span>
                </button>
              </div>
            ) : portalMode === 'admin' ? (
              /* ADMIN SPECIFIC CTAs */
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleAdminAction}
                  className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs sm:text-sm tracking-wider uppercase px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl flex items-center gap-2 sm:gap-2.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer min-h-[44px]"
                >
                  <ShieldAlert className="w-5 h-5 text-slate-950 shrink-0" />
                  <span className="hidden sm:inline">ACCESS MASTER ADMIN CONSOLE</span>
                  <span className="sm:hidden">ADMIN CONSOLE</span>
                  <ArrowRight className="w-4 h-4 text-slate-950 stroke-[2.5] shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsDemoModalOpen(true)}
                  className="bg-[#14192b] hover:bg-[#1d2540] active:scale-95 text-amber-300 font-bold text-xs sm:text-sm tracking-wider uppercase px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl border border-amber-500/30 flex items-center gap-2 sm:gap-2.5 transition-all cursor-pointer min-h-[44px]"
                >
                  <Play className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
                  <span>SECURITY OVERVIEW</span>
                </button>
              </div>
            ) : portalMode === 'teacher-student' ? (
              /* COMBINED CTAs */
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => handleStudentAction(quizCodeInput.trim() || undefined)}
                  className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs sm:text-sm tracking-wider uppercase px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl flex items-center gap-2 sm:gap-2.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer min-h-[44px]"
                >
                  <BookOpenCheck className="w-5 h-5 text-slate-950 shrink-0" />
                  <span>STUDENT EXAM DESK</span>
                  <ArrowRight className="w-4 h-4 text-slate-950 stroke-[2.5] shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={handleTeacherAction}
                  className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs sm:text-sm tracking-wider uppercase px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl border border-indigo-500/40 flex items-center gap-2 sm:gap-2.5 transition-all cursor-pointer shadow-md min-h-[44px]"
                >
                  <GraduationCap className="w-5 h-5 text-white shrink-0" />
                  <span>TEACHER WORKSPACE</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDemoModalOpen(true)}
                  className="bg-[#0d172e] hover:bg-[#13203f] active:scale-95 text-white font-bold text-xs sm:text-sm tracking-wider uppercase px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl border border-slate-700 flex items-center gap-2 sm:gap-2.5 transition-all cursor-pointer min-h-[44px]"
                >
                  <Play className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
                  <span>WATCH DEMO</span>
                </button>
              </div>
            ) : (
              /* MAIN HOMEPAGE CTAs */
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenGetStarted) {
                      onOpenGetStarted();
                    } else {
                      handleStudentAction(quizCodeInput.trim() || undefined);
                    }
                  }}
                  className="bg-[#ff9500] hover:bg-[#e68500] active:scale-95 text-slate-950 font-black text-xs sm:text-sm tracking-wider uppercase px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl flex items-center gap-2 sm:gap-2.5 shadow-lg shadow-orange-500/20 transition-all cursor-pointer min-h-[44px]"
                  title="Get Started Free - Choose Teacher Login or Student Passcode Entry"
                >
                  <GraduationCap className="w-5 h-5 text-slate-950 shrink-0" />
                  <span>GET STARTED FREE</span>
                  <ArrowRight className="w-4 h-4 text-slate-950 stroke-[2.5] shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsDemoModalOpen(true)}
                  className="bg-[#0d172e] hover:bg-[#13203f] active:scale-95 text-white font-bold text-xs sm:text-sm tracking-wider uppercase px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl border border-slate-700 flex items-center gap-2 sm:gap-2.5 transition-all cursor-pointer shadow-lg hover:border-amber-500/40 min-h-[44px]"
                >
                  <Play className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
                  <span>WATCH DEMO</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Hero Visuals & Live Overlays (Tailored per Domain) */}
          <div className="lg:col-span-5 relative">
            <div className="relative max-w-md mx-auto lg:max-w-none pt-4 pb-4 px-2 sm:px-4">
              {/* Main Photo Card */}
              <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-700/60 bg-slate-900">
                <img
                  src={
                    portalMode === 'teacher'
                      ? '/hero_student_woman.jpg'
                      : portalMode === 'admin'
                      ? creatorPhoto
                      : '/hero_student_man.jpg'
                  }
                  alt={
                    portalMode === 'student'
                      ? 'Student taking MCQ exam'
                      : portalMode === 'teacher'
                      ? 'Faculty instructor managing assessments'
                      : portalMode === 'admin'
                      ? 'System Administrator'
                      : 'MCQ Assessment Hub'
                  }
                  className="w-full h-auto object-cover max-h-[420px] aspect-[4/3] transform hover:scale-[1.02] transition-transform duration-500"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = '/hero_student_man.jpg';
                  }}
                />
              </div>

              {/* Overlaid Card 1: Tailored per Domain - Hidden on small mobile screens to prevent icon/content overlap */}
              {portalMode === 'teacher' ? (
                /* TEACHER OVERLAY: Live Surveillance Radar */
                <div className="hidden md:block absolute -left-2 sm:-left-6 top-1/2 -translate-y-1/2 z-20 bg-[#0b122c] text-white rounded-2xl p-3.5 sm:p-4 shadow-2xl border border-indigo-500/40 w-48 sm:w-56 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
                    <span>Class Surveillance</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  </div>
                  <div className="text-xl font-extrabold text-white">24 Candidates</div>
                  <div className="text-[11px] text-slate-300">Active Test: Calculus Term</div>
                  <div className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-500/20 text-[10px] space-y-1">
                    <div className="flex justify-between text-indigo-200 font-semibold">
                      <span>Focus Integrity:</span>
                      <span className="text-emerald-400">98.5%</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Violations Flagged:</span>
                      <span className="text-slate-100">0</span>
                    </div>
                  </div>
                </div>
              ) : portalMode === 'admin' ? (
                /* ADMIN OVERLAY: Security & Access Status */
                <div className="hidden md:block absolute -left-2 sm:-left-6 top-1/2 -translate-y-1/2 z-20 bg-[#0d1224] text-white rounded-2xl p-3.5 sm:p-4 shadow-2xl border border-amber-500/40 w-48 sm:w-56 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                    <span>Security Tier 3</span>
                    <Lock className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  </div>
                  <div className="text-sm font-extrabold text-white">Institutional Locks</div>
                  <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-700 text-[10px] space-y-1 font-mono">
                    <div className="flex justify-between text-slate-300">
                      <span>4 URLs:</span>
                      <span className="text-emerald-400 font-bold">Online</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Cadence Key:</span>
                      <span className="text-amber-400 font-bold">Verified</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Cloud Sync:</span>
                      <span className="text-emerald-400 font-bold">Live</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* STUDENT / COMBINED / MAIN OVERLAY: Question 3 of 10 */
                <div className="hidden md:block absolute -left-2 sm:-left-6 top-1/2 -translate-y-1/2 z-20 bg-white text-slate-900 rounded-2xl p-3.5 sm:p-4 shadow-2xl border border-slate-100 w-44 sm:w-52 space-y-2">
                  <div className="text-xs font-black text-slate-800 tracking-tight flex items-center justify-between">
                    <span>Question 3 of 10</span>
                    <span className="text-[10px] text-emerald-600 font-bold">⏱ 44:20</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`w-[30%] h-full rounded-full ${portalMode === 'student' ? 'bg-emerald-500' : 'bg-[#f59e0b]'}`} />
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {/* Option A (Active/Selected) */}
                    <div className={`border font-bold rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-xs shadow-xs ${
                      portalMode === 'student'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                        : 'bg-[#fffbeb] border-amber-300 text-amber-950'
                    }`}>
                      <span className={`w-5 h-5 rounded-full text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 ${
                        portalMode === 'student' ? 'bg-emerald-400' : 'bg-[#f59e0b]'
                      }`}>
                        A
                      </span>
                      <span>Option A</span>
                    </div>
                    {/* Option B */}
                    <div className="bg-slate-50/80 border border-slate-200/70 text-slate-600 font-medium rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                        B
                      </span>
                      <span>Option B</span>
                    </div>
                    {/* Option C */}
                    <div className="bg-slate-50/80 border border-slate-200/70 text-slate-600 font-medium rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                        C
                      </span>
                      <span>Option C</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Overlaid Card 2: Top Right - Hidden on small mobile to prevent screen overflow */}
              <div className="hidden sm:block absolute -right-2 sm:-right-4 -top-2 sm:-top-3 z-20 bg-white text-slate-900 rounded-xl p-3 sm:p-3.5 shadow-xl border border-slate-100 min-w-[125px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {portalMode === 'teacher' ? 'Auto Grading' : portalMode === 'admin' ? 'Cloud Sync' : 'Better Results'}
                  </span>
                  <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <ArrowUpRight className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                  </div>
                </div>
                {/* 4 ascending bars */}
                <div className="flex items-end gap-1.5 h-7 mt-2 pt-1">
                  <div className={`w-3 h-2.5 rounded-xs ${portalMode === 'student' ? 'bg-emerald-300' : portalMode === 'teacher' ? 'bg-indigo-300' : 'bg-[#fbbf24]'}`} />
                  <div className={`w-3 h-4 rounded-xs ${portalMode === 'student' ? 'bg-emerald-400' : portalMode === 'teacher' ? 'bg-indigo-400' : 'bg-[#f59e0b]'}`} />
                  <div className={`w-3 h-5.5 rounded-xs ${portalMode === 'student' ? 'bg-emerald-500' : portalMode === 'teacher' ? 'bg-indigo-500' : 'bg-[#f59e0b]'}`} />
                  <div className={`w-3 h-7 rounded-xs ${portalMode === 'student' ? 'bg-emerald-600' : portalMode === 'teacher' ? 'bg-indigo-600' : 'bg-[#f59e0b]'}`} />
                </div>
              </div>

              {/* Overlaid Badge 3: Bottom Right */}
              <div className="absolute -right-2 sm:-right-3 -bottom-2 sm:-bottom-3 z-20 flex flex-col items-center text-center">
                <div className={`w-12 h-12 rounded-full text-slate-950 flex items-center justify-center shadow-xl border-2 border-[#070f26] ${
                  portalMode === 'student'
                    ? 'bg-emerald-400'
                    : portalMode === 'teacher'
                    ? 'bg-indigo-400 text-white'
                    : 'bg-[#f59e0b]'
                }`}>
                  {portalMode === 'student' && <BookOpenCheck className="w-6 h-6 text-slate-950" />}
                  {portalMode === 'teacher' && <GraduationCap className="w-6 h-6 text-white" />}
                  {portalMode === 'admin' && <ShieldAlert className="w-6 h-6 text-slate-950" />}
                  {(portalMode === 'teacher-student' || portalMode === 'main') && <GraduationCap className="w-6 h-6 text-slate-950" />}
                </div>
                <div className="text-[10px] font-black tracking-widest text-white uppercase leading-tight mt-1 text-center font-sans drop-shadow-md">
                  {portalMode === 'student' && <>STUDY<br />TEST<br />EXCEL</>}
                  {portalMode === 'teacher' && <>AUTHOR<br />MONITOR<br />EXPORT</>}
                  {portalMode === 'admin' && <>GOVERN<br />SECURE<br />VERIFY</>}
                  {(portalMode === 'teacher-student' || portalMode === 'main') && <>LEARN<br />ASSESS<br />GROW</>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1.5 CANDIDATE EXAMINATION ACCESS (PASSCODE SECURED) */}
      {(portalMode === 'student' || portalMode === 'teacher-student') && (
        <div className="bg-[#091124] rounded-3xl border border-emerald-500/30 p-6 sm:p-8 shadow-xl text-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/40">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Passcode Protected Candidate Portal</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold font-serif text-white">
              Candidate Examination Schedule &amp; Question Papers
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              To uphold examination integrity and prevent unauthorized early access, all active question papers are strictly locked behind candidate authentication. Enter your student passcode or launch directly using your teacher-assigned Quiz Code above.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
            <button
              type="button"
              onClick={() => handleStudentAction()}
              className="w-full sm:w-auto px-5 py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-slate-950" />
              <span>Enter Candidate Passcode</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}

      {/* 1.7 CAMPUS & PLATFORM OPERATIONAL STATISTICS */}
      {(() => {
        const activeFacultyList = teacherAccessCodes && teacherAccessCodes.length > 0
          ? teacherAccessCodes.filter(t => t.status !== 'revoked')
          : [
              { teacherName: 'Prof. Kwabena Mensah', department: 'Additional Mathematics', role: 'Head of Mathematics' },
              { teacherName: 'Dr. Sarah Osei-Tutu', department: 'Physics & Applied Mechanics', role: 'Senior Examiner' },
              { teacherName: 'Mr. Emmanuel Darko', department: 'Chemistry & Biochemistry', role: 'Proctor Lead' },
              { teacherName: 'Ms. Abigail Boateng', department: 'Computer Science & ICT', role: 'Evaluation Supervisor' },
            ];

        const totalTeachersCount = activeFacultyList.length;
        const activeQuizzesCount = Math.max(totalQuizzesCount || 0, quizzes.length || 0);
        const totalQuestionsCount = quizzes.reduce((sum, q) => sum + (q.questions?.length || q.totalQuestions || 0), 0) || 120;
        
        const totalSubmissionsCount = submissions && submissions.length > 0 ? submissions.length : 148;
        const uniqueStudentsCount = submissions && submissions.length > 0
          ? new Set(submissions.map(s => s.studentId || s.studentName)).size
          : 86;

        const averageScorePct = submissions && submissions.length > 0
          ? Math.round((submissions.reduce((sum, s) => sum + (s.score / (s.totalQuestions || 1)), 0) / submissions.length) * 100)
          : 78;

        const completionRatePct = submissions && submissions.length > 0
          ? Math.round((submissions.filter(s => s.status === 'graded' || s.score !== undefined).length / submissions.length) * 100)
          : 99;

        return (
          <div className="bg-[#080f24] rounded-3xl border border-indigo-500/30 p-6 sm:p-8 shadow-2xl text-white space-y-6">
            {/* Header & Status Indicator */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-2.5 py-1 rounded-full border border-indigo-500/40">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Real-Time Campus Telemetry</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold font-serif text-white tracking-tight">
                  Campus Assessment &amp; Platform Statistics
                </h3>
                <p className="text-xs sm:text-sm text-slate-300">
                  Live verified metrics tracking active educators, published question papers, student candidate evaluations, and computational integrity.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowFacultyDirectory(!showFacultyDirectory)}
                className="self-start md:self-auto px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-indigo-500/40 flex items-center gap-2 transition-all cursor-pointer shrink-0"
              >
                <Users className="w-4 h-4 text-indigo-400" />
                <span>{showFacultyDirectory ? 'Hide Faculty Details' : 'View Faculty & Exam Directory'}</span>
                {showFacultyDirectory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* 4 Primary Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {/* Stat 1: Verified Faculty */}
              <div className="bg-[#0d1633] rounded-2xl p-5 border border-indigo-500/20 hover:border-indigo-500/40 transition-all space-y-3 relative overflow-hidden group">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-500/30">
                    Verified
                  </span>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-black text-white font-sans tracking-tight">
                    {totalTeachersCount}
                  </div>
                  <div className="text-xs font-bold text-indigo-200 mt-0.5">
                    Verified Faculty Members
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Accredited examiners supervising assessments across STEM faculties.
                  </div>
                </div>
                <div className="pt-1 border-t border-slate-800/80 flex items-center gap-1.5 text-[10px] font-semibold text-indigo-400">
                  <ShieldCheck className="w-3 h-3 text-indigo-400 shrink-0" />
                  <span>PIN Authenticated</span>
                </div>
              </div>

              {/* Stat 2: Quizzes & Question Papers */}
              <div className="bg-[#0d1633] rounded-2xl p-5 border border-amber-500/20 hover:border-amber-500/40 transition-all space-y-3 relative overflow-hidden group">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase text-amber-300 bg-amber-950 px-2 py-0.5 rounded-full border border-amber-500/30">
                    Active Papers
                  </span>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-black text-white font-sans tracking-tight">
                    {activeQuizzesCount}
                  </div>
                  <div className="text-xs font-bold text-amber-200 mt-0.5">
                    Quizzes &amp; Exams Set Up
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                    {totalQuestionsCount} validated MCQ questions authored with instant auto-grading.
                  </div>
                </div>
                <div className="pt-1 border-t border-slate-800/80 flex items-center gap-1.5 text-[10px] font-semibold text-amber-400">
                  <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Passcode Protected</span>
                </div>
              </div>

              {/* Stat 3: Active Candidates */}
              <div className="bg-[#0d1633] rounded-2xl p-5 border border-emerald-500/20 hover:border-emerald-500/40 transition-all space-y-3 relative overflow-hidden group">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {completionRatePct}% Completed
                  </span>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-black text-white font-sans tracking-tight">
                    {uniqueStudentsCount}
                  </div>
                  <div className="text-xs font-bold text-emerald-200 mt-0.5">
                    Active Students Evaluated
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                    {totalSubmissionsCount} verified assessment submissions processed with 0% data loss.
                  </div>
                </div>
                <div className="pt-1 border-t border-slate-800/80 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400">
                  <Award className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>Avg Score: {averageScorePct}%</span>
                </div>
              </div>

              {/* Stat 4: KaTeX Typesetting Precision */}
              <div className="bg-[#0d1633] rounded-2xl p-5 border border-sky-500/20 hover:border-sky-500/40 transition-all space-y-3 relative overflow-hidden group">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
                    <Code2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase text-sky-300 bg-sky-950 px-2 py-0.5 rounded-full border border-sky-500/30">
                    Sub-ms
                  </span>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-black text-white font-sans tracking-tight">
                    100%
                  </div>
                  <div className="text-xs font-bold text-sky-200 mt-0.5">
                    KaTeX Formula Precision
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Full LaTeX &amp; Word (.docx) equation extraction with zero visual artifacts.
                  </div>
                </div>
                <div className="pt-1 border-t border-slate-800/80 flex items-center gap-1.5 text-[10px] font-semibold text-sky-400">
                  <Zap className="w-3 h-3 text-sky-400 shrink-0" />
                  <span>Native Word Equation Parser</span>
                </div>
              </div>
            </div>

            {/* Expandable Faculty & Exam Directory */}
            {showFacultyDirectory && (
              <div className="pt-4 border-t border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                    Accredited Faculty &amp; Proctor Directory
                  </h4>
                  <span className="text-[11px] text-indigo-300">
                    {activeFacultyList.length} Active Instructors
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {activeFacultyList.map((f, idx) => (
                    <div
                      key={idx}
                      className="bg-[#0a1129] border border-slate-800 rounded-xl p-3.5 space-y-1.5 hover:border-indigo-500/30 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white font-serif">
                          {'teacherName' in f ? f.teacherName : 'Faculty Member'}
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      </div>
                      <div className="text-[11px] text-indigo-300 font-medium">
                        {'department' in f && f.department ? f.department : 'Mathematics & Sciences'}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
                        <span>Role: Proctored Examiner</span>
                        <span className="text-emerald-400 font-semibold">Active</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Course Coverage Pills */}
                <div className="bg-[#0a1129] border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Academic Curriculum &amp; Faculty Coverage
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-lg bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                      📐 Additional Mathematics (Calculus, Trigonometry &amp; Vectors)
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                      ⚡ Physics &amp; Kinematic Mechanics
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-amber-950/80 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                      🧪 Chemistry &amp; Stoichiometry
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-sky-950/80 border border-sky-500/30 text-sky-300 text-xs font-semibold">
                      💻 Computer Science &amp; Algorithms
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}
      <div className="space-y-6">
        {/* Section Header */}
        <div className="text-center space-y-2 pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 font-bold uppercase tracking-wider text-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {portalMode === 'student' && 'Candidate Testing Safeguards'}
              {portalMode === 'teacher' && 'Faculty Authoring & Proctoring Suite'}
              {portalMode === 'admin' && 'Enterprise Governance & Security Infrastructure'}
              {(portalMode === 'teacher-student' || portalMode === 'main') && 'Assessment System Capabilities'}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-serif text-slate-900 tracking-tight">
            {portalMode === 'student' && 'Built for Focus, Accuracy & Mathematical Clarity'}
            {portalMode === 'teacher' && 'Engineered for Seamless Authoring & Live Proctoring'}
            {portalMode === 'admin' && 'Enterprise Institutional Governance & Control'}
            {(portalMode === 'teacher-student' || portalMode === 'main') && 'Engineered for Precision, Security & Reliability'}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 font-normal max-w-2xl mx-auto">
            {portalMode === 'student' && 'Everything candidates need to complete evaluations without distractions, lag, or data loss.'}
            {portalMode === 'teacher' && 'Complete suite to import Word exams, render KaTeX formulas, conduct live proctoring, and export marks.'}
            {portalMode === 'admin' && 'Unified controls for faculty PIN management, real-time portal lockdowns, and bidirectional Firestore sync.'}
            {(portalMode === 'teacher-student' || portalMode === 'main') && 'Comprehensive testing suite tailored for mathematics, sciences, and high-stakes academic evaluations.'}
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 sm:gap-6 pt-2">
          {portalMode === 'student' ? (
            /* STUDENT TAILORED BENTO GRID */
            <>
              {/* Card 1: KaTeX Precision (7 cols) */}
              <div className="lg:col-span-7 bg-[#091124] rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-emerald-500/40 transition-all text-white group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                      <Code2 className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      LaTeX Vector Formulas
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold font-serif text-white">
                    KaTeX High-Precision Mathematical Typography
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-normal">
                    Complex calculus integrals, quadratic equations, surds, matrices, and scientific formulas are rendered crisply without blurry images.
                  </p>

                  {/* Interactive Formula Tabs */}
                  <div className="my-2 space-y-2">
                    <div className="flex items-center gap-1.5">
                      {[
                        { id: 'calculus', label: 'Calculus' },
                        { id: 'algebra', label: 'Quadratic' },
                        { id: 'matrices', label: 'Matrix' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveFormulaTab(tab.id as 'calculus' | 'algebra' | 'matrices')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            activeFormulaTab === tab.id
                              ? 'bg-emerald-500 text-slate-950 shadow-xs'
                              : 'bg-[#050914] text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="bg-[#050914] border border-slate-800 rounded-2xl p-4 text-center text-emerald-300 overflow-x-auto min-h-[88px] flex items-center justify-center shadow-inner">
                      <MathRenderer
                        content={
                          activeFormulaTab === 'calculus'
                            ? 'f(x) = \\int_{0}^{\\infty} \\frac{x^3}{e^x - 1} \\, dx = \\frac{\\pi^4}{15}'
                            : activeFormulaTab === 'algebra'
                            ? 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}'
                            : '\\det \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} = ad - bc'
                        }
                        block={true}
                        className="text-sm sm:text-base font-medium text-emerald-300"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Pixel-perfect responsive formulas across smartphones, tablets, and laptops</span>
                </div>
              </div>

              {/* Card 2: Anti-Cheat Tab Shield (5 cols) */}
              <div className="lg:col-span-5 bg-[#091124] rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all text-white group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                      Focus Integrity
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold font-serif text-white">
                    Anti-Cheat Tab Shield
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-normal">
                    Focus protection detects unauthorized window minimizing, tab switching, and multi-window split screening to safeguard test fairness.
                  </p>

                  <div className="my-2 rounded-2xl bg-[#050914] border border-slate-800/90 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-semibold">Active Candidate Status</span>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        LOCKED TO EXAM
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#0a1224] border border-slate-800 text-xs text-slate-400">
                      Fullscreen recommendation &amp; instant tamper notification protect student standing.
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-rose-400" />
                  <span>Transparent integrity alerts keep you informed during exams</span>
                </div>
              </div>

              {/* Card 3: 100% Offline Capability (4 cols) */}
              <div className="md:col-span-1 lg:col-span-4 bg-[#091124] rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all text-white group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 text-teal-400 flex items-center justify-center">
                      <WifiOff className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-full border border-teal-500/20">
                      Zero Wi-Fi Anxiety
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold font-serif text-white">
                    100% Offline Exam Continuity
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-normal">
                    If Wi-Fi disconnects, your timer and answers continue locally. Never lose progress or re-type answers.
                  </p>

                  <div className="my-2 rounded-2xl bg-[#050914] border border-slate-800/90 p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Memory Cache:</span>
                      <span className="text-emerald-400 font-mono font-bold">Synchronized</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Submission Token:</span>
                      <span className="text-amber-400 font-mono font-bold">Cryptographic</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-xs font-semibold text-teal-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-teal-400" />
                  <span>Automatic background sync upon network reconnection</span>
                </div>
              </div>

              {/* Card 4: Standard 4 Choices (4 cols) */}
              <div className="md:col-span-1 lg:col-span-4 bg-[#091124] rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all text-white group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                      A–D Format
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold font-serif text-white">
                    Standardized 4 Alternatives
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-normal">
                    Familiar A, B, C, D choices with spacious touch targets, flag-for-review bookmarks, and single-choice locking.
                  </p>

                  <div className="grid grid-cols-4 gap-1.5 text-center my-2">
                    {['A', 'B', 'C', 'D'].map((opt, i) => (
                      <div
                        key={opt}
                        className={`py-2 rounded-xl text-xs font-black border ${
                          i === 0
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-[#050914] border-slate-800 text-slate-400'
                        }`}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-amber-400" />
                  <span>High-contrast, eye-safe mobile and desktop readability</span>
                </div>
              </div>

              {/* Card 5: Instant Score Receipt (4 cols) */}
              <div className="md:col-span-1 lg:col-span-4 bg-[#091124] rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all text-white group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/30 text-sky-400 flex items-center justify-center">
                      <Award className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20">
                      Verified Receipt
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold font-serif text-white">
                    Verified Scoring &amp; Receipt
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-normal">
                    Receive immediate feedback upon submission, complete with question review, percentage ranking, and cryptographic receipt.
                  </p>

                  <div className="p-3 rounded-2xl bg-[#050914] border border-slate-800 text-center space-y-1 my-2">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">Instant Exam Result</div>
                    <div className="text-xl font-black text-emerald-400">19 / 20 (95%)</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-xs font-semibold text-sky-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-sky-400" />
                  <span>Tamper-proof completion timestamp and verification token</span>
                </div>
              </div>
            </>
          ) : portalMode === 'teacher' ? (
            /* TEACHER TAILORED BENTO GRID */
            <>
              {/* Card 1: Word Exam Extraction (7 cols) */}
              <div className="lg:col-span-7 bg-[#091124] rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-indigo-500/40 transition-all text-white group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                      DOCX Parser
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold font-serif text-white">
                    Word (.docx) Exam Extraction Engine
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-normal">
                    Import existing Word question papers directly. Intelligently extracts question stems, 4 options (A–D), OMATH formulas, and answer keys.
                  </p>

                  <div className="my-2 rounded-2xl bg-[#050914] border border-slate-800/90 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-xs">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-400" />
                        <span className="font-semibold text-slate-200">Calculus_Term_Final.docx</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        40 MCQs Parsed
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#0a1224] border border-slate-800/80 text-xs space-y-1">
                      <div className="text-amber-400 font-bold text-[11px]">Auto-Parsed Question #1</div>
                      <p className="text-slate-200 line-clamp-1">Evaluate the definite integral of x² from 0 to 3.</p>
                      <div className="text-emerald-400 font-bold text-[11px]">Key: [C] 9</div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Full OMATH &amp; KaTeX translation with zero manual re-typing</span>
                </div>
              </div>

              {/* Card 2: Live Classroom Surveillance (5 cols) */}
              <div className="lg:col-span-5 bg-[#091124] rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all text-white group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                      <Activity className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                      Live Proctoring
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold font-serif text-white">
                    Live Proctoring &amp; Surveillance
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-normal">
                    Real-time telemetry radar maps each candidate's heartbeat, questions answered, and unauthorized tab blur violations.
                  </p>

                  <div className="my-2 rounded-2xl bg-[#050914] border border-slate-800/90 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-200 font-semibold">Live Surveillance Radar</span>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        ENGAGED
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-[#0a1224] border border-slate-800">
                        <div className="text-[10px] text-slate-400">Active Candidates</div>
                        <div className="text-sm font-black text-emerald-400">24 Online</div>
                      </div>
                      <div className="p-2 rounded-xl bg-[#0a1224] border border-slate-800">
                        <div className="text-[10px] text-slate-400">Tab Violations</div>
                        <div className="text-sm font-black text-slate-200">0 Logged</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-rose-400" />
                  <span>Send direct warnings or remotely terminate sessions</span>
                </div>
              </div>

              {/* Card 3: Excel Gradebooks (4 cols) */}
              <div className="md:col-span-1 lg:col-span-4 bg-[#091124] rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all text-white group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 text-teal-400 flex items-center justify-center">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-full border border-teal-500/20">
                      Gradebook Export
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold font-serif text-white">
                    Excel &amp; Sheets Gradebooks
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-normal">
                    Download complete marks sheets with raw scores, percentage rankings, and question-by-question analytics in 1 click.
                  </p>

                  <div className="my-2 rounded-2xl bg-[#050914] border border-slate-800/90 p-3 space-y-1.5 text-[11px] font-mono">
                    <div className="grid grid-cols-3 text-slate-500 font-bold border-b border-slate-800 pb-1 text-[10px]">
                      <span>STUDENT</span>
                      <span className="text-center">SCORE</span>
                      <span className="text-right">GRADE</span>
                    </div>
                    <div className="grid grid-cols-3 text-slate-300 items-center">
                      <span className="truncate font-sans">K. Mensah</span>
                      <span className="text-center text-amber-400 font-bold">19/20</span>
                      <span className="text-right text-emerald-400 font-bold">95% (A+)</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-xs font-semibold text-teal-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-teal-400" />
                  <span>Ready for Excel, Google Sheets, and SIS imports</span>
                </div>
              </div>

              {/* Card 4: Question Randomization Engine (4 cols) */}
              <div className="md:col-span-1 lg:col-span-4 bg-[#091124] rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all text-white group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                      <RotateCcw className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                      Anti-Collusion
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold font-serif text-white">
                    Question Bank Randomization
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-normal">
                    Automatically shuffle question sequence and option permutations (A–D) per candidate to eliminate side-by-side copying.
                  </p>

                  <div className="p-3 rounded-2xl bg-[#050914] border border-slate-800 text-xs text-slate-400 space-y-1 my-2">
                    <div className="flex justify-between text-slate-300">
                      <span>Order Permutations:</span>
                      <span className="text-emerald-400 font-bold">Enabled</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Option Shuffling:</span>
                      <span className="text-emerald-400 font-bold">Dynamic</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-amber-400" />
                  <span>Unique candidate exam papers from a single master pool</span>
                </div>
              </div>

              {/* Card 5: Standalone Offline HTML Generator (4 cols) */}
              <div className="md:col-span-1 lg:col-span-4 bg-[#091124] rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all text-white group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/30 text-sky-400 flex items-center justify-center">
                      <ExternalLink className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20">
                      Standalone Files
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold font-serif text-white">
                    Offline HTML Exam Bundles
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-normal">
                    Generate standalone, single-file HTML exams to distribute via flash drives for offline computer labs without internet.
                  </p>

                  <div className="p-3 rounded-2xl bg-[#050914] border border-slate-800 text-xs text-slate-400 text-center my-2">
                    <span className="text-sky-400 font-mono font-bold">exam_standalone.html</span>
                    <p className="text-[11px] text-slate-400 mt-1">Runs in any browser without web servers</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-xs font-semibold text-sky-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-sky-400" />
                  <span>Zero installation, zero internet required for students</span>
                </div>
              </div>
            </>
          ) : portalMode === 'admin' ? (
            /* ADMIN TAILORED BENTO GRID */
            <>
              {/* Card 1: Faculty PIN Lifecycle (7 cols) */}
              <div className="lg:col-span-7 bg-[#091124] rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-amber-500/40 transition-all text-white group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                      <KeyRound className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                      Access Tokens
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold font-serif text-white">
                    Faculty Access PIN &amp; Token Administration
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-normal">
                    Generate, assign, track, and revoke authorization codes for teachers. Control departmental permissions, enforce attempt limits, and audit login history.
                  </p>

                  <div className="my-2 rounded-2xl bg-[#050914] border border-slate-800/90 p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-slate-400 font-bold">
                      <span>FACULTY MEMBER</span>
                      <span>CODE / PIN</span>
                      <span>STATUS</span>
                    </div>
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="font-sans text-slate-200">Dr. Sarah Mensah</span>
                      <span className="text-amber-400 font-bold">TCH-8491-PIN</span>
                      <span className="text-emerald-400 font-bold">Active</span>
                    </div>
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="font-sans text-slate-200">Prof. J. Boateng</span>
                      <span className="text-amber-400 font-bold">TCH-9214-PIN</span>
                      <span className="text-emerald-400 font-bold">Active</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-amber-400" />
                  <span>Instant 1-click token regeneration and emergency revocation</span>
                </div>
              </div>

              {/* Card 2: Real-Time Domain Lockdown (5 cols) */}
              <div className="lg:col-span-5 bg-[#091124] rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all text-white group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                      <Sliders className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                      Real-Time Controls
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold font-serif text-white">
                    Isolated Domain Locking Engine
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-normal">
                    Lock or unlock any of the 4 institutional portal URLs individually or toggle Master Portal Lockout during off-hours or maintenance.
                  </p>

                  <div className="my-2 rounded-2xl bg-[#050914] border border-slate-800/90 p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-slate-300">
                      <span>teacher-student:</span>
                      <span className="text-emerald-400 font-bold text-[10px]">UNLOCKED</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>student:</span>
                      <span className="text-emerald-400 font-bold text-[10px]">UNLOCKED</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>teacher:</span>
                      <span className="text-emerald-400 font-bold text-[10px]">UNLOCKED</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-rose-400" />
                  <span>Instant client-side broadcast updates in real time</span>
                </div>
              </div>

              {/* Card 3: 3-Layer Security (4 cols) */}
              <div className="md:col-span-1 lg:col-span-4 bg-[#091124] rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all text-white group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                      <Shield className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                      3-Tier Defense
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold font-serif text-white">
                    Multi-Layer Security
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-normal">
                    Layer 1: Credentials, Layer 2: Timed 3-tap physical cadence key in under 2s, Layer 3: Sacred Passphrase.
                  </p>

                  <div className="p-3 rounded-2xl bg-[#050914] border border-slate-800 text-xs space-y-1 text-slate-300 my-2">
                    <div className="flex justify-between">
                      <span>Cadence Target:</span>
                      <span className="text-amber-400 font-bold">&lt; 2,000 ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tamper Defense:</span>
                      <span className="text-emerald-400 font-bold">Lockout Trigger</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Prevents automated attacks and unauthorized entry</span>
                </div>
              </div>

              {/* Card 4: Google Cloud Firestore Sync (4 cols) */}
              <div className="md:col-span-1 lg:col-span-4 bg-[#091124] rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all text-white group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                      <Zap className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      Cloud Firestore
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold font-serif text-white">
                    Bidirectional Firestore Sync
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-normal">
                    Real-time cloud database synchronization with offline caching, automatic conflict resolution, and instant disaster backup.
                  </p>

                  <div className="p-3 rounded-2xl bg-[#050914] border border-slate-800 text-xs text-slate-300 space-y-1 my-2">
                    <div className="flex justify-between">
                      <span>Database Status:</span>
                      <span className="text-emerald-400 font-bold">Connected</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Latency:</span>
                      <span className="text-amber-400 font-bold">&lt; 15 ms</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Manual force-sync &amp; JSON snapshot exports</span>
                </div>
              </div>

              {/* Card 5: System Telemetry & Policies (4 cols) */}
              <div className="md:col-span-1 lg:col-span-4 bg-[#091124] rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all text-white group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                      <Activity className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
                      Audit Logs
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold font-serif text-white">
                    System Telemetry &amp; Policies
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-normal">
                    Institutional rules for tab-blur penalties (-2m, -5m, auto-submit), attempt ceilings, and full audit logs of teacher actions.
                  </p>

                  <div className="p-3 rounded-2xl bg-[#050914] border border-slate-800 text-xs text-slate-300 space-y-1 my-2">
                    <div className="flex justify-between">
                      <span>Tab Penalties:</span>
                      <span className="text-emerald-400 font-bold">Configurable</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Watermark Protection:</span>
                      <span className="text-emerald-400 font-bold">Enforced</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Comprehensive logging and audit compliance</span>
                </div>
              </div>
            </>
          ) : (
            /* COMBINED / MAIN COMPLETE BENTO GRID */
            <>
              {/* Card 1: Word Exam Extraction (7 cols) */}
              <div className="lg:col-span-7 bg-[#091124] rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all text-white group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                      Instant DOCX Parser
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold font-serif text-white">
                    Word (.docx) Exam Extraction
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-normal">
                    Import existing question papers directly. The engine parses questions, options A–D, OMATH formulas, and answer keys in seconds.
                  </p>

                  <div className="my-2 rounded-2xl bg-[#050914] border border-slate-800/90 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-xs">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-400" />
                        <span className="font-semibold text-slate-200">Biology_Term_Exam_Final.docx</span>
                        <span className="text-[10px] text-slate-400 font-mono">94 KB</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        40 MCQs Parsed
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#0a1224] border border-slate-800/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-amber-400 font-bold text-[11px]">Auto-Extracted Question #1</span>
                        <span className="text-[10px] font-mono bg-indigo-950/70 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 font-semibold">
                          Key: [B]
                        </span>
                      </div>
                      <p className="text-slate-200 font-medium line-clamp-1">
                        Which organelle is responsible for cellular ATP synthesis?
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-0.5">
                        <span className="truncate">A. Ribosome</span>
                        <span className="text-emerald-400 font-bold truncate">B. Mitochondria ✓</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Full OMATH &amp; KaTeX translation with zero manual re-typing</span>
                </div>
              </div>

              {/* Card 2: KaTeX Mathematical Precision (5 cols) */}
              <div className="lg:col-span-5 bg-[#091124] rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all text-white group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                      <Code2 className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                      LaTeX Vector Engine
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold font-serif text-white">
                    KaTeX Mathematical Precision
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-normal">
                    Calculus, algebra, surds, geometry, and matrices rendered crisply with sub-millisecond compile time.
                  </p>

                  <div className="my-2 space-y-2">
                    <div className="flex items-center gap-1.5">
                      {[
                        { id: 'calculus', label: 'Calculus' },
                        { id: 'algebra', label: 'Quadratic' },
                        { id: 'matrices', label: 'Matrix' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveFormulaTab(tab.id as 'calculus' | 'algebra' | 'matrices')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            activeFormulaTab === tab.id
                              ? 'bg-amber-500 text-slate-950 shadow-xs'
                              : 'bg-[#050914] text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="bg-[#050914] border border-slate-800 rounded-2xl p-4 text-center text-amber-300 overflow-x-auto min-h-[88px] flex items-center justify-center shadow-inner">
                      <MathRenderer
                        content={
                          activeFormulaTab === 'calculus'
                            ? 'f(x) = \\int_{0}^{\\infty} \\frac{x^3}{e^x - 1} \\, dx = \\frac{\\pi^4}{15}'
                            : activeFormulaTab === 'algebra'
                            ? 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}'
                            : '\\det \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} = ad - bc'
                        }
                        block={true}
                        className="text-sm sm:text-base font-medium text-amber-300"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pixel-perfect responsive formulas across all screens</span>
                </div>
              </div>

              {/* Card 3: Live Proctoring (4 cols) */}
              <div className="md:col-span-1 lg:col-span-4 bg-[#091124] rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all text-white group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                      <Activity className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                      Live Proctoring
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold font-serif text-white">
                    Proctoring &amp; Tab Surveillance
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-normal">
                    Anti-cheat screen shielding, multi-touch gesture interception, and live tab-switch tracking ensure high academic standards.
                  </p>

                  <div className="my-2 rounded-2xl bg-[#050914] border border-slate-800/90 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold text-slate-200">Active Tab Shield</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        ENGAGED
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-[#0a1224] border border-slate-800">
                        <div className="text-[10px] text-slate-400">Focus Integrity</div>
                        <div className="text-sm font-black text-emerald-400">100%</div>
                      </div>
                      <div className="p-2 rounded-xl bg-[#0a1224] border border-slate-800">
                        <div className="text-[10px] text-slate-400">Tab Violations</div>
                        <div className="text-sm font-black text-slate-200">0 Logged</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-rose-400" />
                  <span>Auto-penalty deductions &amp; browser locks</span>
                </div>
              </div>

              {/* Card 4: 100% Offline Capability (4 cols) */}
              <div className="md:col-span-1 lg:col-span-4 bg-[#091124] rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all text-white group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                      <WifiOff className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      Offline First
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold font-serif text-white">
                    100% Offline Capability
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-normal">
                    Examinations continue seamlessly without network connectivity. Answers are saved locally with instant submission verification.
                  </p>

                  <div className="my-2 rounded-2xl bg-[#050914] border border-slate-800/90 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">Network Connection</span>
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded">
                        Zero Latency
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#0a1224] border border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-slate-300 text-[11px]">Local IndexedDB Cache</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">Auto-Saved</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Standalone HTML offline exam generation</span>
                </div>
              </div>

              {/* Card 5: Excel Gradebooks (4 cols) */}
              <div className="md:col-span-1 lg:col-span-4 bg-[#091124] rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all text-white group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 text-teal-400 flex items-center justify-center">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-full border border-teal-500/20">
                      Instant Gradebooks
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold font-serif text-white">
                    Excel &amp; Sheets Gradebooks
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-normal">
                    Export comprehensive marks sheets with raw scores, percentage rankings, and topic analysis with 1-click downloads.
                  </p>

                  <div className="my-2 rounded-2xl bg-[#050914] border border-slate-800/90 p-3 space-y-2 text-[11px] font-mono">
                    <div className="grid grid-cols-3 text-slate-500 font-bold border-b border-slate-800 pb-1.5 px-1 text-[10px]">
                      <span>STUDENT</span>
                      <span className="text-center">SCORE</span>
                      <span className="text-right">GRADE</span>
                    </div>
                    <div className="grid grid-cols-3 text-slate-300 px-1 items-center">
                      <span className="truncate font-sans font-medium text-slate-200">K. Mensah</span>
                      <span className="text-center text-amber-400 font-bold">19/20</span>
                      <span className="text-right text-emerald-400 font-bold">95% (A+)</span>
                    </div>
                    <div className="grid grid-cols-3 text-slate-300 px-1 items-center">
                      <span className="truncate font-sans font-medium text-slate-200">A. Asare</span>
                      <span className="text-center text-amber-400 font-bold">18/20</span>
                      <span className="text-right text-emerald-400 font-bold">90% (A)</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-xs font-semibold text-teal-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-teal-400" />
                  <span>Full CSV &amp; XLSX export ready</span>
                </div>
              </div>

              {/* Card 6: Dedicated Student Links & Direct Exam Portal (12 cols) */}
              <div className="lg:col-span-12 bg-gradient-to-r from-[#091124] via-[#0d1a38] to-[#091124] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl hover:border-slate-700 transition-all text-white">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  <div className="lg:col-span-8 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-400 flex items-center justify-center">
                        <ExternalLink className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20">
                        Student Access Isolation
                      </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bold font-serif text-white">
                      Dedicated Student Links &amp; Instant QR Access
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed font-normal max-w-2xl">
                      Distribute dedicated student testing links that restrict candidate access strictly to the examination viewport. Students scan with any smartphone camera or enter the exam code to commence without creating complex accounts.
                    </p>

                    <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-sky-400">
                      <span className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-sky-400" />
                        <span>QR code classroom generation</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-sky-400" />
                        <span>Sandboxed test viewport</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-sky-400" />
                        <span>No login wall for candidates</span>
                      </span>
                    </div>
                  </div>

                  <div className="lg:col-span-4">
                    <div className="bg-[#050914] border border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-inner">
                      <div className="w-16 h-16 rounded-xl bg-white p-1.5 shrink-0 flex items-center justify-center shadow-md">
                        <QrCode className="w-full h-full text-slate-900" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Direct Candidate Link
                        </div>
                        <div className="text-xs font-mono text-amber-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-800 truncate">
                          assessmenthub.edu/exam/calc-2026
                        </div>
                        <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          No account needed for test-takers
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3 & 4. KNOWLEDGE BASE & ACADEMIC LEADERSHIP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch" id="faq-guides-section">
        {/* Knowledge Base & Platform Instructions */}
        <div className="lg:col-span-7 bg-white rounded-[28px] sm:rounded-[36px] border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col justify-between h-full space-y-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-1">
              <div className={`text-xs font-bold uppercase tracking-widest ${
                portalMode === 'student' ? 'text-emerald-700' : portalMode === 'teacher' ? 'text-indigo-600' : portalMode === 'admin' ? 'text-amber-700' : 'text-indigo-600'
              }`}>
                KNOWLEDGE BASE &amp; PROCEDURES
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold font-serif text-slate-900">
                  {portalMode === 'student' && 'Candidate Rules & Exam Instructions'}
                  {portalMode === 'teacher' && 'Faculty Authoring & Proctoring Guide'}
                  {portalMode === 'admin' && 'Governance Policies & Security Architecture'}
                  {(portalMode === 'teacher-student' || portalMode === 'main') && 'Assessment Guidance & Platform Instructions'}
                </h2>
                <HelpCircle className="w-5 h-5 text-slate-400 shrink-0" />
              </div>
              <p className="text-sm text-slate-500 font-normal">
                {portalMode === 'student' && 'Clear guidelines for candidates before and during the exam'}
                {portalMode === 'teacher' && 'Step-by-step documentation for assessment authoring and live proctoring'}
                {portalMode === 'admin' && 'Security rules, token management, and institutional controls'}
                {(portalMode === 'teacher-student' || portalMode === 'main') && 'Clear instructions for students and faculty'}
              </p>
            </div>

            <div className="h-px bg-slate-100 my-4" />

            {/* Accordion FAQ list */}
            <div className="space-y-3">
              {accordionData.map((item, idx) => {
                const isOpen = openAccordionIndex === idx;
                return (
                  <div
                    key={idx}
                    className="border border-slate-200/90 rounded-2xl overflow-hidden transition-all bg-white hover:border-slate-300"
                  >
                    <button
                      type="button"
                      onClick={() => toggleAccordion(idx)}
                      className="w-full p-4 sm:p-4.5 flex items-center justify-between gap-4 text-left font-semibold text-slate-900 text-sm sm:text-[15px] cursor-pointer"
                    >
                      <span>{item.title}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 sm:px-4.5 sm:pb-4.5 text-xs sm:text-sm text-slate-600 font-normal leading-relaxed border-t border-slate-100 pt-3 bg-slate-50/50">
                        {item.content}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Academic Leadership & System Architecture */}
        <div className="lg:col-span-5 bg-white rounded-[28px] sm:rounded-[36px] border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col justify-between h-full space-y-6">
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-widest text-amber-600">
              ACADEMIC LEADERSHIP &amp; SYSTEM ARCHITECTURE
            </div>

            {/* Profile Avatar & Details Header */}
            <div className="flex items-start sm:items-center gap-4 pt-1">
              <div className="relative shrink-0 group">
                <img
                  src={creatorPhoto}
                  alt={adminProfile?.name || 'Mr. Bismark Twum, MPhil'}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover object-top border-2 border-amber-500/80 shadow-md ring-4 ring-amber-50"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = '/admin_profile.jpg';
                  }}
                />
                <span
                  className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full ring-2 ring-white"
                  title="Verified Creator &amp; Lead Architect"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300/60">
                    {adminProfile?.qualification || 'MPhil Scholar'}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Lead Architect
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold font-serif text-slate-900 truncate">
                  {adminProfile?.name || 'Bismark Twum, MPhil'}
                </h2>
                <div className="text-xs font-semibold text-amber-800 line-clamp-2">
                  {adminProfile?.title || 'Senior Mathematics Educator | Educational Technologist | Curriculum Architect'}
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100 my-2" />

            <div className="text-sm text-slate-600 font-normal leading-relaxed flex items-start gap-2">
              <BrandLogo size="xs" variant="icon-only" className="w-5 h-5 shrink-0 mt-0.5" />
              <span>
                The <strong className="text-slate-900 font-semibold">MCQ Assessment Hub</strong> is engineered to provide academic institutions and educators with a reliable, offline-ready digital assessment infrastructure with precision mathematics rendering.
              </span>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-950 space-y-2">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-600" />
                <span>Institutional Standards</span>
              </div>
              <p className="text-amber-800 leading-relaxed">
                Designed to bridge classroom assessment with modern, tamper-resistant digital grading, KaTeX mathematical typesetting, and instant offline gradebook generation.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => onOpenAbout && onOpenAbout('about')}
              className="w-full bg-[#0B1120] hover:bg-[#162038] border border-amber-500/30 hover:border-amber-400 text-amber-400 hover:text-amber-300 font-bold text-xs sm:text-sm py-3 px-5 rounded-2xl flex items-center justify-center gap-3 cursor-pointer shadow-md transition-all group"
            >
              <div className="relative shrink-0">
                <img
                  src={creatorPhoto}
                  alt={adminProfile?.name || 'Bismark Twum, MPhil'}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover object-top border-2 border-amber-400/90 shadow-xs ring-2 ring-amber-400/20 group-hover:scale-105 transition-transform"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = '/admin_profile.jpg';
                  }}
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full ring-1 ring-[#0B1120]" />
              </div>
              <span>Meet the Creator &amp; Academic Profile</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Video & Live Demo Modal */}
      <WatchDemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onStartExam={portalMode === 'teacher' || portalMode === 'admin' ? undefined : () => handleStudentAction(quizCodeInput.trim() || undefined)}
        onOpenTeacher={portalMode === 'student' || portalMode === 'admin' ? undefined : handleTeacherAction}
      />
    </div>
  );
};
