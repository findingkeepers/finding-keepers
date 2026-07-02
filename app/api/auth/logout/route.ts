import { NextResponse } from "next/server";
import { assertSameOriginRequest } from "@/lib/api-origin";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { REMEMBER_ME_COOKIE } from "@/lib/auth/constants";

function clearCookieOnResponse(
  response: NextResponse,
  name: string
) {
  response.cookies.set(name, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function POST() {
  if (!(await assertSameOriginRequest())) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const cookieStore = await cookies();
  const cookieNamesToClear = new Set<string>([REMEMBER_ME_COOKIE]);

  cookieStore.getAll().forEach((cookie) => {
    if (cookie.name.startsWith("sb-")) {
      cookieNamesToClear.add(cookie.name);
    }
  });

  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();

  cookieStore.getAll().forEach((cookie) => {
    if (cookie.name.startsWith("sb-")) {
      cookieNamesToClear.add(cookie.name);
    }
  });

  const response = NextResponse.json({ ok: true });

  cookieNamesToClear.forEach((name) => {
    clearCookieOnResponse(response, name);
  });

  return response;
}