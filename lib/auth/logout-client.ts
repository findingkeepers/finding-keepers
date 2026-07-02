import { resetSessionBootstrap } from "@/lib/auth/bootstrap-session";
import {
  clearTabSessionMarker,
  getBrowserSupabaseClient,
} from "@/lib/supabase/browser";

export async function performClientLogout(redirectTo = "/login") {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
  } catch (error) {
    console.error("Logout API error:", error);
  }

  try {
    await getBrowserSupabaseClient().auth.signOut();
  } catch (error) {
    console.error("Client signOut error:", error);
  }

  clearTabSessionMarker();
  resetSessionBootstrap();

  window.location.replace(redirectTo);
}