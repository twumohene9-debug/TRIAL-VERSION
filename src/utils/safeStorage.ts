/**
 * Safe LocalStorage Utility with automatic QuotaExceeded recovery
 * Ensures the app never crashes from browser storage quota limits.
 */

/**
 * Checks if an error is a QuotaExceededError
 */
export function isQuotaExceededError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    // everything except Firefox
    (err.code === 22 ||
      // Firefox
      err.code === 1014 ||
      // test name field too, because code might not exist
      // everything except Firefox
      err.name === 'QuotaExceededError' ||
      // Firefox
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED') ||
    (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: unknown }).message === 'string' &&
      ((err as { message: string }).message.toLowerCase().includes('quota') || (err as { message: string }).message.toLowerCase().includes('exceeded')))
  );
}

/**
 * Purges oversized cached quizzes or unnecessary blobs from localStorage
 * Quizzes are permanently and safely stored in IndexedDB (joy_offline_db).
 */
export function purgeOversizedLocalStorageCache(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const keysToRemove: string[] = [];

    // Scan all keys in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Never remove user authentication or active theme
      if (
        key === 'academic_portal_theme' ||
        key === 'joy_teacher_authenticated' ||
        key === 'joy_admin_unlocked'
      ) {
        continue;
      }

      // If it is a cached quiz payload in localStorage, mark for removal
      // since all full quiz data is already in IndexedDB
      if (key.startsWith('joy_cached_quiz_')) {
        keysToRemove.push(key);
      }
    }

    // Remove the bloated keys
    for (const key of keysToRemove) {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    }

    if (keysToRemove.length > 0) {
      console.info(`[SafeStorage] Freed ${keysToRemove.length} bloated quiz entries from localStorage (retained in IndexedDB).`);
    }
  } catch (err) {
    console.warn('[SafeStorage] Purge error:', err);
  }
}

/**
 * Safe setItem that handles QuotaExceededError by purging old cache and retrying
 */
export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    if (isQuotaExceededError(err)) {
      console.warn(`[SafeStorage] Quota exceeded on setItem('${key}'). Purging cached quizzes and retrying...`);
      purgeOversizedLocalStorageCache();

      try {
        localStorage.setItem(key, value);
        return true;
      } catch (retryErr) {
        console.error(`[SafeStorage] setItem('${key}') failed even after purge:`, retryErr);
        return false;
      }
    }

    console.warn(`[SafeStorage] setItem('${key}') failed:`, err);
    return false;
  }
}

/**
 * Safe getItem
 */
export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.warn(`[SafeStorage] getItem('${key}') failed:`, err);
    return null;
  }
}

/**
 * Safe removeItem
 */
export function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[SafeStorage] removeItem('${key}') failed:`, err);
  }
}

// Automatically run on module import to free up space immediately
if (typeof window !== 'undefined') {
  try {
    purgeOversizedLocalStorageCache();
  } catch {
    // silent
  }
}
