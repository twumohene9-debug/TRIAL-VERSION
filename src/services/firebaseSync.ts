import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { QuizConfig, StudentSubmission, TeacherAccessCode, QuizSection, Question, SystemSettings, AdminProfile, ActiveStudentSession, ProctorWarning, CameraCaptureItem } from '../types';

// Collection references
const QUIZZES_COLLECTION = 'quizzes';
const SUBMISSIONS_COLLECTION = 'submissions';
const SUBMISSION_DETAILS_COLLECTION = 'submission_details';
const ACTIVE_SESSIONS_COLLECTION = 'active_sessions';
const TEACHER_WARNINGS_COLLECTION = 'teacher_warnings';
const CAMERA_CAPTURES_COLLECTION = 'camera_captures';
const TEACHER_CODES_COLLECTION = 'teacher_codes';
const APP_STATE_COLLECTION = 'app_state';

/**
 * Fetch Admin Profile from Firestore
 */
export async function fetchAdminProfileFromFirestore(): Promise<AdminProfile | null> {
  try {
    const docRef = doc(db, APP_STATE_COLLECTION, 'admin_profile');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as AdminProfile;
    }
    return null;
  } catch (err) {
    console.warn('Could not fetch admin profile from Firestore:', err);
    return null;
  }
}

/**
 * Save Admin Profile to Firestore
 */
export async function saveAdminProfileToFirestore(profile: AdminProfile): Promise<void> {
  try {
    const docRef = doc(db, APP_STATE_COLLECTION, 'admin_profile');
    const sanitized = JSON.parse(JSON.stringify({
      ...profile,
      updatedAt: new Date().toISOString()
    }));
    await setDoc(docRef, sanitized, { merge: true });
  } catch (err) {
    console.error('Error saving admin profile to Firestore:', err);
    throw err;
  }
}

/**
 * Subscribe to Admin Profile in real-time
 */
export function subscribeToAdminProfile(callback: (profile: AdminProfile) => void): () => void {
  try {
    const docRef = doc(db, APP_STATE_COLLECTION, 'admin_profile');
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          callback(snap.data() as AdminProfile);
        }
      },
      (err) => {
        console.warn('Admin profile Firestore listener warning:', err);
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to admin profile:', err);
    return () => {};
  }
}

/**
 * Fetch a single quiz from Firestore by ID or Quiz Code with multi-level lookup
 */
export async function fetchQuizFromFirestore(idOrCode: string): Promise<QuizConfig | null> {
  if (!idOrCode) return null;
  const cleanKey = idOrCode.trim();
  try {
    // 1. Direct Document ID lookup (exact, lowercase, and uppercase)
    const docRefDirect = doc(db, QUIZZES_COLLECTION, cleanKey);
    const snapDirect = await getDoc(docRefDirect);
    if (snapDirect.exists()) {
      return { ...(snapDirect.data() as QuizConfig), id: snapDirect.id };
    }

    if (cleanKey !== cleanKey.toUpperCase()) {
      const docRefUpper = doc(db, QUIZZES_COLLECTION, cleanKey.toUpperCase());
      const snapUpper = await getDoc(docRefUpper);
      if (snapUpper.exists()) {
        return { ...(snapUpper.data() as QuizConfig), id: snapUpper.id };
      }
    }

    // 2. Query Firestore collection where code matches exactly
    try {
      const qCode = query(collection(db, QUIZZES_COLLECTION), where('code', '==', cleanKey));
      const qCodeSnap = await getDocs(qCode);
      if (!qCodeSnap.empty) {
        const d = qCodeSnap.docs[0];
        return { ...(d.data() as QuizConfig), id: d.id };
      }

      const qCodeUpper = query(collection(db, QUIZZES_COLLECTION), where('code', '==', cleanKey.toUpperCase()));
      const qCodeUpperSnap = await getDocs(qCodeUpper);
      if (!qCodeUpperSnap.empty) {
        const d = qCodeUpperSnap.docs[0];
        return { ...(d.data() as QuizConfig), id: d.id };
      }
    } catch (queryErr) {
      console.warn('Firestore code query error, falling back to full collection scan:', queryErr);
    }

    // 3. Fallback: collection scan prioritizing exact case-insensitive match
    const qSnap = await getDocs(collection(db, QUIZZES_COLLECTION));
    const cleanNormalized = cleanKey.toUpperCase().replace(/\s+/g, '');
    let exactMatched: QuizConfig | null = null;
    let prefixMatched: QuizConfig | null = null;

    qSnap.forEach((d) => {
      const data = d.data() as QuizConfig;
      const dCode = (data.code || '').toUpperCase().replace(/\s+/g, '');
      const dId = (d.id || data.id || '').toUpperCase().replace(/\s+/g, '');

      if (dCode === cleanNormalized || dId === cleanNormalized) {
        exactMatched = { ...data, id: d.id };
      } else if (!prefixMatched && !exactMatched && dCode.startsWith(cleanNormalized)) {
        prefixMatched = { ...data, id: d.id };
      }
    });

    return exactMatched || prefixMatched;
  } catch (err) {
    console.warn('Firestore quiz direct fetch error:', err);
    return null;
  }
}

