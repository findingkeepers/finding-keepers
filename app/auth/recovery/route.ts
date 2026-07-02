import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  applySecureAuthCookieOptions,
  getRememberMeFromCookies,
} from "@/lib/auth/cookie-options";

function buildRedirect(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");

  let response = buildRedirect(request, "/reset-password");

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

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(
              name,
              value,
              applySecureAuthCookieOptions(options, rememberMe)
            );
          });
        },
      },
    }
  );

  if (token_hash && type === "recovery") {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: "recovery",
    });

    if (error) {
      console.error("Recovery token verify error:", error);
      return buildRedirect(request, "/reset-password?error=recovery_failed");
    }

    return response;
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Recovery code exchange error:", error);
      return buildRedirect(request, "/reset-password?error=recovery_failed");
    }

    return response;
  }

  return buildRedirect(request, "/reset-password?error=recovery_failed");
}