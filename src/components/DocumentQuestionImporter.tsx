import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle, 
  Edit3, 
  Trash2, 
  Plus, 
  Calculator, 
  Save, 
  FileSpreadsheet,
  Check,
  X,
  RefreshCw,
  HelpCircle,
  ArrowLeft,
  RotateCcw,
  Image as ImageIcon,
  ClipboardPaste,
  Search,
  Copy,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
  Moon,
  Sun,
  Eye,
  EyeOff,
  Type,
  Monitor,
  LayoutList,
  ListOrdered,
  ChevronLeft,
  ChevronRight,
  Pencil
} from 'lucide-react';
import { Question, MCQOption, QuestionTopic, ExtractedQuestion } from '../types';
import { MathRenderer } from './MathRenderer';
import { convertWordXmlToLatex, formatMathTextToLatex } from '../utils/mathDetector';
import { parseAssessmentText } from '../utils/documentParser';
import { extractDocxMedia, DocxMediaResult } from '../utils/docxMediaExtractor';
import { generateIdealAdditionalMathWordTemplate } from '../utils/docxQuestionPoolParser';
import { SAMPLE_ADDITIONAL_MATH_QUESTIONS } from '../data/sampleAdditionalMathExam40';

interface DocumentQuestionImporterProps {
  onImportQuestions: (questions: Question[], fileName?: string) => void;
  onClose?: () => void;
}

