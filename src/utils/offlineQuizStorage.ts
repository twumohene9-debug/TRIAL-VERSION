import { QuizConfig, Question, QuizSection } from '../types';
import { safeSetItem } from './safeStorage';

const DB_NAME = 'joy_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'offline_quizzes';

interface OfflineQuizRecord {
  id: string;
  code?: string;
  config: QuizConfig;
  questions: Question[];
  sections: QuizSection[];
  savedAt: number;
}

/**
 * Initializes and returns the IndexedDB database instance
 */
function openIndexedDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      resolve(null);
      return;
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('code', 'code', { unique: false });
          store.createIndex('savedAt', 'savedAt', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        console.warn('[OfflineStorage] IndexedDB open error:', event);
        resolve(null);
      };
    } catch (err) {
      console.warn('[OfflineStorage] IndexedDB exception:', err);
      resolve(null);
    }
  });
}

/**
 * Saves a quiz into both IndexedDB and localStorage for maximum offline resilience
 */
export async function saveQuizToOfflineStorage(
  config: QuizConfig,
  questions: Question[] = [],
  sections: QuizSection[] = []
): Promise<void> {
  if (!config || (!config.id && !config.code)) return;

  const quizId = String(config.id || config.code);
  const quizCode = config.code ? String(config.code).trim() : undefined;

  const record: OfflineQuizRecord = {
    id: quizId,
    code: quizCode,
    config: {
      ...config,
      id: quizId,
      code: quizCode || quizId,
    },
    questions: questions.length > 0 ? questions : (config.questions || []),
    sections: sections.length > 0 ? sections : (config.sections || []),
    savedAt: Date.now(),
  };

  // 1. Persist in IndexedDB
  try {
    const db = await openIndexedDB();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const putReq = store.put(record);
        putReq.onsuccess = () => resolve();
        putReq.onerror = (e) => reject(e);
      });
    }
  } catch (err) {
    console.warn('[OfflineStorage] IndexedDB save fallback:', err);
  }

  // 2. Persist in localStorage (dual fallback)
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const pkg = {
        v: 1,
        config: record.config,
        questions: record.questions,
        sections: record.sections,
        savedAt: record.savedAt,
      };
      const serialized = JSON.stringify(pkg);

      // Only store full quiz blob in localStorage if it is compact (< 60KB) to prevent quota exhaustion
      // IndexedDB already stores the complete quiz losslessly regardless of size.
      if (serialized.length < 60000) {
        safeSetItem(`joy_cached_quiz_${quizId}`, serialized);
        if (quizCode && quizCode.toUpperCase() !== quizId.toUpperCase()) {
          safeSetItem(`joy_cached_quiz_${quizCode}`, serialized);
        }
      }

      // Update registry index with lightweight metadata (without bulky nested questions array)
      const listRaw = localStorage.getItem('joy_offline_quizzes_index');
      const list: QuizConfig[] = listRaw ? JSON.parse(listRaw) : [];
      const filtered = list.filter(
        (q) => q.id !== quizId && (!quizCode || q.code !== quizCode)
      );
      // Strip deep question payload from index item to keep registry under a few KB
      const { questions: _, ...lightweightConfig } = record.config;
      filtered.unshift({
        ...lightweightConfig,
        totalQuestions: record.questions?.length || record.config.totalQuestions || 0
      } as QuizConfig);
      safeSetItem('joy_offline_quizzes_index', JSON.stringify(filtered.slice(0, 30)));
    }
  } catch (err) {
    console.warn('[OfflineStorage] localStorage save error:', err);
  }
}

/**
 * Saves an array of quizzes into offline storage
 */
export async function saveQuizzesBatchToOfflineStorage(quizzes: QuizConfig[]): Promise<void> {
  if (!Array.isArray(quizzes) || quizzes.length === 0) return;
  for (const q of quizzes) {
    await saveQuizToOfflineStorage(q, q.questions || [], q.sections || []);
  }
}

/**
 * Loads an EXACT quiz from IndexedDB or localStorage using its ID or Code.
 * Does NOT return a fallback mock quiz if not found.
 */
