import { StudentSubmission } from '../types';

/**
 * Deduplicates submissions by student identity and quiz ID.
 * Keeps the latest submission (or highest score) and calculates attempt counts.
 */
export function deduplicateSubmissions(
  submissions: StudentSubmission[],
  strategy: 'latest' | 'highest' = 'latest'
): StudentSubmission[] {
  if (!Array.isArray(submissions) || submissions.length === 0) return [];

  const map = new Map<string, { latest: StudentSubmission; highest: StudentSubmission; count: number }>();

  // Process in chronological order
  const sorted = [...submissions].sort(
    (a, b) => new Date(a.submittedAt || 0).getTime() - new Date(b.submittedAt || 0).getTime()
  );

  for (const sub of sorted) {
    const studentIdPart = (sub.studentId && sub.studentId.trim() !== '') ? sub.studentId.trim().toLowerCase().replace(/\s+/g, '') : '';
    const studentEmailPart = (sub.studentEmail && sub.studentEmail.trim() !== '') ? sub.studentEmail.trim().toLowerCase().replace(/\s+/g, '') : '';
    const studentNamePart = (sub.studentName && sub.studentName.trim() !== '') ? sub.studentName.trim().toLowerCase().replace(/\s+/g, ' ') : '';
    const classGroupPart = (sub.classGroup && sub.classGroup.trim() !== '') ? sub.classGroup.trim().toLowerCase().replace(/\s+/g, ' ') : '';

    // Only combine if there is a strict matching student identity, otherwise use submission ID to preserve every distinct student
    const studentKey = studentIdPart 
      ? `id_${studentIdPart}` 
      : studentEmailPart 
      ? `email_${studentEmailPart}` 
      : studentNamePart 
      ? `name_${studentNamePart}_${classGroupPart}` 
      : `sub_${sub.id}`;

    // Normalize quiz key to group matching quizzes regardless of title, id, or code casing/spacing
    const rawQuizKey = sub.quizId || (sub as any).quizCode || sub.quizTitle || 'default-quiz';
    const quizKey = String(rawQuizKey).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const uniqueKey = `${studentKey}:::${quizKey}`;

    if (!map.has(uniqueKey)) {
      map.set(uniqueKey, {
        latest: sub,
        highest: sub,
        count: 1,
      });
    } else {
      const entry = map.get(uniqueKey)!;
      entry.count += 1;
      // Preserve newer timestamp
      const prevTime = new Date(entry.latest.submittedAt || 0).getTime();
      const currTime = new Date(sub.submittedAt || 0).getTime();
      if (currTime >= prevTime) {
        entry.latest = sub;
      }
      if (sub.percentage > entry.highest.percentage || (sub.percentage === entry.highest.percentage && sub.totalScore > entry.highest.totalScore)) {
        entry.highest = sub;
      }
    }
  }

  // Return formatted unique submissions with attempt counts
  const results: StudentSubmission[] = [];
  for (const entry of map.values()) {
    const selected = strategy === 'highest' ? entry.highest : entry.latest;
    results.push({
      ...selected,
    });
  }

  // Return sorted with newest first
  return results.sort(
    (a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
  );
}

/**
 * Identifies IDs of redundant duplicate submissions to permanently purge them.
 * Keeps the latest submission per candidate and returns the IDs that should be removed.
 */
export function findDuplicateSubmissionIds(submissions: StudentSubmission[]): string[] {
  if (!Array.isArray(submissions) || submissions.length <= 1) return [];

  const map = new Map<string, { keptId: string; duplicateIds: string[] }>();

  // Sort chronological (oldest to newest)
  const sorted = [...submissions].sort(
    (a, b) => new Date(a.submittedAt || 0).getTime() - new Date(b.submittedAt || 0).getTime()
  );

  for (const sub of sorted) {
    const studentIdPart = (sub.studentId && sub.studentId.trim() !== '') ? sub.studentId.trim().toLowerCase().replace(/\s+/g, '') : '';
    const studentEmailPart = (sub.studentEmail && sub.studentEmail.trim() !== '') ? sub.studentEmail.trim().toLowerCase().replace(/\s+/g, '') : '';
    const studentNamePart = (sub.studentName && sub.studentName.trim() !== '') ? sub.studentName.trim().toLowerCase().replace(/\s+/g, ' ') : '';
    const classGroupPart = (sub.classGroup && sub.classGroup.trim() !== '') ? sub.classGroup.trim().toLowerCase().replace(/\s+/g, ' ') : '';

    const studentKey = studentIdPart 
      ? `id_${studentIdPart}` 
      : studentEmailPart 
      ? `email_${studentEmailPart}` 
      : studentNamePart 
      ? `name_${studentNamePart}_${classGroupPart}` 
      : `sub_${sub.id}`;

    const rawQuizKey = sub.quizId || (sub as any).quizCode || sub.quizTitle || 'default-quiz';
    const quizKey = String(rawQuizKey).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const uniqueKey = `${studentKey}:::${quizKey}`;

    if (!map.has(uniqueKey)) {
      map.set(uniqueKey, {
        keptId: sub.id,
        duplicateIds: [],
      });
    } else {
      const entry = map.get(uniqueKey)!;
      // Mark previously kept as duplicate, update keptId to newer submission
      entry.duplicateIds.push(entry.keptId);
      entry.keptId = sub.id;
    }
  }

  const allDupes: string[] = [];
  for (const entry of map.values()) {
    allDupes.push(...entry.duplicateIds);
  }
  return allDupes;
}

/**
 * Saves a submission to local offline storage and offline sync queue
 */
export function saveOfflineSubmission(submission: StudentSubmission): void {
  try {
    const existingRaw = localStorage.getItem('joy_offline_submissions');
    const existing: StudentSubmission[] = existingRaw ? JSON.parse(existingRaw) : [];
    
    // Add new submission
    const updated = [submission, ...existing.filter((s) => s.id !== submission.id)];
    localStorage.setItem('joy_offline_submissions', JSON.stringify(updated));

    // Also add to outgoing sync queue
    const queueRaw = localStorage.getItem('joy_sync_queue');
    const queue: StudentSubmission[] = queueRaw ? JSON.parse(queueRaw) : [];
    queue.push(submission);
    localStorage.setItem('joy_sync_queue', JSON.stringify(queue));
  } catch (err) {
    console.error('Error saving offline submission:', err);
  }
}

/**
 * Retrieves all stored offline submissions
 */
export function getOfflineSubmissions(): StudentSubmission[] {
  try {
    const raw = localStorage.getItem('joy_offline_submissions');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export interface SubmissionLockRecord {
  quizId: string;
  studentName: string;
  studentIdentifier: string;
  submissionId: string;
  submittedAt: string;
  score?: number;
  maxScore?: number;
  percentage?: number;
}

/**
 * Checks if a candidate with the given name and ID/email has already submitted this quiz.
 * Inspects the provided active submissions array, offline cached submissions, and local lock registry.
 */
export function checkIfStudentAlreadySubmitted(
  submissions: StudentSubmission[],
  quizIdOrCode: string,
  studentName: string,
  studentIdentifier: string
): StudentSubmission | null {
  const normQuiz = (quizIdOrCode || '').trim().toLowerCase();
  const normName = (studentName || '').trim().toLowerCase();
  const normIdent = (studentIdentifier || '').trim().toLowerCase();

  // 0. Check if this browser has already completed this quiz under Single Attempt Mode
  const browserCheck = isBrowserQuizAttemptLocked(quizIdOrCode);
  if (browserCheck.locked && browserCheck.submission) {
    return browserCheck.submission;
  }

  if (!normName && !normIdent) return null;

  // 1. Check passed active submissions
  const allSubmissions = [...submissions, ...getOfflineSubmissions()];

  for (const sub of allSubmissions) {
    const subQuizId = (sub.quizId || (sub as any).quizCode || sub.quizTitle || '').trim().toLowerCase();
    const matchesQuiz = subQuizId === normQuiz || (subQuizId && normQuiz && (subQuizId.includes(normQuiz) || normQuiz.includes(subQuizId)));
    if (!matchesQuiz) continue;

    const subId = (sub.studentId || '').trim().toLowerCase();
    const subEmail = (sub.studentEmail || '').trim().toLowerCase();
    const subName = (sub.studentName || '').trim().toLowerCase();

    // Check match on ID
    if (normIdent && subId && (normIdent === subId || normIdent.replace(/[^a-z0-9]/g, '') === subId.replace(/[^a-z0-9]/g, ''))) {
      return sub;
    }
    // Check match on Email
    if (normIdent && subEmail && normIdent === subEmail) {
      return sub;
    }
    // Check match on Name + Identifier or identical Full Name
    if (normName && subName && normName === subName) {
      if (!normIdent || !subId || normIdent === subId || normIdent === subEmail) {
        return sub;
      }
    }
  }

  // 2. Check local lock registry in localStorage
  try {
    const locksRaw = localStorage.getItem('joy_submitted_locks');
    if (locksRaw) {
      const locks: Record<string, SubmissionLockRecord> = JSON.parse(locksRaw);
      for (const key of Object.keys(locks)) {
        const lock = locks[key];
        if (!lock) continue;
        const lQuiz = (lock.quizId || '').trim().toLowerCase();
        const matchesQuiz = lQuiz === normQuiz || (lQuiz && normQuiz && (lQuiz.includes(normQuiz) || normQuiz.includes(lQuiz)));
        if (!matchesQuiz) continue;

        const lIdent = (lock.studentIdentifier || '').trim().toLowerCase();
        const lName = (lock.studentName || '').trim().toLowerCase();

        if (
          (normIdent && lIdent && normIdent === lIdent) ||
          (normName && lName && normName === lName && (!normIdent || normIdent === lIdent))
        ) {
          // Construct lightweight submission representation from lock
          return {
            id: lock.submissionId || `lock-${Date.now()}`,
            quizId: lock.quizId,
            studentName: lock.studentName,
            studentEmail: lock.studentIdentifier.includes('@') ? lock.studentIdentifier : '',
            studentId: lock.studentIdentifier,
            school: '',
            classGroup: '',
            answers: {},
            bookmarkedQuestions: [],
            submittedAt: lock.submittedAt || new Date().toISOString(),
            timeSpentSeconds: 0,
            totalScore: lock.score || 0,
            maxScore: lock.maxScore || 40,
            percentage: lock.percentage || 0,
            sectionScores: {},
            topicScores: {},
          };
        }
      }
    }
  } catch {}

  return null;
}

/**
 * Records a permanent submission lock in the local device storage
 */
export function setQuizSubmissionLock(
  quizIdOrCode: string,
  studentName: string,
  studentIdentifier: string,
  submissionId: string,
  score?: number,
  maxScore?: number,
  percentage?: number
): void {
  try {
    const locksRaw = localStorage.getItem('joy_submitted_locks');
    const locks: Record<string, SubmissionLockRecord> = locksRaw ? JSON.parse(locksRaw) : {};
    
    const key = `${(quizIdOrCode || '').trim().toLowerCase()}:::${(studentIdentifier || studentName || '').trim().toLowerCase()}`;
    locks[key] = {
      quizId: quizIdOrCode,
      studentName,
      studentIdentifier,
      submissionId,
      submittedAt: new Date().toISOString(),
      score,
      maxScore,
      percentage,
    };

    localStorage.setItem('joy_submitted_locks', JSON.stringify(locks));
  } catch (e) {
    console.warn('Failed to store submission lock:', e);
  }
}

/**
 * Removes a submission lock for a student on a specific quiz (called when teacher unlocks attempt)
 */
export function removeQuizSubmissionLock(
  quizIdOrCode: string,
  studentIdentifierOrName: string
): void {
  try {
    const locksRaw = localStorage.getItem('joy_submitted_locks');
    if (!locksRaw) return;
    const locks: Record<string, SubmissionLockRecord> = JSON.parse(locksRaw);
    const normQuiz = (quizIdOrCode || '').trim().toLowerCase();
    const normTarget = (studentIdentifierOrName || '').trim().toLowerCase();

    let modified = false;
    for (const key of Object.keys(locks)) {
      const lock = locks[key];
      if (!lock) continue;
      const lQuiz = (lock.quizId || '').trim().toLowerCase();
      const lIdent = (lock.studentIdentifier || '').trim().toLowerCase();
      const lName = (lock.studentName || '').trim().toLowerCase();

      if (
        (lQuiz === normQuiz || !normQuiz) &&
        (lIdent === normTarget || lName === normTarget || normTarget.includes(lIdent) || normTarget.includes(lName))
      ) {
        delete locks[key];
        modified = true;
      }
    }

    if (modified) {
      localStorage.setItem('joy_submitted_locks', JSON.stringify(locks));
    }
  } catch (e) {
    console.warn('Failed to remove submission lock:', e);
  }
}

/**
 * Checks if the current browser/device has already submitted an attempt for this quiz.
 * Enforces one attempt per browser when single attempt mode is active.
 */
export function isBrowserQuizAttemptLocked(quizIdOrCode: string): { locked: boolean; submission?: StudentSubmission } {
  if (!quizIdOrCode) return { locked: false };
  const normTarget = quizIdOrCode.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  try {
    const raw = localStorage.getItem('joy_browser_completed_quizzes');
    if (raw) {
      const records: Record<string, any> = JSON.parse(raw);
      for (const [key, item] of Object.entries(records)) {
        if (!item) continue;
        const normKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const normItemQuiz = (item.quizId || item.quizCode || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normKey === normTarget || normItemQuiz === normTarget || (normTarget && normKey.includes(normTarget)) || (normTarget && normItemQuiz.includes(normTarget))) {
          return {
            locked: true,
            submission: {
              id: item.submissionId || item.id || `lock-browser-${Date.now()}`,
              quizId: item.quizId || quizIdOrCode,
              studentName: item.studentName || 'Candidate on this browser',
              studentEmail: item.studentEmail || '',
              studentId: item.studentId || 'Browser Record',
              school: item.school || '',
              classGroup: item.classGroup || '',
              answers: item.answers || {},
              bookmarkedQuestions: [],
              submittedAt: item.submittedAt || new Date().toISOString(),
              timeSpentSeconds: item.timeSpentSeconds || 0,
              totalScore: item.score ?? item.totalScore ?? 0,
              maxScore: item.maxScore || 40,
              percentage: item.percentage || 0,
              sectionScores: {},
              topicScores: {},
            },
          };
        }
      }
    }
  } catch (e) {}

  return { locked: false };
}

/**
 * Records this browser as having submitted an attempt for a quiz.
 */
export function setBrowserQuizAttemptLock(
  quizIdOrCode: string,
  sub: Partial<StudentSubmission> & { score?: number; maxScore?: number; percentage?: number }
): void {
  if (!quizIdOrCode) return;
  const normKey = quizIdOrCode.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  try {
    const raw = localStorage.getItem('joy_browser_completed_quizzes');
    const records: Record<string, any> = raw ? JSON.parse(raw) : {};
    records[normKey] = {
      quizId: quizIdOrCode,
      submissionId: sub.id || `sub-dev-${Date.now()}`,
      studentName: sub.studentName || '',
      studentId: sub.studentId || '',
      studentEmail: sub.studentEmail || '',
      score: sub.score ?? sub.totalScore ?? 0,
      maxScore: sub.maxScore || 40,
      percentage: sub.percentage || 0,
      submittedAt: sub.submittedAt || new Date().toISOString(),
    };
    localStorage.setItem('joy_browser_completed_quizzes', JSON.stringify(records));
  } catch (e) {}
}

/**
 * Clears the browser attempt lock for a quiz (e.g. when teacher unlocks attempt or clears records).
 */
export function clearBrowserQuizAttemptLock(quizIdOrCode?: string): void {
  try {
    if (!quizIdOrCode || quizIdOrCode === 'all') {
      localStorage.removeItem('joy_browser_completed_quizzes');
      return;
    }
    const raw = localStorage.getItem('joy_browser_completed_quizzes');
    if (!raw) return;
    const records: Record<string, any> = JSON.parse(raw);
    const normTarget = quizIdOrCode.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    let modified = false;
    for (const key of Object.keys(records)) {
      const normKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const normItemQuiz = (records[key]?.quizId || records[key]?.quizCode || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normKey === normTarget || normItemQuiz === normTarget) {
        delete records[key];
        modified = true;
      }
    }
    if (modified) {
      localStorage.setItem('joy_browser_completed_quizzes', JSON.stringify(records));
    }
  } catch (e) {}
}


