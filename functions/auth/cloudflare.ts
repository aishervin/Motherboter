import { cookie } from "../_lib/github-session";
import type { PagesContext } from "../_lib/github-session";

export async function onRequestGet({ request, env }: PagesContext) {
  if (!env.CLOUDFLARE_CLIENT_ID || !env.CLOUDFLARE_CLIENT_SECRET || !env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
    return new Response("Cloudflare OAuth is not configured.", { status: 503 });
  }

  const requestUrl = new URL(request.url);
  const callback = env.CLOUDFLARE_REDIRECT_URI || new URL("/auth/cloudflare/callback", requestUrl.origin).toString();
  const stateBytes = crypto.getRandomValues(new Uint8Array(32));
  const state = Array.from(stateBytes, byte => byte.toString(16).padStart(2, "0")).join("");
  const authorize = new URL("https://dash.cloudflare.com/oauth2/auth");
  authorize.searchParams.set("client_id", env.CLOUDFLARE_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", callback);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "account.read");
  authorize.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      location: authorize.toString(),
      "cache-control": "no-store",
      "set-cookie": cookie("cloudflare_oauth_state", state, "/auth/cloudflare", 600),
    },
  });
}
