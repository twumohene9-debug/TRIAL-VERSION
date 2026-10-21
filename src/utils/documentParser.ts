import { ExtractedQuestion, QuestionTopic } from '../types';
import { formatMathTextToLatex, isInstructionOrPreambleText, isPureMathString, normalizeUnicodeMath } from './mathDetector';

export interface ParseAssessmentResult {
  questions: ExtractedQuestion[];
  ignoredInstructionsCount: number;
  extractionNote: string;
  detectedTitle?: string;
}

/**
 * Converts tab-separated or space-aligned table rows (such as binary operation tables) into Markdown tables.
 */
export function convertTabularTextToMarkdown(text: string): string {
  if (!text) return '';
  const lines = text.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    // Check if line is already part of a markdown table
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      result.push(line);
      i++;
      continue;
    }

    const hasTab = line.includes('\t');
    const tabParts = line.split('\t').map((c) => c.trim()).filter(Boolean);
    const spaceParts = line.trim().split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);

    const isTabRow = hasTab && tabParts.length >= 2;
    const isSpaceRow = !hasTab && spaceParts.length >= 3 && /^[⊕\*\+\-⊗⊙a-zA-Z0-9\$\\\s\.\-]+$/.test(line.trim());

    if (isTabRow || isSpaceRow) {
      const tableRows: string[][] = [];
      const useTabs = isTabRow;

      while (i < lines.length) {
        const curLine = lines[i];
        if (!curLine.trim()) break;

        const cells = useTabs
          ? curLine.split('\t').map((c) => c.trim())
          : curLine.trim().split(/\s{2,}/).map((c) => c.trim());

        if (cells.filter(Boolean).length < 2) break;
        tableRows.push(cells.filter(Boolean));
        i++;
      }

      if (tableRows.length >= 2) {
        const maxCols = Math.max(...tableRows.map((r) => r.length));
        tableRows.forEach((row, rIdx) => {
          const cleanRow = [...row];
          while (cleanRow.length < maxCols) cleanRow.push(' ');
          result.push('| ' + cleanRow.map((c) => (c || ' ').replace(/\|/g, '\\|')).join(' | ') + ' |');
          if (rIdx === 0) {
            result.push('| ' + cleanRow.map(() => '---').join(' | ') + ' |');
          }
        });
        continue;
      } else {
        // Not enough rows for a multi-row table, put back
        tableRows.forEach((r) => result.push(r.join(' ')));
        continue;
      }
    }

    result.push(line);
    i++;
  }

  return result.join('\n');
}

/**
 * Normalizes text lines and cleans non-printable characters, Word XML remnants, and Windows line-endings.
 */
export function sanitizeRawText(raw: string): string {
  if (!raw) return '';
  const cleaned = raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\x0B\x0C]/g, '\n\n') // Convert vertical tabs and form feeds (page breaks) to double newlines to prevent gluing questions across pages
    .replace(/[\x00-\x08\x0E-\x1F\x7F-\x9F]/g, '')
    .replace(/(PK\x03\x04|\[Content_Types\]|\bword\/fontTable\.xml\b)/gi, '')
    .replace(/\u00A0/g, ' ') // Non-breaking spaces
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .trim();

  return convertTabularTextToMarkdown(cleaned);
}

/**
 * Ensures embedded question boundaries (e.g. "D. 12 492. What is..." or "492 What is..." or "...end of stem. Question 492: ...")
 * are always preceded by explicit double line breaks, preventing subsequent questions from being swallowed into previous option blocks.
 */
export function normalizeQuestionBoundaries(text: string): string {
  if (!text) return '';

  let normalized = text;

  // 0. Flatten any leaked markdown table rows that contain question stems or option markers
  // Handles single-cell question rows, multi-cell question rows, and multi-cell option grids
  normalized = normalized.replace(/(?:^|\n)\|[ \t]*([^\n]+)\|[ \t]*(?=\r?\n|$)/g, (fullLine, inner) => {
    // If table separator line e.g. |---|---| preserve it intact
    if (/^[\-:\s|]+$/.test(inner)) {
      return fullLine;
    }

    const cells = inner.split('|').map((c: string) => c.trim()).filter(Boolean);
    if (cells.length === 0) return '\n';

    // Check if any cell has a question number
    const hasQ = cells.some((c: string) =>
      /^(?:(?:SECTION|PART|TOPIC)\s*[^:\n]+[:\-\s]*)?(?:(?:Question|Q\.?|Problem|Item|Task|No\.?|Number)\s*)?[1-9]\d{0,3}[\.\:\)\s\-]/i.test(c)
    );

    // Check if cells have option markers
    const hasOpt = cells.some((c: string) =>
      /^(?:Option\s+)?[A-E][\.\)\:\-]|\([A-E]\)|\[[A-E]\]/i.test(c)
    );

    if (hasQ) {
      if (/^(?:(?:SECTION|PART|TOPIC)\s*[^:\n]+[:\-\s]*)?(?:(?:Question|Q\.?|Problem|Item|Task|No\.?|Number)\s*)?[1-9]\d{0,3}[\.\:\)\s\-]/i.test(cells[0])) {
        const optCells = cells.slice(1).filter((c: string) => /^(?:Option\s+)?[A-E][\.\)\:\-]|\([A-E]\)|\[[A-E]\]/i.test(c));
        if (optCells.length > 0) {
          const nonOptCells = cells.slice(1).filter((c: string) => !/^(?:Option\s+)?[A-E][\.\)\:\-]|\([A-E]\)|\[[A-E]\]/i.test(c));
          const stem = [cells[0], ...nonOptCells].join(' ');
          return `\n\n${stem}\n${optCells.join('\n')}\n`;
        }
        return `\n\n${cells.join(' ')}\n`;
      }
    }

    if (hasOpt) {
      return `\n${cells.join('\n')}\n`;
    }

    // Standard data table row - preserve
    return fullLine;
  });

  // 1. Separate questions attached after options or answer keys without newlines
  // CRITICAL: Must NEVER split inside parenthesized expressions or ordered pair coordinates like "(5, 3)" or "(0, 1)"
  normalized = normalized.replace(
    /(\b[A-E][\.\)\:\-][ \t]+[^\n\r]+?|(?:Answer|Ans|Key|Correct Answer)[\:\s]+(?:\([A-E]\)|\[[A-E]\]|\b[A-E]\b)[^\n\r]*?|\?[ \t]+(?=(?:Question|Q\.?|Problem|Item)\s*[1-9]\d{0,3}))[ \t]+(?=(?:(?:Question|Q\.?|Problem|Item|Task|No\.?|Number)\s*[1-9]\d{0,3}[\.\:\)\s\-]?|\([1-9]\d{0,3}\)\s*|\[[1-9]\d{0,3}\]\s*|\b[1-9]\d{0,3}\s*[\.\:\)](?!\d)\s+[A-Za-z0-9\$\\\(\"\'\—\–]|\b[1-9]\d{0,3}[ \t]+(?:What|Which|Find|Calculate|Evaluate|Simplify|Determine|Solve|How|If\b|Given\b|Consider\b|Express\b|Identify\b|State\b|Show\b|Define\b|Differentiate\b|Integrate\b|Factorize\b|Expand\b)\b))/gi,
    (match, p1) => {
      // If p1 contains an unclosed parenthesis e.g. "A. (5,", do NOT split!
      const openCount = (p1.match(/\(/g) || []).length;
      const closeCount = (p1.match(/\)/g) || []).length;
      if (openCount > closeCount) return match;
      return p1 + '\n\n';
    }
  );

  // 2. Separate question numbers starting at the beginning of lines without punctuation e.g. "492 What is the..." -> "492. What is the..."
  normalized = normalized.replace(
    /(?:^|\n)[ \t]*([1-9]\d{0,3})[ \t]+(?=(?:What|Which|Find|Calculate|Evaluate|Simplify|Determine|Solve|How|If\b|Given\b|Consider\b|Express\b|Identify\b|State\b|Show\b|Define\b|Differentiate\b|Integrate\b|Factorize\b|Expand\b)\b)/gi,
    '\n$1. '
  );

  return normalized;
}

