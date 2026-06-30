import { NextResponse, type NextRequest } from "next/server";
import { PRODUCTION_APP_URL } from "@/lib/app-url";

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
  const canonicalRedirect = redirectProductionVercelHost(request);
  if (canonicalRedirect) {
    return canonicalRedirect;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};