/*
 * Minimal Supabase client (Auth + PostgREST) built on fetch.
 *
 * Kept dependency-free on purpose: we only need password sign-in, RPC calls and
 * a few table reads/updates. Row-level security and the SECURITY DEFINER
 * functions in the database do all the real authorization — this file only
 * carries the signed-in staff member's access token.
 *
 * The URL and publishable key are safe to ship to the browser (they are public
 * by design). Override them with VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY.
 */

type Env = Record<string, string | undefined>;
const env = ((import.meta as unknown as { env?: Env }).env ?? {}) as Env;

export const SUPABASE_URL = (env["VITE_SUPABASE_URL"] ??
  "https://jnosteriewkkvoyyasyo.supabase.co") as string;
const PUBLISHABLE_KEY = (env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
  "sb_publishable_9_TUJgStTulSpyf5hxItHA_Fk2lkllC") as string;

export class ApiError extends Error {
  status: number;
  code: string | null;
  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/* ------------------------------ Auth session ------------------------------ */

export type Session = {
  accessToken: string;
  refreshToken: string;
  /** epoch seconds */
  expiresAt: number;
  userId: string;
  email: string;
};

const SESSION_KEY = "sahasaknaada:sb-session";
const AUTH_EVENT = "sahasaknaada:auth-changed";

function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function writeSession(s: Session | null) {
  if (typeof window === "undefined") return;
  try {
    if (s) window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable — session lives only for this call */
  }
  window.dispatchEvent(new CustomEvent(AUTH_EVENT));
}

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { id: string; email?: string };
  error_description?: string;
  msg?: string;
};

function toSession(t: TokenResponse): Session {
  return {
    accessToken: t.access_token,
    refreshToken: t.refresh_token,
    expiresAt: Math.floor(Date.now() / 1000) + t.expires_in,
    userId: t.user.id,
    email: t.user.email ?? "",
  };
}

async function tokenRequest(grant: "password" | "refresh_token", body: object) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=${grant}`, {
    method: "POST",
    headers: { apikey: PUBLISHABLE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok) {
    throw new ApiError(json.error_description ?? json.msg ?? "Sign-in failed.", res.status, "auth");
  }
  return toSession(json);
}

export async function signIn(email: string, password: string): Promise<Session> {
  const s = await tokenRequest("password", { email: email.trim(), password });
  writeSession(s);
  return s;
}

export async function signOut(): Promise<void> {
  const s = readSession();
  writeSession(null);
  if (!s) return;
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${s.accessToken}` },
    });
  } catch {
    /* already cleared locally */
  }
}

let refreshing: Promise<Session | null> | null = null;

/** Current session, refreshing the access token if it is about to expire. */
export async function getSession(): Promise<Session | null> {
  const s = readSession();
  if (!s) return null;
  if (s.expiresAt - 60 > Math.floor(Date.now() / 1000)) return s;
  if (!refreshing) {
    refreshing = tokenRequest("refresh_token", { refresh_token: s.refreshToken })
      .then((next) => {
        writeSession(next);
        return next;
      })
      .catch((e: unknown) => {
        // Only drop the session if the server rejected it. On a network blip (flaky
        // event wifi) keep it so the desk isn't signed out mid-event.
        if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
          writeSession(null);
          return null;
        }
        return s;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export function onAuthChange(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(AUTH_EVENT, cb);
  return () => window.removeEventListener(AUTH_EVENT, cb);
}

/* --------------------------------- REST ---------------------------------- */

type PgError = { code?: string; message?: string; details?: string };

async function request<T>(
  path: string,
  init: { method: string; body?: unknown; prefer?: string },
): Promise<T> {
  const session = await getSession();
  const headers: Record<string, string> = {
    apikey: PUBLISHABLE_KEY,
    "Content-Type": "application/json",
  };
  if (session) headers["Authorization"] = `Bearer ${session.accessToken}`;
  if (init.prefer) headers["Prefer"] = init.prefer;

  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method: init.method,
      headers,
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    });
  } catch {
    throw new ApiError("Couldn't reach the server. Check your connection and try again.", 0);
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as PgError;
    // Messages raised by our database functions use errcode P0001 and are written
    // for end users; anything else gets a generic message.
    const friendly =
      err.code === "P0001"
        ? (err.message ?? "Something went wrong.")
        : err.code === "42501" || res.status === 401 || res.status === 403
          ? "You don't have permission to do that."
          : "Something went wrong. Please try again.";
    throw new ApiError(friendly, res.status, err.code ?? null);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function rpc<T>(fn: string, args: object = {}): Promise<T> {
  return request<T>(`rpc/${fn}`, { method: "POST", body: args });
}

export function select<T>(query: string): Promise<T> {
  return request<T>(query, { method: "GET" });
}

export function update(query: string, patch: object): Promise<void> {
  return request<void>(query, { method: "PATCH", body: patch, prefer: "return=minimal" });
}

export function remove(query: string): Promise<void> {
  return request<void>(query, { method: "DELETE", prefer: "return=minimal" });
}
