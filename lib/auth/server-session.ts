import { cookies } from "next/headers";
import type { Session, User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { REMEMBER_ME_COOKIE } from "@/lib/auth/constants";

export type ServerSessionResult =
  | { ok: true; rememberMe: boolean; user: User; session: Session }
  | { ok: false; rememberMe: boolean };

export async function getAuthenticatedServerSession(): Promise<ServerSessionResult> {
  const cookieStore = await cookies();
  const rememberMe = cookieStore.get(REMEMBER_ME_COOKIE)?.value === "1";
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, rememberMe };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { ok: false, rememberMe };
  }

  return { ok: true, rememberMe, user, session };
}

export const SESSION_NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};