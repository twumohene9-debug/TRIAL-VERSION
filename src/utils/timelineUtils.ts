import { QuizConfig } from '../types';

export type TimelineStatus = 'open_access' | 'upcoming' | 'active' | 'expired';

export interface TimelineEvaluation {
  status: TimelineStatus;
  hasTimeline: boolean;
  releaseTime?: number; // epoch ms
  deadlineTime?: number; // epoch ms
  secondsUntilRelease?: number;
  secondsUntilDeadline?: number;
  formattedRelease?: string;
  formattedDeadline?: string;
  isEntryAllowed: boolean;
  message: string;
}

/**
 * Normalizes timeline fields to avoid arbitrary default deadlines
 * If blank, returns undefined rather than setting to current timestamp
 */
export function normalizeTimelinePayload<T extends Partial<QuizConfig>>(quiz: T): T {
  const cleanStartDate = quiz.startDate?.trim() || quiz.releaseDate?.trim() || undefined;
  const cleanEndDate = quiz.endDate?.trim() || quiz.submissionDeadline?.trim() || undefined;

  // Validate dates are real parsable timestamps
  const validStart = cleanStartDate && !isNaN(Date.parse(cleanStartDate)) ? new Date(cleanStartDate).toISOString() : undefined;
  const validEnd = cleanEndDate && !isNaN(Date.parse(cleanEndDate)) ? new Date(cleanEndDate).toISOString() : undefined;

  return {
    ...quiz,
    startDate: validStart,
    releaseDate: validStart,
    endDate: validEnd,
    submissionDeadline: validEnd,
  };
}

/**
 * Validates that End Date / Deadline is strictly after Start Date / Release Time
 */
export function validateTimelineDates(
  startDateStr?: string,
  endDateStr?: string
): { isValid: boolean; error?: string } {
  if (!startDateStr && !endDateStr) {
    return { isValid: true }; // Open access
  }

  const startMs = startDateStr ? Date.parse(startDateStr) : NaN;
  const endMs = endDateStr ? Date.parse(endDateStr) : NaN;

  if (startDateStr && isNaN(startMs)) {
    return { isValid: false, error: 'Start Date & Release Time is not a valid date format.' };
  }

  if (endDateStr && isNaN(endMs)) {
    return { isValid: false, error: 'End Date / Deadline is not a valid date format.' };
  }

  if (!isNaN(startMs) && !isNaN(endMs)) {
    if (endMs <= startMs) {
      return {
        isValid: false,
        error: 'The Submission Deadline must be scheduled after the Start Date & Release Time.',
      };
    }
  }

  return { isValid: true };
}

/**
 * Evaluates the current timeline state of a quiz relative to a reference time (default: Date.now())
 */
export function evaluateTimeline(quiz?: QuizConfig | null, now: number = Date.now()): TimelineEvaluation {
  if (!quiz) {
    return {
      status: 'open_access',
      hasTimeline: false,
      isEntryAllowed: true,
      message: 'Assessment is open for immediate access.',
    };
  }

  const rawStart = quiz.startDate || quiz.releaseDate;
  const rawEnd = quiz.endDate || quiz.submissionDeadline;

  const startMs = rawStart && !isNaN(Date.parse(rawStart)) ? new Date(rawStart).getTime() : undefined;
  const endMs = rawEnd && !isNaN(Date.parse(rawEnd)) ? new Date(rawEnd).getTime() : undefined;

  const hasTimeline = Boolean(startMs || endMs);

  if (!hasTimeline) {
    return {
      status: 'open_access',
      hasTimeline: false,
      isEntryAllowed: true,
      message: 'Assessment has open access with no scheduled deadline constraints.',
    };
  }

  const formattedRelease = startMs
    ? new Date(startMs).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : undefined;

  const formattedDeadline = endMs
    ? new Date(endMs).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : undefined;

  // Case 1: Scheduled in the future (Upcoming)
  if (startMs && now < startMs) {
    const secondsUntilRelease = Math.max(0, Math.ceil((startMs - now) / 1000));
    return {
      status: 'upcoming',
      hasTimeline: true,
      releaseTime: startMs,
      deadlineTime: endMs,
      secondsUntilRelease,
      secondsUntilDeadline: endMs ? Math.max(0, Math.ceil((endMs - now) / 1000)) : undefined,
      formattedRelease,
      formattedDeadline,
      isEntryAllowed: false,
      message: `Assessment is scheduled and will open on ${formattedRelease}.`,
    };
  }

  // Case 2: Deadline passed (Expired)
  if (endMs && now >= endMs) {
    return {
      status: 'expired',
      hasTimeline: true,
      releaseTime: startMs,
      deadlineTime: endMs,
      secondsUntilRelease: 0,
      secondsUntilDeadline: 0,
      formattedRelease,
      formattedDeadline,
      isEntryAllowed: false,
      message: `The submission deadline passed on ${formattedDeadline}. Access is closed.`,
    };
  }

  // Case 3: Active Window (Open now, before deadline if set)
  const secondsUntilDeadline = endMs ? Math.max(0, Math.ceil((endMs - now) / 1000)) : undefined;

  return {
    status: 'active',
    hasTimeline: true,
    releaseTime: startMs,
    deadlineTime: endMs,
    secondsUntilRelease: 0,
    secondsUntilDeadline,
    formattedRelease,
    formattedDeadline,
    isEntryAllowed: true,
    message: endMs
      ? `Assessment is active. Submissions close on ${formattedDeadline}.`
      : `Assessment opened on ${formattedRelease || 'now'} with open-ended deadline.`,
  };
}

/**
 * Calculates remaining exam seconds dynamically respecting both duration limit and deadline cutoff.
 */
export function calculateEffectiveExamDurationSeconds(
  durationMinutes: number,
  deadlineStr?: string,
  now: number = Date.now()
): { effectiveSeconds: number; isCappedByDeadline: boolean; deadlineSecondsLeft?: number } {
  const baseDurationSeconds = Math.max(60, (durationMinutes || 60) * 60);

  if (!deadlineStr || isNaN(Date.parse(deadlineStr))) {
    return {
      effectiveSeconds: baseDurationSeconds,
      isCappedByDeadline: false,
    };
  }

  const deadlineMs = new Date(deadlineStr).getTime();
  const deadlineSecondsLeft = Math.max(0, Math.floor((deadlineMs - now) / 1000));

  if (deadlineSecondsLeft < baseDurationSeconds) {
    return {
      effectiveSeconds: deadlineSecondsLeft,
      isCappedByDeadline: true,
      deadlineSecondsLeft,
    };
  }

  return {
    effectiveSeconds: baseDurationSeconds,
    isCappedByDeadline: false,
    deadlineSecondsLeft,
  };
}

/**
 * Formats a count of seconds into human-readable digital or verbose string
 */
export function formatCountdownString(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00';

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }
  if (hours > 0) {
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * Converts ISO string to datetime-local input string (YYYY-MM-DDTHH:mm)
 */
export function isoToDatetimeLocal(isoStr?: string): string {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Converts datetime-local input string to ISO 8601 string
 */
export function datetimeLocalToIso(localStr?: string): string | undefined {
  if (!localStr || !localStr.trim()) return undefined;
  const date = new Date(localStr);
  if (isNaN(date.getTime())) return undefined;
  return date.toISOString();
}
