import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createMemoryAuthStorage } from "@/lib/auth/memory-storage";
import { TAB_SESSION_KEY } from "@/lib/auth/constants";

let browserClient: SupabaseClient | null = null;

export function getBrowserSupabaseClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storage: createMemoryAuthStorage(),
          persistSession: false,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        isSingleton: true,
      }
    );
  }

  return browserClient;
}

export function markTabSessionActive() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(TAB_SESSION_KEY, "1");
}

export function clearTabSessionMarker() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(TAB_SESSION_KEY);
}

export function hasTabSessionMarker() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(TAB_SESSION_KEY) === "1";
}

/** @deprecated Tokens are no longer stored in localStorage. */
export function clearStoredAuthSessions() {
  clearTabSessionMarker();
}

/** @deprecated Use server login instead. */
export function createBrowserSupabaseClient(_remember?: boolean) {
  return getBrowserSupabaseClient();
}

/** @deprecated Use SessionBootstrap instead. */
export function shouldRememberSession() {
  return false;
}

/** @deprecated Use server login instead. */
export function setRememberSession(_remember: boolean) {}

/** @deprecated Tokens are no longer stored in localStorage. */
export function clearSupabaseDocumentCookies() {}

/** @deprecated Use SessionBootstrap instead. */
export async function enforceTabScopedSession() {}