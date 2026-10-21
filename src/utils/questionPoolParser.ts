import * as XLSX from 'xlsx';
import { Question, MCQOption, QuizSection } from '../types';

export interface QuestionPoolParseResult {
  success: boolean;
  questions: Question[];
  sections: QuizSection[];
  totalParsed: number;
  validCount: number;
  errors: string[];
  warnings: string[];
}

/**
 * Normalizes text for header detection
 */
function normalizeHeader(header: any): string {
  return String(header || '')
    .toLowerCase()
    .trim()
    .replace(/[_\-\s]+/g, ' ');
}

// Aliases for header mapping
const QUESTION_TEXT_ALIASES = [
  'question',
  'question text',
  'questions',
  'item',
  'problem',
  'stem',
  'prompt',
  'q text',
  'q',
  'question title',
  'text'
];

const OPTION_A_ALIASES = ['option a', 'opt a', 'choice a', 'a', 'answer a', 'option 1', 'choice 1'];
const OPTION_B_ALIASES = ['option b', 'opt b', 'choice b', 'b', 'answer b', 'option 2', 'choice 2'];
const OPTION_C_ALIASES = ['option c', 'opt c', 'choice c', 'c', 'answer c', 'option 3', 'choice 3'];
const OPTION_D_ALIASES = ['option d', 'opt d', 'choice d', 'd', 'answer d', 'option 4', 'choice 4'];

const CORRECT_ANSWER_ALIASES = [
  'correct answer',
  'correct',
  'key',
  'correct option',
  'answer',
  'ans',
  'correct ans',
  'correct key',
  'solution'
];

const SECTION_ALIASES = [
  'section',
  'topic',
  'category',
  'strand',
  'sub strand',
  'unit',
  'module',
  'domain',
  'chapter',
  'subject topic'
];

const MARKS_ALIASES = ['marks', 'mark', 'points', 'point', 'score', 'weight'];
const EXPLANATION_ALIASES = ['explanation', 'rationale', 'solution explanation', 'reason', 'feedback', 'notes'];

function findColumnIndex(headers: string[], aliases: string[]): number {
  return headers.findIndex((h) => {
    const clean = normalizeHeader(h);
    return aliases.some((alias) => clean === alias || clean.startsWith(`${alias} `) || clean.endsWith(` ${alias}`));
  });
}

function normalizeCorrectOption(val: any, options: { id: string; text: string }[]): 'A' | 'B' | 'C' | 'D' {
  const str = String(val || '').trim().toUpperCase();
  if (['A', 'B', 'C', 'D'].includes(str)) {
    return str as 'A' | 'B' | 'C' | 'D';
  }
  if (str.startsWith('OPTION ') || str.startsWith('CHOICE ')) {
    const char = str.replace(/OPTION |CHOICE /g, '').trim().charAt(0);
    if (['A', 'B', 'C', 'D'].includes(char)) return char as any;
  }
  if (['1', '2', '3', '4'].includes(str)) {
    const map: Record<string, 'A' | 'B' | 'C' | 'D'> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
    return map[str];
  }
  // Try matching against option text
  const cleanVal = String(val || '').trim().toLowerCase();
  const matched = options.find((opt) => opt.text.trim().toLowerCase() === cleanVal);
  if (matched && ['A', 'B', 'C', 'D'].includes(matched.id)) {
    return matched.id as 'A' | 'B' | 'C' | 'D';
  }
  return 'A'; // fallback
}

/**
 * Parses an Excel or CSV file containing a large Question Bank (100 to 1,000+ questions)
 */
