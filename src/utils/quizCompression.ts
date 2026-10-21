import QRCode from 'qrcode';
import LZString from 'lz-string';
import { QuizConfig, Question, QuizSection } from '../types';
import { safeSetItem } from './safeStorage';
import { saveQuizToOfflineStorage } from './offlineQuizStorage';

export interface SelfContainedQuizPackage {
  v: number; // version
  config: QuizConfig;
  questions: Question[];
  sections: QuizSection[];
}

/**
 * Generates an SVG or PNG Data URL QR code from any text/URL
 */
export async function generateQRCodeDataUrl(
  text: string,
  options?: {
    width?: number;
    margin?: number;
    colorDark?: string;
    colorLight?: string;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  }
): Promise<string> {
  try {
    const errorCorrectionLevel = options?.errorCorrectionLevel || (text.length > 500 ? 'L' : 'M');
    const dataUrl = await QRCode.toDataURL(text, {
      width: options?.width || 512,
      margin: options?.margin ?? 2,
      color: {
        dark: options?.colorDark || '#0f172a',
        light: options?.colorLight || '#ffffff',
      },
      errorCorrectionLevel,
    });
    return dataUrl;
  } catch (err) {
    console.error('Failed to generate QR code data URL:', err);
    throw err;
  }
}

/**
 * Generates the direct scannable student URL for a quiz.
 * This URL is compact (~50 characters) and creates crystal-clear, high-resolution QR codes
 * that scan instantaneously in standard mobile camera apps and browser QR readers.
 * It immediately locks into the isolated student assessment domain.
 */
export function encodeQuizToUrl(
  config: QuizConfig,
  questions: Question[] = [],
  sections: QuizSection[] = []
): string {
  const baseUrl = typeof window !== 'undefined' && window.location
    ? `${window.location.origin}${window.location.pathname}`
    : '';
  const quizCode = config.code || config.id || 'QUIZ';
  return `${baseUrl}?portal=student&quiz=${encodeURIComponent(quizCode)}`;
}

/**
 * Generates a direct scannable Offline URL that tells the student examination portal
 * to load and execute the exam completely offline using local pre-cached data (IndexedDB/localStorage).
 * Highly compact (~60 characters) and produces ultra-sharp, instantaneous-scanning QR codes.
 */
export function encodeQuizToOfflineUrl(config: QuizConfig): string {
  const baseUrl = typeof window !== 'undefined' && window.location
    ? `${window.location.origin}${window.location.pathname}`
    : '';
  const quizCode = config.code || config.id || 'QUIZ';
  return `${baseUrl}?portal=student&quiz=${encodeURIComponent(quizCode)}&offline=true`;
}

/**
 * Compresses a complete quiz into a self-contained offline URL string
 * containing all questions, LaTeX expressions, and section release configurations.
 * Strips redundant nested arrays from config to minimize character footprint.
 */
export function encodeQuizToSelfContainedUrl(
  config: QuizConfig,
  questions: Question[] = [],
  sections: QuizSection[] = []
): string {
  const resolvedQuestions = questions.length > 0 ? questions : (config.questions || []);
  const resolvedSections = sections.length > 0 ? sections : (config.sections || []);

  // Avoid duplicating questions inside both config.questions and questions array
  const { questions: _, sections: __, ...slimConfig } = config;

  const pkg: SelfContainedQuizPackage = {
    v: 1,
    config: slimConfig as QuizConfig,
    questions: resolvedQuestions,
    sections: resolvedSections,
  };

  const jsonStr = JSON.stringify(pkg);
  const compressed = LZString.compressToEncodedURIComponent(jsonStr);

  const baseUrl = typeof window !== 'undefined' && window.location
    ? `${window.location.origin}${window.location.pathname}`
    : '';
  const quizCode = config.code || config.id || 'QUIZ';

  return `${baseUrl}?portal=student&quiz=${encodeURIComponent(quizCode)}&qdata=${compressed}`;
}

/**
 * Generates a short portable Offline Quiz Code (e.g. for manual pasting)
 */
export function encodeQuizToPortableCode(
  config: QuizConfig,
  questions: Question[] = [],
  sections: QuizSection[] = []
): string {
  const pkg: SelfContainedQuizPackage = {
    v: 1,
    config,
    questions,
    sections,
  };
  const jsonStr = JSON.stringify(pkg);
  return `AQZ_${LZString.compressToBase64(jsonStr)}`;
}