export async function getExactQuizFromOfflineStorage(
  targetIdOrCode: string
): Promise<{ config: QuizConfig; questions: Question[]; sections: QuizSection[] } | null> {
  if (!targetIdOrCode || typeof targetIdOrCode !== 'string') return null;

  const normalized = targetIdOrCode.trim();
  const normalizedUpper = normalized.toUpperCase();

  // 1. Search in IndexedDB first
  try {
    const db = await openIndexedDB();
    if (db) {
      const record = await new Promise<OfflineQuizRecord | null>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);

        // Try direct key get
        const req = store.get(normalized);
        req.onsuccess = () => {
          if (req.result) {
            resolve(req.result);
            return;
          }

          // If not found by exact ID, scan all records for case-insensitive match on id or code
          const cursorReq = store.openCursor();
          cursorReq.onsuccess = (e) => {
            const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
            if (cursor) {
              const val = cursor.value as OfflineQuizRecord;
              const matchesId = val.id && val.id.trim().toUpperCase() === normalizedUpper;
              const matchesCode = val.code && val.code.trim().toUpperCase() === normalizedUpper;
              const matchesConfigCode = val.config?.code && val.config.code.trim().toUpperCase() === normalizedUpper;
              const matchesConfigId = val.config?.id && val.config.id.trim().toUpperCase() === normalizedUpper;

              if (matchesId || matchesCode || matchesConfigCode || matchesConfigId) {
                resolve(val);
                return;
              }
              cursor.continue();
            } else {
              resolve(null);
            }
          };
          cursorReq.onerror = () => resolve(null);
        };
        req.onerror = () => resolve(null);
      });

      if (record && record.config) {
        return {
          config: record.config,
          questions: record.questions || record.config.questions || [],
          sections: record.sections || record.config.sections || [],
        };
      }
    }
  } catch (err) {
    console.warn('[OfflineStorage] IndexedDB read error:', err);
  }

  // 2. Search in localStorage fallback
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Direct key checks
      const directKeys = [
        `joy_cached_quiz_${normalized}`,
        `joy_cached_quiz_${normalizedUpper}`,
        `joy_cached_quiz_${normalized.toLowerCase()}`
      ];

      for (const key of directKeys) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.config || parsed.title)) {
            const cfg = parsed.config || parsed;
            return {
              config: cfg,
              questions: parsed.questions || cfg.questions || [],
              sections: parsed.sections || cfg.sections || [],
            };
          }
        }
      }

      // Check offline registry index
      const listRaw = localStorage.getItem('joy_offline_quizzes_index');
      if (listRaw) {
        const list: QuizConfig[] = JSON.parse(listRaw);
        const found = list.find(
          (q) =>
            (q.id && q.id.trim().toUpperCase() === normalizedUpper) ||
            (q.code && q.code.trim().toUpperCase() === normalizedUpper)
        );

        if (found) {
          const secondaryKey = `joy_cached_quiz_${found.id || found.code}`;
          const secondaryRaw = localStorage.getItem(secondaryKey);
          if (secondaryRaw) {
            const parsed = JSON.parse(secondaryRaw);
            return {
              config: parsed.config || found,
              questions: parsed.questions || found.questions || [],
              sections: parsed.sections || found.sections || [],
            };
          }
          return {
            config: found,
            questions: found.questions || [],
            sections: found.sections || [],
          };
        }
      }

      // Iterate through all localStorage keys starting with joy_cached_quiz_
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('joy_cached_quiz_')) {
          const rawVal = localStorage.getItem(k);
          if (rawVal) {
            try {
              const parsed = JSON.parse(rawVal);
              const cfg = parsed.config || parsed;
              const matchesId = cfg.id && cfg.id.trim().toUpperCase() === normalizedUpper;
              const matchesCode = cfg.code && cfg.code.trim().toUpperCase() === normalizedUpper;
              if (matchesId || matchesCode) {
                return {
                  config: cfg,
                  questions: parsed.questions || cfg.questions || [],
                  sections: parsed.sections || cfg.sections || [],
                };
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[OfflineStorage] localStorage read error:', err);
  }

  return null;
}

/**
 * Retrieves all offline quizzes stored in IndexedDB and localStorage
 */
export async function getAllOfflineQuizzes(): Promise<QuizConfig[]> {
  const map = new Map<string, QuizConfig>();

  // 1. From IndexedDB
  try {
    const db = await openIndexedDB();
    if (db) {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.openCursor();
        req.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
          if (cursor) {
            const val = cursor.value as OfflineQuizRecord;
            if (val && val.config && (val.config.id || val.config.code)) {
              const key = val.config.id || val.config.code!;
              map.set(key, val.config);
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
        req.onerror = () => resolve();
      });
    }
  } catch (e) {
    console.warn('[OfflineStorage] getAll IndexedDB error:', e);
  }

  // 2. From localStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem('joy_offline_quizzes_index');
      if (raw) {
        const list: QuizConfig[] = JSON.parse(raw);
        for (const q of list) {
          const key = q.id || q.code;
          if (key && !map.has(key)) {
            map.set(key, q);
          }
        }
      }
    }
  } catch (e) {
    console.warn('[OfflineStorage] getAll localStorage error:', e);
  }

  return Array.from(map.values());
}
