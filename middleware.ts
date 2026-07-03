import { NextResponse, type NextRequest } from "next/server";
import { PRODUCTION_APP_URL } from "@/lib/app-url";
import { buildContentSecurityPolicy } from "@/lib/csp";
import { updateSession } from "@/lib/supabase/middleware";

const canonicalHost = new URL(PRODUCTION_APP_URL).hostname;

function redirectProductionVercelHost(request: NextRequest) {
  if (process.env.VERCEL_ENV !== "production") {
    return null;
  }

  const hostname = request.nextUrl.hostname;
  if (hostname === canonicalHost || !hostname.endsWith(".vercel.app")) {
    return null;
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.hostname = canonicalHost;
  redirectUrl.protocol = "https:";
  return NextResponse.redirect(redirectUrl, 308);
}

export async function middleware(request: NextRequest) {
  const csp = buildContentSecurityPolicy();

  const canonicalRedirect = redirectProductionVercelHost(request);
  if (canonicalRedirect) {
    canonicalRedirect.headers.set("Content-Security-Policy", csp.value);
    return canonicalRedirect;
  }

  return updateSession(request, csp);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};