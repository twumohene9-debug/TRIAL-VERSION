import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Mail, KeyRound, AlertCircle, Eye, EyeOff, User, GraduationCap, X, UserPlus, LogIn, ShieldAlert } from 'lucide-react';
import { TeacherAccessCode } from '../types';

export interface AuthenticatedTeacherInfo {
  email: string;
  name: string;
  department?: string;
}

interface TeacherAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (teacher: AuthenticatedTeacherInfo) => void;
  teacherAccessCodes?: TeacherAccessCode[];
  isSelfRegistrationLocked?: boolean;
  adminContactEmail?: string;
  onRegisterTeacher?: (teacherCode: TeacherAccessCode) => void;
}

export const TeacherAuthModal: React.FC<TeacherAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  teacherAccessCodes = [],
  isSelfRegistrationLocked = false,
  adminContactEmail = 'twumbismark90@gmail.com',
  onRegisterTeacher,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Mathematics & Computing');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset inputs when modal opens or closes to prevent credential retention
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setName('');
      setPassword('');
      setError(null);
      setShowPassword(false);
      setAuthMode('login');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setEmail('');
    setName('');
    setPassword('');
    setError(null);
    onClose();
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanName = name.trim();

    if (!cleanEmail || !cleanPassword) {
      setError('Please provide both email and access passcode/PIN.');
      setIsSubmitting(false);
      return;
    }

    if (authMode === 'register') {
      // Check if self-registration is locked
      if (isSelfRegistrationLocked) {
        setIsSubmitting(false);
        setError(`Teacher workspace self-registration has been locked by the Administrator. Please contact ${adminContactEmail} to obtain your authorized access code.`);
        return;
      }

      if (!cleanName) {
        setIsSubmitting(false);
        setError('Please enter your Full Teacher Name.');
        return;
      }

      if (cleanPassword.length < 3) {
        setIsSubmitting(false);
        setError('Access PIN / Password must be at least 3 characters.');
        return;
      }

      try {
        // 1. Sync to server backend
        const serverRes = await fetch('/api/teachers/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: cleanName,
            email: cleanEmail,
            department: department.trim() || 'Mathematics & Computing',
            pin: cleanPassword,
            password: cleanPassword,
          }),
        });

        if (serverRes.status === 403) {
          const resJson = await serverRes.json();
          setIsSubmitting(false);
          setError(resJson.error || 'Teacher self-registration is locked by the Administrator.');
          return;
        }

        const newTeacherCode: TeacherAccessCode = {
          id: `teacher-${Date.now()}`,
          code: cleanPassword,
          pin: cleanPassword,
          teacherName: cleanName,
          teacherEmail: cleanEmail,
          department: department.trim() || 'Mathematics & Computing',
          status: 'active',
          source: 'self-registered',
          createdAt: new Date().toISOString().split('T')[0],
          lastUsedAt: new Date().toISOString(),
        };

        // 2. Add to app state so it immediately appears in Admin Dashboard
        if (onRegisterTeacher) {
          onRegisterTeacher(newTeacherCode);
        }

        // 3. Save locally in registered teachers cache
        try {
          const savedTeachers = JSON.parse(localStorage.getItem('joy_registered_teachers') || '[]');
          const existingIdx = savedTeachers.findIndex((t: any) => t.email.toLowerCase() === cleanEmail);
          const teacherCacheObj = {
            email: cleanEmail,
            name: cleanName,
            department: department.trim() || 'Mathematics & Computing',
            pin: cleanPassword,
            code: cleanPassword,
            source: 'self-registered',
            createdAt: new Date().toISOString(),
          };
          if (existingIdx >= 0) {
            savedTeachers[existingIdx] = teacherCacheObj;
          } else {
            savedTeachers.push(teacherCacheObj);
          }
          localStorage.setItem('joy_registered_teachers', JSON.stringify(savedTeachers));
        } catch (e) {
          console.warn(e);
        }

        const teacherInfo: AuthenticatedTeacherInfo = {
          email: cleanEmail,
          name: cleanName,
          department: department.trim() || 'Mathematics & Computing',
        };

        setIsSubmitting(false);
        setError(null);
        onClose();
        onSuccess(teacherInfo);
      } catch (err: any) {
        console.warn('Teacher registration warning, continuing locally:', err);
        const newTeacherCode: TeacherAccessCode = {
          id: `teacher-${Date.now()}`,
          code: cleanPassword,
          pin: cleanPassword,
          teacherName: cleanName,
          teacherEmail: cleanEmail,
          department: department.trim() || 'Mathematics & Computing',
          status: 'active',
          source: 'self-registered',
          createdAt: new Date().toISOString().split('T')[0],
        };

        if (onRegisterTeacher) {
          onRegisterTeacher(newTeacherCode);
        }

        const teacherInfo: AuthenticatedTeacherInfo = {
          email: cleanEmail,
          name: cleanName,
          department: department.trim() || 'Mathematics & Computing',
        };

        setIsSubmitting(false);
        setError(null);
        onClose();
        onSuccess(teacherInfo);
      }
      return;
    }

    // LOGIN MODE
    // Default fallback access
    const defaultEmails = ['twumbismark90@gmail.com', 'twumohehe9@gmail.com', 'twumohene9@gmail.com', 'twumbismark304@gmail.com'];
    const defaultCode = '0061';

    // Check against teacherAccessCodes (both admin created & self registered)
    const matchedCode = teacherAccessCodes.find(
      (tc) =>
        tc.teacherEmail.toLowerCase() === cleanEmail &&
        (tc.code === cleanPassword || tc.pin === cleanPassword)
    );

    // Check if code was revoked by admin
    if (matchedCode && matchedCode.status === 'revoked') {
      setIsSubmitting(false);
      setError('Access Denied: Your teacher access code has been revoked by the Administrator. Please contact the administrator.');
      return;
    }

    const isDefaultMasterMatch = defaultEmails.includes(cleanEmail) && cleanPassword === defaultCode;

    // Check local registered cache
    let localTeacherMatch: any = null;
    try {
      const savedTeachers = JSON.parse(localStorage.getItem('joy_registered_teachers') || '[]');
      localTeacherMatch = savedTeachers.find(
        (t: any) => t.email.toLowerCase() === cleanEmail && (t.pin === cleanPassword || t.code === cleanPassword)
      );
    } catch (e) {
      console.warn(e);
    }

    if (matchedCode && matchedCode.status === 'active') {
      const teacherInfo: AuthenticatedTeacherInfo = {
        email: cleanEmail,
        name: matchedCode.teacherName,
        department: matchedCode.department || 'Mathematics & Computing',
      };
      setIsSubmitting(false);
      setError(null);
      onClose();
      onSuccess(teacherInfo);
      return;
    }

    if (localTeacherMatch) {
      // Check if admin explicitly revoked this email in teacherAccessCodes
      const revokedCheck = teacherAccessCodes.find(
        (tc) => tc.teacherEmail.toLowerCase() === cleanEmail && tc.status === 'revoked'
      );
      if (revokedCheck) {
        setIsSubmitting(false);
        setError('Access Denied: Your account has been revoked by the Administrator.');
        return;
      }

      const teacherInfo: AuthenticatedTeacherInfo = {
        email: localTeacherMatch.email,
        name: localTeacherMatch.name,
        department: localTeacherMatch.department || 'Mathematics & Computing',
      };
      setIsSubmitting(false);
      setError(null);
      onClose();
      onSuccess(teacherInfo);
      return;
    }

    if (isDefaultMasterMatch) {
      let teacherName = 'Mr. Bismark Twum';
      let dept = 'Mathematics & Computing';

      if (cleanEmail.includes('twumohene') || cleanEmail.includes('twumohehe')) {
        teacherName = 'Mr. Twumasi';
      }

      const teacherInfo: AuthenticatedTeacherInfo = {
        email: cleanEmail,
        name: teacherName,
        department: dept,
      };

      setIsSubmitting(false);
      setError(null);
      onClose();
      onSuccess(teacherInfo);
      return;
    }

    setIsSubmitting(false);
    setError('Invalid Access Code or unregistered teacher email. If you are a new teacher and self-registration is enabled, click "New Teacher Workspace" above.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md max-h-[92vh] flex flex-col overflow-hidden transform transition-all">
        {/* Header Banner - Compact */}
        <div className="bg-gradient-to-b from-[#0f1223] via-[#13172e] to-[#1a1a2e] text-white px-4 py-3.5 sm:px-5 sm:py-4 relative border-b border-orange-500/20 shrink-0">
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold font-serif text-white flex items-center gap-1.5 leading-tight">
                Faculty Workspace Authentication
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-300">
                Educator Portal • Isolated Assessment Workspace
              </p>
            </div>
          </div>
        </div>

        {/* Auth Mode Toggle - Compact */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-1.5 sm:px-5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setError(null);
            }}
            className={`pb-2 px-2.5 text-xs font-bold border-b-2 flex items-center gap-1 cursor-pointer transition-all ${
              authMode === 'login'
                ? 'border-amber-600 text-amber-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setError(null);
            }}
            className={`pb-2 px-2.5 text-xs font-bold border-b-2 flex items-center gap-1 cursor-pointer transition-all ${
              authMode === 'register'
                ? 'border-amber-600 text-amber-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>New Teacher Registration</span>
            {isSelfRegistrationLocked && (
              <span className="bg-rose-100 text-rose-700 text-[9px] font-extrabold px-1 py-0.5 rounded-full flex items-center gap-0.5 border border-rose-200">
                <Lock className="w-2 h-2" />
                Locked
              </span>
            )}
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-3">
          {/* Locked Alert if Register Tab Selected While Locked */}
          {authMode === 'register' && isSelfRegistrationLocked && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1.5 animate-in fade-in duration-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>Self-Registration Locked by Administrator</span>
              </div>
              <p className="text-[10.5px] text-rose-700 leading-snug">
                Only teachers with an existing authorized code or credentials assigned by the administrator can access.
              </p>
              <div className="pt-0.5 text-[10.5px] font-semibold text-rose-900 bg-rose-100/60 p-1.5 rounded-lg border border-rose-200/80">
                Contact: <a href={`mailto:${adminContactEmail}`} className="underline font-mono text-rose-950">{adminContactEmail}</a>
              </div>
            </div>
          )}

          <form onSubmit={handleAuth} autoComplete="off" className="space-y-2.5">
            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-medium flex items-center gap-2 animate-shake">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {authMode === 'register' && (
              <>
                {/* Teacher Full Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Full Teacher Name (Title & Surname)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      required
                      disabled={isSelfRegistrationLocked}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Mrs. Sarah Appiah"
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Subject / Department
                  </label>
                  <input
                    type="text"
                    disabled={isSelfRegistrationLocked}
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Mathematics, Science, General Arts"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </>
            )}

            {/* Email Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Teacher Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <input
                  type="email"
                  required
                  autoComplete="off"
                  disabled={authMode === 'register' && isSelfRegistrationLocked}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. sarah.math@joymcq.edu.gh"
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {authMode === 'register' ? 'Set Workspace Passcode / PIN' : 'Access Code / Security PIN'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-3.5 h-3.5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  disabled={authMode === 'register' && isSelfRegistrationLocked}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={authMode === 'register' ? 'Create a secure PIN' : 'Enter access code / PIN'}
                  className="w-full pl-8 pr-9 py-1.5 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-1/3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (authMode === 'register' && isSelfRegistrationLocked)}
                className="w-2/3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
              >
                {isSubmitting ? (
                  <span>Verifying...</span>
                ) : authMode === 'register' && isSelfRegistrationLocked ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Registration Locked</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{authMode === 'register' ? 'Create My Panel' : 'Unlock My Panel'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Compact Footer info */}
        <div className="bg-slate-50 border-t border-slate-100 px-4 py-2 text-center text-[10px] text-slate-500 flex items-center justify-center gap-1 shrink-0">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>Strict Isolation: Teachers only access their own quizzes & student logs.</span>
        </div>
      </div>
    </div>
  );
};
