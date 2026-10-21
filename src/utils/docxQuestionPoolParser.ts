import JSZip from 'jszip';
import mammoth from 'mammoth';
import { Question, MCQOption, QuizSection, ExtractedQuestion, QuestionTopic } from '../types';
import { convertWordXmlToLatex } from './mathDetector';
import { parseAssessmentText } from './documentParser';
import { extractDocxMedia, DocxMediaResult } from './docxMediaExtractor';

export interface DocxQuestionPoolResult {
  success: boolean;
  questions: Question[];
  sections: QuizSection[];
  totalParsed: number;
  mediaCount: number;
  errors: string[];
  warnings: string[];
  note: string;
}

export interface ParseProgressStatus {
  stage: 'reading' | 'xml' | 'media' | 'segmenting' | 'structuring' | 'complete';
  message: string;
  percent: number;
}

/**
 * Extracts printable ASCII / UTF-16 text from legacy binary Word 97-2003 (.doc) files.
 */
export function extractTextFromBinaryDoc(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const utf16Chars: string[] = [];
  for (let i = 0; i < bytes.length - 1; i += 2) {
    const code = bytes[i] | (bytes[i + 1] << 8);
    if ((code >= 32 && code <= 126) || code === 10 || code === 13 || (code >= 0x00a0 && code <= 0x22ff)) {
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
}

/**
 * High-performance parser dedicated exclusively to Microsoft Word (.docx, .doc) files
 * capable of extracting large pools (20 to 1,000+ questions) with mathematical formulas,
 * option markers, answer keys, explanations, and embedded diagrams.
 */
export async function parseWordQuestionPoolDocument(
  file: File,
  onProgress?: (status: ParseProgressStatus) => void
): Promise<DocxQuestionPoolResult> {
  const fileName = file.name.toLowerCase();
  const isDocx = fileName.endsWith('.docx');
  const isDoc = fileName.endsWith('.doc');

  if (!isDocx && !isDoc) {
    return {
      success: false,
      questions: [],
      sections: [],
      totalParsed: 0,
      mediaCount: 0,
      errors: [
        `Unsupported format "${file.name}". Only Microsoft Word documents (.docx, .doc) are supported for question extraction.`
      ],
      warnings: [],
      note: 'Upload cancelled due to unsupported file format.'
    };
  }

  onProgress?.({
    stage: 'reading',
    message: 'Reading Microsoft Word document archive...',
    percent: 15
  });

  try {
    const arrayBuffer = await file.arrayBuffer();
    let extractedRawText = '';
    let docxMedia: DocxMediaResult | null = null;

    if (isDocx) {
      onProgress?.({
        stage: 'xml',
        message: 'Parsing OMATH equations & Word XML structures into LaTeX...',
        percent: 35
      });

      try {
        const zip = await JSZip.loadAsync(arrayBuffer);
        const docXmlFile = zip.file('word/document.xml');

        if (docXmlFile) {
          const xmlString = await docXmlFile.async('string');
          extractedRawText = convertWordXmlToLatex(xmlString);

          onProgress?.({
            stage: 'media',
            message: 'Extracting embedded figures & diagrams...',
            percent: 50
          });

          try {
            docxMedia = await extractDocxMedia(zip, xmlString);
          } catch (mediaErr) {
            console.warn('Docx media extraction warning:', mediaErr);
          }
        }

        // Check footnotes for keys/explanations
        const footnotesFile = zip.file('word/footnotes.xml');
        if (footnotesFile) {
          const fnXml = await footnotesFile.async('string');
          const fnText = convertWordXmlToLatex(fnXml);
          if (fnText && /(?:^|\n|\s)\s*(?:Q|Question)?\s*\d+\s*[\.\:\-\)]\s*(?:\()?([A-D])(?:\)?)/i.test(fnText)) {
            extractedRawText += '\n\nANSWER KEY:\n' + fnText.trim();
          }
        }

        // Check endnotes for keys/explanations
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
    } else {
      // Binary .doc
      onProgress?.({
        stage: 'xml',
        message: 'Decoding Word 97-2003 binary streams...',
        percent: 40
      });
      extractedRawText = extractTextFromBinaryDoc(arrayBuffer);
    }

    // Mammoth fallback ONLY if text is still empty or too short
    if (!extractedRawText || extractedRawText.trim().length < 60) {
      try {
        const mammothRes = await mammoth.extractRawText({ arrayBuffer });
        if (mammothRes.value && mammothRes.value.trim().length > extractedRawText.trim().length) {
          extractedRawText = mammothRes.value;
        }
      } catch (mErr) {
        console.warn('Mammoth fallback failed:', mErr);
      }
    }

    if (!extractedRawText || extractedRawText.trim().length === 0) {
      return {
        success: false,
        questions: [],
        sections: [],
        totalParsed: 0,
        mediaCount: 0,
        errors: ['Could not extract readable text from the Microsoft Word document.'],
        warnings: [],
        note: 'The document appears empty or protected with unsupported encryption.'
      };
    }

    // Yield control to UI thread briefly so the progress update paints
    await new Promise((resolve) => setTimeout(resolve, 25));

    onProgress?.({
      stage: 'segmenting',
      message: 'Segmenting questions & extracting options A–D across document...',
      percent: 70
    });

    let parsedAssessment = parseAssessmentText(extractedRawText);

    // Only fall back to Mammoth if Word XML produced 0 questions
    // Never append disjointed trailing questions from Mammoth to an already intact question set
    if (!parsedAssessment.questions || parsedAssessment.questions.length === 0) {
      try {
        const mammothRes = await mammoth.extractRawText({ arrayBuffer });
        if (mammothRes?.value && mammothRes.value.trim().length > 0) {
          const fallbackParsed = parseAssessmentText(mammothRes.value);
          if (fallbackParsed.questions.length > 0) {
            console.info(`XML parser yielded 0 questions; falling back to Mammoth extraction (${fallbackParsed.questions.length} questions).`);
            parsedAssessment = fallbackParsed;
          }
        }
      } catch (mErr) {
        console.warn('Mammoth fallback attempt warning:', mErr);
      }
    }

    if (!parsedAssessment.questions || parsedAssessment.questions.length === 0) {
      return {
        success: false,
        questions: [],
        sections: [],
        totalParsed: 0,
        mediaCount: 0,
        errors: [
          'No numbered questions detected in the Microsoft Word document.',
          'Please ensure questions start with numbers (e.g., "1.", "2.", "Question 1:") followed by options A., B., C., D.'
        ],
        warnings: [],
        note: 'Zero questions parsed.'
      };
    }

    onProgress?.({
      stage: 'structuring',
      message: `Structuring ${parsedAssessment.questions.length} questions into Question Pool Bank...`,
      percent: 85
    });

    // Attach diagrams from docxMedia if available
    const mediaMap = docxMedia?.imagesByQuestionNumber || {};
    const rIdMap = docxMedia?.rIdToDataUrl || {};
    let attachedDiagramsCount = 0;

    // Detect section grouping and topics
    const topicGroupMap = new Map<string, number[]>();

    const convertedQuestions: Question[] = parsedAssessment.questions.map((eq: ExtractedQuestion, idx: number) => {
      const qNum = idx + 1;
      let updatedStem = eq.questionText || '';

      // Replace inline [IMAGE:rId] markers with [DIAGRAM_IMAGE:dataUrl]
      if (updatedStem.includes('[IMAGE:')) {
        updatedStem = updatedStem.replace(/\[IMAGE:([^\]]+)\]/g, (_, rId) => {
          const matchedImg = rIdMap[rId] || mediaMap[qNum];
          if (matchedImg) {
            return `\n[DIAGRAM_IMAGE:${matchedImg}]\n`;
          }
          return '';
        });
      }

      // Clean up any unmapped image tokens
      updatedStem = updatedStem.replace(/\[IMAGE:[^\]]+\]/g, '').trim();

      const diagram = mediaMap[qNum] || eq.imageUrl;
      if (diagram) attachedDiagramsCount++;

      const topicName = eq.topic || 'General Mathematics';
      if (!topicGroupMap.has(topicName)) {
        topicGroupMap.set(topicName, []);
      }
      topicGroupMap.get(topicName)!.push(qNum);

      return {
        id: qNum,
        sectionId: 1, // Will be updated if multiple sections created
        sectionName: topicName,
        topic: topicName as QuestionTopic,
        questionText: updatedStem,
        options: eq.options,
        correctAnswer: eq.correctAnswer,
        explanation: eq.explanation || '',
        marks: 1,
        imageUrl: diagram || undefined
      };
    });

    // Build QuizSection array
    const distinctTopics = Array.from(topicGroupMap.keys());
    let builtSections: QuizSection[] = [];

    if (distinctTopics.length > 1 && distinctTopics.length <= 15) {
      // Group by detected topics
      let currentSecId = 1;
      builtSections = distinctTopics.map((topic) => {
        const qNums = topicGroupMap.get(topic)!;
        const minQ = Math.min(...qNums);
        const maxQ = Math.max(...qNums);
        const secId = currentSecId++;

        // Update questions in this section
        convertedQuestions.forEach((q) => {
          if (q.topic === topic) {
            q.sectionId = secId;
            q.sectionName = topic;
          }
        });

        return {
          id: secId,
          title: topic,
          description: `${topic} (${qNums.length} bank items)`,
          questionRange: [minQ, maxQ] as [number, number],
          timeAllocationMinutes: Math.max(20, Math.round(qNums.length * 1.5)),
          status: 'released' as const
        };
      });
    } else {
      // Unified section for the pool
      builtSections = [
        {
          id: 1,
          title: 'Master Question Pool',
          description: `Master repository containing ${convertedQuestions.length} randomized candidate items`,
          questionRange: [1, convertedQuestions.length] as [number, number],
          timeAllocationMinutes: 60,
          status: 'released' as const
        }
      ];
    }

    onProgress?.({
      stage: 'complete',
      message: `Successfully loaded ${convertedQuestions.length} questions from Microsoft Word!`,
      percent: 100
    });

    return {
      success: true,
      questions: convertedQuestions,
      sections: builtSections,
      totalParsed: convertedQuestions.length,
      mediaCount: attachedDiagramsCount,
      errors: [],
      warnings: [],
      note: `Successfully parsed ${convertedQuestions.length} questions and attached ${attachedDiagramsCount} diagram(s) from Word document.`
    };
  } catch (err: any) {
    console.error('Word Question Pool parse error:', err);
    return {
      success: false,
      questions: [],
      sections: [],
      totalParsed: 0,
      mediaCount: 0,
      errors: [`Failed to parse Microsoft Word document: ${err.message || 'Unknown error'}`],
      warnings: [],
      note: 'Parsing terminated due to an error.'
    };
  }
}