/**
 * Fetch all quizzes from Firestore (deduplicated by code/id)
 */
export async function fetchAllQuizzesFromFirestore(): Promise<QuizConfig[]> {
  try {
    const snap = await getDocs(collection(db, QUIZZES_COLLECTION));
    const map = new Map<string, QuizConfig>();
    snap.forEach((d) => {
      const data = d.data() as QuizConfig;
      const key = (data.code || data.id || d.id).trim().toUpperCase();
      if (!map.has(key) || (data.questions && data.questions.length > (map.get(key)?.questions?.length || 0))) {
        map.set(key, { ...data, id: data.id || d.id });
      }
    });
    return Array.from(map.values());
  } catch (err) {
    console.warn('Firestore fetchAllQuizzes error:', err);
    return [];
  }
}

/**
 * Subscribe to all Quizzes in real-time across all devices & browsers
 */
export function subscribeToQuizzes(callback: (quizzes: QuizConfig[]) => void) {
  try {
    const q = collection(db, QUIZZES_COLLECTION);
    return onSnapshot(
      q,
      (snapshot) => {
        const map = new Map<string, QuizConfig>();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as QuizConfig;
          const key = (data.code || data.id || docSnap.id).trim().toUpperCase();
          const docId = data.id || docSnap.id;
          const currentItem = { ...data, id: docId };

          if (!map.has(key)) {
            map.set(key, currentItem);
          } else {
            const existing = map.get(key)!;
            const existingTime = new Date(existing.updatedAt || 0).getTime();
            const currentTime = new Date(data.updatedAt || 0).getTime();

            if (currentTime >= existingTime || (data.questions && data.questions.length > (existing.questions?.length || 0))) {
              map.set(key, { ...existing, ...currentItem });
            }
          }
        });
        callback(Array.from(map.values()));
      },
      (error) => {
        console.warn('Firestore quizzes listener error:', error);
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to quizzes:', err);
    return () => {};
  }
}

/**
 * Subscribe to all Student Submissions in real-time
 */
export function subscribeToSubmissions(callback: (submissions: StudentSubmission[]) => void) {
  try {
    const q = collection(db, SUBMISSIONS_COLLECTION);
    return onSnapshot(
      q,
      (snapshot) => {
        const list: StudentSubmission[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as StudentSubmission;
          list.push({ ...data, id: docSnap.id });
        });
        // Sort by submittedAt desc
        list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        callback(list);
      },
      (error) => {
        console.warn('Firestore submissions listener error:', error);
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to submissions:', err);
    return () => {};
  }
}

/**
 * Subscribe to Teacher Access Codes in real-time
 */
export function subscribeToTeacherCodes(callback: (codes: TeacherAccessCode[]) => void) {
  try {
    const docRef = doc(db, APP_STATE_COLLECTION, 'teacher_access_codes');
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (Array.isArray(data?.codes)) {
            callback(data.codes);
          }
        }
      },
      (error) => {
        console.warn('Firestore teacher codes listener error:', error);
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to teacher codes:', err);
    return () => {};
  }
}

/**
 * Subscribe to Quiz Sections in real-time
 */
export function subscribeToSections(callback: (sections: QuizSection[]) => void) {
  try {
    const docRef = doc(db, APP_STATE_COLLECTION, 'sections');
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (Array.isArray(data?.sections)) {
            callback(data.sections);
          }
        }
      },
      (error) => {
        console.warn('Firestore sections listener error:', error);
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to sections:', err);
    return () => {};
  }
}

/**
 * Save or update a quiz in Firestore (saves under ID and Code for instant direct lookups from any device)
 */
