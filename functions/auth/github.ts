import { cookie } from "../_lib/github-session";
import type { PagesContext } from "../_lib/github-session";

export async function onRequestGet({ request, env }: PagesContext) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
    return new Response("GitHub OAuth is not configured.", { status: 503 });
  }

  const requestUrl = new URL(request.url);
  const callback = env.GITHUB_REDIRECT_URI || new URL("/auth/github/callback", requestUrl.origin).toString();
  const stateBytes = crypto.getRandomValues(new Uint8Array(32));
  const state = Array.from(stateBytes, byte => byte.toString(16).padStart(2, "0")).join("");
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", callback);
  authorize.searchParams.set("scope", "repo");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("allow_signup", "true");

  return new Response(null, {
    status: 302,
    headers: {
      location: authorize.toString(),
      "cache-control": "no-store",
      "set-cookie": cookie("github_oauth_state", state, "/auth/github", 600),
    },
  });
}
