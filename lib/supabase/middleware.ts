import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  applySecureAuthCookieOptions,
  getRememberMeFromCookies,
} from "@/lib/auth/cookie-options";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          const rememberMe = getRememberMeFromCookies([
            ...request.cookies.getAll(),
            ...cookiesToSet,
          ]);

          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(
              name,
              value,
              applySecureAuthCookieOptions(options, rememberMe)
            );
          });
        },
      },
    }
  );

  await supabase.auth.getUser();
  return supabaseResponse;
}