export async function saveQuizToFirestore(quiz: QuizConfig): Promise<void> {
  try {
    const quizId = quiz.id || quiz.code || `quiz-${Date.now()}`;
    const docRef = doc(db, QUIZZES_COLLECTION, quizId);
    
    // Clean undefined fields & normalize timeline
    const cleanStartDate = (quiz.startDate && typeof quiz.startDate === 'string' && quiz.startDate.trim() !== '')
      ? quiz.startDate.trim()
      : ((quiz.releaseDate && typeof quiz.releaseDate === 'string' && quiz.releaseDate.trim() !== '') ? quiz.releaseDate.trim() : undefined);

    const cleanEndDate = (quiz.endDate && typeof quiz.endDate === 'string' && quiz.endDate.trim() !== '')
      ? quiz.endDate.trim()
      : ((quiz.submissionDeadline && typeof quiz.submissionDeadline === 'string' && quiz.submissionDeadline.trim() !== '') ? quiz.submissionDeadline.trim() : undefined);

    const sanitizedQuiz = JSON.parse(JSON.stringify({
      ...quiz,
      id: quizId,
      code: quiz.code || quizId,
      startDate: cleanStartDate,
      releaseDate: cleanStartDate,
      endDate: cleanEndDate,
      submissionDeadline: cleanEndDate,
      updatedAt: new Date().toISOString()
    }));

    await setDoc(docRef, sanitizedQuiz, { merge: true });

    // Also write alias document if code is different from id, so direct URL lookup by code is instant
    if (quiz.code && quiz.code.trim() !== '' && quiz.code.trim() !== quizId) {
      const aliasDocRef = doc(db, QUIZZES_COLLECTION, quiz.code.trim());
      await setDoc(aliasDocRef, sanitizedQuiz, { merge: true });
    }
  } catch (err) {
    console.error('Error saving quiz to Firestore:', err);
    throw err;
  }
}

/**
 * Delete a quiz from Firestore (and all aliases or matching documents)
 */
export async function deleteQuizFromFirestore(quizId: string, quizCode?: string): Promise<void> {
  try {
    const cleanId = (quizId || '').trim();
    const cleanCode = (quizCode || '').trim();

    // Direct document deletions
    if (cleanId) {
      await deleteDoc(doc(db, QUIZZES_COLLECTION, cleanId)).catch(() => {});
    }
    if (cleanCode && cleanCode !== cleanId) {
      await deleteDoc(doc(db, QUIZZES_COLLECTION, cleanCode)).catch(() => {});
    }

    // Comprehensive scan to eliminate any ghost alias or ID variants
    const snapshot = await getDocs(collection(db, QUIZZES_COLLECTION));
    const batch = writeBatch(db);
    let matchFound = false;

    snapshot.forEach((d) => {
      const data = d.data() as QuizConfig;
      const dId = (data.id || d.id || '').trim().toLowerCase();
      const dCode = (data.code || '').trim().toLowerCase();
      const targetId = cleanId.toLowerCase();
      const targetCode = cleanCode.toLowerCase();

      if (
        (targetId && (dId === targetId || dCode === targetId || d.id.toLowerCase() === targetId)) ||
        (targetCode && (dId === targetCode || dCode === targetCode || d.id.toLowerCase() === targetCode))
      ) {
        batch.delete(d.ref);
        matchFound = true;
      }
    });

    if (matchFound) {
      await batch.commit();
    }
  } catch (err) {
    console.error('Error deleting quiz from Firestore:', err);
    throw err;
  }
}

/**
 * Delete all quizzes from Firestore
 */
export async function clearAllQuizzesInFirestore(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, QUIZZES_COLLECTION));
    if (!snapshot.empty) {
      const batch = writeBatch(db);
      snapshot.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
      console.log('Cleared all quizzes from Firestore.');
    }
  } catch (err) {
    console.error('Error clearing all quizzes from Firestore:', err);
    throw err;
  }
}

/**
 * Save a student submission to Firestore.
 * Implements scalability optimization: saves a lightweight indexable summary to `submissions`
 * for fast list/dashboard queries and persists the full audit payload to `submission_details`.
 */
export async function saveSubmissionToFirestore(submission: StudentSubmission): Promise<void> {
  try {
    const subId = submission.id || `sub-${Date.now()}`;
    const docRef = doc(db, SUBMISSIONS_COLLECTION, subId);
    const detailsDocRef = doc(db, SUBMISSION_DETAILS_COLLECTION, subId);
    
    const sanitized = JSON.parse(JSON.stringify({
      ...submission,
      id: subId
    }));

    // 1. Primary submission document (contains all fields for backwards compatibility while keeping payload clean)
    await setDoc(docRef, sanitized, { merge: true });

    // 2. Separate dedicated details document for high-volume audit logs and granular diagnostics
    await setDoc(detailsDocRef, {
      submissionId: subId,
      studentId: submission.studentId,
      quizId: submission.quizId || submission.quizCode || '',
      answers: submission.answers || {},
      detailedAuditTrail: submission.integrityEvents || [],
      submittedAt: submission.submittedAt,
      savedAt: new Date().toISOString()
    }, { merge: true }).catch((detailErr) => {
      console.warn('Optional submission details partition write notice:', detailErr);
    });
  } catch (err) {
    console.error('Error saving submission to Firestore:', err);
    throw err;
  }
}

