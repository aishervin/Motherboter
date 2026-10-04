export type Env = {
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GITHUB_REDIRECT_URI?: string;
  SESSION_SECRET?: string;
};

export type PagesContext = { request: Request; env: Env };

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function sessionKey(secret: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSession(token: string, secret: string, maxAgeSeconds = 8 * 60 * 60) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await sessionKey(secret);
  const payload = encoder.encode(JSON.stringify({ token, expiresAt: Date.now() + maxAgeSeconds * 1000 }));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, payload);
  const packed = new Uint8Array(iv.length + ciphertext.byteLength);
  packed.set(iv);
  packed.set(new Uint8Array(ciphertext), iv.length);
  return toBase64Url(packed);
}

export async function readSession(request: Request, secret?: string, cookieName = "github_session") {
  if (!secret) return null;
  const value = getCookie(request, cookieName);
  if (!value) return null;
  try {
    const packed = fromBase64Url(value);
    const iv = packed.slice(0, 12);
    const ciphertext = packed.slice(12);
    const key = await sessionKey(secret);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    const session = JSON.parse(new TextDecoder().decode(plaintext)) as { token?: string; expiresAt?: number };
    return session.token && session.expiresAt && session.expiresAt > Date.now() ? session.token : null;
  } catch {
    return null;
  }
}

export function getCookie(request: Request, name: string) {
  const prefix = `${name}=`;
  return request.headers.get("cookie")?.split(";").map(value => value.trim()).find(value => value.startsWith(prefix))?.slice(prefix.length) || "";
}

export function cookie(name: string, value: string, path: string, maxAge: number) {
  return `${name}=${value}; Path=${path}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export function expiredCookie(name: string, path: string) {
  return `${name}=; Path=${path}; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

export function json(body: unknown, status = 200, headers = new Headers()) {
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(body), { status, headers });
}

export function redirect(location: string, cookies: string[] = []) {
  const headers = new Headers({ location, "cache-control": "no-store" });
  for (const value of cookies) headers.append("set-cookie", value);
  return new Response(null, { status: 302, headers });
}

export function githubHeaders(token: string) {
  return {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "user-agent": "Motherboter",
    "x-github-api-version": "2022-11-28",
  };
}
