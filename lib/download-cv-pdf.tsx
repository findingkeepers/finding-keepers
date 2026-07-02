"use client";

import { pdf } from "@react-pdf/renderer";
import { CVPdf } from "@/components/CVPdf";
import { supabase } from "@/lib/supabase";

const PDF_TIMEOUT_MS = 30_000;
const PDF_WITH_REMOTE_PHOTO_TIMEOUT_MS = 12_000;
const PHOTO_FETCH_TIMEOUT_MS = 8_000;

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

async function fetchPhotoAsDataUrl(photoUrl: string): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PHOTO_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(photoUrl, {
      signal: controller.signal,
      mode: "cors",
    });

    if (!response.ok) return null;

    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) return null;

    return await blobToDataUrl(blob);
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function downloadPhotoAsDataUrl(photoUrl: string): Promise<string | null> {
  const storagePath = getStoragePathFromPublicUrl(photoUrl);
  if (!storagePath) return null;

  try {
    const { data, error } = await supabase.storage
      .from("profile-photos")
      .download(storagePath);

    if (error || !data) return null;
    return await blobToDataUrl(data);
  } catch {
    return null;
  }
}

async function resolvePhotoForPdf(photoUrl: string): Promise<string> {
  if (!photoUrl) return "";
  if (photoUrl.startsWith("data:")) return photoUrl;

  const embedded = (await fetchPhotoAsDataUrl(photoUrl)) ||
    (await downloadPhotoAsDataUrl(photoUrl));

  if (embedded) return embedded;

  // Use the public URL directly (original behaviour) when embedding fails.
  return photoUrl;
}

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

async function renderPdfBlob(
  pdfData: ReturnType<typeof buildPdfData>,
  timeoutMs = PDF_TIMEOUT_MS
) {
  const blobPromise = pdf(<CVPdf data={pdfData} />).toBlob();
  return withTimeout(blobPromise, timeoutMs, "PDF generation timed out");
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
  const resolvedPhoto = await resolvePhotoForPdf(mergedPhoto);

  const pdfData = buildPdfData(safeData, shortId, resolvedPhoto);
  const usesRemotePhoto =
    resolvedPhoto.startsWith("http://") || resolvedPhoto.startsWith("https://");

  try {
    const blob = await renderPdfBlob(
      pdfData,
      usesRemotePhoto ? PDF_WITH_REMOTE_PHOTO_TIMEOUT_MS : PDF_TIMEOUT_MS
    );
    triggerDownload(blob, filename);
    return;
  } catch (firstError) {
    if (!resolvedPhoto) throw firstError;
  }

  const blob = await renderPdfBlob(
    buildPdfData(safeData, shortId, ""),
    PDF_TIMEOUT_MS
  );
  triggerDownload(blob, filename);
}