/**
 * Fetch full submission details on demand for granular review
 */
export async function fetchSubmissionDetailsFromFirestore(submissionId: string): Promise<any | null> {
  try {
    const docRef = doc(db, SUBMISSION_DETAILS_COLLECTION, submissionId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    console.warn('Could not fetch submission details partition:', err);
    return null;
  }
}

/**
 * Delete a student submission from Firestore
 */
export async function deleteSubmissionFromFirestore(submissionId: string): Promise<void> {
  try {
    const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
    const detailsDocRef = doc(db, SUBMISSION_DETAILS_COLLECTION, submissionId);
    await Promise.allSettled([
      deleteDoc(docRef),
      deleteDoc(detailsDocRef)
    ]);
  } catch (err) {
    console.error('Error deleting submission from Firestore:', err);
    throw err;
  }
}

/**
 * Clear all submissions in Firestore
 */
export async function clearAllSubmissionsInFirestore(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, SUBMISSIONS_COLLECTION));
    const batch = writeBatch(db);
    snapshot.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();

    // Clean up partition collection
    try {
      const detailsSnap = await getDocs(collection(db, SUBMISSION_DETAILS_COLLECTION));
      const detailsBatch = writeBatch(db);
      detailsSnap.forEach((d) => {
        detailsBatch.delete(d.ref);
      });
      await detailsBatch.commit();
    } catch (cleanErr) {
      console.warn('Submission details cleanup notice:', cleanErr);
    }
  } catch (err) {
    console.error('Error clearing submissions in Firestore:', err);
    throw err;
  }
}

/**
 * Save all teacher access codes to Firestore
 */
export async function saveTeacherCodesToFirestore(codes: TeacherAccessCode[]): Promise<void> {
  try {
    const docRef = doc(db, APP_STATE_COLLECTION, 'teacher_access_codes');
    await setDoc(docRef, { codes, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error('Error saving teacher codes to Firestore:', err);
  }
}

/**
 * Fetch teacher access codes from Firestore
 */
export async function fetchTeacherCodesFromFirestore(): Promise<TeacherAccessCode[]> {
  try {
    const docRef = doc(db, APP_STATE_COLLECTION, 'teacher_access_codes');
    const snap = await getDoc(docRef);
    if (snap.exists() && Array.isArray(snap.data().codes)) {
      return snap.data().codes as TeacherAccessCode[];
    }
    return [];
  } catch (err) {
    console.warn('Could not fetch teacher codes from Firestore:', err);
    return [];
  }
}

/**
 * Fetch global system settings from Firestore
 */
export async function fetchSystemSettingsFromFirestore(): Promise<SystemSettings | null> {
  try {
    const docRef = doc(db, APP_STATE_COLLECTION, 'system_settings');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as SystemSettings;
    }
    return null;
  } catch (err) {
    console.warn('Could not fetch system settings from Firestore:', err);
    return null;
  }
}

/**
 * Save global system settings to Firestore
 */
export async function saveSystemSettingsToFirestore(settings: SystemSettings): Promise<void> {
  try {
    const docRef = doc(db, APP_STATE_COLLECTION, 'system_settings');
    await setDoc(docRef, { ...settings, lastUpdated: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error('Error saving system settings to Firestore:', err);
  }
}

/**
 * Real-time listener for System Settings (e.g. Teacher registration lock/unlock)
 */
export function subscribeToSystemSettings(
  callback: (settings: SystemSettings) => void
): () => void {
  const docRef = doc(db, APP_STATE_COLLECTION, 'system_settings');
  const unsubscribe = onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as SystemSettings);
      }
    },
    (err) => {
      console.warn('System settings Firestore listener warning:', err);
    }
  );
  return unsubscribe;
}

/**
 * Save all sections to Firestore
 */