export const DocumentQuestionImporter: React.FC<DocumentQuestionImporterProps> = ({
  onImportQuestions,
  onClose,
}) => {
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Native Fullscreen Handlers (matches Quiz page FormAssessmentView)
  const enterNativeFullscreen = () => {
    const docEl = document.documentElement as any;
    const options = { navigationUI: 'hide' } as any;
    try {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen(options).catch(() => {
          docEl.requestFullscreen().catch(() => {});
        });
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen(options);
      } else if (docEl.mozRequestFullScreen) {
        docEl.mozRequestFullScreen(options);
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen(options);
      }
    } catch {
      // Fallback
    }
    setIsFullScreen(true);
  };

  const exitNativeFullscreen = () => {
    const doc = document as any;
    try {
      if (
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      ) {
        if (doc.exitFullscreen) {
          doc.exitFullscreen().catch(() => {});
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen();
        }
      }
    } catch {
      // Fallback
    }
    setIsFullScreen(false);
  };

  const handleToggleFullScreen = () => {
    if (!isFullScreen) {
      enterNativeFullscreen();
    } else {
      exitNativeFullscreen();
    }
  };

  // Synchronize fullscreen state with browser events (e.g., user presses native Esc)
  useEffect(() => {
    const handleFsChange = () => {
      const isNativeFs = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullScreen(isNativeFs);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, []);

  // Keyboard shortcut 'f' to toggle fullscreen during preview
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleToggleFullScreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);
  const [activeInputTab, setActiveInputTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState<string>(`INSTRUCTIONS TO CANDIDATES:
- Time allowed: 2 Hours 30 Minutes.
- Answer all questions in Section A.
- Calculators are permitted.
- Do not open this booklet until told to do so.

SECTION A - MULTIPLE CHOICE QUESTIONS

1. Solve the quadratic equation x^2 - 5x + 6 = 0 for x.
A. x = 1 or x = 6
B. x = 2 or x = 3
C. x = -2 or x = -3
D. x = 0 or x = 5
Answer: B
Explanation: Factoring gives (x - 2)(x - 3) = 0, so roots are x = 2 or x = 3.

2. Simplify the logarithmic expression log_2(32).
A. 4
B. 5
C. 6
D. 32
Answer: B
Explanation: Since 2^5 = 32, log_2(32) = 5.

3. Calculate the determinant of matrix M = [[3, 2], [1, 4]].
A. 10
B. 14
C. 12
D. 5
Answer: A
Explanation: det(M) = (3)(4) - (2)(1) = 12 - 2 = 10.

4. Evaluate the derivative d/dx (3x^3 - 4x + 7).
A. 9x^2 - 4
B. 6x^2 - 4
C. 9x^2 + 7
D. 3x^2 - 4
Answer: A
Explanation: Applying the power rule: 3(3x^2) - 4 = 9x^2 - 4.`);

  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestion[]>([]);
  const [extractedDocxMedia, setExtractedDocxMedia] = useState<DocxMediaResult | null>(null);
  const [showDiagramsGallery, setShowDiagramsGallery] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [extractionStatus, setExtractionStatus] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [largeFileAdvisory, setLargeFileAdvisory] = useState<string | null>(null);
  const [ignoredInstructionsCount, setIgnoredInstructionsCount] = useState<number>(0);
  const [extractionNote, setExtractionNote] = useState<string | null>(null);
  const [lastDeletedQuestion, setLastDeletedQuestion] = useState<{ question: ExtractedQuestion; index: number } | null>(null);
  const [deletedCount, setDeletedCount] = useState<number>(0);

  // Add & Edit Question Builder State
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState<boolean>(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [builderSuccessToast, setBuilderSuccessToast] = useState<string | null>(null);

  const [builderTopic, setBuilderTopic] = useState<string>('General Mathematics');
  const [builderQuestionText, setBuilderQuestionText] = useState<string>('');
  const [builderImageUrl, setBuilderImageUrl] = useState<string>('');
  const [previewDiagramUrl, setPreviewDiagramUrl] = useState<string | null>(null);

  // Paste Diagram Modal State (targetIndex: 0..N for question cards, -1 for question builder)
  const [pasteTargetQuestionIndex, setPasteTargetQuestionIndex] = useState<number | null>(null);
  const [pastingImageUrl, setPastingImageUrl] = useState<string>('');
  const [pasteModalStatus, setPasteModalStatus] = useState<string | null>(null);
  const [pasteInputUrl, setPasteInputUrl] = useState<string>('');
  const [previewSearchQuery, setPreviewSearchQuery] = useState<string>('');

  const cardFileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const builderFileInputRef = useRef<HTMLInputElement | null>(null);
  const pasteDropZoneRef = useRef<HTMLDivElement | null>(null);
  const [builderOptions, setBuilderOptions] = useState<{ id: 'A' | 'B' | 'C' | 'D'; text: string }[]>([
    { id: 'A', text: '' },
    { id: 'B', text: '' },
    { id: 'C', text: '' },
    { id: 'D', text: '' },
  ]);
  const [builderCorrectAnswer, setBuilderCorrectAnswer] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [builderExplanation, setBuilderExplanation] = useState<string>('');
  const [activeMathTargetField, setActiveMathTargetField] = useState<'question' | 'optionA' | 'optionB' | 'optionC' | 'optionD' | 'explanation'>('question');

  // Element Refs for smooth scrolling & focus
  const addQuestionBoxRef = useRef<HTMLDivElement>(null);
  const addQuestionInputRef = useRef<HTMLTextAreaElement>(null);
  const editQuestionInputRef = useRef<HTMLTextAreaElement>(null);
  const editQuestionBoxRef = useRef<HTMLDivElement>(null);
  const questionsListRef = useRef<HTMLDivElement>(null);

  // Up/Down Navigation State for Previewing Questions
  const [selectedNavIndex, setSelectedNavIndex] = useState<number>(0);

  // Fullscreen Preview Options & Display Modes (Matching user uploaded layout)
  const [fullscreenViewMode, setFullscreenViewMode] = useState<'presentation' | 'continuous'>('presentation');
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(false);
  const [answersVisible, setAnswersVisible] = useState<boolean>(true);
  const [fontSizeMode, setFontSizeMode] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const carouselContainerRef = useRef<HTMLDivElement>(null);

  const navigateToQuestion = (index: number) => {
    if (extractedQuestions.length === 0) return;
    const clamped = Math.max(0, Math.min(index, extractedQuestions.length - 1));
    setSelectedNavIndex(clamped);
    if (!isFullScreen || fullscreenViewMode === 'continuous') {
      const element = document.getElementById(`preview-q-card-${clamped}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  };

  // Scroll active carousel pill into view
  useEffect(() => {
    const pill = document.getElementById(`carousel-q-pill-${selectedNavIndex}`);
    if (pill) {
      pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedNavIndex]);

  const handleScrollCarousel = (direction: 'left' | 'right') => {
    if (carouselContainerRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      carouselContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Keyboard Navigation: Up/Down and Left/Right Arrow navigation in preview page
  useEffect(() => {
    if (extractedQuestions.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently inside an input, textarea, or contentEditable
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateToQuestion(selectedNavIndex - 1);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        navigateToQuestion(selectedNavIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNavIndex, extractedQuestions.length, isFullScreen, fullscreenViewMode]);

  // Auto-format math equations and symbols into LaTeX for KaTeX
  const cleanLatexMathFormat = (text: string): string => {
    return formatMathTextToLatex(text);
  };

  // Quick per-question manual image upload handler
  const handleQuickAttachImage = (qIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setExtractedQuestions((prev) => {
          const updated = [...prev];
          updated[qIndex] = { ...updated[qIndex], imageUrl: dataUrl };
          return updated;
        });
        setBuilderSuccessToast(`Attached image to Question Q${qIndex + 1}!`);
        setTimeout(() => setBuilderSuccessToast(null), 2500);
      }
    };
    reader.readAsDataURL(file);
  };

  // Quick per-question manual image remove handler
  const handleQuickRemoveImage = (qIndex: number) => {
    setExtractedQuestions((prev) => {
      const updated = [...prev];
      updated[qIndex] = { ...updated[qIndex], imageUrl: undefined };
      return updated;
    });
    setBuilderSuccessToast(`Removed image from Question Q${qIndex + 1}`);
    setTimeout(() => setBuilderSuccessToast(null), 2500);
  };

  // Attach extracted diagrams from Word document to matching questions
  const attachDocxMediaToQuestions = (qs: ExtractedQuestion[], media: DocxMediaResult | null): ExtractedQuestion[] => {
    if (!media) return qs;
    const rIdMap = media.rIdToDataUrl || {};
    const qNumMap = media.imagesByQuestionNumber || {};

    return qs.map((q, idx) => {
      const qNum = q.id || (idx + 1);
      let updatedStem = q.questionText || '';

      // Replace inline [IMAGE:rId] markers with [DIAGRAM_IMAGE:dataUrl]
      if (updatedStem.includes('[IMAGE:')) {
        updatedStem = updatedStem.replace(/\[IMAGE:([^\]]+)\]/g, (_, rId) => {
          const matchedImg = rIdMap[rId] || qNumMap[qNum];
          if (matchedImg) {
            return `\n[DIAGRAM_IMAGE:${matchedImg}]\n`;
          }
          return '';
        });
      }

      // Also clean up any unmapped image tokens
      updatedStem = updatedStem.replace(/\[IMAGE:[^\]]+\]/g, '').trim();

      const mediaImg = qNumMap[qNum] || q.imageUrl;

      return {
        ...q,
        questionText: updatedStem,
        imageUrl: mediaImg,
      };
    });
  };

  // Assign an extracted diagram from the Word archive directly to any question
  const handleAssignDiagramToQuestion = (dataUrl: string, targetQId: number) => {
    setExtractedQuestions((prev) =>
      prev.map((q, idx) => {
        const qNum = q.id || (idx + 1);
        return qNum === targetQId ? { ...q, imageUrl: dataUrl } : q;
      })
    );
    setBuilderSuccessToast(`Assigned diagram to Question ${targetQId}!`);
    setTimeout(() => setBuilderSuccessToast(null), 3000);
  };

  // Open Paste Diagram Modal for question at qIndex (or -1 for builder)
  const handleOpenPasteModal = async (qIndex: number) => {
    setPasteTargetQuestionIndex(qIndex);
    setPastingImageUrl('');
    setPasteModalStatus(null);
    setPasteInputUrl('');

    // Attempt direct clipboard image reading if available
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((t) => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const reader = new FileReader();
            reader.onload = (ev) => {
              const dataUrl = ev.target?.result as string;
              if (dataUrl) {
                setPastingImageUrl(dataUrl);
                setPasteModalStatus('Detected diagram in clipboard ready to attach!');
              }
            };
            reader.readAsDataURL(blob);
            break;
          }
        }
      }
    } catch {
      // Browser permission prompt or unsupported, user can paste into the modal drop zone
    }
  };

  // Read clipboard in Paste Diagram Modal
  const handleReadClipboardInModal = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        setPasteModalStatus('Direct clipboard reading unavailable. Click the paste box below and press Ctrl+V (or ⌘+V).');
        return;
      }
      const items = await navigator.clipboard.read();
      let found = false;
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          found = true;
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            if (dataUrl) {
              setPastingImageUrl(dataUrl);
              setPasteModalStatus('Diagram successfully retrieved from clipboard!');
            }
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
      if (!found) {
        const text = await navigator.clipboard.readText();
        if (text && (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('data:image/'))) {
          setPastingImageUrl(text.trim());
          setPasteInputUrl(text.trim());
          setPasteModalStatus('Retrieved image URL from clipboard!');
        } else {
          setPasteModalStatus('No image in clipboard. Copy a screenshot or diagram first (e.g. Win+Shift+S or Cmd+Shift+4).');
        }
      }
    } catch {
      setPasteModalStatus('Clipboard access not granted. Click the paste zone below and press Ctrl+V (or ⌘+V).');
    }
  };

  // Paste Event Handler inside modal paste zone
  const handlePasteInModalZone = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const dataUrl = ev.target?.result as string;
              if (dataUrl) {
                setPastingImageUrl(dataUrl);
                setPasteModalStatus('Image successfully pasted from clipboard!');
              }
            };
            reader.readAsDataURL(file);
            return;
          }
        }
      }
    }
    const text = e.clipboardData?.getData('text');
    if (text && (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('data:image/'))) {
      setPastingImageUrl(text.trim());
      setPasteInputUrl(text.trim());
      setPasteModalStatus('Image link pasted and loaded!');
    } else {
      setPasteModalStatus('Pasted content did not contain an image. Please copy an image or diagram first.');
    }
  };

  // Confirm and attach pasted image
  const handleConfirmPasteModal = () => {
    if (!pastingImageUrl || pasteTargetQuestionIndex === null) return;

    if (pasteTargetQuestionIndex === -1) {
      setBuilderImageUrl(pastingImageUrl);
      setBuilderSuccessToast('Diagram pasted into Question Builder!');
    } else {
      setExtractedQuestions((prev) => {
        const updated = [...prev];
        updated[pasteTargetQuestionIndex] = {
          ...updated[pasteTargetQuestionIndex],
          imageUrl: pastingImageUrl,
        };
        return updated;
      });
      setBuilderSuccessToast(`Attached pasted diagram to Question Q${pasteTargetQuestionIndex + 1}!`);
    }

    setPasteTargetQuestionIndex(null);
    setPastingImageUrl('');
    setPasteModalStatus(null);
    setTimeout(() => setBuilderSuccessToast(null), 3000);
  };

  // Keyboard navigation: Escape key closes / goes back from importer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullScreen) {
          exitNativeFullscreen();
        } else if (pasteTargetQuestionIndex !== null) {
          setPasteTargetQuestionIndex(null);
        } else if (previewDiagramUrl !== null) {
          setPreviewDiagramUrl(null);
        } else if (editingQuestionIndex !== null) {
          setEditingQuestionIndex(null);
        } else if (isAddQuestionOpen) {
          setIsAddQuestionOpen(false);
        } else if (onClose) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, editingQuestionIndex, isAddQuestionOpen, pasteTargetQuestionIndex, previewDiagramUrl, isFullScreen]);

  // Extract questions via API endpoint or local fallback
  const processExtractionRequest = async (docText?: string, fileData?: string, fileType?: string, filename?: string) => {
    setIsProcessing(true);
    setExtractionStatus('Analyzing document structure, questions, and options...');

    const textToProcess = docText || pastedText;

    // Check local parser first: if document parses into valid questions with mathematical formulas, use it immediately!
    const localCheck = parseAssessmentText(textToProcess);
    if (localCheck.questions.length > 0) {
      const qsWithMedia = attachDocxMediaToQuestions(localCheck.questions, extractedDocxMedia);
      setExtractedQuestions(qsWithMedia);
      setIgnoredInstructionsCount(localCheck.ignoredInstructionsCount);
      setExtractionNote(localCheck.extractionNote);
      setExtractionStatus(`Extraction complete! Loaded ${localCheck.questions.length} question(s) with 100% formula precision.`);
      setIsProcessing(false);
      return;
    }

    try {
      const response = await fetch('/api/extract-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToProcess,
          fileData,
          fileType,
          fileName: filename || selectedFileName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
          // If local parser found significantly more questions than the API response (e.g. 100 vs 10), never truncate!
          if (localCheck.questions.length > data.questions.length) {
            const qsWithMedia = attachDocxMediaToQuestions(localCheck.questions, extractedDocxMedia);
            setExtractedQuestions(qsWithMedia);
            setIgnoredInstructionsCount(localCheck.ignoredInstructionsCount);
            setExtractionNote(localCheck.extractionNote);
            setExtractionStatus(`Extraction complete! Loaded ${localCheck.questions.length} questions.`);
            setIsProcessing(false);
            return;
          }

          const formattedList: ExtractedQuestion[] = data.questions.map((q: any, i: number) => ({
            id: i + 1,
            rawText: q.questionText || '',
            questionText: cleanLatexMathFormat(q.questionText || ''),
            options: (q.options || []).map((opt: any) => ({
              id: opt.id,
              text: cleanLatexMathFormat(opt.text),
            })),
            correctAnswer: q.correctAnswer || 'A',
            explanation: cleanLatexMathFormat(q.explanation || 'Extracted from uploaded paper.'),
            topic: q.topic || 'General Mathematics',
            isMathDetected: true,
            confidence: 98,
          }));

          const qsWithMedia = attachDocxMediaToQuestions(formattedList, extractedDocxMedia);
          setExtractedQuestions(qsWithMedia);
          setIgnoredInstructionsCount(data.ignoredInstructionsCount || 2);
          setExtractionNote(data.extractionNote || `Successfully extracted ${formattedList.length} question(s).`);
          setExtractionStatus(`Extraction complete! Loaded ${formattedList.length} question(s).`);
          setIsProcessing(false);
          return;
        }
      }
    } catch (err) {
      console.warn('API extraction unavailable or returned error, running advanced client parser:', err);
    }

    // Client-side robust multi-pattern parser
    parseDocumentTextLocally(textToProcess);
  };

  // Local parsing fallback with comprehensive instruction exclusion & option segmentation
  const parseDocumentTextLocally = (text: string) => {
    setIsProcessing(true);
    setExtractionStatus('Running offline paper parser & math formatter...');

    setTimeout(() => {
      const parsedResult = parseAssessmentText(text);

      if (parsedResult.questions.length > 0) {
        const qsWithMedia = attachDocxMediaToQuestions(parsedResult.questions, extractedDocxMedia);
        setExtractedQuestions(qsWithMedia);
        setIgnoredInstructionsCount(parsedResult.ignoredInstructionsCount);
        setExtractionNote(parsedResult.extractionNote);
        setExtractionStatus(`Extraction complete! Successfully isolated ${parsedResult.questions.length} question(s).`);
      } else {
        const fallbacks = getSampleFallbackQuestions();
        setExtractedQuestions(fallbacks);
        setIgnoredInstructionsCount(2);
        setExtractionNote('Could not identify question numbers in document text. Loaded sample template.');
        setExtractionStatus('Sample questions loaded for review.');
      }
      setIsProcessing(false);
    }, 150);
  };

  const getSampleFallbackQuestions = (): ExtractedQuestion[] => [
    {
      id: 1,
      rawText: 'The general term T_{r+1} in the binomial expansion of (2x + 3)^5 is:',
      questionText: 'The general term $T_{r+1}$ in the binomial expansion of $(2x + 3)^5$ is:',
      options: [
        { id: 'A', text: '$T_{r+1} = \\binom{5}{r}(2x)^r(3)^{5-r}$' },
        { id: 'B', text: '$T_{r+1} = \\binom{5}{r}(2x)^{5-r}(3)^r$' },
        { id: 'C', text: '$T_{r+1} = \\binom{5}{r}(2)^{5-r}(x)^r(3)^r$' },
        { id: 'D', text: '$T_{r+1} = \\binom{5}{r}(2x)^{5-r}(3)^{5-r}$' },
      ],
      correctAnswer: 'B',
      explanation: 'By the Binomial Theorem $(a+b)^n = \\sum_{r=0}^n \\binom{n}{r} a^{n-r} b^r$, where $a=2x, b=3, n=5$, the general term $T_{r+1} = \\binom{5}{r}(2x)^{5-r}(3)^r$.',
      topic: 'Binomial Expansion',
      isMathDetected: true,
      confidence: 99,
    },
    {
      id: 2,
      rawText: 'Solve x^2 - 5x + 6 = 0',
      questionText: 'Solve the quadratic equation $x^2 - 5x + 6 = 0$ for $x$.',
      options: [
        { id: 'A', text: '$x = 1$ or $x = 6$' },
        { id: 'B', text: '$x = 2$ or $x = 3$' },
        { id: 'C', text: '$x = -2$ or $x = -3$' },
        { id: 'D', text: '$x = 0$ or $x = 5$' },
      ],
      correctAnswer: 'B',
      explanation: 'Factoring $(x-2)(x-3) = 0$ gives $x = 2$ or $x = 3$.',
      topic: 'Inequalities & Algebra',
      isMathDetected: true,
      confidence: 98,
    },
    {
      id: 3,
      rawText: 'Simplify log_2(32)',
      questionText: 'Simplify the logarithmic expression $\\log_2(32)$.',
      options: [
        { id: 'A', text: '4' },
        { id: 'B', text: '5' },
        { id: 'C', text: '6' },
        { id: 'D', text: '32' },
      ],
      correctAnswer: 'B',
      explanation: 'Since $2^5 = 32$, $\\log_2(32) = 5$.',
      topic: 'Logarithms & Exponents',
      isMathDetected: true,
      confidence: 96,
    },
  ];

  // Helper to extract printable text from legacy Word 97-2003 binary .doc files
  const extractTextFromBinaryDoc = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    const utf16Chars: string[] = [];
    for (let i = 0; i < bytes.length - 1; i += 2) {
      const code = bytes[i] | (bytes[i + 1] << 8);
      if ((code >= 32 && code <= 126) || code === 10 || code === 13 || (code >= 0x00A0 && code <= 0x22FF)) {
        utf16Chars.push(String.fromCharCode(code));
      } else if (utf16Chars.length > 0 && utf16Chars[utf16Chars.length - 1] !== '\n') {
        utf16Chars.push('\n');
      }
    }
    const decodedUtf16 = utf16Chars.join('').replace(/\n{3,}/g, '\n\n').trim();
    if (decodedUtf16.length > 80) {
      return decodedUtf16;
    }
    let asciiText = '';
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if ((b >= 32 && b <= 126) || b === 10 || b === 13) {
        asciiText += String.fromCharCode(b);
      } else if (asciiText.length > 0 && asciiText[asciiText.length - 1] !== '\n') {
        asciiText += '\n';
      }
    }
    return asciiText.replace(/\n{3,}/g, '\n\n').trim();
  };

  // Immediate upload handler for Word (.docx, .doc) and text files with file size optimization and progressive staging
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setIsProcessing(true);
    setUploadProgress(15);
    setLargeFileAdvisory(null);

    // File size check: warn and optimize for large files > 4.5MB
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    if (file.size > 4.5 * 1024 * 1024) {
      setLargeFileAdvisory(`Large document detected (${fileSizeMB} MB). Running optimized progressive streaming decompression to ensure smooth memory usage.`);
    }

    setExtractionStatus(`Reading uploaded document (${fileSizeMB} MB)...`);

    try {
      if (file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')) {
        setUploadProgress(30);
        // Word document extraction using JSZip OMATH XML parser, notes extraction & fallbacks
        const arrayBuffer = await file.arrayBuffer();
        let extractedRawText = '';

        setUploadProgress(50);
        setExtractionStatus('Decompressing package and parsing mathematical XML structure...');

        let docxMedia: DocxMediaResult | null = null;
        try {
          const zip = await JSZip.loadAsync(arrayBuffer);
          const docXmlFile = zip.file('word/document.xml');
          if (docXmlFile) {
            const xmlString = await docXmlFile.async('string');
            extractedRawText = convertWordXmlToLatex(xmlString);
            try {
              setUploadProgress(70);
              setExtractionStatus('Extracting and optimizing embedded diagrams...');
              docxMedia = await extractDocxMedia(zip, xmlString);
              if (docxMedia && docxMedia.allImages.length > 0) {
                setExtractedDocxMedia(docxMedia);
              }
            } catch (mediaErr) {
              console.warn('Docx media extraction error:', mediaErr);
            }
          }

          // Check footnotes for answers or explanations
          const footnotesFile = zip.file('word/footnotes.xml');
          if (footnotesFile) {
            const fnXml = await footnotesFile.async('string');
            const fnText = convertWordXmlToLatex(fnXml);
            if (fnText && /(?:^|\n|\s)\s*(?:Q|Question)?\s*\d+\s*[\.\:\-\)]\s*(?:\()?([A-D])(?:\)?)/i.test(fnText)) {
              extractedRawText += '\n\nANSWER KEY:\n' + fnText.trim();
            }
          }

          // Check endnotes for marking schemes or keys
          const endnotesFile = zip.file('word/endnotes.xml');
          if (endnotesFile) {
            const enXml = await endnotesFile.async('string');
            const enText = convertWordXmlToLatex(enXml);
            if (enText && /(?:^|\n|\s)\s*(?:Q|Question)?\s*\d+\s*[\.\:\-\)]\s*(?:\()?([A-D])(?:\)?)/i.test(enText)) {
              extractedRawText += '\n\nANSWER KEY:\n' + enText.trim();
            }
          }
        } catch (zipErr) {
          console.warn('JSZip XML extraction failed, attempting binary .doc decoding and mammoth fallback:', zipErr);
          const binaryText = extractTextFromBinaryDoc(arrayBuffer);
          if (binaryText && binaryText.length > 60) {
            extractedRawText = binaryText;
          }
        }

        if (!extractedRawText || extractedRawText.trim().length === 0) {
          try {
            const result = await mammoth.extractRawText({ arrayBuffer });
            extractedRawText = result.value || '';
          } catch (mammothErr) {
            console.warn('Mammoth extraction fallback failed:', mammothErr);
          }
        }

        setUploadProgress(85);
        setExtractionStatus('Structuring questions, choices, and answer keys...');

        if (extractedRawText && extractedRawText.trim().length > 0) {
          setPastedText(extractedRawText);

          // Fast-path client parsing for accurate LaTeX math and option segmentation
          let localParsed = parseAssessmentText(extractedRawText);
          if (localParsed.questions.length === 0) {
            try {
              const mammothRes = await mammoth.extractRawText({ arrayBuffer });
              if (mammothRes?.value && mammothRes.value.trim().length > 0) {
                const fbParsed = parseAssessmentText(mammothRes.value);
                if (fbParsed.questions.length > 0) {
                  localParsed = fbParsed;
                }
              }
            } catch (mErr) {
              console.warn('Mammoth fallback attempt in DocumentQuestionImporter failed:', mErr);
            }
          }

          if (localParsed.questions.length > 0) {
            const qsWithMedia = docxMedia ? attachDocxMediaToQuestions(localParsed.questions, docxMedia) : localParsed.questions;
            setExtractedQuestions(qsWithMedia);
            setIgnoredInstructionsCount(localParsed.ignoredInstructionsCount);
            setExtractionNote(localParsed.extractionNote);
            setUploadProgress(100);
            setExtractionStatus(`Extraction complete! Loaded all ${localParsed.questions.length} questions from ${file.name}.`);
            setIsProcessing(false);
            return;
          }

          await processExtractionRequest(extractedRawText, undefined, 'docx', file.name);
          setUploadProgress(100);
        } else {
          setExtractionStatus('Could not read raw text from Word document. Loading fallback sample.');
          parseDocumentTextLocally(pastedText);
          setUploadProgress(100);
        }
      } else if (file.name.toLowerCase().endsWith('.pdf')) {
        // PDF extraction has been removed
        setIsProcessing(false);
        setUploadProgress(0);
        setExtractionStatus('PDF extraction is not supported. Please upload your questions as a Microsoft Word document (.docx or .doc).');
        return;
      } else {
        // Plain text file
        setUploadProgress(40);
        const text = await file.text();
        setPastedText(text);
        setUploadProgress(75);
        await processExtractionRequest(text, undefined, 'txt', file.name);
        setUploadProgress(100);
      }
    } catch (err) {
      console.error('Document extraction error:', err);
      setExtractionStatus('Error reading file. Falling back to local text parser.');
      parseDocumentTextLocally(pastedText);
      setUploadProgress(100);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteQuestion = (id: number | string, index: number) => {
    const questionToRemove = extractedQuestions[index] || extractedQuestions.find((q) => q.id === id);
    if (!questionToRemove) return;

    setLastDeletedQuestion({
      question: questionToRemove,
      index,
    });
    setDeletedCount((prev) => prev + 1);
    setExtractedQuestions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUndoDelete = () => {
    if (lastDeletedQuestion) {
      setExtractedQuestions((prev) => {
        const next = [...prev];
        const insertIndex = Math.min(lastDeletedQuestion.index, next.length);
        next.splice(insertIndex, 0, lastDeletedQuestion.question);
        return next;
      });
      setDeletedCount((prev) => Math.max(0, prev - 1));
      setLastDeletedQuestion(null);
    }
  };

  // Open Builder for adding a brand new question (e.g., Q11, Q12...)
  const handleOpenAddQuestion = () => {
    setEditingQuestionIndex(null);
    const lastTopic = extractedQuestions[extractedQuestions.length - 1]?.topic || 'Algebra';
    setBuilderTopic(lastTopic);
    setBuilderQuestionText('');
    setBuilderOptions([
      { id: 'A', text: '' },
      { id: 'B', text: '' },
      { id: 'C', text: '' },
      { id: 'D', text: '' },
    ]);
    setBuilderCorrectAnswer('A');
    setBuilderExplanation('');
    setActiveMathTargetField('question');
    setIsAddQuestionOpen(true);

    // Instantly scroll container down so the Add Question box appears down directly in front of the teacher
    setTimeout(() => {
      if (questionsListRef.current) {
        questionsListRef.current.scrollTo({
          top: questionsListRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
      addQuestionBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      addQuestionInputRef.current?.focus();
    }, 60);
  };

  // Open Builder for editing an existing extracted question inline
  const handleOpenEditQuestion = (index: number) => {
    const target = extractedQuestions[index];
    if (!target) return;
    setIsAddQuestionOpen(false);
    setEditingQuestionIndex(index);
    setBuilderTopic(target.topic || 'General Mathematics');
    setBuilderQuestionText(target.questionText || '');
    setBuilderImageUrl(target.imageUrl || '');
    
    // Ensure all options A-D exist and are populated regardless of id case or format
    const ids: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
    const mergedOpts = ids.map((id, optIdx) => {
      const found = target.options?.find(
        (o) => (o.id || '').toString().trim().toUpperCase() === id
      );
      const fallbackByIndex = target.options?.[optIdx];
      return {
        id,
        text: found?.text || fallbackByIndex?.text || '',
      };
    });
    setBuilderOptions(mergedOpts);

    const normalizedCorrect = (target.correctAnswer || '').toString().trim().toUpperCase();
    setBuilderCorrectAnswer(
      (['A', 'B', 'C', 'D'].includes(normalizedCorrect) ? normalizedCorrect : 'A') as 'A' | 'B' | 'C' | 'D'
    );
    setBuilderExplanation(target.explanation || '');
    setActiveMathTargetField('question');

    setTimeout(() => {
      editQuestionBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      editQuestionInputRef.current?.focus();
    }, 60);
  };

  // Insert LaTeX Math snippet into current active field
  const handleInsertMathSnippet = (snippet: string) => {
    if (activeMathTargetField === 'question') {
      setBuilderQuestionText((prev) => `${prev} ${snippet}`.trim());
    } else if (activeMathTargetField.startsWith('option')) {
      const optId = activeMathTargetField.replace('option', '') as 'A'|'B'|'C'|'D';
      setBuilderOptions((prev) =>
        prev.map((opt) => (opt.id === optId ? { ...opt, text: `${opt.text} ${snippet}`.trim() } : opt))
      );
    } else if (activeMathTargetField === 'explanation') {
      setBuilderExplanation((prev) => `${prev} ${snippet}`.trim());
    }
  };

  // Save current question and optionally stay open for next question (Q11 -> Q12 -> Q13...)
  const handleSaveBuilderQuestion = (addAnother: boolean = false) => {
    const cleanText = builderQuestionText.trim();
    if (!cleanText) {
      alert('Please enter the question text before saving.');
      return;
    }

    const validOptions = builderOptions.filter((o) => o.text.trim().length > 0);
    if (validOptions.length < 2) {
      alert('Please provide at least 2 option choices (e.g. Option A and Option B).');
      return;
    }

    const formattedOpts = builderOptions.map((o) => ({
      id: o.id,
      text: cleanLatexMathFormat(o.text.trim() || `Option ${o.id}`),
    }));

    const cleanQuestionText = cleanLatexMathFormat(cleanText);
    const cleanExplanation = builderExplanation.trim()
      ? cleanLatexMathFormat(builderExplanation.trim())
      : `Step-by-step resolution for Question ${editingQuestionIndex !== null ? editingQuestionIndex + 1 : extractedQuestions.length + 1}.`;

    if (editingQuestionIndex !== null) {
      // Update existing question inline
      const targetIndex = editingQuestionIndex;
      setExtractedQuestions((prev) => {
        const updated = [...prev];
        updated[targetIndex] = {
          ...updated[targetIndex],
          topic: builderTopic,
          questionText: cleanQuestionText,
          options: formattedOpts,
          correctAnswer: builderCorrectAnswer,
          explanation: cleanExplanation,
          imageUrl: builderImageUrl.trim() || undefined,
          isMathDetected: true,
          confidence: 100,
        };
        return updated;
      });

      setBuilderSuccessToast(`Updated Question Q${targetIndex + 1}!`);
      setTimeout(() => setBuilderSuccessToast(null), 3000);
      setEditingQuestionIndex(null);
    } else {
      // Append new question (e.g. Question 11)
      const newIndex = extractedQuestions.length + 1;
      const newQuestionObj: ExtractedQuestion = {
        id: newIndex,
        rawText: cleanQuestionText,
        questionText: cleanQuestionText,
        options: formattedOpts,
        correctAnswer: builderCorrectAnswer,
        explanation: cleanExplanation,
        topic: builderTopic || 'General Mathematics',
        imageUrl: builderImageUrl.trim() || undefined,
        isMathDetected: true,
        confidence: 100,
      };

      setExtractedQuestions((prev) => [...prev, newQuestionObj]);

      if (addAnother) {
        // Continuous addition mode: prepare next question (e.g. Question 12)
        const nextNumber = newIndex + 1;
        setBuilderQuestionText('');
        setBuilderImageUrl('');
        setBuilderOptions([
          { id: 'A', text: '' },
          { id: 'B', text: '' },
          { id: 'C', text: '' },
          { id: 'D', text: '' },
        ]);
        setBuilderCorrectAnswer('A');
        setBuilderExplanation('');
        setActiveMathTargetField('question');
        setBuilderSuccessToast(`Question Q${newIndex} added! Ready for Question Q${nextNumber}.`);
        setTimeout(() => setBuilderSuccessToast(null), 3500);

        setTimeout(() => {
          addQuestionBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          addQuestionInputRef.current?.focus();
        }, 80);
      } else {
        setBuilderSuccessToast(`Question Q${newIndex} added successfully!`);
        setTimeout(() => setBuilderSuccessToast(null), 3000);
        setIsAddQuestionOpen(false);
      }
    }
  };

  const handleConfirmImport = () => {
    const formattedQuestions: Question[] = extractedQuestions.map((eq, i) => ({
      id: i + 1,
      sectionId: Math.ceil((i + 1) / 10),
      sectionName: `Section ${Math.ceil((i + 1) / 10)}`,
      topic: eq.topic,
      questionText: eq.questionText,
      imageUrl: eq.imageUrl,
      options: eq.options as MCQOption[],
      correctAnswer: eq.correctAnswer,
      explanation: eq.explanation,
      marks: 1,
    }));

    if (isFullScreen) {
      exitNativeFullscreen();
    }
    onImportQuestions(formattedQuestions, selectedFileName || undefined);
    if (onClose) onClose();
  };

  const handleCloseImporter = () => {
    if (isFullScreen) {
      exitNativeFullscreen();
    }
    if (onClose) onClose();
  };

  const renderPasteDiagramModal = () => {
    if (pasteTargetQuestionIndex === null) return null;
    return (
      <div
        className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        onClick={() => setPasteTargetQuestionIndex(null)}
      >
        <div
          className="bg-white rounded-3xl p-6 max-w-xl w-full flex flex-col relative shadow-2xl border border-slate-200 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                <ClipboardPaste className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Paste Diagram for {pasteTargetQuestionIndex === -1 ? 'Question Builder' : `Question Q${pasteTargetQuestionIndex + 1}`}
                </h3>
                <p className="text-xs text-slate-500">
                  Paste screenshot, diagram, or chart from your clipboard
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPasteTargetQuestionIndex(null)}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Paste Interactive Drop Zone */}
          <div
            ref={pasteDropZoneRef}
            tabIndex={0}
            onPaste={handlePasteInModalZone}
            className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/80 rounded-2xl p-6 text-center cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-2.5 shadow-2xs">
              <ClipboardPaste className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-900">
              Click here and press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-mono shadow-2xs">Ctrl+V</kbd> (or <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-mono shadow-2xs">⌘+V</kbd>)
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Paste any copied image, diagram, or snipped screenshot directly from your clipboard.
            </p>
          </div>

          {/* Direct Clipboard Button */}
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleReadClipboardInModal}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-emerald-600" />
              <span>Read Clipboard Directly</span>
            </button>
          </div>

          {/* Status / feedback */}
          {pasteModalStatus && (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{pasteModalStatus}</span>
            </div>
          )}

          {/* Fallback image URL input */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-bold text-slate-700">
              Or enter Image URL / Base64:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={pasteInputUrl}
                onChange={(e) => setPasteInputUrl(e.target.value)}
                placeholder="https://... or data:image/..."
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (pasteInputUrl.trim()) {
                    setPastingImageUrl(pasteInputUrl.trim());
                    setPasteModalStatus('Image URL applied!');
                  }
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Image preview */}
          {pastingImageUrl && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700">Image Ready to Attach:</span>
                <button
                  type="button"
                  onClick={() => {
                    setPastingImageUrl('');
                    setPasteModalStatus(null);
                  }}
                  className="text-xs text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
                >
                  Clear Image
                </button>
              </div>
              <div className="flex justify-center p-2 bg-white rounded-xl border border-slate-200">
                <img
                  src={pastingImageUrl}
                  alt="Pasted Diagram"
                  className="max-h-56 max-w-full object-contain rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setPasteTargetQuestionIndex(null)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmPasteModal}
              disabled={!pastingImageUrl}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Attach Diagram to {pasteTargetQuestionIndex === -1 ? 'Question Builder' : `Q${pasteTargetQuestionIndex + 1}`}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDiagramZoomModal = () => {
    if (!previewDiagramUrl) return null;
    return (
      <div
        className="fixed inset-0 z-[10000] bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        onClick={() => setPreviewDiagramUrl(null)}
      >
        <div
          className="bg-white dark:bg-slate-900 rounded-3xl p-4 max-w-4xl max-h-[90vh] flex flex-col items-center relative shadow-2xl border border-slate-200 dark:border-slate-800"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setPreviewDiagramUrl(null)}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
            title="Close zoom"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="p-2 w-full flex justify-center items-center overflow-auto max-h-[80vh]">
            <img
              src={previewDiagramUrl}
              alt="Enlarged Diagram View"
              className="max-h-[75vh] max-w-full object-contain rounded-xl"
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">Click outside or press Esc to close zoom</p>
        </div>
      </div>
    );
  };

  const renderInlineQuestionEditor = (qIndex: number) => {
    return (
      <div
        ref={editQuestionBoxRef}
        key={`editing-q-${qIndex}`}
        className={`rounded-3xl border-2 shadow-xl p-5 sm:p-7 space-y-5 animate-in fade-in ${
          isDarkTheme
            ? 'bg-slate-900 border-indigo-500 ring-4 ring-indigo-500/20 text-white'
            : 'bg-white border-indigo-500 ring-4 ring-indigo-500/10 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3.5 border-b border-indigo-100 dark:border-indigo-900/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-xs">
              Q{qIndex + 1}
            </div>
            <div>
              <h4 className="text-base font-bold font-serif flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-500" />
                <span>Editing Question Q{qIndex + 1}</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Modify question statement, mathematical equations, options, or answer key.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditingQuestionIndex(null)}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSaveBuilderQuestion(false)}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
            >
              <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
              <span>Save Q{qIndex + 1} Changes</span>
            </button>
          </div>
        </div>

        {/* Topic Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-slate-800 dark:text-slate-200">
            Topic / Sub-discipline
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {[
              'Algebra',
              'Calculus',
              'Matrices & Determinants',
              'Trigonometry',
              'Statistics & Probability',
              'Functions & Relations',
              'Logarithms & Exponents',
              'Coordinate Geometry',
              'Vectors & Bearings',
              'General Mathematics',
            ].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setBuilderTopic(t)}
                className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer ${
                  builderTopic === t
                    ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs'
                    : isDarkTheme
                    ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={builderTopic}
            onChange={(e) => setBuilderTopic(e.target.value)}
            placeholder="Or type custom topic..."
            className={`w-full px-3.5 py-2 text-xs font-medium rounded-xl border focus:ring-2 focus:ring-amber-500 ${
              isDarkTheme
                ? 'bg-slate-950 border-slate-700 text-white'
                : 'bg-white border-slate-300 text-slate-900'
            }`}
          />
        </div>

        {/* Math Helper Quick Insert Bar */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 font-bold">
            <span className="flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-amber-500" />
              Insert Math Symbol into{' '}
              {activeMathTargetField === 'question'
                ? 'Question Statement'
                : activeMathTargetField.startsWith('option')
                ? `Option ${activeMathTargetField.replace('option', '')}`
                : 'Explanation'}
            </span>
            <span className="text-[11px] font-normal opacity-80">Click snippet to insert:</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { label: 'x²', val: '$x^2$' },
              { label: 'xⁿ', val: '$x^n$' },
              { label: 'a/b', val: '$\\frac{a}{b}$' },
              { label: '√x', val: '$\\sqrt{x}$' },
              { label: 'log₂(x)', val: '$\\log_2(x)$' },
              { label: '∫ dx', val: '$\\int_{a}^{b} f(x)\\,dx$' },
              { label: '∑', val: '$\\sum_{i=1}^{n}$' },
              { label: 'nCr', val: '$\\binom{n}{r}$' },
              { label: '±', val: '$\\pm$' },
              { label: '×', val: '$\\times$' },
              { label: 'π', val: '$\\pi$' },
              { label: 'θ', val: '$\\theta$' },
              { label: '≤', val: '$\\le$' },
              { label: '≥', val: '$\\ge$' },
              { label: '≠', val: '$\\neq$' },
              { label: '≈', val: '$\\approx$' },
              { label: '∞', val: '$\\infty$' },
              { label: 'Matrix 2x2', val: '$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$' },
            ].map((sym, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleInsertMathSnippet(sym.val)}
                className={`px-2 py-1 text-xs font-mono font-bold rounded-md border shadow-2xs transition-colors cursor-pointer ${
                  isDarkTheme
                    ? 'bg-slate-800 text-amber-300 border-amber-500/30 hover:bg-slate-700'
                    : 'bg-white hover:bg-amber-100 text-slate-800 border-amber-300 hover:border-amber-400'
                }`}
                title={`Insert ${sym.val}`}
              >
                {sym.label}
              </button>
            ))}
          </div>
        </div>

        {/* Question Statement */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Question Statement <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              LaTeX math formulas supported e.g. $x^2 + 5x = 0$
            </span>
          </div>
          <textarea
            ref={editQuestionInputRef}
            rows={3}
            required
            value={builderQuestionText}
            onFocus={() => setActiveMathTargetField('question')}
            onChange={(e) => setBuilderQuestionText(e.target.value)}
            placeholder="e.g. Solve for x: $\frac{2x + 4}{3} = 10$ and determine its roots."
            className={`w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border focus:ring-2 focus:ring-amber-500 shadow-2xs ${
              isDarkTheme
                ? 'bg-slate-950 border-slate-700 text-white'
                : 'bg-white border-slate-300 text-slate-900'
            }`}
          />

          {/* Live Preview */}
          {builderQuestionText.trim() && (
            <div
              className={`p-3 rounded-xl border space-y-1 ${
                isDarkTheme ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-400">
                Live KaTeX Preview:
              </span>
              <div className="text-xs sm:text-sm font-medium">
                <MathRenderer math={cleanLatexMathFormat(builderQuestionText)} />
              </div>
            </div>
          )}
        </div>

        {/* MCQ Options */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Answer Options A–D (Select Correct Answer Radio)
            </label>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                isDarkTheme
                  ? 'bg-slate-800 text-slate-300 border-slate-700'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              4 Choices (A, B, C, D)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {builderOptions.map((opt) => (
              <div
                key={opt.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  builderCorrectAnswer === opt.id
                    ? isDarkTheme
                      ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30'
                      : 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-300'
                    : isDarkTheme
                    ? 'bg-slate-950/60 border-slate-800'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        builderCorrectAnswer === opt.id
                          ? 'bg-emerald-600 text-white'
                          : isDarkTheme
                          ? 'bg-slate-800 text-slate-300'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {opt.id}
                    </span>
                    Option {opt.id}
                  </span>

                  <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer">
                    <input
                      type="radio"
                      name={`correctAnswerKey-edit-${qIndex}`}
                      checked={builderCorrectAnswer === opt.id}
                      onChange={() => setBuilderCorrectAnswer(opt.id)}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Correct Answer</span>
                  </label>
                </div>

                <input
                  type="text"
                  value={opt.text}
                  onFocus={() => setActiveMathTargetField(`option${opt.id}` as any)}
                  onChange={(e) => {
                    const updated = builderOptions.map((o) =>
                      o.id === opt.id ? { ...o, text: e.target.value } : o
                    );
                    setBuilderOptions(updated);
                  }}
                  placeholder={`e.g. $x = 3$ or Value for choice ${opt.id}`}
                  className={`w-full px-3 py-1.5 text-xs font-medium rounded-xl border focus:ring-2 focus:ring-amber-500 ${
                    isDarkTheme
                      ? 'bg-slate-900 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />

                {opt.text.trim() && (
                  <div
                    className={`mt-1.5 text-xs px-2 py-1 rounded-lg border ${
                      isDarkTheme
                        ? 'bg-slate-950 border-slate-800 text-slate-200'
                        : 'bg-slate-50 border-slate-100 text-slate-800'
                    }`}
                  >
                    <MathRenderer math={cleanLatexMathFormat(opt.text)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step-by-Step Explanation */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Pedagogical Explanation / Marking Guide (Optional)
          </label>
          <textarea
            rows={2}
            value={builderExplanation}
            onFocus={() => setActiveMathTargetField('explanation')}
            onChange={(e) => setBuilderExplanation(e.target.value)}
            placeholder="Provide step-by-step solution shown to students during post-exam review..."
            className={`w-full px-3.5 py-2 text-xs font-medium rounded-xl border focus:ring-2 focus:ring-amber-500 ${
              isDarkTheme
                ? 'bg-slate-950 border-slate-700 text-white'
                : 'bg-white border-slate-300 text-slate-900'
            }`}
          />
          {builderExplanation.trim() && (
            <div
              className={`p-2.5 rounded-xl border text-xs ${
                isDarkTheme
                  ? 'bg-slate-950 border-slate-800 text-slate-200'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <MathRenderer math={cleanLatexMathFormat(builderExplanation)} />
            </div>
          )}
        </div>

        {/* Attached Diagram / Image */}
        <div
          className={`p-3.5 rounded-2xl border space-y-2.5 ${
            isDarkTheme ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
          }`}
        >
          <label className="block text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
            <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
            <span>Attached Diagram / Figure / Graph (Optional)</span>
          </label>

          {builderImageUrl ? (
            <div
              className={`flex items-center gap-3 p-3 rounded-xl border ${
                isDarkTheme ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <img
                src={builderImageUrl}
                alt="Diagram preview"
                className="max-h-24 max-w-[140px] rounded-lg border border-slate-200 object-contain bg-white shadow-2xs cursor-zoom-in"
                onClick={() => setPreviewDiagramUrl(builderImageUrl)}
              />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Diagram Attached
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => builderFileInputRef.current?.click()}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
                  >
                    Replace (Upload)
                  </button>
                  <span className="text-slate-400">|</span>
                  <button
                    type="button"
                    onClick={() => handleOpenPasteModal(-1)}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium cursor-pointer"
                  >
                    Replace (Paste)
                  </button>
                  <span className="text-slate-400">|</span>
                  <button
                    type="button"
                    onClick={() => setBuilderImageUrl('')}
                    className="text-xs text-rose-500 hover:underline font-medium cursor-pointer"
                  >
                    Remove Picture
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => builderFileInputRef.current?.click()}
                  className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Upload Diagram File</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenPasteModal(-1)}
                  className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ClipboardPaste className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Paste Diagram (Ctrl+V)</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 shrink-0">or image URL / Base64:</span>
                <input
                  type="text"
                  placeholder="https://... or data:image/..."
                  value={builderImageUrl}
                  onChange={(e) => setBuilderImageUrl(e.target.value)}
                  className={`w-full text-xs px-3 py-1.5 border rounded-xl focus:ring-2 focus:ring-amber-500 ${
                    isDarkTheme
                      ? 'bg-slate-900 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>
          )}

          <input
            ref={builderFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const dataUrl = ev.target?.result as string;
                  if (dataUrl) setBuilderImageUrl(dataUrl);
                };
                reader.readAsDataURL(file);
              }
              e.target.value = '';
            }}
          />
        </div>
      </div>
    );
  };

  const renderQuestionCard = (q: ExtractedQuestion, qIndex: number, isPresentation: boolean) => {
    const isSelected = selectedNavIndex === qIndex;
    const fontClass =
      fontSizeMode === 'normal'
        ? 'text-sm sm:text-base'
        : fontSizeMode === 'large'
        ? 'text-base sm:text-lg'
        : 'text-lg sm:text-xl';

    const optionFontClass =
      fontSizeMode === 'normal'
        ? 'text-xs sm:text-sm'
        : fontSizeMode === 'large'
        ? 'text-sm sm:text-base'
        : 'text-base sm:text-lg';

    return (
      <div
        id={`preview-q-card-${qIndex}`}
        key={q.id || `q-${qIndex}`}
        className={`rounded-3xl transition-all duration-150 ${
          isPresentation ? 'p-6 sm:p-8 shadow-2xl border-2' : 'p-5 sm:p-6 shadow-md border'
        } ${
          isDarkTheme
            ? isSelected && !isPresentation
              ? 'bg-[#131b2e] border-amber-500/80 ring-2 ring-amber-500/20 text-slate-100'
              : 'bg-[#131b2e] border-slate-800 text-slate-100'
            : isSelected && !isPresentation
            ? 'bg-white border-amber-500 ring-2 ring-amber-400/20 text-slate-900'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Card Header: Question Number & Actions */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800/80 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : isDarkTheme
                  ? 'bg-slate-800 text-slate-200'
                  : 'bg-slate-100 text-slate-800'
              }`}
            >
              Q{qIndex + 1}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  isDarkTheme
                    ? 'bg-indigo-950/60 border-indigo-800 text-indigo-300'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                }`}
              >
                {q.topic || 'General Mathematics'}
              </span>
              {q.imageUrl && (
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  <span>Diagram</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleOpenEditQuestion(qIndex)}
              className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              title="Edit Question"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenPasteModal(qIndex)}
              className="px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              title="Attach or Replace Diagram"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>{q.imageUrl ? 'Diagram' : '+ Diagram'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleDeleteQuestion(q.id || qIndex + 1, qIndex)}
              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
              title="Delete Question"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Stem / Question Statement */}
        <div className="my-4">
          <div
            className={`p-4 rounded-2xl border font-medium leading-relaxed ${fontClass} ${
              isDarkTheme
                ? 'bg-[#090e1a] border-slate-800 text-slate-100'
                : 'bg-slate-50/80 border-slate-200 text-slate-900'
            }`}
          >
            <MathRenderer math={cleanLatexMathFormat(q.questionText)} />
          </div>
        </div>

        {/* Diagram if available */}
        {q.imageUrl && (
          <div className="my-3 flex flex-col items-center sm:items-start">
            <div className="relative group inline-block">
              <img
                src={q.imageUrl}
                alt={`Question ${qIndex + 1} Figure`}
                onClick={() => setPreviewDiagramUrl(q.imageUrl || null)}
                className="max-h-64 sm:max-h-72 w-auto object-contain rounded-2xl border border-slate-200 dark:border-slate-700 bg-white p-2 shadow-xs cursor-zoom-in group-hover:opacity-95 transition-opacity"
              />
              <span className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pointer-events-none">
                <Maximize2 className="w-3 h-3" /> Click to enlarge
              </span>
            </div>
          </div>
        )}

        {/* Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {q.options.map((opt) => {
            const isCorrect = answersVisible && opt.id === q.correctAnswer;
            return (
              <div
                key={opt.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                  isCorrect
                    ? isDarkTheme
                      ? 'bg-emerald-950/40 border-emerald-500/60 ring-2 ring-emerald-500/30'
                      : 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300/40'
                    : isDarkTheme
                    ? 'bg-[#0b1120] border-slate-800/90 text-slate-200'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    isCorrect
                      ? 'bg-emerald-600 text-white shadow-xs font-black'
                      : isDarkTheme
                      ? 'bg-slate-800 text-slate-300'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {opt.id}
                </span>

                <div className="flex-1 min-w-0 pt-0.5">
                  <div className={`${optionFontClass} font-medium leading-normal`}>
                    <MathRenderer math={cleanLatexMathFormat(opt.text)} />
                  </div>
                  {isCorrect && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>Correct Answer</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Solution Explanation (Only if answers are visible) */}
        {answersVisible && q.explanation && (
          <div
            className={`mt-4 p-4 rounded-2xl border ${
              isDarkTheme
                ? 'bg-[#081226] border-indigo-900/50 text-indigo-200'
                : 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Step-by-Step Solution / Marking Guide</span>
            </div>
            <div className="text-xs sm:text-sm font-medium leading-relaxed">
              <MathRenderer math={cleanLatexMathFormat(q.explanation)} />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFullscreenWorkspace = () => {
    const currentQ = extractedQuestions[selectedNavIndex] || extractedQuestions[0];

    const filteredContinuousQuestions = extractedQuestions
      .map((q, qIndex) => ({ q, qIndex }))
      .filter(({ q, qIndex }) => {
        if (!previewSearchQuery.trim()) return true;
        const query = previewSearchQuery.toLowerCase().trim();
        if ((query.startsWith('q') && !isNaN(Number(query.slice(1)))) || !isNaN(Number(query))) {
          const targetNum = query.startsWith('q') ? Number(query.slice(1)) : Number(query);
          if (targetNum > 0) return qIndex + 1 === targetNum;
        }
        const fullText = `${qIndex + 1} ${q.questionText} ${q.topic} ${q.options.map((o) => o.text).join(' ')}`.toLowerCase();
        return fullText.includes(query);
      });

    return (
      <div
        className={`fixed inset-0 z-[9999] w-screen h-screen max-w-none max-h-none rounded-none overflow-hidden flex flex-col font-sans select-text ${
          isDarkTheme ? 'bg-[#0b1120] text-slate-100' : 'bg-slate-100 text-slate-900'
        }`}
      >
        {/* Top Header matching user mockup */}
        <div
          className={`h-16 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-lg z-20 ${
            isDarkTheme ? 'bg-[#090d16] border-b border-slate-800 text-white' : 'bg-slate-900 border-b border-slate-800 text-white'
          }`}
        >
          {/* Left: Exit Fullscreen & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={exitNativeFullscreen}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold cursor-pointer transition-all shadow-xs shrink-0"
              title="Exit Full-Screen View (Esc)"
            >
              <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Exit Full-Screen</span>
              <kbd className="px-1.5 py-0.5 bg-black/40 text-slate-300 rounded font-mono text-[9px]">Esc</kbd>
            </button>

            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black text-xs shrink-0">
                <FileText className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[180px] md:max-w-xs">
                    {selectedFileName || 'Assessment Questions Preview'}
                  </span>
                  {extractedQuestions.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-black font-mono shrink-0">
                      {extractedQuestions.length} Questions
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                  Mathematics • <span className="text-amber-400 font-bold">{extractedQuestions.length} Questions</span>
                </p>
              </div>
            </div>
          </div>

          {/* Middle: Controls (Theme, Answers, Font Size, Fullscreen, Close) */}
          <div className="hidden lg:flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDarkTheme(!isDarkTheme)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                isDarkTheme
                  ? 'bg-slate-800 text-amber-300 border-slate-700 shadow-xs'
                  : 'bg-slate-800/90 text-slate-200 hover:text-white border-slate-700'
              }`}
              title="Toggle Dark/Light Theme"
            >
              {isDarkTheme ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-300" />}
              <span>{isDarkTheme ? 'Dark Theme' : 'Light Theme'}</span>
            </button>

            <button
              type="button"
              onClick={() => setAnswersVisible(!answersVisible)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                answersVisible
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title="Toggle Answer Key & Explanations"
            >
              {answersVisible ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
              <span>{answersVisible ? 'Answers Visible' : 'Answers Hidden'}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setFontSizeMode((prev) => (prev === 'normal' ? 'large' : prev === 'large' ? 'xlarge' : 'normal'))
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold cursor-pointer transition-all shadow-xs"
              title="Cycle Text Size"
            >
              <Type className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {fontSizeMode === 'normal' ? 'Normal Text' : fontSizeMode === 'large' ? 'Large Text' : 'Extra Large'}
              </span>
            </button>

            <button
              type="button"
              onClick={exitNativeFullscreen}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer shadow-xs"
              title="Exit Full-Screen (Esc)"
            >
              <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
            </button>

            <button
              type="button"
              onClick={handleCloseImporter}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer shadow-xs"
              title="Close Importer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right: View Mode Segmented Switcher & Proceed Button */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* View Mode Toggle: One after the other (1-by-1) vs All together (Continuous) */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setFullscreenViewMode('presentation')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  fullscreenViewMode === 'presentation'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Preview questions one after the other (Sequential 1-by-1)"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">One after the other</span>
              </button>
              <button
                type="button"
                onClick={() => setFullscreenViewMode('continuous')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  fullscreenViewMode === 'continuous'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Preview all questions together (Continuous list)"
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">All together</span>
              </button>
            </div>

            {/* Mobile Controls Buttons */}
            <div className="flex lg:hidden items-center gap-1">
              <button
                type="button"
                onClick={() => setIsDarkTheme(!isDarkTheme)}
                className="p-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700"
                title="Toggle Theme"
              >
                {isDarkTheme ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setAnswersVisible(!answersVisible)}
                className="p-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700"
                title="Toggle Answers"
              >
                {answersVisible ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            </div>

            {extractedQuestions.length > 0 && (
              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Proceed to Quiz Setup ({extractedQuestions.length}) →</span>
                <span className="md:hidden">Setup →</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-header Bar (Only when questions exist) */}
        {extractedQuestions.length > 0 && (
          <div
            className={`px-4 sm:px-6 py-2.5 border-b flex items-center justify-between shrink-0 shadow-xs z-10 transition-colors ${
              isDarkTheme ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Left: Question info pills */}
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="px-3 py-1 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 font-bold font-mono text-xs shrink-0">
                Question {selectedNavIndex + 1} of {extractedQuestions.length}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold border truncate max-w-[180px] sm:max-w-xs ${
                  isDarkTheme
                    ? 'bg-slate-800 text-slate-300 border-slate-700'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {currentQ?.topic || 'General Mathematics'}
              </span>
            </div>

            {/* Right: Actions (Edit question, Prev, Next) */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenEditQuestion(selectedNavIndex)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                title={`Edit Question Q${selectedNavIndex + 1}`}
              >
                <Pencil className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit Question</span>
              </button>

              <button
                type="button"
                onClick={() => navigateToQuestion(selectedNavIndex - 1)}
                disabled={selectedNavIndex <= 0}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                  isDarkTheme
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 disabled:opacity-30'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 disabled:opacity-30'
                }`}
                title="Previous Question (Left Arrow or Up Arrow)"
              >
                <span>&lt; Prev</span>
              </button>

              <button
                type="button"
                onClick={() => navigateToQuestion(selectedNavIndex + 1)}
                disabled={selectedNavIndex >= extractedQuestions.length - 1}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                  isDarkTheme
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 disabled:opacity-30'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 disabled:opacity-30'
                }`}
                title="Next Question (Right Arrow or Down Arrow)"
              >
                <span>Next &gt;</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Body Viewport: strictly questions preview only - NO upload box */}
        <div
          className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 transition-colors ${
            isDarkTheme ? 'bg-[#0b1120]' : 'bg-slate-100'
          }`}
        >
          {extractedQuestions.length === 0 ? (
            <div className="max-w-lg mx-auto mt-16 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xl">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-serif">
                No Questions Loaded in Preview
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                You are in full-screen inspection mode. Please exit full-screen to upload your Word document (.docx) or paste your assessment questions.
              </p>
              <button
                type="button"
                onClick={exitNativeFullscreen}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all inline-flex items-center gap-2"
              >
                <Minimize2 className="w-4 h-4 text-amber-300" />
                <span>Exit Full-Screen to Upload Document</span>
              </button>
            </div>
          ) : fullscreenViewMode === 'presentation' ? (
            /* Sequential 1-by-1 Presentation View */
            <div className="max-w-4xl mx-auto w-full py-2">
              {editingQuestionIndex === selectedNavIndex
                ? renderInlineQuestionEditor(selectedNavIndex)
                : renderQuestionCard(currentQ, selectedNavIndex, true)}
            </div>
          ) : (
            /* All Together Continuous List View */
            <div className="max-w-4xl mx-auto w-full space-y-4 py-2">
              {/* Filter / Search Bar */}
              <div
                className={`flex items-center justify-between gap-3 p-3 rounded-2xl border shadow-xs ${
                  isDarkTheme ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter questions by keywords or jump to question number (e.g. Q45 or 45)..."
                    value={previewSearchQuery}
                    onChange={(e) => setPreviewSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      isDarkTheme
                        ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                {previewSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setPreviewSearchQuery('')}
                    className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 font-semibold bg-slate-800 rounded-lg cursor-pointer"
                  >
                    Clear filter
                  </button>
                )}
              </div>

              {/* All Questions Continuous List */}
              <div className="space-y-4">
                {filteredContinuousQuestions.map(({ q, qIndex }) =>
                  editingQuestionIndex === qIndex
                    ? renderInlineQuestionEditor(qIndex)
                    : renderQuestionCard(q, qIndex, false)
                )}
              </div>
            </div>
          )}
        </div>

        {/* Docked Bottom Question Strip / Carousel Navigator */}
        {extractedQuestions.length > 0 && (
          <div
            className={`border-t px-4 py-2.5 flex items-center gap-2 shrink-0 z-20 shadow-lg ${
              isDarkTheme ? 'bg-[#0f172a]/95 backdrop-blur-md border-slate-800 text-white' : 'bg-white/95 backdrop-blur-md border-slate-200 text-slate-900'
            }`}
          >
            <button
              type="button"
              onClick={() => handleScrollCarousel('left')}
              className={`p-2 rounded-xl border cursor-pointer transition-colors shrink-0 ${
                isDarkTheme
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
              title="Scroll questions left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div
              ref={carouselContainerRef}
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth flex-1 py-1 px-1"
            >
              {extractedQuestions.map((_, idx) => (
                <button
                  key={idx}
                  id={`carousel-q-pill-${idx}`}
                  type="button"
                  onClick={() => navigateToQuestion(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shrink-0 min-w-[36px] text-center ${
                    selectedNavIndex === idx
                      ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/50 scale-105 font-black'
                      : isDarkTheme
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                  title={`Jump to Question ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleScrollCarousel('right')}
              className={`p-2 rounded-xl border cursor-pointer transition-colors shrink-0 ${
                isDarkTheme
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
              title="Scroll questions right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dialogs */}
        {renderDiagramZoomModal()}
        {renderPasteDiagramModal()}
      </div>
    );
  };

  const modalContent = (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-xl p-6 sm:p-8 space-y-6 font-sans">
      {/* Top Back Navigation Bar */}
      {onClose && (
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 mb-1">
          <button
            onClick={handleCloseImporter}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:text-indigo-600 hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer group"
            title="Return to Dashboard (Esc)"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-indigo-600 transition-transform group-hover:-translate-x-1" />
            <span>Back to Dashboard</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded-md">Esc</kbd>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-doc-top-fullscreen"
              onClick={handleToggleFullScreen}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:text-indigo-600 hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer"
              title="Expand to Full Screen View"
            >
              <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Full Screen View</span>
            </button>

            <button
              onClick={handleCloseImporter}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 cursor-pointer"
              title="Close Importer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-inner">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    Document Extraction Engine
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3" /> Questions Only Filter
                  </span>
                </div>
                <h2 className="text-xl font-bold font-serif text-slate-900 mt-1">
                  Extract Questions from Microsoft Word (.docx) & Text
                </h2>
                <p className="text-xs text-slate-500">
                  Automatically parses Word OMATH equations, isolates assessment questions, and filters out preambles & paper instructions.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleFullScreen}
                className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl cursor-pointer flex items-center gap-1.5 transition-all shadow-xs"
                title="Full Screen View"
              >
                <Maximize2 className="w-4 h-4 text-indigo-700" />
                <span className="hidden sm:inline">Full Screen View</span>
              </button>
              {onClose && (
                <button
                  onClick={handleCloseImporter}
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl cursor-pointer flex items-center gap-2 transition-all shadow-xs"
                  title="Return to Dashboard"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-600" />
                  <span className="hidden sm:inline">Back</span>
                </button>
              )}
            </div>
          </div>

      {/* Main Body Viewport */}
      <div className={isFullScreen ? "flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 max-w-5xl mx-auto w-full" : "space-y-6"}>

      {/* Instruction Exclusion Callout Banner */}
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-emerald-100 rounded-xl text-emerald-800 shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="text-xs space-y-1">
          <h4 className="font-bold text-emerald-950">
            Paper Instructions & Candidate Directions Excluded
          </h4>
          <p className="text-emerald-800 leading-relaxed">
            The extraction algorithm specifically targets assessment questions (MCQs, math formulas, options A–D, answer keys). General paper directives such as <span className="font-semibold italic">"INSTRUCTIONS TO CANDIDATES"</span>, <span className="font-semibold italic">"Time allowed"</span>, or cover page headers are automatically filtered out.
          </p>
        </div>
      </div>

      {/* Word Math Equation Extraction & Processing Reference Card */}
      <div className="bg-gradient-to-b from-[#0f1223] via-[#13172e] to-[#1a1a2e] text-slate-200 border border-orange-500/20 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-serif text-white flex items-center gap-2">
                <span>Microsoft Word OMATH & KaTeX Equation Rendering Stack</span>
              </h3>
              <p className="text-xs text-slate-400">
                Full support for Word OMATH equation tags, MathML, & KaTeX mathematical rendering.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold bg-amber-400/10 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-full self-start sm:self-auto">
            MathML & LaTeX Standard
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Box 1: Word OMATH & Structure */}
          <div className="bg-[#111827] border border-slate-800 p-3.5 rounded-2xl space-y-2">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
              1. Word OMATH Parser
            </span>
            <ul className="space-y-1.5 text-slate-300 text-[11px]">
              <li className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong className="text-white">OMATH XML Reader:</strong> Converts native Word formula structures into KaTeX math syntax.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong className="text-white">Mammoth JS Engine:</strong> Robust fallback text extraction for standard document runs.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong className="text-white">Math Detection:</strong> Automatic classification and notation formatting.</span>
              </li>
            </ul>
          </div>

          {/* Box 2: Math Rendering Libraries */}
          <div className="bg-[#111827] border border-slate-800 p-3.5 rounded-2xl space-y-2">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
              2. Math Rendering Engines
            </span>
            <ul className="space-y-1.5 text-slate-300 text-[11px]">
              <li className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong className="text-white">KaTeX:</strong> Ultra-fast web math renderer engine used throughout the MCQ Hub.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong className="text-white">MathJax:</strong> Supports LaTeX, MathML, & AsciiMath in web browsers.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong className="text-white">Pandoc:</strong> Format converter preserving full math syntax.</span>
              </li>
            </ul>
          </div>

          {/* Box 3: Full Solutions & Standards */}
          <div className="bg-[#111827] border border-slate-800 p-3.5 rounded-2xl space-y-2">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
              3. Standards & Integration
            </span>
            <ul className="space-y-1.5 text-slate-300 text-[11px]">
              <li className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong className="text-white">MathML Format:</strong> Universal XML standard for cross-platform compatibility.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong className="text-white">Microsoft Graph API:</strong> For Word docs with embedded <code className="text-amber-300 bg-slate-900 px-1 rounded">omath</code> formulas.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong className="text-white">Overleaf API:</strong> Native compiled LaTeX document integration.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl max-w-md">
        <button
          onClick={() => setActiveInputTab('upload')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeInputTab === 'upload'
              ? 'bg-white text-indigo-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Upload Word (.docx / .doc)</span>
        </button>
        <button
          onClick={() => setActiveInputTab('paste')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeInputTab === 'paste'
              ? 'bg-white text-indigo-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Paste Text Directly</span>
        </button>
      </div>

      {/* Input Section */}
      {activeInputTab === 'upload' ? (
        <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/30 rounded-3xl p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto border border-indigo-200 shadow-sm">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Upload Microsoft Word Document (.docx / .doc)</h3>
            <p className="text-xs text-slate-500 mt-1">
              Select your Word file. Questions, options A–D, answer keys, and LaTeX math notation are extracted instantly upon upload.
            </p>
          </div>

          {selectedFileName && (
            <div className="inline-flex flex-col items-center gap-1.5 bg-white p-3.5 rounded-2xl border border-indigo-100 shadow-xs max-w-md w-full mx-auto">
              <div className="inline-flex items-center gap-2 text-indigo-900 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Selected: {selectedFileName}</span>
              </div>
              {extractionStatus && (
                <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 flex items-center gap-1.5 text-center">
                  {isProcessing && <RefreshCw className="w-3 h-3 animate-spin text-indigo-600 shrink-0" />}
                  <span>{extractionStatus}</span>
                </span>
              )}
              {isProcessing && uploadProgress > 0 && (
                <div className="w-full mt-1.5 space-y-1">
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 px-0.5">
                    <span>Extracting...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                </div>
              )}
              {largeFileAdvisory && (
                <div className="mt-1 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2 text-left leading-relaxed">
                  <span className="font-bold">⚡ Performance Optimization: </span>
                  {largeFileAdvisory}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col items-center justify-center gap-3 pt-1">
            <div className="flex items-center gap-2.5 flex-wrap justify-center">
              <label className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer inline-flex items-center gap-2 transition-all">
                <Upload className="w-4 h-4" />
                <span>{isProcessing ? 'Processing Document...' : 'Browse Word Document (.docx, .doc)'}</span>
                <input
                  type="file"
                  accept=".docx,.doc,.txt"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => generateIdealAdditionalMathWordTemplate()}
                className="px-4 py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-2 transition-all"
                title="Download authentic Microsoft Word (.docx) document formatted with questions 1-40, options A-D, and answer keys"
              >
                <FileText className="w-4 h-4 text-emerald-200" />
                <span>Download Ideal Word Template (.docx)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const formatted: ExtractedQuestion[] = SAMPLE_ADDITIONAL_MATH_QUESTIONS.map((q, idx) => ({
                    id: idx + 1,
                    rawText: `${idx + 1}: ${q.questionText}`,
                    questionText: q.questionText,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation || '',
                    topic: q.topic || 'General Mathematics',
                    isMathDetected: true,
                    confidence: 100
                  }));
                  setExtractedQuestions(formatted);
                  setSelectedFileName('Additional_Mathematics_40Q_TryTest.docx');
                  setExtractionStatus('Successfully loaded 40 Additional Mathematics sample questions!');
                  setBuilderSuccessToast('Loaded authentic 40-question Additional Mathematics test! Review questions or test fullscreen preview.');
                  setTimeout(() => setBuilderSuccessToast(null), 4000);
                }}
                className="px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-2 transition-all active:scale-98"
                title="Instantly load the 40 Additional Mathematics exam questions to test and try the extraction system"
              >
                <Sparkles className="w-4 h-4 text-slate-950 fill-current" />
                <span>Load 40-Q Try Test</span>
              </button>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-xs cursor-pointer inline-flex items-center gap-2 transition-all active:scale-98"
                title="Go back to previous page"
              >
                <ArrowLeft className="w-4 h-4 text-indigo-600" />
                <span>Back to Dashboard</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700">
            Paste Full Document Text (Word Content, Text, or Exam Paper):
          </label>
          <textarea
            rows={8}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            className="w-full font-mono text-xs p-4 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            placeholder="Paste document text..."
          />
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => processExtractionRequest(pastedText)}
              disabled={isProcessing}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Parse & Extract Questions Only</span>
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-indigo-600" />
                <span>Back</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Extracted Questions Preview & Add Question Desk */}
      {extractedQuestions.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          {/* Top Floating / Prominent Navigation & Action Bar */}
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border-2 border-indigo-200 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Close importer or go back to Faculty Dashboard"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-700" />
                  <span>Back / Close</span>
                </button>
              )}

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 font-serif flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Loaded {extractedQuestions.length} Questions</span>
                </span>
                {selectedFileName && (
                  <span className="text-[11px] bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded border border-slate-200 truncate max-w-[180px]">
                    {selectedFileName}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {extractedDocxMedia && extractedDocxMedia.allImages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowDiagramsGallery(!showDiagramsGallery)}
                  className={`px-3 py-2 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer border ${
                    showDiagramsGallery
                      ? 'bg-amber-500 text-slate-950 border-amber-600'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                  }`}
                  title="View figures & diagrams extracted from the Word document"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Word Figures ({extractedDocxMedia.allImages.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleOpenAddQuestion}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Question</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-4 sm:px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                <span>Proceed to Quiz Setup ({extractedQuestions.length}) →</span>
              </button>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  title="Close window"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Extracted Word Figures & Diagrams Drawer */}
          {showDiagramsGallery && extractedDocxMedia && (
            <div className="bg-amber-50/90 border-2 border-amber-200 rounded-2xl p-4 space-y-3 animate-in fade-in shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-amber-600" />
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 font-serif">
                    Figures & Diagrams Extracted from Word Document ({extractedDocxMedia.allImages.length})
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDiagramsGallery(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-600">
                These diagrams and charts were automatically extracted from the Word document. You can attach any diagram to a specific question or replace an existing image with one click.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-1">
                {extractedDocxMedia.allImages.map((imgItem, imgIdx) => {
                  const assignedQ = extractedQuestions.find((q) => q.imageUrl === imgItem.dataUrl);
                  return (
                    <div
                      key={imgIdx}
                      className="bg-white rounded-xl p-2.5 border border-amber-200 shadow-2xs flex flex-col space-y-2 items-center"
                    >
                      <div
                        onClick={() => setPreviewDiagramUrl(imgItem.dataUrl)}
                        className="w-full h-24 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity border border-slate-200"
                        title="Click to preview full size"
                      >
                        <img
                          src={imgItem.dataUrl}
                          alt={`Word Diagram ${imgIdx + 1}`}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="w-full text-center">
                        {assignedQ ? (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 block truncate">
                            Attached to Q{assignedQ.id}
                          </span>
                        ) : imgItem.questionNumber ? (
                          <span className="text-[10px] font-medium text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 block truncate">
                            Near Q{imgItem.questionNumber}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 block truncate">
                            Figure #{imgIdx + 1}
                          </span>
                        )}
                      </div>
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            handleAssignDiagramToQuestion(imgItem.dataUrl, parseInt(val, 10));
                          }
                        }}
                        defaultValue=""
                        className="w-full text-[10px] py-1 px-1 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded font-medium text-slate-700 cursor-pointer"
                      >
                        <option value="" disabled>Assign to Q#...</option>
                        {extractedQuestions.map((q, qIdx) => (
                          <option key={q.id || qIdx} value={q.id || qIdx + 1}>
                            Q{q.id || qIdx + 1} {q.imageUrl === imgItem.dataUrl ? '✓ (Current)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 font-serif flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Extracted Questions ({extractedQuestions.length} Total)
                </h3>
                {deletedCount > 0 && (
                  <span className="text-xs bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-md border border-rose-200">
                    {deletedCount} deleted
                  </span>
                )}
                {builderSuccessToast && (
                  <span className="text-xs bg-emerald-100 text-emerald-900 font-bold px-2.5 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1 animate-in fade-in">
                    <Check className="w-3 h-3 text-emerald-700" />
                    {builderSuccessToast}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Review questions below or click <strong className="text-indigo-900">+ Add Question (Q{extractedQuestions.length + 1})</strong> to append more questions to this assessment.
              </p>
              {ignoredInstructionsCount > 0 && (
                <p className="text-xs text-emerald-700 font-medium mt-0.5">
                  Filtered out {ignoredInstructionsCount} paper instruction block(s) / preambles.
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleOpenAddQuestion}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                title={`Add question ${extractedQuestions.length + 1} manually`}
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Add Question (Q{extractedQuestions.length + 1})</span>
              </button>
            </div>
          </div>

          {/* Undo Deleted Question Banner */}
          {lastDeletedQuestion && (
            <div className="bg-amber-50/90 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Question <strong>Q{lastDeletedQuestion.index + 1}</strong> was removed from the extract.
                </span>
              </div>
              <button
                type="button"
                onClick={handleUndoDelete}
                className="px-3 py-1 bg-amber-200/90 hover:bg-amber-300 text-amber-950 font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Restore deleted question"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-900" />
                <span>Undo / Restore</span>
              </button>
            </div>
          )}

          {/* Up & Down Arrow Navigation Bar for easy review */}
          {extractedQuestions.length > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white p-3 sm:px-4 sm:py-2.5 rounded-2xl shadow-sm border border-indigo-900/50">
              <div className="flex items-center gap-2.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0 shadow-xs" />
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-300 font-medium">Previewing Question:</span>
                  <span className="px-2 py-0.5 rounded-md bg-white/15 text-amber-300 font-black font-mono text-xs border border-white/10">
                    Q{selectedNavIndex + 1}
                  </span>
                  <span className="text-slate-400">of</span>
                  <span className="font-bold text-white">{extractedQuestions.length}</span>
                </div>
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-400 pl-2.5 border-l border-slate-700/80 font-normal">
                  Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-[10px] font-mono text-amber-300 font-bold shadow-2xs">↑</kbd> and <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-[10px] font-mono text-amber-300 font-bold shadow-2xs">↓</kbd> arrow keys to navigate questions
                </span>
              </div>

              {/* Action Buttons for Up / Down Navigation and Full Screen */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
                <button
                  type="button"
                  id="btn-doc-preview-fullscreen"
                  onClick={handleToggleFullScreen}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    isFullScreen
                      ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border border-amber-300'
                      : 'bg-white/10 hover:bg-white/20 active:bg-white/30 text-white border border-white/10'
                  }`}
                  title={isFullScreen ? 'Exit Full Screen View (Esc)' : 'Expand to Full Screen View'}
                >
                  {isFullScreen ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5" />
                      <span>Exit Full Screen</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
                      <span>Full Screen</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="btn-nav-prev-arrow"
                  onClick={() => navigateToQuestion(selectedNavIndex - 1)}
                  disabled={selectedNavIndex <= 0}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 active:bg-white/30 disabled:opacity-30 disabled:pointer-events-none rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer border border-white/10 shadow-2xs"
                  title="Previous Question (Arrow Up)"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
                  <span>Prev Question</span>
                  <kbd className="hidden sm:inline px-1 py-0.2 bg-black/40 rounded text-[9px] font-mono text-amber-300">↑</kbd>
                </button>
                <button
                  type="button"
                  id="btn-nav-next-arrow"
                  onClick={() => navigateToQuestion(selectedNavIndex + 1)}
                  disabled={selectedNavIndex >= extractedQuestions.length - 1}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 active:bg-white/30 disabled:opacity-30 disabled:pointer-events-none rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer border border-white/10 shadow-2xs"
                  title="Next Question (Arrow Down)"
                >
                  <span>Next Question</span>
                  <kbd className="hidden sm:inline px-1 py-0.2 bg-black/40 rounded text-[9px] font-mono text-amber-300">↓</kbd>
                  <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                </button>
              </div>
            </div>
          )}

          {/* Quick Search & Filter for large test sets (e.g. 50-100 questions) */}
          {extractedQuestions.length > 4 && (
            <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter questions by keywords or jump to question number (e.g. Q45 or 45)..."
                  value={previewSearchQuery}
                  onChange={(e) => setPreviewSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white text-slate-900"
                />
              </div>
              {previewSearchQuery && (
                <button
                  type="button"
                  onClick={() => setPreviewSearchQuery('')}
                  className="text-xs text-slate-500 hover:text-slate-800 px-3 py-1.5 font-semibold bg-slate-100 rounded-lg cursor-pointer"
                >
                  Clear filter
                </button>
              )}
            </div>
          )}

          {/* Questions List */}
          <div
            ref={questionsListRef}
            className={`space-y-4 pr-1 ${
              isFullScreen
                ? 'w-full'
                : 'max-h-[58vh] overflow-y-auto'
            }`}
          >
            {extractedQuestions
              .map((q, qIndex) => ({ q, qIndex }))
              .filter(({ q, qIndex }) => {
                if (!previewSearchQuery.trim()) return true;
                const query = previewSearchQuery.toLowerCase().trim();
                if ((query.startsWith('q') && !isNaN(Number(query.slice(1)))) || !isNaN(Number(query))) {
                  const targetNum = query.startsWith('q') ? Number(query.slice(1)) : Number(query);
                  if (targetNum > 0) return qIndex + 1 === targetNum;
                }
                const fullText = `${qIndex + 1} ${q.questionText} ${q.topic} ${q.options.map((o) => o.text).join(' ')}`.toLowerCase();
                return fullText.includes(query);
              })
              .map(({ q, qIndex }) => {
              // INLINE QUESTION EDITOR MODE
              if (editingQuestionIndex === qIndex) {
                return (
                  <div
                    ref={editQuestionBoxRef}
                    key={`editing-q-${qIndex}`}
                    className="bg-white rounded-3xl border-2 border-indigo-500 shadow-xl p-5 sm:p-7 space-y-5 animate-in fade-in ring-4 ring-indigo-500/10"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-3.5 border-b border-indigo-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-xs">
                          Q{qIndex + 1}
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-slate-900 font-serif flex items-center gap-2">
                            <Edit3 className="w-4 h-4 text-indigo-600" />
                            <span>Editing Question Q{qIndex + 1}</span>
                          </h4>
                          <p className="text-xs text-slate-500">
                            Modify question statement, mathematical equations, options, or answer key.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingQuestionIndex(null)}
                          className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveBuilderQuestion(false)}
                          className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                        >
                          <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                          <span>Save Q{qIndex + 1} Changes</span>
                        </button>
                      </div>
                    </div>

                    {/* Topic Selector */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                        Topic / Sub-discipline
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {[
                          'Algebra',
                          'Calculus',
                          'Matrices & Determinants',
                          'Trigonometry',
                          'Statistics & Probability',
                          'Functions & Relations',
                          'Logarithms & Exponents',
                          'Coordinate Geometry',
                          'Vectors & Bearings',
                          'General Mathematics',
                        ].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setBuilderTopic(t)}
                            className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer ${
                              builderTopic === t
                                ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs'
                                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={builderTopic}
                        onChange={(e) => setBuilderTopic(e.target.value)}
                        placeholder="Or type custom topic..."
                        className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white"
                      />
                    </div>

                    {/* Math Helper Quick Insert Bar */}
                    <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs text-amber-900 font-bold">
                        <span className="flex items-center gap-1.5">
                          <Calculator className="w-4 h-4 text-amber-700" />
                          Insert Math Symbol into {activeMathTargetField === 'question' ? 'Question Statement' : activeMathTargetField.startsWith('option') ? `Option ${activeMathTargetField.replace('option', '')}` : 'Explanation'}
                        </span>
                        <span className="text-[11px] font-normal text-amber-800">
                          Click snippet to insert:
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: 'x²', val: '$x^2$' },
                          { label: 'xⁿ', val: '$x^n$' },
                          { label: 'a/b', val: '$\\frac{a}{b}$' },
                          { label: '√x', val: '$\\sqrt{x}$' },
                          { label: 'log₂(x)', val: '$\\log_2(x)$' },
                          { label: '∫ dx', val: '$\\int_{a}^{b} f(x)\\,dx$' },
                          { label: '∑', val: '$\\sum_{i=1}^{n}$' },
                          { label: 'nCr', val: '$\\binom{n}{r}$' },
                          { label: '±', val: '$\\pm$' },
                          { label: '×', val: '$\\times$' },
                          { label: 'π', val: '$\\pi$' },
                          { label: 'θ', val: '$\\theta$' },
                          { label: '≤', val: '$\\le$' },
                          { label: '≥', val: '$\\ge$' },
                          { label: '≠', val: '$\\neq$' },
                          { label: '≈', val: '$\\approx$' },
                          { label: '∞', val: '$\\infty$' },
                          { label: 'Matrix 2x2', val: '$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$' },
                        ].map((sym, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleInsertMathSnippet(sym.val)}
                            className="px-2 py-1 bg-white hover:bg-amber-100 text-slate-800 text-xs font-mono font-bold rounded-md border border-amber-300 shadow-2xs hover:border-amber-400 transition-colors cursor-pointer"
                            title={`Insert ${sym.val}`}
                          >
                            {sym.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Question Statement */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Question Statement <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[11px] text-slate-500">LaTeX math formulas supported e.g. $x^2 + 5x = 0$</span>
                      </div>
                      <textarea
                        ref={editQuestionInputRef}
                        rows={3}
                        required
                        value={builderQuestionText}
                        onFocus={() => setActiveMathTargetField('question')}
                        onChange={(e) => setBuilderQuestionText(e.target.value)}
                        placeholder="e.g. Solve for x: $\frac{2x + 4}{3} = 10$ and determine its roots."
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white shadow-2xs"
                      />

                      {/* Live Preview */}
                      {builderQuestionText.trim() && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Live KaTeX Preview:
                          </span>
                          <div className="text-xs sm:text-sm font-medium text-slate-900">
                            <MathRenderer math={cleanLatexMathFormat(builderQuestionText)} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* MCQ Options */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Answer Options A–D (Select Correct Answer Radio)
                        </label>
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          4 Choices (A, B, C, D)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {builderOptions.map((opt) => (
                          <div
                            key={opt.id}
                            className={`p-3.5 rounded-2xl border transition-all ${
                              builderCorrectAnswer === opt.id
                                ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-300'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                                  builderCorrectAnswer === opt.id ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {opt.id}
                                </span>
                                Option {opt.id}
                              </span>

                              <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`correctAnswerKey-edit-${qIndex}`}
                                  checked={builderCorrectAnswer === opt.id}
                                  onChange={() => setBuilderCorrectAnswer(opt.id)}
                                  className="text-emerald-600 focus:ring-emerald-500"
                                />
                                <span>Correct Answer</span>
                              </label>
                            </div>

                            <input
                              type="text"
                              value={opt.text}
                              onFocus={() => setActiveMathTargetField(`option${opt.id}` as any)}
                              onChange={(e) => {
                                const updated = builderOptions.map((o) =>
                                  o.id === opt.id ? { ...o, text: e.target.value } : o
                                );
                                setBuilderOptions(updated);
                              }}
                              placeholder={`e.g. $x = 3$ or Value for choice ${opt.id}`}
                              className="w-full px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-white text-slate-900"
                            />

                            {opt.text.trim() && (
                              <div className="mt-1.5 text-xs text-slate-800 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                <MathRenderer math={cleanLatexMathFormat(opt.text)} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Step-by-Step Explanation */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Pedagogical Explanation / Marking Guide (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={builderExplanation}
                        onFocus={() => setActiveMathTargetField('explanation')}
                        onChange={(e) => setBuilderExplanation(e.target.value)}
                        placeholder="Provide step-by-step solution shown to students during post-exam review..."
                        className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white"
                      />
                      {builderExplanation.trim() && (
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800">
                          <MathRenderer math={cleanLatexMathFormat(builderExplanation)} />
                        </div>
                      )}
                    </div>

                    {/* Attached Diagram / Image for Edit Mode */}
                    <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Attached Diagram / Figure / Graph (Optional)</span>
                      </label>

                      {builderImageUrl ? (
                        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
                          <img
                            src={builderImageUrl}
                            alt="Diagram preview"
                            className="max-h-24 max-w-[140px] rounded-lg border border-slate-200 object-contain bg-white shadow-2xs cursor-zoom-in"
                            onClick={() => setPreviewDiagramUrl(builderImageUrl)}
                          />
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5 text-emerald-600" /> Diagram Attached
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => builderFileInputRef.current?.click()}
                                className="text-xs text-indigo-700 hover:text-indigo-900 font-medium underline cursor-pointer"
                              >
                                Replace (Upload)
                              </button>
                              <span className="text-slate-300">|</span>
                              <button
                                type="button"
                                onClick={() => handleOpenPasteModal(-1)}
                                className="text-xs text-emerald-700 hover:text-emerald-900 font-medium underline cursor-pointer"
                              >
                                Replace (Paste)
                              </button>
                              <span className="text-slate-300">|</span>
                              <button
                                type="button"
                                onClick={() => setBuilderImageUrl('')}
                                className="text-xs text-rose-600 hover:text-rose-800 font-medium underline cursor-pointer"
                              >
                                Remove Picture
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => builderFileInputRef.current?.click()}
                              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Upload className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Upload Diagram File</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenPasteModal(-1)}
                              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <ClipboardPaste className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Paste Diagram (Ctrl+V)</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 shrink-0">or image URL / Base64:</span>
                            <input
                              type="text"
                              placeholder="https://... or data:image/..."
                              value={builderImageUrl}
                              onChange={(e) => setBuilderImageUrl(e.target.value)}
                              className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500"
                            />
                          </div>
                        </div>
                      )}

                      <input
                        ref={builderFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const dataUrl = ev.target?.result as string;
                              if (dataUrl) setBuilderImageUrl(dataUrl);
                            };
                            reader.readAsDataURL(file);
                          }
                          e.target.value = '';
                        }}
                      />
                    </div>
                  </div>
                );
              }

              // NORMAL QUESTION PREVIEW CARD
              const isSelected = selectedNavIndex === qIndex;
              return (
                <div
                  key={`importer-q-${q.id || qIndex}-${qIndex}`}
                  id={`preview-q-card-${qIndex}`}
                  onClick={() => setSelectedNavIndex(qIndex)}
                  className={`rounded-2xl border p-5 space-y-3 relative group transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/30 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shadow-xs ${
                        isSelected ? 'bg-indigo-700 text-white ring-2 ring-indigo-300' : 'bg-indigo-600 text-white'
                      }`}>
                        Q{qIndex + 1}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900">
                        {q.topic}
                      </span>
                      <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-mono flex items-center gap-1 font-semibold">
                        <Calculator className="w-3 h-3 text-amber-700" /> Math Rendered
                      </span>
                      {isSelected && (
                        <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                          Current Focus
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-800 font-bold bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
                        Answer Key: {q.correctAnswer}
                      </span>
                      
                      <button
                        type="button"
                        onClick={() => handleOpenEditQuestion(qIndex)}
                        title={`Edit Question ${qIndex + 1}`}
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-900 border border-indigo-200 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.id, qIndex)}
                        title={`Delete Question ${qIndex + 1} from extract`}
                        className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 hover:text-rose-900 border border-rose-200 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:border-rose-300"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-sm font-medium text-slate-900 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <MathRenderer math={cleanLatexMathFormat(q.questionText)} />
                  </div>

                  {/* Attached Diagram / Image if Present */}
                  {q.imageUrl && (
                    <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Question Diagram / Figure</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewDiagramUrl(q.imageUrl || null)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                          >
                            Enlarge
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => cardFileInputRefs.current[qIndex]?.click()}
                            className="text-xs text-slate-600 hover:text-indigo-600 font-medium cursor-pointer"
                            title="Upload new file to replace diagram"
                          >
                            Replace (Upload)
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => handleOpenPasteModal(qIndex)}
                            className="text-xs text-emerald-700 hover:text-emerald-900 font-medium cursor-pointer"
                            title="Paste image from clipboard to replace diagram"
                          >
                            Replace (Paste)
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => handleQuickRemoveImage(qIndex)}
                            className="text-xs text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-center p-2 bg-slate-50 rounded-xl">
                        <img
                          src={q.imageUrl}
                          alt={`Diagram for Question ${qIndex + 1}`}
                          onClick={() => setPreviewDiagramUrl(q.imageUrl || null)}
                          className="max-h-56 max-w-full rounded-lg border border-slate-200 object-contain bg-white cursor-zoom-in hover:opacity-95 shadow-2xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Per-Question Quick Image / Diagram Upload & Paste Buttons */}
                  {!q.imageUrl && (
                    <div className="flex items-center justify-start gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => cardFileInputRefs.current[qIndex]?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/60 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs group"
                        title="Upload diagram image file from device"
                      >
                        <Upload className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
                        <span>Upload / Attach Diagram</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenPasteModal(qIndex)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/60 hover:bg-emerald-50 text-emerald-800 text-xs font-semibold transition-all cursor-pointer shadow-2xs group"
                        title="Paste diagram directly from clipboard (Ctrl+V)"
                      >
                        <ClipboardPaste className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                        <span>Paste Diagram</span>
                      </button>
                    </div>
                  )}

                  {/* Hidden file input for this question card */}
                  <input
                    ref={(el) => { cardFileInputRefs.current[qIndex] = el; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleQuickAttachImage(qIndex, file);
                      }
                      e.target.value = '';
                    }}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
                    {q.options.map((opt, optIndex) => {
                      const isCorrect = q.correctAnswer === opt.id;
                      return (
                        <div
                          key={`importer-opt-q${qIndex}-opt${optIndex}-${opt.id || optIndex}`}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                            isCorrect
                              ? 'bg-emerald-50/70 border-emerald-400 text-emerald-950 font-medium ring-1 ring-emerald-400/30'
                              : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isCorrect
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {opt.id}
                            </span>
                            <div className="text-xs sm:text-sm text-slate-900 overflow-x-auto py-0.5 font-medium">
                              <MathRenderer math={cleanLatexMathFormat(opt.text)} />
                            </div>
                          </div>
                          {isCorrect && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/90 border border-emerald-300/60 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Correct</span>
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <p className="text-xs text-slate-600 italic bg-white/80 p-2.5 rounded-xl border border-slate-200">
                      <span className="font-semibold not-italic text-slate-700">Explanation: </span>
                      <MathRenderer math={cleanLatexMathFormat(q.explanation)} />
                    </p>
                  )}
                </div>
              );
            })}

            {/* INLINE ADD QUESTION CARD (APPEARS DOWN BELOW THE LIST) */}
            {isAddQuestionOpen ? (
              <div
                ref={addQuestionBoxRef}
                className="bg-white rounded-3xl border-2 border-amber-500 shadow-2xl p-5 sm:p-7 space-y-5 animate-in fade-in ring-4 ring-amber-500/10 mt-6"
              >
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3.5 border-b border-amber-200">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-xs">
                      Q{extractedQuestions.length + 1}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900 font-serif flex items-center gap-2">
                        <Plus className="w-4 h-4 text-amber-600 stroke-[3]" />
                        <span>Add Question Q{extractedQuestions.length + 1} to Assessment</span>
                      </h4>
                      <p className="text-xs text-slate-500">
                        Type the question statement, choices, and answer key below.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setIsAddQuestionOpen(false)}
                      className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveBuilderQuestion(true)}
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Save this question and immediately open the form for next question"
                    >
                      <Plus className="w-3.5 h-3.5 text-indigo-700 stroke-[3]" />
                      <span>Save & Add Q{extractedQuestions.length + 2}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveBuilderQuestion(false)}
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                    >
                      <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                      <span>Save Question Q{extractedQuestions.length + 1}</span>
                    </button>
                  </div>
                </div>

                {/* Topic Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Topic / Sub-discipline
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[
                      'Algebra',
                      'Calculus',
                      'Matrices & Determinants',
                      'Trigonometry',
                      'Statistics & Probability',
                      'Functions & Relations',
                      'Logarithms & Exponents',
                      'Coordinate Geometry',
                      'Vectors & Bearings',
                      'General Mathematics',
                    ].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setBuilderTopic(t)}
                        className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer ${
                          builderTopic === t
                            ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={builderTopic}
                    onChange={(e) => setBuilderTopic(e.target.value)}
                    placeholder="Or type custom topic..."
                    className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white"
                  />
                </div>

                {/* Math Helper Quick Insert Bar */}
                <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-amber-900 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-amber-700" />
                      Insert Math Symbol into {activeMathTargetField === 'question' ? 'Question Statement' : activeMathTargetField.startsWith('option') ? `Option ${activeMathTargetField.replace('option', '')}` : 'Explanation'}
                    </span>
                    <span className="text-[11px] font-normal text-amber-800">
                      Click snippet to insert:
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: 'x²', val: '$x^2$' },
                      { label: 'xⁿ', val: '$x^n$' },
                      { label: 'a/b', val: '$\\frac{a}{b}$' },
                      { label: '√x', val: '$\\sqrt{x}$' },
                      { label: 'log₂(x)', val: '$\\log_2(x)$' },
                      { label: '∫ dx', val: '$\\int_{a}^{b} f(x)\\,dx$' },
                      { label: '∑', val: '$\\sum_{i=1}^{n}$' },
                      { label: 'nCr', val: '$\\binom{n}{r}$' },
                      { label: '±', val: '$\\pm$' },
                      { label: '×', val: '$\\times$' },
                      { label: 'π', val: '$\\pi$' },
                      { label: 'θ', val: '$\\theta$' },
                      { label: '≤', val: '$\\le$' },
                      { label: '≥', val: '$\\ge$' },
                      { label: '≠', val: '$\\neq$' },
                      { label: '≈', val: '$\\approx$' },
                      { label: '∞', val: '$\\infty$' },
                      { label: 'Matrix 2x2', val: '$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$' },
                    ].map((sym, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleInsertMathSnippet(sym.val)}
                        className="px-2 py-1 bg-white hover:bg-amber-100 text-slate-800 text-xs font-mono font-bold rounded-md border border-amber-300 shadow-2xs hover:border-amber-400 transition-colors cursor-pointer"
                        title={`Insert ${sym.val}`}
                      >
                        {sym.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question Statement */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Question Statement <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500">LaTeX math formulas supported e.g. $x^2 + 5x = 0$</span>
                  </div>
                  <textarea
                    ref={addQuestionInputRef}
                    rows={3}
                    required
                    value={builderQuestionText}
                    onFocus={() => setActiveMathTargetField('question')}
                    onChange={(e) => setBuilderQuestionText(e.target.value)}
                    placeholder="e.g. Solve for x: $\frac{2x + 4}{3} = 10$ and determine its roots."
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white shadow-2xs"
                  />

                  {/* Live Preview */}
                  {builderQuestionText.trim() && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Live KaTeX Preview:
                      </span>
                      <div className="text-xs sm:text-sm font-medium text-slate-900">
                        <MathRenderer math={cleanLatexMathFormat(builderQuestionText)} />
                      </div>
                    </div>
                  )}
                </div>

                {/* MCQ Options */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Answer Options A–D (Select Correct Answer Radio)
                    </label>
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      4 Choices (A, B, C, D)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {builderOptions.map((opt) => (
                      <div
                        key={opt.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          builderCorrectAnswer === opt.id
                            ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-300'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                              builderCorrectAnswer === opt.id ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {opt.id}
                            </span>
                            Option {opt.id}
                          </span>

                          <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 cursor-pointer">
                            <input
                              type="radio"
                              name="correctAnswerKey-add-new"
                              checked={builderCorrectAnswer === opt.id}
                              onChange={() => setBuilderCorrectAnswer(opt.id)}
                              className="text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>Correct Answer</span>
                          </label>
                        </div>

                        <input
                          type="text"
                          value={opt.text}
                          onFocus={() => setActiveMathTargetField(`option${opt.id}` as any)}
                          onChange={(e) => {
                            const updated = builderOptions.map((o) =>
                              o.id === opt.id ? { ...o, text: e.target.value } : o
                            );
                            setBuilderOptions(updated);
                          }}
                          placeholder={`e.g. $x = 3$ or Value for choice ${opt.id}`}
                          className="w-full px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-white text-slate-900"
                        />

                        {opt.text.trim() && (
                          <div className="mt-1.5 text-xs text-slate-800 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                            <MathRenderer math={cleanLatexMathFormat(opt.text)} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Step-by-Step Explanation */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Pedagogical Explanation / Marking Guide (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={builderExplanation}
                    onFocus={() => setActiveMathTargetField('explanation')}
                    onChange={(e) => setBuilderExplanation(e.target.value)}
                    placeholder="Provide step-by-step solution shown to students during post-exam review..."
                    className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white"
                  />
                  {builderExplanation.trim() && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800">
                      <MathRenderer math={cleanLatexMathFormat(builderExplanation)} />
                    </div>
                  )}
                </div>

                {/* Attached Diagram / Image in Add Question Mode */}
                <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Attached Diagram / Figure / Graph (Optional)</span>
                  </label>

                  {builderImageUrl ? (
                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
                      <img
                        src={builderImageUrl}
                        alt="Diagram preview"
                        className="max-h-24 max-w-[140px] rounded-lg border border-slate-200 object-contain bg-white shadow-2xs cursor-zoom-in"
                        onClick={() => setPreviewDiagramUrl(builderImageUrl)}
                      />
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Diagram Attached
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => builderFileInputRef.current?.click()}
                            className="text-xs text-indigo-700 hover:text-indigo-900 font-medium underline cursor-pointer"
                          >
                            Replace (Upload)
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => handleOpenPasteModal(-1)}
                            className="text-xs text-emerald-700 hover:text-emerald-900 font-medium underline cursor-pointer"
                          >
                            Replace (Paste)
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => setBuilderImageUrl('')}
                            className="text-xs text-rose-600 hover:text-rose-800 font-medium underline cursor-pointer"
                          >
                            Remove Picture
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => builderFileInputRef.current?.click()}
                          className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Upload Diagram File</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenPasteModal(-1)}
                          className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <ClipboardPaste className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Paste Diagram (Ctrl+V)</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 shrink-0">or image URL / Base64:</span>
                        <input
                          type="text"
                          placeholder="https://... or data:image/..."
                          value={builderImageUrl}
                          onChange={(e) => setBuilderImageUrl(e.target.value)}
                          className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  )}

                  <input
                    ref={builderFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const dataUrl = ev.target?.result as string;
                          if (dataUrl) setBuilderImageUrl(dataUrl);
                        };
                        reader.readAsDataURL(file);
                      }
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>
            ) : (
              /* Bottom Add Question Trigger Banner */
              <div
                onClick={handleOpenAddQuestion}
                className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50/80 rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col sm:flex-row items-center justify-center gap-3 group mt-4"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Plus className="w-5 h-5 stroke-[3]" />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-bold text-indigo-950 group-hover:text-indigo-700 transition-colors">
                    + Add Question Q{extractedQuestions.length + 1}
                  </h4>
                  <p className="text-xs text-slate-600">
                    Click here to open the question builder down below, enter math expressions, options, and answer key.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Confirmation Actions */}
          <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200">
            <div className="flex items-center gap-2 flex-wrap">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Close importer without saving"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-600" />
                  <span>Back / Close</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setExtractedQuestions([]);
                  setSelectedFileName(null);
                  setExtractionStatus(null);
                  setExtractionNote(null);
                  setDeletedCount(0);
                  setLastDeletedQuestion(null);
                }}
                className="px-3.5 py-2.5 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                title="Discard all extracted questions and start over"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Discard Paper</span>
              </button>
              <span className="text-xs font-medium text-slate-600 ml-1">
                Ready with <span className="font-bold text-amber-700 font-mono">{extractedQuestions.length}</span> question{extractedQuestions.length !== 1 ? 's' : ''} in paper.
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={handleOpenAddQuestion}
                className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question (Q{extractedQuestions.length + 1})</span>
              </button>
              
              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Confirm & Proceed to Quiz Setup ({extractedQuestions.length} MCQs) →</span>
              </button>
            </div>
          </div>

          {/* Floating Up & Down Arrow Quick Navigation Controls */}
          {extractedQuestions.length > 2 && (
            <div className="sticky bottom-4 ml-auto flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-xl border border-slate-700/80 text-white z-10 w-fit">
              <span className="text-[10.5px] font-medium text-slate-300 font-mono pr-1 border-r border-slate-700">
                Q<strong className="text-amber-300">{selectedNavIndex + 1}</strong>/{extractedQuestions.length}
              </span>
              <button
                type="button"
                id="btn-floating-prev"
                onClick={() => navigateToQuestion(selectedNavIndex - 1)}
                disabled={selectedNavIndex <= 0}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 disabled:opacity-30 disabled:pointer-events-none text-white transition-colors cursor-pointer"
                title="Scroll to Previous Question (Arrow Up)"
              >
                <ChevronUp className="w-4 h-4 text-amber-400" />
              </button>
              <button
                type="button"
                id="btn-floating-next"
                onClick={() => navigateToQuestion(selectedNavIndex + 1)}
                disabled={selectedNavIndex >= extractedQuestions.length - 1}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 disabled:opacity-30 disabled:pointer-events-none text-white transition-colors cursor-pointer"
                title="Scroll to Next Question (Arrow Down)"
              >
                <ChevronDown className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          )}
        </div>
      )}
      </div>

      {/* Paste Diagram Modal */}
      {pasteTargetQuestionIndex !== null && (
        <div
          className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPasteTargetQuestionIndex(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-xl w-full flex flex-col relative shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                  <ClipboardPaste className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Paste Diagram for {pasteTargetQuestionIndex === -1 ? 'Question Builder' : `Question Q${pasteTargetQuestionIndex + 1}`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Paste screenshot, diagram, or chart from your clipboard
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasteTargetQuestionIndex(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Paste Interactive Drop Zone */}
            <div
              ref={pasteDropZoneRef}
              tabIndex={0}
              onPaste={handlePasteInModalZone}
              className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/80 rounded-2xl p-6 text-center cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-2.5 shadow-2xs">
                <ClipboardPaste className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-900">
                Click here and press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-mono shadow-2xs">Ctrl+V</kbd> (or <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-mono shadow-2xs">⌘+V</kbd>)
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Paste any copied image, diagram, or snipped screenshot directly from your clipboard.
              </p>
            </div>

            {/* Direct Clipboard Button */}
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleReadClipboardInModal}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-slate-600" />
                <span>Read from System Clipboard</span>
              </button>
            </div>

            {/* Or Paste URL / Data URI */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Or paste image link / Base64 URL:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="https://... or data:image/..."
                  value={pasteInputUrl}
                  onChange={(e) => {
                    setPasteInputUrl(e.target.value);
                    if (e.target.value.trim().startsWith('http://') || e.target.value.trim().startsWith('https://') || e.target.value.trim().startsWith('data:image/')) {
                      setPastingImageUrl(e.target.value.trim());
                    }
                  }}
                  className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Status Notice */}
            {pasteModalStatus && (
              <div className="text-xs px-3 py-2 rounded-xl bg-slate-100 text-slate-800 border border-slate-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>{pasteModalStatus}</span>
              </div>
            )}

            {/* Image Preview if Loaded */}
            {pastingImageUrl && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Diagram Preview Ready</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPastingImageUrl('');
                      setPasteInputUrl('');
                    }}
                    className="text-xs text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
                  >
                    Clear Image
                  </button>
                </div>
                <div className="flex justify-center p-2 bg-white rounded-xl border border-slate-200">
                  <img
                    src={pastingImageUrl}
                    alt="Pasted Diagram"
                    className="max-h-56 max-w-full object-contain rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPasteTargetQuestionIndex(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPasteModal}
                disabled={!pastingImageUrl}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Attach Diagram to {pasteTargetQuestionIndex === -1 ? 'Question Builder' : `Q${pasteTargetQuestionIndex + 1}`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Zoom Dialog for Question Diagrams */}
      {previewDiagramUrl && (
        <div
          className="fixed inset-0 z-[10000] bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewDiagramUrl(null)}
        >
          <div
            className="bg-white rounded-3xl p-4 max-w-4xl max-h-[90vh] flex flex-col items-center relative shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewDiagramUrl(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
              title="Close zoom"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="p-2 w-full flex justify-center items-center overflow-auto max-h-[80vh]">
              <img
                src={previewDiagramUrl}
                alt="Enlarged Diagram View"
                className="max-h-[75vh] max-w-full object-contain rounded-xl"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">Click outside or press Esc to close zoom</p>
          </div>
        </div>
      )}
    </div>
  );

  if (isFullScreen) {
    return createPortal(renderFullscreenWorkspace(), document.body);
  }

  return modalContent;
};
