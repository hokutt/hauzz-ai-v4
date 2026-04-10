/**
 * FASHN.ai API Key Validation Test
 * Verifies the FASHN_API_KEY is set and can authenticate with the FASHN.ai API.
 * This is a lightweight check — it does NOT submit a render job (which costs credits).
 * It calls the /v1/status endpoint with a dummy ID to confirm auth works (expects 404, not 401).
 */
import { describe, it, expect } from "vitest";

describe("FASHN.ai API Key", () => {
  it("FASHN_API_KEY environment variable is set", () => {
    const key = process.env.FASHN_API_KEY;
    expect(key, "FASHN_API_KEY must be set — add it in project Secrets").toBeTruthy();
    expect(key!.startsWith("fa-"), "FASHN API keys start with 'fa-'").toBe(true);
    expect(key!.length, "FASHN API key should be at least 20 chars").toBeGreaterThan(20);
  });

  it("FASHN_API_KEY authenticates successfully with the FASHN.ai API", async () => {
    const key = process.env.FASHN_API_KEY;
    if (!key) {
      throw new Error("FASHN_API_KEY not set — cannot test authentication");
    }

    // Call status endpoint with a dummy ID — a valid key gets 404 (not found), an invalid key gets 401 (unauthorized)
    const res = await fetch("https://api.fashn.ai/v1/status/test-hauzz-key-check", {
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
    });

    // 401 = invalid key, 403 = forbidden, anything else (404, 422) = key is valid and authenticated
    expect(res.status, `Expected authenticated response (not 401/403), got ${res.status}`).not.toBe(401);
    expect(res.status, `Expected authenticated response (not 401/403), got ${res.status}`).not.toBe(403);
  }, 15_000); // 15s timeout for network call
});
