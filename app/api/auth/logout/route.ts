import { NextResponse } from "next/server";
import { assertSameOriginRequest } from "@/lib/api-origin";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { REMEMBER_ME_COOKIE } from "@/lib/auth/constants";

export async function POST() {
  if (!(await assertSameOriginRequest())) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete(REMEMBER_ME_COOKIE);

  const response = NextResponse.json({ ok: true });
  const authCookies = cookieStore
    .getAll()
    .filter((cookie) => cookie.name.startsWith("sb-"));

  authCookies.forEach((cookie) => {
    response.cookies.set(cookie.name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  });

  return response;
}