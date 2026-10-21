import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  X, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  QrCode, 
  FileText,
  Copy,
  ScanLine
} from 'lucide-react';
import { decodeQuizData } from '../utils/quizCompression';
import { QuizConfig } from '../types';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuizDetected: (decodedData: { config: QuizConfig; questions: any[]; sections: any[] } | string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onQuizDetected,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'paste'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [pastedCode, setPastedCode] = useState('');
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Stop camera helper
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    setIsScanning(false);
  };

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported on this browser or context.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsScanning(true);
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError(err.message || 'Unable to access camera. Please allow camera permissions or upload an image.');
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedCode.trim()) return;

    const trimmed = pastedCode.trim();
    const decoded = decodeQuizData(trimmed);
    if (decoded) {
      setScanFeedback('Quiz package successfully decoded!');
      setTimeout(() => {
        onQuizDetected(decoded);
        onClose();
      }, 500);
    } else {
      // Pass the code directly to search in registry
      onQuizDetected(trimmed);
      onClose();
    }
  };

  // File Upload Reader (Parses QR image or text file)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        // Try decoding as text or JSON
        const decoded = decodeQuizData(content);
        if (decoded) {
          setScanFeedback(`Detected assessment: ${decoded.config.title || decoded.config.subject}`);
          setTimeout(() => {
            onQuizDetected(decoded);
            onClose();
          }, 800);
        } else {
          setScanFeedback('File read. Looking up quiz code in registry...');
          setTimeout(() => {
            onQuizDetected(file.name.replace(/\.[^/.]+$/, ''));
            onClose();
          }, 800);
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 relative border border-slate-100 overflow-hidden my-6">
        {/* Close Button */}
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20 shrink-0">
            <ScanLine className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif text-slate-900">
              Scan & Launch Quiz
            </h2>
            <p className="text-xs text-slate-500">
              Scan a printed assessment QR code or paste an offline test code.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-6 gap-2">
          <button
            onClick={() => setActiveTab('camera')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'camera'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Camera Scanner</span>
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'paste'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Copy className="w-4 h-4" />
            <span>Paste Code / AQZ</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'upload'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload File</span>
          </button>
        </div>

        {/* Tab 1: Live Camera Scanner */}
        {activeTab === 'camera' && (
          <div className="space-y-4 text-center">
            <div className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-square flex items-center justify-center border-2 border-indigo-500/50 shadow-inner">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder Target */}
              <div className="absolute inset-12 border-2 border-amber-400/80 rounded-2xl pointer-events-none flex flex-col justify-between p-2 shadow-2xl">
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-t-2 border-l-2 border-amber-400" />
                  <div className="w-4 h-4 border-t-2 border-r-2 border-amber-400" />
                </div>
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-b-2 border-l-2 border-amber-400" />
                  <div className="w-4 h-4 border-b-2 border-r-2 border-amber-400" />
                </div>
              </div>

              {cameraError && (
                <div className="absolute inset-0 bg-slate-950/90 p-6 flex flex-col items-center justify-center text-center text-white space-y-3">
                  <AlertCircle className="w-8 h-8 text-amber-400" />
                  <p className="text-xs text-slate-300 max-w-xs">{cameraError}</p>
                  <button
                    onClick={() => setActiveTab('paste')}
                    className="px-4 py-2 bg-amber-500 text-slate-950 text-xs font-bold rounded-xl cursor-pointer hover:bg-amber-400"
                  >
                    Paste Quiz Code Instead
                  </button>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500">
              Point your camera at the teacher&apos;s screen or printed worksheet QR code.
            </p>
          </div>
        )}

        {/* Tab 2: Paste Code / AQZ */}
        {activeTab === 'paste' && (
          <form onSubmit={handlePasteSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Enter Quiz Code, URL, or Portable AQZ String:
              </label>
              <textarea
                value={pastedCode}
                onChange={(e) => setPastedCode(e.target.value)}
                placeholder="e.g. ALG-SHS1-2026-001, DOC-857, or AQZ_..."
                rows={4}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-400"
              />
            </div>

            {scanFeedback && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{scanFeedback}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Load & Start Assessment</span>
            </button>
          </form>
        )}

        {/* Tab 3: Upload Image / File */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors">
              <Upload className="w-8 h-8 mx-auto text-indigo-600 mb-2" />
              <p className="text-xs font-bold text-slate-800">
                Upload QR Image or Quiz Data File
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Supports PNG, JPEG, JSON, or text export cards.
              </p>
              <input
                type="file"
                accept="image/*,.json,.txt"
                onChange={handleFileUpload}
                className="mt-4 block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />
            </div>

            {scanFeedback && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{scanFeedback}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
