import React, { useState, useEffect, useMemo } from 'react';
import { 
  QrCode, 
  Download, 
  Copy, 
  Check, 
  X, 
  Share2, 
  Printer, 
  WifiOff, 
  Sparkles, 
  ExternalLink, 
  Smartphone,
  BookOpen,
  Layers,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FileCode,
  Globe2,
  HardDriveDownload,
  Wifi,
  Columns
} from 'lucide-react';
import { QuizConfig, Question, QuizSection } from '../types';
import { 
  generateQRCodeDataUrl, 
  encodeQuizToUrl, 
  encodeQuizToSelfContainedUrl, 
  encodeQuizToPortableCode,
  encodeQuizToOfflineUrl
} from '../utils/quizCompression';
import { generateStandaloneOfflineHtmlExam } from '../utils/offlineExamGenerator';
import { saveQuizToOfflineStorage } from '../utils/offlineQuizStorage';
import { DOCUMENT_SIGN_OFF } from '../utils/documentSignOff';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: QuizConfig;
  questions?: Question[];
  sections?: QuizSection[];
  initialMode?: 'online' | 'offline' | 'both';
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  quiz,
  questions = [],
  sections = [],
  initialMode = 'online',
}) => {
  const [onlineQrDataUrl, setOnlineQrDataUrl] = useState<string>('');
  const [offlineQrDataUrl, setOfflineQrDataUrl] = useState<string>('');
  const [copiedOnlineLink, setCopiedOnlineLink] = useState(false);
  const [copiedOfflineLink, setCopiedOfflineLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPortableCode, setCopiedPortableCode] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'qr' | 'print' | 'code' | 'standalone'>('qr');
  const [qrDisplayMode, setQrDisplayMode] = useState<'online' | 'offline' | 'both'>(initialMode);
  const [printQrMode, setPrintQrMode] = useState<'online' | 'offline' | 'both'>(initialMode);
  const [isOnlineLoading, setIsOnlineLoading] = useState(true);
  const [isOfflineLoading, setIsOfflineLoading] = useState(true);
  const [isSelfContainedQr, setIsSelfContainedQr] = useState<boolean>(false);
  const [offlineGenerationKey, setOfflineGenerationKey] = useState<number>(0);

  // Synchronize display mode when initialMode or modal opens
  useEffect(() => {
    if (isOpen && initialMode) {
      setQrDisplayMode(initialMode);
      setPrintQrMode(initialMode);
    }
  }, [isOpen, initialMode]);

  const quizCode = quiz.code || quiz.id || 'QUIZ-001';

  // Online URL (Lightweight, connects to portal via Quiz Code)
  const onlineStudentUrl = useMemo(() => {
    if (!isOpen) return '';
    return encodeQuizToUrl(quiz, questions, sections);
  }, [isOpen, quiz, questions, sections]);

  // Offline URL (Self-contained, includes compressed questions & math in URL)
  const offlineStudentUrl = useMemo(() => {
    if (!isOpen || !quiz) return '';
    try {
      return encodeQuizToSelfContainedUrl(quiz, questions, sections);
    } catch (e) {
      console.warn('Failed to build self-contained quiz URL:', e);
      return '';
    }
  }, [isOpen, quiz, questions, sections]);

  // Offline Fast-Scan URL (Direct offline mode flag, loads pre-cached exam on device from IndexedDB / localStorage)
  const offlinePortalUrl = useMemo(() => {
    if (!isOpen || !quiz) return '';
    try {
      return encodeQuizToOfflineUrl(quiz);
    } catch (e) {
      console.warn('Failed to build offline portal URL:', e);
      return '';
    }
  }, [isOpen, quiz]);

  // Active Offline URL displayed in text input and copied
  const activeOfflineUrl = useMemo(() => {
    if (isSelfContainedQr && offlineStudentUrl && offlineStudentUrl.length <= 1200) {
      return offlineStudentUrl;
    }
    return offlinePortalUrl || `${onlineStudentUrl}&offline=true`;
  }, [isSelfContainedQr, offlineStudentUrl, offlinePortalUrl, onlineStudentUrl]);

  const portableCode = useMemo(() => {
    if (!isOpen) return '';
    return encodeQuizToPortableCode(quiz, questions, sections);
  }, [isOpen, quiz, questions, sections]);

  // Ensure the quiz is stored in local IndexedDB & localStorage for offline resilience
  useEffect(() => {
    if (isOpen && quiz) {
      saveQuizToOfflineStorage(quiz, questions, sections).catch((err) => {
        console.warn('Could not auto-cache quiz to offline storage in QRCodeModal:', err);
      });
    }
  }, [isOpen, quiz, questions, sections]);

  // Generate Online QR Code
  useEffect(() => {
    if (!isOpen || !onlineStudentUrl) return;
    setIsOnlineLoading(true);

    generateQRCodeDataUrl(onlineStudentUrl, {
      width: 480,
      margin: 2,
      colorDark: '#090D1A',
      colorLight: '#FFFFFF',
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        setOnlineQrDataUrl(url);
        setIsOnlineLoading(false);
      })
      .catch((err) => {
        console.error('Failed to generate online QR:', err);
        setIsOnlineLoading(false);
      });
  }, [isOpen, onlineStudentUrl]);

  // Generate Offline URL QR Code
  useEffect(() => {
    if (!isOpen) return;
    setIsOfflineLoading(true);

    const generateOfflineQR = async () => {
      // 1. If self-contained data URL is ultra-compact (<= 900 chars), try self-contained QR
      if (offlineStudentUrl && offlineStudentUrl.length <= 900) {
        try {
          const url = await generateQRCodeDataUrl(offlineStudentUrl, {
            width: 520,
            margin: 2,
            colorDark: '#064E3B', // Distinct emerald dark tint for offline
            colorLight: '#FFFFFF',
            errorCorrectionLevel: 'L',
          });
          if (url) {
            setOfflineQrDataUrl(url);
            setIsSelfContainedQr(true);
            setIsOfflineLoading(false);
            return;
          }
        } catch (selfContainedErr) {
          console.warn('Self-contained payload exceeded QR byte capacity. Falling back to Offline Fast-Scan QR:', selfContainedErr);
        }
      }

      // 2. High-speed Offline Exam QR: Opens offline examination mode reliably via pre-cached storage
      try {
        const fallbackUrl = offlinePortalUrl || `${onlineStudentUrl}&offline=true`;
        const url = await generateQRCodeDataUrl(fallbackUrl, {
          width: 520,
          margin: 2,
          colorDark: '#064E3B', // Distinct emerald dark tint for offline
          colorLight: '#FFFFFF',
          errorCorrectionLevel: 'M',
        });
        if (url) {
          setOfflineQrDataUrl(url);
          setIsSelfContainedQr(false);
          setIsOfflineLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Primary offline QR generation warning:', err);
      }

      // 3. Absolute Guaranteed Fallback: Online student URL tinted for offline with error correction L
      try {
        const emergencyUrl = `${onlineStudentUrl}&offline=true`;
        const url = await generateQRCodeDataUrl(emergencyUrl, {
          width: 520,
          margin: 2,
          colorDark: '#064E3B',
          colorLight: '#FFFFFF',
          errorCorrectionLevel: 'L',
        });
        if (url) {
          setOfflineQrDataUrl(url);
          setIsSelfContainedQr(false);
        }
      } catch (finalErr) {
        console.error('All offline QR generation attempts failed:', finalErr);
      } finally {
        setIsOfflineLoading(false);
      }
    };

    generateOfflineQR();
  }, [isOpen, offlineStudentUrl, offlinePortalUrl, onlineStudentUrl, offlineGenerationKey]);

  if (!isOpen) return null;

  const handleCopyOnlineLink = () => {
    navigator.clipboard.writeText(onlineStudentUrl);
    setCopiedOnlineLink(true);
    setTimeout(() => setCopiedOnlineLink(false), 2500);
  };

  const handleCopyOfflineLink = () => {
    navigator.clipboard.writeText(activeOfflineUrl);
    setCopiedOfflineLink(true);
    setTimeout(() => setCopiedOfflineLink(false), 2500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(quizCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyPortableCode = () => {
    navigator.clipboard.writeText(portableCode);
    setCopiedPortableCode(true);
    setTimeout(() => setCopiedPortableCode(false), 2500);
  };

  const handleDownloadOnlineQR = () => {
    if (!onlineQrDataUrl) return;
    const link = document.createElement('a');
    link.href = onlineQrDataUrl;
    link.download = `QR_ONLINE_${quizCode.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadOfflineQR = () => {
    if (!offlineQrDataUrl) return;
    const link = document.createElement('a');
    link.href = offlineQrDataUrl;
    link.download = `QR_OFFLINE_${quizCode.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadStandaloneHtml = () => {
    const htmlContent = generateStandaloneOfflineHtmlExam(quiz, questions, sections);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Offline_Exam_${quizCode.replace(/[^a-zA-Z0-9_-]/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200 print:p-0 print:bg-white print:static print:inset-auto">
      <div 
        data-printable="true"
        className={`printable-document bg-white rounded-3xl shadow-2xl w-full p-6 sm:p-8 relative border border-slate-100 overflow-hidden my-6 print:m-0 print:shadow-none print:border-none print:max-w-none print:w-full print:rounded-none ${
          qrDisplayMode === 'both' ? 'max-w-4xl' : 'max-w-2xl'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer print:hidden"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3.5 bg-amber-500 text-slate-950 rounded-2xl shadow-lg shadow-amber-500/20 shrink-0">
            <QrCode className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <WifiOff className="w-3 h-3" />
                <span>Online &amp; 100% Offline QR Engine Ready</span>
              </span>
              <span className="text-xs font-mono font-black bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
                <span>Quiz Code:</span>
                <span className="select-all">{quizCode}</span>
              </span>
            </div>
            <h2 className="text-xl font-bold font-serif text-slate-900 mt-1">
              {quiz.title || 'Assessment Examination'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {quiz.subject} • {quiz.classGroup || 'All Classes'} • {questions.length || quiz.totalQuestions} MCQs • {quiz.durationMinutes || 60} Mins
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 mb-6 gap-2 overflow-x-auto print:hidden">
          <button
            onClick={() => setActiveTab('qr')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'qr'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Online &amp; Offline QR Codes</span>
          </button>
          <button
            onClick={() => setActiveTab('print')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'print'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Print Classroom Card</span>
          </button>
          <button
            onClick={() => setActiveTab('standalone')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'standalone'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HardDriveDownload className="w-4 h-4 text-emerald-600" />
            <span>Offline HTML File</span>
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'code'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Copy className="w-4 h-4" />
            <span>Portable Codes</span>
          </button>
        </div>

        {/* Tab 1: Online & Offline QR Codes */}
        {activeTab === 'qr' && (
          <div className="space-y-5">
            {/* Quick Quiz Code Header Card */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-left">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                  Candidate Quiz Code:
                </span>
                <span className="text-base font-mono font-black text-amber-950 tracking-wide select-all block">
                  {quizCode}
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {copiedCode ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Code Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            {/* Mode Switcher: Online QR vs Offline QR vs Side-by-Side */}
            <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 text-xs">
              <button
                onClick={() => setQrDisplayMode('online')}
                className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  qrDisplayMode === 'online'
                    ? 'bg-white text-indigo-900 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Wifi className="w-3.5 h-3.5 text-indigo-600" />
                <span>Online URL QR</span>
              </button>

              <button
                onClick={() => setQrDisplayMode('offline')}
                className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  qrDisplayMode === 'offline'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <WifiOff className="w-3.5 h-3.5 text-emerald-300" />
                <span>Offline URL QR (Zero Server)</span>
              </button>

              <button
                onClick={() => setQrDisplayMode('both')}
                className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer hidden sm:flex ${
                  qrDisplayMode === 'both'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="View Both QR Codes Side-by-Side"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Side-by-Side</span>
              </button>
            </div>

            {/* QR View: Single Online Mode */}
            {qrDisplayMode === 'online' && (
              <div className="space-y-4 text-center animate-in fade-in">
                <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-3 text-left flex items-start gap-2.5">
                  <Globe2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-indigo-950 space-y-0.5">
                    <p className="font-bold">Online Student Assessment URL &amp; QR</p>
                    <p className="text-[11px] text-indigo-800">
                      Standard lightweight scan. Requires device internet/Wi-Fi to fetch exam details from the cloud database and sync answers in real time.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 flex flex-col items-center justify-center relative shadow-inner">
                  {isOnlineLoading ? (
                    <div className="w-52 h-52 flex items-center justify-center text-slate-400 text-xs animate-pulse">
                      Generating Online QR Code...
                    </div>
                  ) : onlineQrDataUrl ? (
                    <div className="space-y-2.5">
                      <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200 inline-block">
                        <img
                          src={onlineQrDataUrl}
                          alt={`Online QR Code for ${quiz.title}`}
                          className="w-52 h-52 object-contain rounded-xl"
                        />
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium max-w-sm mx-auto">
                        Scans directly into the Student Examination Portal for <strong>{quizCode}</strong>.
                      </p>
                    </div>
                  ) : (
                    <div className="text-red-500 text-xs">Failed to render Online QR Code</div>
                  )}
                </div>

                {/* Online URL Input */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Online Candidate Exam URL:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={onlineStudentUrl}
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 select-all"
                    />
                    <button
                      onClick={handleCopyOnlineLink}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {copiedOnlineLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedOnlineLink ? 'Copied' : 'Copy Online URL'}</span>
                    </button>
                    <a
                      href={onlineStudentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl transition-all flex items-center justify-center cursor-pointer shrink-0 font-bold text-xs gap-1"
                      title="Open in New Tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span className="hidden sm:inline">Open</span>
                    </a>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={handleDownloadOnlineQR}
                    className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>Download Online QR (.png)</span>
                  </button>

                  <button
                    onClick={handleCopyOnlineLink}
                    className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copiedOnlineLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedOnlineLink ? 'Online Link Copied!' : 'Copy Online Link'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* QR View: Single Offline Mode */}
            {qrDisplayMode === 'offline' && (
              <div className="space-y-4 text-center animate-in fade-in">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-left flex items-start gap-2.5">
                  <WifiOff className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-950 space-y-0.5">
                    <p className="font-bold">100% Offline URL &amp; QR Code (Zero Server Required)</p>
                    <p className="text-[11px] text-emerald-800">
                      Encodes the entire question bank, options, answers, and LaTeX formulas directly inside the scanned URL string. Students can open and complete the exam with zero internet or server connection.
                    </p>
                  </div>
                </div>

                <div className="bg-emerald-50/40 border-2 border-emerald-200 rounded-2xl p-5 flex flex-col items-center justify-center relative shadow-inner">
                  {isOfflineLoading ? (
                    <div className="w-52 h-52 flex items-center justify-center text-slate-400 text-xs animate-pulse">
                      Generating High-Density Offline QR Code...
                    </div>
                  ) : offlineQrDataUrl ? (
                    <div className="space-y-2.5">
                      <div className="p-3 bg-white rounded-2xl shadow-md border border-emerald-300 inline-block ring-4 ring-emerald-500/10">
                        <img
                          src={offlineQrDataUrl}
                          alt={`Offline QR Code for ${quiz.title}`}
                          className="w-56 h-56 object-contain rounded-xl"
                        />
                      </div>
                      <p className="text-[11px] text-emerald-900 font-medium max-w-sm mx-auto">
                        {isSelfContainedQr
                          ? `100% Offline Scannable: Contains all ${questions.length || quiz.totalQuestions} questions & math formulas.`
                          : `100% Offline Scannable: Loads pre-cached local exam without network query for ${quizCode}.`}
                      </p>
                    </div>
                  ) : (
                    <div className="text-emerald-800 text-xs font-semibold p-4 bg-emerald-100/70 rounded-xl space-y-2 text-center">
                      <p>Preparing offline candidate access...</p>
                      <button
                        type="button"
                        onClick={() => setOfflineGenerationKey((k) => k + 1)}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Generate Offline QR
                      </button>
                    </div>
                  )}
                </div>

                {/* Offline URL Input */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Offline Candidate Exam URL:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={activeOfflineUrl.length > 80 ? activeOfflineUrl.slice(0, 80) + '...' : activeOfflineUrl}
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 select-all"
                    />
                    <button
                      onClick={handleCopyOfflineLink}
                      className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {copiedOfflineLink ? <Check className="w-4 h-4 text-amber-300" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedOfflineLink ? 'Copied' : 'Copy Offline URL'}</span>
                    </button>
                    <a
                      href={activeOfflineUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl transition-all flex items-center justify-center cursor-pointer shrink-0 font-bold text-xs gap-1"
                      title="Open Offline Exam in New Tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span className="hidden sm:inline">Open</span>
                    </a>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={handleDownloadOfflineQR}
                    className="py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-300" />
                    <span>Download Offline QR (.png)</span>
                  </button>

                  <button
                    onClick={handleCopyOfflineLink}
                    className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copiedOfflineLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedOfflineLink ? 'Offline Link Copied!' : 'Copy Offline Link'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* QR View: Both Side-by-Side */}
            {qrDisplayMode === 'both' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
                {/* Online Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-3 text-center">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <Wifi className="w-3 h-3 text-indigo-600" />
                      Online URL QR
                    </span>
                    <h3 className="text-xs font-bold text-slate-900">Standard Cloud Assessment</h3>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm mx-auto inline-block">
                    {onlineQrDataUrl ? (
                      <img src={onlineQrDataUrl} alt="Online QR" className="w-44 h-44 object-contain" />
                    ) : (
                      <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400">Loading...</div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-600 font-medium">
                    Fast scanning. Syncs candidate submissions with online live surveillance.
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={handleDownloadOnlineQR}
                      className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>Download QR</span>
                    </button>
                    <button
                      onClick={handleCopyOnlineLink}
                      className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedOnlineLink ? 'Copied' : 'Copy URL'}</span>
                    </button>
                  </div>
                </div>

                {/* Offline Card */}
                <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4 flex flex-col justify-between space-y-3 text-center">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <WifiOff className="w-3 h-3 text-emerald-700" />
                      Offline URL QR (Zero Server)
                    </span>
                    <h3 className="text-xs font-bold text-slate-900">100% Self-Contained Exam</h3>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-emerald-300 shadow-sm mx-auto inline-block">
                    {isOfflineLoading ? (
                      <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400 animate-pulse">Generating Offline QR...</div>
                    ) : offlineQrDataUrl ? (
                      <img src={offlineQrDataUrl} alt="Offline QR" className="w-44 h-44 object-contain" />
                    ) : (
                      <div className="w-44 h-44 flex items-center justify-center text-xs text-emerald-700 font-medium">Ready for offline scan</div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-600 font-medium">
                    Embeds all questions &amp; math formulas. Works without internet or local server.
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={handleDownloadOfflineQR}
                      className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-300" />
                      <span>Download QR</span>
                    </button>
                    <button
                      onClick={handleCopyOfflineLink}
                      className="flex-1 py-2 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedOfflineLink ? 'Copied' : 'Copy URL'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Standalone Offline Single-File Package */}
        {activeTab === 'standalone' && (
          <div className="space-y-4 text-left">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
              <div className="flex items-center gap-2">
                <HardDriveDownload className="w-5 h-5 text-emerald-700" />
                <h3 className="text-sm font-bold font-serif">100% Offline Single-File HTML Exam</h3>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Download a self-contained <code>.html</code> file containing the entire exam paper, standard KaTeX mathematical formula renderer, timer, student registration, and offline grading.
              </p>
              <ul className="text-xs text-emerald-900 space-y-1 list-disc list-inside">
                <li>Zero internet or server needed — double-click to run on any computer or phone</li>
                <li>Distribute easily via USB flash drives, Bluetooth, or local Wi-Fi router</li>
                <li>Standard mathematical notation rendered with offline KaTeX engine</li>
              </ul>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center space-y-3">
              <div className="text-xs text-slate-600">
                Exam: <strong>{quiz.title}</strong> ({questions.length || quiz.totalQuestions} Questions • {quiz.durationMinutes || 60} Mins)
              </div>
              <button
                onClick={handleDownloadStandaloneHtml}
                className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-amber-300" />
                <span>Download Standalone Offline Exam (.html)</span>
              </button>
            </div>

            <div className="text-xs text-slate-500">
              Teachers can also upload this <code>.html</code> file to Google Drive or local school drives for instant paperless distribution.
            </div>
          </div>
        )}

        {/* Tab 3: Printable Classroom Assessment Sheet */}
        {activeTab === 'print' && (
          <div className="space-y-4">
            {/* Print Selection Toggle (print:hidden) */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs print:hidden">
              <button
                onClick={() => setPrintQrMode('online')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  printQrMode === 'online' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Online QR Card
              </button>
              <button
                onClick={() => setPrintQrMode('offline')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  printQrMode === 'offline' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                Offline QR Card
              </button>
              <button
                onClick={() => setPrintQrMode('both')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  printQrMode === 'both' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                Dual QR Card (Both)
              </button>
            </div>

            {/* Printable Card Container */}
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 bg-slate-50/50 space-y-4 print:border-solid print:bg-white print:p-4">
              <div className="text-center space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {quiz.schoolName || 'MCQ Assessment Network'}
                </div>
                <h3 className="text-lg font-bold font-serif text-slate-900">{quiz.title}</h3>
                <p className="text-xs text-slate-600">
                  Subject: <strong className="text-slate-900">{quiz.subject}</strong> • Class: <strong className="text-slate-900">{quiz.classGroup || 'Year 2'}</strong> • Time: <strong className="text-slate-900">{quiz.durationMinutes || 60} mins</strong>
                </p>
              </div>

              {/* QR Presentation inside Print Card */}
              {printQrMode === 'both' ? (
                <div className="grid grid-cols-2 gap-4 py-2">
                  {/* Left: Online QR */}
                  <div className="p-3 bg-white border border-slate-300 rounded-2xl shadow-sm text-center">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-indigo-700 block mb-1">
                      1. Online Exam QR
                    </span>
                    {onlineQrDataUrl && (
                      <img src={onlineQrDataUrl} alt="Online QR" className="w-36 h-36 mx-auto object-contain" />
                    )}
                    <div className="mt-1.5 text-[10px] font-mono font-bold text-slate-800">
                      Code: {quizCode}
                    </div>
                  </div>

                  {/* Right: Offline QR */}
                  <div className="p-3 bg-white border border-emerald-300 rounded-2xl shadow-sm text-center">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-800 block mb-1">
                      2. Offline URL QR (Zero Server)
                    </span>
                    {offlineQrDataUrl && (
                      <img src={offlineQrDataUrl} alt="Offline QR" className="w-36 h-36 mx-auto object-contain" />
                    )}
                    <div className="mt-1.5 text-[10px] font-mono font-bold text-emerald-900">
                      100% Self-Contained
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-2">
                  <div className="p-3 bg-white border border-slate-300 rounded-2xl shadow-sm text-center">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block mb-1">
                      {printQrMode === 'online' ? 'Online Student Exam QR' : '100% Offline URL QR'}
                    </span>
                    {printQrMode === 'online' && onlineQrDataUrl && (
                      <img src={onlineQrDataUrl} alt="Online QR Code" className="w-44 h-44 mx-auto object-contain" />
                    )}
                    {printQrMode === 'offline' && offlineQrDataUrl && (
                      <img src={offlineQrDataUrl} alt="Offline QR Code" className="w-44 h-44 mx-auto object-contain" />
                    )}
                    <div className="mt-2 text-xs font-mono font-black text-slate-900 bg-amber-100 border border-amber-300 py-1 px-3 rounded-lg">
                      QUIZ CODE: {quizCode}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-700 space-y-1">
                <div className="font-bold text-slate-900">Student Instructions:</div>
                <ol className="list-decimal list-inside text-[11px] text-slate-600 space-y-0.5">
                  <li>Scan the QR code above with any mobile camera or tablet.</li>
                  <li>Or go to the portal and enter Quiz Code: <strong>{quizCode}</strong>.</li>
                  <li>Complete all {questions.length || quiz.totalQuestions} questions before the timer expires.</li>
                  <li>Supports 100% offline devices without active internet connection.</li>
                </ol>
              </div>

              {/* Standard Institutional Sign-Off */}
              <div className="text-center pt-3 border-t border-slate-200 print:border-black">
                <p className="text-xs font-serif italic font-bold text-slate-800 print:text-black tracking-wide">
                  "{DOCUMENT_SIGN_OFF}"
                </p>
              </div>
            </div>

            <button
              onClick={handlePrint}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer print:hidden"
            >
              <Printer className="w-4 h-4" />
              <span>Print Classroom Card / Handout</span>
            </button>
          </div>
        )}

        {/* Tab 4: Portable Quiz Codes & Direct Text Transfer */}
        {activeTab === 'code' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Share this quiz using compact text codes or full offline encoded payloads. Students can paste these directly on any offline device.
            </p>

            {/* Standard Short Code */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Standard Quiz Code:</span>
                <span className="text-[10px] text-slate-400 font-normal">For quick candidate entry</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={quizCode}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 select-all"
                />
                <button
                  onClick={handleCopyCode}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Direct Online URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Online Exam URL:</span>
                <span className="text-[10px] text-indigo-600 font-semibold">Standard Web Link</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={onlineStudentUrl}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-600 select-all overflow-hidden"
                />
                <button
                  onClick={handleCopyOnlineLink}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedOnlineLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedOnlineLink ? 'Copied' : 'Copy Online URL'}</span>
                </button>
              </div>
            </div>

            {/* Self-Contained Offline Web URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Self-Contained Offline Web URL:</span>
                <span className="text-[10px] text-emerald-600 font-semibold">100% Zero-Server</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={offlineStudentUrl.slice(0, 60) + '...'}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-600 select-all overflow-hidden"
                />
                <button
                  onClick={handleCopyOfflineLink}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedOfflineLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedOfflineLink ? 'Copied' : 'Copy Offline URL'}</span>
                </button>
              </div>
            </div>

            {/* Portable Offline Code */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Portable Offline String (AQZ Code):</span>
                <span className="text-[10px] text-slate-500 font-semibold">For text transfer</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={portableCode.slice(0, 60) + '...'}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-600 select-all overflow-hidden"
                />
                <button
                  onClick={handleCopyPortableCode}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedPortableCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedPortableCode ? 'Copied' : 'Copy AQZ'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer with Sign-Off */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 print:hidden">
          <span className="flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Dual Online &amp; Offline QR Protocol</span>
          </span>
          <span className="font-serif italic font-bold text-indigo-950 text-xs">
            "{DOCUMENT_SIGN_OFF}"
          </span>
          <button
            onClick={onClose}
            className="font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
