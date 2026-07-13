import { NextResponse } from "next/server";
import { activateMatchIntroduction } from "@/app/actions/match";
import { assertSameOriginRequest } from "@/lib/api-origin";

export async function POST(request: Request) {
  try {
    if (!(await assertSameOriginRequest())) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const requestId = body?.requestId as string | undefined;

    if (!requestId) {
      return NextResponse.json(
        { success: false, message: "Invalid request" },
        { status: 400 }
      );
    }

    const result = await activateMatchIntroduction({ requestId });
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Match activate API error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}