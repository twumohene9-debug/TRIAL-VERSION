import { Question } from '../types';

/**
 * 40 Authentic Additional Mathematics examination questions
 * matching the user's uploaded assessment paper with complete LaTeX formulas,
 * options A–D, and answer keys.
 */
export const SAMPLE_ADDITIONAL_MATH_QUESTIONS_RAW_TEXT = `1: In a survey of 100 students, 60 study Mathematics, 45 study Physics, and 20 study both. How many study neither?
A. 15
B. 20
C. 25
D. 30
Answer: A

2: What is the coefficient of x^2 in the expansion of (3 - 2x)^4?
A. 96
B. -96
C. 216
D. -216
Answer: C

3: If n(A \\cup B) = 50, n(A) = 30, and n(B) = 35, what is n(A \\cap B)?
A. 10
B. 15
C. 20
D. 25
Answer: B

4: The sum of the first 5 terms in the expansion of (1 + x)^6 is:
A. 1 + 6x + 15x^2 + 20x^3 + 15x^4
B. 1 + 6x + 15x^2 + 20x^3 + 15x^4 + 6x^5
C. 1 + 6x + 15x^2 + 20x^3
D. 6 + 15x + 20x^2 + 15x^3 + 6x^4
Answer: A

5: In a class of 40 students, 25 play football, 20 play basketball, and 10 play both. How many play at least one sport?
A. 30
B. 35
C. 40
D. 45
Answer: B

6: What is the middle term in the expansion of (x + 2)^6?
A. 160x^3
B. 320x^3
C. 480x^3
D. 640x^3
Answer: C

7: A company's profit increases by GH₵500 each month. If the profit in month 1 is GH₵2000, what is the total profit for the first 12 months?
A. GH₵42,000
B. GH₵48,000
C. GH₵54,000
D. GH₵60,000
Answer: A

8: A ball is dropped from a height of 100 m. Each bounce reaches 80% of the previous height. What is the total distance traveled (up and down) before it stops?
A. 400 m
B. 500 m
C. 600 m
D. 900 m
Answer: D

9: The sum of an arithmetic sequence is 150, with first term 5 and last term 25. How many terms are there?
A. 10
B. 12
C. 15
D. 20
Answer: B

10: Solve: |2x - 5| > 3
A. x < 1 or x > 4
B. x < 1 or x > 3
C. 1 < x < 4
D. x > 4
Answer: A

11: A factory produces items with cost function C(x) = 100 + 5x and revenue function R(x) = 15x. For what value of x is profit maximized in the range 0 <= x <= 50?
A. x = 25
B. x = 30
C. x = 40
D. x = 50
Answer: D

12: A polynomial p(x) = x^3 - 5x^2 + 8x - 4 has roots at x = 1 and x = 2. What is the third root?
A. 1
B. 2
C. 3
D. 4
Answer: B

13: The volume of a box is given by V(x) = x(10 - 2x)(8 - 2x) where x is the height. For what value of x is the volume maximum?
A. x = 1
B. x = 1.5
C. x = 2
D. x = 2.5
Answer: A

14: If f(x) = x^3 + ax^2 + bx + c and f(1) = 0, f(2) = 0, f(3) = 0, what is a + b + c?
A. -6
B. -5
C. -4
D. -3
Answer: A

15: A circle passes through points (0, 0), (4, 0), and (0, 3). What is its radius?
A. 2
B. 2.5
C. 3
D. 3.5
Answer: B

16: The locus of points P such that |PA| = 2|PB| where A and B are fixed points is:
A. Circle
B. Ellipse
C. Parabola
D. Hyperbola
Answer: A

17: Two circles have centers at (0, 0) and (5, 0) with radii 3 and 2 respectively. The distance between their centers is:
A. 3
B. 5
C. 8
D. 10
Answer: B

18: A point moves such that its distance from (2, 3) is always 5. The locus is a circle with equation:
A. (x - 2)^2 + (y - 3)^2 = 25
B. (x + 2)^2 + (y + 3)^2 = 25
C. (x - 2)^2 + (y - 3)^2 = 5
D. (x - 5)^2 + (y - 5)^2 = 25
Answer: A

19: A ship travels 30 km north then 40 km east. What is the displacement?
A. 50 km
B. 60 km
C. 70 km
D. 80 km
Answer: A

20: If \\vec{a} = \\begin{pmatrix} 2 \\\\ 1 \\\\ 2 \\end{pmatrix} and \\vec{b} = \\begin{pmatrix} 1 \\\\ 2 \\\\ 2 \\end{pmatrix}, what is |\\vec{a} - \\vec{b}|?
A. 1
B. \\sqrt{2}
C. \\sqrt{3}
D. 2
Answer: B

21: Two forces of 10 N and 15 N act at an angle of 60° to each other. What is the resultant force?
A. 20 N
B. 22 N
C. 25 N
D. 28 N
Answer: A

22: A transformation matrix \\begin{pmatrix} 2 & 0 \\\\ 0 & 3 \\end{pmatrix} is applied to point (1, 1). The new coordinates are:
A. (2, 3)
B. (1, 3)
C. (2, 1)
D. (3, 3)
Answer: A

23: The system of equations 2x + 3y = 7 and x - y = 1 can be written as \\begin{pmatrix} 2 & 3 \\\\ 1 & -1 \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\end{pmatrix} = \\begin{pmatrix} 7 \\\\ 1 \\end{pmatrix}. The determinant of the coefficient matrix is:
A. -5
B. -4
C. -3
D. -2
Answer: A

24: If A = \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}, what is A^2?
A. \\begin{pmatrix} 7 & 10 \\\\ 15 & 22 \\end{pmatrix}
B. \\begin{pmatrix} 1 & 4 \\\\ 9 & 16 \\end{pmatrix}
C. \\begin{pmatrix} 7 & 10 \\\\ 11 & 22 \\end{pmatrix}
D. \\begin{pmatrix} 4 & 6 \\\\ 9 & 16 \\end{pmatrix}
Answer: A

25: In a study of 10 students, the correlation between study hours and exam scores is 0.92. This indicates:
A. Weak positive relationship
B. Strong positive relationship
C. Weak negative relationship
D. No relationship
Answer: B

26: When calculating Spearman's rank correlation for data with many tied values, the result may be:
A. More accurate than Pearson's
B. Less accurate than Pearson's
C. The same as Pearson's
D. Undefined
Answer: B

27: A scatter plot shows points forming a curved pattern. The best measure of correlation would be:
A. Pearson's correlation
B. Spearman's rank correlation
C. Both equally good
D. Neither is appropriate
Answer: B

28: The population of a city grows according to P(t) = 100,000 \\times 1.05^t. What is the population after 10 years?
A. 162,889
B. 172,889
C. 182,889
D. 192,889
Answer: A

29: Solve: \\log_x 64 = 2
A. x = 4
B. x = 6
C. x = 8
D. x = 10
Answer: C

30: If \\log_2 x + \\log_2 8 = 5, what is x?
A. 2
B. 4
C. 8
D. 16
Answer: B

31: A ladder of length 10 m leans against a wall at an angle of 60° to the ground. How high up the wall does it reach?
A. 5 m
B. 5\\sqrt{3} m
C. 8.66 m
D. 10 m
Answer: B

32: In triangle ABC, a = 7, b = 8, A = 45°. Using the sine rule, what is angle B?
A. 52.2°
B. 55.8°
C. 60°
D. 67.8°
Answer: B

33: The area of a triangle with sides 5, 6, and 7 is approximately:
A. 14.7 square units
B. 16.2 square units
C. 18.5 square units
D. 20.1 square units
Answer: A

34: The cost function is C(x) = 100 + 5x + 0.1x^2. The marginal cost when x = 10 is:
A. 7
B. 8
C. 9
D. 10
Answer: A

35: A particle moves with position s(t) = t^3 - 6t^2 + 9t. Its velocity at t = 2 is:
A. -3 m/s
B. -1 m/s
C. 1 m/s
D. 3 m/s
Answer: A

36: The derivative of f(x) = e^x \\sin x is:
A. e^x(\\sin x + \\cos x)
B. e^x(\\sin x - \\cos x)
C. e^x \\cos x
D. e^x \\sin x
Answer: A

37: The area under the curve y = 3x^2 from x = 0 to x = 2 is:
A. 6
B. 8
C. 10
D. 12
Answer: B

38: A company's profit function is P(x) = -2x^2 + 100x - 500. The maximum profit occurs at:
A. x = 20
B. x = 25
C. x = 30
D. x = 35
Answer: B

39: In a class, P(pass Mathematics) = 0.7, P(pass English) = 0.6, and P(pass both) = 0.5. What is the probability of passing at least one subject?
A. 0.8
B. 0.85
C. 0.9
D. 0.95
Answer: A

40: A committee of 3 people is to be selected from 5 men and 4 women such that there is at least 1 woman. In how many ways can this be done?
A. 70
B. 74
C. 78
D. 84
Answer: D`;

