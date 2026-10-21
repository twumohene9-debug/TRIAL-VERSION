import { describe, it, expect } from 'vitest';
import { parseAssessmentText, isInstructionOrPreambleLine } from './documentParser';
import { formatMathTextToLatex, repairUnbalancedMathDelimiters, convertWordXmlToLatex } from './mathDetector';

describe('documentParser - Examination Instruction & Question Segmentation', () => {
  it('correctly identifies numbered instructions as instructions and NOT questions', () => {
    expect(isInstructionOrPreambleLine('INSTRUCTIONS TO CANDIDATES:')).toBe(true);
    expect(isInstructionOrPreambleLine('1. Time allowed: 2 Hours.')).toBe(true);
    expect(isInstructionOrPreambleLine('2. Answer all questions.')).toBe(true);
    expect(isInstructionOrPreambleLine('3. Each question carries equal marks.')).toBe(true);
    expect(isInstructionOrPreambleLine('4. Find the correct option for each question.')).toBe(true);
    expect(isInstructionOrPreambleLine('5. Give only one answer to each question.')).toBe(true);
    expect(isInstructionOrPreambleLine('6. Use HB pencil to shade your answers.')).toBe(true);
    expect(isInstructionOrPreambleLine('7. Do not open this booklet until you are told to do so.')).toBe(true);
  });

  it('does NOT treat option lines as instructions', () => {
    expect(isInstructionOrPreambleLine('A. 4')).toBe(false);
    expect(isInstructionOrPreambleLine('B. Find the sum')).toBe(false);
    expect(isInstructionOrPreambleLine('C. Select the maximum')).toBe(false);
    expect(isInstructionOrPreambleLine('D. 12')).toBe(false);
  });

  it('does not scatter exam paper containing numbered instructions and standalone numbers into hundreds of fake questions', () => {
    const rawExamPaper = `
MINISTRY OF EDUCATION
SENIOR HIGH SCHOOL ENTRANCE EXAMINATION
GENERAL INSTRUCTIONS TO CANDIDATES:
1. Time allowed: 2 Hours.
2. Answer all questions.
3. Each question carries equal marks.
4. Find the correct option for each question.
5. Give only one answer to each question.
6. Do not turn over this page until told to do so.

1. Which of the following is a prime number?
A. 4
B. 6
C. 7
D. 9
Answer: C
Explanation: 7 has only two factors, 1 and itself.

2. Consider the set of data values below:
12
18
Calculate the arithmetic mean of these values.
A. 15
B. 20
C. 25
D. 30
Answer: A

3. Solve for x in the equation $2x + 6 = 14$.
A. 2
B. 4
C. 6
D. 8
Answer: B
`;

    const result = parseAssessmentText(rawExamPaper);

    // Should only detect the 3 genuine questions
    expect(result.questions.length).toBe(3);

    // Instructions 1-6 should NOT be parsed as questions
    const question1 = result.questions[0];
    expect(question1.id).toBe(1);
    expect(question1.questionText).toContain('Which of the following is a prime number?');
    expect(question1.correctAnswer).toBe('C');
    expect(question1.options.length).toBe(4);

    // Question 2 should contain 12 and 18, and NOT split them into Question 12 or 18
    const question2 = result.questions[1];
    expect(question2.id).toBe(2);
    expect(question2.questionText).toContain('12');
    expect(question2.questionText).toContain('18');
    expect(question2.questionText).toContain('arithmetic mean');
    expect(question2.correctAnswer).toBe('A');

    // Question 3
    const question3 = result.questions[2];
    expect(question3.id).toBe(3);
    expect(question3.questionText).toContain('2x + 6 = 14');
    expect(question3.correctAnswer).toBe('B');

    // Ignored instructions count should reflect the header and 6 instruction lines
    expect(result.ignoredInstructionsCount).toBeGreaterThanOrEqual(6);
  });

  it('handles question papers with separate answer keys at the bottom', () => {
    const paperWithSeparateKey = `
SECTION A: OBJECTIVE TEST
Answer all questions.

1. What is the derivative of $x^2$?
A. $x$
B. $2x$
C. $2$
D. $x^3$

2. What is the value of $\\sin(90^\\circ)$?
A. 0
B. 0.5
C. 1
D. -1

ANSWER KEY:
1. B - Power rule gives 2x
2. C - Sine of 90 degrees is 1
`;

    const result = parseAssessmentText(paperWithSeparateKey);
    expect(result.questions.length).toBe(2);
    expect(result.questions[0].correctAnswer).toBe('B');
    expect(result.questions[0].explanation).toContain('Power rule');
    expect(result.questions[1].correctAnswer).toBe('C');
  });

  it('preserves tables with numerical data without splitting them into separate question numbers', () => {
    const paperWithTable = `
1. The table below shows the frequency distribution of test scores:
| Score | Frequency |
| --- | --- |
| 10 | 3 |
| 12 | 5 |
| 18 | 8 |
| 20 | 4 |
Determine the modal score.
A. 10
B. 12
C. 18
D. 20
Answer: C
`;

    const result = parseAssessmentText(paperWithTable);
    expect(result.questions.length).toBe(1);
    expect(result.questions[0].id).toBe(1);
    expect(result.questions[0].questionText).toContain('12');
    expect(result.questions[0].questionText).toContain('18');
    expect(result.questions[0].correctAnswer).toBe('C');
  });

  it('correctly parses 500 questions containing decimals, equations, and data without fragmentation', () => {
    const questionsArray: string[] = [];
    for (let i = 1; i <= 500; i++) {
      questionsArray.push(`
${i}. What is the value when x = 0.5 and y = 2.75 in equation ${i}?
A. 0.5
B. 1.25
C. 2.0
D. 3.25
Answer: B
Explanation: Calculation yields 1.25 for item ${i}.
`);
    }

    const full500Text = questionsArray.join('\n');
    const result = parseAssessmentText(full500Text);

    expect(result.questions.length).toBe(500);
    expect(result.questions[0].id).toBe(1);
    expect(result.questions[495].id).toBe(496);
    expect(result.questions[499].id).toBe(500);
    expect(result.questions[499].questionText).toContain('equation 500');
  });

  it('correctly cleans set theory complements and formats option expressions without raw braces', () => {
    const paperWithSets = `
8. In a universal set U, which expression represents the shaded region?
A. (A \\cap B) \\cup C
B. (A \\cup B)'
C. A' \\cap B
D. ({A}^{'} \\cap B) \\cap {C}^{'}
Answer: D
`;

    const result = parseAssessmentText(paperWithSets);
    expect(result.questions.length).toBe(1);
    const q8 = result.questions[0];
    expect(q8.options[3].id).toBe('D');
    // Option D should have normalized {A}^{'} to A' and be wrapped in math delimiters
    expect(q8.options[3].text).toContain('$');
    expect(q8.options[3].text).not.toContain('{A}^{\'}');
  });

  it('does NOT merge questions formatted in MS Word layout tables (e.g. Questions 147, 148, 149)', () => {
    const tableWordContent = `
147. What is the value of the 5th term in an arithmetic progression with first term 3 and common difference 4?
A. 15
B. 19
C. 23
D. 27
Answer: B

| 148. Find the arithmetic mean of 5 and 15. |
| A. 8 | B. 10 | C. 12 | D. 14 |
Answer: B

| 149. In a geometric progression, the first term is 2 and the common ratio is 3. Find the third term. |
| A. 12 | B. 18 | C. 24 | D. 36 |
Answer: B
`;

    const result = parseAssessmentText(tableWordContent);
    expect(result.questions.length).toBe(3);
    expect(result.questions[0].id).toBe(1);
    expect(result.questions[1].id).toBe(2);
    expect(result.questions[2].id).toBe(3);
    expect(result.questions[1].questionText).toContain('arithmetic mean of 5 and 15');
    expect(result.questions[1].questionText).not.toContain('|');
    expect(result.questions[2].questionText).toContain('geometric progression');
  });

  it('correctly handles exponent fractions and vectors in question stems and options', () => {
    const paperWithVectorsAndExponents = `
37. Evaluate $(8^{1/3})^2 \\times (4^{-1/2})$.
A. 1
B. 2
C. 4
D. 8
Answer: B

38. Given the vector $\\begin{pmatrix} 3 \\\\ -2 \\end{pmatrix}$ and $\\begin{pmatrix} 1 \\\\ 4 \\end{pmatrix}$, find their sum.
A. $\\begin{pmatrix} 4 \\\\ 2 \\end{pmatrix}$
B. $\\begin{pmatrix} 2 \\\\ -6 \\end{pmatrix}$
C. $\\begin{pmatrix} 4 \\\\ 6 \\end{pmatrix}$
D. $\\begin{pmatrix} 3 \\\\ -8 \\end{pmatrix}$
Answer: A
`;

    const result = parseAssessmentText(paperWithVectorsAndExponents);
    expect(result.questions.length).toBe(2);
    expect(result.questions[0].questionText).toContain('8^{1/3}');
    expect(result.questions[1].options[0].text).toContain('\\begin{pmatrix}');
  });

  it('correctly handles Question 369 with from x = 0 to x = 1 and avoids \\tox', () => {
    const raw = 'Find the volume of the solid generated by rotating y = x about the x-axis from x = 0 to x = 1.';
    const result = parseAssessmentText(raw);
    const qText = result.questions[0]?.questionText || '';
    expect(qText).not.toContain('\\tox');
    expect(qText).toContain('$x = 0$');
    expect(qText).toContain('$x = 1$');
  });

  it('correctly handles Question 213 converting nested fraction in parentheses to 2D vector', () => {
    const paperWithVectorFraction = `
213. Find the unit vector in the direction of $\\begin{pmatrix} 3 \\\\ 4 \\end{pmatrix}$.
A. \\left( \\dfrac{\\dfrac{3}{5}}{\\dfrac{4}{5}} \\right)
B. \\left( \\dfrac{\\dfrac{4}{5}}{\\dfrac{3}{5}} \\right)
C. \\left( \\dfrac{\\dfrac{1}{5}}{\\dfrac{4}{5}} \\right)
D. \\left( \\dfrac{\\dfrac{3}{4}}{\\dfrac{4}{3}} \\right)
Answer: A
`;
    const result = parseAssessmentText(paperWithVectorFraction);
    expect(result.questions.length).toBe(1);
    const q = result.questions[0];
    expect(q.options[0].text).toContain('\\begin{pmatrix}');
    expect(q.options[0].text).toContain('\\frac{3}{5}');
    expect(q.options[0].text).toContain('\\frac{4}{5}');
  });

  it('correctly handles Question 274 with number raised to fractional index using slash', () => {
    const paperWithFractionalIndex = `
274. Simplify $(27^{1/3})^2 \\div (9^{1/2})$.
A. 1
B. 2
C. 3
D. 4
Answer: C
`;
    const result = parseAssessmentText(paperWithFractionalIndex);
    expect(result.questions.length).toBe(1);
    const q = result.questions[0];
    expect(q.questionText).toContain('27^{1/3}');
    expect(q.questionText).not.toContain('27\\,');
  });

  it('correctly renders a fraction divided by a fraction without turning it into a vector', () => {
    const paperWithCompoundFraction = `
101. Evaluate \\frac{\\frac{1}{2}}{\\frac{3}{4}} and (3/4) / (5/6).
A. \\frac{2}{3}
B. \\frac{3}{2}
C. \\frac{9}{10}
D. \\frac{10}{9}
Answer: A
`;
    const result = parseAssessmentText(paperWithCompoundFraction);
    expect(result.questions.length).toBe(1);
    const q = result.questions[0];
    expect(q.questionText).toContain('\\frac{\\frac{1}{2}}{\\frac{3}{4}}');
    expect(q.questionText).toContain('\\dfrac{\\frac{3}{4}}{\\frac{5}{6}}');
    expect(q.questionText).not.toContain('\\begin{pmatrix}');
  });

  it('correctly renders fractional 2x2 matrices with pmatrix and bmatrix', () => {
    const paperWithFractionalMatrix = `
102. Given the matrix $M = \\begin{pmatrix} \\frac{1}{2} & \\frac{3}{4} \\\\ \\frac{5}{6} & \\frac{7}{8} \\end{pmatrix}$, find its determinant.
A. -\\frac{1}{6}
B. -\\frac{1}{12}
C. -\\frac{1}{8}
D. -\\frac{1}{16}
Answer: C
`;
    const result = parseAssessmentText(paperWithFractionalMatrix);
    expect(result.questions.length).toBe(1);
    const q = result.questions[0];
    expect(q.questionText).toContain('\\begin{pmatrix} \\frac{1}{2} & \\frac{3}{4} \\\\ \\frac{5}{6} & \\frac{7}{8} \\end{pmatrix}');
  });

  it('correctly renders fractional indices and power of power expressions', () => {
    const paperWithFractionalIndices = `
40. Simplify (27^{1/3})^2 ÷ (9^{1/2}).
A. 3
B. 9
C. 27
D. 1/3
Answer: B

41. Evaluate (16/81)^{-3/4}.
A. 27/8
B. 8/27
C. 9/4
D. 4/9
Answer: A

42. Simplify (27¹/³)² ÷ (9¹/²).
A. 3
B. 9
C. 27
D. 1/3
Answer: B
`;
    const result = parseAssessmentText(paperWithFractionalIndices);
    expect(result.questions.length).toBe(3);

    const q40 = result.questions[0];
    // Must be wrapped in math delimiters and correctly formatted with exponents and division
    expect(q40.questionText).toContain('$');
    expect(q40.questionText).toMatch(/\$\(27\^\{[^\$]+\}\)\^2\s*\\div\s*\(9\^\{[^\$]+\}\)\$/);

    const q41 = result.questions[1];
    expect(q41.questionText).toContain('$');
    expect(q41.questionText).toMatch(/\\left\(\\frac\{16\}\{81\}\\right\)\^\{/);

    const q42 = result.questions[2];
    expect(q42.questionText).toContain('$');
    expect(q42.questionText).toMatch(/\\div/);
  });
  it('correctly parses probability and set questions with P(A), P(B) without truncating question stem', () => {
    const probabilityExamPaper = `
1. In a class of 40 students, the probability that a student passes mathematics is $P(A) = 0.7$ and the probability that a student passes science is $P(B) = 0.6$. If $P(A \\cap B) = 0.42$, find the probability that a student fails both subjects.
A. 0.12
B. 0.18
C. 0.24
D. 0.30
Answer: A
Explanation: $P(A \\cup B) = P(A) + P(B) - P(A \\cap B) = 0.7 + 0.6 - 0.42 = 0.88$. Hence probability of failing both is $1 - 0.88 = 0.12$.

2. Given two events A and B such that P(A) = 0.4, P(B) = 0.5, and A and B are independent events. Calculate P(A ∩ B).
A. 0.10
B. 0.20
C. 0.40
D. 0.90
Answer: B

3. Let matrix A = [[1, 2], [3, 4]] and matrix B = [[2, 0], [1, 3]]. Determine the product AB.
A. [[4, 6], [10, 12]]
B. [[2, 0], [3, 12]]
C. [[3, 2], [4, 7]]
D. [[1, 2], [3, 4]]
Answer: A
`;

    const result = parseAssessmentText(probabilityExamPaper);
    expect(result.questions.length).toBe(3);

    // Question 1 must have the full stem including P(A) and P(B) and NOT truncate
    const q1 = result.questions[0];
    expect(q1.questionText).toContain('passes mathematics is');
    expect(q1.questionText).toContain('P(A)');
    expect(q1.questionText).toContain('passes science is');
    expect(q1.questionText).toContain('P(B)');
    expect(q1.questionText).toContain('fails both subjects');
    expect(q1.options.length).toBe(4);
    expect(q1.options[0].text).toContain('0.12');
    expect(q1.options[1].text).toContain('0.18');
    expect(q1.options[2].text).toContain('0.24');
    expect(q1.options[3].text).toContain('0.30');
    expect(q1.correctAnswer).toBe('A');

    // Question 2
    const q2 = result.questions[1];
    expect(q2.questionText).toContain('P(A)');
    expect(q2.questionText).toContain('P(B)');
    expect(q2.questionText).toContain('independent events');
    expect(q2.options.length).toBe(4);
    expect(q2.options[0].text).toContain('0.10');
    expect(q2.options[1].text).toContain('0.20');
    expect(q2.correctAnswer).toBe('B');

    // Question 3
    const q3 = result.questions[2];
    expect(q3.questionText).toContain('matrix A');
    expect(q3.questionText).toContain('matrix B');
    expect(q3.options.length).toBe(4);
  });

  it('does not falsely split options containing numbers followed by prepositions into new questions', () => {
    const paperWithOptionsWithPrepositions = `
1. What is the distribution of balls in the experiment?
A. 10 in the first box and 20 in the second box
B. 4 for x greater than zero and 2 for x less than zero
C. 2 with constant velocity and 5 with acceleration
D. 1 at rest at the origin
Answer: A

2. Determine the coordinates of the turning point.
A. (2, 5) on the upper branch
B. (3, 8) two units from the origin
C. (1, 4) with positive gradient
D. (0, 0) the origin
Answer: B
`;

    const result = parseAssessmentText(paperWithOptionsWithPrepositions);
    expect(result.questions.length).toBe(2);

    const q1 = result.questions[0];
    expect(q1.options.length).toBe(4);
    expect(q1.options[0].text).toContain('10 in the first box and 20 in the second box');
    expect(q1.options[1].text).toMatch(/4 for \$?x\$? greater than zero/);
    expect(q1.options[2].text).toContain('2 with constant velocity');
    expect(q1.options[3].text).toContain('1 at rest at the origin');

    const q2 = result.questions[1];
    expect(q2.options.length).toBe(4);
    expect(q2.options[0].text).toContain('(2, 5) on the upper branch');
    expect(q2.options[1].text).toContain('(3, 8) two units from the origin');
  });

  it('preserves words ending in e. and a. like true, false, and value without splitting into tru e.', () => {
    const raw = `
9. Which statement correctly describes the relationship between a statement and its negation?
A. A statement and its negation can both be true.
B. A statement and its negation can both be false.
C. A statement and its negation always have the same truth value.
D. A statement and its negation always have opposite truth values.
Answer: D
`;
    const result = parseAssessmentText(raw);
    expect(result.questions.length).toBe(1);
    const q = result.questions[0];
    expect(q.options.length).toBe(4);
    expect(q.options[0].text).toContain('true');
    expect(q.options[0].text).not.toContain('tru e');
    expect(q.options[1].text).toContain('false');
    expect(q.options[1].text).not.toContain('fals e');
    expect(q.options[2].text).toContain('truth value');
    expect(q.options[2].text).not.toContain('valu e');
    expect(q.options[3].text).toContain('opposite truth values');
    expect(q.correctAnswer).toBe('D');
  });

  it('correctly parses Word OMATH numerical binomial coefficients without misclassifying them as matrices', () => {
    // Word OMML for \binom{5}{2}
    const omathBinomialXml = `<?xml version="1.0" encoding="UTF-8"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
      <w:body>
        <w:p>
          <w:r><w:t>1. Evaluate the binomial coefficient </w:t></w:r>
          <m:oMath>
            <m:d>
              <m:dPr><m:begChr m:val="("/><m:endChr m:val=")"/></m:dPr>
              <m:e>
                <m:f>
                  <m:fPr><m:type m:val="noBar"/></m:fPr>
                  <m:num><m:r><m:t>5</m:t></m:r></m:num>
                  <m:den><m:r><m:t>2</m:t></m:r></m:den>
                </m:f>
              </m:e>
            </m:d>
          </m:oMath>
          <w:r><w:t>.</w:t></w:r>
        </w:p>
        <w:p><w:r><w:t>A. 10</w:t></w:r></w:p>
        <w:p><w:r><w:t>B. 20</w:t></w:r></w:p>
        <w:p><w:r><w:t>C. 25</w:t></w:r></w:p>
        <w:p><w:r><w:t>D. 30</w:t></w:r></w:p>
        <w:p><w:r><w:t>Answer: A</w:t></w:r></w:p>
      </w:body>
    </w:document>`;

    const convertedText = convertWordXmlToLatex(omathBinomialXml);
    const parsedText = parseAssessmentText(convertedText);
    expect(parsedText.questions.length).toBe(1);
    const q1 = parsedText.questions[0];
    expect(q1.questionText).toContain('\\binom{5}{2}');
    expect(q1.questionText).not.toContain('\\begin{pmatrix}');
  });

  it('correctly formats fraction that appears after a closed matrix in question stems', () => {
    const raw = `
44. If $M = \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}$, compute the scalar product $\\frac{1}{2} M$.
A. \\begin{pmatrix} \\frac{1}{2} & 1 \\\\ \\frac{3}{2} & 2 \\end{pmatrix}
B. \\begin{pmatrix} 1 & 1 \\\\ 3 & 2 \\end{pmatrix}
C. \\begin{pmatrix} 2 & 4 \\\\ 6 & 8 \\end{pmatrix}
D. \\begin{pmatrix} 0 & 0 \\\\ 0 & 0 \\end{pmatrix}
Answer: A
`;
    const result = parseAssessmentText(raw);
    expect(result.questions.length).toBe(1);
    const q44 = result.questions[0];
    expect(q44.questionText).toContain('\\begin{pmatrix}');
    expect(q44.options[0].text).toContain('\\begin{pmatrix}');
    expect(q44.correctAnswer).toBe('A');
  });

  it('correctly parses an MS Word document with 20 questions without extracting disjointed extra questions', () => {
    let testPaper = 'MATHEMATICS EXAMINATION - 20 QUESTIONS\nInstructions: Answer all questions in this paper.\n\n';

    for (let i = 1; i <= 20; i++) {
      if (i === 5) {
        testPaper += `${i}. Consider the following statements:\n1. If x > 0, then x^2 > 0.\n2. If x^2 > 0, then x > 0.\nWhich of the statements is true?\nA. 1 only\nB. 2 only\nC. Both 1 and 2\nD. Neither\nAnswer: A\n\n`;
      } else if (i === 12) {
        testPaper += `${i}. Given the polynomial function:\nf(x) = 2x^2 - 4x + 5\nCalculate the value of f(3).\nA. 11\nB. 12\nC. 13\nD. 14\nAnswer: A\n\n`;
      } else if (i === 18) {
        testPaper += `${i}. In triangle ABC:\n1. AB = 6 cm\n2. BC = 8 cm\nFind the length of AC if angle B is 90 degrees.\nA. 10 cm\nB. 12 cm\nC. 14 cm\nD. 16 cm\nAnswer: A\n\n`;
      } else {
        testPaper += `${i}. Solve for x in the equation ${i}x + 2 = ${i * 3}:\nA. 1\nB. 2\nC. 3\nD. 4\nAnswer: B\n\n`;
      }
    }

    testPaper += `ANSWERS AND EXPLANATIONS:
1. B
2. B
3. B
4. B
5. A: Only statement 1 is true
6. B
7. B
8. B
9. B
10. B
11. B
12. A: f(3) = 2(9) - 12 + 5 = 11
13. B
14. B
15. B
16. B
17. B
18. A: By Pythagoras AC = 10
19. B
20. B`;

    const result = parseAssessmentText(testPaper);
    // MUST be exactly 20 questions, NOT 22, 25, or disjointed!
    expect(result.questions.length).toBe(20);

    // Verify Question 5 kept its statements inside the stem and did not split
    const q5 = result.questions[4];
    expect(q5.questionText).toContain('Consider the following statements');
    expect(q5.questionText).toMatch(/If \$?x > 0\$?/);
    expect(q5.options.length).toBe(4);
    expect(q5.correctAnswer).toBe('A');

    // Verify Question 18 kept its sub-statements inside the stem
    const q18 = result.questions[17];
    expect(q18.questionText).toContain('In triangle');
    expect(q18.questionText).toContain('AB = 6');
    expect(q18.options.length).toBe(4);
    expect(q18.options[0].text).toContain('10');
    expect(q18.correctAnswer).toBe('A');

    // Verify Question 12 explanation was mapped from the answer key
    const q12 = result.questions[11];
    expect(q12.correctAnswer).toBe('A');
    expect(q12.explanation).toContain('f(3)');
  });

  it('correctly parses SAMPLE_ADDITIONAL_MATH_QUESTIONS_RAW_TEXT with colon numbering', () => {
    const rawSample = `1: In a survey of 100 students, 60 study Mathematics.
A. 15
B. 20
C. 25
D. 30
Answer: A

2: What is the coefficient of x^2 in (3 - 2x)^4?
A. 96
B. -96
C. 216
D. -216
Answer: C

3: If n(A \\cup B) = 50, find n(A \\cap B).
A. 10
B. 15
C. 20
D. 25
Answer: B`;

    const result = parseAssessmentText(rawSample);
    expect(result.questions.length).toBe(3);
    expect(result.questions[0].correctAnswer).toBe('A');
    expect(result.questions[1].correctAnswer).toBe('C');
    expect(result.questions[2].correctAnswer).toBe('B');
  });

  it('correctly extracts Word XML formatting (bold, italic, underline, equations)', () => {
    const formattedWordXml = `<?xml version="1.0" encoding="UTF-8"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
      <w:body>
        <w:p>
          <w:r><w:t>1. </w:t></w:r>
          <w:r><w:rPr><w:b/></w:rPr><w:t>Evaluate</w:t></w:r>
          <w:r><w:t> the expression for </w:t></w:r>
          <w:r><w:rPr><w:i/></w:rPr><w:t>quadratic</w:t></w:r>
          <w:r><w:t> equation: </w:t></w:r>
          <m:oMath>
            <m:sSup>
              <m:e><m:r><m:t>x</m:t></m:r></m:e>
              <m:sup><m:r><m:t>2</m:t></m:r></m:sup>
            </m:sSup>
            <m:r><m:t> - 4 = 0</m:t></m:r>
          </m:oMath>
        </w:p>
        <w:p><w:r><w:t>A. 2</w:t></w:r></w:p>
        <w:p><w:r><w:t>B. 4</w:t></w:r></w:p>
        <w:p><w:r><w:t>C. 6</w:t></w:r></w:p>
        <w:p><w:r><w:t>D. 8</w:t></w:r></w:p>
        <w:p><w:r><w:t>Answer: A</w:t></w:r></w:p>
      </w:body>
    </w:document>`;

    const extracted = convertWordXmlToLatex(formattedWordXml);
    expect(extracted).toContain('**Evaluate**');
    expect(extracted).toContain('*quadratic*');

    const parsed = parseAssessmentText(extracted);
    expect(parsed.questions.length).toBe(1);
    expect(parsed.questions[0].questionText).toContain('**Evaluate**');
    expect(parsed.questions[0].questionText).toContain('*quadratic*');
    expect(parsed.questions[0].correctAnswer).toBe('A');
  });

  it('preserves multi-line question stems exactly as formatted in Word', () => {
    const multiLineExam = `1. Consider the function below:
f(x) = 3x^2 - 5x + 2
Find the value of f(2).
A. 4
B. 6
C. 8
D. 10
Answer: A`;

    const parsed = parseAssessmentText(multiLineExam);
    expect(parsed.questions.length).toBe(1);
    const stem = parsed.questions[0].questionText;
    expect(stem).toContain('Consider the function below:');
    expect(stem).toContain('f(x)');
    expect(stem).toContain('Find the value of');
    // Verify line breaks were preserved inside the stem
    expect(stem.split('\n').length).toBeGreaterThanOrEqual(2);
  });
});




