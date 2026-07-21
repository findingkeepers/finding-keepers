/**
 * Client-side blur of an image file for public browse display.
 * The original file remains the source of truth for unlocked / owner views.
 */
export async function createBlurredImageBlob(
  file: File | Blob,
  blurPx = 18
): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const maxSide = 720;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Could not process photo for privacy blur");
    }

    ctx.filter = `blur(${blurPx}px)`;
    ctx.drawImage(image, 0, 0, width, height);
    // Soft wash so facial detail stays obscured even if blur is light.
    ctx.filter = "none";
    ctx.fillStyle = "rgba(247, 242, 236, 0.22)";
    ctx.fillRect(0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error("Could not create blurred photo"));
        },
        "image/jpeg",
        0.82
      );
    });

    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load photo for blur"));
    image.src = src;
  });
}
