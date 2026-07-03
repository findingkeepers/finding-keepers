"use client";

import { generateCvPdfDownload } from "@/app/actions/cv-pdf";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadCvPdf({
  data,
  shortId,
  photoUrl,
  filename,
}: {
  data: Record<string, string>;
  shortId: string;
  photoUrl?: string | null;
  filename: string;
}) {
  const result = await generateCvPdfDownload({
    shortId,
    data: data ?? {},
    photoUrl,
  });

  if (!result.ok) {
    throw new Error(result.message);
  }

  const bytes = Uint8Array.from(atob(result.pdfBase64), (char) =>
    char.charCodeAt(0)
  );
  const blob = new Blob([bytes], { type: "application/pdf" });
  triggerDownload(blob, filename || result.filename);

  return { hasPhoto: result.hasPhoto };
}