/**
 * Parses and validates raw JSON string or deserialized package into a structured quiz object
 * adhering to the QuizConfig, Question, and QuizSection schemas.
 */
export function parseQuizPackage(
  data: unknown
): { config: QuizConfig; questions: Question[]; sections: QuizSection[] } | null {
  if (!data) return null;

  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    if (!parsed || typeof parsed !== 'object') return null;

    if (parsed.config && Array.isArray(parsed.questions)) {
      return {
        config: parsed.config,
        questions: parsed.questions,
        sections: Array.isArray(parsed.sections) ? parsed.sections : [],
      };
    } else if (parsed.subject && (parsed.totalQuestions !== undefined || Array.isArray(parsed.questions))) {
      // Direct config object representation
      return {
        config: parsed,
        questions: Array.isArray(parsed.questions) ? parsed.questions : [],
        sections: Array.isArray(parsed.sections) ? parsed.sections : [],
      };
    }
  } catch {
    // Gracefully handle malformed or non-JSON payloads
  }

  return null;
}

/**
 * Decodes a portable Offline Quiz Code or URL parameter into full quiz data.
 * Safe for both browser and Node.js / unit testing environments.
 */
export function decodeQuizData(
  codeOrParam: string
): { config: QuizConfig; questions: Question[]; sections: QuizSection[] } | null {
  if (!codeOrParam || typeof codeOrParam !== 'string') return null;

  try {
    let jsonStr: string | null = null;

    if (codeOrParam.startsWith('AQZ_')) {
      const base64Data = codeOrParam.slice(4);
      jsonStr = LZString.decompressFromBase64(base64Data);
    } else if (codeOrParam.includes('qdata=')) {
      const origin = typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'http://localhost';
      const url = codeOrParam.startsWith('http://') || codeOrParam.startsWith('https://')
        ? new URL(codeOrParam)
        : new URL(codeOrParam, origin);
      const qdata = url.searchParams.get('qdata');
      if (qdata) {
        jsonStr = LZString.decompressFromEncodedURIComponent(qdata);
      }
    } else {
      // Try direct URI decompression
      jsonStr = LZString.decompressFromEncodedURIComponent(codeOrParam);
      if (!jsonStr) {
        // Try base64
        jsonStr = LZString.decompressFromBase64(codeOrParam);
      }
      if (!jsonStr && (codeOrParam.startsWith('{') || codeOrParam.startsWith('['))) {
        jsonStr = codeOrParam;
      }
    }

    if (jsonStr) {
      return parseQuizPackage(jsonStr);
    }
  } catch (err) {
    console.warn('Could not decode quiz payload:', err);
  }

  return null;
}

/**
 * Validates and normalizes a decoded Question according to the defined schema,
 * ensuring questionText, options, and explanation properly preserve mathematical LaTeX equations.
 */
export function validateQuestionSchema(q: unknown): Question | null {
  if (!q || typeof q !== 'object') return null;
  const item = q as Partial<Question>;
  if (
    typeof item.id !== 'number' ||
    typeof item.questionText !== 'string' ||
    !Array.isArray(item.options) ||
    typeof item.correctAnswer !== 'string'
  ) {
    return null;
  }

  // Validate MCQ options have valid id and text
  const validOptions = item.options.every(
    (opt) => opt && (opt.id === 'A' || opt.id === 'B' || opt.id === 'C' || opt.id === 'D') && typeof opt.text === 'string'
  );
  if (!validOptions) return null;

  return {
    id: item.id,
    quizId: item.quizId,
    quizCode: item.quizCode,
    sectionId: typeof item.sectionId === 'number' ? item.sectionId : 1,
    sectionName: typeof item.sectionName === 'string' ? item.sectionName : 'General',
    topic: item.topic || 'General Mathematics',
    questionText: item.questionText,
    options: item.options,
    correctAnswer: item.correctAnswer as 'A' | 'B' | 'C' | 'D',
    officialKeyNote: item.officialKeyNote,
    explanation: typeof item.explanation === 'string' ? item.explanation : '',
    marks: typeof item.marks === 'number' ? item.marks : 1,
    imageUrl: item.imageUrl,
  };
}

/**
 * Utility to extract and verify mathematical equations (LaTeX expressions) found in text fields.
 * Detects inline ($...$, \(...\)) and block ($$...$$, \[...\], \begin{...}...\end{...}) math equations.
 */