export async function saveSectionsToFirestore(sections: QuizSection[]): Promise<void> {
  try {
    const docRef = doc(db, APP_STATE_COLLECTION, 'sections');
    await setDoc(docRef, { sections, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error('Error saving sections to Firestore:', err);
  }
}

/**
 * Seed initial default quizzes if Firestore is completely empty
 */
export async function seedInitialQuizzesIfEmpty(defaultQuizzes: QuizConfig[]): Promise<void> {
  try {
    if (!defaultQuizzes || defaultQuizzes.length === 0) return;
    const snapshot = await getDocs(collection(db, QUIZZES_COLLECTION));
    if (snapshot.empty) {
      console.log('Seeding initial quizzes to Firestore for multi-device sync...');
      const batch = writeBatch(db);
      defaultQuizzes.forEach((quiz) => {
        const docRef = doc(db, QUIZZES_COLLECTION, quiz.id);
        batch.set(docRef, JSON.parse(JSON.stringify(quiz)));
      });
      await batch.commit();
      console.log('Seeded initial quizzes successfully.');
    }
  } catch (err) {
    console.warn('Initial seeding check error (non-fatal):', err);
  }
}

export interface FullSyncResult {
  success: boolean;
  message: string;
  source: 'firestore+server' | 'server-only' | 'firestore-only' | 'local-cached';
  timestamp: string;
  quizzes: QuizConfig[];
  submissions: StudentSubmission[];
  teacherAccessCodes?: TeacherAccessCode[];
  sections?: QuizSection[];
  systemSettings?: SystemSettings;
}

/**
 * Execute a complete bidirectional sync across Firestore, Express Server backend, and LocalStorage
 */
export async function performFullBidirectionalSync(localState: {
  quizzes: QuizConfig[];
  submissions: StudentSubmission[];
  teacherAccessCodes?: TeacherAccessCode[];
  sections?: QuizSection[];
  config?: QuizConfig;
  systemSettings?: SystemSettings;
}): Promise<FullSyncResult> {
  let firestoreQuizzes: QuizConfig[] = [];
  let firestoreSubmissions: StudentSubmission[] = [];
  let firestoreSettings: SystemSettings | null = null;
  let firestoreSuccess = false;

  // 1. Try pulling and seeding in Firestore
  try {
    const snapQ = await getDocs(collection(db, QUIZZES_COLLECTION));
    snapQ.forEach((d) => {
      firestoreQuizzes.push({ ...(d.data() as QuizConfig), id: d.id });
    });

    const snapS = await getDocs(collection(db, SUBMISSIONS_COLLECTION));
    snapS.forEach((d) => {
      firestoreSubmissions.push({ ...(d.data() as StudentSubmission), id: d.id });
    });

    try {
      const snapSet = await getDoc(doc(db, APP_STATE_COLLECTION, 'system_settings'));
      if (snapSet.exists()) {
        firestoreSettings = snapSet.data() as SystemSettings;
      }
    } catch (e) {}

    firestoreSuccess = true;
  } catch (err) {
    console.warn('Firestore direct sync attempt notice:', err);
  }

  // 2. Parallel push & pull with Express Server REST API
  let serverData: any = null;
  let serverSuccess = false;

  try {
    // Send local + firestore merged items to Server
    const res = await fetch('/api/sync/all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quizzes: localState.quizzes,
        submissions: localState.submissions,
        teacherAccessCodes: localState.teacherAccessCodes,
        sections: localState.sections,
        quizConfig: localState.config,
        systemSettings: localState.systemSettings,
      }),
    });

    if (res.ok) {
      serverData = await res.json();
      serverSuccess = true;
    }
  } catch (err) {
    console.warn('Server sync/all call notice:', err);
  }

  // 3. Consolidate quizzes
  let consolidatedQuizzes: QuizConfig[] = [];
  const deletedSet = new Set<string>();
  const mergedSettings = serverData?.systemSettings || firestoreSettings || localState.systemSettings;
  if (mergedSettings?.deletedQuizIds && Array.isArray(mergedSettings.deletedQuizIds)) {
    mergedSettings.deletedQuizIds.forEach((id: string) => deletedSet.add(id.toUpperCase()));
  }

  if (firestoreSuccess && firestoreQuizzes.length > 0) {
    const quizMap = new Map<string, QuizConfig>();
    firestoreQuizzes.forEach((q) => {
      const key = (q.code || q.id).toUpperCase();
      if (!deletedSet.has(key) && !deletedSet.has((q.id || '').toUpperCase())) {
        quizMap.set(key, q);
      }
    });
    if (serverData?.quizzes && Array.isArray(serverData.quizzes)) {
      serverData.quizzes.forEach((q: any) => {
        const key = (q.code || q.id || '').toUpperCase();
        if (!quizMap.has(key) && !deletedSet.has(key) && !deletedSet.has((q.id || '').toUpperCase())) {
          quizMap.set(key, q);
        }
      });
    }
    consolidatedQuizzes = Array.from(quizMap.values());
  } else if (serverSuccess && Array.isArray(serverData?.quizzes) && serverData.quizzes.length > 0) {
    consolidatedQuizzes = serverData.quizzes.filter((q: any) => {
      const key = (q.code || q.id || '').toUpperCase();
      return !deletedSet.has(key) && !deletedSet.has((q.id || '').toUpperCase());
    });
  } else {
    consolidatedQuizzes = localState.quizzes.filter((q: any) => {
      const key = (q.code || q.id || '').toUpperCase();
      return !deletedSet.has(key) && !deletedSet.has((q.id || '').toUpperCase());
    });
  }

  // 4. Consolidate submissions
  let consolidatedSubmissions: StudentSubmission[] = [];
  if (firestoreSuccess) {
    consolidatedSubmissions = firestoreSubmissions;
  } else if (serverSuccess && Array.isArray(serverData?.submissions)) {
    consolidatedSubmissions = serverData.submissions;
  } else {
    consolidatedSubmissions = localState.submissions;
  }
  consolidatedSubmissions.sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );

  // 5. Asynchronously persist missing items back to Firestore if Firestore is online
  if (firestoreSuccess) {
    try {
      const existingFirestoreIds = new Set(firestoreQuizzes.map((q) => q.id));
      const missingToSave = consolidatedQuizzes.filter((q) => !existingFirestoreIds.has(q.id));
      for (const q of missingToSave.slice(0, 10)) {
        saveQuizToFirestore(q).catch(() => {});
      }
    } catch (e) {
      // Non-fatal background sync
    }
  }

  const timestamp = new Date().toLocaleTimeString();
  let source: FullSyncResult['source'] = 'local-cached';
  if (firestoreSuccess && serverSuccess) source = 'firestore+server';
  else if (serverSuccess) source = 'server-only';
  else if (firestoreSuccess) source = 'firestore-only';

  // Consolidate Teacher Access Codes safely across local and server
  const teacherMap = new Map<string, TeacherAccessCode>();
  const getTeacherKey = (t: TeacherAccessCode) => {
    if (t.teacherEmail && t.teacherEmail.trim()) return `email:${t.teacherEmail.trim().toLowerCase()}`;
    if (t.code && t.code.trim()) return `code:${t.code.trim().toUpperCase()}`;
    if (t.pin && t.pin.trim()) return `code:${t.pin.trim().toUpperCase()}`;
    return `id:${t.id}`;
  };
  (localState.teacherAccessCodes || []).forEach((t) => teacherMap.set(getTeacherKey(t), t));
  (serverData?.teacherAccessCodes || []).forEach((t: TeacherAccessCode) => {
    const k = getTeacherKey(t);
    const existing = teacherMap.get(k);
    teacherMap.set(k, { ...existing, ...t });
  });
  const consolidatedTeacherCodes = Array.from(teacherMap.values());

  return {
    success: firestoreSuccess || serverSuccess,
    message:
      firestoreSuccess && serverSuccess
        ? `Synced with Cloud Firestore & Server at ${timestamp}`
        : serverSuccess
        ? `Synced with Central Server at ${timestamp}`
        : firestoreSuccess
        ? `Synced with Cloud Firestore at ${timestamp}`
        : `Offline Mode (Local Cache Active)`,
    source,
    timestamp,
    quizzes: consolidatedQuizzes,
    submissions: consolidatedSubmissions,
    teacherAccessCodes: consolidatedTeacherCodes.length > 0 ? consolidatedTeacherCodes : localState.teacherAccessCodes,
    sections: serverData?.sections || localState.sections,
    systemSettings: serverData?.systemSettings || firestoreSettings || localState.systemSettings,
  };
}

