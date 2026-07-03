import { NextResponse } from "next/server";
import {
  getAuthenticatedServerSession,
  SESSION_NO_STORE_HEADERS,
} from "@/lib/auth/server-session";

export async function GET() {
  const auth = await getAuthenticatedServerSession();

  if (!auth.ok) {
    return NextResponse.json(
      { authenticated: false, rememberMe: auth.rememberMe, user: null },
      { status: 401, headers: SESSION_NO_STORE_HEADERS }
    );
  }

  const { user, rememberMe } = auth;

  return NextResponse.json(
    {
      authenticated: true,
      rememberMe,
      user: {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
      },
    },
    { headers: SESSION_NO_STORE_HEADERS }
  );
}