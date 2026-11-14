/**
 * Offline-first & High-Performance Client Cache
 * 
 * Provides:
 * 1. Stale-While-Revalidate caching for lightning-fast 0ms loads
 * 2. Offline fallback using localStorage / memory storage
 * 3. Search debouncing to prevent query storms on high-volume data
 * 4. Online/offline state detection
 */

const MEMORY_FALLBACK = new Map();

export const offlineStorage = {
  get(key) {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(`tk_cache_${key}`);
      if (!raw) return MEMORY_FALLBACK.get(key) || null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.timestamp) return null;
      return parsed;
    } catch {
      return MEMORY_FALLBACK.get(key) || null;
    }
  },

  set(key, data, ttlSeconds = 300) {
    if (typeof window === "undefined") return;
    const item = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlSeconds * 1000,
    };
    try {
      window.localStorage.setItem(`tk_cache_${key}`, JSON.stringify(item));
    } catch (e) {
      // If localStorage is full, save to in-memory fallback
      MEMORY_FALLBACK.set(key, item);
    }
  },

  remove(key) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(`tk_cache_${key}`);
    } catch {
      // ignore
    }
    MEMORY_FALLBACK.delete(key);
  },

  clearAll() {
    if (typeof window === "undefined") return;
    try {
      Object.keys(window.localStorage)
        .filter((k) => k.startsWith("tk_cache_"))
        .forEach((k) => window.localStorage.removeItem(k));
    } catch {
      // ignore
    }
    MEMORY_FALLBACK.clear();
  },
};

/**
 * Fetch wrapper that returns cached data instantly while refreshing in the background
 * (Stale-While-Revalidate) and provides full offline fallback.
 */
export async function fetchWithOfflineSupport(key, fetcher, options = {}) {
  const {
    ttl = 120, // 2 minutes
    staleWhileRevalidate = true,
    offlineFallback = true,
    onStaleData = null,
  } = options;

  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  const cached = offlineStorage.get(key);
  const now = Date.now();

  // If offline, return cached immediately
  if (!isOnline && offlineFallback) {
    if (cached) {
      return {
        data: cached.data,
        isOffline: true,
        fromCache: true,
        cachedAt: cached.timestamp,
      };
    }
    throw new Error("You are offline and no cached data is available.");
  }

  // If valid cache exists and stale-while-revalidate is active, notify listener
  if (cached && now < cached.expiresAt) {
    if (staleWhileRevalidate && typeof onStaleData === "function") {
      onStaleData(cached.data);
    }
  }

  try {
    const freshData = await fetcher();
    offlineStorage.set(key, freshData, ttl);
    return {
      data: freshData,
      isOffline: false,
      fromCache: false,
    };
  } catch (error) {
    // On network failure, use cached data if available
    if (cached && offlineFallback) {
      return {
        data: cached.data,
        isOffline: !isOnline,
        fromCache: true,
        cachedAt: cached.timestamp,
        error,
      };
    }
    throw error;
  }
}

/**
 * Standard debounce utility for search inputs
 */
export function debounce(fn, delayMs = 300) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delayMs);
  };
}
