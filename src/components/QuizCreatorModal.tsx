import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusCircle, 
  X, 
  Sparkles, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Camera,
  Clock,
  Lock,
  FileText,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Calculator,
  Edit3,
  Play,
  ClipboardPaste,
  Type,
  Settings,
  Eye,
  CheckCircle2,
  MoveUp,
  MoveDown,
  BookOpen,
  Zap,
  HelpCircle,
  Layers,
  Users,
  UploadCloud,
  Download,
  FileSpreadsheet,
  Search,
  Info,
  Calendar
} from 'lucide-react';
import { QuizConfig, Question, MCQOption, RosterStudent } from '../types';
import { DEFAULT_QUIZ_INSTRUCTIONS } from '../utils/instructionsUtils';
import { parseAssessmentText } from '../utils/documentParser';
import { MathRenderer } from './MathRenderer';
import {
  validateTimelineDates,
  isoToDatetimeLocal,
  datetimeLocalToIso
} from '../utils/timelineUtils';
import {
  parseStudentRosterFile,
  generateRosterTemplateExcel,
  generateRosterTemplateCsv,
  downloadQuizStudentListExcel,
  RosterParseResult
} from '../utils/rosterParser';

interface QuizCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateQuiz: (newQuiz: QuizConfig) => void;
  onUpdateQuiz?: (updatedQuiz: QuizConfig) => void;
  quizToEdit?: QuizConfig | null;
  onRunQuiz?: (newQuiz: QuizConfig) => void;
  onOpenSurveillance?: (quizId: string) => void;
  extractedQuestionsCount?: number;
  importedQuestions?: Question[];
  onReloadExam?: () => void;
  onDiscardLoadedExam?: () => void;
  loadedFileName?: string;
  teacherEmail?: string;
  teacherName?: string;
  teacherDepartment?: string;
}

const EMPTY_QUESTIONS_ARRAY: Question[] = [];

const COMMON_TOPICS = [
  'Algebra',
  'Calculus',
  'Trigonometry',
  'Geometry',
  'Statistics & Probability',
  'Logarithms & Exponents',
  'Vectors & Matrices',
  'General Mathematics',
  'Integrated Science',
  'Physics',
  'Chemistry',
  'Biology'
];

const SAMPLE_PASTE_TEXT = `1. Solve for x in the equation 2x + 5 = 15.
A. 3
B. 5
C. 7
D. 10
Answer: B
Explanation: Subtract 5 from both sides: 2x = 10, then divide by 2 to get x = 5.

2. Which organ pumps blood throughout the human body?
A. Lungs
B. Brain
C. Heart
D. Kidney
Answer: C

3. Evaluate the definite integral \\int_{0}^{2} 3x^2 dx.
A. 6
B. 8
C. 12
D. 16
Answer: B
Explanation: The antiderivative of 3x^2 is x^3. Evaluating from 0 to 2 gives 2^3 - 0^3 = 8.`;

