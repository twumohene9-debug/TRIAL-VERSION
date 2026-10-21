import React, { useState } from 'react';
import { 
  Users, 
  ShieldCheck, 
  BookOpen, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Unlock,
  Settings, 
  Search, 
  Plus, 
  Building, 
  Mail,
  UserX,
  UserCheck,
  KeyRound,
  Copy,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  FileSpreadsheet,
  Check,
  Clock,
  ShieldAlert,
  Shield,
  Sparkles,
  LayoutDashboard,
  Award,
  TrendingUp,
  BarChart3,
  Filter,
  Download,
  ExternalLink,
  Edit3,
  Pause,
  Play,
  Zap,
  BookCheck,
  GraduationCap,
  ArrowLeft,
  FileText,
  Globe,
  LogOut,
  X,
  Save,
  ShieldOff,
  Info,
  Camera,
  Palette,
  Shuffle
} from 'lucide-react';
import { TeacherAccount, QuizConfig, QuizStatus, TeacherAccessCode, StudentSubmission, Question, QuizSection, SystemSettings, AdminProfile, AdminTab } from '../types';
import { LiveStudentMonitoringView } from './LiveStudentMonitoringView';
import { ResultsDetailedAnalyticsView } from './ResultsDetailedAnalyticsView';
import { QRCodeModal } from './QRCodeModal';
import { IsolatedDomainLinksCard } from './IsolatedDomainLinksCard';
import { EditInstructionsModal } from './EditInstructionsModal';
import { AdminProfileModal, DEFAULT_ADMIN_PROFILE } from './AdminProfileModal';
import { AdminSecurityPanel } from './AdminSecurityPanel';
import { ThemePaletteSelector } from './ThemePaletteSelector';
import { AdminManual } from './AdminManual';
import { deduplicateSubmissions } from '../utils/submissionUtils';
import { BrandLogo } from './BrandLogo';
import * as XLSX from 'xlsx';

