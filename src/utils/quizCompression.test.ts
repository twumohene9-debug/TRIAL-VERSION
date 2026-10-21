import { describe, it, expect } from 'vitest';
import {
  encodeQuizToSelfContainedUrl,
  encodeQuizToPortableCode,
  decodeQuizData,
  parseQuizPackage,
  validateQuestionSchema,
  extractMathEquations,
} from './quizCompression';
import { QuizConfig, Question, QuizSection } from '../types';

describe('quizCompression mathematical equation parser and schema validation suite', () => {
  const sampleMathConfig: QuizConfig = {
    id: 'MATH-ADV-2026',
    code: 'MATH-ADV',
    subject: 'Additional Mathematics',
    title: 'Calculus, Algebra & Trigonometry Assessment',
    schoolName: 'Premier Mathematics Academy',
    totalQuestions: 3,
    durationMinutes: 45,
    enableTabMonitoring: true,
  };

  const sampleMathSections: QuizSection[] = [
    {
      id: 1,
      quizId: 'MATH-ADV-2026',
      title: 'Section A: Calculus & Optimization',
      description: 'Differential and Integral Calculus MCQs',
      questionRange: [1, 2],
      timeAllocationMinutes: 25,
      status: 'released',
    },
    {
      id: 2,
      quizId: 'MATH-ADV-2026',
      title: 'Section B: Matrices & Linear Systems',
      description: 'Matrix determinants and transformations',
      questionRange: [3, 3],
      timeAllocationMinutes: 20,
      status: 'scheduled',
    },
  ];

  const sampleMathQuestions: Question[] = [
    {
      id: 1,
      quizId: 'MATH-ADV-2026',
      quizCode: 'MATH-ADV',
      sectionId: 1,
      sectionName: 'Section A: Calculus & Optimization',
      topic: 'Calculus & Optimization',
      questionText:
        'Evaluate the definite integral $$\\int_0^{\\pi} \\sin(x) \\, dx$$ and determine the area under the curve.',
      options: [
        { id: 'A', text: '$0$' },
        { id: 'B', text: '$1$' },
        { id: 'C', text: '$2$' },
        { id: 'D', text: '$\\pi$' },
      ],
      correctAnswer: 'C',
      explanation:
        'Integrating $\\sin(x)$ gives $[-\\cos(x)]_0^\\pi = -\\cos(\\pi) - (-\\cos(0)) = -(-1) + 1 = 2$.',
      marks: 2,
    },
    {
      id: 2,
      quizId: 'MATH-ADV-2026',
      quizCode: 'MATH-ADV',
      sectionId: 1,
      sectionName: 'Section A: Calculus & Optimization',
      topic: 'Calculus & Optimization',
      questionText:
        'Given $f(x) = \\frac{x^2 - 4}{x - 2}$ for $x \\neq 2$, find $\\lim_{x \\to 2} f(x)$ and check if $f(x) \\le 4$.',
      options: [
        { id: 'A', text: '$\\lim_{x \\to 2} f(x) = 4$' },
        { id: 'B', text: '$\\lim_{x \\to 2} f(x) = 2$' },
        { id: 'C', text: '$\\lim_{x \\to 2} f(x) = 0$' },
        { id: 'D', text: 'Does not exist' },
      ],
      correctAnswer: 'A',
      explanation:
        'Factor the numerator: $x^2 - 4 = (x - 2)(x + 2)$. For $x \\neq 2$, $\\frac{(x - 2)(x + 2)}{x - 2} = x + 2$. Hence $\\lim_{x \\to 2} (x + 2) = 4$.',
      marks: 2,
    },
    {
      id: 3,
      quizId: 'MATH-ADV-2026',
      quizCode: 'MATH-ADV',
      sectionId: 2,
      sectionName: 'Section B: Matrices & Linear Systems',
      topic: 'Matrices & Determinants',
      questionText:
        'Calculate the determinant of matrix $A = \\begin{pmatrix} \\cos\\theta & -\\sin\\theta \\\\ \\sin\\theta & \\cos\\theta \\end{pmatrix}$.',
      options: [
        { id: 'A', text: '$\\cos(2\\theta)$' },
        { id: 'B', text: '$1$' },
        { id: 'C', text: '$-1$' },
        { id: 'D', text: '$\\sin(2\\theta)$' },
      ],
      correctAnswer: 'B',
      explanation:
        'Determinant is calculated as $\\det(A) = (\\cos\\theta)(\\cos\\theta) - (-\\sin\\theta)(\\sin\\theta) = \\cos^2\\theta + \\sin^2\\theta = 1$.',
      marks: 3,
    },
  ];

  describe('encodeQuizToSelfContainedUrl and decodeQuizData roundtrip', () => {
    it('accurately encodes and parses mathematical equations from a self-contained URL', () => {
      const url = encodeQuizToSelfContainedUrl(sampleMathConfig, sampleMathQuestions, sampleMathSections);
      expect(url).toContain('qdata=');

      const decoded = decodeQuizData(url);
      expect(decoded).not.toBeNull();
      if (!decoded) return;

      // Verify QuizConfig schema
      expect(decoded.config.id).toBe('MATH-ADV-2026');
      expect(decoded.config.subject).toBe('Additional Mathematics');
      expect(decoded.config.totalQuestions).toBe(3);

      // Verify QuizSections schema
      expect(decoded.sections).toHaveLength(2);
      expect(decoded.sections[0].title).toBe('Section A: Calculus & Optimization');

      // Verify Question schema & math preservation
      expect(decoded.questions).toHaveLength(3);

      // Question 1: Check LaTeX integral and fractions
      const q1 = decoded.questions[0];
      expect(q1.questionText).toBe(
        'Evaluate the definite integral $$\\int_0^{\\pi} \\sin(x) \\, dx$$ and determine the area under the curve.'
      );
      expect(q1.options[2].text).toBe('$2$');
      expect(q1.options[3].text).toBe('$\\pi$');
      expect(q1.correctAnswer).toBe('C');
      expect(q1.explanation).toContain('-\\cos(\\pi)');

      // Question 2: Check limit and fraction equation
      const q2 = decoded.questions[1];
      expect(q2.questionText).toContain('\\frac{x^2 - 4}{x - 2}');
      expect(q2.questionText).toContain('\\lim_{x \\to 2}');
      expect(q2.options[0].text).toBe('$\\lim_{x \\to 2} f(x) = 4$');

      // Question 3: Check matrix equation
      const q3 = decoded.questions[2];
      expect(q3.questionText).toContain('\\begin{pmatrix}');
      expect(q3.questionText).toContain('\\cos\\theta');
      expect(q3.explanation).toContain('\\cos^2\\theta + \\sin^2\\theta = 1');
    });
  });

  describe('encodeQuizToPortableCode and decodeQuizData roundtrip', () => {
    it('accurately encodes and parses portable code format starting with AQZ_', () => {
      const portableCode = encodeQuizToPortableCode(sampleMathConfig, sampleMathQuestions, sampleMathSections);
      expect(portableCode.startsWith('AQZ_')).toBe(true);

      const decoded = decodeQuizData(portableCode);
      expect(decoded).not.toBeNull();
      if (!decoded) return;

      expect(decoded.config.code).toBe('MATH-ADV');
      expect(decoded.questions).toHaveLength(3);

      // Check all math options are preserved
      const q1 = decoded.questions[0];
      expect(q1.options.map((o) => o.id)).toEqual(['A', 'B', 'C', 'D']);
      expect(q1.options.find((o) => o.id === 'D')?.text).toBe('$\\pi$');
    });
  });

  describe('parseQuizPackage direct JSON and object parsing', () => {
    it('parses valid serialized JSON string containing mathematical symbols and equations', () => {
      const payload = {
        config: sampleMathConfig,
        questions: sampleMathQuestions,
        sections: sampleMathSections,
      };
      const jsonStr = JSON.stringify(payload);

      const parsed = parseQuizPackage(jsonStr);
      expect(parsed).not.toBeNull();
      expect(parsed?.questions[0].topic).toBe('Calculus & Optimization');
      expect(parsed?.questions[1].questionText).toContain('\\le 4');
    });

    it('parses raw object without double-serialization', () => {
      const payload = {
        config: sampleMathConfig,
        questions: sampleMathQuestions,
        sections: sampleMathSections,
      };
      const parsed = parseQuizPackage(payload);
      expect(parsed).not.toBeNull();
      expect(parsed?.config.id).toBe('MATH-ADV-2026');
      expect(parsed?.questions).toHaveLength(3);
    });

    it('returns null for empty or invalid data', () => {
      expect(parseQuizPackage('')).toBeNull();
      expect(parseQuizPackage(null)).toBeNull();
      expect(parseQuizPackage(undefined)).toBeNull();
      expect(parseQuizPackage('{ invalid json')).toBeNull();
      expect(parseQuizPackage({ foo: 'bar' })).toBeNull();
    });
  });

  describe('validateQuestionSchema', () => {
    it('validates a complete math question adhering to Question schema', () => {
      const validated = validateQuestionSchema(sampleMathQuestions[0]);
      expect(validated).not.toBeNull();
      expect(validated?.id).toBe(1);
      expect(validated?.correctAnswer).toBe('C');
      expect(validated?.options).toHaveLength(4);
      expect(validated?.topic).toBe('Calculus & Optimization');
    });

    it('rejects an invalid question missing required options or questionText', () => {
      expect(validateQuestionSchema(null)).toBeNull();
      expect(validateQuestionSchema({ id: 1, questionText: 'No options' })).toBeNull();
      expect(
        validateQuestionSchema({
          id: 1,
          questionText: 'Invalid options',
          options: [{ id: 'Z', text: 'Invalid' }],
          correctAnswer: 'A',
        })
      ).toBeNull();
    });
  });

  describe('extractMathEquations equation extractor', () => {
    it('extracts inline and block LaTeX equations correctly', () => {
      const text =
        'Solve for $x$: $$\\int_0^1 x^2 \\, dx = \\frac{1}{3}$$ and verify that $x \\ge 0$ with $\\sqrt{x}$.';
      const result = extractMathEquations(text);

      expect(result.hasEquations).toBe(true);
      expect(result.block.length).toBeGreaterThan(0);
      expect(result.block[0]).toContain('\\int_0^1 x^2');

      expect(result.inline).toContain('x');
      expect(result.inline).toContain('x \\ge 0');
      expect(result.inline).toContain('\\sqrt{x}');
    });

    it('detects matrix environments in block math', () => {
      const matrixText =
        'Given matrix equation $$\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\end{pmatrix} = \\begin{pmatrix} 5 \\\\ 11 \\end{pmatrix}$$ find $x$ and $y$.';
      const result = extractMathEquations(matrixText);

      expect(result.hasEquations).toBe(true);
      expect(result.block[0]).toContain('begin{pmatrix}');
    });

    it('returns empty lists for plain text without math equations', () => {
      const plainText = 'What is the capital of France?';
      const result = extractMathEquations(plainText);

      expect(result.hasEquations).toBe(false);
      expect(result.inline).toHaveLength(0);
      expect(result.block).toHaveLength(0);
    });
  });

  describe('decodeQuizData edge cases and fault tolerance', () => {
    it('returns null safely for empty strings, null, or corrupted data without crashing', () => {
      expect(decodeQuizData('')).toBeNull();
      expect(decodeQuizData('   ')).toBeNull();
      expect(decodeQuizData('corrupted_gibberish_12345')).toBeNull();
      expect(decodeQuizData('AQZ_not_valid_base64_???')).toBeNull();
    });

    it('decodes quiz from a URL query string without host', () => {
      const fullUrl = encodeQuizToSelfContainedUrl(sampleMathConfig, sampleMathQuestions, sampleMathSections);
      // Extract only the relative query string: ?portal=student&quiz=...&qdata=...
      const queryIndex = fullUrl.indexOf('?');
      const relativeQuery = queryIndex >= 0 ? fullUrl.slice(queryIndex) : fullUrl;

      const decoded = decodeQuizData(relativeQuery);
      expect(decoded).not.toBeNull();
      expect(decoded?.config.id).toBe('MATH-ADV-2026');
      expect(decoded?.questions[0].questionText).toContain('\\int_0^{\\pi}');
    });
  });
});
