import { Question, StudentSubmission } from '../types';

export interface DistractorStats {
  optionKey: 'A' | 'B' | 'C' | 'D';
  optionText: string;
  count: number;
  percentage: number;
  isCorrect: boolean;
  /** Whether the distractor drew a significant percentage of candidates */
  isFunctioning: boolean;
}

export interface ItemAnalysisMetrics {
  questionId: number;
  questionIndex: number;
  questionText: string;
  topic: string;
  sectionName?: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  totalAttempts: number;
  correctAttempts: number;
  /**
   * Facility Index (p-value):
   * p = Correct Candidates / Total Candidates (Ranges from 0.00 to 1.00)
   * Interpretation:
   * p >= 0.85: Very Easy
   * 0.65 <= p < 0.85: Moderately Easy
   * 0.35 <= p < 0.65: Optimal Difficulty
   * 0.20 <= p < 0.35: Difficult
   * p < 0.20: Very Difficult
   */
  pValue: number;
  difficultyLabel: 'Very Easy' | 'Moderately Easy' | 'Optimal' | 'Difficult' | 'Very Difficult';
  difficultyColor: string;
  
  /**
   * Discrimination Index (d-index):
   * d = (Upper Group Correct - Lower Group Correct) / N_group
   * Where Upper Group = top ~27%-33% of candidates, Lower Group = bottom ~27%-33%
   * Interpretation:
   * d >= 0.40: Excellent Discrimination
   * 0.30 <= d < 0.40: Good Discrimination
   * 0.20 <= d < 0.30: Acceptable / Marginal
   * 0.00 <= d < 0.20: Poor Discrimination (Needs revision)
   * d < 0.00: Negative / Defective (Distractor misled top students, key may be incorrect)
   */
  dIndex: number;
  discriminationLabel: 'Excellent' | 'Good' | 'Acceptable' | 'Poor' | 'Defective / Key Alert';
  discriminationColor: string;
  
  distractors: DistractorStats[];
  /** Flag if any distractor is non-functioning (0 selections) or flawed */
  distractorEfficiencyWarning?: string;
  hasDefectiveKeyAlert: boolean;
}

/**
 * Calculates psychometric item analysis (p-value, d-index, distractor efficiency)
 * based on standard educational measurement theory.
 */
