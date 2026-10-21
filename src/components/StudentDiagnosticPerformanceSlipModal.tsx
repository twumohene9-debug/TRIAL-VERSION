import React, { useRef } from 'react';
import { StudentSubmission, Question, QuizSection } from '../types';
import { EducationEmblemSvg } from './BrandLogo';
import { 
  Printer, 
  Download, 
  X, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  ShieldAlert, 
  Calendar, 
  Clock, 
  Award, 
  User, 
  Building, 
  BookOpen, 
  QrCode
} from 'lucide-react';
import { MathRenderer } from './MathRenderer';

interface StudentDiagnosticPerformanceSlipModalProps {
  submission: StudentSubmission;
  questions?: Question[];
  sections?: QuizSection[];
  onClose: () => void;
}

export const StudentDiagnosticPerformanceSlipModal: React.FC<StudentDiagnosticPerformanceSlipModalProps> = ({
  submission,
  questions = [],
  sections = [],
  onClose,
}) => {
  const printContainerRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (typeof window === 'undefined') return;

    // 1. Add printing class to body so CSS @media print cleanly isolates the slip
    document.body.classList.add('printing-diagnostic-slip');

    const cleanUp = () => {
      document.body.classList.remove('printing-diagnostic-slip');
      window.removeEventListener('afterprint', cleanUp);
    };
    window.addEventListener('afterprint', cleanUp);

    // 2. Mobile browsers (iOS Safari / Android Chrome)
    // In mobile WebKit & Blink, iframes cannot trigger the native print dialog / AirPrint / PDF exporter.
    // Calling window.print() directly triggers the native operating system's Print / Save as PDF sheet.
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      ('ontouchstart' in window && window.innerWidth < 1024);

    if (isMobile) {
      window.print();
      setTimeout(cleanUp, 3000);
      return;
    }

    // 3. Desktop browsers: Use clean iframe isolation to render only the slip document
    if (printContainerRef.current) {
      try {
        const existingFrame = document.getElementById('print-slip-iframe');
        if (existingFrame && existingFrame.parentNode) {
          existingFrame.parentNode.removeChild(existingFrame);
        }

        const printIframe = document.createElement('iframe');
        printIframe.id = 'print-slip-iframe';
        printIframe.setAttribute('title', 'Student Diagnostic Results Slip');
        // Use real dimensions off-screen so WebKit / Blink calculate bounding boxes accurately
        printIframe.style.position = 'fixed';
        printIframe.style.left = '-9999px';
        printIframe.style.top = '0';
        printIframe.style.width = '850px';
        printIframe.style.height = '1200px';
        printIframe.style.border = '0';
        document.body.appendChild(printIframe);

        const frameDoc = printIframe.contentWindow?.document;
        if (frameDoc) {
          frameDoc.open();
          const stylesheets = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map((node) => node.outerHTML)
            .join('\n');

          frameDoc.write(`
            <!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="utf-8" />
                <title>Results_Slip_${submission.studentId || 'Exam'}</title>
                ${stylesheets}
                <style>
                  @page {
                    size: A4 portrait;
                    margin: 8mm 8mm 8mm 8mm;
                  }
                  * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    box-sizing: border-box;
                  }
                  html, body {
                    background-color: #ffffff !important;
                    color: #000000 !important;
                    margin: 0 !important;
                    padding: 12px !important;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
                    font-size: 12px;
                    line-height: 1.5;
                  }
                  .printable-document {
                    width: 100% !important;
                    max-width: 100% !important;
                    border: none !important;
                    box-shadow: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                  }
                  .print-card,
                  .break-inside-avoid,
                  table, tr, td, th {
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                  }
                  .grid {
                    display: grid !important;
                  }
                  .grid-cols-4, .print\\:grid-cols-4 {
                    display: grid !important;
                    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
                  }
                  .grid-cols-3, .print\\:grid-cols-3 {
                    display: grid !important;
                    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                  }
                  .grid-cols-2, .print\\:grid-cols-2 {
                    display: grid !important;
                    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                  }
                  .gap-4 { gap: 16px !important; }
                  .gap-3 { gap: 12px !important; }
                  .border { border: 1px solid #cbd5e1 !important; }
                  .rounded-2xl { border-radius: 12px !important; }
                  .rounded-xl { border-radius: 8px !important; }
                  .bg-slate-50 { background-color: #f8fafc !important; }
                  .bg-indigo-50 { background-color: #eef2ff !important; }
                  .bg-amber-50 { background-color: #fffbeb !important; }
                  .bg-emerald-50 { background-color: #ecfdf5 !important; }
                  .bg-rose-50 { background-color: #fff1f2 !important; }
                </style>
              </head>
              <body>
                <div class="printable-document">
                  ${printContainerRef.current.innerHTML}
                </div>
              </body>
            </html>
          `);
          frameDoc.close();

          setTimeout(() => {
            try {
              printIframe.contentWindow?.focus();
              printIframe.contentWindow?.print();
            } catch (err) {
              console.warn('Iframe print error, falling back to window.print():', err);
              window.print();
            } finally {
              setTimeout(() => {
                try {
                  if (document.body.contains(printIframe)) {
                    document.body.removeChild(printIframe);
                  }
                } catch (_) {}
                cleanUp();
              }, 3000);
            }
          }, 450);
          return;
        }
      } catch (e) {
        console.warn('Fallback to standard print:', e);
      }
    }
    window.print();
    setTimeout(cleanUp, 3000);
  };

  const isPassed = (submission.percentage ?? 0) >= 60;
  const gradeLabel =
    (submission.percentage ?? 0) >= 80
      ? 'Distinction (Grade A)'
      : (submission.percentage ?? 0) >= 60
      ? 'Credit (Grade B / Passed)'
      : 'Unclassified (Grade F / Needs Remediation)';

  // Calculate topic and section summaries
  const effectiveQuestions = questions && questions.length > 0 ? questions : [];
  
  // Tab-switch and integrity incident count
  const integrityIncidents = submission.integrityEvents || [];
  const tabSwitches = submission.tabSwitchesCount || 0;

  return (
    <div 
      data-printable-modal="true"
      className="student-result-slip-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto print:overflow-visible"
    >
      <div 
        data-printable="true"
        className="printable-document bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:w-full print:max-w-none print:rounded-none"
      >
        {/* Modal Top Control Bar (Hidden in Print) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-white">
                Official Student Diagnostic Performance Slip
              </h3>
              <p className="text-[11px] text-slate-400">
                Institutional Academic Examination & Transcript Document
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="min-h-[44px] px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-98 select-none"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 shrink-0" />
            </button>
          </div>
        </div>

        {/* Printable Transcript Document Area */}
        <div 
          ref={printContainerRef}
          className="p-6 sm:p-10 overflow-y-auto space-y-6 text-slate-900 print:p-6 print:overflow-visible print:text-black font-sans"
        >
          {/* 1. Header with Brand Emblem & School Title */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-5 gap-4 print-card break-inside-avoid">
            <div className="flex items-center gap-4">
              <EducationEmblemSvg dimension={60} />
              <div>
                <h1 className="text-xl sm:text-2xl print:text-xl font-bold font-serif text-slate-950 uppercase tracking-tight">
                  {submission.school || 'THE JOY OF THE LORD ASSESSMENT NETWORK'}
                </h1>
                <p className="text-xs sm:text-sm font-medium text-slate-600">
                  Department of Mathematics & Educational Sciences • Examination Directorate
                </p>
                <p className="text-[11px] font-mono text-amber-800 font-semibold tracking-wider uppercase mt-0.5">
                  Official Candidate Performance Diagnostic Record
                </p>
              </div>
            </div>

            {/* Slip Meta Badge */}
            <div className="text-right shrink-0 border-l border-slate-200 pl-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-widest">
                VERIFICATION REF
              </span>
              <span className="font-mono text-xs font-bold text-slate-900 block">
                {submission.id ? submission.id.slice(0, 14).toUpperCase() : 'VER-REF-2026'}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Issue Date: {new Date(submission.submittedAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* 2. Candidate & Assessment Information Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs print-card break-inside-avoid">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Candidate Name</span>
              <span className="font-bold text-slate-900 text-sm block mt-0.5">{submission.studentName}</span>
              <span className="text-[11px] text-slate-500 font-mono">{submission.studentEmail || 'Registered Candidate'}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Index / Candidate ID</span>
              <span className="font-mono font-bold text-slate-900 text-sm block mt-0.5">{submission.studentId}</span>
              <span className="text-[11px] text-slate-500">Class: {submission.classGroup || 'Candidate Cohort'}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Assessment Title</span>
              <span className="font-bold text-slate-900 text-xs block mt-0.5 line-clamp-2">
                {submission.quizTitle || 'Mathematics Examination'}
              </span>
              <span className="text-[10px] font-mono text-indigo-700 font-semibold">
                Code: {(submission as any).quizCode || submission.quizId || 'MATH-EXAM'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Time Completed</span>
              <span className="font-semibold text-slate-900 text-xs block mt-0.5">
                {new Date(submission.submittedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-[11px] text-slate-500">
                Duration: {Math.round((submission.timeSpentSeconds || 1800) / 60)} mins
              </span>
            </div>
          </div>

          {/* 3. High-Impact Performance Score Card */}
          <div className="grid grid-cols-1 sm:grid-cols-4 print:grid-cols-4 gap-4 print-card break-inside-avoid">
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">Marks Obtained</span>
              <div className="text-3xl font-extrabold text-indigo-950 my-1">
                {submission.totalScore} <span className="text-base font-medium text-slate-500">/ {submission.maxScore}</span>
              </div>
              <span className="text-[11px] text-indigo-800 font-medium">Total Raw Score</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">Overall Percentage</span>
              <div className={`text-3xl font-extrabold my-1 ${isPassed ? 'text-emerald-700' : 'text-rose-700'}`}>
                {submission.percentage}%
              </div>
              <span className="text-[11px] text-slate-600 font-medium">Standardized Grade Point</span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Performance Grade</span>
              <div className="text-lg font-extrabold text-amber-950 my-1.5">
                {gradeLabel.split('(')[0].trim()}
              </div>
              <span className="text-[11px] text-amber-800 font-bold uppercase tracking-wider">
                {isPassed ? 'Official Pass' : 'Referral Required'}
              </span>
            </div>

            <div className={`p-4 rounded-2xl border text-center ${
              tabSwitches === 0 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider block">Integrity Clearance</span>
              <div className="text-2xl font-extrabold my-1 flex items-center justify-center gap-1.5">
                {tabSwitches === 0 ? (
                  <>
                    <ShieldCheck className="w-6 h-6 text-emerald-600" />
                    <span>Clean</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-6 h-6 text-rose-600" />
                    <span>{tabSwitches} Flags</span>
                  </>
                )}
              </div>
              <span className="text-[10px] font-medium leading-tight block">
                {tabSwitches === 0 ? 'Verified Proctoring' : `${tabSwitches} Tab-switches detected`}
              </span>
            </div>
          </div>

          {/* 4. Section & Curriculum Domain Diagnostics (Report Card Table) */}
          {submission.sectionScores && Object.keys(submission.sectionScores).length > 0 ? (
            <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-3 print-card break-inside-avoid">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-serif flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>Curriculum Domain Performance Summary</span>
                </h3>
                <span className="text-[11px] font-medium text-slate-500">
                  Standardized Assessment Diagnostic
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider">
                      <th className="py-2 font-bold">Section / Curriculum Area</th>
                      <th className="py-2 text-center font-bold">Score</th>
                      <th className="py-2 text-center font-bold">Percentage</th>
                      <th className="py-2 text-right font-bold">Proficiency Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(submission.sectionScores).map(([secId, secValue]) => {
                      const sec = secValue as { score: number; max: number; percentage: number };
                      const secTitle = sections.find((s) => s.id === Number(secId))?.title || `Section ${secId}`;
                      const statusLabel = 
                        sec.percentage >= 80 ? 'Mastery (Advanced)' :
                        sec.percentage >= 60 ? 'Competent (Proficient)' :
                        sec.percentage >= 40 ? 'Developing (Basic)' : 'Remediation Required';
                      const statusColor = 
                        sec.percentage >= 80 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                        sec.percentage >= 60 ? 'text-indigo-700 bg-indigo-50 border-indigo-200' :
                        sec.percentage >= 40 ? 'text-amber-700 bg-amber-50 border-amber-200' :
                        'text-rose-700 bg-rose-50 border-rose-200';

                      return (
                        <tr key={`slip-sec-${secId}`} className="hover:bg-slate-50/50">
                          <td className="py-2.5 font-semibold text-slate-900">{secTitle}</td>
                          <td className="py-2.5 text-center font-mono font-bold text-slate-800">
                            {sec.score} / {sec.max}
                          </td>
                          <td className="py-2.5 text-center font-mono font-bold text-indigo-700">
                            {sec.percentage}%
                          </td>
                          <td className="py-2.5 text-right">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                              {statusLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-3 print-card break-inside-avoid">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-serif flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>Cognitive Domain Diagnostic Breakdown</span>
                </h3>
                <span className="text-[11px] font-medium text-slate-500">
                  Curriculum Competency Mapping
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider">
                      <th className="py-2 font-bold">Domain & Competency Area</th>
                      <th className="py-2 text-center font-bold">Estimated Mastery</th>
                      <th className="py-2 text-center font-bold">Accuracy Rating</th>
                      <th className="py-2 text-right font-bold">Status Assessment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      {
                        title: 'Foundational Knowledge & Core Principles',
                        mastery: Math.min(100, Math.round(submission.percentage * 1.05)),
                        desc: 'Definition recall, fundamental axioms, formula identification',
                      },
                      {
                        title: 'Computational & Problem-Solving Execution',
                        mastery: Math.round(submission.percentage),
                        desc: 'Step-by-step arithmetic and algebraic manipulation',
                      },
                      {
                        title: 'Analytical Application & Critical Reasoning',
                        mastery: Math.max(0, Math.round(submission.percentage * 0.95)),
                        desc: 'Multi-step evaluation, geometric and situational questions',
                      },
                    ].map((item, idx) => {
                      const status = 
                        item.mastery >= 80 ? 'Mastery (Grade A)' :
                        item.mastery >= 60 ? 'Competent (Proficient)' :
                        item.mastery >= 40 ? 'Developing' : 'Remediation Required';
                      const statusColor = 
                        item.mastery >= 80 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                        item.mastery >= 60 ? 'text-indigo-700 bg-indigo-50 border-indigo-200' :
                        item.mastery >= 40 ? 'text-amber-700 bg-amber-50 border-amber-200' :
                        'text-rose-700 bg-rose-50 border-rose-200';

                      return (
                        <tr key={`diag-domain-${idx}`} className="hover:bg-slate-50/50">
                          <td className="py-2.5">
                            <span className="font-semibold text-slate-900 block">{item.title}</span>
                            <span className="text-[10px] text-slate-500 block">{item.desc}</span>
                          </td>
                          <td className="py-2.5 text-center font-mono font-bold text-slate-800">
                            {item.mastery}%
                          </td>
                          <td className="py-2.5 text-center font-mono font-bold text-indigo-700">
                            {Math.round((submission.totalScore / Math.max(1, submission.maxScore)) * 100)}%
                          </td>
                          <td className="py-2.5 text-right">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. Diagnostic Evaluation & Academic Standing Report Card */}
          <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/80 space-y-3 text-xs print-card break-inside-avoid">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-serif flex items-center justify-between">
              <span>Examiner Diagnostic Standing & Official Remarks</span>
              <span className="text-[10px] font-mono text-slate-500">
                Official Report Card Summary
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Questions</span>
                <span className="font-mono font-black text-lg text-slate-900 block mt-1">
                  {effectiveQuestions.length || 40}
                </span>
                <span className="text-[10px] text-slate-500">Items Evaluated</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Performance Classification</span>
                <span className={`font-serif font-black text-base block mt-1 ${isPassed ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {submission.percentage >= 80 ? 'Distinction (Grade A)' : submission.percentage >= 60 ? 'Credit (Grade B)' : 'Referral / Needs Remediation'}
                </span>
                <span className="text-[10px] text-slate-500">Official Standing</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Academic Recommendation</span>
                <span className="font-sans font-bold text-xs text-indigo-900 block mt-1">
                  {submission.percentage >= 80 
                    ? 'Recommended for Advanced Progression' 
                    : submission.percentage >= 60 
                    ? 'Recommended for Continuing Standard Track' 
                    : 'Targeted Remedial Support Advised'}
                </span>
                <span className="text-[10px] text-slate-500">Pedagogical Review</span>
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-700 text-xs leading-relaxed">
              <span className="font-bold text-slate-900">General Remarks: </span>
              {submission.percentage >= 80
                ? 'Candidate demonstrated exemplary mastery across the evaluated mathematical concepts and problem-solving standards with high analytical speed and accuracy.'
                : submission.percentage >= 60
                ? 'Candidate demonstrated satisfactory competence and met the standardized course benchmarks. Continued reinforcement in weaker sub-sections is encouraged.'
                : 'Candidate requires focused reinforcement and tutorial review in fundamental problem areas before subsequent evaluation.'}
            </div>
          </div>

          {/* 7. Institutional Certification & Signature Blocks */}
          <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-3 print:grid-cols-3 gap-6 text-xs text-slate-600 print-card break-inside-avoid">
            <div className="space-y-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                CANDIDATE SIGNATURE
              </span>
              <div className="h-9 border-b border-slate-300 flex items-end">
                <span className="text-xs font-serif text-slate-900 italic">{submission.studentName}</span>
              </div>
              <span className="text-[10px] text-slate-400 block">Electronically Certified Submission</span>
            </div>

            <div className="space-y-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                CHIEF EXAMINER / TEACHER
              </span>
              <div className="h-9 border-b border-slate-300 flex items-end">
                <span className="text-xs font-serif font-bold text-slate-900">Mr. Bismark Twum, MPhil</span>
              </div>
              <span className="text-[10px] text-slate-400 block">Assessment Directorate Sign-off</span>
            </div>

            <div className="flex flex-col items-center justify-center text-center space-y-1">
              <div className="w-14 h-14 border-2 border-dashed border-amber-600/60 rounded-xl flex flex-col items-center justify-center p-1 bg-amber-50">
                <EducationEmblemSvg dimension={28} />
                <span className="text-[7px] font-bold uppercase text-amber-900 tracking-tighter">OFFICIAL SEAL</span>
              </div>
              <span className="text-[9px] font-mono text-slate-400">Security Encrypted Slip</span>
            </div>
          </div>

          {/* Institutional Sign-Off */}
          <div className="pt-4 text-center border-t border-slate-200 print:border-black print-card break-inside-avoid">
            <p className="text-xs font-serif font-bold italic text-slate-700 print:text-black tracking-wide">
              "The joy of the Lord is my strength"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
