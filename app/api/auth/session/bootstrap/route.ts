import { NextResponse } from "next/server";
import { assertSameOriginRequest } from "@/lib/api-origin";
import {
  getAuthenticatedServerSession,
  SESSION_NO_STORE_HEADERS,
} from "@/lib/auth/server-session";

export async function POST() {
  if (!(await assertSameOriginRequest())) {
    return NextResponse.json(
      { ok: false, message: "Forbidden" },
      { status: 403, headers: SESSION_NO_STORE_HEADERS }
    );
  }

  const auth = await getAuthenticatedServerSession();

  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, session: null },
      { status: 401, headers: SESSION_NO_STORE_HEADERS }
    );
  }

  const { session } = auth;

  return NextResponse.json(
    {
      ok: true,
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
        token_type: session.token_type,
      },
    },
    { headers: SESSION_NO_STORE_HEADERS }
  );
}