/**
 * Proxy push submissions to Google Sheets webhook via Server
 */
export async function pushSubmissionsToGoogleSheets(
  webhookUrl: string,
  submissions: StudentSubmission[]
): Promise<{ success: boolean; message: string; forwardedCount: number }> {
  try {
    const res = await fetch('/api/sync/google-sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl, submissions }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        message: `Successfully pushed ${submissions.length} submission(s) to Google Sheets!`,
        forwardedCount: submissions.length,
      };
    } else {
      // Fallback: direct browser fetch if server proxy had issues
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submissions, timestamp: new Date().toISOString() }),
        });
        return {
          success: true,
          message: `Forwarded ${submissions.length} submission(s) to Google Sheets webhook!`,
          forwardedCount: submissions.length,
        };
      } catch (err: any) {
        return {
          success: false,
          message: data.error || err?.message || 'Failed to reach Google Sheets webhook',
          forwardedCount: 0,
        };
      }
    }
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Network error pushing to Google Sheets',
      forwardedCount: 0,
    };
  }
}

/**
 * Save / Update Active Student Session in Firestore (Live Exam Surveillance)
 */
export async function saveActiveSessionToFirestore(session: Partial<ActiveStudentSession> & { studentName?: string; studentId?: string; quizId?: string }): Promise<void> {
  try {
    if (!session || (!session.studentName && !session.studentId)) return;
    const cleanStudentId = (session.studentId || session.studentName || 'candidate').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanQuizId = (session.quizId || 'quiz').replace(/[^a-zA-Z0-9_-]/g, '_');
    const rawId = session.id || `sess_${cleanStudentId}_${cleanQuizId}`;
    const docId = rawId.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    const docRef = doc(db, ACTIVE_SESSIONS_COLLECTION, docId);
    const sanitized = JSON.parse(JSON.stringify({
      ...session,
      id: docId,
      lastHeartbeat: new Date().toISOString(),
    }));
    await setDoc(docRef, sanitized, { merge: true });
  } catch (err) {
    console.warn('Could not save active student session to Firestore:', err);
  }
}

