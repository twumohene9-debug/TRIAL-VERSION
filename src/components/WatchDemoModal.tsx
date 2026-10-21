import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  UploadCloud,
  Eye,
  Clock,
  Layers,
  Award,
  ChevronRight,
  Maximize2,
  Check
} from 'lucide-react';
import { MathRenderer } from './MathRenderer';
import { BrandLogo } from './BrandLogo';

interface WatchDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartExam?: () => void;
  onOpenTeacher?: () => void;
}

interface DemoChapter {
  id: number;
  title: string;
  duration: number; // in seconds
  description: string;
}

const DEMO_CHAPTERS: DemoChapter[] = [
  {
    id: 1,
    title: 'Student Exam & Anti-Cheat',
    duration: 25,
    description: 'Instant question loading, real-time timer, KaTeX math notation, and strict anti-cheat tab-switch detection.'
  },
  {
    id: 2,
    title: 'Word (.docx) Exam Importer',
    duration: 20,
    description: 'Import 50+ multiple choice questions from Microsoft Word files with automatic answer key extraction.'
  },
  {
    id: 3,
    title: 'Live Teacher Surveillance',
    duration: 25,
    description: 'Real-time classroom monitoring, student focus status, unauthorized tab blur logs, and 1-click grade export.'
  }
];