export async function parseQuestionPoolSpreadsheet(file: File): Promise<QuestionPoolParseResult> {
  const result: QuestionPoolParseResult = {
    success: false,
    questions: [],
    sections: [],
    totalParsed: 0,
    validCount: 0,
    errors: [],
    warnings: []
  };

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      result.errors.push('The uploaded workbook contains no sheets.');
      return result;
    }

    // Inspect all sheets and pick the sheet with the most valid tabular rows
    let bestSheetName = workbook.SheetNames[0];
    let maxRows = 0;
    let selectedRawData: any[][] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, blankrows: false });
      if (rawData.length > maxRows) {
        maxRows = rawData.length;
        bestSheetName = sheetName;
        selectedRawData = rawData;
      }
    }

    if (selectedRawData.length < 2) {
      result.errors.push(`Sheet "${bestSheetName}" does not contain enough data (at least 1 header row and 1 question required).`);
      return result;
    }

    // Header Detection: Find the row containing "question" or "option"
    let headerRowIndex = 0;
    let headerCandidates = selectedRawData[0].map(h => String(h || ''));

    for (let r = 0; r < Math.min(selectedRawData.length, 10); r++) {
      const row = selectedRawData[r].map(c => String(c || ''));
      const hasQ = findColumnIndex(row, QUESTION_TEXT_ALIASES) !== -1;
      const hasOpt = findColumnIndex(row, OPTION_A_ALIASES) !== -1 || findColumnIndex(row, CORRECT_ANSWER_ALIASES) !== -1;
      if (hasQ || hasOpt) {
        headerRowIndex = r;
        headerCandidates = row;
        break;
      }
    }

    const qCol = findColumnIndex(headerCandidates, QUESTION_TEXT_ALIASES);
    const optACol = findColumnIndex(headerCandidates, OPTION_A_ALIASES);
    const optBCol = findColumnIndex(headerCandidates, OPTION_B_ALIASES);
    const optCCol = findColumnIndex(headerCandidates, OPTION_C_ALIASES);
    const optDCol = findColumnIndex(headerCandidates, OPTION_D_ALIASES);
    const ansCol = findColumnIndex(headerCandidates, CORRECT_ANSWER_ALIASES);
    const secCol = findColumnIndex(headerCandidates, SECTION_ALIASES);
    const marksCol = findColumnIndex(headerCandidates, MARKS_ALIASES);
    const expCol = findColumnIndex(headerCandidates, EXPLANATION_ALIASES);

    if (qCol === -1) {
      result.errors.push(
        `Could not identify the "Question" column in sheet "${bestSheetName}". Please ensure one column header is named "Question" or "Problem".`
      );
      return result;
    }

    const dataRows = selectedRawData.slice(headerRowIndex + 1);
    result.totalParsed = dataRows.length;

    const parsedQuestions: Question[] = [];
    const sectionNames = new Set<string>();

    dataRows.forEach((row, idx) => {
      const rowNum = headerRowIndex + idx + 2;
      const questionText = String(row[qCol] || '').trim();

      if (!questionText) {
        // Skip empty row silently
        return;
      }

      // Extract Options
      const optAText = optACol !== -1 ? String(row[optACol] || '').trim() : '';
      const optBText = optBCol !== -1 ? String(row[optBCol] || '').trim() : '';
      const optCText = optCCol !== -1 ? String(row[optCCol] || '').trim() : '';
      const optDText = optDCol !== -1 ? String(row[optDCol] || '').trim() : '';

      const options: MCQOption[] = [
        { id: 'A', text: optAText || 'Option A' },
        { id: 'B', text: optBText || 'Option B' },
        { id: 'C', text: optCText || 'Option C' },
        { id: 'D', text: optDText || 'Option D' },
      ];

      // Validate at least options A and B exist
      if (!optAText && !optBText) {
        result.warnings.push(`Row ${rowNum}: Question "${questionText.slice(0, 30)}..." has no option text provided.`);
      }

      const rawAns = ansCol !== -1 ? row[ansCol] : 'A';
      const correctOption = normalizeCorrectOption(rawAns, options);

      const sectionName = secCol !== -1 && row[secCol] ? String(row[secCol]).trim() : '';
      if (sectionName) {
        sectionNames.add(sectionName);
      }

      const marksVal = marksCol !== -1 && !isNaN(Number(row[marksCol])) ? Number(row[marksCol]) : 1;
      const explanation = expCol !== -1 && row[expCol] ? String(row[expCol]).trim() : undefined;

      const sectionList = Array.from(sectionNames);
      const sectionIndex = sectionName ? sectionList.indexOf(sectionName) : -1;
      const sId = sectionIndex >= 0 ? sectionIndex + 1 : 1;
      const sName = sectionName || 'General Mathematics';

      parsedQuestions.push({
        id: parsedQuestions.length + 1,
        sectionId: sId,
        sectionName: sName,
        topic: sName as any,
        questionText: questionText,
        options,
        correctAnswer: correctOption,
        marks: marksVal > 0 ? marksVal : 1,
        explanation: explanation || ''
      });
    });

    if (parsedQuestions.length === 0) {
      result.errors.push('No valid question rows were found in the uploaded file.');
      return result;
    }

    // Build QuizSection array if sections exist
    const sections: QuizSection[] = Array.from(sectionNames).map((secName, sIdx) => {
      const count = parsedQuestions.filter(q => q.sectionName === secName).length;
      return {
        id: sIdx + 1,
        title: secName,
        description: `Section ${sIdx + 1}: ${secName}`,
        questionRange: [1, Math.max(1, count)] as [number, number],
        timeAllocationMinutes: 30,
        status: 'released' as const
      };
    });

    result.success = true;
    result.questions = parsedQuestions;
    result.sections = sections;
    result.validCount = parsedQuestions.length;

    return result;
  } catch (err: any) {
    console.error('Error parsing question pool spreadsheet:', err);
    result.errors.push(`File parsing failed: ${err.message || 'Unknown spreadsheet error'}`);
    return result;
  }
}

