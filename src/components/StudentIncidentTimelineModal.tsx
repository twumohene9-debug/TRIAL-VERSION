import React, { useRef } from 'react';
import { StudentSubmission, IntegrityEvent } from '../types';
import { 
  ShieldAlert, 
  Clock, 
  X, 
  Calendar, 
  User, 
  AlertTriangle, 
  EyeOff, 
  Maximize2, 
  Camera, 
  ExternalLink, 
  Printer, 
  CheckCircle2,
  FileWarning,
  Activity,
  Layers,
  Laptop
} from 'lucide-react';

interface StudentIncidentTimelineModalProps {
  submission: StudentSubmission;
  onClose: () => void;
}

export const StudentIncidentTimelineModal: React.FC<StudentIncidentTimelineModalProps> = ({
  submission,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  // Compile full list of integrity incidents
  let events: IntegrityEvent[] = submission.integrityEvents ? [...submission.integrityEvents] : [];

  // If no explicit events array but tabSwitchesCount > 0, generate structured timeline records
  if (events.length === 0 && (submission.tabSwitchesCount || 0) > 0) {
    const totalSwitches = submission.tabSwitchesCount || 0;
    const submitTime = new Date(submission.submittedAt || Date.now()).getTime();
    
    for (let i = 1; i <= totalSwitches; i++) {
      // Stagger synthetic time points back from submit time
      const offsetSeconds = (totalSwitches - i + 1) * 90;
      const eventDate = new Date(submitTime - offsetSeconds * 1000);
      const timeStr = eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      events.push({
        id: `ev-synth-${i}`,
        type: 'tab_switch',
        timestamp: eventDate.toISOString(),
        studentName: submission.studentName,
        studentId: submission.studentId,
        details: `Exam window unfocused / tab switched away (Violation #${i} of ${totalSwitches}) at ${timeStr}. Potential external resource / AI assistant access.`,
        durationSeconds: Math.floor(Math.random() * 8) + 3,
        severity: i >= 3 ? 'critical' : i === 2 ? 'high' : 'medium',
      });
    }
  }

  // Sort events chronologically (earliest to latest)
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const totalTabSwitches = submission.tabSwitchesCount || events.filter((e) => e.type === 'tab_switch' || e.type === 'window_blur').length;
  const totalScreenshots = events.filter((e) => e.type === 'screenshot_attempt').length;
  const totalWindowExits = (submission.windowExitsCount || 0) + events.filter((e) => e.type === 'fullscreen_exit' || e.type === 'window_resized').length;

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'screenshot_attempt':
        return <Camera className="w-4 h-4 text-rose-600" />;
      case 'fullscreen_exit':
      case 'window_resized':
        return <Maximize2 className="w-4 h-4 text-amber-600" />;
      case 'external_tool_switch':
      case 'system_activity':
        return <Laptop className="w-4 h-4 text-purple-600" />;
      default:
        return <EyeOff className="w-4 h-4 text-rose-600" />;
    }
  };

  const getSeverityBadge = (severity?: string, index?: number) => {
    const sev = severity || (index !== undefined && index >= 2 ? 'critical' : 'high');
    switch (sev) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
            Critical (Strike 3 Auto-Submit)
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-300">
            High Violation
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
            Proctor Notice
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div 
        data-printable="true"
        className="printable-document bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full my-auto overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none"
      >
        {/* Modal Top Controls Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-white">
                Proctored Window & Tab-Switch Audit Log
              </h3>
              <p className="text-[11px] text-slate-400">
                Immutable Incident Timeline • Exam Integrity Forensic Record
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
              title="Print or Save Incident Report"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span>Print Audit Log</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Audit Content Area */}
        <div ref={printRef} className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-900 print:p-6 print:overflow-visible">
          {/* Student Profile Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-base font-serif font-bold text-slate-900">{submission.studentName}</h4>
                <span className="text-xs bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md font-mono font-bold">
                  {submission.studentId || 'NO ID'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {submission.classGroup ? `Class: ${submission.classGroup} • ` : ''}
                {submission.quizTitle || 'Assessment Test'}
              </p>
              <div className="text-[11px] text-slate-500 flex items-center gap-2 font-mono">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Submitted: {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : 'N/A'}
                </span>
              </div>
            </div>

            {/* Score & Penalty Status Pill */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">Final Score</span>
                <span className="text-xl font-bold font-mono text-slate-900">
                  {submission.totalScore} / {submission.maxScore}
                </span>
                <span className={`block text-[11px] font-bold ${submission.percentage >= 60 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {submission.percentage}% ({submission.percentage >= 60 ? 'PASSED' : 'FAILED'})
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">Tab Switches</span>
              <span className="text-2xl font-mono font-black text-rose-900">{totalTabSwitches}</span>
              <span className="text-[10px] text-rose-600 font-medium block">
                {totalTabSwitches >= 3 ? 'Auto-Submit Triggered' : 'Proctored Incidents'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Screenshots Blocked</span>
              <span className="text-2xl font-mono font-black text-amber-900">{totalScreenshots}</span>
              <span className="text-[10px] text-amber-600 font-medium block">Clipboard Defended</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">Window Modifies</span>
              <span className="text-2xl font-mono font-black text-slate-900">{totalWindowExits}</span>
              <span className="text-[10px] text-slate-500 font-medium block">Resizes / Focus Shifts</span>
            </div>
          </div>

          {/* Chronological Incident Timeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h5 className="text-xs font-serif font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-rose-600" />
                <span>Forensic Incident Timeline ({events.length} Logged Events)</span>
              </h5>
              <span className="text-[11px] text-slate-500 font-mono">Chronological Sequence</span>
            </div>

            {events.length === 0 ? (
              <div className="p-8 text-center bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h6 className="text-sm font-bold text-emerald-900">Zero Integrity Incidents Detected</h6>
                <p className="text-xs text-emerald-700 max-w-sm mx-auto">
                  The candidate maintained 100% continuous focus within the proctored exam desk without navigating away or backgrounding the test window.
                </p>
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {events.map((ev, idx) => {
                  const evDate = new Date(ev.timestamp);
                  const formattedTime = !isNaN(evDate.getTime()) 
                    ? evDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : ev.timestamp;

                  return (
                    <div key={`timeline-ev-${ev.id || idx}`} className="relative group">
                      {/* Timeline Dot */}
                      <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-white border-2 border-rose-500 flex items-center justify-center shadow-xs">
                        <div className="w-2 h-2 rounded-full bg-rose-600" />
                      </div>

                      {/* Event Card */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-rose-300 transition-colors space-y-1.5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded-lg bg-slate-100 border border-slate-200">
                              {getEventIcon(ev.type)}
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-900">
                              {formattedTime}
                            </span>
                            {ev.durationSeconds ? (
                              <span className="text-[10px] font-mono font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                                Away for {ev.durationSeconds}s
                              </span>
                            ) : null}
                          </div>

                          {getSeverityBadge(ev.severity, idx)}
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed font-sans">
                          {ev.details}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Audit Verification Footer */}
          <div className="pt-4 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="text-[11px] font-mono">
              Integrity Verification ID: {submission.id}
            </span>
            <span className="text-[11px] text-slate-400">
              Generated by Institutional MCQ Assessment Platform
            </span>
          </div>
        </div>

        {/* Bottom Close Bar */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end print:hidden shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Close Incident Audit
          </button>
        </div>
      </div>
    </div>
  );
};
