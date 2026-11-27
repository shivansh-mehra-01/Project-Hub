export interface RefreshResult {
  ok: boolean;
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  isRace?: boolean;
}

const CACHE_TTL_MS = 30_000;
const MAX_CACHE_ENTRIES = 500;

const inFlightRefreshes = new Map<string, Promise<RefreshResult>>();
const recentRefreshes = new Map<string, { result: RefreshResult; expiresAt: number }>();

function pruneExpiredCache(now: number): void {
  for (const [key, entry] of recentRefreshes.entries()) {
    if (entry.expiresAt <= now) {
      recentRefreshes.delete(key);
    }
  }
  if (recentRefreshes.size > MAX_CACHE_ENTRIES) {
    const excess = recentRefreshes.size - MAX_CACHE_ENTRIES;
    let removed = 0;
    for (const key of recentRefreshes.keys()) {
      recentRefreshes.delete(key);
      removed += 1;
      if (removed >= excess) break;
    }
  }
}

/**
 * Single-flight refresh guard: deduplicates concurrent refresh requests using the same
 * refresh token and caches successful rotations briefly so slightly-late parallel requests
 * reuse the new token pair instead of triggering refresh-token reuse detection.
 */
export async function executeSingleFlightRefresh(
  refreshToken: string,
  backendApiUrl: string,
  forwardingHeaders: Record<string, string> = {}
): Promise<RefreshResult> {
  const now = Date.now();
  pruneExpiredCache(now);

  const cached = recentRefreshes.get(refreshToken);
  if (cached && cached.expiresAt > now) {
    return cached.result;
  }

  const existingPromise = inFlightRefreshes.get(refreshToken);
  if (existingPromise) {
    return existingPromise;
  }

  const refreshPromise = (async (): Promise<RefreshResult> => {
    try {
      const res = await fetch(`${backendApiUrl}/api/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...forwardingHeaders,
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.token && data?.refreshToken) {
        const result: RefreshResult = { ok: true, status: res.status, data };
        recentRefreshes.set(refreshToken, {
          result,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
        return result;
      }

      return {
        ok: false,
        status: res.status || 401,
        data,
        isRace: data?.code === "refresh_race",
      };
    } catch {
      return {
        ok: false,
        status: 503,
        data: { message: "Unable to reach authentication service." },
      };
    } finally {
      inFlightRefreshes.delete(refreshToken);
    }
  })();

  inFlightRefreshes.set(refreshToken, refreshPromise);
  return refreshPromise;
}

export function clearRefreshSingleFlightCacheForTests(): void {
  inFlightRefreshes.clear();
  recentRefreshes.clear();
}
