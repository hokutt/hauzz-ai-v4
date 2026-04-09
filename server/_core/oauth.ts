import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    // Decode the origin from state (set by frontend as btoa(redirectUri))
    let decodedRedirectUri = "";
    try {
      decodedRedirectUri = atob(state);
    } catch {
      console.error("[OAuth] Failed to decode state:", state);
    }

    console.log("[OAuth] Callback received", {
      codePrefix: code.substring(0, 10) + "...",
      decodedRedirectUri,
      reqHost: req.get("host"),
      reqProto: req.protocol,
      xForwardedProto: req.get("x-forwarded-proto"),
    });

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? (userInfo as unknown as Record<string, unknown>).platform as string ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Redirect back to the frontend origin extracted from state, falling back to "/"
      let redirectTarget = "/";
      if (decodedRedirectUri) {
        try {
          const originUrl = new URL(decodedRedirectUri);
          redirectTarget = originUrl.origin + "/";
        } catch {
          redirectTarget = "/";
        }
      }

      console.log("[OAuth] Login success, redirecting to:", redirectTarget);
      res.redirect(302, redirectTarget);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const errResp = (error as { response?: { data?: unknown; status?: number } })?.response;
      console.error("[OAuth] Callback failed", {
        message: errMsg,
        responseStatus: errResp?.status,
        responseData: errResp?.data,
        decodedRedirectUri,
        reqHost: req.get("host"),
      });
      res.status(500).json({ error: "OAuth callback failed", detail: errMsg });
    }
  });
}