export const QuizCreatorModal: React.FC<QuizCreatorModalProps> = ({
  isOpen,
  onClose,
  onCreateQuiz,
  onUpdateQuiz,
  quizToEdit,
  onRunQuiz,
  onOpenSurveillance,
  extractedQuestionsCount = 0,
  importedQuestions = EMPTY_QUESTIONS_ARRAY,
  onReloadExam,
  onDiscardLoadedExam,
  loadedFileName,
  teacherEmail,
  teacherName: initialTeacherName,
  teacherDepartment,
}) => {
  // Navigation tabs: 'type' | 'paste' | 'review' | 'settings' | 'roster'
  const [activeTab, setActiveTab] = useState<'type' | 'paste' | 'review' | 'settings' | 'roster'>(() => {
    if (importedQuestions && importedQuestions.length > 0) return 'review';
    return 'type';
  });

  // Candidate Roster State
  const [studentRoster, setStudentRoster] = useState<RosterStudent[]>(() => quizToEdit?.studentRoster || []);
  const [accessMode, setAccessMode] = useState<'open' | 'restricted'>(() => quizToEdit?.accessMode || 'open');
  const [rosterValidationField, setRosterValidationField] = useState<'id_only' | 'email_only' | 'id_or_email' | 'both'>(
    () => quizToEdit?.rosterValidationField || 'id_or_email'
  );
  const [isUploadingRoster, setIsUploadingRoster] = useState(false);
  const [rosterUploadResult, setRosterUploadResult] = useState<RosterParseResult | null>(null);
  const [rosterSearchQuery, setRosterSearchQuery] = useState('');
  const rosterFileInputRef = useRef<HTMLInputElement>(null);

  // Quick Add Candidate Form State
  const [manualRosterName, setManualRosterName] = useState('');
  const [manualRosterId, setManualRosterId] = useState('');
  const [manualRosterEmail, setManualRosterEmail] = useState('');
  const [manualRosterClass, setManualRosterClass] = useState('');
  const [isAddingRosterManual, setIsAddingRosterManual] = useState(false);
  const [manualRosterError, setManualRosterError] = useState('');

  // Assessment metadata
  const [title, setTitle] = useState('Core Mathematics Assessment');
  const [subject, setSubject] = useState(teacherDepartment ? (teacherDepartment.includes('Math') ? 'Mathematics' : teacherDepartment) : 'Core Mathematics');
  const [classGroup, setClassGroup] = useState('SHS 2 Science A');
  const [topic, setTopic] = useState('Algebra & Trigonometry');
  const [teacherName, setTeacherName] = useState(initialTeacherName || 'Mr. Twumasi');
  const [instructionBullets, setInstructionBullets] = useState<string[]>([...DEFAULT_QUIZ_INSTRUCTIONS]);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [attemptsAllowed, setAttemptsAllowed] = useState(1);

  // Timeline Evaluation & Integrity Engine states (Open Access by default)
  const [startDate, setStartDate] = useState<string>(() => isoToDatetimeLocal(quizToEdit?.startDate || quizToEdit?.releaseDate));
  const [endDate, setEndDate] = useState<string>(() => isoToDatetimeLocal(quizToEdit?.endDate || quizToEdit?.submissionDeadline));
  const [timelineError, setTimelineError] = useState<string | null>(null);

  const validateTimeline = (start?: string, end?: string): boolean => {
    const s = start !== undefined ? start : startDate;
    const e = end !== undefined ? end : endDate;
    const check = validateTimelineDates(datetimeLocalToIso(s), datetimeLocalToIso(e));
    if (!check.isValid) {
      setTimelineError(check.error || 'The submission deadline must be scheduled after the start date & release time.');
      return false;
    }
    setTimelineError(null);
    return true;
  };

  const handleClearAllDates = () => {
    setStartDate('');
    setEndDate('');
    setTimelineError(null);
  };

  // Questions state
  const [localQuestions, setLocalQuestions] = useState<Question[]>(() => importedQuestions || []);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Type Questions Form State
  const [qTopic, setQTopic] = useState('Algebra');
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState<{ id: 'A' | 'B' | 'C' | 'D'; text: string }[]>([
    { id: 'A', text: '' },
    { id: 'B', text: '' },
    { id: 'C', text: '' },
    { id: 'D', text: '' },
  ]);
  const [qCorrectAnswer, setQCorrectAnswer] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [qExplanation, setQExplanation] = useState('');
  const [typeSuccessToast, setTypeSuccessToast] = useState<string | null>(null);

  // Paste Questions State
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pasteSuccess, setPasteSuccess] = useState<string | null>(null);

  // Ref for auto-focusing question statement input
  const qTextInputRef = useRef<HTMLTextAreaElement>(null);

  // Inline review editing & add question states
  const [reviewEditingIndex, setReviewEditingIndex] = useState<number | null>(null);
  const [isReviewAddQuestionOpen, setIsReviewAddQuestionOpen] = useState<boolean>(false);
  const [reviewFormTopic, setReviewFormTopic] = useState<string>('General Mathematics');
  const [reviewFormText, setReviewFormText] = useState<string>('');
  const [reviewFormOptions, setReviewFormOptions] = useState<{ id: 'A' | 'B' | 'C' | 'D'; text: string }[]>([
    { id: 'A', text: '' },
    { id: 'B', text: '' },
    { id: 'C', text: '' },
    { id: 'D', text: '' },
  ]);
  const [reviewFormCorrectAnswer, setReviewFormCorrectAnswer] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [reviewFormExplanation, setReviewFormExplanation] = useState<string>('');
  const [reviewSuccessToast, setReviewSuccessToast] = useState<string | null>(null);
  const [reviewMathTarget, setReviewMathTarget] = useState<'question' | 'optionA' | 'optionB' | 'optionC' | 'optionD' | 'explanation'>('question');

  // Element Refs for review auto-scroll & focus
  const reviewListRef = useRef<HTMLDivElement>(null);
  const reviewAddBoxRef = useRef<HTMLDivElement>(null);
  const reviewAddInputRef = useRef<HTMLTextAreaElement>(null);
  const reviewEditBoxRef = useRef<HTMLDivElement>(null);
  const reviewEditInputRef = useRef<HTMLTextAreaElement>(null);

  // Rules & Proctoring Settings
  const [tabSwitchMonitoring, setTabSwitchMonitoring] = useState(true);
  const [progressiveTabPenalty, setProgressiveTabPenalty] = useState(false);
  const [enforceSingleAttempt, setEnforceSingleAttempt] = useState(true);
  const [enableCandidateWatermark, setEnableCandidateWatermark] = useState(true);
  const [enableAntiCopyPrint, setEnableAntiCopyPrint] = useState(true);
  const [enableCameraProctoring, setEnableCameraProctoring] = useState(false);
  const [cameraCaptureCount, setCameraCaptureCount] = useState<number>(5);
  const [enableFullscreenEnforcement, setEnableFullscreenEnforcement] = useState(false);
  const [enableFullscreenLockdown, setEnableFullscreenLockdown] = useState(false);
  const [linearExamMode, setLinearExamMode] = useState(false);
  const [perQuestionTimerEnabled, setPerQuestionTimerEnabled] = useState(false);
  const [autoSkipOnTabSwitch, setAutoSkipOnTabSwitch] = useState(false);
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [randomizeOptions, setRandomizeOptions] = useState(true);
  const [showScoreImmediately, setShowScoreImmediately] = useState(true);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true);
  const [allowFeedback, setAllowFeedback] = useState(true);
  const [questionPaginationMode, setQuestionPaginationMode] = useState<'single-page' | 'one-question-per-page'>('single-page');

  // Published Quiz State
  const [createdQuiz, setCreatedQuiz] = useState<QuizConfig | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Initialize or re-sync state whenever quizToEdit changes or modal opens
  useEffect(() => {
    if (quizToEdit) {
      setTitle(quizToEdit.title || '');
      setSubject(quizToEdit.subject || (teacherDepartment ? (teacherDepartment.includes('Math') ? 'Mathematics' : teacherDepartment) : 'Core Mathematics'));
      setClassGroup(quizToEdit.classGroup || 'SHS 2 Science A');
      setTopic(quizToEdit.topic || 'General Mathematics');
      setTeacherName(quizToEdit.teacherName || initialTeacherName || 'Mr. Twumasi');
      const bullets = quizToEdit.instructionBullets && quizToEdit.instructionBullets.length > 0
        ? quizToEdit.instructionBullets
        : (quizToEdit.instructions ? quizToEdit.instructions.split(/\.\s+/).filter(Boolean) : DEFAULT_QUIZ_INSTRUCTIONS);
      setInstructionBullets([...bullets]);
      setDurationMinutes(quizToEdit.durationMinutes || 60);
      setAttemptsAllowed(quizToEdit.attemptsAllowed || 1);
      setEnforceSingleAttempt(quizToEdit.enforceSingleAttempt !== false && quizToEdit.preventMultipleAttempts !== false);
      setTabSwitchMonitoring(quizToEdit.tabSwitchMonitoring !== false && quizToEdit.enableTabMonitoring !== false);
      setProgressiveTabPenalty(Boolean(quizToEdit.progressiveTabPenalty || quizToEdit.enableTabSwitchPenalties));
      setEnableCandidateWatermark(quizToEdit.enableCandidateWatermark !== false);
      setEnableAntiCopyPrint(quizToEdit.enableAntiCopyPrint !== false);
      setEnableCameraProctoring(Boolean(quizToEdit.enableCameraProctoring));
      setCameraCaptureCount(quizToEdit.cameraCaptureCount || 5);
      setEnableFullscreenEnforcement(Boolean(quizToEdit.enableFullscreenEnforcement));
      setEnableFullscreenLockdown(Boolean(quizToEdit.enableFullscreenLockdown));
      setLinearExamMode(Boolean(quizToEdit.linearExamMode));
      setPerQuestionTimerEnabled(Boolean(quizToEdit.perQuestionTimerEnabled));
      setAutoSkipOnTabSwitch(Boolean(quizToEdit.autoSkipOnTabSwitch));
      setRandomizeQuestions(Boolean(quizToEdit.randomizeQuestions ?? quizToEdit.shuffleQuestions ?? true));
      setRandomizeOptions(Boolean(quizToEdit.randomizeOptions ?? quizToEdit.shuffleOptions ?? true));
      setShowScoreImmediately(quizToEdit.showScoreImmediately !== false);
      setShowCorrectAnswers(quizToEdit.showCorrectAnswers !== false);
      setAllowFeedback(quizToEdit.allowFeedback !== false);
      setQuestionPaginationMode(quizToEdit.questionPaginationMode || 'single-page');
      setLocalQuestions(quizToEdit.questions || []);
      setStudentRoster(quizToEdit.studentRoster || []);
      setAccessMode(quizToEdit.accessMode || (quizToEdit.studentRoster && quizToEdit.studentRoster.length > 0 ? 'restricted' : 'open'));
      setRosterValidationField(quizToEdit.rosterValidationField || 'id_or_email');
      setRosterUploadResult(null);
      setStartDate(isoToDatetimeLocal(quizToEdit.startDate || quizToEdit.releaseDate));
      setEndDate(isoToDatetimeLocal(quizToEdit.endDate || quizToEdit.submissionDeadline));
      setTimelineError(null);
      setActiveTab((quizToEdit.questions && quizToEdit.questions.length > 0) ? 'review' : 'settings');
      setCreatedQuiz(null);
      setGeneratedUrl(null);
    } else {
      if (importedQuestions && importedQuestions.length > 0) {
        setLocalQuestions(importedQuestions);
        setActiveTab('review');
      } else {
        setActiveTab('type');
      }
      setCreatedQuiz(null);
      setGeneratedUrl(null);
    }
  }, [quizToEdit, isOpen]);

  useEffect(() => {
    if (!quizToEdit && importedQuestions && importedQuestions.length > 0) {
      setLocalQuestions(importedQuestions);
    }
  }, [importedQuestions, quizToEdit]);

  if (!isOpen) return null;

  // Insert LaTeX / Math symbol at cursor position in Question Statement
  const insertMathSymbol = (symbolText: string) => {
    if (qTextInputRef.current) {
      const textarea = qTextInputRef.current;
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const currentVal = qText;
      const updatedVal = currentVal.substring(0, start) + symbolText + currentVal.substring(end);
      setQText(updatedVal);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + symbolText.length, start + symbolText.length);
      }, 0);
    } else {
      setQText((prev) => prev + symbolText);
    }
  };

  // Save question (typed step-by-step)
  const handleSaveTypedQuestion = (keepAddingNext: boolean = true) => {
    if (!qText.trim()) {
      alert('Please enter the question statement before saving.');
      qTextInputRef.current?.focus();
      return;
    }

    const validOptions = qOptions
      .slice(0, 4)
      .map((opt) => ({
        id: opt.id,
        text: opt.text.trim() || `Option ${opt.id}`,
      })) as MCQOption[];

    if (editingIndex !== null) {
      // Update existing question
      const updatedList = [...localQuestions];
      const existingQ = updatedList[editingIndex];
      updatedList[editingIndex] = {
        ...existingQ,
        topic: (qTopic.trim() || 'General Mathematics') as any,
        questionText: qText.trim(),
        options: validOptions,
        correctAnswer: qCorrectAnswer,
        explanation: qExplanation.trim() || `Marking scheme for Q${editingIndex + 1}`,
      };
      setLocalQuestions(updatedList);
      setEditingIndex(null);
      setTypeSuccessToast(`✓ Question Q${editingIndex + 1} updated successfully!`);
      setTimeout(() => setTypeSuccessToast(null), 3000);

      if (!keepAddingNext) {
        setActiveTab('review');
      } else {
        // Reset form for next question
        setQText('');
        setQOptions([
          { id: 'A', text: '' },
          { id: 'B', text: '' },
          { id: 'C', text: '' },
          { id: 'D', text: '' },
        ]);
        setQCorrectAnswer('A');
        setQExplanation('');
        qTextInputRef.current?.focus();
      }
    } else {
      // Append new question
      const nextIdx = localQuestions.length + 1;
      const newQuestion: Question = {
        id: nextIdx,
        sectionId: Math.ceil(nextIdx / 10),
        sectionName: `Section ${Math.ceil(nextIdx / 10)}`,
        topic: (qTopic.trim() || 'General Mathematics') as any,
        questionText: qText.trim(),
        options: validOptions,
        correctAnswer: qCorrectAnswer,
        explanation: qExplanation.trim() || `Marking scheme for Q${nextIdx}`,
        marks: 1,
      };

      setLocalQuestions((prev) => [...prev, newQuestion]);
      setTypeSuccessToast(`✓ Question Q${nextIdx} added! Ready for Q${nextIdx + 1}.`);
      setTimeout(() => setTypeSuccessToast(null), 3500);

      // Reset form
      setQText('');
      setQOptions([
        { id: 'A', text: '' },
        { id: 'B', text: '' },
        { id: 'C', text: '' },
        { id: 'D', text: '' },
      ]);
      setQCorrectAnswer('A');
      setQExplanation('');

      if (!keepAddingNext) {
        setActiveTab('review');
      } else {
        qTextInputRef.current?.focus();
      }
    }
  };

  // Open inline editor for an existing question directly in Review tab (no jarring tab switch)
  const handleStartInlineEdit = (index: number) => {
    const q = localQuestions[index];
    if (!q) return;
    setIsReviewAddQuestionOpen(false);
    setReviewEditingIndex(index);
    setReviewFormTopic(q.topic || 'General Mathematics');
    setReviewFormText(q.questionText || '');

    const optIds: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
    const mergedOpts = optIds.map((id, optIdx) => {
      const direct = q.options?.find((o) => (o.id || '').toString().trim().toUpperCase() === id);
      const fallback = q.options?.[optIdx];
      return { id, text: direct?.text || fallback?.text || '' };
    });
    setReviewFormOptions(mergedOpts);

    const normCorrect = (q.correctAnswer || '').toString().trim().toUpperCase();
    setReviewFormCorrectAnswer(
      (['A', 'B', 'C', 'D'].includes(normCorrect) ? normCorrect : 'A') as 'A' | 'B' | 'C' | 'D'
    );
    setReviewFormExplanation(q.explanation || '');
    setReviewMathTarget('question');

    setTimeout(() => {
      reviewEditBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      reviewEditInputRef.current?.focus();
    }, 60);
  };

  // Save changes to inline edited question in Review tab
  const handleSaveInlineEdit = (index: number) => {
    const cleanText = reviewFormText.trim();
    if (!cleanText) {
      alert('Please enter the question statement before saving.');
      return;
    }
    const validOptions: MCQOption[] = reviewFormOptions
      .map((opt) => ({
        id: opt.id,
        text: opt.text.trim(),
      }))
      .filter((opt) => opt.text.length > 0);

    if (validOptions.length < 2) {
      alert('Please provide at least 2 option choices.');
      return;
    }

    setLocalQuestions((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        topic: (reviewFormTopic.trim() || 'General Mathematics') as any,
        questionText: cleanText,
        options: validOptions,
        correctAnswer: reviewFormCorrectAnswer,
        explanation: reviewFormExplanation.trim() || `Marking scheme for Q${index + 1}`,
      };
      return updated;
    });

    setReviewSuccessToast(`✓ Updated Question Q${index + 1} successfully!`);
    setTimeout(() => setReviewSuccessToast(null), 3000);
    setReviewEditingIndex(null);
  };

  // Open "Add Question" box at the bottom of the Review tab
  const handleOpenReviewAddQuestion = () => {
    setReviewEditingIndex(null);
    const lastTopic = localQuestions[localQuestions.length - 1]?.topic || 'Algebra';
    setReviewFormTopic(lastTopic);
    setReviewFormText('');
    setReviewFormOptions([
      { id: 'A', text: '' },
      { id: 'B', text: '' },
      { id: 'C', text: '' },
      { id: 'D', text: '' },
    ]);
    setReviewFormCorrectAnswer('A');
    setReviewFormExplanation('');
    setReviewMathTarget('question');
    setIsReviewAddQuestionOpen(true);

    // Instantly scroll container down so the Add Question box appears down directly in front of the teacher
    setTimeout(() => {
      if (reviewListRef.current) {
        reviewListRef.current.scrollTo({
          top: reviewListRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
      reviewAddBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      reviewAddInputRef.current?.focus();
    }, 60);
  };

  // Save new question added via Review tab
  const handleSaveReviewAddQuestion = (keepAddingNext: boolean) => {
    const cleanText = reviewFormText.trim();
    if (!cleanText) {
      alert('Please enter the question statement before saving.');
      return;
    }
    const validOptions: MCQOption[] = reviewFormOptions
      .map((opt) => ({
        id: opt.id,
        text: opt.text.trim(),
      }))
      .filter((opt) => opt.text.length > 0);

    if (validOptions.length < 2) {
      alert('Please provide at least 2 option choices.');
      return;
    }

    const nextIdx = localQuestions.length + 1;
    const newQuestion: Question = {
      id: nextIdx,
      sectionId: Math.ceil(nextIdx / 10),
      sectionName: `Section ${Math.ceil(nextIdx / 10)}`,
      topic: (reviewFormTopic.trim() || 'General Mathematics') as any,
      questionText: cleanText,
      options: validOptions,
      correctAnswer: reviewFormCorrectAnswer,
      explanation: reviewFormExplanation.trim() || `Marking scheme for Q${nextIdx}`,
      marks: 1,
    };

    setLocalQuestions((prev) => [...prev, newQuestion]);
    setReviewSuccessToast(`✓ Question Q${nextIdx} added!`);
    setTimeout(() => setReviewSuccessToast(null), 3000);

    if (keepAddingNext) {
      setReviewFormText('');
      setReviewFormOptions([
        { id: 'A', text: '' },
        { id: 'B', text: '' },
        { id: 'C', text: '' },
        { id: 'D', text: '' },
      ]);
      setReviewFormCorrectAnswer('A');
      setReviewFormExplanation('');
      setTimeout(() => {
        if (reviewListRef.current) {
          reviewListRef.current.scrollTo({
            top: reviewListRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
        reviewAddBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        reviewAddInputRef.current?.focus();
      }, 60);
    } else {
      setIsReviewAddQuestionOpen(false);
    }
  };

  // Insert math snippet into active review field
  const handleInsertReviewMathSnippet = (snippet: string) => {
    if (reviewMathTarget === 'question') {
      setReviewFormText((prev) => `${prev} ${snippet}`.trim());
    } else if (reviewMathTarget === 'optionA') {
      setReviewFormOptions((prev) => prev.map((o) => (o.id === 'A' ? { ...o, text: `${o.text} ${snippet}`.trim() } : o)));
    } else if (reviewMathTarget === 'optionB') {
      setReviewFormOptions((prev) => prev.map((o) => (o.id === 'B' ? { ...o, text: `${o.text} ${snippet}`.trim() } : o)));
    } else if (reviewMathTarget === 'optionC') {
      setReviewFormOptions((prev) => prev.map((o) => (o.id === 'C' ? { ...o, text: `${o.text} ${snippet}`.trim() } : o)));
    } else if (reviewMathTarget === 'optionD') {
      setReviewFormOptions((prev) => prev.map((o) => (o.id === 'D' ? { ...o, text: `${o.text} ${snippet}`.trim() } : o)));
    } else if (reviewMathTarget === 'explanation') {
      setReviewFormExplanation((prev) => `${prev} ${snippet}`.trim());
    }
  };

  // Load question into editor
  const handleEditQuestion = (index: number) => {
    const q = localQuestions[index];
    if (!q) return;
    setEditingIndex(index);
    setQTopic(q.topic || 'General Mathematics');
    setQText(q.questionText || '');
    const opts: { id: 'A' | 'B' | 'C' | 'D'; text: string }[] = [
      { id: 'A', text: q.options.find((o) => o.id === 'A')?.text || '' },
      { id: 'B', text: q.options.find((o) => o.id === 'B')?.text || '' },
      { id: 'C', text: q.options.find((o) => o.id === 'C')?.text || '' },
      { id: 'D', text: q.options.find((o) => o.id === 'D')?.text || '' },
    ];
    setQOptions(opts);
    setQCorrectAnswer((q.correctAnswer && ['A', 'B', 'C', 'D'].includes(q.correctAnswer) ? q.correctAnswer : 'A') as 'A' | 'B' | 'C' | 'D');
    setQExplanation(q.explanation || '');
    setActiveTab('type');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Parse pasted raw text
  const handleParsePastedQuestions = () => {
    setPasteError(null);
    setPasteSuccess(null);

    if (!pasteText.trim()) {
      setPasteError('Please paste your questions into the text box first.');
      return;
    }

    try {
      const result = parseAssessmentText(pasteText);
      if (!result.questions || result.questions.length === 0) {
        setPasteError('Could not detect questions in the pasted text. Please make sure questions have numbers (e.g. 1., 2.) and options (A., B., C., D.).');
        return;
      }

      const startIdx = localQuestions.length;
      const parsedQuestionsList: Question[] = result.questions.map((eq, i) => {
        const qNum = startIdx + i + 1;
        return {
          id: qNum,
          sectionId: Math.ceil(qNum / 10),
          sectionName: `Section ${Math.ceil(qNum / 10)}`,
          topic: eq.topic || 'General Mathematics',
          questionText: eq.questionText,
          options: eq.options.map((opt) => ({
            id: opt.id,
            text: opt.text || `Option ${opt.id}`,
          })) as MCQOption[],
          correctAnswer: eq.correctAnswer || 'A',
          explanation: eq.explanation || `Marking scheme for Q${qNum}`,
          marks: 1,
        };
      });

      setLocalQuestions((prev) => [...prev, ...parsedQuestionsList]);
      setPasteSuccess(`🎉 Successfully parsed and added ${parsedQuestionsList.length} questions! Total questions in quiz: ${localQuestions.length + parsedQuestionsList.length}`);
      setPasteText('');
      
      // Switch to review tab after 1.5s
      setTimeout(() => {
        setActiveTab('review');
      }, 1200);
    } catch (err: any) {
      setPasteError(`Error parsing questions: ${err?.message || 'Unknown error'}`);
    }
  };

  // Delete question
  const handleDeleteQuestion = (index: number) => {
    const updated = localQuestions
      .filter((_, i) => i !== index)
      .map((q, idx) => ({
        ...q,
        id: idx + 1,
        sectionId: Math.ceil((idx + 1) / 10),
        sectionName: `Section ${Math.ceil((idx + 1) / 10)}`,
      }));
    setLocalQuestions(updated);
    if (editingIndex === index) {
      setEditingIndex(null);
      setQText('');
    }
  };

  // Move question up/down
  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === localQuestions.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...localQuestions];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Re-index
    const reindexed = updated.map((q, idx) => ({
      ...q,
      id: idx + 1,
      sectionId: Math.ceil((idx + 1) / 10),
      sectionName: `Section ${Math.ceil((idx + 1) / 10)}`,
    }));
    setLocalQuestions(reindexed);
  };

  // Candidate Roster File Upload Handler
  const handleRosterFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploadingRoster(true);
    setRosterUploadResult(null);

    try {
      const result = await parseStudentRosterFile(file);
      setRosterUploadResult(result);

      if (result.success && result.students.length > 0) {
        setStudentRoster((prev) => {
          const existingIds = new Set(prev.map((s) => s.studentId.trim().toUpperCase()));
          const existingEmails = new Set(prev.map((s) => (s.email || '').trim().toLowerCase()).filter(Boolean));

          const newUnique = result.students.filter((s) => {
            const normId = s.studentId.trim().toUpperCase();
            const normEmail = (s.email || '').trim().toLowerCase();
            return !existingIds.has(normId) && (!normEmail || !existingEmails.has(normEmail));
          });

          return [...prev, ...newUnique];
        });
        setAccessMode('restricted');
      }
    } catch (err: any) {
      setRosterUploadResult({
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
      setIsUploadingRoster(false);
      if (rosterFileInputRef.current) rosterFileInputRef.current.value = '';
    }
  };

  const handleAddManualRosterStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setManualRosterError('');

    const cleanName = manualRosterName.trim();
    const cleanId = manualRosterId.trim().toUpperCase();
    const cleanEmail = manualRosterEmail.trim().toLowerCase();
    const cleanClass = manualRosterClass.trim();

    if (!cleanName) {
      setManualRosterError('Candidate full name is required.');
      return;
    }
    if (!cleanId && !cleanEmail) {
      setManualRosterError('Please enter either a Student ID or an Email Address.');
      return;
    }

    const exists = studentRoster.some(
      (s) =>
        (cleanId && s.studentId.trim().toUpperCase() === cleanId) ||
        (cleanEmail && s.email && s.email.trim().toLowerCase() === cleanEmail)
    );
    if (exists) {
      setManualRosterError(`A student with this ID (${cleanId || cleanEmail}) is already on the roster.`);
      return;
    }

    const newStudent: RosterStudent = {
      id: `ros-cre-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      studentId: cleanId || (cleanEmail ? cleanEmail.split('@')[0].toUpperCase() : `ID-${Date.now()}`),
      email: cleanEmail || undefined,
      classGroup: cleanClass || undefined,
      addedAt: new Date().toISOString(),
      status: 'not_started',
      attemptAllowed: true,
    };

    setStudentRoster((prev) => [newStudent, ...prev]);
    setManualRosterName('');
    setManualRosterId('');
    setManualRosterEmail('');
    setManualRosterClass('');
    setIsAddingRosterManual(false);
    setAccessMode('restricted');
  };

  const handleRemoveRosterStudent = (studentId: string) => {
    setStudentRoster((prev) => prev.filter((s) => s.id !== studentId && s.studentId !== studentId));
  };

  const handleClearAllRoster = () => {
    if (window.confirm('Clear all candidates from this assessment roster?')) {
      setStudentRoster([]);
      setRosterUploadResult(null);
    }
  };

  // Submit and Create or Update Quiz
  const handleSubmit = (e?: React.FormEvent, runDirectly: boolean = false) => {
    if (e) e.preventDefault();

    if (localQuestions.length === 0) {
      alert('Please type or paste at least 1 question before publishing your quiz.');
      setActiveTab('type');
      return;
    }

    if (!validateTimeline()) {
      setActiveTab('settings');
      alert(timelineError || 'The submission deadline must be scheduled after the start date and release time.');
      return;
    }

    const cleanStart = datetimeLocalToIso(startDate);
    const cleanEnd = datetimeLocalToIso(endDate);

    const cleanBullets = instructionBullets.map((b) => b.trim()).filter((b) => b.length > 0);
    const finalBullets = cleanBullets.length >= 2 ? cleanBullets : [...DEFAULT_QUIZ_INSTRUCTIONS];

    if (quizToEdit) {
      // UPDATING AN EXISTING QUIZ
      const updatedQuiz: QuizConfig = {
        ...quizToEdit,
        title: title.trim() || quizToEdit.title || 'Core Mathematics Assessment',
        subject: subject.trim() || quizToEdit.subject || 'Core Mathematics',
        classGroup: classGroup.trim() || quizToEdit.classGroup || 'SHS 2',
        topic: topic.trim() || quizToEdit.topic || 'General Mathematics',
        teacherName: teacherName || quizToEdit.teacherName || initialTeacherName || 'Mr. Twumasi',
        teacherEmail: teacherEmail || quizToEdit.teacherEmail || 'twumbismark90@gmail.com',
        instructions: finalBullets.join(' '),
        instructionBullets: finalBullets,
        totalQuestions: localQuestions.length,
        durationMinutes,
        startDate: cleanStart,
        releaseDate: cleanStart,
        endDate: cleanEnd,
        submissionDeadline: cleanEnd,
        attemptsAllowed,
        enforceSingleAttempt,
        preventMultipleAttempts: enforceSingleAttempt,
        tabSwitchMonitoring,
        enableTabMonitoring: tabSwitchMonitoring,
        progressiveTabPenalty,
        enableTabSwitchPenalties: progressiveTabPenalty,
        enableCandidateWatermark,
        enableAntiCopyPrint,
        enableCameraProctoring,
        cameraCaptureCount: enableCameraProctoring ? cameraCaptureCount : undefined,
        enableFullscreenEnforcement: enableFullscreenEnforcement || enableFullscreenLockdown,
        enableFullscreenLockdown,
        linearExamMode: linearExamMode || enableFullscreenLockdown,
        perQuestionTimerEnabled: perQuestionTimerEnabled || enableFullscreenLockdown,
        autoSkipOnTabSwitch: autoSkipOnTabSwitch || enableFullscreenLockdown,
        randomizeQuestions,
        shuffleQuestions: randomizeQuestions,
        randomizeOptions,
        shuffleOptions: randomizeOptions,
        showScoreImmediately,
        showCorrectAnswers,
        allowFeedback,
        enableAIFeedback: allowFeedback,
        questionPaginationMode: (linearExamMode || enableFullscreenLockdown) ? 'one-question-per-page' : questionPaginationMode,
        accessMode,
        studentRoster,
        rosterValidationField,
        updatedAt: new Date().toISOString(),
        questions: localQuestions,
      };

      if (onUpdateQuiz) {
        onUpdateQuiz(updatedQuiz);
      } else {
        onCreateQuiz(updatedQuiz);
      }

      if (runDirectly && onRunQuiz) {
        onRunQuiz(updatedQuiz);
      } else {
        // Return directly to dashboard
        onClose();
      }
    } else {
      // CREATING A NEW QUIZ
      const subjectPrefix = subject.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'MCQ';
      const classPrefix = classGroup.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'SHS';
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const quizCode = `${subjectPrefix}-${classPrefix}-2026-${randomSuffix}`;

      const newQuiz: QuizConfig = {
        id: `quiz-${Date.now()}`,
        code: quizCode,
        title: title.trim() || 'Core Mathematics Assessment',
        subject: subject.trim() || 'Core Mathematics',
        classGroup: classGroup.trim() || 'SHS 2',
        topic: topic.trim() || 'General Mathematics',
        teacherId: teacherEmail || 'teacher-01',
        teacherName: teacherName || initialTeacherName || 'Mr. Twumasi',
        teacherEmail: teacherEmail || 'twumbismark90@gmail.com',
        schoolName: 'MCQ Assessment Network',
        instructions: finalBullets.join(' '),
        instructionBullets: finalBullets,
        totalQuestions: localQuestions.length,
        durationMinutes,
        startDate: cleanStart,
        releaseDate: cleanStart,
        endDate: cleanEnd,
        submissionDeadline: cleanEnd,
        attemptsAllowed,
        enforceSingleAttempt,
        preventMultipleAttempts: enforceSingleAttempt,
        tabSwitchMonitoring,
        enableTabMonitoring: tabSwitchMonitoring,
        progressiveTabPenalty,
        enableTabSwitchPenalties: progressiveTabPenalty,
        enableCandidateWatermark,
        enableAntiCopyPrint,
        enableCameraProctoring,
        cameraCaptureCount: enableCameraProctoring ? cameraCaptureCount : undefined,
        enableFullscreenEnforcement: enableFullscreenEnforcement || enableFullscreenLockdown,
        enableFullscreenLockdown,
        linearExamMode: linearExamMode || enableFullscreenLockdown,
        perQuestionTimerEnabled: perQuestionTimerEnabled || enableFullscreenLockdown,
        autoSkipOnTabSwitch: autoSkipOnTabSwitch || enableFullscreenLockdown,
        randomizeQuestions,
        shuffleQuestions: randomizeQuestions,
        randomizeOptions,
        shuffleOptions: randomizeOptions,
        showScoreImmediately,
        showCorrectAnswers,
        allowFeedback,
        enableAIFeedback: allowFeedback,
        questionPaginationMode: (linearExamMode || enableFullscreenLockdown) ? 'one-question-per-page' : questionPaginationMode,
        accessMode,
        studentRoster,
        rosterValidationField,
        status: 'active',
        createdAt: new Date().toISOString(),
        questions: localQuestions,
        sections: [],
      };

      onCreateQuiz(newQuiz);

      if (runDirectly && onRunQuiz) {
        onRunQuiz(newQuiz);
      } else {
        // Return directly to dashboard
        onClose();
      }
    }
  };

  const handleCopyLink = () => {
    if (generatedUrl) {
      navigator.clipboard.writeText(generatedUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleCopyCode = () => {
    if (createdQuiz?.code) {
      navigator.clipboard.writeText(createdQuiz.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    if (onDiscardLoadedExam) {
      onDiscardLoadedExam();
    } else {
      setLocalQuestions([]);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white p-4 sm:p-5 relative shrink-0">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-bold text-amber-300 bg-white/10 hover:bg-white/20 border border-amber-400/30 rounded-xl cursor-pointer flex items-center gap-1 transition-colors"
              title="Close"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-300" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              {quizToEdit ? <Edit3 className="w-5 h-5 text-amber-300" /> : <PlusCircle className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold font-serif text-white">
                  {quizToEdit ? `Edit Assessment: ${title || quizToEdit.title}` : 'Create New Assessment & Quiz Hub'}
                </h2>
                {quizToEdit && (
                  <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full">
                    Code: {quizToEdit.code}
                  </span>
                )}
                <span className="bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                  {localQuestions.length} Questions Ready
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                  {durationMinutes}m Duration
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                {quizToEdit
                  ? 'Edit questions, instructions, quiz name, duration, attempts, and full delivery settings.'
                  : 'Type questions one after another • Paste questions from text • Configure proctoring & run as live quiz'}
              </p>
            </div>
          </div>

          {/* Creation Mode Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-indigo-800/60 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('review')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'review'
                  ? 'bg-amber-500 text-slate-950 shadow-md scale-102'
                  : 'bg-indigo-900/60 text-white hover:bg-indigo-800/80 border border-indigo-700/50'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>Review & Edit Questions ({localQuestions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'settings'
                  ? 'bg-amber-500 text-slate-950 shadow-md scale-102'
                  : 'bg-indigo-900/60 text-white hover:bg-indigo-800/80 border border-indigo-700/50'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Setup: Name, Duration, Instructions & Rules</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('roster')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'roster'
                  ? 'bg-amber-500 text-slate-950 shadow-md scale-102'
                  : 'bg-indigo-900/60 text-white hover:bg-indigo-800/80 border border-indigo-700/50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Candidate Roster ({studentRoster.length})</span>
              {accessMode === 'restricted' && (
                <Lock className="w-3.5 h-3.5 text-amber-300" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('type')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'type'
                  ? 'bg-amber-500 text-slate-950 shadow-md scale-102'
                  : 'bg-indigo-900/60 text-white hover:bg-indigo-800/80 border border-indigo-700/50'
              }`}
            >
              <Type className="w-4 h-4" />
              <span>Add Question Step-by-Step</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'paste'
                  ? 'bg-amber-500 text-slate-950 shadow-md scale-102'
                  : 'bg-indigo-900/60 text-white hover:bg-indigo-800/80 border border-indigo-700/50'
              }`}
            >
              <ClipboardPaste className="w-4 h-4" />
              <span>Paste Questions (Bulk Text)</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Post-Creation Success Banner */}
          {createdQuiz && generatedUrl && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/70 to-emerald-50 border-2 border-emerald-300 text-emerald-950 space-y-4 shadow-sm animate-in fade-in">
              <div className="flex items-center justify-between gap-2 border-b border-emerald-200 pb-2.5">
                <div className="flex items-center gap-2 font-black text-xs text-emerald-900 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                  <span>Assessment Successfully Created & Ready to Run!</span>
                </div>
                <span className="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  Status: Active Quiz
                </span>
              </div>

              {/* Quiz Code & Student URL Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Student Quiz Access Code
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-black font-mono text-indigo-900 tracking-wider">
                      {createdQuiz.code}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold rounded-lg border border-indigo-200 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Direct Student Exam URL
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-slate-700 truncate max-w-[170px]">
                      {generatedUrl}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer shadow-2xs transition-colors"
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
                      <span>{copiedUrl ? 'Copied' : 'Copy Link'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons to Run or Proctor */}
              <div className="flex items-center gap-2.5 flex-wrap pt-1">
                {onRunQuiz && (
                  <button
                    type="button"
                    onClick={() => onRunQuiz(createdQuiz)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>▶ Run Quiz in Student Portal Now</span>
                  </button>
                )}

                {onOpenSurveillance && createdQuiz.id && (
                  <button
                    type="button"
                    onClick={() => onOpenSurveillance(createdQuiz.id!)}
                    className="px-4 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Open Live Proctoring & Surveillance</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 cursor-pointer"
                >
                  Done & Return to Dashboard
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: TYPE QUESTIONS STEP-BY-STEP */}
          {activeTab === 'type' && (
            <div className="space-y-5 animate-in fade-in">
              {/* Question Number Banner & Toast */}
              <div className="flex items-center justify-between flex-wrap gap-2 bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-amber-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    Q{editingIndex !== null ? editingIndex + 1 : localQuestions.length + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-serif">
                      {editingIndex !== null ? `Editing Question #${editingIndex + 1}` : `Type Question #${localQuestions.length + 1}`}
                    </h3>
                    <p className="text-[11px] text-slate-600">
                      {editingIndex !== null 
                        ? 'Modify question details and click Update.' 
                        : 'Fill in question statement, options, correct key, and click "Save & Type Next".'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {editingIndex !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingIndex(null);
                        setQText('');
                        setQExplanation('');
                      }}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <span className="text-xs font-mono font-bold bg-white text-indigo-900 px-3 py-1.5 rounded-lg border border-amber-300">
                    {localQuestions.length} Questions in Quiz
                  </span>
                </div>
              </div>

              {typeSuccessToast && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{typeSuccessToast}</span>
                </div>
              )}

              {/* Topic Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Subject Topic / Sub-topic
                </label>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {COMMON_TOPICS.slice(0, 6).map((top) => (
                    <button
                      key={top}
                      type="button"
                      onClick={() => setQTopic(top)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium cursor-pointer transition-all ${
                        qTopic === top
                          ? 'bg-amber-100 text-amber-900 border-amber-400 font-bold shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {top}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={qTopic}
                  onChange={(e) => setQTopic(e.target.value)}
                  placeholder="e.g. Quadratic Equations, Indices & Logarithms, Plant Biology..."
                  className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white"
                />
              </div>

              {/* Question Statement with Math Toolbar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Question Statement <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-normal">
                    Supports plain text & LaTeX formulas (e.g. $x^2 + 5x = 0$)
                  </span>
                </div>

                {/* Quick Math Symbols Toolbar */}
                <div className="bg-slate-100 p-2 rounded-xl border border-slate-200 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-500 uppercase px-1">Math Quick Insert:</span>
                  {[
                    { label: 'Fraction', latex: '$\\frac{a}{b}$ ' },
                    { label: 'x²', latex: '$x^2$ ' },
                    { label: 'xⁿ', latex: '$x^{n}$ ' },
                    { label: '√x', latex: '$\\sqrt{x}$ ' },
                    { label: 'ⁿ√x', latex: '$\\sqrt[n]{x}$ ' },
                    { label: '∫', latex: '$\\int ' },
                    { label: '∑', latex: '$\\sum ' },
                    { label: '±', latex: '$\\pm ' },
                    { label: 'π', latex: '$\\pi ' },
                    { label: 'θ', latex: '$\\theta ' },
                    { label: 'α', latex: '$\\alpha ' },
                    { label: 'β', latex: '$\\beta ' },
                    { label: '≤', latex: '$\\le ' },
                    { label: '≥', latex: '$\\ge ' },
                    { label: '≠', latex: '$\\neq ' },
                    { label: '×', latex: '$\\times ' },
                    { label: '÷', latex: '$\\div ' },
                    { label: '° (Deg)', latex: '^{\\circ}' },
                  ].map((sym) => (
                    <button
                      key={sym.label}
                      type="button"
                      onClick={() => insertMathSymbol(sym.latex)}
                      className="px-2 py-1 bg-white hover:bg-amber-50 text-slate-800 hover:text-amber-900 text-xs font-mono font-bold rounded-lg border border-slate-300 hover:border-amber-400 cursor-pointer shadow-2xs transition-all"
                      title={`Insert ${sym.label}`}
                    >
                      {sym.label}
                    </button>
                  ))}
                </div>

                <textarea
                  ref={qTextInputRef}
                  rows={3}
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="Type question statement here. Example: If $8^{2q} = 16^3$, find the value of $q$."
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white"
                />

                {/* Live Question Preview Box */}
                {qText.trim() && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Live KaTeX Formatted Preview:
                    </span>
                    <div className="text-xs sm:text-sm text-slate-900 font-medium leading-relaxed">
                      <MathRenderer math={qText} />
                    </div>
                  </div>
                )}
              </div>

              {/* Multiple Choice Options */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Answer Options A–D (Select the Correct Option)
                  </label>
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    4 Choices (A, B, C, D)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {qOptions.map((opt) => (
                    <div
                      key={opt.id}
                      className={`p-3 rounded-2xl border transition-all space-y-2 ${
                        qCorrectAnswer === opt.id
                          ? 'bg-emerald-50/90 border-emerald-400 shadow-2xs'
                          : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${
                              qCorrectAnswer === opt.id
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {opt.id}
                          </span>
                          <span className="text-xs font-bold text-slate-800">Option {opt.id}</span>
                        </div>

                        <label
                          className={`flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-lg cursor-pointer transition-colors ${
                            qCorrectAnswer === opt.id
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name="correctAnswerKeyRadio"
                            checked={qCorrectAnswer === opt.id}
                            onChange={() => setQCorrectAnswer(opt.id)}
                            className="hidden"
                          />
                          {qCorrectAnswer === opt.id && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          <span>{qCorrectAnswer === opt.id ? 'Correct Key' : 'Mark as Correct'}</span>
                        </label>
                      </div>

                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const updated = qOptions.map((o) => (o.id === opt.id ? { ...o, text: e.target.value } : o));
                          setQOptions(updated);
                        }}
                        placeholder={`Enter Option ${opt.id} text or formula...`}
                        className="w-full px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-white text-slate-900"
                      />

                      {opt.text.includes('$') && (
                        <div className="text-[11px] text-slate-700 bg-white/70 p-1.5 rounded-lg border border-slate-200/80">
                          <MathRenderer math={opt.text} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Explanation / Solution Steps */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Solution Explanation / Marking Scheme (Optional)
                </label>
                <textarea
                  rows={2}
                  value={qExplanation}
                  onChange={(e) => setQExplanation(e.target.value)}
                  placeholder="Provide step-by-step solution steps for AI feedback & post-exam review..."
                  className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white"
                />
              </div>

              {/* Action Buttons for Typing Mode */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQText('');
                      setQOptions([
                        { id: 'A', text: '' },
                        { id: 'B', text: '' },
                        { id: 'C', text: '' },
                        { id: 'D', text: '' },
                      ]);
                      setQExplanation('');
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Clear Form
                  </button>
                  {localQuestions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('review')}
                      className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold text-xs rounded-xl border border-indigo-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-600" />
                      <span>View All {localQuestions.length} Questions</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveTypedQuestion(false)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>{editingIndex !== null ? 'Update & Review' : 'Save Question'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveTypedQuestion(true)}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>
                      {editingIndex !== null 
                        ? 'Update & Add Next Question' 
                        : `Save & Type Next (Q${localQuestions.length + 2})`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PASTE QUESTIONS (BULK TEXT) */}
          {activeTab === 'paste' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-indigo-950 uppercase tracking-wider">
                    <ClipboardPaste className="w-4 h-4 text-indigo-600" />
                    <span>Paste Multiple Questions into Dashboard</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPasteText(SAMPLE_PASTE_TEXT)}
                    className="px-3 py-1 bg-white hover:bg-indigo-100 text-indigo-800 text-xs font-bold rounded-lg border border-indigo-300 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Load Example Question Template</span>
                  </button>
                </div>
                <p className="text-xs text-indigo-900/80 leading-relaxed">
                  Paste plain text or formatted questions from Microsoft Word, Google Docs, or text files. 
                  Numbers (1., 2.), choices (A., B., C., D.), answer keys (Answer: B), and math formulas ($x^2 - 5x + 6 = 0$, fractions, roots) will be automatically converted and rendered!
                </p>
              </div>

              {pasteError && (
                <div className="p-3.5 bg-rose-50 border border-rose-300 text-rose-900 text-xs font-medium rounded-xl flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{pasteError}</span>
                </div>
              )}

              {pasteSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{pasteSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Paste Question Content Below:
                </label>
                <textarea
                  rows={12}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={`1. Solve for x: 3x - 7 = 14\nA. 5\nB. 7\nC. 9\nD. 11\nAnswer: B\n\n2. Next question statement here...\nA. Option A\nB. Option B\nC. Option C\nD. Option D\nAnswer: C`}
                  className="w-full p-4 text-xs sm:text-sm font-mono leading-relaxed rounded-2xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900 bg-slate-50/50"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200 flex-wrap">
                <button
                  type="button"
                  onClick={() => setPasteText('')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Clear Paste Box
                </button>

                <button
                  type="button"
                  onClick={handleParsePastedQuestions}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer uppercase tracking-wider"
                >
                  <Zap className="w-4 h-4 text-slate-950" />
                  <span>⚡ Parse & Add Questions to Quiz</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: REVIEW QUESTIONS */}
          {activeTab === 'review' && (
            <div className="space-y-4 animate-in fade-in">
              {reviewSuccessToast && (
                <div className="bg-emerald-600 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-2xl shadow-lg flex items-center justify-between animate-in fade-in">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-100 shrink-0" />
                    <span>{reviewSuccessToast}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setReviewSuccessToast(null)}
                    className="p-1 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-bold font-serif text-slate-900 flex items-center gap-2">
                    <span>Question Paper Review</span>
                    <span className="px-2 py-0.5 text-xs font-bold bg-indigo-100 text-indigo-800 rounded-full">
                      {localQuestions.length} Questions
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Preview KaTeX formulas, verify answer keys, edit inline, reorder, or add questions
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenReviewAddQuestion}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all uppercase tracking-wider"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>+ Add Question</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('paste')}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 flex items-center gap-1 cursor-pointer"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Paste More</span>
                  </button>
                </div>
              </div>

              {localQuestions.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-500 space-y-3">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-bold text-slate-800">No Questions Added Yet</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Add questions one by one using the "+ Add Question" button or paste questions in bulk.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleOpenReviewAddQuestion}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl cursor-pointer uppercase tracking-wider"
                    >
                      + Add First Question
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('paste')}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Paste Questions
                    </button>
                  </div>
                </div>
              ) : (
                <div ref={reviewListRef} className="space-y-4 max-h-[58vh] overflow-y-auto pr-1">
                  {localQuestions.map((q, idx) => {
                    // INLINE QUESTION EDITOR MODE (Inside the Review page)
                    if (reviewEditingIndex === idx) {
                      return (
                        <div
                          ref={reviewEditBoxRef}
                          key={`review-editing-${idx}`}
                          className="bg-white rounded-3xl border-2 border-indigo-500 shadow-xl p-5 sm:p-6 space-y-4 animate-in fade-in ring-4 ring-indigo-500/10"
                        >
                          {/* Header */}
                          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-indigo-100">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
                                Q{idx + 1}
                              </div>
                              <div>
                                <h4 className="text-sm sm:text-base font-bold text-slate-900 font-serif flex items-center gap-2">
                                  <Edit3 className="w-4 h-4 text-indigo-600" />
                                  <span>Editing Question Q{idx + 1}</span>
                                </h4>
                                <p className="text-xs text-slate-500">
                                  Modify question statement, math formulas, options A-D, or answer key.
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setReviewEditingIndex(null)}
                                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveInlineEdit(idx)}
                                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                              >
                                <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                                <span>Save Q{idx + 1} Changes</span>
                              </button>
                            </div>
                          </div>

                          {/* Math Helper Quick Insert Bar */}
                          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3 space-y-1.5">
                            <div className="flex items-center justify-between text-xs text-amber-900 font-bold">
                              <span className="flex items-center gap-1.5">
                                <Calculator className="w-3.5 h-3.5 text-amber-700" />
                                Insert Math Symbol into: <span className="font-mono text-indigo-700 bg-white px-2 py-0.5 rounded border border-amber-300">{reviewMathTarget === 'question' ? 'Question' : reviewMathTarget.startsWith('option') ? `Option ${reviewMathTarget.replace('option', '')}` : 'Solution'}</span>
                              </span>
                              <span className="text-[11px] text-amber-800">Click to insert:</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
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
                                { label: 'Matrix', val: '$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$' },
                              ].map((sym, symIdx) => (
                                <button
                                  key={symIdx}
                                  type="button"
                                  onClick={() => handleInsertReviewMathSnippet(sym.val)}
                                  className="px-2 py-0.5 bg-white hover:bg-amber-100 text-slate-800 text-xs font-mono font-bold rounded border border-amber-300 shadow-2xs transition-colors cursor-pointer"
                                  title={`Insert ${sym.val}`}
                                >
                                  {sym.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Question Statement Input */}
                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                              Question Statement <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                              ref={reviewEditInputRef}
                              rows={3}
                              required
                              value={reviewFormText}
                              onFocus={() => setReviewMathTarget('question')}
                              onChange={(e) => setReviewFormText(e.target.value)}
                              placeholder="Type question with LaTeX math formulas e.g. Solve $2x + 4 = 10$."
                              className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-white"
                            />
                            {reviewFormText.trim() && (
                              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                                  KaTeX Preview:
                                </span>
                                <div className="text-xs sm:text-sm font-medium text-slate-900">
                                  <MathRenderer math={reviewFormText} />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Options A, B, C, D */}
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                              Multiple Choice Options (Select radio for Correct Answer Key)
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {reviewFormOptions.map((opt) => (
                                <div
                                  key={opt.id}
                                  className={`p-2.5 rounded-xl border transition-all ${
                                    reviewFormCorrectAnswer === opt.id
                                      ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-400/20'
                                      : 'bg-slate-50 border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <input
                                      type="radio"
                                      name="review-edit-correct-ans"
                                      id={`review-edit-opt-${opt.id}`}
                                      checked={reviewFormCorrectAnswer === opt.id}
                                      onChange={() => setReviewFormCorrectAnswer(opt.id)}
                                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    />
                                    <label
                                      htmlFor={`review-edit-opt-${opt.id}`}
                                      className={`text-xs font-bold cursor-pointer ${
                                        reviewFormCorrectAnswer === opt.id ? 'text-emerald-900' : 'text-slate-700'
                                      }`}
                                    >
                                      Option {opt.id} {reviewFormCorrectAnswer === opt.id && '(Correct Key)'}
                                    </label>
                                  </div>
                                  <input
                                    type="text"
                                    value={opt.text}
                                    onFocus={() => setReviewMathTarget(`option${opt.id}` as any)}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setReviewFormOptions((prev) =>
                                        prev.map((o) => (o.id === opt.id ? { ...o, text: val } : o))
                                      );
                                    }}
                                    placeholder={`Enter choice ${opt.id}...`}
                                    className="w-full px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-white"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Explanation & Topic */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="space-y-1">
                              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                                Solution / Marking Explanation
                              </label>
                              <textarea
                                rows={2}
                                value={reviewFormExplanation}
                                onFocus={() => setReviewMathTarget('explanation')}
                                onChange={(e) => setReviewFormExplanation(e.target.value)}
                                placeholder="Step-by-step working for feedback..."
                                className="w-full px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-white"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                                Topic / Sub-discipline
                              </label>
                              <div className="flex flex-wrap gap-1 mb-1">
                                {['Algebra', 'Calculus', 'Geometry', 'Statistics', 'Trigonometry'].map((t) => (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => setReviewFormTopic(t)}
                                    className={`px-2 py-0.5 text-[11px] rounded border transition-all cursor-pointer ${
                                      reviewFormTopic === t
                                        ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                    }`}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                              <input
                                type="text"
                                value={reviewFormTopic}
                                onChange={(e) => setReviewFormTopic(e.target.value)}
                                placeholder="Custom topic name..."
                                className="w-full px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-white"
                              />
                            </div>
                          </div>

                          {/* Bottom Action Buttons */}
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                            <button
                              type="button"
                              onClick={() => setReviewEditingIndex(null)}
                              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveInlineEdit(idx)}
                              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                            >
                              <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                              <span>Save Changes to Q{idx + 1}</span>
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // NORMAL PREVIEW CARD
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-amber-300 transition-all space-y-2.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-indigo-900 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                              Q{idx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                              {q.topic}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1">
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Key: Option {q.correctAnswer}</span>
                            </span>

                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveQuestion(idx, 'up')}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-30 cursor-pointer"
                              title="Move Up"
                            >
                              <MoveUp className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              disabled={idx === localQuestions.length - 1}
                              onClick={() => handleMoveQuestion(idx, 'down')}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-30 cursor-pointer"
                              title="Move Down"
                            >
                              <MoveDown className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStartInlineEdit(idx)}
                              className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-900 border border-indigo-200 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                              title="Edit this question inline"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(idx)}
                              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="Delete Question"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Question Statement */}
                        <div className="text-xs sm:text-sm text-slate-900 font-medium leading-relaxed">
                          <MathRenderer math={q.questionText} />
                        </div>

                        {/* Options Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt) => (
                            <div
                              key={opt.id}
                              className={`p-2 rounded-xl border text-xs flex items-center gap-2 ${
                                q.correctAnswer === opt.id
                                  ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-950'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-md text-[11px] font-bold flex items-center justify-center shrink-0 ${
                                  q.correctAnswer === opt.id
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {opt.id}
                              </span>
                              <div className="flex-1 truncate">
                                <MathRenderer math={opt.text} />
                              </div>
                              {q.correctAnswer === opt.id && (
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>

                        {q.explanation && (
                          <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-200">
                            <strong className="text-slate-700 font-semibold">Solution: </strong>
                            {q.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}

                  {/* INLINE ADD QUESTION CARD (APPEARS DOWN BELOW THE QUESTIONS LIST) */}
                  {isReviewAddQuestionOpen ? (
                    <div
                      ref={reviewAddBoxRef}
                      className="bg-white rounded-3xl border-2 border-amber-500 shadow-2xl p-5 sm:p-6 space-y-4 animate-in fade-in ring-4 ring-amber-500/10 mt-6"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-amber-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
                            Q{localQuestions.length + 1}
                          </div>
                          <div>
                            <h4 className="text-sm sm:text-base font-bold text-slate-900 font-serif flex items-center gap-2">
                              <Plus className="w-4 h-4 text-amber-700" />
                              <span>Add Question Q{localQuestions.length + 1} to Assessment</span>
                            </h4>
                            <p className="text-xs text-slate-500">
                              Compose question statement, choices A-D, and choose answer key.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsReviewAddQuestionOpen(false)}
                            className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveReviewAddQuestion(true)}
                            className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Save this question and immediately open next"
                          >
                            <Plus className="w-3.5 h-3.5 text-indigo-700 stroke-[3]" />
                            <span>Save & Add Next</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveReviewAddQuestion(false)}
                            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                          >
                            <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                            <span>Save Question Q{localQuestions.length + 1}</span>
                          </button>
                        </div>
                      </div>

                      {/* Math Helper Bar */}
                      <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-amber-900 font-bold">
                          <span className="flex items-center gap-1.5">
                            <Calculator className="w-3.5 h-3.5 text-amber-700" />
                            Insert Math Symbol into: <span className="font-mono text-indigo-700 bg-white px-2 py-0.5 rounded border border-amber-300">{reviewMathTarget === 'question' ? 'Question' : reviewMathTarget.startsWith('option') ? `Option ${reviewMathTarget.replace('option', '')}` : 'Solution'}</span>
                          </span>
                          <span className="text-[11px] text-amber-800">Click to insert:</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
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
                            { label: 'Matrix', val: '$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$' },
                          ].map((sym, symIdx) => (
                            <button
                              key={symIdx}
                              type="button"
                              onClick={() => handleInsertReviewMathSnippet(sym.val)}
                              className="px-2 py-0.5 bg-white hover:bg-amber-100 text-slate-800 text-xs font-mono font-bold rounded border border-amber-300 shadow-2xs transition-colors cursor-pointer"
                              title={`Insert ${sym.val}`}
                            >
                              {sym.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Question Statement Input */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Question Statement <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          ref={reviewAddInputRef}
                          rows={3}
                          required
                          value={reviewFormText}
                          onFocus={() => setReviewMathTarget('question')}
                          onChange={(e) => setReviewFormText(e.target.value)}
                          placeholder="Type question statement e.g. Evaluate $\lim_{x \to 0} \frac{\sin x}{x}$."
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white"
                        />
                        {reviewFormText.trim() && (
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                              Live KaTeX Preview:
                            </span>
                            <div className="text-xs sm:text-sm font-medium text-slate-900">
                              <MathRenderer math={reviewFormText} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Options A, B, C, D with Radio for Correct Key */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Multiple Choice Options (Select radio for Correct Answer Key)
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {reviewFormOptions.map((opt) => (
                            <div
                              key={opt.id}
                              className={`p-2.5 rounded-xl border transition-all ${
                                reviewFormCorrectAnswer === opt.id
                                  ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-400/20'
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1.5">
                                <input
                                  type="radio"
                                  name="review-add-correct-ans"
                                  id={`review-add-opt-${opt.id}`}
                                  checked={reviewFormCorrectAnswer === opt.id}
                                  onChange={() => setReviewFormCorrectAnswer(opt.id)}
                                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                />
                                <label
                                  htmlFor={`review-add-opt-${opt.id}`}
                                  className={`text-xs font-bold cursor-pointer ${
                                    reviewFormCorrectAnswer === opt.id ? 'text-emerald-900' : 'text-slate-700'
                                  }`}
                                >
                                  Option {opt.id} {reviewFormCorrectAnswer === opt.id && '(Correct Key)'}
                                </label>
                              </div>
                              <input
                                type="text"
                                value={opt.text}
                                onFocus={() => setReviewMathTarget(`option${opt.id}` as any)}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setReviewFormOptions((prev) =>
                                    prev.map((o) => (o.id === opt.id ? { ...o, text: val } : o))
                                  );
                                }}
                                placeholder={`Enter choice ${opt.id}...`}
                                className="w-full px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Explanation & Topic */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Solution / Explanation
                          </label>
                          <textarea
                            rows={2}
                            value={reviewFormExplanation}
                            onFocus={() => setReviewMathTarget('explanation')}
                            onChange={(e) => setReviewFormExplanation(e.target.value)}
                            placeholder="Worked steps or explanation..."
                            className="w-full px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Topic / Sub-discipline
                          </label>
                          <div className="flex flex-wrap gap-1 mb-1">
                            {['Algebra', 'Calculus', 'Geometry', 'Statistics', 'Trigonometry'].map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setReviewFormTopic(t)}
                                className={`px-2 py-0.5 text-[11px] rounded border transition-all cursor-pointer ${
                                  reviewFormTopic === t
                                    ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                }`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                          <input
                            type="text"
                            value={reviewFormTopic}
                            onChange={(e) => setReviewFormTopic(e.target.value)}
                            placeholder="Custom topic..."
                            className="w-full px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white"
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => setIsReviewAddQuestionOpen(false)}
                          className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveReviewAddQuestion(true)}
                          className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-4 h-4 text-indigo-700 stroke-[3]" />
                          <span>Save & Add Next</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveReviewAddQuestion(false)}
                          className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                        >
                          <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                          <span>Save Question Q{localQuestions.length + 1}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 flex items-center justify-between flex-wrap gap-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={handleOpenReviewAddQuestion}
                        className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer uppercase tracking-wider"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>+ Add Question (Q{localQuestions.length + 1})</span>
                      </button>
                      <span className="text-xs font-semibold text-slate-500">
                        Total Questions: {localQuestions.length}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: QUIZ SETTINGS & RULES */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Assessment Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assessment Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Core Mathematics End of Term Assessment"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subject <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Core Mathematics"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Class / Year Level
                  </label>
                  <input
                    type="text"
                    value={classGroup}
                    onChange={(e) => setClassGroup(e.target.value)}
                    placeholder="e.g. SHS 2 Science A"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teacher Name
                  </label>
                  <input
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="e.g. Mr. Twumasi"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900"
                  />
                </div>
              </div>

              {/* Time, Attempts & Count */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Duration (Minutes)
                    </label>
                    <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Min: 1 min
                    </span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={240}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900"
                  />
                  {/* Quick duration presets including 1-minute short quiz */}
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {[1, 5, 15, 30, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setDurationMinutes(mins)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                          durationMinutes === mins
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Attempts Allowed
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={attemptsAllowed}
                    onChange={(e) => setAttemptsAllowed(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total MCQs in Quiz
                  </label>
                  <input
                    type="number"
                    readOnly
                    value={localQuestions.length || extractedQuestionsCount || 0}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-bold"
                  />
                </div>
              </div>

              {/* Timeline Evaluation & Integrity Engine Section */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex flex-wrap items-center gap-2">
                        <span>Assessment Schedule & Timeline</span>
                        {!startDate && !endDate && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 normal-case">
                            Open Access by Default
                          </span>
                        )}
                        {(startDate || endDate) && !timelineError && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 normal-case">
                            Scheduled Window Active
                          </span>
                        )}
                        {timelineError && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 normal-case">
                            Validation Error
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Configure start release time and final submission deadline. Leave empty for unrestricted open access.
                      </p>
                    </div>
                  </div>

                  {/* One-click Clear All Dates (Open Access) */}
                  {(startDate || endDate) && (
                    <button
                      type="button"
                      onClick={handleClearAllDates}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-amber-300 bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-900 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-center shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Clear All Dates (Open Access)</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Start Date & Release Time */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Start Date & Release Time <span className="text-[11px] font-normal text-slate-400">(Optional)</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        validateTimeline(e.target.value, endDate);
                      }}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white"
                    />
                    <p className="text-[10.5px] text-slate-500 mt-1">
                      When assessment unlocks for students. Before this time, entry is locked with a live countdown.
                    </p>
                  </div>

                  {/* End Date & Submission Deadline */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      End Date / Submission Deadline <span className="text-[11px] font-normal text-slate-400">(Optional)</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        validateTimeline(startDate, e.target.value);
                      }}
                      className={`w-full px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl border focus:ring-2 text-slate-900 bg-white ${
                        timelineError
                          ? 'border-rose-400 focus:ring-rose-500'
                          : 'border-slate-300 focus:ring-amber-500'
                      }`}
                    />
                    <p className="text-[10.5px] text-slate-500 mt-1">
                      Final hard cutoff. When passed, student entry is locked and in-progress exams auto-submit.
                    </p>
                  </div>
                </div>

                {/* Validation Error Alert */}
                {timelineError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="font-semibold">{timelineError}</span>
                  </div>
                )}

                {/* Timeline Status Preview */}
                {!startDate && !endDate && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2">
                    <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Open Access by Default:</strong> No scheduled date restrictions. Candidates can begin this assessment at any time and will have their full <strong>{durationMinutes} minutes</strong> exam timer without an external deadline cutoff.
                    </span>
                  </div>
                )}

                {(startDate || endDate) && !timelineError && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold">
                        Timer Synchronization Active
                      </p>
                      <p className="text-[11px] text-amber-800">
                        Candidates will receive up to <strong>{durationMinutes} minutes</strong>, but their examination timer will dynamically synchronize and cut off at the scheduled submission deadline if that deadline occurs first.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions Block */}
              <div className="space-y-2.5 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    General Instructions ({instructionBullets.length} Points)
                  </label>
                  <button
                    type="button"
                    onClick={() => setInstructionBullets([...DEFAULT_QUIZ_INSTRUCTIONS])}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                    title="Reset to 5 default bullets"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset to Standard 5 Bullets</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {instructionBullets.map((bullet, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        required
                        value={bullet}
                        onChange={(e) => {
                          const updated = [...instructionBullets];
                          updated[idx] = e.target.value;
                          setInstructionBullets(updated);
                        }}
                        placeholder={`Guideline point #${idx + 1}...`}
                        className="flex-1 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-white text-slate-900"
                      />
                      <button
                        type="button"
                        disabled={instructionBullets.length <= 2}
                        onClick={() => {
                          if (instructionBullets.length > 2) {
                            setInstructionBullets(instructionBullets.filter((_, i) => i !== idx));
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30 cursor-pointer"
                        title="Remove bullet point"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {instructionBullets.length < 6 && (
                  <button
                    type="button"
                    onClick={() => setInstructionBullets([...instructionBullets, 'New candidate guideline for test administration.'])}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Instruction Bullet</span>
                  </button>
                )}
              </div>

              {/* Integrity & Proctoring Rules */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h3 className="text-base font-bold font-serif text-slate-900">
                    Integrity, Randomization & Feedback Rules
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {/* Tab Switch Monitoring */}
                  <div
                    onClick={() => setTabSwitchMonitoring(!tabSwitchMonitoring)}
                    className={`border rounded-2xl p-4 flex items-start justify-between gap-3 cursor-pointer transition-all ${
                      tabSwitchMonitoring
                        ? 'bg-slate-50/70 border-slate-300 hover:border-amber-500 shadow-2xs'
                        : 'bg-white border-slate-200 opacity-75 hover:opacity-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">Tab Switch Monitoring</h4>
                      <p className="text-xs text-slate-500 font-normal">Record when students leave exam window</p>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${tabSwitchMonitoring ? 'bg-amber-500 text-white' : 'border-2 border-slate-300 bg-white'}`}>
                      {tabSwitchMonitoring && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
                    </div>
                  </div>

                  {/* 3-Strike Progressive Tab Penalties */}
                  <div
                    onClick={() => {
                      const next = !progressiveTabPenalty;
                      setProgressiveTabPenalty(next);
                      if (next) setTabSwitchMonitoring(true);
                    }}
                    className={`border rounded-2xl p-4 flex items-start justify-between gap-3 cursor-pointer transition-all ${
                      progressiveTabPenalty
                        ? 'bg-rose-50/80 border-rose-400/80 shadow-xs ring-1 ring-rose-400/30'
                        : 'bg-white border-slate-200 opacity-75 hover:opacity-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">3-Strike Tab Penalty System</h4>
                        {progressiveTabPenalty && (
                          <span className="bg-rose-600 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium leading-tight">
                        <span className="text-rose-700 font-bold">1st:</span> -2m • <span className="text-rose-700 font-bold">2nd:</span> -5m • <span className="text-rose-700 font-bold">3rd:</span> Auto-Submit
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${progressiveTabPenalty ? 'bg-rose-600 text-white' : 'border-2 border-slate-300 bg-white'}`}>
                      {progressiveTabPenalty && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
                    </div>
                  </div>

                  {/* 1 Attempt Only Restriction (Name + ID/Email Verification) */}
                  <div
                    onClick={() => {
                      const next = !enforceSingleAttempt;
                      setEnforceSingleAttempt(next);
                      if (next) setAttemptsAllowed(1);
                    }}
                    className={`border rounded-2xl p-4 flex items-start justify-between gap-3 cursor-pointer transition-all ${
                      enforceSingleAttempt
                        ? 'bg-emerald-50/80 border-emerald-400/80 shadow-xs ring-1 ring-emerald-400/30'
                        : 'bg-white border-slate-200 opacity-75 hover:opacity-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">Strict Single Attempt Lock</h4>
                        {enforceSingleAttempt && (
                          <span className="bg-emerald-600 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium leading-tight">
                        Enforce 1 submission per student (verified by <span className="text-emerald-800 font-bold">Full Name</span> + <span className="text-emerald-800 font-bold">ID or Email</span>)
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${enforceSingleAttempt ? 'bg-emerald-600 text-white' : 'border-2 border-slate-300 bg-white'}`}>
                      {enforceSingleAttempt && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
                    </div>
                  </div>

                  {/* Dynamic Candidate Watermark Shield */}
                  <div
                    onClick={() => setEnableCandidateWatermark(!enableCandidateWatermark)}
                    className={`border rounded-2xl p-4 flex items-start justify-between gap-3 cursor-pointer transition-all ${
                      enableCandidateWatermark
                        ? 'bg-indigo-50/80 border-indigo-400/80 shadow-xs ring-1 ring-indigo-400/30'
                        : 'bg-white border-slate-200 opacity-75 hover:opacity-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">Dynamic Candidate Watermarking</h4>
                        {enableCandidateWatermark && (
                          <span className="bg-indigo-600 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium leading-tight">
                        Overlays candidate <span className="text-indigo-900 font-bold">Name</span>, <span className="text-indigo-900 font-bold">ID</span> & live timestamp across exam paper to deter camera leaks
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${enableCandidateWatermark ? 'bg-indigo-600 text-white' : 'border-2 border-slate-300 bg-white'}`}>
                      {enableCandidateWatermark && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
                    </div>
                  </div>

                  {/* Anti-Copy, Print & Key Interception */}
                  <div
                    onClick={() => setEnableAntiCopyPrint(!enableAntiCopyPrint)}
                    className={`border rounded-2xl p-4 flex items-start justify-between gap-3 cursor-pointer transition-all ${
                      enableAntiCopyPrint
                        ? 'bg-amber-50/80 border-amber-400/80 shadow-xs ring-1 ring-amber-400/30'
                        : 'bg-white border-slate-200 opacity-75 hover:opacity-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">Anti-Copy & Print Interception</h4>
                        {enableAntiCopyPrint && (
                          <span className="bg-amber-600 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium leading-tight">
                        Blocks right-click context menu, text selection, Print to PDF (<span className="font-mono text-amber-900 font-bold">Ctrl+P</span>), copy & PrintScreen
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${enableAntiCopyPrint ? 'bg-amber-600 text-white' : 'border-2 border-slate-300 bg-white'}`}>
                      {enableAntiCopyPrint && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
                    </div>
                  </div>

                  {/* Fullscreen Exam Lock */}
                  <div
                    onClick={() => setEnableFullscreenEnforcement(!enableFullscreenEnforcement)}
                    className={`border rounded-2xl p-4 flex items-start justify-between gap-3 cursor-pointer transition-all ${
                      enableFullscreenEnforcement
                        ? 'bg-violet-50/80 border-violet-400/80 shadow-xs ring-1 ring-violet-400/30'
                        : 'bg-white border-slate-200 opacity-75 hover:opacity-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">Fullscreen Exam Lock</h4>
                        {enableFullscreenEnforcement && (
                          <span className="bg-violet-600 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium leading-tight">
                        Enforces fullscreen mode before exam start and flags window exits as integrity violations
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${enableFullscreenEnforcement ? 'bg-violet-600 text-white' : 'border-2 border-slate-300 bg-white'}`}>
                      {enableFullscreenEnforcement && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
                    </div>
                  </div>

                  {/* Institutional Lockdown Kiosk Mode (Master Suite & Sub-Features) */}
                  <div className={`border-2 rounded-2xl p-5 transition-all space-y-4 ${
                    enableFullscreenLockdown || linearExamMode || perQuestionTimerEnabled || autoSkipOnTabSwitch
                      ? 'bg-purple-50/70 border-purple-400 shadow-sm ring-2 ring-purple-200/50'
                      : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded-md bg-purple-200 text-purple-900">
                            <ShieldAlert className="w-4 h-4" />
                          </span>
                          <h4 className="text-sm font-black text-slate-900 tracking-tight">
                            Institutional Lockdown Kiosk Mode
                          </h4>
                          {(enableFullscreenLockdown || (linearExamMode && perQuestionTimerEnabled && autoSkipOnTabSwitch)) && (
                            <span className="bg-purple-700 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider animate-pulse">
                              Full Lockdown
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                          Approximates institutional lockdown browser enforcement (Respondus-style): forces fullscreen, freezes unauthorized keyboard keys, enforces strict linear progression, and automatically skips questions if the candidate navigates away.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !enableFullscreenLockdown;
                          setEnableFullscreenLockdown(nextVal);
                          if (nextVal) {
                            setEnableFullscreenEnforcement(true);
                            setLinearExamMode(true);
                            setPerQuestionTimerEnabled(true);
                            setAutoSkipOnTabSwitch(true);
                            setQuestionPaginationMode('one-question-per-page');
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer shadow-xs ${
                          enableFullscreenLockdown
                            ? 'bg-purple-700 text-white hover:bg-purple-800'
                            : 'bg-slate-100 text-slate-700 hover:bg-purple-100 hover:text-purple-900 border border-slate-300'
                        }`}
                      >
                        {enableFullscreenLockdown ? 'Lockdown Active' : 'Enable All 3'}
                      </button>
                    </div>

                    {/* The 3 Specific Lockdown Sub-Features */}
                    <div className="pt-2 border-t border-purple-200/70 space-y-2.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900 block">
                        Individual Lockdown Policies:
                      </span>

                      {/* 1. Linear Exam Mode (No Going Back) */}
                      <div
                        onClick={() => {
                          const nextVal = !linearExamMode;
                          setLinearExamMode(nextVal);
                          if (nextVal) setQuestionPaginationMode('one-question-per-page');
                        }}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition-all ${
                          linearExamMode
                            ? 'bg-white border-purple-500 shadow-2xs ring-1 ring-purple-400'
                            : 'bg-white/60 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                            <span className="text-xs font-bold text-slate-900">
                              1. Linear Exam Mode (No Going Back)
                            </span>
                            {linearExamMode && (
                              <span className="text-[9px] font-extrabold bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded">
                                Strictly Linear
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 leading-tight">
                            Students must answer sequentially. Once they proceed to the next question, the previous button is disabled and they cannot go back.
                          </p>
                        </div>
                        <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 ${linearExamMode ? 'bg-purple-700 text-white' : 'border-2 border-slate-300'}`}>
                          {linearExamMode && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>

                      {/* 2. Per-Question Timer with Audible Warning */}
                      <div
                        onClick={() => setPerQuestionTimerEnabled(!perQuestionTimerEnabled)}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition-all ${
                          perQuestionTimerEnabled
                            ? 'bg-white border-purple-500 shadow-2xs ring-1 ring-purple-400'
                            : 'bg-white/60 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                            <span className="text-xs font-bold text-slate-900">
                              2. Per-Question Timer with Audible Warning
                            </span>
                            {perQuestionTimerEnabled && (
                              <span className="text-[9px] font-extrabold bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded">
                                Audio Alert &lt;10s
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 leading-tight">
                            Allocates time per question (Total Time / Number of Questions). Plays audible countdown beeps under 10 seconds and automatically auto-advances.
                          </p>
                        </div>
                        <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 ${perQuestionTimerEnabled ? 'bg-purple-700 text-white' : 'border-2 border-slate-300'}`}>
                          {perQuestionTimerEnabled && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>

                      {/* 3. Auto-Skip on Tab Switch / Leaving Page */}
                      <div
                        onClick={() => setAutoSkipOnTabSwitch(!autoSkipOnTabSwitch)}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition-all ${
                          autoSkipOnTabSwitch
                            ? 'bg-white border-purple-500 shadow-2xs ring-1 ring-purple-400'
                            : 'bg-white/60 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span className="text-xs font-bold text-slate-900">
                              3. Auto-Skip on Tab Switch / Leaving Page
                            </span>
                            {autoSkipOnTabSwitch && (
                              <span className="text-[9px] font-extrabold bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded">
                                Instant Blank Forfeit
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 leading-tight">
                            If a student switches tabs, minimizes the browser, or unfocuses the exam, the current question is instantly forfeited as blank and advances forward.
                          </p>
                        </div>
                        <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 ${autoSkipOnTabSwitch ? 'bg-rose-600 text-white' : 'border-2 border-slate-300'}`}>
                          {autoSkipOnTabSwitch && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Random Camera Proctoring & Photo Surveillance */}
                  <div className={`border-2 rounded-2xl p-5 transition-all space-y-4 ${
                    enableCameraProctoring
                      ? 'bg-emerald-50/80 border-emerald-400 shadow-sm ring-2 ring-emerald-200/50'
                      : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`p-1.5 rounded-lg ${enableCameraProctoring ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            <Camera className="w-4 h-4" />
                          </span>
                          <h4 className="text-sm font-black text-slate-900 tracking-tight">
                            Random Camera Proctoring (Webcam Surveillance)
                          </h4>
                          {enableCameraProctoring && (
                            <span className="bg-emerald-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider animate-pulse">
                              {cameraCaptureCount} Captures Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 font-medium">
                          Requires students to grant camera permission before starting. Automatically takes <strong>unpredictable random photos</strong> during the exam to verify student identity and deter proxy test-taking.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEnableCameraProctoring(!enableCameraProctoring)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                          enableCameraProctoring
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>{enableCameraProctoring ? 'Enabled' : 'Enable Proctoring'}</span>
                      </button>
                    </div>

                    {enableCameraProctoring && (
                      <div className="pt-2 border-t border-emerald-200/80 space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1.5">
                            Number of Random Photo Captures During Exam:
                          </label>
                          <div className="flex flex-wrap items-center gap-2">
                            {[5, 10, 15].map((preset) => (
                              <button
                                key={`preset-${preset}`}
                                type="button"
                                onClick={() => setCameraCaptureCount(preset)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                                  cameraCaptureCount === preset
                                    ? 'bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-400'
                                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                {preset} Captures
                              </button>
                            ))}
                            <div className="flex items-center gap-1.5 ml-1">
                              <span className="text-xs text-slate-500 font-semibold">Custom:</span>
                              <input
                                type="number"
                                min="1"
                                max="30"
                                value={cameraCaptureCount}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!isNaN(val) && val >= 1 && val <= 50) {
                                    setCameraCaptureCount(val);
                                  }
                                }}
                                className="w-16 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                              <span className="text-xs text-slate-500">photos</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-white/80 rounded-xl border border-emerald-200 text-[11px] text-slate-600 space-y-1.5">
                          <div className="flex items-start gap-1.5 text-emerald-800 font-bold">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                            <span>Strict Privacy & Automated Lifecycle Rules:</span>
                          </div>
                          <ul className="list-disc pl-5 space-y-0.5 text-slate-600">
                            <li><strong>Truly Unpredictable Timing:</strong> The first capture is taken randomly shortly after exam start; remaining photos fire at non-uniform pseudo-random intervals so students cannot predict them.</li>
                            <li><strong>Bandwidth-Efficient Compression:</strong> Photos are downscaled and JPEG-compressed to keep bandwidth under 30KB per photo.</li>
                            <li><strong>Restricted Teacher Access:</strong> Photos can only be viewed in the results gallery by you (the creator of this quiz) or the administrator.</li>
                            <li><strong>7-Day Automatic Purge:</strong> All proctoring photos are automatically permanently deleted after 7 days, or whenever you choose to delete them earlier.</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Question Presentation & Pagination Mode */}
                  <div className="border border-slate-300 bg-white rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 leading-snug">
                            Question Presentation & Layout
                          </h4>
                          <p className="text-xs text-slate-500">
                            Choose how questions appear to students during the examination
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Option 1: One question per page */}
                      <div
                        onClick={() => setQuestionPaginationMode('one-question-per-page')}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-2.5 ${
                          questionPaginationMode === 'one-question-per-page'
                            ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-500/20'
                            : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">
                              One Question Per Page
                            </span>
                            <span className="text-[11px] text-slate-600 leading-tight block mt-1">
                              Displays 1 question at a time with <strong>Previous</strong> and <strong>Next</strong> navigation buttons beneath.
                            </span>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                            questionPaginationMode === 'one-question-per-page'
                              ? 'border-indigo-600 bg-indigo-600'
                              : 'border-slate-400 bg-white'
                          }`}>
                            {questionPaginationMode === 'one-question-per-page' && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md w-fit">
                          Focused Mode (Recommended)
                        </span>
                      </div>

                      {/* Option 2: All questions on one page */}
                      <div
                        onClick={() => setQuestionPaginationMode('single-page')}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-2.5 ${
                          questionPaginationMode === 'single-page'
                            ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-500/20'
                            : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">
                              All Questions on One Page
                            </span>
                            <span className="text-[11px] text-slate-600 leading-tight block mt-1">
                              Continuous full examination paper format where candidates can scroll through all questions.
                            </span>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                            questionPaginationMode === 'single-page'
                              ? 'border-indigo-600 bg-indigo-600'
                              : 'border-slate-400 bg-white'
                          }`}>
                            {questionPaginationMode === 'single-page' && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded-md w-fit">
                          Full Paper Scroll
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Randomize Questions */}
                  <div
                    onClick={() => setRandomizeQuestions(!randomizeQuestions)}
                    className={`border rounded-2xl p-4 flex items-start justify-between gap-3 cursor-pointer transition-all ${
                      randomizeQuestions
                        ? 'bg-slate-50/70 border-slate-300 hover:border-amber-500 shadow-2xs'
                        : 'bg-white border-slate-200 opacity-75 hover:opacity-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">Randomize Questions</h4>
                      <p className="text-xs text-slate-500 font-normal">Present questions in random order for each student</p>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${randomizeQuestions ? 'bg-amber-500 text-white' : 'border-2 border-slate-300 bg-white'}`}>
                      {randomizeQuestions && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
                    </div>
                  </div>

                  {/* Randomize Options */}
                  <div
                    onClick={() => setRandomizeOptions(!randomizeOptions)}
                    className={`border rounded-2xl p-4 flex items-start justify-between gap-3 cursor-pointer transition-all ${
                      randomizeOptions
                        ? 'bg-slate-50/70 border-slate-300 hover:border-amber-500 shadow-2xs'
                        : 'bg-white border-slate-200 opacity-75 hover:opacity-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">Randomize Options</h4>
                      <p className="text-xs text-slate-500 font-normal">Shuffle Option A, B, C, D choices per candidate</p>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${randomizeOptions ? 'bg-amber-500 text-white' : 'border-2 border-slate-300 bg-white'}`}>
                      {randomizeOptions && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
                    </div>
                  </div>

                  {/* Show Score Immediately */}
                  <div
                    onClick={() => setShowScoreImmediately(!showScoreImmediately)}
                    className={`border rounded-2xl p-4 flex items-start justify-between gap-3 cursor-pointer transition-all ${
                      showScoreImmediately
                        ? 'bg-slate-50/70 border-slate-300 hover:border-amber-500 shadow-2xs'
                        : 'bg-white border-slate-200 opacity-75 hover:opacity-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">Show Score Immediately</h4>
                      <p className="text-xs text-slate-500 font-normal">Display score upon student test submission</p>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${showScoreImmediately ? 'bg-amber-500 text-white' : 'border-2 border-slate-300 bg-white'}`}>
                      {showScoreImmediately && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
                    </div>
                  </div>

                  {/* Show Correct Answers */}
                  <div
                    onClick={() => setShowCorrectAnswers(!showCorrectAnswers)}
                    className={`border rounded-2xl p-4 flex items-start justify-between gap-3 cursor-pointer transition-all ${
                      showCorrectAnswers
                        ? 'bg-slate-50/70 border-slate-300 hover:border-amber-500 shadow-2xs'
                        : 'bg-white border-slate-200 opacity-75 hover:opacity-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">Show Correct Answers</h4>
                      <p className="text-xs text-slate-500 font-normal">Reveal correct answers in post-submission review</p>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${showCorrectAnswers ? 'bg-amber-500 text-white' : 'border-2 border-slate-300 bg-white'}`}>
                      {showCorrectAnswers && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
                    </div>
                  </div>

                  {/* Enable AI Feedback */}
                  <div
                    onClick={() => setAllowFeedback(!allowFeedback)}
                    className={`border rounded-2xl p-4 flex items-start justify-between gap-3 cursor-pointer transition-all ${
                      allowFeedback
                        ? 'bg-slate-50/70 border-slate-300 hover:border-amber-500 shadow-2xs'
                        : 'bg-white border-slate-200 opacity-75 hover:opacity-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">AI Pedagogical Feedback</h4>
                      <p className="text-xs text-slate-500 font-normal">Generate personal strengths & recommendations</p>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${allowFeedback ? 'bg-amber-500 text-white' : 'border-2 border-slate-300 bg-white'}`}>
                      {allowFeedback && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
                    </div>
                  </div>
                </div>

                {/* Candidate Access & Roster Configuration Card */}
                <div className="bg-gradient-to-r from-indigo-50/70 via-white to-amber-50/50 border border-indigo-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-700" />
                      <h4 className="text-sm font-bold text-slate-900">Candidate Roster & Access Control</h4>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        accessMode === 'restricted'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-slate-100 text-slate-600 border border-slate-300'
                      }`}>
                        {accessMode === 'restricted' ? 'Restricted (Roster Enforced)' : 'Open Access'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 max-w-xl">
                      {studentRoster.length > 0
                        ? `${studentRoster.length} candidate${studentRoster.length === 1 ? '' : 's'} registered on the roster. ${accessMode === 'restricted' ? 'Only listed candidates can take this quiz.' : 'Roster is saved but access is currently open to anyone.'}`
                        : 'No candidate roster uploaded yet. You can upload an Excel/CSV file with Name, ID, and Email to restrict exam access.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('roster')}
                    className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Users className="w-4 h-4 text-amber-400" />
                    <span>{studentRoster.length > 0 ? `Manage Roster (${studentRoster.length})` : 'Upload Excel / CSV Roster'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CANDIDATE ROSTER & ACCESS CONTROL */}
          {activeTab === 'roster' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Header Banner */}
              <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-sm border border-indigo-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-400/30">
                      <Users className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-white">Bulk Student Registration & Candidate Roster</h3>
                      <p className="text-xs text-indigo-200/90">
                        Upload an Excel or CSV file containing candidates (Name, Student ID, Email). Enforce strict verification before candidates can start.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => generateRosterTemplateExcel(title)}
                    className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Download Excel format template"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Download Excel Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={generateRosterTemplateCsv}
                    className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Download CSV format template"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>CSV Template</span>
                  </button>
                </div>
              </div>

              {/* Policy & Validation Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Access Mode */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Access Policy</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Control who can take this assessment</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      accessMode === 'restricted'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {accessMode === 'restricted' ? 'Restricted Gate' : 'Open Access'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAccessMode('restricted')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        accessMode === 'restricted'
                          ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Lock className="w-4 h-4 text-indigo-700" />
                        {accessMode === 'restricted' && <Check className="w-4 h-4 text-indigo-600 stroke-[3]" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Restricted (Enforced)</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Only students on roster can log in</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccessMode('open')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        accessMode === 'open'
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        {accessMode === 'open' && <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Open Access</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Any student with name/ID can write</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Validation Key */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Credential Verification Field</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Which credential must match the uploaded sheet at student login?</p>
                  </div>

                  <select
                    value={rosterValidationField}
                    onChange={(e) => setRosterValidationField(e.target.value as any)}
                    className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                  >
                    <option value="id_or_email">Student ID OR Email Address (Recommended)</option>
                    <option value="id_only">Student ID / Roll No Only</option>
                    <option value="email_only">Student Email Address Only</option>
                    <option value="both">Strict: Both Student ID AND Email must match</option>
                  </select>

                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg">
                    <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>The student's name on registration will be automatically verified against the matched roster row.</span>
                  </div>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div className="bg-white border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-2xl p-6 text-center transition-colors">
                <input
                  ref={rosterFileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleRosterFileUpload(f);
                  }}
                  className="hidden"
                  id="quiz-creator-roster-upload"
                />

                <div className="max-w-md mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-700">
                    <UploadCloud className="w-6 h-6" />
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Upload Student Roster Spreadsheet</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Drag and drop your file here, or click to browse. Supports Excel (.xlsx, .xls) and CSV (.csv).
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                    <label
                      htmlFor="quiz-creator-roster-upload"
                      className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4 text-amber-400" />
                      <span>{isUploadingRoster ? 'Parsing File...' : 'Select Excel / CSV File'}</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => generateRosterTemplateExcel(title)}
                      className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold text-xs rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Download blank Excel template with Candidate Name, Student ID, and Email"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                      <span>Download Excel Template (.xlsx)</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Template columns: <strong>Candidate Name</strong>, <strong>Student ID</strong>, and <strong>Email</strong>. You can also upload your own custom school spreadsheet in any format.
                  </p>
                </div>
              </div>

              {/* Upload Result / Error Banner */}
              {rosterUploadResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs ${
                    rosterUploadResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>
                      {rosterUploadResult.success
                        ? `✓ Successfully parsed ${rosterUploadResult.validCount} student record${rosterUploadResult.validCount === 1 ? '' : 's'}`
                        : '❌ Failed to parse roster file'}
                    </span>
                    {rosterUploadResult.duplicateCount > 0 && (
                      <span className="text-[11px] font-normal text-amber-700">
                        ({rosterUploadResult.duplicateCount} duplicate ID/Email skipped)
                      </span>
                    )}
                  </div>
                  {rosterUploadResult.errors.length > 0 && (
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-rose-700">
                      {rosterUploadResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                  {rosterUploadResult.warnings.length > 0 && (
                    <ul className="list-disc pl-5 mt-2 space-y-0.5 text-amber-700">
                      {rosterUploadResult.warnings.slice(0, 3).map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Quick Add Candidate Manually */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-indigo-700" />
                    <span className="text-xs font-bold text-slate-800">Add Individual Candidate Manually</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddingRosterManual(!isAddingRosterManual)}
                    className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 cursor-pointer"
                  >
                    {isAddingRosterManual ? 'Hide Form' : '+ Add Single Student'}
                  </button>
                </div>

                {isAddingRosterManual && (
                  <form onSubmit={handleAddManualRosterStudent} className="space-y-3 pt-2 border-t border-slate-200">
                    {manualRosterError && (
                      <p className="text-xs text-rose-600 font-semibold">{manualRosterError}</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={manualRosterName}
                          onChange={(e) => setManualRosterName(e.target.value)}
                          placeholder="e.g. Kwame Mensah"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Student ID / Roll No</label>
                        <input
                          type="text"
                          value={manualRosterId}
                          onChange={(e) => setManualRosterId(e.target.value)}
                          placeholder="e.g. SHS-2026-042"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Email Address</label>
                        <input
                          type="email"
                          value={manualRosterEmail}
                          onChange={(e) => setManualRosterEmail(e.target.value)}
                          placeholder="e.g. kwame@school.edu"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Class / Section</label>
                        <input
                          type="text"
                          value={manualRosterClass}
                          onChange={(e) => setManualRosterClass(e.target.value)}
                          placeholder="e.g. SHS 2 Science A"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingRosterManual(false)}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to Roster</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Roster Candidate Table */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/60">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-700" />
                    <span className="text-xs font-bold text-slate-900">
                      Authorized Candidates ({studentRoster.length})
                    </span>
                    {accessMode === 'restricted' && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                        Gate Enforced
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-60">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={rosterSearchQuery}
                        onChange={(e) => setRosterSearchQuery(e.target.value)}
                        placeholder="Search name, ID, or email..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                    {studentRoster.length > 0 && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => downloadQuizStudentListExcel({
                            id: quizToEdit?.id,
                            code: quizToEdit?.code || title,
                            title: title || 'Assessment',
                            studentRoster,
                            classGroup,
                          } as any)}
                          className="px-3 py-1.5 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-xl font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 shadow-2xs"
                          title="Download full list of registered candidates as an Excel spreadsheet (.xlsx)"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Download Student List ({studentRoster.length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleClearAllRoster}
                          className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-semibold transition-colors cursor-pointer shrink-0"
                        >
                          Clear All
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {studentRoster.length === 0 ? (
                  <div className="p-10 text-center space-y-2">
                    <Users className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-600">No candidates on the roster yet</p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      Upload an Excel or CSV spreadsheet, or click "+ Add Single Student" above.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/80 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Candidate Name</th>
                          <th className="py-2.5 px-3">Student ID</th>
                          <th className="py-2.5 px-3">Email Address</th>
                          <th className="py-2.5 px-3">Class</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {studentRoster
                          .filter((s) => {
                            if (!rosterSearchQuery.trim()) return true;
                            const q = rosterSearchQuery.toLowerCase();
                            return (
                              s.name.toLowerCase().includes(q) ||
                              s.studentId.toLowerCase().includes(q) ||
                              (s.email && s.email.toLowerCase().includes(q)) ||
                              (s.classGroup && s.classGroup.toLowerCase().includes(q))
                            );
                          })
                          .map((student, idx) => (
                            <tr key={student.id || student.studentId} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                              <td className="py-2 px-3 font-semibold text-slate-900">{student.name}</td>
                              <td className="py-2 px-3 font-mono font-medium text-indigo-900">{student.studentId}</td>
                              <td className="py-2 px-3 text-slate-600">{student.email || '—'}</td>
                              <td className="py-2 px-3 text-slate-500">{student.classGroup || '—'}</td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRosterStudent(student.id || student.studentId)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                                  title="Remove student from roster"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer Action Bar */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">
              Total Questions: <strong className="text-indigo-900 font-black">{localQuestions.length}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-500">
              Duration: <strong className="text-slate-800 font-bold">{durationMinutes}m</strong>
            </span>

            {localQuestions.length > 0 && (
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(true)}
                className="ml-2 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                title="Discard questions"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Discard All</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel & Close
            </button>

            {onRunQuiz && (
              <button
                type="button"
                onClick={() => handleSubmit(undefined, true)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                title="Publish and launch directly in student portal"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{quizToEdit ? 'Save & Run Exam Now' : 'Publish & Run Quiz Now'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSubmit()}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>{quizToEdit ? 'Save Changes & Return to Dashboard' : 'Save Assessment & Return to Dashboard'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Discard Confirmation Modal */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Discard Questions?</h3>
                <p className="text-xs text-slate-500">Cancel setup & clear loaded questions</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to discard this exam setup? All {localQuestions.length} questions will be discarded.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Keep Setting Up
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscard}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Discard</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
