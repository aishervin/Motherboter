import { json, readSession } from "../../_lib/github-session";
import type { PagesContext } from "../../_lib/github-session";

export async function onRequestGet({ request, env }: PagesContext) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) return json({ error: "cloudflare_oauth_not_configured" }, 503);
  const token = await readSession(request, env.SESSION_SECRET, "cloudflare_session");
  if (!token) return json({ connected: false });

  const response = await fetch("https://api.cloudflare.com/client/v4/accounts?page=1&per_page=50", {
    headers: { accept: "application/json", authorization: `Bearer ${token}` },
  });
  const data = await response.json() as { success?: boolean; errors?: { message?: string }[]; result?: { id: string; name: string; type?: string }[] };
  if (!response.ok || !data.success) return json({ error: data.errors?.[0]?.message || "cloudflare_account_check_failed" }, 502);
  return json({ connected: true, accounts: data.result?.map(({ id, name, type }) => ({ id, name, type })) || [] });
}