/**
 * Pre-processes text to ensure option markers (A., B., C., D., E. or (A), [A], etc.)
 * have whitespace/linebreaks before them when glued to previous prose or equations.
 * For example:
 * "human body?A. LungsB. HeartC. KidneyD. Stomach" ->
 * "human body? \nA. Lungs \nB. Heart \nC. Kidney \nD. Stomach"
 */
export function normalizeOptionSpacing(text: string): string {
  if (!text) return '';

  // Auto-repair any previously corrupted option delimiter periods inside set/probability expressions
  let repaired = text.replace(
    /(\(\s*[a-zA-Z0-9\s\\_^{}]*(?:\\cap|\\cup|∩|∪)[a-zA-Z0-9\s\\_^{}]*)\.(?=\s*[?=:,\)\$]|\s+what|\s+find|\s*$)/gi,
    '$1)'
  );
  repaired = repaired.replace(
    /\b(P|Pr|n)\s*\(\s*([a-zA-Z0-9\s\\_^{}]*(?:\\cap|\\cup|∩|∪)[a-zA-Z0-9\s\\_^{}]*?)\.(?=\s*[?=:,\)\$]|\s+what|\s+find|\s*$)/gi,
    '$1($2)'
  );

  // Mask math expressions ($...$ and $$...$$) and parenthesized math functions (P(...), n(...), f(...)) to protect formulas
  const mathPlaceholders: string[] = [];
  let masked = repaired.replace(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g, (match) => {
    mathPlaceholders.push(match);
    return `___MATH_BLOCK_${mathPlaceholders.length - 1}___`;
  });

  // Also protect mathematical function calls like P(A), P(A \cap B), n(A), n(A \cup B), f(x)
  masked = masked.replace(/\b(P|Pr|n|f|g|h|sin|cos|tan|log|ln)\s*\([^)]+\)/g, (match) => {
    mathPlaceholders.push(match);
    return `___MATH_BLOCK_${mathPlaceholders.length - 1}___`;
  });

  // 1. Insert space before option marker attached right after question marks, colons, or punctuation
  masked = masked.replace(/([?.:;!,])(?=(?:[A-E][\.\)\:\-]|[\(\[][A-E][\)\]]|Option\s+[A-E][\:\.\-]))/g, '$1 \n');

  // 2. Insert space before option markers attached after words (>= 2 letters) or numbers e.g. "LungsB." -> "Lungs \nB." or "0.12B." -> "0.12 \nB."
  // CRITICAL: Must be strictly uppercase [A-E] (case-sensitive) so English words ending in 'e.', 'a.', 'd.', etc. (e.g. "true.", "false.", "value.", "line.", "third.") are NEVER broken
  masked = masked.replace(/([a-zA-Z]{2,}|\d+(?:\.\d+)?)([A-E][\.\:\-])(?=\s|[$\\\-\(\[\{0-9])/g, '$1 \n$2');

  // 3. Ensure options like "A . " or "A - " at the start of a line normalize to "A. " (never touching middle-of-line parentheses)
  masked = masked.replace(/(?:^|\n)\s*([A-E])\s*[\.\-]\s+/g, '\n$1. ');

  // Restore math expressions
  return masked.replace(/___MATH_BLOCK_(\d+)___/g, (_, idx) => mathPlaceholders[parseInt(idx, 10)] || '');
}

/**
 * Checks if a given text line or block is purely an instruction, disclaimer, or exam regulation header.
 */
export function isInstructionOrPreambleLine(line: string): boolean {
  if (!line) return false;
  const trimmed = line.trim();
  if (!trimmed) return false;

  // If the line is an option (e.g. A. ... or B) ...), it is NOT an instruction
  if (/^[A-E][\.\)\:\-\s]/i.test(trimmed) || /^\([A-E]\)/i.test(trimmed) || /^\[[A-E]\]/i.test(trimmed)) {
    return false;
  }

  // Check against the unified mathematical/document instruction checker
  if (isInstructionOrPreambleText(trimmed)) {
    return true;
  }

  // Strip leading question/item numbers or bullets (e.g. "4. ", "1. ", "(4) ", "- ", "• ") to inspect the actual semantic content
  const cleaned = trimmed
    .replace(/^(?:(?:SECTION|PART)\s*[^:\n]+[:\-\s]*)?(?:Question|Q\.?|Problem|Item|Task|No\.?|Number)\s*\d+[\.\:\)\-\s\t]*/i, '')
    .replace(/^\(?\d+\)?\s*[\.\)\:\-\—\–\t/]\s*/i, '')
    .replace(/^[\-•*]\s*/, '')
    .trim();

  const lower = cleaned.toLowerCase();
  if (!lower) return false;

  // If the line explicitly begins with an instruction prefix, it's an instruction
  if (/^(?:instructions?|directions?|regulations?|general\s+instructions?|time\s+allowed|duration|total\s+marks?)\b/i.test(cleaned)) {
    return true;
  }

  // If the line contains mathematical symbols or problem keywords, it is NOT an exam regulation header
  if (
    /[=<>≤≥≠≈±√∫∑⊕⊗⊙⊖]|\b(?:solve|evaluate|calculate|simplify|determine|find\s+the\s+value|which\s+of\s+the\s+following|statement\s+is\s+true|statements?\s+about)\b/i.test(
      lower
    )
  ) {
    return false;
  }

  // If it ends with or contains a question mark without being an explicit instruction, it's a question
  if (lower.includes('?') && !/(?:answer|attempt|instructions?|directions?|regulations?|each\s+question)\b/i.test(lower)) {
    return false;
  }

  // Comprehensive list of examination instruction and regulation phrases
  const instructionPhrases = [
    'instructions to candidates',
    'general instructions',
    'time allowed',
    'time limit',
    'duration:',
    'candidates are advised',
    'candidates must not',
    'answer all questions',
    'answer all the questions',
    'answer all questions in this section',
    'each question is followed by four options',
    'four options are given',
    'in each of the following questions',
    'four options lettered a to d',
    'options lettered a to d',
    'options lettered a through d',
    'all questions carry equal marks',
    'each question carries equal marks',
    'carries equal marks',
    'carry equal marks',
    'equal marks',
    'each question carries',
    'find the correct option for each question',
    'give only one answer to each question',
    'do not turn over this page until told to do so',
    'do not turn over this page',
    'do not turn over',
    'do not open this booklet until you are told to do so',
    'do not open this booklet',
    'do not start until you are told',
    'stop! do not',
    'shade the oval',
    'hb pencil only',
    '2b pencil only',
    'use 2b pencil',
    'use hb pencil to shade your answers',
    'use hb pencil',
    'rough work may be done',
    'do not write in this margin',
    'maximum marks:',
    'total marks:',
    'calculators are permitted',
    'calculators are not permitted',
    'calculators should not be used',
    'electronic calculators are',
    'important disclaimer',
    'teacher must:',
    'redistribute the answer choices',
    'double-check all answer keys',
    'ensure answer choices are randomized',
    'multiple choice questions - 1 hour',
    'section a instructions',
    'section b instructions',
    'index number:',
    'centre number:',
    'center number:',
    'candidate name:',
    'candidate number:',
    'signature:',
    'date of examination:',
    'work as quickly and as carefully as you can',
    'if you want to change your answer',
    'erase the old mark completely',
    'an answer booklet is provided',
    'question booklet for',
    'test booklet series',
    'there are fifty questions in this paper',
    'there are 50 questions in this paper',
    'there are forty questions in this paper',
    'there are 40 questions in this paper',
    'this paper consists of',
    'this paper contains',
    'all rough work must be done',
    'diagram not drawn to scale',
    'all diagrams are not drawn to scale',
    'mathematical tables may be used in any question',
    'mathematical tables may be used',
    'mathematical tables',
    'four-figure tables',
    'four figure tables',
    '4-figure tables',
    'tables may be used',
    'may be used in any question',
    'all mathematical expressions are in',
    'all mathematical expressions',
    'standardised latex',
    'standardized latex',
    'katex notation',
    'latex/katex notation',
    'year 1 additional mathematics',
    'year 2 additional mathematics',
    'additional mathematics',
    'elective mathematics',
    'further mathematics',
    'formula sheet',
    'formulae sheet',
    'end of paper',
    'end of test',
    'end of section',
    'good luck',
  ];

  for (const phrase of instructionPhrases) {
    if (lower.includes(phrase)) {
      return true;
    }
  }

  // Only consider institutional letterheads as preamble if they look like header banners
  if (
    /^(?:ministry\s+of\s+education|department\s+of\s+education|state\s+examination\s+board|high\s+school\s+examination\s+board|national\s+examinations?\s+council|west\s+african\s+examinations\s+council)\b/i.test(
      lower
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Strips leading instruction headers or directions that may have merged into the question stem.
 */
export function stripInstructionPrefixFromStem(stem: string): string {
  if (!stem) return '';
  let s = stem.trim();

  // Strip leading section or instruction banner lines
  const lines = s.split('\n').map((l) => l.trim()).filter(Boolean);
  while (
    lines.length > 1 &&
    (isInstructionOrPreambleLine(lines[0]) || /^(?:SECTION|PART|TOPIC|UNIT|CHAPTER|MODULE|WEEK)\b/i.test(lines[0]))
  ) {
    lines.shift();
  }
  s = lines.join('\n').trim();

  // Strip inline instruction headers attached to the start of the question stem e.g.:
  // "INSTRUCTIONS: Answer all questions. In each of the following questions choose the correct option. If 3x = 9..."
  s = s.replace(
    /^(?:(?:SECTION|PART|TOPIC|UNIT|CHAPTER|MODULE|WEEK)\s*[^:\n]+[:\-\s]*)?(?:INSTRUCTIONS?|DIRECTIONS?|REGULATIONS?|NOTE|NOTICE)\b[^.!?\n]*[:.!?\s-]*/i,
    ''
  );
  s = s.replace(/^(?:Answer|Attempt)\s+(?:all|the|any\s+\d+|both)\s+(?:questions?|items?|problems?)[^.!?\n]*[:.!?\s-]*/i, '');
  s = s.replace(/^(?:Choose|Select|Find)\s+the\s+correct\s+(?:option|answer)[^.!?\n]*[:.!?\s-]*/i, '');
  s = s.replace(/^(?:In\s+each\s+of\s+the\s+following|For\s+each\s+of\s+the\s+following)[^.!?\n]*[:.!?\s-]*/i, '');
  s = s.replace(/^(?:All|Each)\s+questions?\s+carry\s+equal\s+marks[.\s-]*/i, '');
  s = s.replace(/^(?:All\s+diagrams\s+are\s+not|Diagram\s+not)\s+drawn\s+to\s+scale[.\s-]*/i, '');

  return s.trim();
}

/**
 * Detects whether a string is a section header (e.g., "SECTION 1: REAL NUMBER SYSTEM (Questions 1-8)").
 */
export function parseSectionHeader(text: string): { isSection: boolean; title: string; topic: QuestionTopic } | null {
  const match = text.match(/^(?:SECTION|PART)\s*([0-9A-ZIVX]+)?[:\-\s]+([^\n\r]+)/i);
  if (match) {
    const title = match[0].trim();
    const topic = inferTopicFromText(match[2] || match[0]);
    return { isSection: true, title, topic };
  }
  return null;
}

/**
 * Infers mathematics / science topic category from text.
 */
export function inferTopicFromText(text: string): QuestionTopic {
  const lower = text.toLowerCase();
  if (lower.includes('matrix') || lower.includes('matrices') || lower.includes('determinant')) {
    return 'Matrices & Determinants';
  }
  if (
    lower.includes('derivative') ||
    lower.includes('differentiat') ||
    lower.includes('integral') ||
    lower.includes('calculus') ||
    lower.includes('dy/dx') ||
    lower.includes('tangent') ||
    lower.includes('optimization') ||
    lower.includes('rate of change')
  ) {
    return 'Calculus & Optimization';
  }
  if (lower.includes('log') || lower.includes('exponent') || lower.includes('indices') || lower.includes('surd') || lower.includes('power rule')) {
    return 'Logarithms & Exponents';
  }
  if (
    lower.includes('quadratic') ||
    lower.includes('polynomial') ||
    lower.includes('factor') ||
    lower.includes('equation') ||
    lower.includes('algebra') ||
    lower.includes('inequalit') ||
    lower.includes('real number') ||
    lower.includes('rational') ||
    lower.includes('binary operation') ||
    lower.includes('commutative') ||
    lower.includes('associative')
  ) {
    return 'Inequalities & Algebra';
  }
  if (lower.includes('trig') || lower.includes('sin') || lower.includes('cos') || lower.includes('tan') || lower.includes('triangle') || lower.includes('radian') || lower.includes('degree')) {
    return 'Trigonometry';
  }
  if (lower.includes('vector') || lower.includes('magnitude') || lower.includes('direction') || lower.includes('collinear')) {
    return 'Vectors';
  }
  if (
    lower.includes('probabilit') ||
    lower.includes('statistic') ||
    lower.includes('mean') ||
    lower.includes('variance') ||
    lower.includes('standard deviation') ||
    lower.includes('permutation') ||
    lower.includes('combination') ||
    lower.includes('binomial')
  ) {
    return 'Statistics & Correlation';
  }
  if (
    lower.includes('blood') ||
    lower.includes('heart') ||
    lower.includes('cell') ||
    lower.includes('energy') ||
    lower.includes('atom') ||
    lower.includes('molecule') ||
    lower.includes('photosynthesis') ||
    lower.includes('renewable') ||
    lower.includes('organ') ||
    lower.includes('gravity') ||
    lower.includes('force')
  ) {
    return 'General Mathematics';
  }
  return 'General Mathematics';
}

/**
 * Detects and extracts separate Answer Key section at the end or beginning of the paper.
 * Carefully avoids truncating test questions when inline "Solution:" or "Answers:" lines exist.
 */
export function extractSeparateAnswerKeySection(text: string): {
  cleanDocumentText: string;
  answerKeyMap: Map<number, { key: 'A' | 'B' | 'C' | 'D'; explanation?: string }>;
} {
  const answerKeyMap = new Map<number, { key: 'A' | 'B' | 'C' | 'D'; explanation?: string }>();

  // Distinct patterns marking the start of a whole-document Answer Key section
  const answerKeyHeaderRegex = /(?:\n|^)\s*(?:={3,}\s*|#{1,3}\s*)?(?:ANSWER\s*KEYS?|ANSWERS?(?:\s*(?:KEY|SHEET|GUIDE|LIST|(?:AND|&|WITH)\s*EXPLANATIONS?))?|MARKING\s*(?:SCHEME|GUIDE)|CORRECT\s*ANSWERS?(?:\s*KEY)?|SOLUTIONS?(?:\s*(?:AND|&|WITH)\s*EXPLANATIONS?)?|EXPLANATIONS?|ANSWER\s*KEY\s*[\/\-]\s*(?:FOOTNOTES?|ENDNOTES?)|END\s*OF\s*QUESTIONS?[\s\-]+ANSWERS?)\s*[:\-]?\s*(?:={3,})?(?:\n|$)/gi;

  let bestSplitIdx = -1;
  let match: RegExpExecArray | null;

  while ((match = answerKeyHeaderRegex.exec(text)) !== null) {
    const candidateIdx = match.index;
    const candidateAnswerPart = text.substring(candidateIdx).trim();

    // Verify whether this candidate answer section contains questions with options!
    // If it contains multiple options (e.g. A., B., C., D.), it still contains question content! Never truncate!
    const optionMatches = candidateAnswerPart.match(/(?:^|\n)\s*(?:(?:Option\s+)?[A-D][\.\)\:\-]|\([A-D]\)|\[[A-D]\])/gi);
    if (optionMatches && optionMatches.length >= 3) {
      continue;
    }

    // Check if it has actual key pairs (e.g. "1. A", "2. B", "Q3: C", etc.)
    const keyPairs = candidateAnswerPart.match(/(?:^|\n|\s)\s*(?:Q|Question|Item|No\.?)?\s*\d+\s*[\.\:\-\)]\s*(?:\()?([A-D])(?:\)?)/gi);
    if (keyPairs && keyPairs.length >= 2) {
      bestSplitIdx = candidateIdx;
      break;
    }
  }

  if (bestSplitIdx === -1) {
    return { cleanDocumentText: text, answerKeyMap };
  }

  const questionPart = text.substring(0, bestSplitIdx).trim();
  const answerPart = text.substring(bestSplitIdx).trim();

  // Parse lines in the answer key section (e.g., "1. B", "2: C", "3 - A", "4. (D)", "Q5: A - Explanation...")
  const answerLines = answerPart.split('\n');
  answerLines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Pattern 1: "1. B" or "1: B" or "1 - B" or "1. (B)" or "Q1: B" or "1. B: Explanation..."
    const singleMatch = trimmed.match(/(?:Q|Question|Item|No\.?)?\s*(\d+)[\.\:\-\)\s]+(?:\()?([A-D])(?:\)?)(?:[\:\-]\s*|\s+)?(.*)?/i);
    if (singleMatch) {
      const qNum = parseInt(singleMatch[1], 10);
      const keyLetter = singleMatch[2].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      const expl = singleMatch[3]?.trim();
      if (!isNaN(qNum)) {
        answerKeyMap.set(qNum, { key: keyLetter, explanation: expl });
      }
    }

    // Pattern 2: Inline keys like "1-B, 2-C, 3-A, 4-D, 5-B"
    const inlineMatches = trimmed.matchAll(/(?:Q|Question)?\s*(\d+)\s*[\.\:\-\)]\s*(?:\()?([A-D])(?:\)?)/gi);
    for (const m of inlineMatches) {
      const qNum = parseInt(m[1], 10);
      const keyLetter = m[2].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      if (!isNaN(qNum) && !answerKeyMap.has(qNum)) {
        answerKeyMap.set(qNum, { key: keyLetter });
      }
    }
  });

  return {
    cleanDocumentText: questionPart.length > 50 ? questionPart : text,
    answerKeyMap,
  };
}