/**
 * Delete Active Student Session from Firestore (when exam is submitted or completed)
 */
export async function deleteActiveSessionFromFirestore(
  idOrStudentQuiz: string,
  studentName?: string,
  quizId?: string
): Promise<void> {
  try {
    if (!idOrStudentQuiz && !studentName) return;
    const batch = writeBatch(db);
    let count = 0;

    // Direct doc delete if ID provided
    if (idOrStudentQuiz) {
      const cleanId = idOrStudentQuiz.replace(/[^a-zA-Z0-9_-]/g, '_');
      batch.delete(doc(db, ACTIVE_SESSIONS_COLLECTION, cleanId));
      count++;
      if (cleanId !== idOrStudentQuiz) {
        batch.delete(doc(db, ACTIVE_SESSIONS_COLLECTION, idOrStudentQuiz));
        count++;
      }
    }

    // Also query active_sessions collection for matching studentId, studentName, or id
    const colRef = collection(db, ACTIVE_SESSIONS_COLLECTION);
    const snap = await getDocs(colRef);
    const matchId = (idOrStudentQuiz || '').toLowerCase().trim();
    const matchName = (studentName || '').toLowerCase().trim();
    const matchQuiz = (quizId || '').toLowerCase().trim();

    snap.forEach((d) => {
      const data = d.data();
      const dId = (data.studentId || d.id || '').toLowerCase().trim();
      const dName = (data.studentName || '').toLowerCase().trim();
      const dQuiz = (data.quizId || data.quizCode || '').toLowerCase().trim();

      const idMatches = matchId && (dId === matchId || d.id.toLowerCase().includes(matchId) || matchId.includes(dId));
      const nameMatches = matchName && (dName === matchName || dName.includes(matchName) || matchName.includes(dName));
      const quizMatches = !matchQuiz || !dQuiz || dQuiz === matchQuiz;

      if ((idMatches || nameMatches) && quizMatches) {
        batch.delete(d.ref);
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
    }
  } catch (err) {
    console.warn('Could not delete active session from Firestore:', err);
  }
}

/**
 * Clear All Active Student Sessions from Firestore (Reset Monitoring Stream)
 */
export async function clearAllActiveSessionsFromFirestore(): Promise<void> {
  try {
    const q = collection(db, ACTIVE_SESSIONS_COLLECTION);
    const snap = await getDocs(q);
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (err) {
    console.warn('Could not clear all active sessions from Firestore:', err);
  }
}

/**
 * Subscribe to all live active student sessions in Firestore in real-time
 */
export function subscribeToActiveSessions(callback: (sessions: ActiveStudentSession[]) => void): () => void {
  try {
    const q = collection(db, ACTIVE_SESSIONS_COLLECTION);
    return onSnapshot(
      q,
      (snapshot) => {
        const list: ActiveStudentSession[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as ActiveStudentSession;
          list.push({ ...data, id: docSnap.id });
        });
        callback(list);
      },
      (error) => {
        console.warn('Firestore active sessions listener error:', error);
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to active sessions in Firestore:', err);
    return () => {};
  }
}

/**
 * Save Teacher Proctor Warning to Firestore
 */
export async function saveTeacherWarningToFirestore(warning: ProctorWarning & { id?: string }): Promise<void> {
  try {
    const cleanStudentId = (warning.studentId || 'std').replace(/[^a-zA-Z0-9_-]/g, '_');
    const docId = warning.id || `warn_${cleanStudentId}_${Date.now()}`;
    const docRef = doc(db, TEACHER_WARNINGS_COLLECTION, docId);
    const sanitized = JSON.parse(JSON.stringify({
      ...warning,
      id: docId,
      timestamp: warning.timestamp || new Date().toISOString(),
    }));
    await setDoc(docRef, sanitized, { merge: true });
  } catch (err) {
    console.warn('Could not save teacher proctor warning to Firestore:', err);
  }
}

/**
 * Subscribe to Teacher Proctor Warnings in Firestore in real-time
 */
export function subscribeToTeacherWarnings(
  studentId: string | undefined,
  callback: (warnings: ProctorWarning[]) => void
): () => void {
  try {
    const q = collection(db, TEACHER_WARNINGS_COLLECTION);
    return onSnapshot(
      q,
      (snapshot) => {
        const list: ProctorWarning[] = [];
        const cleanSId = (studentId || '').trim().toLowerCase();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as ProctorWarning;
          const targetId = (data.studentId || '').trim().toLowerCase();
          const isMatch =
            !cleanSId ||
            targetId === 'all' ||
            targetId === '*' ||
            targetId === cleanSId ||
            (cleanSId && targetId && (cleanSId.includes(targetId) || targetId.includes(cleanSId)));

          if (isMatch) {
            list.push({ ...data, id: docSnap.id } as any);
          }
        });
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        callback(list);
      },
      (error) => {
        console.warn('Firestore teacher warnings listener error:', error);
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to teacher warnings in Firestore:', err);
    return () => {};
  }
}

/**
 * Acknowledge Teacher Warning in Firestore
 */
export async function acknowledgeTeacherWarningInFirestore(warningId: string): Promise<void> {
  try {
    const docRef = doc(db, TEACHER_WARNINGS_COLLECTION, warningId);
    await setDoc(docRef, { acknowledged: true, acknowledgedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('Could not acknowledge teacher warning in Firestore:', err);
  }
}

/**
 * Clear all Teacher Warnings from Firestore
 */
export async function clearAllTeacherWarningsFromFirestore(): Promise<void> {
  try {
    const q = collection(db, TEACHER_WARNINGS_COLLECTION);
    const snap = await getDocs(q);
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (err) {
    console.warn('Could not clear teacher warnings from Firestore:', err);
  }
}

/**
 * Save a compressed Camera Capture photo to Firestore
 */
export async function saveCameraCaptureToFirestore(capture: CameraCaptureItem): Promise<void> {
  try {
    const docId = capture.id || `cap_${(capture.studentId || 'std').replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}`;
    const docRef = doc(db, CAMERA_CAPTURES_COLLECTION, docId);
    const sanitized = JSON.parse(JSON.stringify({
      ...capture,
      id: docId,
      timestamp: capture.timestamp || new Date().toISOString(),
      createdAt: capture.createdAt || new Date().toISOString(),
    }));
    await setDoc(docRef, sanitized, { merge: true });
  } catch (err) {
    console.warn('Could not save camera capture to Firestore:', err);
  }
}

/**
 * Fetch Camera Captures from Firestore for a specific quiz and/or student
 */
export async function fetchCameraCapturesFromFirestore(
  quizId?: string,
  studentId?: string
): Promise<CameraCaptureItem[]> {
  try {
    const q = collection(db, CAMERA_CAPTURES_COLLECTION);
    const snap = await getDocs(q);
    if (snap.empty) return [];
    
    const list: CameraCaptureItem[] = [];
    const qUpper = (quizId || '').trim().toUpperCase();
    const sUpper = (studentId || '').trim().toUpperCase();
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7-day retention

    snap.forEach((docSnap) => {
      const data = docSnap.data() as CameraCaptureItem;
      const cTime = new Date(data.timestamp || data.createdAt || 0).getTime();
      // Skip if older than 7 days
      if (cTime && cTime < cutoff) return;

      const cQuiz = (data.quizId || '').toUpperCase();
      const cStudent = (data.studentId || '').toUpperCase();
      const cName = (data.studentName || '').toUpperCase();

      const matchesQuiz = !qUpper || qUpper === 'ALL' || cQuiz === qUpper || cQuiz.includes(qUpper);
      const matchesStudent = !sUpper || cStudent === sUpper || cName === sUpper;

      if (matchesQuiz && matchesStudent) {
        list.push({ ...data, id: docSnap.id });
      }
    });

    list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return list;
  } catch (err) {
    console.warn('Could not fetch camera captures from Firestore:', err);
    return [];
  }
}

/**
 * Delete camera captures from Firestore for a student or quiz
 */
export async function deleteCameraCapturesFromFirestore(
  quizId?: string,
  studentId?: string
): Promise<void> {
  try {
    const q = collection(db, CAMERA_CAPTURES_COLLECTION);
    const snap = await getDocs(q);
    if (snap.empty) return;

    const qUpper = (quizId || '').trim().toUpperCase();
    const sUpper = (studentId || '').trim().toUpperCase();
    const batch = writeBatch(db);
    let count = 0;

    snap.forEach((docSnap) => {
      const data = docSnap.data() as CameraCaptureItem;
      const cQuiz = (data.quizId || '').toUpperCase();
      const cStudent = (data.studentId || '').toUpperCase();
      const cName = (data.studentName || '').toUpperCase();

      const matchesQuiz = !qUpper || qUpper === 'ALL' || cQuiz === qUpper;
      const matchesStudent = !sUpper || cStudent === sUpper || cName === sUpper;

      if (matchesQuiz && matchesStudent) {
        batch.delete(docSnap.ref);
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
    }
  } catch (err) {
    console.warn('Could not delete camera captures from Firestore:', err);
  }
}


