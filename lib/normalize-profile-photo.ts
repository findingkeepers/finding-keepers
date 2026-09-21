export const PROFILE_PHOTO_ACCEPT =
  "image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
]);

function fileLooksUnsupported(file: File) {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  return (
    type.includes("heic") ||
    type.includes("heif") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    name.endsWith(".avif") ||
    name.endsWith(".tiff") ||
    name.endsWith(".tif") ||
    name.endsWith(".bmp") ||
    name.endsWith(".gif")
  );
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unsupported"));
    };
    image.src = url;
  });
}

export async function normalizeProfilePhotoFile(file: File): Promise<File> {
  if (fileLooksUnsupported(file) && !ALLOWED_TYPES.has(file.type.toLowerCase())) {
    throw new Error(
      "This photo format is not supported. Please upload a JPG, PNG, or WebP image."
    );
  }

  if (file.type && !ALLOWED_TYPES.has(file.type.toLowerCase()) && !file.type.startsWith("image/")) {
    throw new Error(
      "This photo format is not supported. Please upload a JPG, PNG, or WebP image."
    );
  }

  try {
    const image = await loadImageFromFile(file);
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not process this photo");
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error("Could not convert this photo to JPG"));
        },
        "image/jpeg",
        0.9
      );
    });

    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg",
    });
  } catch {
    throw new Error(
      "This photo could not be read. Please upload a JPG, PNG, or WebP image (not HEIC/Live Photo)."
    );
  }
}