/**
 * Downloads a pre-formatted, production-ready Excel template for 500+ Question Banks
 */
export function generateQuestionPoolExcelTemplate(bankTitle?: string): void {
  const workbook = XLSX.utils.book_new();

  const sampleRows = [
    {
      'Question Number': 1,
      'Question Text': 'Solve for x: 3x + 15 = 45',
      'Option A': 'x = 5',
      'Option B': 'x = 10',
      'Option C': 'x = 15',
      'Option D': 'x = 20',
      'Correct Answer': 'B',
      'Section / Topic': 'Algebra',
      'Marks': 1,
      'Explanation': 'Subtract 15 from both sides to get 3x = 30, then divide by 3 to get x = 10.'
    },
    {
      'Question Number': 2,
      'Question Text': 'What is the sum of interior angles in a hexagon?',
      'Option A': '360°',
      'Option B': '540°',
      'Option C': '720°',
      'Option D': '900°',
      'Correct Answer': 'C',
      'Section / Topic': 'Geometry',
      'Marks': 1,
      'Explanation': 'The formula is (n - 2) × 180°. For n = 6: (6 - 2) × 180° = 720°.'
    },
    {
      'Question Number': 3,
      'Question Text': 'If f(x) = 4x² - 3x + 7, find the derivative f\'(x).',
      'Option A': '8x - 3',
      'Option B': '4x - 3',
      'Option C': '8x + 7',
      'Option D': '2x - 3',
      'Correct Answer': 'A',
      'Section / Topic': 'Calculus',
      'Marks': 1,
      'Explanation': 'Differentiating 4x² gives 8x, -3x gives -3, and constant 7 gives 0.'
    },
    {
      'Question Number': 4,
      'Question Text': 'Calculate the mean of the numbers: 12, 16, 20, 24, 28.',
      'Option A': '18',
      'Option B': '20',
      'Option C': '22',
      'Option D': '24',
      'Correct Answer': 'B',
      'Section / Topic': 'Statistics',
      'Marks': 1,
      'Explanation': 'Sum = 100. Divided by 5 = 20.'
    },
    {
      'Question Number': 5,
      'Question Text': 'Evaluate: sin(30°) + cos(60°)',
      'Option A': '0.5',
      'Option B': '1.0',
      'Option C': '1.5',
      'Option D': '2.0',
      'Correct Answer': 'B',
      'Section / Topic': 'Trigonometry',
      'Marks': 1,
      'Explanation': 'sin(30°) = 0.5, cos(60°) = 0.5. Sum = 1.0.'
    }
  ];

  const mainSheet = XLSX.utils.json_to_sheet(sampleRows);

  mainSheet['!cols'] = [
    { wch: 16 }, // Question Number
    { wch: 45 }, // Question Text
    { wch: 22 }, // Option A
    { wch: 22 }, // Option B
    { wch: 22 }, // Option C
    { wch: 22 }, // Option D
    { wch: 16 }, // Correct Answer
    { wch: 20 }, // Section / Topic
    { wch: 10 }, // Marks
    { wch: 40 }  // Explanation
  ];

  XLSX.utils.sheet_add_aoa(mainSheet, [[], ['The joy of the Lord is my strength']], { origin: -1 });
  XLSX.utils.book_append_sheet(workbook, mainSheet, 'Question Bank (500+ Items)');

  // Guidelines Sheet
  const guidelineRows = [
    { 'Guideline & Rule': 'Capacity', 'Details': 'You can paste 100, 500, or 1,000+ question rows in this sheet.' },
    { 'Guideline & Rule': 'Required Columns', 'Details': '"Question Text", "Option A", "Option B", "Option C", "Option D", and "Correct Answer".' },
    { 'Guideline & Rule': 'Correct Answer Format', 'Details': 'Must be A, B, C, or D (case-insensitive).' },
    { 'Guideline & Rule': 'Section / Topic (Optional)', 'Details': 'Allows topic-balanced draws (e.g. 10 Algebra + 10 Geometry + 10 Calculus).' },
    { 'Guideline & Rule': 'Custom Spreadsheets', 'Details': 'You are not restricted to this exact template. Our system auto-detects column headers in any order.' }
  ];

  const guideSheet = XLSX.utils.json_to_sheet(guidelineRows);
  guideSheet['!cols'] = [{ wch: 25 }, { wch: 70 }];
  XLSX.utils.sheet_add_aoa(guideSheet, [[], ['The joy of the Lord is my strength']], { origin: -1 });
  XLSX.utils.book_append_sheet(workbook, guideSheet, 'Upload Guidelines');

  const safeTitle = (bankTitle || 'Question_Bank_500_Template').replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(workbook, `${safeTitle}.xlsx`);
}

