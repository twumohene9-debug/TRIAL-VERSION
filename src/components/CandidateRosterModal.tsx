import React, { useState, useRef, useMemo } from 'react';
import {
  X,
  UploadCloud,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Search,
  ShieldCheck,
  ShieldAlert,
  Users,
  FileSpreadsheet,
  Lock,
  Unlock,
  RefreshCw,
  UserCheck,
  Info
} from 'lucide-react';
import { QuizConfig, RosterStudent, StudentSubmission } from '../types';
import {
  parseStudentRosterFile,
  generateRosterTemplateExcel,
  generateRosterTemplateCsv,
  exportRosterWithSubmissionsExcel,
  downloadQuizStudentListExcel,
  RosterParseResult
} from '../utils/rosterParser';

interface CandidateRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: QuizConfig | null;
  submissions?: StudentSubmission[];
  onSaveRoster: (
    quizId: string,
    updatedRoster: RosterStudent[],
    accessMode: 'open' | 'restricted',
    validationField: 'id_only' | 'email_only' | 'id_or_email' | 'both'
  ) => void;
}

export const CandidateRosterModal: React.FC<CandidateRosterModalProps> = ({
  isOpen,
  onClose,
  quiz,
  submissions = [],
  onSaveRoster,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [roster, setRoster] = useState<RosterStudent[]>(() => quiz?.studentRoster || []);
  const [accessMode, setAccessMode] = useState<'open' | 'restricted'>(() => quiz?.accessMode || 'open');
  const [validationField, setValidationField] = useState<'id_only' | 'email_only' | 'id_or_email' | 'both'>(
    () => quiz?.rosterValidationField || 'id_or_email'
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'absent'>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<RosterParseResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Manual Add Candidate Form State
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualId, setManualId] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualClass, setManualClass] = useState('');
  const [manualError, setManualError] = useState('');

  // Update internal state whenever active quiz changes
  React.useEffect(() => {
    if (quiz) {
      setRoster(quiz.studentRoster || []);
      setAccessMode(quiz.accessMode || (quiz.studentRoster && quiz.studentRoster.length > 0 ? 'restricted' : 'open'));
      setValidationField(quiz.rosterValidationField || 'id_or_email');
      setUploadResult(null);
    }
  }, [quiz]);

  // Map submissions to candidates for live attendance & status reconciliation
  const candidateStatusMap = useMemo(() => {
    const map = new Map<string, StudentSubmission>();
    const currentQuizId = (quiz?.id || quiz?.code || '').trim().toLowerCase();

    submissions.forEach((sub) => {
      const subQuizId = (sub.quizId || sub.quizCode || '').trim().toLowerCase();
      // Match quiz ID if specified, or match generally
      if (currentQuizId && subQuizId && subQuizId !== currentQuizId) return;

      const normId = (sub.studentId || '').trim().toUpperCase();
      const normEmail = (sub.studentEmail || '').trim().toLowerCase();
      const normName = (sub.studentName || '').trim().toLowerCase();

      if (normId) map.set(`id:${normId}`, sub);
      if (normEmail) map.set(`email:${normEmail}`, sub);
      if (normName) map.set(`name:${normName}`, sub);
    });

    return map;
  }, [submissions, quiz]);

  // Calculate live statistics
  const stats = useMemo(() => {
    const total = roster.length;
    let submittedCount = 0;

    roster.forEach((student) => {
      const idKey = `id:${student.studentId.trim().toUpperCase()}`;
      const emailKey = student.email ? `email:${student.email.trim().toLowerCase()}` : '';
      const nameKey = `name:${student.name.trim().toLowerCase()}`;

      if (candidateStatusMap.has(idKey) || (emailKey && candidateStatusMap.has(emailKey)) || candidateStatusMap.has(nameKey)) {
        submittedCount++;
      }
    });

    const absentCount = Math.max(0, total - submittedCount);
    return { total, submittedCount, absentCount };
  }, [roster, candidateStatusMap]);

  // Filtered roster list
  const filteredRoster = useMemo(() => {
    return roster.filter((student) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        student.name.toLowerCase().includes(q) ||
        student.studentId.toLowerCase().includes(q) ||
        (student.email && student.email.toLowerCase().includes(q)) ||
        (student.classGroup && student.classGroup.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;

      const idKey = `id:${student.studentId.trim().toUpperCase()}`;
      const emailKey = student.email ? `email:${student.email.trim().toLowerCase()}` : '';
      const isSubmitted = candidateStatusMap.has(idKey) || (emailKey && candidateStatusMap.has(emailKey));

      if (statusFilter === 'submitted') return isSubmitted;
      if (statusFilter === 'absent') return !isSubmitted;

      return true;
    });
  }, [roster, searchQuery, statusFilter, candidateStatusMap]);

  // File Upload Handler
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const result = await parseStudentRosterFile(file);
      setUploadResult(result);

      if (result.success && result.students.length > 0) {
        // Merge or replace options: we append unique new students to existing roster
        setRoster((prev) => {
          const existingIds = new Set(prev.map((s) => s.studentId.trim().toUpperCase()));
          const existingEmails = new Set(prev.map((s) => (s.email || '').trim().toLowerCase()).filter(Boolean));

          const newUnique = result.students.filter((s) => {
            const normId = s.studentId.trim().toUpperCase();
            const normEmail = (s.email || '').trim().toLowerCase();
            return !existingIds.has(normId) && (!normEmail || !existingEmails.has(normEmail));
          });

          return [...prev, ...newUnique];
        });

        // Automatically switch access mode to restricted if teacher uploaded a roster
        setAccessMode('restricted');
      }
    } catch (err: any) {
      setUploadResult({
        success: false,
        students: [],
        totalParsed: 0,
        validCount: 0,
        duplicateCount: 0,
        warnings: [],
        errors: [`Processing failed: ${err?.message || 'Unknown error'}`],
        detectedColumns: {},
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Add Single Student Manually
  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError('');

    const cleanName = manualName.trim();
    const cleanId = manualId.trim().toUpperCase();
    const cleanEmail = manualEmail.trim().toLowerCase();
    const cleanClass = manualClass.trim();

    if (!cleanName) {
      setManualError('Candidate full name is required.');
      return;
    }

    if (!cleanId && !cleanEmail) {
      setManualError('Please provide either a Student ID / Roll No or Email Address.');
      return;
    }

    // Check duplicate
    const exists = roster.some(
      (s) =>
        (cleanId && s.studentId.trim().toUpperCase() === cleanId) ||
        (cleanEmail && s.email && s.email.trim().toLowerCase() === cleanEmail)
    );

    if (exists) {
      setManualError(`A student with this ID (${cleanId || cleanEmail}) is already on the roster.`);
      return;
    }

    const newStudent: RosterStudent = {
      id: `ros-man-${Date.now()}`,
      name: cleanName,
      studentId: cleanId || (cleanEmail ? cleanEmail.split('@')[0].toUpperCase() : `ID-${Date.now()}`),
      email: cleanEmail || undefined,
      classGroup: cleanClass || undefined,
      addedAt: new Date().toISOString(),
      status: 'not_started',
      attemptAllowed: true,
    };

    setRoster((prev) => [newStudent, ...prev]);
    setManualName('');
    setManualId('');
    setManualEmail('');
    setManualClass('');
    setIsAddingManual(false);
    setAccessMode('restricted');
  };

  // Toggle Attempt Allowed (Teacher Retake Unlock Override)
  const handleToggleAttemptAllowed = (studentId: string) => {
    setRoster((prev) =>
      prev.map((s) => {
        if (s.id === studentId || s.studentId === studentId) {
          return {
            ...s,
            attemptAllowed: s.attemptAllowed === false ? true : false,
          };
        }
        return s;
      })
    );
  };

  // Remove Single Student
  const handleRemoveStudent = (studentId: string) => {
    setRoster((prev) => prev.filter((s) => s.id !== studentId && s.studentId !== studentId));
  };

  // Clear All
  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all students from this exam roster?')) {
      setRoster([]);
      setUploadResult(null);
    }
  };

  // Save changes
  const handleSaveAndApply = () => {
    if (!quiz) return;
    const targetQuizId = quiz.id || quiz.code || '';
    onSaveRoster(targetQuizId, roster, accessMode, validationField);
    onClose();
  };

  if (!isOpen || !quiz) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-5xl my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">Candidate Roster &amp; Access Control</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 font-mono font-bold border border-slate-700">
                  {quiz.code || quiz.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {quiz.title || 'Examination Assessment'} • Restrict or authorize candidates via Excel / CSV upload
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* Access Policy Configuration Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Examination Access Policy
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose whether this assessment is open to anyone or strictly gated behind the uploaded student roster.
                </p>
              </div>

              {/* Toggle Mode */}
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setAccessMode('open')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    accessMode === 'open'
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Open Access
                </button>
                <button
                  type="button"
                  onClick={() => setAccessMode('restricted')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    accessMode === 'restricted'
                      ? 'bg-amber-500 text-slate-950 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Restricted (Roster Enforced)</span>
                </button>
              </div>
            </div>

            {/* Validation Rule Selector */}
            {accessMode === 'restricted' && (
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                <div className="flex items-center gap-2 text-amber-900">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Strict Verification:</strong> Candidates must provide matching credentials to enter.
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="validation-key-select" className="text-slate-700 font-semibold whitespace-nowrap">Validation Key:</label>
                  <select
                    id="validation-key-select"
                    value={validationField}
                    onChange={(e: any) => setValidationField(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="id_or_email">Student ID OR Email Address (Recommended)</option>
                    <option value="id_only">Student ID / Roll No Only</option>
                    <option value="email_only">Student Email Only</option>
                    <option value="both">Both Student ID &amp; Email Required</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Upload & Template Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Upload Area */}
            <div
              className={`md:col-span-2 border-2 border-dashed rounded-2xl p-5 text-center transition-all bg-white flex flex-col items-center justify-center gap-2.5 ${
                isDragging ? 'border-amber-500 bg-amber-50/50' : 'border-slate-300 hover:border-slate-400'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />

              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                <UploadCloud className="w-6 h-6" />
              </div>

              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-800">
                  Upload Student Roster Spreadsheets
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Supports Microsoft Excel (<code className="font-semibold text-slate-700">.xlsx</code>,{' '}
                  <code className="font-semibold text-slate-700">.xls</code>) or{' '}
                  <code className="font-semibold text-slate-700">.csv</code> format
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Parsing Roster...</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                      <span>Select File to Upload</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Template & Manual Add Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-2xs">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-emerald-600" />
                  Excel Candidate Template
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Download an Excel template with <strong>Candidate Name</strong>, <strong>Student ID</strong>, and <strong>Email</strong>.
                </p>
                <div className="mt-2 p-2 bg-slate-50 rounded-xl border border-slate-200 text-[10.5px] text-slate-600 leading-normal">
                  <span className="font-semibold text-slate-800">Flexible Upload:</span> You are not restricted to this template alone. You can prepare and upload your own school spreadsheet in any column layout.
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => generateRosterTemplateExcel(quiz?.title || quiz?.code)}
                  className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                  title="Download clean Excel template with Name, Student ID, and Email"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Download Excel Template (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={generateRosterTemplateCsv}
                  className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  title="Download clean CSV template"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download CSV Template (.csv)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Upload Feedback / Warning Banner */}
          {uploadResult && (
            <div
              className={`p-4 rounded-2xl border text-xs ${
                uploadResult.success
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50/70 border-rose-200 text-rose-950'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {uploadResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-1">
                  <div className="font-bold flex items-center gap-2">
                    <span>
                      {uploadResult.success
                        ? `Successfully parsed ${uploadResult.validCount} candidate records!`
                        : 'Upload parsing encountered issues'}
                    </span>
                    {uploadResult.duplicateCount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 bg-amber-100 border border-amber-300 text-amber-900 rounded-full font-bold">
                        {uploadResult.duplicateCount} duplicate IDs skipped
                      </span>
                    )}
                  </div>

                  {uploadResult.detectedColumns && (
                    <div className="text-[11px] text-slate-600 flex flex-wrap gap-2 pt-0.5">
                      <span>Detected columns:</span>
                      {uploadResult.detectedColumns.idCol && (
                        <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-800 font-mono">
                          ID: {uploadResult.detectedColumns.idCol}
                        </span>
                      )}
                      {uploadResult.detectedColumns.nameCol && (
                        <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-800 font-mono">
                          Name: {uploadResult.detectedColumns.nameCol}
                        </span>
                      )}
                      {uploadResult.detectedColumns.emailCol && (
                        <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-800 font-mono">
                          Email: {uploadResult.detectedColumns.emailCol}
                        </span>
                      )}
                    </div>
                  )}

                  {uploadResult.warnings.length > 0 && (
                    <ul className="text-[11px] text-amber-800 list-disc list-inside space-y-0.5 pt-1">
                      {uploadResult.warnings.slice(0, 3).map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                      {uploadResult.warnings.length > 3 && (
                        <li>...and {uploadResult.warnings.length - 3} more minor notices.</li>
                      )}
                    </ul>
                  )}

                  {uploadResult.errors.length > 0 && (
                    <ul className="text-[11px] text-rose-800 list-disc list-inside space-y-0.5 pt-1">
                      {uploadResult.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Roster Table Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
            {/* Table Control Header */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-slate-600" />
                  Roster Table ({roster.length} Candidates)
                </span>

                {/* Live Attendance Pills */}
                {roster.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                      {stats.submittedCount} Submitted
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-200">
                      {stats.absentCount} Absent / Pending
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsAddingManual(!isAddingManual)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isAddingManual ? 'Cancel Manual Add' : 'Add Candidate'}</span>
                </button>

                {roster.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (quiz) {
                          downloadQuizStudentListExcel({
                            ...quiz,
                            studentRoster: roster,
                          }, submissions);
                        }
                      }}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      title="Download the full list of students having access to this quiz as an Excel spreadsheet"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Download Student List ({roster.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => exportRosterWithSubmissionsExcel(roster, submissions, quiz?.title || quiz?.code || '')}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Export roster with live marks & attendance to Excel"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Export Roster Report</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
                      title="Clear roster"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Clear All</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Manual Candidate Input Form */}
            {isAddingManual && (
              <form onSubmit={handleAddManual} className="p-4 bg-amber-50/70 border-b border-amber-200 space-y-3">
                <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-amber-700" />
                  <span>Add Individual Candidate to Roster</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Full Name <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="e.g. Kwame Mensah"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Student ID / Roll No <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={manualId}
                      onChange={(e) => setManualId(e.target.value)}
                      placeholder="e.g. SDA-2026-042"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      placeholder="e.g. kwame@school.edu"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Class / Stream</label>
                    <input
                      type="text"
                      value={manualClass}
                      onChange={(e) => setManualClass(e.target.value)}
                      placeholder="e.g. SHS 2 Science A"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {manualError && (
                  <p className="text-xs text-rose-700 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{manualError}</span>
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingManual(false)}
                    className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs cursor-pointer shadow-2xs"
                  >
                    Save Candidate
                  </button>
                </div>
              </form>
            )}

            {/* Search and Filters */}
            {roster.length > 0 && (
              <div className="p-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search candidate by name, ID, or class..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-500 font-medium">Filter:</span>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All ({roster.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('submitted')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      statusFilter === 'submitted'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    Submitted ({stats.submittedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('absent')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      statusFilter === 'absent'
                        ? 'bg-slate-700 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Absent ({stats.absentCount})
                  </button>
                </div>
              </div>
            )}

            {/* Candidates Table */}
            {filteredRoster.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <Users className="w-8 h-8 mx-auto text-slate-400 stroke-1" />
                <p className="text-xs font-semibold">
                  {roster.length === 0
                    ? 'No candidates registered on this exam roster yet.'
                    : 'No candidates matched your search criteria.'}
                </p>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                  {roster.length === 0
                    ? 'Upload an Excel or CSV file containing your student list, or add individual students manually above.'
                    : 'Try clearing the search query or changing the attendance filter.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[380px]">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">#</th>
                      <th className="py-2.5 px-3">Candidate Full Name</th>
                      <th className="py-2.5 px-3">Student ID / Roll No</th>
                      <th className="py-2.5 px-3">Email Address</th>
                      <th className="py-2.5 px-3">Class / Stream</th>
                      <th className="py-2.5 px-3 text-center">Exam Status</th>
                      <th className="py-2.5 px-3 text-center">Attempt Access</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRoster.map((student, idx) => {
                      const idKey = `id:${student.studentId.trim().toUpperCase()}`;
                      const emailKey = student.email ? `email:${student.email.trim().toLowerCase()}` : '';
                      const nameKey = `name:${student.name.trim().toLowerCase()}`;

                      const sub =
                        candidateStatusMap.get(idKey) ||
                        (emailKey ? candidateStatusMap.get(emailKey) : undefined) ||
                        candidateStatusMap.get(nameKey);

                      const isSubmitted = Boolean(sub);

                      return (
                        <tr key={student.id || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {student.name}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                            {student.studentId}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                            {student.email || <span className="text-slate-300 italic">None</span>}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                            {student.classGroup || <span className="text-slate-300 italic">Default</span>}
                          </td>

                          {/* Live Exam Status */}
                          <td className="py-2.5 px-3 text-center">
                            {isSubmitted && sub ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-900 font-bold text-[10px]">
                                  Submitted ({sub.totalScore}/{sub.maxScore})
                                </span>
                                <span className="text-[10px] text-emerald-700 font-semibold">
                                  {sub.percentage.toFixed(0)}%
                                </span>
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-medium text-[10px]">
                                Absent / Pending
                              </span>
                            )}
                          </td>

                          {/* Retake / Lock Status Toggle */}
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleAttemptAllowed(student.id)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer ${
                                student.attemptAllowed !== false
                                  ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-900 hover:bg-rose-200 border border-rose-300'
                              }`}
                              title={
                                student.attemptAllowed !== false
                                  ? 'Click to lock this candidate desk'
                                  : 'Click to unlock for a retake'
                              }
                            >
                              {student.attemptAllowed !== false ? (
                                <>
                                  <Unlock className="w-3 h-3 text-emerald-600" />
                                  <span>Authorized</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3 text-rose-600" />
                                  <span>Locked</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* Delete */}
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveStudent(student.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title={`Remove ${student.name} from roster`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            <span>
              {accessMode === 'restricted'
                ? `Restricted Mode Active: Only the ${roster.length} registered candidates can sit for this exam.`
                : 'Open Access Mode: Any candidate with the quiz code or link can sit for this exam.'}
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveAndApply}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save &amp; Apply Roster ({roster.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
