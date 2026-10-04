import { cookie, encryptSession, expiredCookie, getCookie, redirect } from "../../_lib/github-session";
import type { PagesContext } from "../../_lib/github-session";

export async function onRequestGet({ request, env }: PagesContext) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "";
  const expectedState = getCookie(request, "cloudflare_oauth_state");
  const clearState = expiredCookie("cloudflare_oauth_state", "/auth/cloudflare");
  const home = new URL("/", url.origin);

  if (!env.CLOUDFLARE_CLIENT_ID || !env.CLOUDFLARE_CLIENT_SECRET || !env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
    home.searchParams.set("cloudflare", "not-configured");
    return redirect(home.toString(), [clearState]);
  }
  if (url.searchParams.has("error")) {
    home.searchParams.set("cloudflare", "denied");
    return redirect(home.toString(), [clearState]);
  }
  if (!state || !expectedState || state !== expectedState) {
    home.searchParams.set("cloudflare", "state-error");
    return redirect(home.toString(), [clearState]);
  }

  const code = url.searchParams.get("code");
  if (!code) {
    home.searchParams.set("cloudflare", "token-error");
    return redirect(home.toString(), [clearState]);
  }

  try {
    const callback = env.CLOUDFLARE_REDIRECT_URI || new URL("/auth/cloudflare/callback", url.origin).toString();
    const tokenResponse = await fetch("https://dash.cloudflare.com/oauth2/token", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.CLOUDFLARE_CLIENT_ID,
        client_secret: env.CLOUDFLARE_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: callback,
      }),
    });
    const tokenData = await tokenResponse.json() as { access_token?: string; expires_in?: number };
    if (!tokenResponse.ok || !tokenData.access_token) throw new Error("token_exchange_failed");

    const ttl = Math.max(60, Math.min(Number(tokenData.expires_in) || 8 * 60 * 60, 8 * 60 * 60));
    const session = await encryptSession(tokenData.access_token, env.SESSION_SECRET, ttl);
    home.searchParams.set("cloudflare", "connected");
    return redirect(home.toString(), [clearState, cookie("cloudflare_session", session, "/api/", ttl)]);
  } catch {
    home.searchParams.set("cloudflare", "token-error");
    return redirect(home.toString(), [clearState]);
  }
}
