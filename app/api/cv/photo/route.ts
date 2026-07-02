import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getStoragePathFromPublicUrl(url: string): string | null {
  const marker = "/profile-photos/";
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length).split("?")[0] || null;
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const photoUrl = request.nextUrl.searchParams.get("url");
  if (!photoUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    const storagePath = getStoragePathFromPublicUrl(photoUrl);

    if (storagePath) {
      const admin = createAdminSupabaseClient();
      const storageClient = admin ?? supabase;
      const { data, error } = await storageClient.storage
        .from("profile-photos")
        .download(storagePath);

      if (!error && data) {
        const buffer = Buffer.from(await data.arrayBuffer());
        const mime = data.type || "image/jpeg";
        return NextResponse.json({
          dataUrl: `data:${mime};base64,${buffer.toString("base64")}`,
        });
      }
    }

    const response = await fetch(photoUrl);
    if (!response.ok) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const mime = response.headers.get("content-type") || "image/jpeg";
    return NextResponse.json({
      dataUrl: `data:${mime};base64,${buffer.toString("base64")}`,
    });
  } catch (error) {
    console.error("CV photo fetch error:", error);
    return NextResponse.json({ error: "Failed to load photo" }, { status: 500 });
  }
}