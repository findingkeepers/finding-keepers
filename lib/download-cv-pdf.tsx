"use client";

import { pdf } from "@react-pdf/renderer";
import { CVPdf } from "@/components/CVPdf";

function buildPdfData(
  data: Record<string, string>,
  shortId: string,
  photoUrl?: string | null
) {
  const mergedPhoto = photoUrl || data.photoUrl || "";
  const safePhoto = mergedPhoto.startsWith("data:") ? mergedPhoto : "";

  return {
    ...data,
    shortID: data.shortID || shortId,
    photoUrl: safePhoto,
  };
}

const PDF_TIMEOUT_MS = 30_000;

async function renderPdfBlob(pdfData: ReturnType<typeof buildPdfData>) {
  const blobPromise = pdf(<CVPdf data={pdfData} />).toBlob();
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("PDF generation timed out")), PDF_TIMEOUT_MS);
  });

  return Promise.race([blobPromise, timeoutPromise]);
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
  const pdfData = buildPdfData(data, shortId, photoUrl);
  const blob = await renderPdfBlob(pdfData);

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}