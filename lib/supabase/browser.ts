import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const REMEMBER_KEY = "fk_remember_me";
const AUTH_COOKIES_KEY = "fk-supabase-auth-cookies";

type StoredCookie = {
  name: string;
  value: string;
};

export function shouldRememberSession() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(REMEMBER_KEY) === "1";
}

export function setRememberSession(remember: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  if (remember) {
    window.localStorage.setItem(REMEMBER_KEY, "1");
  } else {
    window.localStorage.removeItem(REMEMBER_KEY);
  }
}

function getAuthCookieStore() {
  return shouldRememberSession() ? window.localStorage : window.sessionStorage;
}

function readStoredCookies(): StoredCookie[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = getAuthCookieStore().getItem(AUTH_COOKIES_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as StoredCookie[];
  } catch {
    return [];
  }
}

function writeStoredCookies(cookies: StoredCookie[]) {
  const store = getAuthCookieStore();
  if (cookies.length === 0) {
    store.removeItem(AUTH_COOKIES_KEY);
    return;
  }

  store.setItem(AUTH_COOKIES_KEY, JSON.stringify(cookies));
}

function clearStoredCookiesIn(storage: Storage) {
  storage.removeItem(AUTH_COOKIES_KEY);
  Object.keys(storage)
    .filter((key) => key.startsWith("sb-"))
    .forEach((key) => storage.removeItem(key));
}

export function clearSupabaseDocumentCookies() {
  if (typeof document === "undefined") {
    return;
  }

  const cookieNames = document.cookie
    .split(";")
    .map((part) => part.trim().split("=")[0])
    .filter((name) => name.startsWith("sb-"));

  cookieNames.forEach((name) => {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
  });
}

export function clearStoredAuthSessions() {
  if (typeof window === "undefined") {
    return;
  }

  clearStoredCookiesIn(window.localStorage);
  clearStoredCookiesIn(window.sessionStorage);
  clearSupabaseDocumentCookies();
}

function createRememberAwareCookieMethods() {
  return {
    getAll() {
      return readStoredCookies();
    },
    setAll(cookiesToSet: { name: string; value: string }[]) {
      let current = readStoredCookies();

      cookiesToSet.forEach(({ name, value }) => {
        current = current.filter(
          (cookie) => cookie.name !== name && !cookie.name.startsWith(`${name}.`)
        );

        if (value) {
          current.push({ name, value });
        }
      });

      writeStoredCookies(current);
    },
  };
}

let browserClient: SupabaseClient | null = null;

export function createBrowserSupabaseClient(remember?: boolean) {
  if (remember !== undefined) {
    setRememberSession(remember);
    browserClient = null;
    clearStoredAuthSessions();
  }

  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: createRememberAwareCookieMethods(),
        isSingleton: false,
      }
    );
  }

  return browserClient;
}

export function getBrowserSupabaseClient() {
  return createBrowserSupabaseClient();
}

export async function enforceTabScopedSession() {
  if (typeof window === "undefined" || shouldRememberSession()) {
    return;
  }

  clearSupabaseDocumentCookies();

  if (readStoredCookies().length === 0) {
    const client = getBrowserSupabaseClient();
    await client.auth.signOut();
  }
}