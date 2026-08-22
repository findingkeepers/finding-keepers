export type HeightUnit = "cm" | "ft";

export function formatHeightDisplay({
  unit,
  cm,
  ft,
  inches,
}: {
  unit: HeightUnit;
  cm?: string;
  ft?: string;
  inches?: string;
}) {
  if (unit === "cm") {
    const value = Number(cm);
    if (!Number.isFinite(value) || value <= 0) {
      return "";
    }

    return `${Math.round(value)} cm`;
  }

  const feet = Number(ft);
  const inchValue = Number(inches || 0);
  if (!Number.isFinite(feet) || feet <= 0) {
    return "";
  }

  if (!Number.isFinite(inchValue) || inchValue < 0) {
    return "";
  }

  return `${Math.round(feet)} ft ${Math.round(inchValue)} in`;
}

export function validateHeight({
  unit,
  cm,
  ft,
  inches,
}: {
  unit: string;
  cm?: string;
  ft?: string;
  inches?: string;
}): string | null {
  if (unit === "cm") {
    const value = Number(cm);
    if (!Number.isFinite(value) || value < 100 || value > 250) {
      return "Enter height in centimetres between 100 and 250";
    }
    return null;
  }

  if (unit === "ft") {
    const feet = Number(ft);
    const inchValue = Number(inches || 0);
    if (!Number.isFinite(feet) || feet < 3 || feet > 8) {
      return "Enter height in feet between 3 and 8";
    }
    if (!Number.isFinite(inchValue) || inchValue < 0 || inchValue > 11) {
      return "Enter inches between 0 and 11";
    }
    return null;
  }

  return "Select centimetres or feet and inches";
}