export function extractMathEquations(text: string): {
  hasEquations: boolean;
  inline: string[];
  block: string[];
} {
  if (!text || typeof text !== 'string') {
    return { hasEquations: false, inline: [], block: [] };
  }

  const blockMatches: string[] = [];
  const inlineMatches: string[] = [];

  // Match block LaTeX: $$...$$, \[...\], \begin{matrix/pmatrix/align/etc}...\end{...}
  const blockRegex = /\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]|(\\begin\{(?:matrix|pmatrix|bmatrix|vmatrix|Vmatrix|align|aligned|equation|gather)\}[\s\S]*?\\end\{(?:matrix|pmatrix|bmatrix|vmatrix|Vmatrix|align|aligned|equation|gather)\})/g;
  let match: RegExpExecArray | null;
  let cleanedText = text;

  while ((match = blockRegex.exec(text)) !== null) {
    blockMatches.push((match[1] ?? match[2] ?? match[3] ?? match[0]).trim());
  }

  // Remove blocks before finding inline to avoid double-matching
  cleanedText = cleanedText.replace(blockRegex, ' ');

  // Match inline LaTeX: $...$ or \(...\)
  const inlineRegex = /\$([^$\n]+?)\$|\\\(([\s\S]*?)\\\)/g;
  while ((match = inlineRegex.exec(cleanedText)) !== null) {
    inlineMatches.push((match[1] ?? match[2]).trim());
  }

  return {
    hasEquations: blockMatches.length > 0 || inlineMatches.length > 0,
    inline: inlineMatches,
    block: blockMatches,
  };
}

/**
 * Saves a decoded quiz to browser local storage so it remains permanently available offline
 */
export function cacheQuizOffline(
  config: QuizConfig,
  questions: Question[],
  sections: QuizSection[]
): void {
  try {
    // 1. Always persist to IndexedDB (lossless, virtually unlimited storage)
    saveQuizToOfflineStorage(config, questions, sections).catch((err) =>
      console.warn('[QuizCompression] IndexedDB backup warning:', err)
    );

    // 2. Safely store in localStorage only if compact
    const key = `joy_cached_quiz_${config.code || config.id || 'default'}`;
    const pkg: SelfContainedQuizPackage = {
      v: 1,
      config,
      questions,
      sections,
    };
    const serialized = JSON.stringify(pkg);
    if (serialized.length < 60000) {
      safeSetItem(key, serialized);
    }

    // Also update offline quiz registry index (strip bulky question arrays)
    const listRaw = localStorage.getItem('joy_offline_quizzes_index');
    const list: QuizConfig[] = listRaw ? JSON.parse(listRaw) : [];
    const { questions: _, ...lightweightConfig } = config;
    const updatedList = [
      { ...lightweightConfig, totalQuestions: questions.length || config.totalQuestions || 0 },
      ...list.filter((q) => q.id !== config.id && q.code !== config.code)
    ];
    safeSetItem('joy_offline_quizzes_index', JSON.stringify(updatedList.slice(0, 30)));
  } catch (err) {
    console.error('Error caching quiz offline:', err);
  }
}

/**
 * Retrieves a locally cached offline quiz by id or code
 */
export function getCachedOfflineQuiz(
  idOrCode: string
): { config: QuizConfig; questions: Question[]; sections: QuizSection[] } | null {
  if (!idOrCode) return null;
  try {
    const directKey = `joy_cached_quiz_${idOrCode}`;
    const item = localStorage.getItem(directKey);
    if (item) {
      const parsed = JSON.parse(item);
      if (parsed && parsed.config) {
        return parsed;
      }
    }

    // Try finding in index
    const index = getOfflineQuizzesIndex();
    const found = index.find(
      (q) =>
        (q.code && q.code.toUpperCase() === idOrCode.toUpperCase()) ||
        (q.id && q.id.toUpperCase() === idOrCode.toUpperCase())
    );
    if (found) {
      const secondaryKey = `joy_cached_quiz_${found.code || found.id}`;
      const secondaryItem = localStorage.getItem(secondaryKey);
      if (secondaryItem) {
        return JSON.parse(secondaryItem);
      }
      return { config: found, questions: found.questions || [], sections: found.sections || [] };
    }
  } catch (err) {
    console.warn('Error reading cached quiz:', err);
  }
  return null;
}

/**
 * Retrieves all locally cached offline quizzes
 */
export function getOfflineQuizzesIndex(): QuizConfig[] {
  try {
    const listRaw = localStorage.getItem('joy_offline_quizzes_index');
    return listRaw ? JSON.parse(listRaw) : [];
  } catch {
    return [];
  }
}
