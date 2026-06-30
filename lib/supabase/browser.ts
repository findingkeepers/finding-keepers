import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const REMEMBER_KEY = "fk_remember_me";

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

function clearSupabaseAuthKeys(storage: Storage) {
  Object.keys(storage)
    .filter((key) => key.startsWith("sb-"))
    .forEach((key) => storage.removeItem(key));
}

export function clearStoredAuthSessions() {
  if (typeof window === "undefined") {
    return;
  }

  clearSupabaseAuthKeys(window.localStorage);
  clearSupabaseAuthKeys(window.sessionStorage);
}

let browserClient: SupabaseClient | null = null;

export function createBrowserSupabaseClient(remember?: boolean) {
  if (remember !== undefined) {
    setRememberSession(remember);
    browserClient = null;
    clearStoredAuthSessions();
  }

  if (!browserClient) {
    const storage =
      typeof window !== "undefined"
        ? shouldRememberSession()
          ? window.localStorage
          : window.sessionStorage
        : undefined;

    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        isSingleton: false,
      }
    );
  }

  return browserClient;
}

export function getBrowserSupabaseClient() {
  return createBrowserSupabaseClient();
}