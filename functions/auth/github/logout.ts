import { expiredCookie, json } from "../../_lib/github-session";
import type { PagesContext } from "../../_lib/github-session";

export async function onRequestPost({ request }: PagesContext) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return json({ error: "invalid_origin" }, 403);
  }
  const headers = new Headers();
  headers.append("set-cookie", expiredCookie("github_session", "/api/"));
  return json({ connected: false }, 200, headers);
}
