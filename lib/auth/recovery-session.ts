import { supabase } from "@/lib/supabase";
import { markTabSessionActive } from "@/lib/supabase/browser";

export async function syncServerRecoverySession(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token && session.refresh_token) {
    const syncResponse = await fetch("/api/auth/recovery", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }),
    });

    if (syncResponse.ok) {
      markTabSessionActive();
      return true;
    }
  }

  const sessionResponse = await fetch("/api/auth/session", {
    credentials: "include",
    cache: "no-store",
  });

  if (!sessionResponse.ok) {
    return false;
  }

  const payload = await sessionResponse.json();
  if (!payload.session) {
    return false;
  }

  const { error } = await supabase.auth.setSession(payload.session);
  if (error) {
    return false;
  }

  markTabSessionActive();
  return true;
}