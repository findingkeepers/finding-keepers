export type ProfileGender = "male" | "female";
export type CVGender = "Male" | "Female";

export function normalizeToProfileGender(
  value: string | null | undefined
): ProfileGender | null {
  const g = value?.trim().toLowerCase();
  if (g === "male") return "male";
  if (g === "female") return "female";
  return null;
}

export function profileGenderToCVGender(
  gender: string | null | undefined
): CVGender | "" {
  const normalized = normalizeToProfileGender(gender);
  if (normalized === "male") return "Male";
  if (normalized === "female") return "Female";
  return "";
}

export function getOppositeProfileGender(
  gender: string | null | undefined
): ProfileGender | null {
  const normalized = normalizeToProfileGender(gender);
  if (normalized === "male") return "female";
  if (normalized === "female") return "male";
  return null;
}

export function gendersAreOpposite(
  viewerGender: string | null | undefined,
  cvGender: string | null | undefined
): boolean {
  const opposite = getOppositeProfileGender(viewerGender);
  const cv = normalizeToProfileGender(cvGender);
  return opposite !== null && cv !== null && opposite === cv;
}