interface DetectedOptionMarker {
  index: number;
  letter: 'A' | 'B' | 'C' | 'D' | 'E';
  length: number;
  isMarkedCorrect?: boolean;
}

/**
 * Robustly finds all Option Markers (A., B., C., D., E., (A), [A], Option A, etc.) in a given text block.
 */
function findOptionMarkers(text: string): DetectedOptionMarker[] {
  // 1:1 length-preserving masking of math blocks ($...$ and $$...$$) and function calls (P(...), n(...), f(...))
  // Characters inside math are converted to spaces so indices remain strictly 1:1 with text
  const maskedChars = text.split('');
  let inDoubleMath = false;
  let inSingleMath = false;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '$') {
      if (text[i + 1] === '$' && !inSingleMath) {
        maskedChars[i] = ' ';
        maskedChars[i + 1] = ' ';
        inDoubleMath = !inDoubleMath;
        i++;
        continue;
      } else if (!inDoubleMath) {
        maskedChars[i] = ' ';
        inSingleMath = !inSingleMath;
        continue;
      }
    }
    if (inDoubleMath || inSingleMath) {
      maskedChars[i] = ' ';
    }
  }

  // Also mask probability, set function calls, coordinates, and matrix tokens e.g. P(A), n(A), f(A), (A, B)
  const maskedString = maskedChars.join('').replace(
    /\b(?:P|Pr|n|f|g|h|sin|cos|tan|log|ln|det|dim|ker|vec)\s*\([^)]+\)/gi,
    (m) => ' '.repeat(m.length)
  );

  // Regex to match option delimiters:
  // Must NOT be preceded by word characters (prevents matching "DNA.", "WASSCE.", "AreaA.")
  // Supports A-E, and matches when followed by space, line end, or non-alphanumeric token (does not consume spaces)
  // For parenthesized (A)-(E): must not be followed by math relations (=, <, >, \\le, \\ge, \\in, \\cup, \\cap, +, -)
  const optRegex = /(?:^|(?<=[\s|;:~,]|\b))(?:\*|\[x\]|\(correct\)\s*)?(?:(?:Option\s+)?(?:\(([A-E])\)|\[([A-E])\])(?!\s*(?:=|<|>|\\le|\\ge|\\in|\\cup|\\cap|\+|-))|(?:Option\s+)?([A-E])[\.\:\-]|(?<!\()([A-E])\)(?!\s*(?:=|<|>|\\le|\\ge|\\in|\\cup|\\cap|\+|-)))(?=\s|$|[^a-zA-Z0-9])/gi;

  const markers: DetectedOptionMarker[] = [];
  let m: RegExpExecArray | null;

  while ((m = optRegex.exec(maskedString)) !== null) {
    const rawLetterMatch = m[1] || m[2] || m[3] || m[4];
    if (!rawLetterMatch) continue;
    const rawLetter = rawLetterMatch.toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E';
    const matchStr = m[0];
    const isMarked = /\*|\[x\]|\(correct\)/i.test(matchStr);

    markers.push({
      index: m.index,
      letter: rawLetter,
      length: matchStr.length,
      isMarkedCorrect: isMarked,
    });
  }

  // Also check for lowercase option markers if uppercase found < 2 (e.g. "a.", "b.", "c.", "d.")
  if (markers.length < 2) {
    const lowerOptRegex = /(?:^|(?<=[\s|;:~,]|\b))(?:\*|\[x\]|\(correct\)\s*)?(?:(?:option\s+)?(?:\(([a-e])\)|\[([a-e])\])(?!\s*(?:=|<|>|\\le|\\ge|\\in|\\cup|\\cap|\+|-))|(?:option\s+)?([a-e])[\.\:\-]|(?<!\()([a-e])\)(?!\s*(?:=|<|>|\\le|\\ge|\\in|\\cup|\\cap|\+|-)))(?=\s|$|[^a-zA-Z0-9])/g;
    const lowerMarkers: DetectedOptionMarker[] = [];
    let lm: RegExpExecArray | null;
    while ((lm = lowerOptRegex.exec(maskedString)) !== null) {
      const lowerLetterMatch = lm[1] || lm[2] || lm[3] || lm[4];
      if (!lowerLetterMatch) continue;
      const rawLetter = lowerLetterMatch.toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E';
      lowerMarkers.push({
        index: lm.index,
        letter: rawLetter,
        length: lm[0].length,
        isMarkedCorrect: /\*|\[x\]|\(correct\)/i.test(lm[0]),
      });
    }
    if (lowerMarkers.length >= 2) {
      return lowerMarkers;
    }
    return markers;
  }

  // Search for the optimal sequence of A -> B -> C -> D -> E
  let bestSequence: DetectedOptionMarker[] = [];

  for (let aIdx = 0; aIdx < markers.length; aIdx++) {
    if (markers[aIdx].letter !== 'A') continue;

    const seq: DetectedOptionMarker[] = [markers[aIdx]];
    let nextExpected: 'B' | 'C' | 'D' | 'E' | null = 'B';

    for (let j = aIdx + 1; j < markers.length; j++) {
      if (markers[j].letter === nextExpected) {
        seq.push(markers[j]);
        if (nextExpected === 'B') nextExpected = 'C';
        else if (nextExpected === 'C') nextExpected = 'D';
        else if (nextExpected === 'D') nextExpected = 'E';
        else if (nextExpected === 'E') {
          nextExpected = null;
          break;
        }
      }
    }

    if (seq.length > bestSequence.length) {
      bestSequence = seq;
    } else if (seq.length === bestSequence.length && seq.length >= 2) {
      // If same length, prefer the sequence appearing closer to the end of the question block
      bestSequence = seq;
    }
  }

  if (bestSequence.length >= 2) {
    return bestSequence;
  }

  // Fallback: check if sequence starting with 'B' exists
  for (let bIdx = 0; bIdx < markers.length; bIdx++) {
    if (markers[bIdx].letter !== 'B') continue;
    const seq: DetectedOptionMarker[] = [markers[bIdx]];
    let nextExpected: 'C' | 'D' | 'E' | null = 'C';
    for (let j = bIdx + 1; j < markers.length; j++) {
      if (markers[j].letter === nextExpected) {
        seq.push(markers[j]);
        if (nextExpected === 'C') nextExpected = 'D';
        else if (nextExpected === 'D') nextExpected = 'E';
        else if (nextExpected === 'E') break;
      }
    }
    if (seq.length >= 2) {
      return seq;
    }
  }

  return markers;
}

