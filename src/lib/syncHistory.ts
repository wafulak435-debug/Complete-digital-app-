export type SyncEventCategory =
  | "books"
  | "uploads"
  | "documents"
  | "messages"
  | "orders"
  | "offline_cache"
  | "progress";

export type SyncEventStatus = "synced" | "queued" | "failed";

export interface SyncHistoryEntry {
  id: string;
  title: string;
  detail: string;
  category: SyncEventCategory;
  status: SyncEventStatus;
  itemCount: number;
  timestamp: string;
}

const STORAGE_KEY = "WAFULA_SYNC_HISTORY";
const MAX_ENTRIES = 50;
export const SYNC_HISTORY_UPDATED_EVENT = "WAFULA_SYNC_HISTORY_UPDATED";

export function getSyncHistory(): SyncHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is SyncHistoryEntry => Boolean(item && item.id && item.title))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch {
    return [];
  }
}

export function recordSyncEvent(
  entry: Omit<SyncHistoryEntry, "id" | "timestamp">
): SyncHistoryEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const existing = getSyncHistory();
    const now = new Date();
    const nowIso = now.toISOString();

    // Deduplicate identical consecutive events occurring within 3 seconds
    const latest = existing[0];
    if (
      latest &&
      latest.title === entry.title &&
      latest.detail === entry.detail &&
      latest.status === entry.status &&
      now.getTime() - new Date(latest.timestamp).getTime() < 3000
    ) {
      return latest;
    }

    const nextEntry: SyncHistoryEntry = {
      ...entry,
      id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: nowIso,
    };

    const updated = [nextEntry, ...existing].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(SYNC_HISTORY_UPDATED_EVENT));
    return nextEntry;
  } catch {
    return null;
  }
}

export function clearSyncHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(SYNC_HISTORY_UPDATED_EVENT));
  } catch {
    // Ignore storage errors
  }
}
