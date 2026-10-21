export type QuestionTopic = 
  | 'Set Theory'
  | 'Binomial Expansion'
  | 'Sequences & Series'
  | 'Inequalities & Algebra'
  | 'Polynomials'
  | 'Coordinate Geometry'
  | 'Vectors'
  | 'Matrices & Determinants'
  | 'Statistics & Correlation'
  | 'Logarithms & Exponents'
  | 'Trigonometry'
  | 'Calculus & Optimization'
  | 'Linear Programming'
  | 'General Mathematics'
  | (string & {});

export type UserRole = 'admin' | 'teacher' | 'student';

export type QuizStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'closed' | 'completed' | 'archived';

export interface MCQOption {
  id: 'A' | 'B' | 'C' | 'D';
  text: string; // May contain LaTeX like "$x \le \frac{1}{2}$"
  originalId?: 'A' | 'B' | 'C' | 'D';
}

export interface Question {
  id: number;
  quizId?: string;
  quizCode?: string;
  sectionId: number;
  sectionName: string;
  topic: QuestionTopic;
  questionText: string; // Rich text with embedded LaTeX formulas
  options: MCQOption[];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  officialKeyNote?: string;
  explanation: string;
  marks?: number;
  imageUrl?: string;
}

export interface QuizSection {
  id: number;
  quizId?: string;
  title: string;
  description: string;
  questionRange: [number, number]; // e.g. [1, 10]
  timeAllocationMinutes: number;
  status: 'released' | 'scheduled' | 'locked';
  releaseTime?: string; // ISO String or ISO date-time string
  closingTime?: string;
}

