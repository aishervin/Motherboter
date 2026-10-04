import { githubHeaders, json, readSession } from "../../_lib/github-session";
import type { PagesContext } from "../../_lib/github-session";

const allowedPath = /^(?:README\.md|package\.json|wrangler\.toml|src\/[A-Za-z0-9._/-]+\.(?:ts|tsx|js|json|md)|\.github\/workflows\/[A-Za-z0-9._-]+\.yml)$/;

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

async function githubError(response: Response) {
  const data = await response.json().catch(() => ({})) as { message?: string };
  return typeof data.message === "string" ? data.message : `GitHub returned ${response.status}`;
}

export async function onRequestPost({ request, env }: PagesContext) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "invalid_origin" }, 403);
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) return json({ error: "github_oauth_not_configured" }, 503);

  const token = await readSession(request, env.SESSION_SECRET);
  if (!token) return json({ error: "github_not_connected" }, 401);

  try {
    const body = await request.json() as { name?: string; files?: Record<string, unknown> };
    const name = body.name?.trim() || "motherbot";
    const files = body.files;
    if (!/^[A-Za-z0-9_.-]{1,100}$/.test(name)) return json({ error: "invalid_repository_name" }, 400);
    if (!files || typeof files !== "object" || Array.isArray(files)) return json({ error: "files_required" }, 400);
    const entries = Object.entries(files);
    if (entries.length < 1 || entries.length > 25) return json({ error: "invalid_file_count" }, 400);
    if (entries.some(([path, content]) => !allowedPath.test(path) || path.split("/").some(part => part === "." || part === "..") || typeof content !== "string")) {
      return json({ error: "invalid_file_path_or_content" }, 400);
    }
    if (entries.reduce((total, [, content]) => total + (content as string).length, 0) > 3_000_000) {
      return json({ error: "payload_too_large" }, 413);
    }

    const headers = { ...githubHeaders(token), "content-type": "application/json" };
    const userResponse = await fetch("https://api.github.com/user", { headers });
    if (!userResponse.ok) return json({ error: userResponse.status === 401 ? "github_session_expired" : await githubError(userResponse) }, userResponse.status === 401 ? 401 : 502);
    const user = await userResponse.json() as { login: string };

    const createResponse = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers,
      body: JSON.stringify({ name, private: true, auto_init: true }),
    });
    let repository: { full_name: string; html_url: string; private: boolean };
    let created = createResponse.ok;
    if (created) {
      repository = await createResponse.json() as typeof repository;
    } else if (createResponse.status === 422) {
      const existingResponse = await fetch(`https://api.github.com/repos/${encodeURIComponent(user.login)}/${encodeURIComponent(name)}`, { headers });
      if (!existingResponse.ok) return json({ error: await githubError(createResponse) }, 409);
      repository = await existingResponse.json() as typeof repository;
      if (!repository.private || repository.full_name.toLowerCase() !== `${user.login}/${name}`.toLowerCase()) {
        return json({ error: "repository_exists_but_is_not_private_or_owned" }, 409);
      }
    } else {
      return json({ error: await githubError(createResponse) }, createResponse.status >= 400 && createResponse.status < 500 ? createResponse.status : 502);
    }

    for (const [path, content] of entries as [string, string][]) {
      const url = `https://api.github.com/repos/${encodeURIComponent(user.login)}/${encodeURIComponent(name)}/contents/${path.split("/").map(encodeURIComponent).join("/")}`;
      const current = await fetch(url, { headers });
      let sha: string | undefined;
      if (current.ok) sha = (await current.json() as { sha: string }).sha;
      else if (current.status !== 404) return json({ error: await githubError(current), repository: repository.html_url, created }, 502);

      const saved = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify({ message: `${sha ? "update" : "add"} ${path}`, content: encodeBase64(content), ...(sha ? { sha } : {}) }),
      });
      if (!saved.ok) return json({ error: await githubError(saved), repository: repository.html_url, created }, 502);
    }

    return json({ repository: repository.html_url, fullName: repository.full_name, created, filesWritten: entries.length });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "request_failed" }, 400);
  }
}
