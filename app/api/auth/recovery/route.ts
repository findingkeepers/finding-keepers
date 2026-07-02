import { NextRequest, NextResponse } from "next/server";
import { assertSameOriginRequest } from "@/lib/api-origin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!(await assertSameOriginRequest())) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let body: { access_token?: string; refresh_token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request body" },
      { status: 400 }
    );
  }

  const access_token = body.access_token?.trim();
  const refresh_token = body.refresh_token?.trim();

  if (!access_token || !refresh_token) {
    return NextResponse.json(
      { ok: false, message: "Missing recovery session tokens" },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });

  if (error) {
    console.error("Recovery session sync error:", error);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 401 }
    );
  }

  return NextResponse.json({ ok: true });
}