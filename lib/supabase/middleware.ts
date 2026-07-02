import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  applySecureAuthCookieOptions,
  getRememberMeFromCookies,
} from "@/lib/auth/cookie-options";
import { getSafeRedirectPath } from "@/lib/auth/safe-redirect";

const PROTECTED_PREFIXES = ["/dashboard", "/browse"];
const ADMIN_PREFIX = "/fk-admin";
const PUBLIC_AUTH_PAGES = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth/confirm",
  "/fk-admin/login",
]);

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isAdminPath(pathname: string) {
  return pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`);
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const requiresAuth =
    isProtectedPath(pathname) ||
    (isAdminPath(pathname) && pathname !== "/fk-admin/login");

  if (requiresAuth && !user) {
    const loginPath = isAdminPath(pathname) ? "/fk-admin/login" : "/login";
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = loginPath;
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (
    user &&
    PUBLIC_AUTH_PAGES.has(pathname) &&
    pathname !== "/fk-admin/login"
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAdminPath(pathname) && pathname !== "/fk-admin/login") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (user && pathname === "/login") {
    const next = getSafeRedirectPath(
      request.nextUrl.searchParams.get("next"),
      "/dashboard"
    );
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = next;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}