import {
  clearTabSessionMarker,
  getBrowserSupabaseClient,
  hasTabSessionMarker,
  markTabSessionActive,
} from "@/lib/supabase/browser";

export type BootstrapResult = {
  authenticated: boolean;
  tabExpired?: boolean;
};

let cachedResult: BootstrapResult | null = null;
let inflight: Promise<BootstrapResult> | null = null;

async function runBootstrap(): Promise<BootstrapResult> {
  try {
    const response = await fetch("/api/auth/session", {
      credentials: "include",
      cache: "no-store",
    });

    if (response.status === 401) {
      return { authenticated: false };
    }

    if (!response.ok) {
      return { authenticated: false };
    }

    const payload = (await response.json()) as {
      session: {
        access_token: string;
        refresh_token: string;
        expires_in?: number;
        expires_at?: number;
        token_type?: string;
      } | null;
      rememberMe: boolean;
    };

    if (!payload.session) {
      return { authenticated: false };
    }

    if (!payload.rememberMe && !hasTabSessionMarker()) {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      clearTabSessionMarker();
      return { authenticated: false, tabExpired: true };
    }

    const supabase = getBrowserSupabaseClient();
    const { error } = await supabase.auth.setSession(payload.session);

    if (error) {
      console.error("setSession error:", error);
      return { authenticated: false };
    }

    if (!payload.rememberMe) {
      markTabSessionActive();
    }

    return { authenticated: true };
  } catch (error) {
    console.error("Session bootstrap error:", error);
    return { authenticated: false };
  }
}

export async function bootstrapClientSession(): Promise<BootstrapResult> {
  if (cachedResult) {
    return cachedResult;
  }

  if (inflight) {
    return inflight;
  }

  inflight = runBootstrap().then((result) => {
    cachedResult = result;
    inflight = null;
    return result;
  });

  return inflight;
}

export function resetSessionBootstrap() {
  cachedResult = null;
  inflight = null;
}