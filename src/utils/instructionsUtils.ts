import { QuizConfig } from '../types';

export const DEFAULT_QUIZ_INSTRUCTIONS: string[] = [
  "Ensure a quiet, distraction-free environment and adequate battery power on your device before starting.",
  "Read each question carefully; each item has exactly one correct answer out of the options provided (A–D).",
  "The timer counts down continuously and the assessment will automatically submit when the allotted duration expires.",
  "Leaving the examination tab, opening new windows, or minimizing the browser triggers automatic integrity warning logs.",
  "Review all answered and bookmarked questions carefully before clicking the final 'Submit Assessment' button."
];

export const THREE_TAB_PENALTY_INSTRUCTION =
  "🚨 STRICT 3-STRIKE TAB INTEGRITY RULE: Do not switch tabs, minimize the window, or leave this screen. 1st violation: -2 mins deduction; 2nd violation: -5 mins deduction; 3rd violation: IMMEDIATE AUTOMATIC TEST FORFEITURE & SUBMISSION.";

export const TAB_MONITORING_INSTRUCTION =
  "⚠️ Proctored Tab Monitoring Active: All tab switches, browser focus loss, and window minimization events are timestamped and logged live for instructor surveillance.";

/**
 * Extracts or generates the official 5 bullet points of instructions for a given quiz.
 */
export function getQuizInstructionBullets(quiz?: Partial<QuizConfig> | null): string[] {
  if (!quiz) return [...DEFAULT_QUIZ_INSTRUCTIONS];

  let bullets: string[] = [];

  // 1. If explicit instructionBullets array exists and has at least 3 custom entries
  if (Array.isArray(quiz.instructionBullets) && quiz.instructionBullets.length >= 3) {
    const valid = quiz.instructionBullets.map(b => b.trim()).filter(b => b.length > 0);
    if (valid.length >= 3) {
      bullets = [...valid];
    }
  }

  // 2. If single instructions string exists and contains formatted multi-line instructions
  if (bullets.length === 0 && quiz.instructions && typeof quiz.instructions === 'string' && quiz.instructions.trim().length > 0) {
    const raw = quiz.instructions.trim();
    // Split by newlines or bullets
    const lines = raw
      .split(/\r?\n|•/)
      .map(s => s.trim().replace(/^[-*•\d.)\s]+/, '').trim())
      .filter(s => s.length > 15);

    if (lines.length >= 4) {
      bullets = lines.slice(0, 5);
    }
  }

  // 3. Fallback to standardized official 5 default examination rules
  if (bullets.length === 0) {
    bullets = [...DEFAULT_QUIZ_INSTRUCTIONS];
  }

  // Ensure all bullet points use standard 4-option (A–D) references instead of outdated (A-E)
  return bullets.slice(0, 5).map(b =>
    b.replace(/\(A\s*[–\-]\s*E\)/gi, '(A–D)')
     .replace(/\bA\s*[–\-]\s*E\b/gi, 'A–D')
     .replace(/\(A\s+to\s+E\)/gi, '(A–D)')
     .replace(/\bA\s+to\s+E\b/gi, 'A to D')
  );
}

/**
 * Ensures a quiz object has a synchronized instructionBullets field.
 */
export function syncQuizInstructions(quiz: QuizConfig): QuizConfig {
  const bullets = getQuizInstructionBullets(quiz);
  return {
    ...quiz,
    instructionBullets: bullets,
    instructions: quiz.instructions || bullets.join('. ')
  };
}

