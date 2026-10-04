import { cookie, encryptSession, expiredCookie, getCookie, redirect } from "../../_lib/github-session";
import type { PagesContext } from "../../_lib/github-session";

export async function onRequestGet({ request, env }: PagesContext) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "";
  const expectedState = getCookie(request, "github_oauth_state");
  const clearState = expiredCookie("github_oauth_state", "/auth/github");
  const home = new URL("/", url.origin);

  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
    home.searchParams.set("github", "not-configured");
    return redirect(home.toString(), [clearState]);
  }
  if (url.searchParams.has("error")) {
    home.searchParams.set("github", "denied");
    return redirect(home.toString(), [clearState]);
  }
  if (!state || !expectedState || state !== expectedState) {
    home.searchParams.set("github", "state-error");
    return redirect(home.toString(), [clearState]);
  }

  const code = url.searchParams.get("code");
  if (!code) {
    home.searchParams.set("github", "token-error");
    return redirect(home.toString(), [clearState]);
  }

  try {
    const callback = env.GITHUB_REDIRECT_URI || new URL("/auth/github/callback", url.origin).toString();
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: callback,
      }),
    });
    const tokenData = await tokenResponse.json() as { access_token?: string; error?: string };
    if (!tokenResponse.ok || !tokenData.access_token) throw new Error(tokenData.error || "token_exchange_failed");

    const userResponse = await fetch("https://api.github.com/user", {
      headers: { accept: "application/vnd.github+json", authorization: `Bearer ${tokenData.access_token}`, "user-agent": "Motherboter" },
    });
    if (!userResponse.ok) throw new Error("github_user_check_failed");

    const session = await encryptSession(tokenData.access_token, env.SESSION_SECRET);
    home.searchParams.set("github", "connected");
    return redirect(home.toString(), [clearState, cookie("github_session", session, "/api/", 8 * 60 * 60)]);
  } catch {
    home.searchParams.set("github", "token-error");
    return redirect(home.toString(), [clearState]);
  }
}