interface AdminDashboardProps {
  activeAdminTab: AdminTab;
  setActiveAdminTab: (tab: AdminTab) => void;
  teacherAccessCodes: TeacherAccessCode[];
  onAddTeacherCode: (code: TeacherAccessCode) => void;
  onRevokeTeacherCode: (id: string) => void;
  onRegenerateTeacherCode: (id: string) => void;
  onDeleteTeacherCode: (id: string) => void;
  quizzes: QuizConfig[];
  onUpdateQuizStatus: (quizId: string, status: QuizStatus) => void;
  onToggleTabPenalty?: (quizId: string) => void;
  onToggleAttemptLimit?: (quizId: string) => void;
  onToggleFullscreenLockdown?: (quizId: string) => void;
  onDeleteQuiz: (quizId: string) => void;
  submissions: StudentSubmission[];
  onBackToTeacher: () => void;
  questions?: Question[];
  sections?: QuizSection[];
  onOpenEmailFeedback?: (submission: StudentSubmission) => void;
  onOpenImporter?: () => void;
  onCreateQuiz?: () => void;
  onDeleteSubmission?: (id: string) => void;
  onClearAllSubmissions?: () => void;
  onClearAllQuizzes?: () => void;
  onSaveInstructions?: (quizId: string, bullets: string[]) => void;
  onSyncWithServer?: () => Promise<void> | void;
  onLogoutAdmin?: () => void;
  systemSettings?: SystemSettings;
  onUpdateSystemSettings?: (settings: Partial<SystemSettings>) => Promise<void> | void;
  onUpdateTeacherCode?: (id: string, updates: Partial<TeacherAccessCode>) => void;
  adminProfile?: AdminProfile;
  onSaveAdminProfile?: (profile: AdminProfile) => Promise<void>;
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

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  activeAdminTab,
  setActiveAdminTab,
  teacherAccessCodes,
  onAddTeacherCode,
  onRevokeTeacherCode,
  onRegenerateTeacherCode,
  onDeleteTeacherCode,
  quizzes,
  onUpdateQuizStatus,
  onToggleTabPenalty,
  onToggleAttemptLimit,
  onToggleFullscreenLockdown,
  onDeleteQuiz,
  submissions,
  onBackToTeacher,
  questions = [],
  sections = [],
  onOpenEmailFeedback,
  onOpenImporter,
  onCreateQuiz,
  onDeleteSubmission,
  onClearAllSubmissions,
  onClearAllQuizzes,
  onSaveInstructions,
  onSyncWithServer,
  onLogoutAdmin,
  systemSettings = { isTeacherSelfRegistrationLocked: false, activeThemeId: 'classic-navy', adminContactEmail: 'twumbismark90@gmail.com', schoolName: 'MCQ Assessment Network' } as SystemSettings,
  onUpdateSystemSettings,
  onUpdateTeacherCode,
  adminProfile = DEFAULT_ADMIN_PROFILE,
  onSaveAdminProfile,
}) => {
  // Admin Profile Modal State
  const [isAdminProfileModalOpen, setIsAdminProfileModalOpen] = useState(false);

  // New Code Generator Form State
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherDept, setNewTeacherDept] = useState('Mathematics & Computing');
  const [generatedSuccessMsg, setGeneratedSuccessMsg] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Edit Teacher Code Modal State
  const [editingTeacher, setEditingTeacher] = useState<TeacherAccessCode | null>(null);
  const [editTeacherCode, setEditTeacherCode] = useState('');
  const [editTeacherName, setEditTeacherName] = useState('');
  const [editTeacherDept, setEditTeacherDept] = useState('');
  const [teacherFilter, setTeacherFilter] = useState<'all' | 'self-registered' | 'admin-created' | 'active' | 'revoked'>('all');
  const [lockToggleLoading, setLockToggleLoading] = useState(false);

  // Instructions Modal State
  const [selectedQuizForInstructions, setSelectedQuizForInstructions] = useState<QuizConfig | null>(null);
  const [isInstructionsModalOpen, setIsInstructionsModalOpen] = useState<boolean>(false);

  // Global Config Form State
  const [networkTitle, setNetworkTitle] = useState(systemSettings.schoolName || 'MCQ Assessment Network');
  const [adminEmail, setAdminEmail] = useState(systemSettings.adminContactEmail || '');
  const [defaultDuration, setDefaultDuration] = useState('60');
  const [defaultPassMark, setDefaultPassMark] = useState('60');
  const [configSaveMsg, setConfigSaveMsg] = useState<string | null>(null);

  // Search & Filter State for Student Results Tab
  const [resultsSearchTerm, setResultsSearchTerm] = useState('');
  const [selectedQuizFilter, setSelectedQuizFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('score-desc');
  const [showOnlyTabSwitches, setShowOnlyTabSwitches] = useState<boolean>(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    submissions.length > 0 ? submissions[0].id : null
  );

  // Copy Feedback Notification for Quiz Links
  const [copiedQuizId, setCopiedQuizId] = useState<string | null>(null);

  // Confirmation Modals State
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState<boolean>(false);
  const [isClearAllQuizzesModalOpen, setIsClearAllQuizzesModalOpen] = useState<boolean>(false);
  const [studentToDelete, setStudentToDelete] = useState<StudentSubmission | null>(null);

  // General Search Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Handle Generate Code
  const handleGenerateCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim() || !newTeacherEmail.trim()) return;

    const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();

    const newCodeItem: TeacherAccessCode = {
      id: `code-${Date.now()}`,
      code: randomDigits,
      pin: randomDigits,
      teacherName: newTeacherName.trim(),
      teacherEmail: newTeacherEmail.trim().toLowerCase(),
      department: newTeacherDept,
      status: 'active',
      source: 'admin-created',
      createdAt: new Date().toISOString().split('T')[0],
      lastUsedAt: new Date().toISOString(),
    };

    onAddTeacherCode(newCodeItem);
    setGeneratedSuccessMsg(`Access Code [${randomDigits}] generated for ${newTeacherName}!`);
    setNewTeacherName('');
    setNewTeacherEmail('');

    setTimeout(() => setGeneratedSuccessMsg(null), 4000);
  };

  // Copy code to clipboard
  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleCopyQuizUrl = (quizId: string) => {
    const targetQuiz = quizzes.find((q) => q.id === quizId || q.code === quizId);
    const quizCode = targetQuiz?.code || quizId;
    const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
    const url = `${baseUrl}?quiz=${encodeURIComponent(quizCode)}&standalone=true`;
    navigator.clipboard.writeText(url);
    setCopiedQuizId(quizId);
    setTimeout(() => setCopiedQuizId(null), 2000);
  };

  // Toggle Self-Registration Lock
  const handleToggleRegistrationLock = async () => {
    setLockToggleLoading(true);
    const newLockState = !systemSettings.isTeacherSelfRegistrationLocked;
    if (onUpdateSystemSettings) {
      await onUpdateSystemSettings({
        isTeacherSelfRegistrationLocked: newLockState,
        adminContactEmail: adminEmail || 'twumbismark90@gmail.com',
      });
    }
    setLockToggleLoading(false);
  };

  // Save Edit Teacher Code
  const handleSaveEditTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    if (onUpdateTeacherCode) {
      onUpdateTeacherCode(editingTeacher.id, {
        code: editTeacherCode.trim(),
        pin: editTeacherCode.trim(),
        teacherName: editTeacherName.trim(),
        department: editTeacherDept.trim(),
      });
    }
    setEditingTeacher(null);
  };

  // Open Edit Modal
  const handleOpenEditTeacherModal = (tc: TeacherAccessCode) => {
    setEditingTeacher(tc);
    setEditTeacherCode(tc.code || tc.pin || '');
    setEditTeacherName(tc.teacherName);
    setEditTeacherDept(tc.department || 'Mathematics & Computing');
  };

  // Save Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateSystemSettings) {
      onUpdateSystemSettings({
        schoolName: networkTitle.trim(),
        adminContactEmail: adminEmail.trim(),
      });
    }
    setConfigSaveMsg('Global portal parameters saved successfully!');
    setTimeout(() => setConfigSaveMsg(null), 3000);
  };

  // Deduplication & QR Modal States
  const [isDeduplicated, setIsDeduplicated] = useState<boolean>(false);
  const [selectedQuizForQR, setSelectedQuizForQR] = useState<QuizConfig | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState<boolean>(false);

  // Apply Deduplication to submissions if enabled (defaults to true)
  const effectiveSubmissions = isDeduplicated ? deduplicateSubmissions(submissions, 'latest') : submissions;

  // Compute Core Metrics matching Image 1
  const totalQuizzesCount = quizzes.length;
  const activeQuizzesCount = quizzes.filter((q) => q.status === 'active').length;
  const totalSubmissions = effectiveSubmissions.length;
  const totalTabSwitches = effectiveSubmissions.reduce((sum, s) => sum + (s.tabSwitchesCount || 0), 0);

  const avgScoreNum = totalSubmissions > 0
    ? effectiveSubmissions.reduce((acc, curr) => acc + curr.totalScore, 0) / totalSubmissions
    : 0;
  const avgScore = avgScoreNum.toFixed(1);
  const avgPercentage = totalSubmissions > 0
    ? (effectiveSubmissions.reduce((acc, curr) => acc + curr.percentage, 0) / totalSubmissions).toFixed(1)
    : '0.0';

  const passCount = effectiveSubmissions.filter((s) => s.percentage >= 60).length;
  const passRate = totalSubmissions > 0 ? Math.round((passCount / totalSubmissions) * 100) : 0;

  const scoreValues = totalSubmissions > 0 ? effectiveSubmissions.map((s) => s.totalScore) : [0];
  const pctValues = totalSubmissions > 0 ? effectiveSubmissions.map((s) => s.percentage) : [0];
  const highestPct = totalSubmissions > 0 ? Math.max(...pctValues) : 0;
  const lowestPct = totalSubmissions > 0 ? Math.min(...pctValues) : 0;
  const avgMaxScoreNum = totalSubmissions > 0
    ? Math.round(effectiveSubmissions.reduce((acc, curr) => acc + (curr.maxScore || 40), 0) / totalSubmissions)
    : 40;
  const highestScore = totalSubmissions > 0
    ? scoreValues.reduce((max, v) => (v > max ? v : max), scoreValues[0])
    : 0;
  const lowestScore = totalSubmissions > 0
    ? scoreValues.reduce((min, v) => (v < min ? v : min), scoreValues[0])
    : 0;

  // Filter & Process Submissions for Student Results Section
  let filteredSubmissions = effectiveSubmissions;
  if (selectedQuizFilter !== 'all') {
    filteredSubmissions = effectiveSubmissions.filter(
      (s) => s.quizId === selectedQuizFilter || s.quizTitle === selectedQuizFilter
    );
  }

  let processedSubmissions = filteredSubmissions.filter((s) => {
    const matchesSearch =
      s.studentName.toLowerCase().includes(resultsSearchTerm.toLowerCase()) ||
      s.studentId.toLowerCase().includes(resultsSearchTerm.toLowerCase()) ||
      s.studentEmail.toLowerCase().includes(resultsSearchTerm.toLowerCase());

    if (showOnlyTabSwitches) {
      return matchesSearch && (s.tabSwitchesCount || 0) > 0;
    }
    return matchesSearch;
  });

  // Sort Student Results
  processedSubmissions = [...processedSubmissions].sort((a, b) => {
    switch (sortOption) {
      case 'score-desc':
        return b.totalScore - a.totalScore;
      case 'score-asc':
        return a.totalScore - b.totalScore;
      case 'percentage-desc':
        return b.percentage - a.percentage;
      case 'percentage-asc':
        return a.percentage - b.percentage;
      case 'name-asc':
        return a.studentName.localeCompare(b.studentName);
      case 'name-desc':
        return b.studentName.localeCompare(a.studentName);
      case 'tab-switches-desc':
        return (b.tabSwitchesCount || 0) - (a.tabSwitchesCount || 0);
      case 'date-desc':
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      case 'date-asc':
        return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      default:
        return 0;
    }
  });

  const selectedSubmission =
    processedSubmissions.find((s) => s.id === selectedStudentId) || processedSubmissions[0];

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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Progress Results');
    XLSX.writeFile(workbook, `ADMIN_STUDENT_RESULTS_${Date.now()}.xlsx`);
  };

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* SECTION BACK ARROW NAVIGATION BAR */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToTeacher}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer border border-amber-500/30"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>Back to Teacher Section</span>
          </button>

          {activeAdminTab !== 'overview' && (
            <button
              onClick={() => setActiveAdminTab('overview')}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-300"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>Back to Overview</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-bold text-slate-500 hidden sm:block">
            Admin Control • <span className="text-amber-600 uppercase font-black">{activeAdminTab}</span>
          </div>
          {onLogoutAdmin && (
            <button
              onClick={onLogoutAdmin}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Log out of Admin Portal"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out Admin</span>
            </button>
          )}
        </div>
      </div>

      {/* FOUNDER & ADMIN TOP BANNER */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-indigo-800/40">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0 group">
              <img
                src={adminProfile?.customPhotoBase64 || adminProfile?.photoUrl || '/admin_profile.jpg'}
                alt={adminProfile?.name || 'Mr. Bismark Twum, MPhil'}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover object-top border-2 border-amber-400/80 shadow-xl ring-4 ring-amber-400/20 transition-transform group-hover:scale-105"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.src = '/admin_profile.jpg';
                }}
              />
              <button
                onClick={() => setIsAdminProfileModalOpen(true)}
                title="Click to edit profile photo"
                className="absolute -bottom-1.5 -right-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 p-1.5 rounded-full shadow-lg border-2 border-slate-900 cursor-pointer transition-all hover:scale-110"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-amber-400/20 text-amber-300 text-[10px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider border border-amber-400/30 inline-flex items-center gap-1">
                  <Award className="w-3 h-3 text-amber-300" /> Educator & Founder Profile • {adminProfile?.qualification || 'MPhil'}
                </span>
                <button
                  onClick={() => setIsAdminProfileModalOpen(true)}
                  className="text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-white/10 hover:bg-white/15 px-2.5 py-0.5 rounded-lg border border-amber-400/30 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit Profile & Photo</span>
                </button>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white mt-1 truncate">
                Welcome, {adminProfile?.name || 'Mr. Bismark Twum, MPhil'}!
              </h1>
              <div className="text-xs sm:text-sm text-indigo-200/90 mt-1 leading-relaxed max-w-3xl flex items-center gap-2">
                <BrandLogo size="xs" variant="icon-only" className="w-4 h-4 shrink-0" />
                <span>{adminProfile?.title || 'Multiple Choice Assessment Hub initialized with real-time analytics, Word document import, and live surveillance.'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar inside Banner: Active Quizzes Counter & Quick Action Buttons */}
        <div className="mt-6 pt-4 border-t border-indigo-900/60 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs font-bold text-indigo-200">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" /> Active Quizzes: <strong className="text-amber-300 font-black text-sm">{activeQuizzesCount}</strong>
            </span>
            <span className="text-indigo-400">|</span>
            <span>
              Total Attempts: <strong className="text-white font-black text-sm">{totalSubmissions}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onCreateQuiz && (
              <button
                onClick={onCreateQuiz}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Quiz</span>
              </button>
            )}

            <button
              onClick={() => setActiveAdminTab('student-results')}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>Write Questions (Offline)</span>
            </button>

            {onOpenImporter && (
              <button
                onClick={onOpenImporter}
                className="px-4 py-2 bg-indigo-900/80 hover:bg-indigo-800 text-indigo-100 font-bold text-xs rounded-xl border border-indigo-400/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                <span>Upload Word Document</span>
              </button>
            )}

            <button
              onClick={onBackToTeacher}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl border border-white/20 transition-all cursor-pointer ml-auto"
            >
              Teacher View
            </button>
          </div>
        </div>

        {/* Horizontal Navigation Sub-Bar */}
        <div className="mt-6 pt-4 border-t border-indigo-900/50 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveAdminTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeAdminTab === 'overview'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Admin Overview</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('student-results')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeAdminTab === 'student-results'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Student Results & Progress</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('teacher-codes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeAdminTab === 'teacher-codes'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Teacher Access Codes</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('all-quizzes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeAdminTab === 'all-quizzes'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>All Quizzes Overview</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('surveillance')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeAdminTab === 'surveillance'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>System Surveillance</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('domain-links')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeAdminTab === 'domain-links'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <Globe className="w-4 h-4 text-amber-400" />
            <span>Isolated Domain Links</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('security-settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeAdminTab === 'security-settings'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Security & Access Locks</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('theme-palettes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeAdminTab === 'theme-palettes'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <Palette className="w-4 h-4 text-amber-400" />
            <span>5 Theme Palettes</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('admin-manual')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeAdminTab === 'admin-manual'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
            }`}
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>Admin Operations Manual (PDF)</span>
          </button>
        </div>
      </div>

      {/* 6 CORE METRIC WIDGETS (Exact layout from Image 1) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Metric 1: Total Quizzes */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Quizzes</span>
            <BookOpen className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-serif text-slate-900">{totalQuizzesCount}</span>
            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">Created across network</span>
          </div>
        </div>

        {/* Metric 2: Active Quizzes */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Active Quizzes</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-serif text-slate-900">{activeQuizzesCount}</span>
            <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">Currently open</span>
          </div>
        </div>

        {/* Metric 3: Total Students */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Students</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-serif text-slate-900">{totalSubmissions}</span>
            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">Unique takers</span>
          </div>
        </div>

        {/* Metric 4: Average Score */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Average Score</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-serif text-slate-900">{avgPercentage}%</span>
            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">Class average ({avgScore}/{avgMaxScoreNum})</span>
          </div>
        </div>

        {/* Metric 5: High / Low Score */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>High / Low Score</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-serif text-slate-900">
              {highestPct}% / {lowestPct}%
            </span>
            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">Score range</span>
          </div>
        </div>

        {/* Metric 6: Pass Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Pass Rate</span>
            <BarChart3 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-serif text-slate-900">{passRate}%</span>
            <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">Students passed</span>
          </div>
        </div>
      </div>

      {/* QUICK MANAGEMENT SHORTCUTS BAR (Image 2 style) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
            QUICK MANAGEMENT SHORTCUTS
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {onCreateQuiz && (
            <button
              onClick={onCreateQuiz}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-xl border border-amber-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-600" />
              <span>Create Quiz</span>
            </button>
          )}

          {onOpenImporter && (
            <button
              onClick={onOpenImporter}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-xl border border-amber-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-600" />
              <span>Upload Questions</span>
            </button>
          )}

          <button
            onClick={() => setActiveAdminTab('all-quizzes')}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-slate-600" />
            <span>Question Bank</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('surveillance')}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold rounded-xl border border-emerald-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Activity className="w-4 h-4 text-emerald-600" />
            <span>Live Monitor</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('student-results')}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold rounded-xl border border-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>Results & Analytics</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('theme-palettes')}
            className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold rounded-xl border border-purple-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Palette className="w-4 h-4 text-purple-600" />
            <span>5 Theme Palettes</span>
          </button>
        </div>
      </div>

      {/* CONTROL TAB 1: Admin Overview */}
      {activeAdminTab === 'overview' && (
        <div className="space-y-6">
          {/* Teacher Self-Registration Global Lock & Control Card */}
          <div className={`rounded-3xl border p-6 sm:p-7 shadow-xs transition-all ${
            systemSettings.isTeacherSelfRegistrationLocked
              ? 'bg-rose-50 border-rose-200'
              : 'bg-emerald-50 border-emerald-200'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    systemSettings.isTeacherSelfRegistrationLocked
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}>
                    {systemSettings.isTeacherSelfRegistrationLocked ? '🔒 REGISTRATION LOCKED' : '🔓 REGISTRATION UNLOCKED'}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    Global Teacher Access Policy
                  </span>
                </div>
                <h3 className="text-lg font-bold font-serif text-slate-900 flex items-center gap-2">
                  {systemSettings.isTeacherSelfRegistrationLocked ? (
                    <>
                      <Lock className="w-5 h-5 text-rose-600 shrink-0" />
                      <span>Teacher Workspace Self-Registration is LOCKED</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>Teacher Workspace Self-Registration is OPEN</span>
                    </>
                  )}
                </h3>
                <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                  {systemSettings.isTeacherSelfRegistrationLocked
                    ? 'New teachers are blocked from self-registering. They must obtain an authorized login code from you. Existing teachers can still log in with their assigned PIN.'
                    : 'Any teacher can register a new workspace using their email & password. You can manage, update, or revoke access anytime in Teacher Access Codes.'}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={handleToggleRegistrationLock}
                  disabled={lockToggleLoading}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                    systemSettings.isTeacherSelfRegistrationLocked
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  }`}
                  title="Toggle teacher workspace self-registration permission"
                >
                  {lockToggleLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : systemSettings.isTeacherSelfRegistrationLocked ? (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>Unlock Teacher Registration</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Lock Teacher Registration</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Isolated Domain Links Management (Exclusive to Admin) */}
          <IsolatedDomainLinksCard
            quizzes={quizzes}
            systemSettings={systemSettings}
            onUpdateSystemSettings={onUpdateSystemSettings}
          />

          {/* Your Assessments List (Image 2 style) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold font-serif text-slate-900">Your Assessments</h2>
                <p className="text-xs text-slate-500">Each quiz has its own unique student URL & live monitoring feed</p>
              </div>
              <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                {quizzes.length} total quizzes
              </span>
            </div>

            {quizzes.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">No Assessment Papers Created Yet</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    All sample quizzes have been cleared. You or registered faculty members can create assessments or import examination question papers.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={onOpenImporter}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Import Question Paper</span>
                  </button>
                  <button
                    onClick={onCreateQuiz}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Quiz</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {quizzes.map((q, idx) => (
                <div key={`admin-quiz-${q.id || q.code || idx}`} className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap text-xs font-bold">
                      <span className="bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-md font-mono border border-amber-200">
                        {q.code || q.id}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        q.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {(q.status || 'ACTIVE').toUpperCase()}
                      </span>
                      {Boolean(q.isQuestionPool) && (
                        <span className="bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Shuffle className="w-3 h-3 text-purple-700" />
                          Pool ({q.poolQuestionsToServe || 50}/{q.questions?.length || q.poolOriginalSize || 0})
                        </span>
                      )}
                      {Boolean(q.progressiveTabPenalty || q.enableTabSwitchPenalties) && (
                        <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-rose-600 animate-pulse" />
                          3-Strike Active
                        </span>
                      )}
                      {Boolean(
                        q.enforceSingleAttempt !== false &&
                        (q.enforceSingleAttempt || q.preventMultipleAttempts || (q.attemptsAllowed !== undefined && q.attemptsAllowed <= 1))
                      ) ? (
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          1 Attempt Only
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          Retakes Allowed
                        </span>
                      )}
                      <span className="bg-slate-200/80 text-slate-700 px-2.5 py-0.5 rounded-md">
                        {q.subject || 'Mathematics'} • {q.classGroup || 'General'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleCopyQuizUrl(q.id)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3 text-slate-500" />
                        <span>{copiedQuizId === q.id ? 'Copied URL!' : 'Copy URL'}</span>
                      </button>

                      {/* Edit Instructions */}
                      <button
                        onClick={() => {
                          setSelectedQuizForInstructions(q);
                          setIsInstructionsModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-xl border border-amber-200 transition-all flex items-center gap-1 cursor-pointer"
                        title="Edit 4-5 Bullet Point Instructions"
                      >
                        <FileText className="w-3 h-3 text-amber-600" />
                        <span>Instructions</span>
                      </button>

                      {/* 1-Click 3-Strike Tab Penalty Toggle */}
                      {onToggleTabPenalty && (
                        <button
                          onClick={() => onToggleTabPenalty(q.id || q.code || '')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1 cursor-pointer shadow-2xs ${
                            Boolean(q.progressiveTabPenalty || q.enableTabSwitchPenalties)
                              ? 'bg-rose-100 hover:bg-rose-200 text-rose-900 border-rose-300 ring-1 ring-rose-300'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                          }`}
                          title={
                            Boolean(q.progressiveTabPenalty || q.enableTabSwitchPenalties)
                              ? '3-Strike Penalty is ACTIVE: (-2m, -5m, auto-submit on 3rd tab switch). Click to DEACTIVATE.'
                              : '3-Strike Penalty is INACTIVE. Click to ACTIVATE (-2m, -5m, auto-submit on 3rd tab switch).'
                          }
                        >
                          {Boolean(q.progressiveTabPenalty || q.enableTabSwitchPenalties) ? (
                            <>
                              <ShieldAlert className="w-3 h-3 text-rose-600 animate-pulse" />
                              <span>3-Strike: <strong className="text-rose-800 underline">ON</strong></span>
                            </>
                          ) : (
                            <>
                              <Shield className="w-3 h-3 text-slate-400" />
                              <span>3-Strike: <span className="text-slate-500 font-semibold">OFF</span></span>
                            </>
                          )}
                        </button>
                      )}

                      {/* 1-Click Single Attempt Restriction Toggle */}
                      {onToggleAttemptLimit && (
                        <button
                          onClick={() => onToggleAttemptLimit(q.id || q.code || '')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1 cursor-pointer shadow-2xs ${
                            Boolean(
                              q.enforceSingleAttempt !== false &&
                              (q.enforceSingleAttempt || q.preventMultipleAttempts || (q.attemptsAllowed !== undefined && q.attemptsAllowed <= 1))
                            )
                              ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-emerald-300 ring-1 ring-emerald-300'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                          }`}
                          title={
                            Boolean(
                              q.enforceSingleAttempt !== false &&
                              (q.enforceSingleAttempt || q.preventMultipleAttempts || (q.attemptsAllowed !== undefined && q.attemptsAllowed <= 1))
                            )
                              ? 'Single Attempt is ENFORCED. Click to ALLOW retakes.'
                              : 'Multiple Attempts are ALLOWED. Click to ENFORCE 1 attempt.'
                          }
                        >
                          {Boolean(
                            q.enforceSingleAttempt !== false &&
                            (q.enforceSingleAttempt || q.preventMultipleAttempts || (q.attemptsAllowed !== undefined && q.attemptsAllowed <= 1))
                          ) ? (
                            <>
                              <ShieldCheck className="w-3 h-3 text-emerald-700" />
                              <span>1-Attempt: <strong className="text-emerald-900 underline">ON</strong></span>
                            </>
                          ) : (
                            <>
                              <Shield className="w-3 h-3 text-slate-400" />
                              <span>1-Attempt: <span className="text-slate-500 font-semibold">OFF</span></span>
                            </>
                          )}
                        </button>
                      )}

                      {/* 1-Click Lockdown Kiosk Toggle */}
                      {onToggleFullscreenLockdown && (
                        <button
                          onClick={() => onToggleFullscreenLockdown(q.id || q.code || '')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1 cursor-pointer shadow-2xs ${
                            Boolean(q.enableFullscreenLockdown)
                              ? 'bg-purple-100 hover:bg-purple-200 text-purple-900 border-purple-300 ring-1 ring-purple-300'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                          }`}
                          title={
                            Boolean(q.enableFullscreenLockdown)
                              ? 'Lockdown Kiosk is ACTIVE: Fullscreen forced, auxiliary keys frozen, linear exam mode (no back), per-question timer with audio warning, and auto-skip on tab switch. Click to DEACTIVATE.'
                              : 'Lockdown Kiosk is INACTIVE. Click to ACTIVATE Respondus-style lockdown (Fullscreen + Key Freeze + Linear Mode + Question Timer + Auto-skip on tab switch).'
                          }
                        >
                          {Boolean(q.enableFullscreenLockdown) ? (
                            <>
                              <Lock className="w-3 h-3 text-purple-700 animate-pulse" />
                              <span>Lockdown: <strong className="text-purple-900 underline">ON</strong></span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3 text-slate-400" />
                              <span>Lockdown: <span className="text-slate-500 font-semibold">OFF</span></span>
                            </>
                          )}
                        </button>
                      )}

                      <button
                        onClick={() => {
                          const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
                          const url = `${baseUrl}?portal=student&quiz=${encodeURIComponent(q.code || q.id)}`;
                          window.open(url, '_blank');
                        }}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open Quiz</span>
                      </button>

                      <button
                        onClick={() => setActiveAdminTab('surveillance')}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Activity className="w-3 h-3 text-emerald-600" />
                        <span>Monitor</span>
                      </button>

                      <button
                        onClick={() => setActiveAdminTab('student-results')}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs rounded-xl border border-indigo-200 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <BarChart3 className="w-3 h-3 text-indigo-600" />
                        <span>Results</span>
                      </button>

                      <button
                        onClick={() => onUpdateQuizStatus(q.id, q.status === 'active' ? 'paused' : 'active')}
                        className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors"
                        title={q.status === 'active' ? 'Pause Quiz' : 'Activate Quiz'}
                      >
                        {q.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => onDeleteQuiz(q.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Delete Quiz"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">{q.title || 'MCQ Assessment Paper'}</h3>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> Duration: {q.durationMinutes || 60} mins
                      </span>
                      <span>•</span>
                      <span>Questions: {q.totalQuestions || 40} ({q.totalMarks || 40} marks)</span>
                      <span>•</span>
                      <span>Attempts Allowed: {q.attemptsAllowed || 1}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Tab-Switch Integrity Active</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>

          {/* System Setup Form */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold font-serif text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" /> System Setup & Global Parameters
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Configure network title, default pass thresholds, auto-grading settings, and administrator parameters.
              </p>
            </div>

            {configSaveMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{configSaveMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Portal Network Title
                </label>
                <input
                  type="text"
                  value={networkTitle}
                  onChange={(e) => setNetworkTitle(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-medium bg-slate-50"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Primary Administrator Email
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="e.g. admin@school.edu"
                  className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-medium bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Default Quiz Time Limit (Minutes)
                </label>
                <input
                  type="number"
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-medium bg-slate-50"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Default Pass Benchmark Percentage (%)
                </label>
                <input
                  type="number"
                  value={defaultPassMark}
                  onChange={(e) => setDefaultPassMark(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-medium bg-slate-50"
                  required
                />
              </div>

              <div className="md:col-span-2 pt-2">
                <button
                  type="submit"
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Global Configuration</span>
                </button>
              </div>
            </form>
          </div>

          {/* Academic Direction & Platform Attribution Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-serif font-black text-sm">
                  ∑
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-serif">Assessment Platform</h3>
                  <p className="text-xs text-slate-500">Academic Direction & Platform Architecture</p>
                </div>
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 self-start sm:self-auto">
                v2.4.0 • Build 2026.04
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4" />
                  <span>Author & Development</span>
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-slate-900 text-sm">Designed and developed by Bismark Twum, MPhil</p>
                  <p className="text-slate-600 font-medium">Mathematics Educator | Mathematics Education Researcher | Teacher</p>
                </div>
                <div className="pt-2 flex items-center gap-2">
                  <a
                    href="mailto:twumbismark90@gmail.com"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-xs"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>twumbismark90@gmail.com</span>
                  </a>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <BookCheck className="w-4 h-4 text-emerald-600" />
                  <span>Pedagogical Purpose</span>
                </div>
                <p className="text-slate-700 leading-relaxed font-medium">
                  A technology-enhanced platform designed to support digital mathematics assessment, question delivery, assessment administration, and student performance management.
                </p>
                <p className="text-[11px] text-slate-500 leading-normal">
                  All metrics, item analyses, and response timings reflect actual student submissions in the active deployment database.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTROL TAB 2: All Student Results & Progress (Image 2) */}
      {activeAdminTab === 'student-results' && (
        <ResultsDetailedAnalyticsView
          quizzes={quizzes}
          submissions={submissions}
          isAdmin={true}
          onOpenEmailFeedback={onOpenEmailFeedback}
          onDeleteSubmission={onDeleteSubmission}
          onClearAllSubmissions={onClearAllSubmissions}
        />
      )}

      {/* CONTROL TAB 3: Teacher Access Codes (Exclusive Admin Right) */}
      {activeAdminTab === 'teacher-codes' && (
        <div className="space-y-6">
          {/* Teacher Self-Registration Global Lock & Control Card */}
          <div className={`rounded-3xl border p-6 sm:p-7 shadow-sm transition-all ${
            systemSettings.isTeacherSelfRegistrationLocked
              ? 'bg-rose-950/20 border-rose-500/40'
              : 'bg-emerald-950/20 border-emerald-500/40'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    systemSettings.isTeacherSelfRegistrationLocked
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {systemSettings.isTeacherSelfRegistrationLocked ? '🔒 REGISTRATION LOCKED' : '🔓 REGISTRATION UNLOCKED'}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">
                    Global Teacher Access Policy
                  </span>
                </div>
                <h3 className="text-lg font-bold font-serif text-slate-900 flex items-center gap-2">
                  {systemSettings.isTeacherSelfRegistrationLocked ? (
                    <>
                      <Lock className="w-5 h-5 text-rose-600 shrink-0" />
                      <span>Teacher Workspace Self-Registration is LOCKED</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>Teacher Workspace Self-Registration is OPEN</span>
                    </>
                  )}
                </h3>
                <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                  {systemSettings.isTeacherSelfRegistrationLocked
                    ? 'When locked, new teachers cannot set themselves up through the portal and must contact you for an access code. Existing faculty can still log in with their assigned PIN.'
                    : 'When open, any teacher can create their own isolated space via "New Teacher Workspace". Any self-registered teacher will automatically appear below in this roster for you to manage, change their code, or revoke.'}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={handleToggleRegistrationLock}
                  disabled={lockToggleLoading}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                    systemSettings.isTeacherSelfRegistrationLocked
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  }`}
                  title="Toggle teacher workspace self-registration permission"
                >
                  {lockToggleLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : systemSettings.isTeacherSelfRegistrationLocked ? (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>Unlock Teacher Registration</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Lock Teacher Registration</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Code Generator Form */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                  Admin Right Exclusive
                </span>
                <h2 className="text-lg font-bold font-serif text-slate-900 mt-1 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-amber-600" /> Create Teacher Access Code (Manual Setup)
                </h2>
                <p className="text-xs text-slate-500">
                  Create a unique login access code for a teacher to log into their isolated workspace.
                </p>
              </div>
            </div>

            {generatedSuccessMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{generatedSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleGenerateCode} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Teacher Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Mrs. Abigail Addo"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-slate-50"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Teacher Email Address</label>
                <input
                  type="email"
                  placeholder="abigail.addo@joymcq.edu.gh"
                  value={newTeacherEmail}
                  onChange={(e) => setNewTeacherEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-slate-50"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department</label>
                <select
                  value={newTeacherDept}
                  onChange={(e) => setNewTeacherDept(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-slate-50 font-medium"
                >
                  <option value="Mathematics & Computing">Mathematics & Computing</option>
                  <option value="Pure Mathematics">Pure Mathematics</option>
                  <option value="Integrated Science">Integrated Science</option>
                  <option value="General Physics">General Physics</option>
                  <option value="Social Studies & English">Social Studies & English</option>
                </select>
              </div>

              <div className="sm:col-span-3 pt-2">
                <button
                  type="submit"
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Generate Teacher Access Code</span>
                </button>
              </div>
            </form>
          </div>

          {/* Teacher Access Codes Directory */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold font-serif text-slate-900">Faculty Roster & Access Codes</h3>
                <p className="text-xs text-slate-500">
                  All teachers set up by you or self-registered appear here. You can change PINs, revoke access, or regenerate codes.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Filter Pills */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  <button
                    onClick={() => setTeacherFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      teacherFilter === 'all'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All ({teacherAccessCodes.length})
                  </button>
                  <button
                    onClick={() => setTeacherFilter('self-registered')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      teacherFilter === 'self-registered'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Self-Registered ({teacherAccessCodes.filter((t) => t.source === 'self-registered').length})
                  </button>
                  <button
                    onClick={() => setTeacherFilter('admin-created')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      teacherFilter === 'admin-created'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Admin-Created ({teacherAccessCodes.filter((t) => t.source !== 'self-registered').length})
                  </button>
                  <button
                    onClick={() => setTeacherFilter('revoked')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      teacherFilter === 'revoked'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Revoked ({teacherAccessCodes.filter((t) => t.status === 'revoked').length})
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search code or teacher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 uppercase font-semibold text-[11px]">
                    <th className="py-3 px-4">Teacher Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Origin / Setup</th>
                    <th className="py-3 px-4">Access PIN / Code</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teacherAccessCodes
                    .filter((tc) => {
                      if (teacherFilter === 'self-registered' && tc.source !== 'self-registered') return false;
                      if (teacherFilter === 'admin-created' && tc.source === 'self-registered') return false;
                      if (teacherFilter === 'revoked' && tc.status !== 'revoked') return false;
                      return true;
                    })
                    .filter(
                      (tc) =>
                        tc.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        tc.teacherEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        tc.code.includes(searchQuery) ||
                        (tc.pin && tc.pin.includes(searchQuery))
                    )
                    .map((tc, idx) => (
                      <tr key={`tc-${tc.id || idx}`} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{tc.teacherName}</td>
                        <td className="py-3.5 px-4 text-slate-600 font-mono">{tc.teacherEmail}</td>
                        <td className="py-3.5 px-4 text-slate-700">{tc.department}</td>
                        <td className="py-3.5 px-4">
                          {tc.source === 'self-registered' ? (
                            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 w-max">
                              <GraduationCap className="w-3 h-3 text-indigo-600" />
                              Self-Registered
                            </span>
                          ) : (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 w-max">
                              <ShieldCheck className="w-3 h-3 text-amber-600" />
                              Admin-Created
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold bg-amber-50 text-amber-900 px-3 py-1 rounded-lg border border-amber-200 tracking-wider">
                            {tc.code || tc.pin}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {tc.status === 'active' ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                              Active
                            </span>
                          ) : (
                            <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-rose-200">
                              Revoked
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {/* Change / Edit Code Button */}
                          <button
                            onClick={() => handleOpenEditTeacherModal(tc)}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition-all inline-flex items-center gap-1 cursor-pointer shadow-xs"
                            title="Change this teacher's login code or info"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Change Code</span>
                          </button>

                          <button
                            onClick={() => handleCopyCode(tc.id, tc.code || tc.pin || '')}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="Copy Code"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedCodeId === tc.id ? 'Copied!' : 'Copy'}</span>
                          </button>

                          <button
                            onClick={() => onRegenerateTeacherCode(tc.id)}
                            className="px-2 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-lg transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="Regenerate Random Code"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>New</span>
                          </button>

                          <button
                            onClick={() => onRevokeTeacherCode(tc.id)}
                            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                              tc.status === 'active'
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                            title={tc.status === 'active' ? 'Revoke login access immediately' : 'Re-activate login access'}
                          >
                            {tc.status === 'active' ? 'Revoke' : 'Activate'}
                          </button>

                          <button
                            onClick={() => onDeleteTeacherCode(tc.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                            title="Delete Teacher Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONTROL TAB 4: All Quizzes Overview */}
      {activeAdminTab === 'all-quizzes' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold font-serif text-slate-900">
                All Faculty Quizzes Overview
              </h2>
              <p className="text-xs text-slate-500">
                Administrative oversight of all active and archived assessments across all teachers.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {quizzes.length > 0 && onClearAllQuizzes && (
                <button
                  onClick={() => setIsClearAllQuizzesModalOpen(true)}
                  className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete / Clear All Quizzes</span>
                </button>
              )}
              <button
                onClick={onOpenImporter}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Import Question Paper</span>
              </button>
            </div>
          </div>

          {quizzes.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
              <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">No Assessment Papers Found</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  The quiz repository is empty. Create a new assessment or import questions from past papers to get started.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={onOpenImporter}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Import Question Paper</span>
                </button>
                <button
                  onClick={onCreateQuiz}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Quiz</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 uppercase font-semibold text-[11px]">
                    <th className="py-3 px-4">Quiz Code & Title</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Teacher Name</th>
                    <th className="py-3 px-4">Questions</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quizzes.map((q, idx) => (
                    <tr key={`admin-qrow-${q.id || q.code || idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{q.title || 'MCQ Paper'}</span>
                        <span className="text-[10px] font-mono text-slate-500">{q.code || q.id}</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{q.subject}</td>
                      <td className="py-3.5 px-4 text-slate-800">{q.teacherName || 'Mr. Bismark Twum'}</td>
                      <td className="py-3.5 px-4 font-bold text-indigo-600">{q.totalQuestions} Questions</td>
                      <td className="py-3.5 px-4 text-slate-600">{q.durationMinutes || 60} Mins</td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              q.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : q.status === 'paused'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {(q.status || 'active').toUpperCase()}
                          </span>
                          {Boolean(q.progressiveTabPenalty || q.enableTabSwitchPenalties) && (
                            <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                              <ShieldAlert className="w-2.5 h-2.5 text-rose-600 animate-pulse" />
                              3-Strike
                            </span>
                          )}
                          {Boolean(
                            q.enforceSingleAttempt !== false &&
                            (q.enforceSingleAttempt || q.preventMultipleAttempts || (q.attemptsAllowed !== undefined && q.attemptsAllowed <= 1))
                          ) && (
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                              <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                              1 Attempt
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {onToggleTabPenalty && (
                          <button
                            onClick={() => onToggleTabPenalty(q.id || q.code || '')}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 border ${
                              Boolean(q.progressiveTabPenalty || q.enableTabSwitchPenalties)
                                ? 'bg-rose-100 hover:bg-rose-200 text-rose-900 border-rose-300'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                            }`}
                            title="Toggle 3-Strike Tab Penalty (-2m, -5m, auto-submit)"
                          >
                            {Boolean(q.progressiveTabPenalty || q.enableTabSwitchPenalties) ? (
                              <>
                                <ShieldAlert className="w-3 h-3 text-rose-600 animate-pulse" />
                                <span>3-Strike: ON</span>
                              </>
                            ) : (
                              <>
                                <Shield className="w-3 h-3 text-slate-400" />
                                <span>3-Strike: OFF</span>
                              </>
                            )}
                          </button>
                        )}

                        {onToggleAttemptLimit && (
                          <button
                            onClick={() => onToggleAttemptLimit(q.id || q.code || '')}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 border ${
                              Boolean(
                                q.enforceSingleAttempt !== false &&
                                (q.enforceSingleAttempt || q.preventMultipleAttempts || (q.attemptsAllowed !== undefined && q.attemptsAllowed <= 1))
                              )
                                ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-emerald-300'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                            }`}
                            title="Toggle Single Attempt Restriction (1 attempt vs multiple retakes)"
                          >
                            {Boolean(
                              q.enforceSingleAttempt !== false &&
                              (q.enforceSingleAttempt || q.preventMultipleAttempts || (q.attemptsAllowed !== undefined && q.attemptsAllowed <= 1))
                            ) ? (
                              <>
                                <ShieldCheck className="w-3 h-3 text-emerald-700" />
                                <span>1-Attempt: ON</span>
                              </>
                            ) : (
                              <>
                                <Shield className="w-3 h-3 text-slate-400" />
                                <span>1-Attempt: OFF</span>
                              </>
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setSelectedQuizForInstructions(q);
                            setIsInstructionsModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 border border-amber-200"
                          title="Edit 4-5 Bullet Point Instructions"
                        >
                          <FileText className="w-3.5 h-3.5 text-amber-600" />
                          <span>Instructions</span>
                        </button>

                        <button
                          onClick={() =>
                            onUpdateQuizStatus(q.id || '', q.status === 'active' ? 'paused' : 'active')
                          }
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg transition-all cursor-pointer"
                        >
                          {q.status === 'active' ? 'Pause Quiz' : 'Activate'}
                        </button>

                        <button
                          onClick={() => onDeleteQuiz(q.id || '')}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Delete Quiz"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CONTROL TAB 5: System Surveillance (Image 1) */}
      {activeAdminTab === 'surveillance' && (
        <LiveStudentMonitoringView
          quizzes={quizzes}
          submissions={submissions}
          onOpenEmailFeedback={onOpenEmailFeedback}
          onDeleteSubmission={onDeleteSubmission}
          onSyncWithServer={onSyncWithServer}
        />
      )}

      {/* CONTROL TAB 6: Isolated Domain Links (Exclusive to Admin) */}
      {activeAdminTab === 'domain-links' && (
        <div className="space-y-6">
          <IsolatedDomainLinksCard
            quizzes={quizzes}
            systemSettings={systemSettings}
            onUpdateSystemSettings={onUpdateSystemSettings}
          />
        </div>
      )}

      {/* CONTROL TAB 7: Multi-Layer Security & Access Locks */}
      {activeAdminTab === 'security-settings' && (
        <AdminSecurityPanel
          systemSettings={systemSettings}
          onUpdateSystemSettings={async (updates) => {
            if (onUpdateSystemSettings) {
              await onUpdateSystemSettings(updates);
            }
          }}
        />
      )}

      {/* CONTROL TAB 8: 5 Synchronized Institutional Theme Palettes */}
      {activeAdminTab === 'theme-palettes' && (
        <ThemePaletteSelector
          currentThemeId={systemSettings?.activeThemeId}
          onSelectTheme={async (themeId) => {
            if (onUpdateSystemSettings) {
              await onUpdateSystemSettings({ activeThemeId: themeId });
            }
          }}
        />
      )}

      {/* CONTROL TAB 9: Official Platform Operations & Architecture Manual (Exclusive to Admin) */}
      {activeAdminTab === 'admin-manual' && (
        <AdminManual 
          onNavigateTab={(tab) => setActiveAdminTab(tab)}
          adminProfile={adminProfile}
          systemSettings={systemSettings}
          onSaveAdminProfile={onSaveAdminProfile}
          onUpdateSystemSettings={onUpdateSystemSettings}
        />
      )}

      {/* Delete Single Student Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-serif">Delete Student Result?</h3>
              <p className="text-xs text-slate-600 mt-1">
                Are you sure you want to permanently delete the submission record for{' '}
                <strong className="text-slate-900">{studentToDelete.studentName}</strong> ({studentToDelete.studentId})?
                This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteStudent}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Delete Result
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Results Confirmation Modal */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-serif">Clear All Test Results?</h3>
              <p className="text-xs text-slate-600 mt-1">
                Are you sure you want to clear <strong>ALL</strong> student submission records for the current test view?
                This will reset the class roster and clear all analytics.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsClearAllModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClearAll}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Clear All Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Quizzes Confirmation Modal */}
      {isClearAllQuizzesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-serif">Delete All Assessment Papers?</h3>
              <p className="text-xs text-slate-600 mt-1">
                Are you sure you want to permanently delete <strong>ALL {quizzes.length}</strong> quizzes from the platform?
                This will delete them from the cloud database, remove all quiz codes, and clear the repository. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsClearAllQuizzesModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onClearAllQuizzes) {
                    onClearAllQuizzes();
                  }
                  setIsClearAllQuizzesModalOpen(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Yes, Delete All Quizzes
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

      {/* Edit Instructions Modal for Admin */}
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

      {/* Edit / Change Teacher Code Modal */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-serif text-slate-900">Change Teacher Access Code</h3>
                  <p className="text-[11px] text-slate-500">
                    {editingTeacher.source === 'self-registered' ? 'Self-Registered Teacher Space' : 'Admin-Provisioned Teacher Space'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingTeacher(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTeacher} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Teacher Full Name</label>
                <input
                  type="text"
                  value={editTeacherName}
                  onChange={(e) => setEditTeacherName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-slate-50 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Teacher Email Address</label>
                <input
                  type="text"
                  value={editingTeacher.teacherEmail}
                  disabled
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Email is tied to teacher workspace identity.</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  value={editTeacherDept}
                  onChange={(e) => setEditTeacherDept(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-slate-50"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">Access Code / PIN</label>
                  <button
                    type="button"
                    onClick={() => {
                      const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();
                      setEditTeacherCode(randomDigits);
                    }}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-800 cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate Random PIN</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={editTeacherCode}
                  onChange={(e) => setEditTeacherCode(e.target.value)}
                  placeholder="e.g. 4829 or custom PIN"
                  className="w-full p-3 rounded-xl border border-amber-300 bg-amber-50/50 font-mono text-base font-bold tracking-widest text-amber-950 focus:ring-2 focus:ring-amber-500"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  The teacher will use this code/PIN to log into their workspace.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Update Code</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Profile & Photo Editor Modal */}
      {isAdminProfileModalOpen && (
        <AdminProfileModal
          isOpen={isAdminProfileModalOpen}
          onClose={() => setIsAdminProfileModalOpen(false)}
          adminProfile={adminProfile}
          systemSettings={systemSettings}
          onUpdateSystemSettings={onUpdateSystemSettings}
          onSaveProfile={async (updated) => {
            if (onSaveAdminProfile) {
              await onSaveAdminProfile(updated);
            }
          }}
        />
      )}
    </div>
  );
};