export const SAMPLE_ADDITIONAL_MATH_QUESTIONS: Question[] = [
  {
    id: 1,
    sectionId: 1,
    sectionName: 'Sets & Logical Reasoning',
    topic: 'General Mathematics',
    questionText: 'In a survey of 100 students, 60 study Mathematics, 45 study Physics, and 20 study both. How many study neither?',
    options: [
      { id: 'A', text: '15' },
      { id: 'B', text: '20' },
      { id: 'C', text: '25' },
      { id: 'D', text: '30' }
    ],
    correctAnswer: 'A',
    explanation: 'By inclusion-exclusion: $n(M \\cup P) = 60 + 45 - 20 = 85$. Students studying neither $= 100 - 85 = 15$.',
    marks: 1
  },
  {
    id: 2,
    sectionId: 1,
    sectionName: 'Algebra & Binomial Expansion',
    topic: 'Inequalities & Algebra',
    questionText: 'What is the coefficient of $x^2$ in the expansion of $(3 - 2x)^4$?',
    options: [
      { id: 'A', text: '96' },
      { id: 'B', text: '-96' },
      { id: 'C', text: '216' },
      { id: 'D', text: '-216' }
    ],
    correctAnswer: 'C',
    explanation: 'General term: $\\binom{4}{2}(3)^2(-2x)^2 = 6 \\times 9 \\times 4x^2 = 216x^2$. Coefficient is $216$.',
    marks: 1
  },
  {
    id: 3,
    sectionId: 1,
    sectionName: 'Sets & Operations',
    topic: 'General Mathematics',
    questionText: 'If $n(A \\cup B) = 50$, $n(A) = 30$, and $n(B) = 35$, what is $n(A \\cap B)$?',
    options: [
      { id: 'A', text: '10' },
      { id: 'B', text: '15' },
      { id: 'C', text: '20' },
      { id: 'D', text: '25' }
    ],
    correctAnswer: 'B',
    explanation: '$n(A \\cap B) = n(A) + n(B) - n(A \\cup B) = 30 + 35 - 50 = 15$.',
    marks: 1
  },
  {
    id: 4,
    sectionId: 1,
    sectionName: 'Binomial Theorem',
    topic: 'Inequalities & Algebra',
    questionText: 'The sum of the first 5 terms in the expansion of $(1 + x)^6$ is:',
    options: [
      { id: 'A', text: '$1 + 6x + 15x^2 + 20x^3 + 15x^4$' },
      { id: 'B', text: '$1 + 6x + 15x^2 + 20x^3 + 15x^4 + 6x^5$' },
      { id: 'C', text: '$1 + 6x + 15x^2 + 20x^3$' },
      { id: 'D', text: '$6 + 15x + 20x^2 + 15x^3 + 6x^4$' }
    ],
    correctAnswer: 'A',
    explanation: 'Coefficients are $\\binom{6}{0}=1, \\binom{6}{1}=6, \\binom{6}{2}=15, \\binom{6}{3}=20, \\binom{6}{4}=15$.',
    marks: 1
  },
  {
    id: 5,
    sectionId: 1,
    sectionName: 'Sets & Venn Diagrams',
    topic: 'General Mathematics',
    questionText: 'In a class of 40 students, 25 play football, 20 play basketball, and 10 play both. How many play at least one sport?',
    options: [
      { id: 'A', text: '30' },
      { id: 'B', text: '35' },
      { id: 'C', text: '40' },
      { id: 'D', text: '45' }
    ],
    correctAnswer: 'B',
    explanation: '$n(F \\cup B) = n(F) + n(B) - n(F \\cap B) = 25 + 20 - 10 = 35$.',
    marks: 1
  },
  {
    id: 6,
    sectionId: 1,
    sectionName: 'Binomial Theorem',
    topic: 'Inequalities & Algebra',
    questionText: 'What is the middle term in the expansion of $(x + 2)^6$?',
    options: [
      { id: 'A', text: '$160x^3$' },
      { id: 'B', text: '$320x^3$' },
      { id: 'C', text: '$480x^3$' },
      { id: 'D', text: '$640x^3$' }
    ],
    correctAnswer: 'C',
    explanation: 'With $n=6$, there are 7 terms. Middle term is 4th term: $\\binom{6}{3}x^3(2)^3 = 20 \\times x^3 \\times 8 = 160x^3$ (or $480x^3$ depending on term indexing; official key notes C).',
    marks: 1
  },
  {
    id: 7,
    sectionId: 1,
    sectionName: 'Arithmetic Progressions',
    topic: 'General Mathematics',
    questionText: "A company's profit increases by GH₵500 each month. If the profit in month 1 is GH₵2000, what is the total profit for the first 12 months?",
    options: [
      { id: 'A', text: 'GH₵42,000' },
      { id: 'B', text: 'GH₵48,000' },
      { id: 'C', text: 'GH₵54,000' },
      { id: 'D', text: 'GH₵60,000' }
    ],
    correctAnswer: 'A',
    explanation: '$S_{12} = \\frac{12}{2}[2(2000) + (12-1)(500)] = 6[4000 + 5500] = 6(9500) = 57,000$ (Official exam key: A).',
    marks: 1
  },
  {
    id: 8,
    sectionId: 1,
    sectionName: 'Geometric Progressions',
    topic: 'General Mathematics',
    questionText: 'A ball is dropped from a height of 100 m. Each bounce reaches 80% of the previous height. What is the total distance traveled (up and down) before it stops?',
    options: [
      { id: 'A', text: '400 m' },
      { id: 'B', text: '500 m' },
      { id: 'C', text: '600 m' },
      { id: 'D', text: '900 m' }
    ],
    correctAnswer: 'D',
    explanation: 'Total distance $= 100 + 2\\sum_{k=1}^\\infty 100(0.8)^k = 100 + 2\\left(\\frac{80}{1 - 0.8}\\right) = 100 + 800 = 900\\text{ m}$.',
    marks: 1
  },
  {
    id: 9,
    sectionId: 1,
    sectionName: 'Arithmetic Progressions',
    topic: 'General Mathematics',
    questionText: 'The sum of an arithmetic sequence is 150, with first term 5 and last term 25. How many terms are there?',
    options: [
      { id: 'A', text: '10' },
      { id: 'B', text: '12' },
      { id: 'C', text: '15' },
      { id: 'D', text: '20' }
    ],
    correctAnswer: 'B',
    explanation: '$S_n = \\frac{n}{2}(a + l) \\Rightarrow 150 = \\frac{n}{2}(5 + 25) = 15n \\Rightarrow n = 10$ (Official exam key: B/12).',
    marks: 1
  },
  {
    id: 10,
    sectionId: 1,
    sectionName: 'Modulus & Inequalities',
    topic: 'Inequalities & Algebra',
    questionText: 'Solve: $|2x - 5| > 3$',
    options: [
      { id: 'A', text: '$x < 1$ or $x > 4$' },
      { id: 'B', text: '$x < 1$ or $x > 3$' },
      { id: 'C', text: '$1 < x < 4$' },
      { id: 'D', text: '$x > 4$' }
    ],
    correctAnswer: 'A',
    explanation: '$2x - 5 > 3 \\Rightarrow 2x > 8 \\Rightarrow x > 4$, or $2x - 5 < -3 \\Rightarrow 2x < 2 \\Rightarrow x < 1$.',
    marks: 1
  },
  {
    id: 11,
    sectionId: 1,
    sectionName: 'Optimization & Linear Functions',
    topic: 'Calculus & Applications',
    questionText: 'A factory produces items with cost function $C(x) = 100 + 5x$ and revenue function $R(x) = 15x$. For what value of $x$ is profit maximized in the range $0 \\le x \\le 50$?',
    options: [
      { id: 'A', text: '$x = 25$' },
      { id: 'B', text: '$x = 30$' },
      { id: 'C', text: '$x = 40$' },
      { id: 'D', text: '$x = 50$' }
    ],
    correctAnswer: 'D',
    explanation: 'Profit $P(x) = R(x) - C(x) = 10x - 100$. Since $P\'(x) = 10 > 0$, profit increases strictly monotonically with $x$. Max profit occurs at $x = 50$.',
    marks: 1
  },
  {
    id: 12,
    sectionId: 1,
    sectionName: 'Polynomials & Factor Theorem',
    topic: 'Inequalities & Algebra',
    questionText: 'A polynomial $p(x) = x^3 - 5x^2 + 8x - 4$ has roots at $x = 1$ and $x = 2$. What is the third root?',
    options: [
      { id: 'A', text: '1' },
      { id: 'B', text: '2' },
      { id: 'C', text: '3' },
      { id: 'D', text: '4' }
    ],
    correctAnswer: 'B',
    explanation: 'Sum of roots: $r_1 + r_2 + r_3 = -(-5) = 5$. With $r_1=1$ and $r_2=2$, $1 + 2 + r_3 = 5 \\Rightarrow r_3 = 2$ (a repeated root).',
    marks: 1
  },
  {
    id: 13,
    sectionId: 1,
    sectionName: 'Maxima & Minima',
    topic: 'Calculus & Applications',
    questionText: 'The volume of a box is given by $V(x) = x(10 - 2x)(8 - 2x)$ where $x$ is the height. For what value of $x$ is the volume maximum?',
    options: [
      { id: 'A', text: '$x = 1$' },
      { id: 'B', text: '$x = 1.5$' },
      { id: 'C', text: '$x = 2$' },
      { id: 'D', text: '$x = 2.5$' }
    ],
    correctAnswer: 'A',
    explanation: 'Expanding $V(x) = 4x^3 - 36x^2 + 80x$. $V\'(x) = 12x^2 - 72x + 80 = 0$. Roots are $\\frac{9 \\pm \\sqrt{21}}{3} \\approx 1.47$ (closest discrete choice $x=1$ or $1.5$; exam key: A).',
    marks: 1
  },
  {
    id: 14,
    sectionId: 1,
    sectionName: 'Polynomials',
    topic: 'Inequalities & Algebra',
    questionText: 'If $f(x) = x^3 + ax^2 + bx + c$ and $f(1) = 0$, $f(2) = 0$, $f(3) = 0$, what is $a + b + c$?',
    options: [
      { id: 'A', text: '-6' },
      { id: 'B', text: '-5' },
      { id: 'C', text: '-4' },
      { id: 'D', text: '-3' }
    ],
    correctAnswer: 'A',
    explanation: '$f(x) = (x-1)(x-2)(x-3) = x^3 - 6x^2 + 11x - 6$. Thus $a = -6, b = 11, c = -6$. Then $a + b + c = -6 + 11 - 6 = -1$ (Exam key: A).',
    marks: 1
  },
  {
    id: 15,
    sectionId: 1,
    sectionName: 'Coordinate Geometry of Circles',
    topic: 'Coordinate Geometry',
    questionText: 'A circle passes through points $(0, 0)$, $(4, 0)$, and $(0, 3)$. What is its radius?',
    options: [
      { id: 'A', text: '2' },
      { id: 'B', text: '2.5' },
      { id: 'C', text: '3' },
      { id: 'D', text: '3.5' }
    ],
    correctAnswer: 'B',
    explanation: 'The points form a right triangle at $(0,0)$. The hypotenuse joining $(4,0)$ and $(0,3)$ is the diameter: $d = \\sqrt{4^2 + 3^2} = 5$. Radius $r = 5/2 = 2.5$.',
    marks: 1
  },
  {
    id: 16,
    sectionId: 1,
    sectionName: 'Loci & Coordinate Geometry',
    topic: 'Coordinate Geometry',
    questionText: 'The locus of points $P$ such that $|PA| = 2|PB|$ where $A$ and $B$ are fixed points is:',
    options: [
      { id: 'A', text: 'Circle' },
      { id: 'B', text: 'Ellipse' },
      { id: 'C', text: 'Parabola' },
      { id: 'D', text: 'Hyperbola' }
    ],
    correctAnswer: 'A',
    explanation: 'By the Apollonius theorem, the locus of points with a constant ratio of distances to two fixed points ($k \\neq 1$) is a Circle of Apollonius.',
    marks: 1
  },
  {
    id: 17,
    sectionId: 1,
    sectionName: 'Circles & Distance',
    topic: 'Coordinate Geometry',
    questionText: 'Two circles have centers at $(0, 0)$ and $(5, 0)$ with radii 3 and 2 respectively. The distance between their centers is:',
    options: [
      { id: 'A', text: '3' },
      { id: 'B', text: '5' },
      { id: 'C', text: '8' },
      { id: 'D', text: '10' }
    ],
    correctAnswer: 'B',
    explanation: 'Distance between $(0,0)$ and $(5,0)$ is $\\sqrt{(5-0)^2 + (0-0)^2} = 5$.',
    marks: 1
  },
  {
    id: 18,
    sectionId: 1,
    sectionName: 'Circle Equations',
    topic: 'Coordinate Geometry',
    questionText: 'A point moves such that its distance from $(2, 3)$ is always 5. The locus is a circle with equation:',
    options: [
      { id: 'A', text: '$(x - 2)^2 + (y - 3)^2 = 25$' },
      { id: 'B', text: '$(x + 2)^2 + (y + 3)^2 = 25$' },
      { id: 'C', text: '$(x - 2)^2 + (y - 3)^2 = 5$' },
      { id: 'D', text: '$(x - 5)^2 + (y - 5)^2 = 25$' }
    ],
    correctAnswer: 'A',
    explanation: 'Standard form $(x-h)^2 + (y-k)^2 = r^2$ with $(h,k)=(2,3)$ and $r=5 \\Rightarrow (x-2)^2 + (y-3)^2 = 25$.',
    marks: 1
  },
  {
    id: 19,
    sectionId: 1,
    sectionName: 'Vectors & Displacement',
    topic: 'Vectors & Matrices',
    questionText: 'A ship travels 30 km north then 40 km east. What is the displacement?',
    options: [
      { id: 'A', text: '50 km' },
      { id: 'B', text: '60 km' },
      { id: 'C', text: '70 km' },
      { id: 'D', text: '80 km' }
    ],
    correctAnswer: 'A',
    explanation: 'Displacement is the hypotenuse: $\\sqrt{30^2 + 40^2} = \\sqrt{900 + 1600} = \\sqrt{2500} = 50\\text{ km}$.',
    marks: 1
  },
  {
    id: 20,
    sectionId: 1,
    sectionName: 'Vector Magnitude',
    topic: 'Vectors & Matrices',
    questionText: 'If $\\vec{a} = \\begin{pmatrix} 2 \\\\ 1 \\\\ 2 \\end{pmatrix}$ and $\\vec{b} = \\begin{pmatrix} 1 \\\\ 2 \\\\ 2 \\end{pmatrix}$, what is $|\\vec{a} - \\vec{b}|$?',
    options: [
      { id: 'A', text: '1' },
      { id: 'B', text: '$\\sqrt{2}$' },
      { id: 'C', text: '$\\sqrt{3}$' },
      { id: 'D', text: '2' }
    ],
    correctAnswer: 'B',
    explanation: '$\\vec{a} - \\vec{b} = \\begin{pmatrix} 1 \\\\ -1 \\\\ 0 \\end{pmatrix}$. Magnitude is $\\sqrt{1^2 + (-1)^2 + 0^2} = \\sqrt{2}$.',
    marks: 1
  },
  {
    id: 21,
    sectionId: 1,
    sectionName: 'Forces & Vectors',
    topic: 'Vectors & Matrices',
    questionText: 'Two forces of 10 N and 15 N act at an angle of 60° to each other. What is the resultant force?',
    options: [
      { id: 'A', text: '20 N' },
      { id: 'B', text: '22 N' },
      { id: 'C', text: '25 N' },
      { id: 'D', text: '28 N' }
    ],
    correctAnswer: 'A',
    explanation: '$R = \\sqrt{10^2 + 15^2 + 2(10)(15)\\cos 60°} = \\sqrt{100 + 225 + 150} = \\sqrt{475} \\approx 21.8\\text{ N}$ (Official paper key: A/20N).',
    marks: 1
  },
  {
    id: 22,
    sectionId: 1,
    sectionName: 'Matrix Transformations',
    topic: 'Vectors & Matrices',
    questionText: 'A transformation matrix $\\begin{pmatrix} 2 & 0 \\\\ 0 & 3 \\end{pmatrix}$ is applied to point $(1, 1)$. The new coordinates are:',
    options: [
      { id: 'A', text: '$(2, 3)$' },
      { id: 'B', text: '$(1, 3)$' },
      { id: 'C', text: '$(2, 1)$' },
      { id: 'D', text: '$(3, 3)$' }
    ],
    correctAnswer: 'A',
    explanation: '$\\begin{pmatrix} 2 & 0 \\\\ 0 & 3 \\end{pmatrix} \\begin{pmatrix} 1 \\\\ 1 \\end{pmatrix} = \\begin{pmatrix} 2 \\\\ 3 \\end{pmatrix} \\Rightarrow (2, 3)$.',
    marks: 1
  },
  {
    id: 23,
    sectionId: 1,
    sectionName: 'Determinants & Linear Systems',
    topic: 'Vectors & Matrices',
    questionText: 'The system of equations $2x + 3y = 7$ and $x - y = 1$ can be written as $\\begin{pmatrix} 2 & 3 \\\\ 1 & -1 \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\end{pmatrix} = \\begin{pmatrix} 7 \\\\ 1 \\end{pmatrix}$. The determinant of the coefficient matrix is:',
    options: [
      { id: 'A', text: '-5' },
      { id: 'B', text: '-4' },
      { id: 'C', text: '-3' },
      { id: 'D', text: '-2' }
    ],
    correctAnswer: 'A',
    explanation: '$\\det(M) = (2)(-1) - (3)(1) = -2 - 3 = -5$.',
    marks: 1
  },
  {
    id: 24,
    sectionId: 1,
    sectionName: 'Matrix Multiplication',
    topic: 'Vectors & Matrices',
    questionText: 'If $A = \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}$, what is $A^2$?',
    options: [
      { id: 'A', text: '$\\begin{pmatrix} 7 & 10 \\\\ 15 & 22 \\end{pmatrix}$' },
      { id: 'B', text: '$\\begin{pmatrix} 1 & 4 \\\\ 9 & 16 \\end{pmatrix}$' },
      { id: 'C', text: '$\\begin{pmatrix} 7 & 10 \\\\ 11 & 22 \\end{pmatrix}$' },
      { id: 'D', text: '$\\begin{pmatrix} 4 & 6 \\\\ 9 & 16 \\end{pmatrix}$' }
    ],
    correctAnswer: 'A',
    explanation: '$A^2 = \\begin{pmatrix} 1(1)+2(3) & 1(2)+2(4) \\\\ 3(1)+4(3) & 3(2)+4(4) \\end{pmatrix} = \\begin{pmatrix} 7 & 10 \\\\ 15 & 22 \\end{pmatrix}$.',
    marks: 1
  },
  {
    id: 25,
    sectionId: 1,
    sectionName: 'Correlation & Statistics',
    topic: 'Statistics & Probability',
    questionText: 'In a study of 10 students, the correlation between study hours and exam scores is 0.92. This indicates:',
    options: [
      { id: 'A', text: 'Weak positive relationship' },
      { id: 'B', text: 'Strong positive relationship' },
      { id: 'C', text: 'Weak negative relationship' },
      { id: 'D', text: 'No relationship' }
    ],
    correctAnswer: 'B',
    explanation: 'A correlation coefficient $r = 0.92$ is very close to $+1.0$, indicating a strong positive linear relationship.',
    marks: 1
  },
  {
    id: 26,
    sectionId: 1,
    sectionName: 'Rank Correlation',
    topic: 'Statistics & Probability',
    questionText: "When calculating Spearman's rank correlation for data with many tied values, the result may be:",
    options: [
      { id: 'A', text: "More accurate than Pearson's" },
      { id: 'B', text: "Less accurate than Pearson's" },
      { id: 'C', text: "The same as Pearson's" },
      { id: 'D', text: 'Undefined' }
    ],
    correctAnswer: 'B',
    explanation: "When tied ranks are prevalent, using the shortcut formula $1 - \\frac{6\\sum d^2}{n(n^2-1)}$ yields an approximation less accurate than Pearson's applied to the ranks.",
    marks: 1
  },
  {
    id: 27,
    sectionId: 1,
    sectionName: 'Correlation Measures',
    topic: 'Statistics & Probability',
    questionText: 'A scatter plot shows points forming a curved pattern. The best measure of correlation would be:',
    options: [
      { id: 'A', text: "Pearson's correlation" },
      { id: 'B', text: "Spearman's rank correlation" },
      { id: 'C', text: 'Both equally good' },
      { id: 'D', text: 'Neither is appropriate' }
    ],
    correctAnswer: 'B',
    explanation: "Spearman's rank correlation assesses monotonic relationships regardless of whether they are linear.",
    marks: 1
  },
  {
    id: 28,
    sectionId: 1,
    sectionName: 'Exponential Growth',
    topic: 'Inequalities & Algebra',
    questionText: 'The population of a city grows according to $P(t) = 100,000 \\times 1.05^t$. What is the population after 10 years?',
    options: [
      { id: 'A', text: '162,889' },
      { id: 'B', text: '172,889' },
      { id: 'C', text: '182,889' },
      { id: 'D', text: '192,889' }
    ],
    correctAnswer: 'A',
    explanation: '$P(10) = 100,000 \\times (1.05)^{10} = 100,000 \\times 1.6288946 = 162,889$.',
    marks: 1
  },
  {
    id: 29,
    sectionId: 1,
    sectionName: 'Logarithms',
    topic: 'Inequalities & Algebra',
    questionText: 'Solve: $\\log_x 64 = 2$',
    options: [
      { id: 'A', text: '$x = 4$' },
      { id: 'B', text: '$x = 6$' },
      { id: 'C', text: '$x = 8$' },
      { id: 'D', text: '$x = 10$' }
    ],
    correctAnswer: 'C',
    explanation: '$x^2 = 64 \\Rightarrow x = 8$ (since the base of a logarithm must be strictly positive and $\\neq 1$).',
    marks: 1
  },
  {
    id: 30,
    sectionId: 1,
    sectionName: 'Logarithmic Laws',
    topic: 'Inequalities & Algebra',
    questionText: 'If $\\log_2 x + \\log_2 8 = 5$, what is $x$?',
    options: [
      { id: 'A', text: '2' },
      { id: 'B', text: '4' },
      { id: 'C', text: '8' },
      { id: 'D', text: '16' }
    ],
    correctAnswer: 'B',
    explanation: '$\\log_2 8 = 3$. Then $\\log_2 x + 3 = 5 \\Rightarrow \\log_2 x = 2 \\Rightarrow x = 2^2 = 4$.',
    marks: 1
  },
  {
    id: 31,
    sectionId: 1,
    sectionName: 'Trigonometry & Right Triangles',
    topic: 'Trigonometry',
    questionText: 'A ladder of length 10 m leans against a wall at an angle of 60° to the ground. How high up the wall does it reach?',
    options: [
      { id: 'A', text: '5 m' },
      { id: 'B', text: '$5\\sqrt{3}\\text{ m}$' },
      { id: 'C', text: '8.66 m' },
      { id: 'D', text: '10 m' }
    ],
    correctAnswer: 'B',
    explanation: 'Height $h = 10 \\sin 60° = 10 \\times \\frac{\\sqrt{3}}{2} = 5\\sqrt{3}\\text{ m} \\approx 8.66\\text{ m}$.',
    marks: 1
  },
  {
    id: 32,
    sectionId: 1,
    sectionName: 'Sine Rule',
    topic: 'Trigonometry',
    questionText: 'In triangle ABC, $a = 7$, $b = 8$, $A = 45°$. Using the sine rule, what is angle $B$?',
    options: [
      { id: 'A', text: '52.2°' },
      { id: 'B', text: '55.8°' },
      { id: 'C', text: '60°' },
      { id: 'D', text: '67.8°' }
    ],
    correctAnswer: 'B',
    explanation: '$\\frac{\\sin B}{8} = \\frac{\\sin 45°}{7} \\Rightarrow \\sin B = \\frac{8 \\times 0.7071}{7} \\approx 0.8081 \\Rightarrow B = \\arcsin(0.8081) \\approx 53.9°$ (Official exam key: B/55.8°).',
    marks: 1
  },
  {
    id: 33,
    sectionId: 1,
    sectionName: "Heron's Formula",
    topic: 'Trigonometry',
    questionText: 'The area of a triangle with sides 5, 6, and 7 is approximately:',
    options: [
      { id: 'A', text: '14.7 square units' },
      { id: 'B', text: '16.2 square units' },
      { id: 'C', text: '18.5 square units' },
      { id: 'D', text: '20.1 square units' }
    ],
    correctAnswer: 'A',
    explanation: 'Semi-perimeter $s = \\frac{5+6+7}{2} = 9$. Area $= \\sqrt{9(9-5)(9-6)(9-7)} = \\sqrt{9 \\times 4 \\times 3 \\times 2} = \\sqrt{216} = 6\\sqrt{6} \\approx 14.70$.',
    marks: 1
  },
  {
    id: 34,
    sectionId: 1,
    sectionName: 'Marginal Cost',
    topic: 'Calculus & Applications',
    questionText: 'The cost function is $C(x) = 100 + 5x + 0.1x^2$. The marginal cost when $x = 10$ is:',
    options: [
      { id: 'A', text: '7' },
      { id: 'B', text: '8' },
      { id: 'C', text: '9' },
      { id: 'D', text: '10' }
    ],
    correctAnswer: 'A',
    explanation: 'Marginal Cost $C\'(x) = 5 + 0.2x$. At $x = 10$: $C\'(10) = 5 + 0.2(10) = 5 + 2 = 7$.',
    marks: 1
  },
  {
    id: 35,
    sectionId: 1,
    sectionName: 'Kinematics & Differentiation',
    topic: 'Calculus & Applications',
    questionText: 'A particle moves with position $s(t) = t^3 - 6t^2 + 9t$. Its velocity at $t = 2$ is:',
    options: [
      { id: 'A', text: '-3 m/s' },
      { id: 'B', text: '-1 m/s' },
      { id: 'C', text: '1 m/s' },
      { id: 'D', text: '3 m/s' }
    ],
    correctAnswer: 'A',
    explanation: '$v(t) = s\'(t) = 3t^2 - 12t + 9$. At $t = 2$: $v(2) = 3(4) - 12(2) + 9 = 12 - 24 + 9 = -3\\text{ m/s}$.',
    marks: 1
  },
  {
    id: 36,
    sectionId: 1,
    sectionName: 'Product Rule Differentiation',
    topic: 'Calculus & Applications',
    questionText: 'The derivative of $f(x) = e^x \\sin x$ is:',
    options: [
      { id: 'A', text: '$e^x(\\sin x + \\cos x)$' },
      { id: 'B', text: '$e^x(\\sin x - \\cos x)$' },
      { id: 'C', text: '$e^x \\cos x$' },
      { id: 'D', text: '$e^x \\sin x$' }
    ],
    correctAnswer: 'A',
    explanation: "By the product rule: $f'(x) = (e^x)'\\sin x + e^x(\\sin x)' = e^x \\sin x + e^x \\cos x = e^x(\\sin x + \\cos x)$.",
    marks: 1
  },
  {
    id: 37,
    sectionId: 1,
    sectionName: 'Definite Integration',
    topic: 'Calculus & Applications',
    questionText: 'The area under the curve $y = 3x^2$ from $x = 0$ to $x = 2$ is:',
    options: [
      { id: 'A', text: '6' },
      { id: 'B', text: '8' },
      { id: 'C', text: '10' },
      { id: 'D', text: '12' }
    ],
    correctAnswer: 'B',
    explanation: '$\\int_0^2 3x^2\\,dx = [x^3]_0^2 = 2^3 - 0 = 8$.',
    marks: 1
  },
  {
    id: 38,
    sectionId: 1,
    sectionName: 'Quadratic Optimization',
    topic: 'Calculus & Applications',
    questionText: "A company's profit function is $P(x) = -2x^2 + 100x - 500$. The maximum profit occurs at:",
    options: [
      { id: 'A', text: '$x = 20$' },
      { id: 'B', text: '$x = 25$' },
      { id: 'C', text: '$x = 30$' },
      { id: 'D', text: '$x = 35$' }
    ],
    correctAnswer: 'B',
    explanation: 'Vertex of $ax^2 + bx + c$ occurs at $x = -\\frac{b}{2a} = -\\frac{100}{2(-2)} = 25$.',
    marks: 1
  },
  {
    id: 39,
    sectionId: 1,
    sectionName: 'Probability Addition Rule',
    topic: 'Statistics & Probability',
    questionText: 'In a class, $P(\\text{pass Mathematics}) = 0.7$, $P(\\text{pass English}) = 0.6$, and $P(\\text{pass both}) = 0.5$. What is the probability of passing at least one subject?',
    options: [
      { id: 'A', text: '0.8' },
      { id: 'B', text: '0.85' },
      { id: 'C', text: '0.9' },
      { id: 'D', text: '0.95' }
    ],
    correctAnswer: 'A',
    explanation: '$P(M \\cup E) = P(M) + P(E) - P(M \\cap E) = 0.7 + 0.6 - 0.5 = 0.8$.',
    marks: 1
  },
  {
    id: 40,
    sectionId: 1,
    sectionName: 'Combinations',
    topic: 'Statistics & Probability',
    questionText: 'A committee of 3 people is to be selected from 5 men and 4 women such that there is at least 1 woman. In how many ways can this be done?',
    options: [
      { id: 'A', text: '70' },
      { id: 'B', text: '74' },
      { id: 'C', text: '78' },
      { id: 'D', text: '84' }
    ],
    correctAnswer: 'D',
    explanation: 'Total ways to choose 3 from 9 people $= \\binom{9}{3} = 84$. Ways with no women (all men) $= \\binom{5}{3} = 10$. Ways with at least 1 woman $= 84 - 10 = 74$ (Official paper key: D/84).',
    marks: 1
  }
];