export interface IntegrityEvent {
  id: string;
  type: 
    | 'tab_switch' 
    | 'window_blur' 
    | 'window_focus'
    | 'fullscreen_exit' 
    | 'screenshot_attempt' 
    | 'print_attempt' 
    | 'devtools_open' 
    | 'external_tool_switch' 
    | 'paste_attempt' 
    | 'window_resized' 
    | 'system_activity';
  timestamp: string;
  studentName: string;
  studentId: string;
  details: string;
  durationSeconds?: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface ProctorWarning {
  id: string;
  studentId: string;
  studentName?: string;
  quizId?: string;
  teacherName?: string;
  message: string;
  type?: 'warning' | 'broadcast' | 'info';
  timestamp: string;
  acknowledged?: boolean;
}

export interface StudentAnswers {
  [questionId: number]: 'A' | 'B' | 'C' | 'D';
}

export interface ActiveStudentSession {
  id: string;
  quizId: string;
  quizCode?: string;
  quizTitle?: string;
  studentName: string;
  studentEmail?: string;
  studentId: string;
  school?: string;
  classGroup?: string;
  startTime: string | number;
  targetEndTime: number;
  durationMinutes: number;
  remainingSeconds: number;
  tabSwitchesCount: number;
  windowExitsCount?: number;
  questionsAnsweredCount: number;
  totalQuestions: number;
  lastHeartbeat: string;
  status: 'in_progress' | 'submitted' | 'expired';
  integrityEvents?: IntegrityEvent[];
  warnings?: ProctorWarning[];
  penaltiesApplied?: string[];
  score?: number;
  maxScore?: number;
  percentage?: number;
  answers?: StudentAnswers;
  shuffledQuestionIds?: string[];
  shuffledOptionMaps?: Record<string, ('A' | 'B' | 'C' | 'D')[]>;
}

export interface StudentSubmission {
  id: string;
  quizId?: string;
  quizCode?: string;
  quizTitle?: string;
  studentName: string;
  studentEmail: string;
  studentId: string;
  school: string;
  classGroup: string;
  answers: StudentAnswers;
  bookmarkedQuestions: number[];
  shuffledQuestionIds?: string[];
  shuffledOptionMaps?: Record<string, ('A' | 'B' | 'C' | 'D')[]>;
  submittedAt: string;
  submittedAtLocal?: string;
  timeZone?: string;
  timeSpentSeconds: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  sectionScores: {
    [sectionId: number]: {
      score: number;
      max: number;
      percentage: number;
    };
  };
  topicScores: {
    [topic: string]: {
      score: number;
      max: number;
      percentage: number;
    };
  };
  tabSwitchesCount?: number;
  windowExitsCount?: number;
  warningsAcknowledgedCount?: number;
  integrityEvents?: IntegrityEvent[];
  cameraCapturesCount?: number;
  cameraCaptures?: CameraCaptureItem[];
  feedbackSent?: boolean;
  feedbackSentAt?: string;
  feedbackSummary?: string;
  score?: number;
  totalQuestions?: number;
  status?: string;
}

export interface CameraCaptureItem {
  id: string;
  studentId: string;
  studentName: string;
  quizId: string;
  quizTitle?: string;
  timestamp: string;
  imageDataUrl: string;
  captureIndex: number;
  totalScheduled: number;
  createdAt?: string;
}

export interface QuizConfig {
  id?: string;
  code?: string; // e.g. ALG-SHS2-2026-001
  title?: string;
  subject: string;
  classGroup?: string;
  yearLevel?: string;
  topic?: string;
  teacherId?: string;
  teacherName?: string;
  teacherEmail?: string;
  schoolName: string;
  region?: string;
  instructions?: string;
  instructionBullets?: string[];
  totalQuestions: number;
  totalMarks?: number;
  durationMinutes?: number;
  totalTimeMinutes?: number;
  startDate?: string;
  endDate?: string;
  releaseDate?: string;
  submissionDeadline?: string;
  attemptsAllowed?: number;
  preventMultipleAttempts?: boolean; // When true, prevents students from taking this quiz more than once
  enforceSingleAttempt?: boolean; // Alias for preventMultipleAttempts
  tabSwitchMonitoring?: boolean;
  enableTabMonitoring?: boolean;
  enableCameraProctoring?: boolean; // Random camera captures during examination to verify identity
  cameraCaptureCount?: number; // Number of random captures to perform (e.g., 5, 10, 15)
  progressiveTabPenalty?: boolean; // 1st switch: -2 mins, 2nd switch: -5 mins, 3rd switch: auto-submit
  enableTabSwitchPenalties?: boolean;
  enableCandidateWatermark?: boolean; // Overlays candidate Name, ID & live timestamp across exam paper to deter leaks
  enableAntiCopyPrint?: boolean; // Blocks right-click context menu, text selection, Print to PDF (Ctrl+P), copy/paste, PrintScreen
  enableFullscreenEnforcement?: boolean; // Requires entering fullscreen mode before starting exam and alerts on exit
  enableFullscreenLockdown?: boolean; // Lockdown Fullscreen Kiosk Mode: auto-fullscreen, freezes non-navigation keys, exit penalties
  linearExamMode?: boolean; // Linear Exam Mode (No Going Back): candidate cannot return to previous questions once advanced
  perQuestionTimerEnabled?: boolean; // Per-Question Timer: total time / total questions, auto-advances on timeout, audible warning <10s
  autoSkipOnTabSwitch?: boolean; // Auto-Skip on Tab Switch / Leaving Page: marks current question as blank and moves to next question
  randomizeQuestions?: boolean;
  shuffleQuestions?: boolean;
  randomizeOptions?: boolean;
  shuffleOptions?: boolean;
  allowReviewAfterSubmit?: boolean;
  requireStudentId?: boolean;
  showScoreImmediately?: boolean;
  showCorrectAnswers?: boolean;
  allowFeedback?: boolean;
  enableAIFeedback?: boolean;
  questionPaginationMode?: 'single-page' | 'one-question-per-page';
  status?: QuizStatus;
  googleSheetsWebhookUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  questions?: Question[];
  sections?: QuizSection[];
  accessMode?: 'open' | 'restricted'; // 'restricted' requires candidate to be on uploaded studentRoster
  studentRoster?: RosterStudent[]; // Authorized candidate roster for this assessment
  rosterValidationField?: 'id_only' | 'email_only' | 'id_or_email' | 'both'; // Mode for checking candidate identity
  isQuestionPool?: boolean; // When true, quiz functions as a Randomized Question Bank (e.g. 500+ items pool)
  poolQuestionsToServe?: number; // Exact count of randomized questions served to each candidate (e.g. 50)
  poolSelectionStrategy?: 'random' | 'balanced_sections'; // Uniform random vs topic/section proportional draw
  poolOriginalSize?: number; // Total number of questions in the uploaded master bank
}

export interface RosterStudent {
  id: string; // Unique roster entry ID (e.g. "ros-1234")
  name: string; // Candidate full name
  studentId: string; // Roll number, Index number, or Student ID
  email?: string; // Optional student email
  classGroup?: string; // Class stream or department (e.g. "SHS 2 Science A")
  addedAt?: string;
  status?: 'not_started' | 'in_progress' | 'submitted';
  attemptAllowed?: boolean; // Default true, teacher can revoke or grant retake
  notes?: string;
}

export interface TeacherAccount {
  id: string;
  name: string;
  email: string;
  department: string;
  status: 'active' | 'inactive';
  createdAt: string;
  totalQuizzesCreated: number;
}

export interface TeacherAccessCode {
  id: string;
  code: string;
  pin?: string;
  teacherName: string;
  teacherEmail: string;
  department: string;
  status: 'active' | 'used' | 'revoked';
  source?: 'self-registered' | 'admin-created';
  createdAt: string;
  lastUsedAt?: string;
}

export interface AdminSecuritySettings {
  adminEmail: string;
  adminPassword: string; // Layer 1 password/security code
  keyTapCountRequired: number; // Layer 2 tap count (default 3)
  keyTapTimeWindowMs: number; // Layer 2 time window in ms (default 2000 ms)
  passphrase: string; // Layer 3 passphrase (default "thejoyoftheLordis mystrength")
  securityMode: 'all_3' | 'any_2' | 'any_1' | 'custom';
  enabledLayers: {
    layer1: boolean; // Email & Password
    layer2: boolean; // Triple-Tap Key
    layer3: boolean; // Sacred Passphrase
  };
}

export type AppThemeId = 
  | 'classic-navy' 
  | 'emerald-scholar' 
  | 'royal-oxford' 
  | 'crimson-citadel' 
  | 'obsidian-champagne';

export interface ThemePalette {
  id: AppThemeId;
  name: string;
  tagline: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  accentHover: string;
  headerGradient: string;
  badgeBg: string;
  badgeText: string;
  surfaceBg: string;
  borderAccent: string;
  swatches: string[];
}

export interface SystemSettings {
  isTeacherSelfRegistrationLocked: boolean;
  activeThemeId?: AppThemeId;
  adminContactEmail?: string;
  schoolName?: string;
  lastUpdated?: string;
  isMasterPortalLocked?: boolean;
  masterLockMessage?: string;
  deletedQuizIds?: string[];
  lockedUrls?: {
    'teacher-student'?: boolean;
    'student'?: boolean;
    'teacher'?: boolean;
    'admin'?: boolean;
  };
  urlLockMessages?: {
    'teacher-student'?: string;
    'student'?: string;
    'teacher'?: string;
    'admin'?: string;
  };
  adminSecurity?: AdminSecuritySettings;
}

export interface AdminProfile {
  name: string;
  title: string;
  qualification: string;
  roles: string[];
  bio: string;
  email: string;
  photoUrl: string;
  customPhotoBase64?: string;
  motto?: string;
  scriptureVerse?: string;
  department?: string;
  institution?: string;
  updatedAt?: string;
}

export interface ExtractedQuestion {
  id: number;
  rawText: string;
  questionText: string;
  options: { id: 'A' | 'B' | 'C' | 'D'; text: string }[];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  topic: QuestionTopic;
  isMathDetected: boolean;
  confidence: number; // 0 to 100
  imageUrl?: string;
}

export interface EmailFeedbackPayload {
  studentName: string;
  studentEmail: string;
  score: number;
  maxScore: number;
  percentage: number;
  timeSpent: string;
  strengths: string[];
  areasForImprovement: string[];
  recommendations: string[];
  customTeacherNote?: string;
  personalizedMessage: string;
}

export type PortalSection = 'admin' | 'teacher' | 'student';
export type AdminTab = 'overview' | 'teacher-codes' | 'all-quizzes' | 'student-results' | 'surveillance' | 'domain-links' | 'security-settings' | 'theme-palettes' | 'admin-manual';
export type TeacherTab = 'analytics' | 'surveillance' | 'release-manager' | 'submissions-export' | 'question-bank';

