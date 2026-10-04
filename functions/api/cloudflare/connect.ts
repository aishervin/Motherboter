import { cookie, encryptSession, json } from "../../_lib/github-session";
import type { PagesContext } from "../../_lib/github-session";

type CloudflareAccount = { id: string; name: string; type?: string };
type CloudflareResponse = {
  success?: boolean;
  errors?: { code?: number | string; message?: string }[];
  result?: CloudflareAccount[];
};

export async function onRequestPost({ request, env }: PagesContext) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "invalid_origin" }, 403);
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) return json({ error: "session_not_configured" }, 503);

  let token: string;
  try {
    const body = await request.json() as { token?: unknown };
    token = typeof body.token === "string" ? body.token.trim() : "";
  } catch {
    return json({ error: "token_required" }, 400);
  }
  if (token.length < 16 || token.length > 2000 || /[\u0000-\u001f\u007f]/.test(token)) {
    return json({ error: "token_required" }, 400);
  }

  let response: Response;
  try {
    response = await fetch("https://api.cloudflare.com/client/v4/accounts?page=1&per_page=50", {
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
    });
  } catch {
    return json({ error: "cloudflare_connection_failed" }, 502);
  }
  const data = await response.json().catch(() => null) as CloudflareResponse | null;
  if (!response.ok || !data?.success) {
    const authFailure = [400, 401, 403].includes(response.status) || data?.errors?.some(error => [6003, 9106, 9109, 10000].includes(Number(error.code)));
    return json({ error: authFailure ? "cloudflare_token_invalid_or_permission_missing" : "cloudflare_connection_failed" }, authFailure ? 403 : 502);
  }

  const accounts = (data.result || []).map(({ id, name, type }) => ({ id, name, type }));
  if (!accounts.length) return json({ error: "cloudflare_no_accounts" }, 403);

  const maxAge = 8 * 60 * 60;
  const session = await encryptSession(token, env.SESSION_SECRET, maxAge);
  const headers = new Headers();
  headers.append("set-cookie", cookie("cloudflare_session", session, "/api/", maxAge));
  return json({ connected: true, accounts }, 200, headers);
}
