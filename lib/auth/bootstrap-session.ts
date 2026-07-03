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

async function syncClientSessionFromServer(): Promise<boolean> {
  const bootstrapResponse = await fetch("/api/auth/session/bootstrap", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  });

  if (!bootstrapResponse.ok) {
    return false;
  }

  const payload = (await bootstrapResponse.json()) as {
    ok?: boolean;
    session: {
      access_token: string;
      refresh_token: string;
      expires_in?: number;
      expires_at?: number;
      token_type?: string;
    } | null;
  };

  if (!payload.session) {
    return false;
  }

  const supabase = getBrowserSupabaseClient();
  const { error } = await supabase.auth.setSession(payload.session);

  if (error) {
    console.error("setSession error:", error);
    return false;
  }

  return true;
}

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
      authenticated: boolean;
      rememberMe: boolean;
    };

    if (!payload.authenticated) {
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

    const synced = await syncClientSessionFromServer();
    if (!synced) {
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
    if (!result.tabExpired) {
      cachedResult = result;
    }
    inflight = null;
    return result;
  });

  return inflight;
}

export function resetSessionBootstrap() {
  cachedResult = null;
  inflight = null;
}