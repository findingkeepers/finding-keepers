"use server";

import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { CVPdf } from "@/components/CVPdf";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getProfilePhotoStoragePath } from "@/lib/profile-photo";

async function resolvePhotoForPdf(
  stored: string | null | undefined
): Promise<string | null> {
  if (!stored?.trim()) {
    return null;
  }

  if (stored.startsWith("data:")) {
    return stored;
  }

  const path = getProfilePhotoStoragePath(stored);
  if (!path) {
    return null;
  }

  const admin = createAdminSupabaseClient();
  const client = admin ?? (await createServerSupabaseClient());
  const { data, error } = await client.storage
    .from("profile-photos")
    .download(path);

  if (error || !data) {
    console.error("PDF photo download error:", error);
    return null;
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const mime = (data.type || "image/jpeg").toLowerCase();
  if (
    mime.includes("heic") ||
    mime.includes("heif") ||
    mime.includes("avif") ||
    mime.includes("tiff")
  ) {
    return null;
  }

  const safeMime = mime.startsWith("image/") ? mime : "image/jpeg";
  return `data:${safeMime};base64,${buffer.toString("base64")}`;
}

export async function generateCvPdfDownload({
  shortId,
  data,
  photoUrl,
}: {
  shortId: string;
  data: Record<string, string>;
  photoUrl?: string | null;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, message: "Not authenticated" };
  }

  const { data: cv } = await supabase
    .from("cvs")
    .select("user_id, photo_url")
    .eq("short_id", shortId)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";
  const isOwner = cv?.user_id === user.id;

  if (!isOwner && !isAdmin) {
    return { ok: false as const, message: "Not allowed to download this CV" };
  }

  const embeddedPhoto =
    (await resolvePhotoForPdf(photoUrl)) ||
    (await resolvePhotoForPdf(data.photoUrl)) ||
    (await resolvePhotoForPdf(cv?.photo_url));

  const pdfData = {
    ...data,
    shortID: data.shortID || shortId,
    photoUrl: embeddedPhoto || "",
  };

  try {
    const buffer = await renderToBuffer(
      React.createElement(CVPdf, {
        data: pdfData,
      }) as Parameters<typeof renderToBuffer>[0]
    );

    return {
      ok: true as const,
      pdfBase64: Buffer.from(buffer).toString("base64"),
      filename: `Finding_Keepers_CV_${shortId}.pdf`,
      hasPhoto: Boolean(embeddedPhoto),
    };
  } catch (error) {
    console.error("PDF generation error:", error);

    if (embeddedPhoto) {
      try {
        const buffer = await renderToBuffer(
          React.createElement(CVPdf, {
            data: { ...pdfData, photoUrl: "" },
          }) as Parameters<typeof renderToBuffer>[0]
        );

        return {
          ok: true as const,
          pdfBase64: Buffer.from(buffer).toString("base64"),
          filename: `Finding_Keepers_CV_${shortId}.pdf`,
          hasPhoto: false,
        };
      } catch (retryError) {
        console.error("PDF generation retry error:", retryError);
      }
    }

    return { ok: false as const, message: "Failed to generate PDF" };
  }
}