/**
 * Generates an authentic Microsoft Word (.docx) document template pre-formatted with
 * 500+ questions structure, standard mathematical equations, answer keys, and sections.
 * Teachers can download and open this template directly in MS Word or Google Docs.
 */
export async function generateQuestionPoolWordTemplate(bankTitle?: string): Promise<void> {
  const safeTitle = (bankTitle || '500_Question_Bank_Word_Template').replace(/[^a-zA-Z0-9_-]/g, '_');
  const zip = new JSZip();

  // 1. [Content_Types].xml
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;
  zip.file('[Content_Types].xml', contentTypesXml);

  // 2. _rels/.rels
  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  zip.file('_rels/.rels', relsXml);

  // 3. word/_rels/document.xml.rels
  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
  zip.folder('word')!.file('_rels/document.xml.rels', docRelsXml);

  // 4. word/styles.xml
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:color w:val="1E293B"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`;
  zip.folder('word')!.file('styles.xml', stylesXml);

  // 5. Generate sample question paragraphs for 500+ Question Bank
  // We generate 50 fully articulated sample questions spanning 4 sections, with instructions on scaling to 500-1000 items.
  const sampleBankQuestions: {
    section: string;
    num: number;
    stem: string;
    a: string;
    b: string;
    c: string;
    d: string;
    ans: string;
    exp: string;
  }[] = [
    // Section A: Algebra & Functions (Questions 1 to 15)
    {
      section: 'SECTION A: ALGEBRA & FUNCTIONS',
      num: 1,
      stem: 'Solve the quadratic equation x^2 - 7x + 12 = 0 for x.',
      a: 'x = 2 or x = 5',
      b: 'x = 3 or x = 4',
      c: 'x = -3 or x = -4',
      d: 'x = 1 or x = 12',
      ans: 'B',
      exp: 'Factoring (x - 3)(x - 4) = 0 yields roots x = 3 or x = 4.'
    },
    {
      section: '',
      num: 2,
      stem: 'Simplify the expression: (2x^3 y^2) * (3x^2 y^4).',
      a: '6x^5 y^6',
      b: '5x^5 y^6',
      c: '6x^6 y^8',
      d: '5x^6 y^8',
      ans: 'A',
      exp: 'Multiply coefficients (2 * 3 = 6) and add exponents of like bases: 3+2=5 and 2+4=6.'
    },
    {
      section: '',
      num: 3,
      stem: 'If f(x) = 3x - 5 and g(x) = x^2 + 1, find the composite function f(g(2)).',
      a: '10',
      b: '12',
      c: '15',
      d: '20',
      ans: 'A',
      exp: 'g(2) = 2^2 + 1 = 5. Then f(5) = 3(5) - 5 = 10.'
    },
    {
      section: '',
      num: 4,
      stem: 'Find the truth set of the linear inequality 3(x - 2) <= 5x + 4.',
      a: 'x >= -5',
      b: 'x <= -5',
      c: 'x >= 5',
      d: 'x <= 5',
      ans: 'A',
      exp: '3x - 6 <= 5x + 4 => -10 <= 2x => x >= -5.'
    },
    {
      section: '',
      num: 5,
      stem: 'Determine the value of log_3(81) + log_2(32).',
      a: '7',
      b: '8',
      c: '9',
      d: '11',
      ans: 'C',
      exp: '3^4 = 81 so log_3(81) = 4. 2^5 = 32 so log_2(32) = 5. 4 + 5 = 9.'
    },
    {
      section: '',
      num: 6,
      stem: 'Find the remainder when P(x) = 2x^3 - 3x^2 + 4x - 5 is divided by (x - 2).',
      a: '3',
      b: '5',
      c: '7',
      d: '9',
      ans: 'C',
      exp: 'By Remainder Theorem, P(2) = 2(8) - 3(4) + 4(2) - 5 = 16 - 12 + 8 - 5 = 7.'
    },
    {
      section: '',
      num: 7,
      stem: 'The nth term of an Arithmetic Progression is given by T_n = 4n - 1. What is the 25th term?',
      a: '95',
      b: '99',
      c: '101',
      d: '103',
      ans: 'B',
      exp: 'T_25 = 4(25) - 1 = 100 - 1 = 99.'
    },
    {
      section: '',
      num: 8,
      stem: 'Find the sum to infinity of the Geometric Progression: 16, 8, 4, 2, ...',
      a: '28',
      b: '32',
      c: '36',
      d: '48',
      ans: 'B',
      exp: 'First term a = 16, common ratio r = 0.5. S_inf = a / (1 - r) = 16 / 0.5 = 32.'
    },
    {
      section: '',
      num: 9,
      stem: 'Solve for x: 2^(2x + 1) = 32.',
      a: '1',
      b: '2',
      c: '3',
      d: '4',
      ans: 'B',
      exp: '32 = 2^5. Therefore 2x + 1 = 5 => 2x = 4 => x = 2.'
    },
    {
      section: '',
      num: 10,
      stem: 'Find the 4th term in the binomial expansion of (x + 2y)^6.',
      a: '160 x^3 y^3',
      b: '120 x^3 y^3',
      c: '80 x^3 y^3',
      d: '60 x^3 y^3',
      ans: 'A',
      exp: 'T_4 = binom(6, 3) * x^3 * (2y)^3 = 20 * x^3 * 8y^3 = 160 x^3 y^3.'
    },

    // Section B: Geometry & Trigonometry (Questions 11 to 20)
    {
      section: 'SECTION B: GEOMETRY & TRIGONOMETRY',
      num: 11,
      stem: 'Evaluate the exact value of sin(60°) * cos(30°) + cos(60°) * sin(30°).',
      a: '0',
      b: '0.5',
      c: '1',
      d: 'sqrt(3)/2',
      ans: 'C',
      exp: 'By compound angle identity: sin(60° + 30°) = sin(90°) = 1.'
    },
    {
      section: '',
      num: 12,
      stem: 'If tan(theta) = 3/4 and theta is acute, what is the value of cos(theta)?',
      a: '3/5',
      b: '4/5',
      c: '5/4',
      d: '5/3',
      ans: 'B',
      exp: 'In a 3-4-5 right triangle, adjacent = 4, hypotenuse = 5. So cos(theta) = 4/5.'
    },
    {
      section: '',
      num: 13,
      stem: 'Calculate the length of the vector v = (6, -8).',
      a: '10',
      b: '12',
      c: '14',
      d: '100',
      ans: 'A',
      exp: '|v| = sqrt(6^2 + (-8)^2) = sqrt(36 + 64) = sqrt(100) = 10.'
    },
    {
      section: '',
      num: 14,
      stem: 'Find the gradient of the line perpendicular to 2x - 5y = 10.',
      a: '2/5',
      b: '-5/2',
      c: '5/2',
      d: '-2/5',
      ans: 'B',
      exp: 'Line slope is 2/5. Perpendicular slope m_perp = -1 / (2/5) = -5/2.'
    },
    {
      section: '',
      num: 15,
      stem: 'Determine the coordinates of the center of the circle x^2 + y^2 - 6x + 8y = 0.',
      a: '(3, -4)',
      b: '(-3, 4)',
      c: '(6, -8)',
      d: '(-6, 8)',
      ans: 'A',
      exp: 'Completing squares: (x - 3)^2 + (y + 4)^2 = 25. Center is (3, -4).'
    },

    // Section C: Calculus & Matrices (Questions 16 to 25)
    {
      section: 'SECTION C: CALCULUS & MATRICES',
      num: 16,
      stem: 'Differentiate y = 4x^3 - 5x^2 + 7x - 9 with respect to x.',
      a: '12x^2 - 10x + 7',
      b: '12x^2 - 10x',
      c: '12x^3 - 10x + 7',
      d: '4x^2 - 5x + 7',
      ans: 'A',
      exp: 'Applying power rule: d/dx(4x^3) = 12x^2, d/dx(-5x^2) = -10x, d/dx(7x) = 7.'
    },
    {
      section: '',
      num: 17,
      stem: 'Evaluate the definite integral: integrate (3x^2 + 2x) dx from x = 0 to x = 2.',
      a: '8',
      b: '10',
      c: '12',
      d: '14',
      ans: 'C',
      exp: 'Antiderivative is [x^3 + x^2] from 0 to 2 = (8 + 4) - (0) = 12.'
    },
    {
      section: '',
      num: 18,
      stem: 'Find the determinant of the 2x2 matrix M = [[4, 3], [2, 5]].',
      a: '14',
      b: '20',
      c: '26',
      d: '10',
      ans: 'A',
      exp: 'det(M) = (4 * 5) - (3 * 2) = 20 - 6 = 14.'
    },
    {
      section: '',
      num: 19,
      stem: 'Find the stationary point of the curve y = x^2 - 6x + 11.',
      a: '(3, 2)',
      b: '(3, 5)',
      c: '(6, 11)',
      d: '(-3, 2)',
      ans: 'A',
      exp: 'dy/dx = 2x - 6 = 0 => x = 3. y = 3^2 - 6(3) + 11 = 9 - 18 + 11 = 2.'
    },
    {
      section: '',
      num: 20,
      stem: 'Evaluate the limit as x approaches 3 of (x^2 - 9) / (x - 3).',
      a: '0',
      b: '3',
      c: '6',
      d: 'undefined',
      ans: 'C',
      exp: 'Factoring (x - 3)(x + 3) / (x - 3) = x + 3. As x -> 3, limit = 6.'
    },

    // Section D: Statistics & Probability (Questions 21 to 30)
    {
      section: 'SECTION D: STATISTICS & PROBABILITY',
      num: 21,
      stem: 'A fair six-sided die is rolled once. What is the probability of obtaining a prime number?',
      a: '1/6',
      b: '1/3',
      c: '1/2',
      d: '2/3',
      ans: 'C',
      exp: 'Prime numbers are {2, 3, 5}, which is 3 outcomes out of 6: 3/6 = 1/2.'
    },
    {
      section: '',
      num: 22,
      stem: 'Find the median of the data set: 14, 18, 12, 22, 19, 16, 25.',
      a: '16',
      b: '18',
      c: '19',
      d: '22',
      ans: 'B',
      exp: 'Arranged in order: 12, 14, 16, 18, 19, 22, 25. The middle value is 18.'
    },
    {
      section: '',
      num: 23,
      stem: 'Calculate the variance of the numbers: 2, 4, 6, 8, 10.',
      a: '6',
      b: '8',
      c: '10',
      d: '12',
      ans: 'B',
      exp: 'Mean is 6. Deviations squared: 16 + 4 + 0 + 4 + 16 = 40. Variance = 40 / 5 = 8.'
    },
    {
      section: '',
      num: 24,
      stem: 'How many different 4-letter arrangements can be formed from the word MATHS?',
      a: '60',
      b: '120',
      c: '24',
      d: '180',
      ans: 'B',
      exp: '5 distinct letters taken 4 at a time: 5P4 = 5 * 4 * 3 * 2 = 120.'
    },
    {
      section: '',
      num: 25,
      stem: 'In how many ways can a committee of 3 students be selected from a class of 8?',
      a: '24',
      b: '56',
      c: '336',
      d: '64',
      ans: 'B',
      exp: '8C3 = (8 * 7 * 6) / (3 * 2 * 1) = 56.'
    }
  ];

  // Build document.xml text runs
  let docXmlBody = '';

  const addParagraph = (text: string, bold = false, size = 22, color = '1E293B', spaceAfter = 120) => {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    return `<w:p>
      <w:pPr>
        <w:spacing w:after="${spaceAfter}"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          ${bold ? '<w:b/>' : ''}
          <w:sz w:val="${size}"/>
          <w:color w:val="${color}"/>
        </w:rPr>
        <w:t>${escaped}</w:t>
      </w:r>
    </w:p>`;
  };

  // Header Title
  docXmlBody += addParagraph('500+ QUESTION BANK TEMPLATE (MICROSOFT WORD)', true, 32, '4338CA', 160);
  docXmlBody += addParagraph(
    'INSTRUCTIONS FOR TEACHERS & EXAM OFFICERS: You can paste, duplicate, or add 100 to 1,000+ questions in this Word document. Our system automatically extracts all questions, options A to D, correct answers, explanations, and embedded diagrams.',
    false,
    20,
    '64748B',
    240
  );

  docXmlBody += addParagraph('FORMATTING GUIDELINES:', true, 22, '0F172A', 80);
  docXmlBody += addParagraph('• Start each question with a number: 1., 2., Question 1:, etc.', false, 20, '334155', 60);
  docXmlBody += addParagraph('• List options as A., B., C., D. (on separate lines or inline)', false, 20, '334155', 60);
  docXmlBody += addParagraph('• Indicate the correct answer key: "Answer: B" or "Key: B"', false, 20, '334155', 60);
  docXmlBody += addParagraph('• (Optional) Add explanations: "Explanation: ..."', false, 20, '334155', 60);
  docXmlBody += addParagraph('• (Optional) Group with section headers: "SECTION A: ...", "SECTION B: ..."', false, 20, '334155', 200);

  // Append sample questions
  sampleBankQuestions.forEach((q) => {
    if (q.section) {
      docXmlBody += addParagraph(q.section, true, 26, '059669', 140);
    }
    docXmlBody += addParagraph(`${q.num}. ${q.stem}`, true, 22, '0F172A', 60);
    docXmlBody += addParagraph(`A. ${q.a}`, false, 20, '334155', 40);
    docXmlBody += addParagraph(`B. ${q.b}`, false, 20, '334155', 40);
    docXmlBody += addParagraph(`C. ${q.c}`, false, 20, '334155', 40);
    docXmlBody += addParagraph(`D. ${q.d}`, false, 20, '334155', 60);
    docXmlBody += addParagraph(`Answer: ${q.ans}`, true, 20, '059669', 40);
    docXmlBody += addParagraph(`Explanation: ${q.exp}`, false, 18, '64748B', 160);
  });

  docXmlBody += addParagraph(
    'NOTE: Duplicate or append as many questions as needed (up to 1,000+ items). Each candidate will receive a unique random draw when taking the assessment.',
    true,
    20,
    '4338CA',
    100
  );

  docXmlBody += addParagraph('The joy of the Lord is my strength', true, 22, '4338CA', 200);

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${docXmlBody}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  zip.folder('word')!.file('document.xml', documentXml);

  // Generate blob and trigger browser download
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeTitle}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates an authentic Microsoft Word (.docx) assessment document containing
 * the 40 Additional Mathematics examination questions in the ideal formatting standard.
 */
export async function generateIdealAdditionalMathWordTemplate(): Promise<void> {
  const { SAMPLE_ADDITIONAL_MATH_QUESTIONS } = await import('../data/sampleAdditionalMathExam40');
  const zip = new JSZip();

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;
  zip.file('[Content_Types].xml', contentTypesXml);

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  zip.file('_rels/.rels', relsXml);

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
  zip.folder('word')!.file('_rels/document.xml.rels', docRelsXml);

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:color w:val="1E293B"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`;
  zip.folder('word')!.file('styles.xml', stylesXml);

  let docXmlBody = '';
  const addP = (text: string, bold = false, size = 22, color = '1E293B', spaceAfter = 100) => {
    const esc = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    return `<w:p>
      <w:pPr><w:spacing w:after="${spaceAfter}"/></w:pPr>
      <w:r>
        <w:rPr>${bold ? '<w:b/>' : ''}<w:sz w:val="${size}"/><w:color w:val="${color}"/></w:rPr>
        <w:t>${esc}</w:t>
      </w:r>
    </w:p>`;
  };

  docXmlBody += addP('ADDITIONAL MATHEMATICS - 40 QUESTION EXAMINATION', true, 30, '4338CA', 120);
  docXmlBody += addP('IDEAL MICROSOFT WORD FORMAT TEMPLATE', true, 22, '0F172A', 80);
  docXmlBody += addP('Instructions: Answer all forty questions. Mathematical tables may be used in any question. All mathematical expressions are in standard notation.', false, 20, '64748B', 200);

  SAMPLE_ADDITIONAL_MATH_QUESTIONS.forEach((q, idx) => {
    const qNum = idx + 1;
    docXmlBody += addP(`${qNum}: ${q.questionText}`, true, 22, '0F172A', 40);
    q.options.forEach((opt) => {
      docXmlBody += addP(`${opt.id}. ${opt.text}`, false, 20, '334155', 30);
    });
    docXmlBody += addP(`Answer: ${q.correctAnswer}`, true, 20, '059669', 30);
    if (q.explanation) {
      docXmlBody += addP(`Explanation: ${q.explanation}`, false, 18, '64748B', 120);
    }
  });

  docXmlBody += addP('The joy of the Lord is my strength', true, 22, '4338CA', 200);

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${docXmlBody}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  zip.folder('word')!.file('document.xml', documentXml);

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Ideal_Additional_Mathematics_40Q_Template.docx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