/**
 * Cleans trailing section headers, instruction lines, or embedded subsequent questions that may have leaked into the last option.
 */
function cleanTrailingMetaFromOption(text: string): { cleanText: string; trailingMeta?: string } {
  if (!text) return { cleanText: '' };
  const lines = text.split('\n');
  const keptLines: string[] = [];
  const metaLines: string[] = [];
  let foundMeta = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      keptLines.push(line);
      continue;
    }

    // Check if the lines kept so far contain unclosed parentheses e.g. "(5,"
    const currentKept = keptLines.join(' ');
    const openCount = (currentKept.match(/\(/g) || []).length;
    const closeCount = (currentKept.match(/\)/g) || []).length;
    const isInsideParens = openCount > closeCount;

    // Never treat a line starting with commas or closing parens as question metadata
    const isContinuation = /^[\),\s]/.test(trimmed) || isInsideParens;

    if (
      !isContinuation && (
        foundMeta ||
        /^(?:SECTION|PART)\b/i.test(trimmed) ||
        /^(?:(?:Question|Q\.?|Problem|Item|Task|No\.?|Number)\s*[1-9]\d{0,3}[\.\:\)\s\-]?|\([1-9]\d{0,3}\)\s*|\[[1-9]\d{0,3}\]\s*|\b[1-9]\d{0,3}\s*[\.\)\:\-\t]\s+[A-Za-z0-9\$\\\(\"\'\—\–]|\b[1-9]\d{0,3}\s+(?:What|Which|Find|Calculate|Evaluate|Simplify|Determine|Solve|How|If\b|Given\b|Consider\b|Express\b|Identify\b|State\b|Show\b|Define\b|Differentiate\b|Integrate\b|Factorize\b|Expand\b)\b)/i.test(trimmed)
      )
    ) {
      foundMeta = true;
      metaLines.push(trimmed);
    } else {
      keptLines.push(line);
    }
  }

  return {
    cleanText: keptLines.join('\n').trim(),
    trailingMeta: metaLines.join('\n').trim() || undefined,
  };
}

