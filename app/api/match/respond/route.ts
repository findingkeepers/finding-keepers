import { NextResponse } from "next/server";
import { respondToMatchRequest } from "@/app/actions/match";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const requestId = body?.requestId as string | undefined;
    const decision = body?.decision as "approve" | "reject" | undefined;

    if (!requestId || (decision !== "approve" && decision !== "reject")) {
      return NextResponse.json(
        { success: false, message: "Invalid request" },
        { status: 400 }
      );
    }

    const result = await respondToMatchRequest({ requestId, decision });
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Match respond API error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}