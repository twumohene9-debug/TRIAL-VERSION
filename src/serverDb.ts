import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'server_data.json');

export interface ServerData {
  submissions: any[];
  activeSessions?: any[];
  teacherWarnings?: any[];
  cameraCaptures?: any[];
  quizzes: any[];
  teacherAccessCodes: any[];
  systemSettings: {
    isTeacherSelfRegistrationLocked: boolean;
    activeThemeId?: string;
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
  };
  adminProfile?: {
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
  };
  quizConfig: any;
  sections: any[];
  lastUpdated: string;
}

export const DEFAULT_ADMIN_PROFILE = {
  name: 'Bismark Twum, MPhil',
  title: 'Lead System Architect & Academic Director',
  qualification: 'Master of Philosophy (MPhil)',
  roles: ['Lead Educational Technologist', 'Curriculum Architect', 'Senior Mathematics Specialist'],
  bio: 'Master of Philosophy (MPhil) scholar and educational technologist specializing in pedagogical assessment frameworks, computerized testing automation, and advanced mathematical curricula.',
  email: 'twumbismark90@gmail.com',
  photoUrl: '/admin_profile.jpg',
  motto: 'Empowering students and educators with precision testing and accessible digital tools.',
  scriptureVerse: 'Excellence in Digital Mathematics & Objective Evaluation',
  department: 'Mathematics & Computing Sciences',
  institution: 'MCQ Assessment Network',
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_ADMIN_SECURITY = {
  adminEmail: 'twumohene9@gmail.com',
  adminPassword: '2026',
  keyTapCountRequired: 3,
  keyTapTimeWindowMs: 2000,
  passphrase: 'thejoyoftheLordis mystrength',
  securityMode: 'all_3' as const,
  enabledLayers: {
    layer1: true,
    layer2: true,
    layer3: true,
  },
};

const DEFAULT_SYSTEM_SETTINGS = {
  isTeacherSelfRegistrationLocked: false,
  activeThemeId: 'classic-navy',
  adminContactEmail: 'twumbismark90@gmail.com',
  schoolName: 'MCQ Assessment Network',
  lastUpdated: new Date().toISOString(),
  isMasterPortalLocked: false,
  masterLockMessage: 'Access to this assessment portal is temporarily locked by the administrator.',
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
  adminSecurity: DEFAULT_ADMIN_SECURITY,
};

const DEFAULT_TEACHER_CODES = [
  {
    id: 'code-1',
    code: '0061',
    teacherName: 'Mr. Bismark Twum',
    teacherEmail: 'twumbismark304@gmail.com',
    department: 'Mathematics & Computing',
    status: 'active',
    createdAt: '2026-01-10',
  },
  {
    id: 'code-2',
    code: '1234',
    teacherName: 'Mrs. Grace Osei',
    teacherEmail: 'grace.osei@joymcq.edu.gh',
    department: 'Additional Mathematics',
    status: 'active',
    createdAt: '2026-02-01',
  },
];

const DEFAULT_QUIZ_CONFIG = {
  schoolName: 'MCQ Assessment Network',
  region: 'Eastern Region',
  subject: 'Additional Mathematics',
  yearLevel: 'Year 2',
  totalQuestions: 40,
  totalTimeMinutes: 60,
  shuffleQuestions: false,
  shuffleOptions: false,
  allowReviewAfterSubmit: true,
  requireStudentId: true,
  googleSheetsWebhookUrl: '',
};

const DEFAULT_SECTIONS = [
  {
    id: 1,
    title: 'Section 1: Sets, Binomial Expansion & Sequences',
    description: 'Questions 1–10 covering set theory, binomial terms, AP sequences, and quadratic inequalities.',
    questionRange: [1, 10],
    timeAllocationMinutes: 15,
    status: 'released',
    releaseTime: new Date().toISOString(),
  },
  {
    id: 2,
    title: 'Section 2: Circles, Matrices & Basic Statistics',
    description: 'Questions 11–20 covering polynomial evaluation, circle equations, matrix determinants, and sample means.',
    questionRange: [11, 20],
    timeAllocationMinutes: 15,
    status: 'released',
    releaseTime: new Date().toISOString(),
  },
  {
    id: 3,
    title: 'Section 3: Vectors, Determinants, Systems & Exponents',
    description: 'Questions 21–30 covering vector magnitudes, 3x3 determinants, matrix systems, rank correlation, and exponential equations.',
    questionRange: [21, 30],
    timeAllocationMinutes: 15,
    status: 'released',
    releaseTime: new Date().toISOString(),
  },
  {
    id: 4,
    title: 'Section 4: Trigonometry, Calculus & Optimization',
    description: 'Questions 31–40 covering cubic local extrema, 3D vector angles, trigonometric equations, integration, and cost optimization.',
    questionRange: [31, 40],
    timeAllocationMinutes: 15,
    status: 'released',
    releaseTime: new Date().toISOString(),
  },
];

const DEFAULT_MOCK_SUBMISSIONS = [
  {
    id: 'sub-101',
    studentName: 'Kofi Mensah',
    studentEmail: 'kofi.mensah@joymcq.edu.gh',
    studentId: 'JOY-2026-014',
    school: 'Joy MCQ Assessment Network',
    classGroup: 'Year 2 Science A',
    submittedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    timeSpentSeconds: 2820,
    totalScore: 36,
    maxScore: 40,
    percentage: 90.0,
    answers: { 1: 'A', 2: 'A', 3: 'B', 4: 'B', 5: 'A' },
    bookmarkedQuestions: [15, 32],
    sectionScores: { 1: { score: 10, max: 10, percentage: 100 } },
    topicScores: { 'Set Theory': { score: 3, max: 3, percentage: 100 } },
    feedbackSent: true,
  },
  {
    id: 'sub-102',
    studentName: 'Ama Appiah',
    studentEmail: 'ama.appiah@joymcq.edu.gh',
    studentId: 'JOY-2026-028',
    school: 'Joy MCQ Assessment Network',
    classGroup: 'Year 2 Science A',
    submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    timeSpentSeconds: 3150,
    totalScore: 32,
    maxScore: 40,
    percentage: 80.0,
    answers: { 1: 'A', 2: 'A', 3: 'B' },
    bookmarkedQuestions: [7, 16],
    sectionScores: { 1: { score: 9, max: 10, percentage: 90 } },
    topicScores: { 'Set Theory': { score: 3, max: 3, percentage: 100 } },
    feedbackSent: false,
  },
];

const DEFAULT_QUIZZES: any[] = [];
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function pruneExpiredCameraCaptures(captures: any[]): any[] {
  if (!Array.isArray(captures)) return [];
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  return captures.filter((c) => {
    try {
      const time = new Date(c.timestamp || c.createdAt).getTime();
      return !isNaN(time) && time >= cutoff;
    } catch {
      return true;
    }
  });
}

export function loadServerData(): ServerData {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(raw);
      const existingQuizzes = Array.isArray(data.quizzes) ? data.quizzes : DEFAULT_QUIZZES;
      const prunedCaptures = pruneExpiredCameraCaptures(data.cameraCaptures || []);
      return {
        submissions: Array.isArray(data.submissions) ? data.submissions : DEFAULT_MOCK_SUBMISSIONS,
        activeSessions: Array.isArray(data.activeSessions) ? data.activeSessions : [],
        cameraCaptures: prunedCaptures,
        quizzes: existingQuizzes,
        teacherAccessCodes: Array.isArray(data.teacherAccessCodes) ? data.teacherAccessCodes : DEFAULT_TEACHER_CODES,
        systemSettings: data.systemSettings || DEFAULT_SYSTEM_SETTINGS,
        adminProfile: data.adminProfile || DEFAULT_ADMIN_PROFILE,
        quizConfig: data.quizConfig || DEFAULT_QUIZ_CONFIG,
        sections: Array.isArray(data.sections) ? data.sections : DEFAULT_SECTIONS,
        lastUpdated: data.lastUpdated || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.error('Error reading server_data.json:', err);
  }

  const initialData: ServerData = {
    submissions: DEFAULT_MOCK_SUBMISSIONS,
    activeSessions: [],
    cameraCaptures: [],
    quizzes: DEFAULT_QUIZZES,
    teacherAccessCodes: DEFAULT_TEACHER_CODES,
    systemSettings: DEFAULT_SYSTEM_SETTINGS,
    adminProfile: DEFAULT_ADMIN_PROFILE,
    quizConfig: DEFAULT_QUIZ_CONFIG,
    sections: DEFAULT_SECTIONS,
    lastUpdated: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing initial server_data.json:', err);
  }

  return initialData;
}

export function saveServerData(data: Partial<ServerData>): ServerData {
  let current: ServerData;
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      current = {
        submissions: Array.isArray(parsed.submissions) ? parsed.submissions : DEFAULT_MOCK_SUBMISSIONS,
        activeSessions: Array.isArray(parsed.activeSessions) ? parsed.activeSessions : [],
        cameraCaptures: pruneExpiredCameraCaptures(parsed.cameraCaptures || []),
        quizzes: Array.isArray(parsed.quizzes) ? parsed.quizzes : DEFAULT_QUIZZES,
        teacherAccessCodes: Array.isArray(parsed.teacherAccessCodes) ? parsed.teacherAccessCodes : DEFAULT_TEACHER_CODES,
        systemSettings: parsed.systemSettings || DEFAULT_SYSTEM_SETTINGS,
        adminProfile: parsed.adminProfile || DEFAULT_ADMIN_PROFILE,
        quizConfig: parsed.quizConfig || DEFAULT_QUIZ_CONFIG,
        sections: Array.isArray(parsed.sections) ? parsed.sections : DEFAULT_SECTIONS,
        lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      };
    } else {
      current = {
        submissions: DEFAULT_MOCK_SUBMISSIONS,
        activeSessions: [],
        cameraCaptures: [],
        quizzes: DEFAULT_QUIZZES,
        teacherAccessCodes: DEFAULT_TEACHER_CODES,
        systemSettings: DEFAULT_SYSTEM_SETTINGS,
        adminProfile: DEFAULT_ADMIN_PROFILE,
        quizConfig: DEFAULT_QUIZ_CONFIG,
        sections: DEFAULT_SECTIONS,
        lastUpdated: new Date().toISOString(),
      };
    }
  } catch {
    current = {
      submissions: DEFAULT_MOCK_SUBMISSIONS,
      activeSessions: [],
      cameraCaptures: [],
      quizzes: DEFAULT_QUIZZES,
      teacherAccessCodes: DEFAULT_TEACHER_CODES,
      systemSettings: DEFAULT_SYSTEM_SETTINGS,
      adminProfile: DEFAULT_ADMIN_PROFILE,
      quizConfig: DEFAULT_QUIZ_CONFIG,
      sections: DEFAULT_SECTIONS,
      lastUpdated: new Date().toISOString(),
    };
  }

  const rawCaptures = data.cameraCaptures !== undefined ? data.cameraCaptures : (current.cameraCaptures || []);
  const updatedCaptures = pruneExpiredCameraCaptures(rawCaptures);

  const updated: ServerData = {
    ...current,
    ...data,
    cameraCaptures: updatedCaptures,
    lastUpdated: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing server_data.json:', err);
  }
  return updated;
}
