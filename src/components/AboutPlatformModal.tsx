import React, { useState, useEffect } from 'react';
import { 
  Info, 
  X, 
  GraduationCap, 
  Mail, 
  Send, 
  AlertTriangle, 
  ShieldCheck, 
  Cpu, 
  Copy, 
  Check, 
  ExternalLink, 
  Layers, 
  BookOpen, 
  CheckCircle2,
  Terminal,
  HelpCircle,
  FileCode2,
  Lock,
  Award,
  Sparkles
} from 'lucide-react';
import { AdminProfile } from '../types';
import { BrandLogo } from './BrandLogo';

interface AboutPlatformModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'about' | 'contact' | 'report' | 'privacy';
  adminProfile?: AdminProfile;
}

export const AboutPlatformModal: React.FC<AboutPlatformModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'about',
  adminProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'about' | 'contact' | 'report' | 'privacy'>(initialTab);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Sync activeTab whenever initialTab changes or modal opens
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);
  
  // Feedback Form State
  const [feedbackCategory, setFeedbackCategory] = useState('Pedagogical Feedback');
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Problem Report State
  const [problemType, setProblemType] = useState('Question or Formula Display');
  const [problemDescription, setProblemDescription] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [problemReporterEmail, setProblemReporterEmail] = useState('');
  const [problemSubmitted, setProblemSubmitted] = useState(false);

  const developerEmail = adminProfile?.email || 'twumbismark90@gmail.com';
  const platformVersion = 'v2.5.0 (Academic Build)';

  if (!isOpen) return null;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(developerEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) return;

    // Open mailto with structured template as well as showing confirmation
    const subject = encodeURIComponent(`[Platform Feedback] ${feedbackCategory}`);
    const body = encodeURIComponent(
      `Name: ${feedbackName || 'Anonymous'}\n` +
      `Email: ${feedbackEmail || 'Not provided'}\n` +
      `Category: ${feedbackCategory}\n\n` +
      `Feedback Details:\n${feedbackMessage}\n\n` +
      `---\nSent from Mathematics Assessment Platform (${platformVersion})`
    );
    window.open(`mailto:${developerEmail}?subject=${subject}&body=${body}`, '_blank');
    setFeedbackSubmitted(true);
  };

  const handleReportProblem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemDescription.trim()) return;

    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
    const screenRes = typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'Unknown';

    const subject = encodeURIComponent(`[Problem Report] ${problemType} - ${platformVersion}`);
    const body = encodeURIComponent(
      `Issue Type: ${problemType}\n` +
      `Reporter: ${problemReporterEmail || 'Not provided'}\n\n` +
      `Description:\n${problemDescription}\n\n` +
      `Steps to Reproduce:\n${stepsToReproduce || 'N/A'}\n\n` +
      `Diagnostics:\n- Version: ${platformVersion}\n- Screen: ${screenRes}\n- Browser: ${userAgent}\n- Timestamp: ${new Date().toISOString()}`
    );
    window.open(`mailto:${developerEmail}?subject=${subject}&body=${body}`, '_blank');
    setProblemSubmitted(true);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <BrandLogo size="md" variant="icon-only" className="w-11 h-11 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                  Mathematics Education Research
                </span>
                <span className="text-[11px] text-slate-300 font-mono">
                  {platformVersion}
                </span>
              </div>
              <h2 className="text-xl font-bold font-serif tracking-tight text-white mt-1">
                MCQ Assessment Hub
              </h2>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 sm:gap-2 mt-5 border-b border-slate-700/60 pb-1 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('about')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'about'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>About the Platform</span>
            </button>

            <button
              onClick={() => setActiveTab('contact')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'contact'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Contact & Feedback</span>
            </button>

            <button
              onClick={() => setActiveTab('report')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'report'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Report a Problem</span>
            </button>

            <button
              onClick={() => setActiveTab('privacy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'privacy'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Privacy & Governance</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-700 text-sm leading-relaxed">
          {/* TAB 1: About the Platform */}
          {activeTab === 'about' && (
            <div className="space-y-5">
              {/* Creator & Academic Profile with Admin Photo */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Admin Profile Picture */}
                    <div className="relative shrink-0 group">
                      <img
                        src={adminProfile?.customPhotoBase64 || adminProfile?.photoUrl || '/admin_profile.jpg'}
                        alt={adminProfile?.name || 'Mr. Bismark Twum, MPhil'}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover object-top border-2 border-indigo-600 shadow-md ring-4 ring-indigo-50"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.src = '/admin_profile.jpg';
                        }}
                      />
                      <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full ring-2 ring-white" title="Verified Administrator">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {adminProfile?.qualification || 'MPhil Scholar'}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Lead Administrator
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 font-serif mt-1">
                        {adminProfile?.name || 'Bismark Twum, MPhil'}
                      </h3>
                      <p className="text-xs font-medium text-slate-600 mt-0.5">
                        {adminProfile?.title || 'Mathematics Educator | Mathematics Education Researcher | Teacher'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('contact')}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Contact</span>
                    </button>
                  </div>
                </div>

                {adminProfile?.bio && (
                  <p className="mt-3 pt-3 border-t border-slate-200/80 text-xs text-slate-600 leading-relaxed">
                    {adminProfile.bio}
                  </p>
                )}

                {adminProfile?.roles && adminProfile.roles.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {adminProfile.roles.map((role, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 text-[10px] font-semibold"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Purpose Statement */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Purpose of the Platform
                </h4>
                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/70 text-slate-800 font-serif text-sm italic leading-relaxed">
                  “A technology-enhanced platform designed to support digital mathematics assessment, question delivery, assessment administration, and student performance management.”
                </div>
              </div>

              {/* Architectural Capabilities */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Core Structural Pillars
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      <span>Mathematical Typesetting</span>
                    </div>
                    <p className="text-slate-600 leading-normal">
                      Full LaTeX and MathML parsing for rigorous algebraic equations, calculus expressions, matrices, and geometric formatting.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-amber-600" />
                      <span>Section & Time Management</span>
                    </div>
                    <p className="text-slate-600 leading-normal">
                      Controlled assessment schedules, sequential section progression, and timed testing windows.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-emerald-600" />
                      <span>Real-Time Cloud & Offline Sync</span>
                    </div>
                    <p className="text-slate-600 leading-normal">
                      Cloud-synchronized question banks and submission monitoring with local offline resilience against connection drops.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-sky-600" />
                      <span>Assessment Integrity</span>
                    </div>
                    <p className="text-slate-600 leading-normal">
                      Automated audit logs, student activity timestamps, and structured assessment delivery without intrusive spyware.
                    </p>
                  </div>
                </div>
              </div>

              {/* Platform Meta Info */}
              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-mono">
                <span>Platform Version: <strong>{platformVersion}</strong></span>
                <span>Direct Contact: <strong>{developerEmail}</strong></span>
              </div>
            </div>
          )}

          {/* TAB 2: Contact & Feedback */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <p className="text-xs text-slate-600">
                  We welcome feedback from mathematics educators, researchers, teachers, and students to continuously refine question presentation, mathematical rendering, and assessment administration.
                </p>

                <div className="mt-3 flex items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-300 font-mono text-xs">
                  <span className="text-indigo-900 font-semibold truncate select-all">
                    {developerEmail}
                  </span>
                  <button
                    onClick={handleCopyEmail}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-sans text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    {copiedEmail ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Email</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {feedbackSubmitted ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                  <div className="font-bold text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Feedback Initiated</span>
                  </div>
                  <p>
                    Thank you for your constructive comments. Your email client has been prepared, or your feedback has been logged for academic review.
                  </p>
                  <button
                    onClick={() => setFeedbackSubmitted(false)}
                    className="mt-2 text-xs font-bold text-emerald-700 underline cursor-pointer"
                  >
                    Send another note
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendFeedback} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Your Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={feedbackName}
                        onChange={(e) => setFeedbackName(e.target.value)}
                        placeholder="e.g. Dr. A. Mensah"
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Feedback Category
                      </label>
                      <select
                        value={feedbackCategory}
                        onChange={(e) => setFeedbackCategory(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                      >
                        <option value="Pedagogical Feedback">Pedagogical / Mathematics Content</option>
                        <option value="Formula / LaTeX Rendering">Formula / LaTeX Rendering</option>
                        <option value="Assessment Administration">Assessment Administration</option>
                        <option value="General Inquiry">General Inquiry</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Your Email (for response)
                    </label>
                    <input
                      type="email"
                      value={feedbackEmail}
                      onChange={(e) => setFeedbackEmail(e.target.value)}
                      placeholder="e.g. educator@school.edu"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Feedback / Suggestion <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      required
                      placeholder="Share your thoughts on question delivery, interface usability, or assessment design..."
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Transmit Feedback via Email</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: Report a Problem */}
          {activeTab === 'report' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  Encountered an issue with math rendering, question submission, timer synchronization, or offline mode? Please let us know so we can investigate and patch it.
                </p>
              </div>

              {problemSubmitted ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                  <div className="font-bold text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Report Prepared</span>
                  </div>
                  <p>
                    Thank you. Your issue report and device diagnostics have been formatted and addressed to <strong>{developerEmail}</strong>.
                  </p>
                  <button
                    onClick={() => setProblemSubmitted(false)}
                    className="mt-2 text-xs font-bold text-emerald-700 underline cursor-pointer"
                  >
                    Report another issue
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReportProblem} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Issue Type
                      </label>
                      <select
                        value={problemType}
                        onChange={(e) => setProblemType(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 bg-white font-medium"
                      >
                        <option value="Question or Formula Display">Question or LaTeX Formula Display</option>
                        <option value="Submission / Timer Issue">Submission / Timer Synchronization</option>
                        <option value="Offline Mode or Cloud Sync">Offline Mode or Cloud Sync</option>
                        <option value="Teacher Portal & Grading">Teacher Portal & Grading</option>
                        <option value="Other Technical Glitch">Other Technical Glitch</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Your Contact Email (Optional)
                      </label>
                      <input
                        type="email"
                        value={problemReporterEmail}
                        onChange={(e) => setProblemReporterEmail(e.target.value)}
                        placeholder="e.g. user@school.edu"
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Problem Description <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={problemDescription}
                      onChange={(e) => setProblemDescription(e.target.value)}
                      required
                      placeholder="Describe what occurred (e.g., question 4 square root didn't display on mobile)..."
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 bg-white resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Steps to Reproduce (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={stepsToReproduce}
                      onChange={(e) => setStepsToReproduce(e.target.value)}
                      placeholder="1. Logged into test\n2. Switched to Section B\n3. Clicked next..."
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 bg-white resize-none"
                    />
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-100 text-[11px] text-slate-600 font-mono flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Auto-attaches browser specs, screen resolution, and build version.</span>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Send Problem Report to Developer</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 4: Privacy & Data Governance */}
          {activeTab === 'privacy' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                  <Lock className="w-4 h-4 text-indigo-600" />
                  <span>Educational Privacy Principles</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  The Mathematics Assessment Platform is developed strictly for educational evaluation, formative feedback, and academic research. We respect student and teacher privacy.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                  <h5 className="font-bold text-slate-900">1. Student Assessment Records</h5>
                  <p className="text-slate-600">
                    Student responses, scores, and completion timestamps are processed solely to compute evaluation results and provide diagnostic feedback to authorized instructors.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                  <h5 className="font-bold text-slate-900">2. No Commercial Advertising or Monetization</h5>
                  <p className="text-slate-600">
                    This platform contains zero third-party commercial advertisements, zero behavioral tracking pixels, and does not sell or distribute personal data to third parties.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                  <h5 className="font-bold text-slate-900">3. Local Caching & Data Security</h5>
                  <p className="text-slate-600">
                    In-progress exam answers are cached in client browser storage so students do not lose work during intermittent network connectivity. Transmission over the web uses standard encrypted transport (TLS).
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                  <h5 className="font-bold text-slate-900">4. Inquiries & Data Erasure</h5>
                  <p className="text-slate-600">
                    For any questions regarding data retention or to request data removal, please contact the developer directly at <strong>{developerEmail}</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-medium text-[11px]">
            <span>Designed by Bismark Twum, MPhil</span>
            <span>•</span>
            <span>Mathematics Education</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