/**
 * Extracts question stem, options (A, B, C, D), correct answer, and explanation from a question block.
 */
export function extractOptionsFromBlock(blockText: string): {
  questionStem: string;
  options: { id: 'A' | 'B' | 'C' | 'D'; text: string }[];
  detectedKey?: 'A' | 'B' | 'C' | 'D';
  detectedExplanation?: string;
  trailingMeta?: string;
} {
  let workingText = normalizeOptionSpacing(blockText.trim());

  let detectedKey: 'A' | 'B' | 'C' | 'D' | undefined;
  let detectedExplanation: string | undefined;
  let trailingMeta: string | undefined;

  // 1. Check for dedicated Answer/Key lines at the end of the block
  // e.g. "Answer: B", "Key: C", "Correct Answer: B", "Ans: A", "ANS = D"
  const ansMatch = workingText.match(/(?:^|\n)\s*(?:Answer|Key|Correct|Correct\s*Answer|Ans)\s*[:\-=]\s*\(?([A-D])\)?/i);
  if (ansMatch) {
    detectedKey = ansMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
    workingText = workingText.replace(/(?:^|\n)\s*(?:Answer|Key|Correct|Correct\s*Answer|Ans)\s*[:\-=]\s*\(?([A-D])\)?[^\n]*/gi, '').trim();
  }

  // 2. Check for Explanation lines
  const expMatch = workingText.match(/(?:^|\n)\s*(?:Explanation|Solution|Reason)\s*[:\-=]\s*(.*)/i);
  if (expMatch) {
    detectedExplanation = expMatch[1].trim();
    workingText = workingText.replace(/(?:^|\n)\s*(?:Explanation|Solution|Reason)\s*[:\-=]\s*.*/gi, '').trim();
  }

  // 3. Find all Option Markers in the block
  const markers = findOptionMarkers(workingText);
  const options: { id: 'A' | 'B' | 'C' | 'D'; text: string }[] = [];
  let stem = workingText;

  if (markers.length >= 2) {
    // We found at least 2 distinct option markers!
    const firstMarker = markers[0];
    stem = workingText.substring(0, firstMarker.index).trim();

    for (let i = 0; i < markers.length; i++) {
      const cur = markers[i];
      const nextStart = i + 1 < markers.length ? markers[i + 1].index : workingText.length;
      const textStart = cur.index + cur.length;
      let optText = workingText.substring(textStart, nextStart).trim();

      // Check if option was marked correct
      if (cur.isMarkedCorrect || /\*|\[x\]|\(correct\)|\(answer\)/i.test(optText)) {
        if (cur.letter !== 'E') {
          detectedKey = cur.letter;
        }
        optText = optText.replace(/\*|\[x\]|\(correct\)|\(answer\)/gi, '').trim();
      }

      // Clean trailing punctuation or table markdown pipes and dashes
      optText = optText
        .replace(/\|{2,}/g, ' ')
        .replace(/\|\s*[-:\s]+\s*\|/g, ' ')
        .replace(/^[\|\s\-:]+|[\|\s\-:]+$/g, '')
        .replace(/\s*\|(?=\s|$)/g, '')
        .trim();

      // Clean trailing section headers / instructions from the last option
      if (i === markers.length - 1) {
        const cleaned = cleanTrailingMetaFromOption(optText);
        optText = cleaned.cleanText;
        if (cleaned.trailingMeta) {
          trailingMeta = cleaned.trailingMeta;
        }
      }

      if (cur.letter !== 'E' && !options.some((o) => o.id === cur.letter) && options.length < 4) {
        options.push({
          id: cur.letter,
          text: formatOptionText(optText),
        });
      }
    }
  } else if (markers.length === 1 && markers[0].letter === 'B') {
    // If only 'B' was found, the line/text before 'B' was Option A!
    const lines = workingText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      stem = lines.slice(0, -1).join(' ').trim();
      const lastLine = lines[lines.length - 1];
      const subMarkers = findOptionMarkers('A. ' + lastLine);
      if (subMarkers.length >= 2) {
        return extractOptionsFromBlock(stem + '\nA. ' + lastLine);
      }
    }
  } else {
    // Fallback line-by-line scanning
    const lines = workingText.split('\n').map((l) => l.trim()).filter(Boolean);
    const stemLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const singleOptMatch = line.match(/^(?:Option\s+)?(?:\(?([A-D])\)|\[([A-D])\]|([A-D])\s*[\.\)\:\-])\s*(.*)/i);
      if (singleOptMatch && options.length < 4) {
        const letter = (singleOptMatch[1] || singleOptMatch[2] || singleOptMatch[3]).toUpperCase() as 'A' | 'B' | 'C' | 'D';
        let optText = (singleOptMatch[4] || '').trim();

        // Check if rest of line contains further inline options e.g. "B. 3 C. 4 D. 6"
        const inlineSubMarkers = findOptionMarkers(optText);
        if (inlineSubMarkers.length > 0) {
          const firstSub = inlineSubMarkers[0];
          const firstOptText = optText.substring(0, firstSub.index).trim();
          options.push({ id: letter, text: formatOptionText(firstOptText) });

          for (let mIdx = 0; mIdx < inlineSubMarkers.length; mIdx++) {
            const curSub = inlineSubMarkers[mIdx];
            const nextSubStart = mIdx + 1 < inlineSubMarkers.length ? inlineSubMarkers[mIdx + 1].index : optText.length;
            const subText = optText.substring(curSub.index + curSub.length, nextSubStart).trim();
            if (curSub.letter !== 'E' && !options.some((o) => o.id === curSub.letter) && options.length < 4) {
              options.push({ id: curSub.letter, text: formatOptionText(subText) });
            }
          }
          continue;
        }

        if (letter && !options.some((o) => o.id === letter) && options.length < 4) {
          options.push({ id: letter, text: formatOptionText(optText) });
          continue;
        }
      }

      if (options.length === 0) {
        stemLines.push(line);
      } else if (options.length > 0 && options.length <= 4) {
        // If line is a section header or instruction, don't append to option
        if (/^(?:SECTION|PART)\b/i.test(line) || isInstructionOrPreambleLine(line)) {
          trailingMeta = line;
          continue;
        }
        // Append continuation to previous option
        options[options.length - 1].text += ' ' + formatOptionText(line);
      }
    }

    if (stemLines.length > 0) {
      stem = stemLines.join(' ').trim();
    }
  }

  // 4. Multi-tier Fallback Option Extraction if standard options not yet detected
  if (options.length === 0) {
    // Tier A: Check for Roman Numerals: (i), (ii), (iii), (iv) or i., ii., iii., iv.
    const romanMatch = Array.from(workingText.matchAll(/(?:^|[\s\n])(?:\(([ivx]+)\)|([ivx]+)[\.\)])\s+/gi));
    if (romanMatch.length >= 2 && romanMatch.length <= 6) {
      const firstRoman = romanMatch[0];
      stem = workingText.substring(0, firstRoman.index).trim();
      const letterIds: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
      for (let r = 0; r < Math.min(romanMatch.length, 4); r++) {
        const curR = romanMatch[r];
        const nextRStart = r + 1 < romanMatch.length ? romanMatch[r + 1].index : workingText.length;
        const optText = workingText.substring((curR.index || 0) + curR[0].length, nextRStart).trim();
        if (optText) {
          options.push({ id: letterIds[r], text: formatOptionText(optText) });
        }
      }
    }

    // Tier B: Check for Numbered Sub-Options: 1), 2), 3), 4) or (1), (2), (3), (4)
    if (options.length === 0) {
      const numSubMatch = Array.from(workingText.matchAll(/(?:^|\n)\s*(?:\(([1-5])\)|([1-5])\))\s+/g));
      if (numSubMatch.length >= 2 && numSubMatch.length <= 5) {
        stem = workingText.substring(0, numSubMatch[0].index).trim();
        const letterIds: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
        for (let n = 0; n < Math.min(numSubMatch.length, 4); n++) {
          const curN = numSubMatch[n];
          const nextNStart = n + 1 < numSubMatch.length ? numSubMatch[n + 1].index : workingText.length;
          const optText = workingText.substring((curN.index || 0) + curN[0].length, nextNStart).trim();
          if (optText) {
            options.push({ id: letterIds[n], text: formatOptionText(optText) });
          }
        }
      }
    }

    // Tier C: Check for bulleted lines at the end of the block
    if (options.length === 0) {
      const allLines = workingText.split('\n').map((l) => l.trim()).filter(Boolean);
      const bulletLines: { index: number; text: string }[] = [];
      for (let lIdx = 0; lIdx < allLines.length; lIdx++) {
        const line = allLines[lIdx];
        const bMatch = line.match(/^[\-•*]\s+(.*)/);
        if (bMatch) {
          bulletLines.push({ index: lIdx, text: bMatch[1] });
        }
      }
      if (bulletLines.length >= 2 && bulletLines.length <= 5 && bulletLines[bulletLines.length - 1].index === allLines.length - 1) {
        stem = allLines.slice(0, bulletLines[0].index).join('\n').trim();
        const letterIds: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
        for (let b = 0; b < Math.min(bulletLines.length, 4); b++) {
          options.push({ id: letterIds[b], text: formatOptionText(bulletLines[b].text) });
        }
      }
    }

    // Tier D: Check for True / False questions
    if (options.length === 0 && /\btrue\b/i.test(workingText) && /\bfalse\b/i.test(workingText)) {
      stem = workingText.replace(/\b(?:true\s*\/?\s*false|true\s+or\s+false)\b/gi, '').trim();
      options.push(
        { id: 'A', text: 'True' },
        { id: 'B', text: 'False' },
        { id: 'C', text: 'Cannot be determined' },
        { id: 'D', text: 'None of the above' }
      );
    }
  }

  return {
    questionStem: stem,
    options,
    detectedKey,
    detectedExplanation,
    trailingMeta,
  };
}

