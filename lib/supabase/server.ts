import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  applySecureAuthCookieOptions,
  getRememberMeFromCookies,
} from "@/lib/auth/cookie-options";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const rememberMe = getRememberMeFromCookies(cookieStore.getAll());

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(
                name,
                value,
                applySecureAuthCookieOptions(options, rememberMe)
              );
            });
          } catch {
            // setAll can fail in Server Components; middleware handles refresh.
          }
        },
      },
    }
  );
}