export const WatchDemoModal: React.FC<WatchDemoModalProps> = ({
  isOpen,
  onClose,
  onStartExam,
  onOpenTeacher
}) => {
  const [activeMode, setActiveMode] = useState<'video' | 'interactive'>('video');
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [progress, setProgress] = useState(0); // 0 to 100%
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Video loop timer
  useEffect(() => {
    if (!isOpen || activeMode !== 'video' || !isPlaying) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Advance to next chapter or cycle
          setCurrentChapterIndex((curr) => (curr + 1) % DEMO_CHAPTERS.length);
          return 0;
        }
        return prev + 1.2 * playbackSpeed;
      });
    }, 250);

    return () => clearInterval(interval);
  }, [isOpen, activeMode, isPlaying, playbackSpeed]);

  // Interactive Test-Drive State
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [simulatedCheatTriggered, setSimulatedCheatTriggered] = useState(false);
  const [testDriveScore, setTestDriveScore] = useState<number | null>(null);

  if (!isOpen) return null;

  const currentChapter = DEMO_CHAPTERS[currentChapterIndex];

  const handleToggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleTestDriveSelect = (index: number) => {
    if (hasSubmitted) return;
    setSelectedAnswer(index);
  };

  const handleTestDriveSubmit = () => {
    if (selectedAnswer === null) return;
    setHasSubmitted(true);
    // Correct answer is Option A (index 0)
    setTestDriveScore(selectedAnswer === 0 ? 100 : 0);
  };

  const handleResetTestDrive = () => {
    setSelectedAnswer(null);
    setHasSubmitted(false);
    setSimulatedCheatTriggered(false);
    setTestDriveScore(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-5xl bg-[#090f20] border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-[#070b18]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Play className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  Live Product Demo
                </span>
                <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Interactive Tour
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-white mt-0.5 flex items-center gap-2">
                <BrandLogo size="xs" variant="icon-only" className="w-5 h-5 shrink-0" />
                <span>MCQ Assessment Hub Walkthrough</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="bg-slate-800/80 p-1 rounded-xl flex items-center gap-1 border border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveMode('video')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeMode === 'video'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Video Tour</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('interactive')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeMode === 'interactive'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Hands-On Test Drive</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {activeMode === 'video' ? (
            /* VIDEO TOUR MODE */
            <div className="space-y-4">
              {/* Chapter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {DEMO_CHAPTERS.map((ch, idx) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      setCurrentChapterIndex(idx);
                      setProgress(0);
                    }}
                    className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                      currentChapterIndex === idx
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-[#11192e] text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-950/20 text-current flex items-center justify-center text-[11px] font-black">
                      {idx + 1}
                    </span>
                    <span>{ch.title}</span>
                  </button>
                ))}
              </div>

              {/* Main Simulated Video Display */}
              <div
                ref={videoContainerRef}
                className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex flex-col justify-between"
              >
                {/* Simulated Screen Content based on Chapter */}
                <div className="absolute inset-0 z-0 p-4 sm:p-6 overflow-hidden select-none">
                  {currentChapterIndex === 0 && (
                    /* Scene 1: Student Exam Taking */
                    <div className="h-full flex flex-col justify-between bg-gradient-to-br from-[#0c152d] to-[#060a17] p-5 rounded-xl border border-slate-800 animate-in fade-in duration-300">
                      {/* Top Bar */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold">
                            CALC-FINAL-2026
                          </span>
                          <span className="text-xs text-slate-400 font-medium">Question 4 of 20</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-red-950/60 border border-red-500/40 text-red-400 text-xs font-mono font-bold animate-pulse">
                            <Clock className="w-3.5 h-3.5" />
                            <span>14:38 remaining</span>
                          </div>
                          <span className="px-2 py-1 rounded-md bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Anti-Cheat Active</span>
                          </span>
                        </div>
                      </div>

                      {/* Question Content */}
                      <div className="my-auto space-y-4 py-3">
                        <div className="text-base sm:text-lg font-bold text-slate-100 flex items-start gap-2">
                          <span className="text-amber-400 font-black">Q4:</span>
                          <div>
                            Evaluate the definitive integral of the quadratic derivative:
                            <div className="mt-2 text-amber-300 font-mono text-sm sm:text-base bg-slate-900/90 p-2.5 rounded-lg border border-slate-700/60 inline-block">
                              <MathRenderer text="\int_{0}^{2} (3x^2 - 4x + 1) \, dx" />
                            </div>
                          </div>
                        </div>

                        {/* 4 Interactive Option Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div className="p-3 rounded-xl bg-amber-500/20 border-2 border-amber-400 text-amber-200 font-semibold text-xs sm:text-sm flex items-center justify-between shadow-xs">
                            <span className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-xs">
                                A
                              </span>
                              <span>2</span>
                            </span>
                            <span className="text-[11px] font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded">
                              Selected
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700 text-slate-300 font-medium text-xs sm:text-sm flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 font-bold flex items-center justify-center text-xs">
                              B
                            </span>
                            <span>4</span>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700 text-slate-300 font-medium text-xs sm:text-sm flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 font-bold flex items-center justify-center text-xs">
                              C
                            </span>
                            <span>0</span>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700 text-slate-300 font-medium text-xs sm:text-sm flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 font-bold flex items-center justify-center text-xs">
                              D
                            </span>
                            <span>-1</span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Banner */}
                      <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80">
                        <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Local offline autosave synced</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold">
                            Next Question →
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentChapterIndex === 1 && (
                    /* Scene 2: Teacher Word Importer */
                    <div className="h-full flex flex-col justify-between bg-gradient-to-br from-[#0c152d] to-[#060a17] p-5 rounded-xl border border-slate-800 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                            <UploadCloud className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                              Word (.docx) Document Parser
                            </span>
                            <div className="text-xs text-slate-300 font-medium">Biology_Term_Exam_FormA.docx</div>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                          ✓ 40 MCQs Parsed
                        </span>
                      </div>

                      <div className="my-auto space-y-3 py-3">
                        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-400">Question #12 Auto-Extracted</span>
                            <span className="text-[11px] bg-emerald-950 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
                              Key: [B]
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-200 font-semibold">
                            Which organelle is responsible for generating the majority of cellular adenosine triphosphate (ATP)?
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
                            <div className="p-2 rounded bg-slate-800/80">A. Ribosome</div>
                            <div className="p-2 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold">
                              B. Mitochondria (Key)
                            </div>
                            <div className="p-2 rounded bg-slate-800/80">C. Golgi apparatus</div>
                            <div className="p-2 rounded bg-slate-800/80">D. Lysosome</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 pt-2">
                        <span>Includes automatic detection of mathematical equations &amp; diagrams</span>
                        <span className="bg-amber-500 text-slate-950 font-bold px-3 py-1 rounded-lg">
                          Publish to Student Hub
                        </span>
                      </div>
                    </div>
                  )}

                  {currentChapterIndex === 2 && (
                    /* Scene 3: Teacher Live Surveillance */
                    <div className="h-full flex flex-col justify-between bg-gradient-to-br from-[#0c152d] to-[#060a17] p-5 rounded-xl border border-slate-800 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                            <Eye className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                              Live Proctoring Desk
                            </span>
                            <div className="text-xs text-slate-300 font-medium">Session: Calculus Midterm Hall A</div>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-400 text-xs font-bold border border-blue-500/30">
                          32 Students Active
                        </span>
                      </div>

                      <div className="my-auto space-y-2 py-2">
                        {/* Student Row 1: Normal */}
                        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-200 font-bold flex items-center justify-center text-[11px]">
                              KM
                            </div>
                            <div>
                              <div className="font-bold text-white">Kwame Mensah</div>
                              <div className="text-[11px] text-slate-400">Progress: 18/20 questions</div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Focused (0 Tab Blurs)
                          </span>
                        </div>

                        {/* Student Row 2: Anti-Cheat Warning */}
                        <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/40 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-amber-900 text-amber-200 font-bold flex items-center justify-center text-[11px]">
                              AA
                            </div>
                            <div>
                              <div className="font-bold text-amber-200">Abena Asare</div>
                              <div className="text-[11px] text-amber-400/80">Progress: 14/20 questions</div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            1 Tab Blur Logged (3s)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 pt-2">
                        <span>Automatic timestamped audit log of all student actions</span>
                        <span className="bg-emerald-500 text-slate-950 font-bold px-3 py-1 rounded-lg">
                          Export to Sheets (.csv)
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Video Controls Bar */}
                <div className="relative z-10 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent p-3 sm:p-4 pt-6 space-y-2">
                  {/* Progress / Scrubber Bar */}
                  <div 
                    className="w-full h-2 bg-slate-800 rounded-full overflow-hidden cursor-pointer relative group"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const newProg = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
                      setProgress(newProg);
                    }}
                  >
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-150 relative"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  {/* Buttons Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Play / Pause */}
                      <button
                        type="button"
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center transition-colors cursor-pointer"
                        title={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                      </button>

                      {/* Replay */}
                      <button
                        type="button"
                        onClick={() => setProgress(0)}
                        className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Replay scene"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>

                      {/* Mute Toggle */}
                      <button
                        type="button"
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>

                      {/* Chapter Title Display */}
                      <span className="text-xs font-semibold text-slate-300 hidden sm:inline">
                        Chapter {currentChapter.id}: <strong className="text-amber-400">{currentChapter.title}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Playback Speed */}
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-bold text-slate-400">
                        {([1, 1.5, 2] as const).map((spd) => (
                          <button
                            key={spd}
                            type="button"
                            onClick={() => setPlaybackSpeed(spd)}
                            className={`px-2 py-0.5 rounded cursor-pointer ${
                              playbackSpeed === spd ? 'bg-amber-500/20 text-amber-400' : 'hover:text-white'
                            }`}
                          >
                            {spd}x
                          </button>
                        ))}
                      </div>

                      {/* Fullscreen */}
                      <button
                        type="button"
                        onClick={handleToggleFullscreen}
                        className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Toggle Fullscreen"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chapter Description Box */}
              <div className="p-4 rounded-2xl bg-[#11192e]/80 border border-slate-800 text-xs sm:text-sm text-slate-300 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white mb-0.5">{currentChapter.title}</div>
                  <p className="text-slate-300 leading-relaxed font-normal">{currentChapter.description}</p>
                </div>
              </div>
            </div>
          ) : (
            /* INTERACTIVE TEST-DRIVE MODE */
            <div className="space-y-4 max-w-2xl mx-auto py-2">
              <div className="text-center space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
                  Interactive Live Quiz Sandbox
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold text-white pt-1">
                  Try Answering a Question Right Now
                </h3>
                <p className="text-xs sm:text-sm text-slate-300">
                  Select an option below and submit to experience our instant evaluation engine.
                </p>
              </div>

              {/* Sandbox Card */}
              <div className="bg-[#11192e] border border-slate-700/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-black text-amber-400 uppercase tracking-wide">
                    Question 1 of 1 · Mathematics
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSimulatedCheatTriggered(!simulatedCheatTriggered)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                        simulatedCheatTriggered
                          ? 'bg-red-500 text-white border-red-400'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                      }`}
                    >
                      {simulatedCheatTriggered ? '⚠️ Tab Blur Detected!' : 'Test Anti-Cheat Blur'}
                    </button>
                  </div>
                </div>

                {/* Anti-cheat banner if triggered */}
                {simulatedCheatTriggered && (
                  <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>
                      <strong>Anti-Cheat Alert:</strong> Student navigated away from exam tab. Incident logged to Teacher Surveillance Console.
                    </span>
                  </div>
                )}

                {/* Question Stem */}
                <div className="space-y-2">
                  <div className="text-sm sm:text-base font-bold text-white">
                    What is the fundamental Pythagorean identity for any angle $\theta$?
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 inline-block font-mono text-amber-300 text-sm sm:text-base">
                    <MathRenderer text="\sin^2(\theta) + \cos^2(\theta) = \ ?" />
                  </div>
                </div>

                {/* 4 Interactive Options */}
                <div className="space-y-2 pt-1">
                  {[
                    { text: '1', key: 'A', correct: true },
                    { text: '0', key: 'B', correct: false },
                    { text: '2', key: 'C', correct: false },
                    { text: '\\tan^2(\\theta)', key: 'D', correct: false }
                  ].map((opt, idx) => {
                    const isSelected = selectedAnswer === idx;
                    let optionClasses = 'bg-slate-900/80 border-slate-800 text-slate-200 hover:bg-slate-800/80';

                    if (isSelected && !hasSubmitted) {
                      optionClasses = 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm';
                    } else if (hasSubmitted) {
                      if (opt.correct) {
                        optionClasses = 'bg-emerald-950/60 border-emerald-500 text-emerald-200';
                      } else if (isSelected && !opt.correct) {
                        optionClasses = 'bg-red-950/60 border-red-500 text-red-200';
                      }
                    }

                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handleTestDriveSelect(idx)}
                        disabled={hasSubmitted}
                        className={`w-full text-left p-3 rounded-xl border flex items-center justify-between text-xs sm:text-sm font-semibold transition-all cursor-pointer ${optionClasses}`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              isSelected
                                ? 'bg-amber-400 text-slate-950 font-black'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {opt.key}
                          </span>
                          <span className="font-mono">
                            <MathRenderer text={opt.text} />
                          </span>
                        </div>

                        {hasSubmitted && opt.correct && (
                          <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>Correct</span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Submit & Reset Controls */}
                <div className="pt-2 flex items-center justify-between">
                  {hasSubmitted ? (
                    <button
                      type="button"
                      onClick={handleResetTestDrive}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Try Again</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleTestDriveSubmit}
                      disabled={selectedAnswer === null}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                        selectedAnswer !== null
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <span>Submit Answer</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  {testDriveScore !== null && (
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Instant Score</div>
                      <div
                        className={`text-sm sm:text-base font-black ${
                          testDriveScore === 100 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {testDriveScore === 100 ? '100% · Excellent Work!' : '0% · Review Formula'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 sm:px-6 py-4 bg-[#070b18] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-amber-400" />
            <span>Ready to explore the full platform?</span>
          </div>

          <div className="flex items-center gap-3">
            {onOpenTeacher && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTeacher();
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Teacher Workspace
              </button>
            )}

            {onStartExam && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartExam();
                }}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <span>Take Live Quiz</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
