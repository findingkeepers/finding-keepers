/**
 * Client-side blur of an image file for public browse display.
 * The original file remains the source of truth for unlocked / owner views.
 */
export async function createBlurredImageBlob(
  file: File | Blob,
  blurPx = 28
): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    // Smaller canvas + stronger blur makes faces unreadable.
    const maxSide = 480;
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

    // Downscale first, then blur (two-pass) for heavier privacy.
    const pass = document.createElement("canvas");
    pass.width = Math.max(1, Math.round(width / 4));
    pass.height = Math.max(1, Math.round(height / 4));
    const passCtx = pass.getContext("2d");
    if (!passCtx) {
      throw new Error("Could not process photo for privacy blur");
    }
    passCtx.drawImage(image, 0, 0, pass.width, pass.height);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "low";
    ctx.filter = `blur(${blurPx}px)`;
    ctx.drawImage(pass, 0, 0, width, height);
    ctx.filter = "none";
    ctx.fillStyle = "rgba(247, 242, 236, 0.35)";
    ctx.fillRect(0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error("Could not create blurred photo"));
        },
        "image/jpeg",
        0.75
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
