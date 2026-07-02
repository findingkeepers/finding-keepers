import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { REMEMBER_ME_COOKIE } from "@/lib/auth/constants";

export async function GET() {
  const cookieStore = await cookies();
  const rememberMe = cookieStore.get(REMEMBER_ME_COOKIE)?.value === "1";
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ user: null, session: null, rememberMe }, { status: 401 });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ user: null, session: null, rememberMe }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      email_confirmed_at: user.email_confirmed_at,
      user_metadata: user.user_metadata,
    },
    session: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      expires_at: session.expires_at,
      token_type: session.token_type,
    },
    rememberMe,
  });
}