export function calculateItemAnalysis(
  questions: Question[],
  submissions: StudentSubmission[]
): ItemAnalysisMetrics[] {
  if (!Array.isArray(questions) || questions.length === 0 || !Array.isArray(submissions) || submissions.length === 0) {
    return [];
  }

  const validSubmissions = submissions.filter((s) => s && s.answers);
  const totalSubmissions = validSubmissions.length;
  if (totalSubmissions === 0) return [];

  // Sort candidates by total percentage score descending to partition Upper and Lower groups
  const sortedByScore = [...validSubmissions].sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0));
  
  // Calculate group size for upper/lower cohort (Standard ~27% to 33%, minimum 1 if at least 2 candidates)
  const groupSize = totalSubmissions >= 4 
    ? Math.max(1, Math.round(totalSubmissions * 0.27)) 
    : Math.max(1, Math.floor(totalSubmissions / 2));

  const upperGroup = sortedByScore.slice(0, groupSize);
  const lowerGroup = sortedByScore.slice(-groupSize);

  return questions.map((q, idx) => {
    const qId = q.id;
    const correctKey = q.correctAnswer;
    
    let totalAnswered = 0;
    let correctCount = 0;
    const optionCounts: Record<'A' | 'B' | 'C' | 'D', number> = { A: 0, B: 0, C: 0, D: 0 };

    validSubmissions.forEach((sub) => {
      const studentChoice = sub.answers?.[qId];
      if (studentChoice && ['A', 'B', 'C', 'D'].includes(studentChoice)) {
        totalAnswered++;
        optionCounts[studentChoice as 'A' | 'B' | 'C' | 'D']++;
        if (studentChoice === correctKey) {
          correctCount++;
        }
      }
    });

    const candidatePool = totalAnswered > 0 ? totalAnswered : totalSubmissions;
    const pValue = candidatePool > 0 ? Number((correctCount / candidatePool).toFixed(2)) : 0;

    let difficultyLabel: ItemAnalysisMetrics['difficultyLabel'] = 'Optimal';
    let difficultyColor = 'text-blue-700 bg-blue-50 border-blue-200';
    if (pValue >= 0.85) {
      difficultyLabel = 'Very Easy';
      difficultyColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    } else if (pValue >= 0.65) {
      difficultyLabel = 'Moderately Easy';
      difficultyColor = 'text-teal-700 bg-teal-50 border-teal-200';
    } else if (pValue >= 0.35) {
      difficultyLabel = 'Optimal';
      difficultyColor = 'text-indigo-700 bg-indigo-50 border-indigo-200';
    } else if (pValue >= 0.20) {
      difficultyLabel = 'Difficult';
      difficultyColor = 'text-amber-700 bg-amber-50 border-amber-200';
    } else {
      difficultyLabel = 'Very Difficult';
      difficultyColor = 'text-rose-700 bg-rose-50 border-rose-200';
    }

    // Compute Upper and Lower group successes for d-index
    let upperCorrect = 0;
    let lowerCorrect = 0;

    upperGroup.forEach((sub) => {
      if (sub.answers?.[qId] === correctKey) {
        upperCorrect++;
      }
    });

    lowerGroup.forEach((sub) => {
      if (sub.answers?.[qId] === correctKey) {
        lowerCorrect++;
      }
    });

    // d = (UpperCorrect - LowerCorrect) / groupSize
    let dIndex = groupSize > 0 ? Number(((upperCorrect - lowerCorrect) / groupSize).toFixed(2)) : 0;
    // Cap d-index to [-1.00, 1.00]
    dIndex = Math.max(-1, Math.min(1, dIndex));

    let discriminationLabel: ItemAnalysisMetrics['discriminationLabel'] = 'Good';
    let discriminationColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    let hasDefectiveKeyAlert = false;

    if (dIndex >= 0.40) {
      discriminationLabel = 'Excellent';
      discriminationColor = 'text-emerald-800 bg-emerald-100/70 border-emerald-300';
    } else if (dIndex >= 0.30) {
      discriminationLabel = 'Good';
      discriminationColor = 'text-teal-700 bg-teal-50 border-teal-200';
    } else if (dIndex >= 0.20) {
      discriminationLabel = 'Acceptable';
      discriminationColor = 'text-blue-700 bg-blue-50 border-blue-200';
    } else if (dIndex >= 0.00) {
      discriminationLabel = 'Poor';
      discriminationColor = 'text-amber-700 bg-amber-50 border-amber-200';
    } else {
      discriminationLabel = 'Defective / Key Alert';
      discriminationColor = 'text-rose-800 bg-rose-100 border-rose-300 animate-pulse';
      hasDefectiveKeyAlert = true;
    }

    // Option Distractor Analysis
    const optionKeys: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
    const distractors: DistractorStats[] = optionKeys.map((key) => {
      const opt = q.options?.find((o) => (o.originalId || o.id) === key || o.id === key);
      const count = optionCounts[key] || 0;
      const pct = candidatePool > 0 ? Math.round((count / candidatePool) * 100) : 0;
      const isCor = key === correctKey;
      return {
        optionKey: key,
        optionText: opt?.text || `Option ${key}`,
        count,
        percentage: pct,
        isCorrect: isCor,
        isFunctioning: isCor || pct >= 5, // Functioning distractor attracts >= 5% of candidates
      };
    });

    // Check for distractor efficiency anomalies
    const inactiveDistractors = distractors.filter((d) => !d.isCorrect && d.count === 0);
    let distractorEfficiencyWarning: string | undefined = undefined;
    if (inactiveDistractors.length > 0 && totalSubmissions >= 5) {
      distractorEfficiencyWarning = `${inactiveDistractors.length} non-functioning distractor(s) (${inactiveDistractors.map((d) => d.optionKey).join(', ')} had 0 choices).`;
    }
    if (hasDefectiveKeyAlert) {
      distractorEfficiencyWarning = `Negative discrimination (d = ${dIndex}): Lower scoring students outperformed higher scorers. Verify if answer key "${correctKey}" is correct.`;
    }

    return {
      questionId: q.id,
      questionIndex: idx + 1,
      questionText: q.questionText,
      topic: q.topic || 'General Mathematics',
      sectionName: q.sectionName,
      correctAnswer: correctKey,
      totalAttempts: candidatePool,
      correctAttempts: correctCount,
      pValue,
      difficultyLabel,
      difficultyColor,
      dIndex,
      discriminationLabel,
      discriminationColor,
      distractors,
      distractorEfficiencyWarning,
      hasDefectiveKeyAlert,
    };
  });
}
