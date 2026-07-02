"use client";

import { pdf } from "@react-pdf/renderer";
import { CVPdf } from "@/components/CVPdf";
import { supabase } from "@/lib/supabase";

const PDF_TIMEOUT_MS = 30_000;
const PHOTO_FETCH_TIMEOUT_MS = 10_000;

function getStoragePathFromPublicUrl(url: string): string | null {
  const marker = "/profile-photos/";
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length).split("?")[0] || null;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

async function photoUrlToDataUrl(photoUrl: string): Promise<string | null> {
  if (!photoUrl) return null;
  if (photoUrl.startsWith("data:")) return photoUrl;

  const resolvePhoto = async (): Promise<string | null> => {
    const storagePath = getStoragePathFromPublicUrl(photoUrl);
    if (storagePath) {
      const { data, error } = await supabase.storage
        .from("profile-photos")
        .download(storagePath);

      if (!error && data) {
        return blobToDataUrl(data);
      }
    }

    const response = await fetch(photoUrl);
    if (!response.ok) return null;

    return blobToDataUrl(await response.blob());
  };

  try {
    return await withTimeout(
      resolvePhoto(),
      PHOTO_FETCH_TIMEOUT_MS,
      "Photo fetch timed out"
    );
  } catch {
    return null;
  }
}

async function buildPdfData(
  data: Record<string, string>,
  shortId: string,
  photoUrl?: string | null
) {
  const mergedPhoto = photoUrl || data.photoUrl || "";
  const resolvedPhoto = await photoUrlToDataUrl(mergedPhoto);

  return {
    ...data,
    shortID: data.shortID || shortId,
    photoUrl: resolvedPhoto || "",
  };
}

async function renderPdfBlob(pdfData: Awaited<ReturnType<typeof buildPdfData>>) {
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
  const pdfData = await buildPdfData(data, shortId, photoUrl);
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