/**
 * Formats option text: converts formulas to LaTeX while preserving natural prose words.
 */
function formatOptionText(text: string): string {
  if (!text) return '';
  let cleaned = text.trim();
  // Strip table pipes and markdown separator leftovers e.g. "|||", "|| - - - | - - - |"
  cleaned = cleaned
    .replace(/\|{2,}/g, ' ')
    .replace(/\|\s*[-:\s]+\s*\|/g, ' ')
    .replace(/^[\|\s\-:]+|[\|\s\-:]+$/g, '')
    .replace(/\s*\|(?=\s|$)/g, '')
    .trim();
  return formatMathTextToLatex(cleaned);
}

/**
 * Main assessment parser: parses text into discrete questions, cleans formulas into LaTeX, and strips preambles.
 */
export function parseAssessmentText(rawInput: string): ParseAssessmentResult {
  const sanitized = sanitizeRawText(rawInput);
  if (!sanitized) {
    return {
      questions: [],
      ignoredInstructionsCount: 0,
      extractionNote: 'No document text found to parse.',
    };
  }

  // 1. Separate standalone Answer Key section if present at the end
  const { cleanDocumentText, answerKeyMap } = extractSeparateAnswerKeySection(sanitized);

  // 2. Identify and separate the Document Header / Preambles before Question 1
  // Question 1 can start as: "Question 1", "Q1.", "1. ", "1: ", "1) ", "(1)", etc.
  const q1CandidateRegex = /(?:^|\n)\s*(?:(?:(?:SECTION|PART)\s*[^:\n]+[:\-\s]*)?(?:Question\s*1\b|\bQ\.?\s*1[\.\):]|\(?1\)?[\.\)\:\-\t]\s*|\(1\)\s*|\[1\]\s*|\b1[\.\)\:]\s*))/gi;

  let preQuestionText = '';
  let mainBodyText = cleanDocumentText;

  let q1Candidate: RegExpExecArray | null;
  while ((q1Candidate = q1CandidateRegex.exec(cleanDocumentText)) !== null) {
    const candidateIdx = q1Candidate.index;
    const followingSlice = cleanDocumentText.substring(candidateIdx, candidateIdx + 300);
    const firstLine = followingSlice.trim().split('\n')[0] || '';

    // If this candidate line is an instruction or preamble header, skip it!
    if (isInstructionOrPreambleLine(firstLine) || isInstructionOrPreambleText(firstLine)) {
      continue;
    }

    const hasOptionsInSlice = /(?:^|\n)\s*(?:(?:Option\s+)?[A-E][\.\)\:\-]|\([A-E]\)|\[[A-E]\])/i.test(followingSlice);
    const hasQuestionSign = firstLine.includes('?') || /[=<>≤≥≠≈±√∫∑]/.test(firstLine) || /\b(?:what|which|find|calculate|evaluate|simplify|determine|solve|how\s+many|in\s+a\s+survey|if\s+n\(|expand|factorize|the\s+sum|middle\s+term|solve:|locus|derivative|probability)\b/i.test(firstLine);

    // If this candidate has neither options nor question keywords, check if it's an instruction
    if (!hasOptionsInSlice && !hasQuestionSign) {
      if (isInstructionOrPreambleLine(followingSlice) || isInstructionOrPreambleText(followingSlice)) {
        continue;
      }
    }

    // Found the real Question 1!
    if (candidateIdx > 0) {
      preQuestionText = cleanDocumentText.substring(0, candidateIdx).trim();
      mainBodyText = cleanDocumentText.substring(candidateIdx).trim();
    }
    break;
  }

  let ignoredInstructionsCount = 0;
  if (preQuestionText) {
    const preLines = preQuestionText.split('\n').filter((l) => l.trim().length > 0);
    ignoredInstructionsCount = preLines.length;
  }

  // 3. Robust Sequential Question Boundary Segmentation
  // Normalizes boundary spacing first so questions attached to previous options get separated
  const normalizedMainBody = normalizeQuestionBoundaries(mainBodyText);

  // Group text into discrete questions by respecting:
  // 1) Explicit Question Numbers (1., 2., ..., 20., Q1, Question 1)
  // 2) Question Option completeness (a new question only begins after the previous question has had its options or is a clear sequential step)
  // 3) Internal statement enumeration protection (e.g. "1. If x > 0 2. If y > 0" inside question 5 does NOT split question 5)
  const bodyLines = normalizedMainBody.split('\n');
  const rawBlocks: string[] = [];
  let curBlockLines: string[] = [];
  let expectedQNum = 1;
  let curBlockHasOptions = false;

  for (let lIdx = 0; lIdx < bodyLines.length; lIdx++) {
    const rawLine = bodyLines[lIdx];
    const trimmedLine = rawLine.trim();
    if (!trimmedLine) {
      if (curBlockLines.length > 0) curBlockLines.push('');
      continue;
    }

    const hasOptMarker = /(?:^|\s)(?:Option\s+)?[A-E][\.\)\:\-]|\([A-E]\)|\[[A-E]\]/i.test(trimmedLine);
    if (hasOptMarker) {
      curBlockHasOptions = true;
    }

    const secMatch = /^(?:SECTION|PART|TOPIC)\b/i.test(trimmedLine);
    const qNumMatch = trimmedLine.match(/^(?:(?:Question|Q\.?|Problem|Item|Task|No\.?|Number)\s*([1-9]\d{0,3})[\.\:\)\s\-]?|\(?([1-9]\d{0,3})\)?[\.\)\:\-\t]\s+|([1-9]\d{0,3})[\.\:\)]\s+)/i);

    let isNewQBoundary = false;
    if (secMatch) {
      isNewQBoundary = true;
      expectedQNum = 1;
    } else if (qNumMatch) {
      const num = parseInt(qNumMatch[1] || qNumMatch[2] || qNumMatch[3], 10);
      if (curBlockLines.length === 0) {
        if (!isInstructionOrPreambleLine(trimmedLine)) {
          isNewQBoundary = true;
          expectedQNum = num + 1;
        }
      } else {
        // If current block already has its options A-D, any sequential question number starts the next question
        if (curBlockHasOptions && num >= expectedQNum - 1) {
          isNewQBoundary = true;
          expectedQNum = num + 1;
        } else if (num === expectedQNum) {
          // Exact next sequential question number in order (e.g. 19 after 18)
          isNewQBoundary = true;
          expectedQNum = num + 1;
        }
        // CRITICAL: If num < expectedQNum and !curBlockHasOptions (e.g. "1. AB = 6" inside Question 18):
        // It is an internal statement or condition within Question 18! NEVER split!
      }
    }

    if (isNewQBoundary && curBlockLines.length > 0) {
      rawBlocks.push(curBlockLines.join('\n').trim());
      curBlockLines = [rawLine];
      curBlockHasOptions = hasOptMarker;
    } else {
      curBlockLines.push(rawLine);
    }
  }

  if (curBlockLines.length > 0) {
    rawBlocks.push(curBlockLines.join('\n').trim());
  }

  // Fallback to regex splitting only if line grouping yielded 1 single block for a multi-question text
  if (rawBlocks.length <= 1) {
    const questionBoundaryRegex = /(?=(?:^|\n)[ \t]*(?:(?:SECTION|PART|TOPIC|UNIT|CHAPTER|MODULE|WEEK)\b[^\n]*|\b(?:Question|Q\.?|Problem|Item|Task|No\.?|Number)\s*[1-9]\d{0,3}[\.\:\)\s\-]?|\([1-9]\d{0,3}\)\s*|\[[1-9]\d{0,3}\]\s*|\b[1-9]\d{0,3}\s*[\)\.\:\-\t]\s+(?=[A-Za-z0-9\$\\\(\"\'\—\–])|\b[1-9]\d{0,3}[ \t]+(?:What|Which|Find|Calculate|Evaluate|Simplify|Determine|Solve|How|If\b|Given\b|Consider\b|Express\b|Identify\b|State\b|Show\b|Define\b|Differentiate\b|Integrate\b|Factorize\b|Expand\b)\b))/gi;
    const splitBlocks = normalizedMainBody.split(questionBoundaryRegex).map((b) => b.trim()).filter((b) => b.length > 0);
    if (splitBlocks.length > 1) {
      rawBlocks.length = 0;
      rawBlocks.push(...splitBlocks);
    }
  }

  // Merge blocks that were falsely split inside parentheses e.g. "(5," and "3)"
  const mergedBlocks: string[] = [];
  for (let bIdx = 0; bIdx < rawBlocks.length; bIdx++) {
    const curB = rawBlocks[bIdx];
    if (mergedBlocks.length > 0) {
      const prevB = mergedBlocks[mergedBlocks.length - 1];
      const prevOpen = (prevB.match(/\(/g) || []).length;
      const prevClose = (prevB.match(/\)/g) || []).length;
      if (prevOpen > prevClose || /^[\),\s]/.test(curB)) {
        mergedBlocks[mergedBlocks.length - 1] = prevB + '\n' + curB;
        continue;
      }
    }
    mergedBlocks.push(curB);
  }
  rawBlocks.length = 0;
  rawBlocks.push(...mergedBlocks);

  const extractedList: ExtractedQuestion[] = [];
  let currentTopic: QuestionTopic = 'General Mathematics';

  for (let rawIdx = 0; rawIdx < rawBlocks.length; rawIdx++) {
    const block = rawBlocks[rawIdx];
    if (!block || !block.trim()) continue;

    // Check if this block is an isolated instruction header or section banner without options
    const blockHasOptions = /(?:^|\n)\s*(?:(?:Option\s+)?[A-E][\.\)\:\-]|\([A-E]\)|\[[A-E]\])/i.test(block);
    if (!blockHasOptions && (isInstructionOrPreambleLine(block) || /^(?:SECTION|PART|TOPIC|UNIT|CHAPTER|MODULE|WEEK)\b/i.test(block.trim()))) {
      const sectionInfo = parseSectionHeader(block);
      if (sectionInfo) {
        currentTopic = sectionInfo.topic;
      }
      ignoredInstructionsCount++;
      continue;
    }

    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    // Look for embedded section header in the first line
    const sectionCheck = parseSectionHeader(lines[0]);
    if (sectionCheck) {
      currentTopic = sectionCheck.topic;
      lines.shift(); // Remove section header from question block
      if (lines.length === 0) continue;
    }

    // Extract options, keys, and question stem lines
    const blockContent = lines.join('\n');
    const { questionStem, options, detectedKey, detectedExplanation, trailingMeta } = extractOptionsFromBlock(blockContent);

    // If trailing metadata was attached after options (e.g. "SECTION B: TRIGONOMETRY"), inspect it
    if (trailingMeta) {
      const metaSection = parseSectionHeader(trailingMeta);
      if (metaSection) {
        currentTopic = metaSection.topic;
      }
      // If trailingMeta contains an embedded question boundary, re-inject it so it is never lost!
      const metaHasQ = /(?:(?:Question|Q\.?|Problem|Item|Task|No\.?|Number)\s*[1-9]\d{0,3}[\.\:\)\s\-]?|\([1-9]\d{0,3}\)\s*|\[[1-9]\d{0,3}\]\s*|\b[1-9]\d{0,3}\s*[\)\.\:\-\—\–\t/]\s+(?=[A-Za-z0-9\$\\\(\"\'\—\–])|\b[1-9]\d{0,3}\s+(?:What|Which|Find|Calculate|Evaluate|Simplify|Determine|Solve|How|If|Given|Consider|Express|Identify|State|Show|In\b|Name|Define|Explain|Where|When|Who|Whose|Why)\b)/i.test(trailingMeta);
      if (metaHasQ) {
        rawBlocks.splice(rawIdx + 1, 0, trailingMeta);
      }
    }

    // If this block has NO options detected:
    if (options.length === 0) {
      if (isInstructionOrPreambleLine(blockContent) || /^(?:SECTION|PART|TOPIC|UNIT|CHAPTER|MODULE|WEEK)\b/i.test(blockContent.trim())) {
        const sectionInfo = parseSectionHeader(blockContent);
        if (sectionInfo) currentTopic = sectionInfo.topic;
        ignoredInstructionsCount++;
        continue;
      }

      // Check if subsequent raw block contains options or continuation of this question (e.g. table, prompt, or stem split)
      if (rawIdx + 1 < rawBlocks.length) {
        rawBlocks[rawIdx + 1] = blockContent + '\n' + rawBlocks[rawIdx + 1];
        continue;
      }

      // If it has NO options and previous question exists, merge into previous question
      if (extractedList.length > 0) {
        const lastQ = extractedList[extractedList.length - 1];
        lastQ.questionText += '\n' + formatMathTextToLatex(blockContent.trim());
        continue;
      }

      // If it is an instruction or preamble, ignore it instead of turning it into a fake question
      if (isInstructionOrPreambleLine(blockContent) || isInstructionOrPreambleText(blockContent)) {
        ignoredInstructionsCount++;
        continue;
      }

      // If the input is a single standalone problem prompt without options (e.g. single prompt test or open input):
      const isGenuineQuestionPrompt =
        blockContent.includes('?') ||
        /[=<>≤≥≠≈±√∫∑⊕⊗⊙⊖]/.test(blockContent) ||
        /\b(?:what|which|find|calculate|evaluate|simplify|determine|solve|how\s+many|in\s+a\s+survey|if\s+n\(|expand|factorize|the\s+sum|middle\s+term|solve:|locus|derivative|probability|express|state|show\s+that)\b/i.test(blockContent);

      if (extractedList.length === 0 && rawBlocks.length === 1 && isGenuineQuestionPrompt) {
        options.push(
          { id: 'A', text: 'Option A' },
          { id: 'B', text: 'Option B' },
          { id: 'C', text: 'Option C' },
          { id: 'D', text: 'Option D' }
        );
      } else {
        ignoredInstructionsCount++;
        continue;
      }
    }

    // If no stem lines remained, use lines[0]
    let qStem = questionStem.trim();
    if (!qStem && lines.length > 0) {
      qStem = lines[0];
    }

    // Strip leading question numbers and labels (e.g. "Question 1 (DoK 1: Recall - Week 1)", "1.", "Q1:", "Q.1", "[1]")
    qStem = qStem
      .replace(/^(?:(?:SECTION|PART)\s*[^:\n]+[:\-\s]*)?(?:Question|Q\.?|Problem|Item|Task|No\.?|Number)\s*\d+[\.\:\)\-\s\t]*/i, '')
      .replace(/^\(?\d+\)?[\.\)\:\-\t/]\s*/i, '')
      .replace(/^\(\d+\)\s*/i, '')
      .replace(/^\[\d+\]\s*/i, '')
      .replace(/^\d+\s*[\-\:]\s*/i, '')
      .replace(/^\d+\s+(?=(?:What|Which|Find|Calculate|Evaluate|Simplify|Determine|Solve|How|If|Given|Consider|Express|Identify|State|Show)\b)/i, '')
      .trim();

    // Strip any residual instruction headers that leaked into the front of the question stem
    qStem = stripInstructionPrefixFromStem(qStem);

    // If the question stem has embedded instruction or section header lines at the top, strip those lines
    const stemLines = qStem.split('\n').map((l) => l.trim()).filter(Boolean);
    if (stemLines.length > 1) {
      const firstLineSection = parseSectionHeader(stemLines[0]);
      if (firstLineSection) currentTopic = firstLineSection.topic;

      const nonInstructionLines = stemLines.filter(
        (l) => !isInstructionOrPreambleLine(l) && !/^(?:SECTION|PART)\b/i.test(l)
      );
      if (nonInstructionLines.length > 0) {
        qStem = nonInstructionLines.join('\n').trim();
      }
    }

    // Strip any residual instruction headers that leaked into the front of the question stem
    if (isInstructionOrPreambleLine(qStem) && qStem.includes('?')) {
      const questionMarkIdx = qStem.lastIndexOf('?');
      const startOfSentence = qStem.lastIndexOf('.', questionMarkIdx);
      if (startOfSentence !== -1 && startOfSentence < questionMarkIdx) {
        qStem = qStem.substring(startOfSentence + 1).trim();
      }
    }

    // Never discard a question that has options!
    if (!qStem || (isInstructionOrPreambleLine(qStem) && !qStem.includes('?'))) {
      qStem = 'Choose the correct option:';
    }

    // Handle options: if partial options (e.g. A, B, C), fill remaining up to 4
    let finalOptions = options;
    if (finalOptions.length < 4) {
      const existingIds = new Set(finalOptions.map((o) => o.id));
      const neededIds: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
      neededIds.forEach((letter) => {
        if (!existingIds.has(letter) && finalOptions.length < 4) {
          finalOptions.push({ id: letter, text: `Option ${letter}` });
        }
      });
    }

    // Determine question index & correct answer key
    const questionNumber = extractedList.length + 1;
    let finalCorrectAnswer: 'A' | 'B' | 'C' | 'D' = detectedKey || 'A';
    let finalExplanation = detectedExplanation || 'Extracted from uploaded examination paper.';

    if (answerKeyMap.has(questionNumber)) {
      const mapped = answerKeyMap.get(questionNumber);
      if (mapped?.key) finalCorrectAnswer = mapped.key;
      if (mapped?.explanation) finalExplanation = mapped.explanation;
    }

    // Topic detection
    const topic = inferTopicFromText(qStem) !== 'General Mathematics' ? inferTopicFromText(qStem) : currentTopic;
    const isVectorQ = topic === 'Vectors' || /\bvector\b/i.test(qStem);

    extractedList.push({
      id: questionNumber,
      rawText: block,
      questionText: formatMathTextToLatex(qStem),
      options: finalOptions.map((opt) => {
        let optText = opt.text;
        if (isVectorQ) {
          optText = optText.replace(
            /(?:\\left\(\s*|\()\s*\\?(?:d?frac)\{\s*\\?(?:d?frac)\{([^}]+)\}\{([^}]+)\}\s*\}\{\s*\\?(?:d?frac)\{([^}]+)\}\{([^}]+)\}\s*\}\s*(?:\\right\)?|\))/g,
            '\\begin{pmatrix} \\frac{$1}{$2} \\\\ \\frac{$3}{$4} \\end{pmatrix}'
          );
        }
        return {
          id: opt.id,
          text: formatMathTextToLatex(optText),
        };
      }),
      correctAnswer: finalCorrectAnswer,
      explanation: formatMathTextToLatex(finalExplanation),
      topic,
      isMathDetected: true,
      confidence: 98,
    });
  }

  return {
    questions: extractedList,
    ignoredInstructionsCount: Math.max(ignoredInstructionsCount, 1),
    extractionNote: `Paper segmented into ${extractedList.length} distinct question(s). ${ignoredInstructionsCount} preamble/instruction line(s) excluded.`,
  };
}
