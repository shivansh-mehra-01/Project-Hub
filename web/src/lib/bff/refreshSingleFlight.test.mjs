import assert from "node:assert/strict";
import test from "node:test";
import {
  clearRefreshSingleFlightCacheForTests,
  executeSingleFlightRefresh,
} from "./refreshSingleFlight.ts";

test("5 parallel refresh requests with same token share 1 backend call and reuse rotated tokens", async () => {
  clearRefreshSingleFlightCacheForTests();
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    fetchCalls += 1;
    await new Promise((r) => setTimeout(r, 40));
    return new Response(
      JSON.stringify({
        token: "new-access-token",
        refreshToken: "new-refresh-token",
        user: { id: "u1" },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  try {
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        executeSingleFlightRefresh("old-refresh-token", "http://localhost:5000")
      )
    );

    assert.equal(fetchCalls, 1);
    for (const r of results) {
      assert.equal(r.ok, true);
      assert.equal(r.data.token, "new-access-token");
      assert.equal(r.data.refreshToken, "new-refresh-token");
    }

    // Slightly-late 6th request within 30s cache TTL also reuses cached result
    const lateResult = await executeSingleFlightRefresh("old-refresh-token", "http://localhost:5000");
    assert.equal(fetchCalls, 1);
    assert.equal(lateResult.ok, true);
  } finally {
    globalThis.fetch = originalFetch;
    clearRefreshSingleFlightCacheForTests();
  }
});
