import React, { useState } from 'react';
import { QuizSection } from '../types';
import { 
  CalendarClock, 
  Lock, 
  Unlock, 
  Clock, 
  Check, 
  Save, 
  AlertCircle,
  HelpCircle,
  ArrowLeft
} from 'lucide-react';

interface SectionReleaseManagerProps {
  sections: QuizSection[];
  onUpdateSections: (updatedSections: QuizSection[]) => void;
}

export const SectionReleaseManager: React.FC<SectionReleaseManagerProps> = ({
  sections,
  onUpdateSections,
}) => {
  const [localSections, setLocalSections] = useState<QuizSection[]>(sections);
  const [saveSuccessNotification, setSaveSuccessNotification] = useState(false);

  const handleStatusChange = (sectionId: number, status: 'released' | 'scheduled' | 'locked') => {
    setLocalSections((prev) =>
      prev.map((sec) =>
        sec.id === sectionId ? { ...sec, status } : sec
      )
    );
  };

  const handleReleaseTimeChange = (sectionId: number, dateStr: string) => {
    setLocalSections((prev) =>
      prev.map((sec) =>
        sec.id === sectionId ? { ...sec, releaseTime: new Date(dateStr).toISOString() } : sec
      )
    );
  };

  const handleTimeAllocationChange = (sectionId: number, minutes: number) => {
    setLocalSections((prev) =>
      prev.map((sec) =>
        sec.id === sectionId ? { ...sec, timeAllocationMinutes: minutes } : sec
      )
    );
  };

  const handleSaveAll = () => {
    onUpdateSections(localSections);
    setSaveSuccessNotification(true);
    setTimeout(() => setSaveSuccessNotification(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.history.back()}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer border border-slate-300 mr-1"
              title="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <CalendarClock className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900 font-serif">
              Quiz Section Release Schedule & Time Manager
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure release times, access locks, and section durations for Year 2 Additional Mathematics assessment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccessNotification && (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1 animate-fade-in">
              <Check className="w-3.5 h-3.5" /> Schedule Updated!
            </span>
          )}

          <button
            onClick={handleSaveAll}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Save Release Schedule</span>
          </button>
        </div>
      </div>

      {/* Sections Release Cards */}
      <div className="space-y-4">
        {localSections.map((sec) => {
          // Format ISO date to local datetime-local format
          const formattedDateTime = sec.releaseTime
            ? new Date(sec.releaseTime).toISOString().slice(0, 16)
            : new Date().toISOString().slice(0, 16);

          return (
            <div
              key={`srm-sec-${sec.id}`}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 transition-all hover:border-slate-300"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                    S{sec.id}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-serif">{sec.title}</h3>
                    <span className="text-xs text-slate-500 font-medium">
                      Questions {sec.questionRange[0]} to {sec.questionRange[1]} (10 MCQs)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {sec.status === 'released' && (
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                      <Unlock className="w-3 h-3 text-emerald-600" /> Released
                    </span>
                  )}
                  {sec.status === 'scheduled' && (
                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" /> Scheduled
                    </span>
                  )}
                  {sec.status === 'locked' && (
                    <span className="bg-rose-100 text-rose-800 text-xs font-bold px-3 py-1 rounded-full border border-rose-200 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-rose-600" /> Locked
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-600">{sec.description}</p>

              {/* Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                {/* Release Mode Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Release Access Mode
                  </label>
                  <select
                    value={sec.status}
                    onChange={(e) =>
                      handleStatusChange(sec.id, e.target.value as 'released' | 'scheduled' | 'locked')
                    }
                    className="w-full bg-white text-xs font-semibold border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="released">Released (Immediate Access)</option>
                    <option value="scheduled">Scheduled (Set Release Time)</option>
                    <option value="locked">Locked (Teacher Restricted)</option>
                  </select>
                </div>

                {/* Scheduled Date Picker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Scheduled Release Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    disabled={sec.status !== 'scheduled'}
                    value={formattedDateTime}
                    onChange={(e) => handleReleaseTimeChange(sec.id, e.target.value)}
                    className="w-full bg-white text-xs border border-slate-300 rounded-lg py-2 px-3 disabled:bg-slate-100 disabled:text-slate-400 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Time Allocation per section */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Section Time Limit (Minutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={sec.timeAllocationMinutes}
                    onChange={(e) => handleTimeAllocationChange(sec.id, Number(e.target.value))}
                    className="w-full bg-white text-xs border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
