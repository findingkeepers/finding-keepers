"use client";

import { pdf } from "@react-pdf/renderer";
import { CVPdf } from "@/components/CVPdf";

const PDF_TIMEOUT_MS = 15_000;
const PHOTO_API_TIMEOUT_MS = 4_000;

function buildPdfData(
  data: Record<string, string>,
  shortId: string,
  photoUrl = ""
) {
  return {
    ...data,
    shortID: data.shortID || shortId,
    photoUrl,
  };
}

async function fetchPhotoDataUrl(photoUrl: string): Promise<string | null> {
  if (!photoUrl || photoUrl.startsWith("data:")) {
    return photoUrl || null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PHOTO_API_TIMEOUT_MS);

  try {
    const response = await fetch(
      `/api/cv/photo?url=${encodeURIComponent(photoUrl)}`,
      {
        credentials: "include",
        signal: controller.signal,
        cache: "no-store",
      }
    );

    if (!response.ok) return null;

    const payload = (await response.json()) as { dataUrl?: string };
    return payload.dataUrl ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function renderPdfBlob(pdfData: ReturnType<typeof buildPdfData>) {
  const blobPromise = pdf(<CVPdf data={pdfData} />).toBlob();
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("PDF generation timed out")), PDF_TIMEOUT_MS);
  });

  return Promise.race([blobPromise, timeoutPromise]);
}

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
  const safeData = data ?? {};
  const mergedPhoto = photoUrl || safeData.photoUrl || "";
  const embeddedPhoto = mergedPhoto
    ? await fetchPhotoDataUrl(mergedPhoto)
    : null;

  const pdfData = buildPdfData(safeData, shortId, embeddedPhoto || "");

  try {
    const blob = await renderPdfBlob(pdfData);
    triggerDownload(blob, filename);
    return { hasPhoto: Boolean(embeddedPhoto) };
  } catch (firstError) {
    if (!embeddedPhoto) throw firstError;
  }

  const blob = await renderPdfBlob(buildPdfData(safeData, shortId, ""));
  triggerDownload(blob, filename);
  return { hasPhoto: false };
}