/**
 * Seeded 32-bit PRNG (Mulberry32) for deterministic, reproducible question selection
 */
function createPrng(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Simple string hash to generate a numeric seed
 */
function hashStringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash) || 1337;
}

/**
 * Deterministically draws a quota of questions from a master pool for a specific student.
 * Guarantees that refreshing or reconnecting with the same studentKey yields the exact same questions.
 */
export function selectDeterministicPoolQuestions(
  masterPool: Question[],
  quotaToServe: number,
  studentKey: string,
  strategy: 'random' | 'balanced_sections' = 'random'
): Question[] {
  if (!masterPool || masterPool.length === 0) return [];
  if (masterPool.length <= quotaToServe) return [...masterPool];

  const seed = hashStringToSeed(studentKey || 'default-candidate');
  const prng = createPrng(seed);

  // Strategy: Balanced Sections if sections exist and requested
  if (strategy === 'balanced_sections') {
    const sectionMap = new Map<string, Question[]>();
    masterPool.forEach((q) => {
      const topic = q.topic || 'General';
      if (!sectionMap.has(topic)) sectionMap.set(topic, []);
      sectionMap.get(topic)!.push(q);
    });

    const topics = Array.from(sectionMap.keys());
    if (topics.length > 1) {
      const selectedQuestions: Question[] = [];
      const perTopicQuota = Math.floor(quotaToServe / topics.length);
      let remainder = quotaToServe % topics.length;

      topics.forEach((topic) => {
        const topicPool = [...sectionMap.get(topic)!];
        // Seeded shuffle of topic pool
        for (let i = topicPool.length - 1; i > 0; i--) {
          const j = Math.floor(prng() * (i + 1));
          [topicPool[i], topicPool[j]] = [topicPool[j], topicPool[i]];
        }
        const takeCount = perTopicQuota + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;
        selectedQuestions.push(...topicPool.slice(0, takeCount));
      });

      // Renumber 1..quota
      return selectedQuestions.map((q, idx) => ({
        ...q,
        questionNumber: idx + 1
      }));
    }
  }

  // Strategy: Pure Uniform Random Selection (Fisher-Yates with seeded PRNG)
  const poolCopy = [...masterPool];
  for (let i = poolCopy.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [poolCopy[i], poolCopy[j]] = [poolCopy[j], poolCopy[i]];
  }

  const selected = poolCopy.slice(0, quotaToServe);

  // Return renumbered 1..quotaToServe
  return selected.map((q, idx) => ({
    ...q,
    questionNumber: idx + 1
  }));
}
