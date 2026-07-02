"use client";

import { pdf } from "@react-pdf/renderer";
import { CVPdf } from "@/components/CVPdf";
import { supabase } from "@/lib/supabase";

const PDF_TIMEOUT_MS = 20_000;

function getStoragePathFromPublicUrl(url: string): string | null {
  const marker = "/profile-photos/";
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(
    url.slice(index + marker.length).split("?")[0] || ""
  );
}

function blobToJpegDataUrl(blob: Blob, maxDimension = 480): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = image;
      const scale = Math.min(1, maxDimension / Math.max(width, height));
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Could not prepare photo for PDF"));
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load photo"));
    };

    image.src = objectUrl;
  });
}

async function resolvePhotoDataUrl(photoUrl: string): Promise<string | null> {
  if (!photoUrl) return null;
  if (photoUrl.startsWith("data:")) return photoUrl;

  const storagePath = getStoragePathFromPublicUrl(photoUrl);

  if (storagePath) {
    const { data, error } = await supabase.storage
      .from("profile-photos")
      .download(storagePath);

    if (!error && data) {
      try {
        return await blobToJpegDataUrl(data);
      } catch {
        // Fall through to public URL fetch.
      }
    }
  }

  try {
    const response = await fetch(photoUrl, { mode: "cors", cache: "no-store" });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await blobToJpegDataUrl(blob);
  } catch {
    return null;
  }
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

async function renderPdfBlob(pdfData: ReturnType<typeof buildPdfData>) {
  const blobPromise = pdf(<CVPdf data={pdfData} />).toBlob();
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error("PDF generation timed out")),
      PDF_TIMEOUT_MS
    );
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
    ? await resolvePhotoDataUrl(mergedPhoto)
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