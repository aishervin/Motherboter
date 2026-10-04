import { expiredCookie, json, readSession } from "../../_lib/github-session";
import type { PagesContext } from "../../_lib/github-session";

export async function onRequestGet({ request, env }: PagesContext) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) return json({ error: "session_not_configured" }, 503);
  const token = await readSession(request, env.SESSION_SECRET, "cloudflare_session");
  if (!token) return json({ connected: false });

  let response: Response;
  try {
    response = await fetch("https://api.cloudflare.com/client/v4/accounts?page=1&per_page=50", {
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
    });
  } catch {
    return json({ error: "cloudflare_connection_failed" }, 502);
  }
  const data = await response.json().catch(() => null) as { success?: boolean; errors?: { code?: number | string }[]; result?: { id: string; name: string; type?: string }[] } | null;
  if (!response.ok || !data?.success || !data.result?.length) {
    const authFailure = [400, 401, 403].includes(response.status) || data?.errors?.some(error => [6003, 9106, 9109, 10000].includes(Number(error.code)));
    if (authFailure || (data?.success && !data.result?.length)) {
      const headers = new Headers();
      headers.append("set-cookie", expiredCookie("cloudflare_session", "/api/"));
      const error = data?.success ? "cloudflare_no_accounts" : "cloudflare_token_invalid_or_permission_missing";
      return json({ connected: false, error }, 403, headers);
    }
    return json({ error: "cloudflare_connection_failed" }, 502);
  }
  return json({ connected: true, accounts: data.result.map(({ id, name, type }) => ({ id, name, type })) });
}
