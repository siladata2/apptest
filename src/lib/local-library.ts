import type { CatalogItem } from "@/lib/types";

const WATCHLIST_KEY = "silaflix_public_watchlist_v1";
const HISTORY_KEY = "silaflix_public_history_v1";
const LIKE_PREFIX = "silaflix_like_";
export type LocalHistoryEntry = { content: CatalogItem; position_seconds: number; duration_seconds: number; updated_at: string };

function cleanItem(item: CatalogItem): CatalogItem {
  return { ...item, sources: [], downloads: [], subtitles: [] };
}

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value as T[] : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, values: T[]): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, JSON.stringify(values.slice(0, 100)));
    window.dispatchEvent(new Event("silaflix-local-library-change"));
  }
}

export function subscribeLocalLibrary(callback: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("silaflix-local-library-change", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("silaflix-local-library-change", callback);
    window.removeEventListener("storage", callback);
  };
}

export function getLocalWatchlist(): CatalogItem[] {
  return read<CatalogItem>(WATCHLIST_KEY);
}

export function isInLocalWatchlist(id: string): boolean {
  return getLocalWatchlist().some(item => item.id === id);
}

export function toggleLocalWatchlist(item: CatalogItem): boolean {
  const rows = getLocalWatchlist();
  const exists = rows.some(row => row.id === item.id);
  write(WATCHLIST_KEY, exists ? rows.filter(row => row.id !== item.id) : [cleanItem(item), ...rows]);
  return !exists;
}

export function removeLocalWatchlistItem(id: string): void {
  write(WATCHLIST_KEY, getLocalWatchlist().filter(item => item.id !== id));
}

export function isLocalLiked(id: string): boolean {
  if (typeof window === "undefined") return false;
  try { return window.localStorage.getItem(`${LIKE_PREFIX}${id}`) === "1"; } catch { return false; }
}

export function toggleLocalLike(id: string): boolean {
  const liked = !isLocalLiked(id);
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(`${LIKE_PREFIX}${id}`, liked ? "1" : "0"); } catch { /* Storage may be disabled. */ }
    window.dispatchEvent(new Event("silaflix-local-library-change"));
  }
  return liked;
}

export function getLocalHistory(): LocalHistoryEntry[] {
  return read<LocalHistoryEntry>(HISTORY_KEY).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function saveLocalProgress(item: CatalogItem, positionSeconds: number, durationSeconds: number): void {
  if (!item?.id || !Number.isFinite(positionSeconds) || positionSeconds < 0) return;
  const rows = getLocalHistory().filter(row => row.content?.id !== item.id);
  if (durationSeconds > 0 && positionSeconds / durationSeconds > 0.94) {
    write(HISTORY_KEY, rows);
    return;
  }
  rows.unshift({ content: cleanItem(item), position_seconds: Math.floor(positionSeconds), duration_seconds: Math.floor(durationSeconds || item.duration_seconds || 0), updated_at: new Date().toISOString() });
  write(HISTORY_KEY, rows);
}
