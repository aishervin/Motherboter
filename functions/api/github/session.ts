import { githubHeaders, json, readSession } from "../../_lib/github-session";
import type { PagesContext } from "../../_lib/github-session";

export async function onRequestGet({ request, env }: PagesContext) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) return json({ error: "github_oauth_not_configured" }, 503);
  const token = await readSession(request, env.SESSION_SECRET);
  if (!token) return json({ connected: false });

  const response = await fetch("https://api.github.com/user", { headers: githubHeaders(token) });
  if (response.status === 401) return json({ connected: false });
  if (!response.ok) return json({ error: "github_user_check_failed" }, 502);

  const user = await response.json() as { login: string; name: string | null; avatar_url: string };
  return json({ connected: true, user: { login: user.login, name: user.name, avatar_url: user.avatar_url } });
}
