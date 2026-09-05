const STORAGE_KEY = "pi-web:sidebar:history-ratio";
const DEFAULT_HISTORY_RATIO = 0.5;
export const MIN_HISTORY_RATIO = 0.2;
export const MAX_HISTORY_RATIO = 0.8;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function clampHistoryRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) return DEFAULT_HISTORY_RATIO;
  return Math.min(MAX_HISTORY_RATIO, Math.max(MIN_HISTORY_RATIO, ratio));
}

export function loadHistoryRatio(storage: StorageLike | null = getBrowserStorage()): number {
  if (!storage) return DEFAULT_HISTORY_RATIO;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw === null ? DEFAULT_HISTORY_RATIO : clampHistoryRatio(Number(raw));
  } catch {
    return DEFAULT_HISTORY_RATIO;
  }
}

export function saveHistoryRatio(
  ratio: number,
  storage: StorageLike | null = getBrowserStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, String(clampHistoryRatio(ratio)));
  } catch {
    // Browser storage is best-effort.
  }
}
