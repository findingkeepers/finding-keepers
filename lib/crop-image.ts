import type { Area } from "react-easy-crop";

const MAX_OUTPUT_DIMENSION = 1200;

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () =>
      reject(new Error("Could not load image for cropping"))
    );
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

function getOutputDimensions(crop: Area) {
  const largestSide = Math.max(crop.width, crop.height);
  const scale =
    largestSide > MAX_OUTPUT_DIMENSION
      ? MAX_OUTPUT_DIMENSION / largestSide
      : 1;

  return {
    width: Math.round(crop.width * scale),
    height: Math.round(crop.height * scale),
  };
}

export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: Area,
  mimeType: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg",
  quality = 0.92
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not prepare image crop");
  }

  const output = getOutputDimensions(pixelCrop);
  canvas.width = output.width;
  canvas.height = output.height;

  context.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    output.width,
    output.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not create cropped image"));
          return;
        }

        resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

export async function getCroppedImageBlobWithinSize(
  imageSrc: string,
  pixelCrop: Area,
  maxBytes: number
): Promise<Blob> {
  let quality = 0.92;
  let blob = await getCroppedImageBlob(imageSrc, pixelCrop, "image/jpeg", quality);

  while (blob.size > maxBytes && quality > 0.5) {
    quality -= 0.08;
    blob = await getCroppedImageBlob(imageSrc, pixelCrop, "image/jpeg", quality);
  }

  if (blob.size > maxBytes) {
    throw new Error("Cropped photo is still too large. Try zooming in further.");
  }

  return blob;
}