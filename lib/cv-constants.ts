export const ETHNICITY_OPTIONS = [
  "Chinese",
  "Pakistani",
  "Indian",
  "Bangladeshi",
  "Malaysian",
  "Indonesian",
  "Philippines",
  "Other",
] as const;

export const RESIDENCY_OPTIONS = [
  "Permanent Resident",
  "Student",
  "Work Visa",
  "Other",
] as const;

export const AGE_RANGE_OPTIONS = [
  "21–25 years",
  "Between 25 to 30 years",
  "Between 30 to 35 years",
  "Above 35 years",
] as const;

export const PARTNER_AGE_RANGE_OPTIONS = AGE_RANGE_OPTIONS;

export const PARTNER_EDUCATION_OPTIONS = [
  "Secondary School",
  "Diploma/ Associate Degree",
  "Under-graduate",
  "Graduate/Post-graduate",
  "No preference",
  "Prefer not to answer",
  "Any education level is fine",
] as const;

export const LEGACY_PARTNER_AGE_UNDER_25 = "Less than 25 years";

export const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024;

export const PHOTO_VISIBILITY_OPTIONS = [
  {
    value: "visible",
    label: "Visible",
    description:
      "Your photo is shown clearly to eligible members while browsing.",
  },
  {
    value: "blurred",
    label: "Blurred",
    description:
      "Your photo stays blurred on browse until someone sends you an interest request (or you send them one). Unblurred photos are shared only after interest is expressed, and always stored securely.",
  },
] as const;

export const WALI_INVOLVEMENT_OPTIONS = [
  "My parents/wali will be involved from the beginning",
  "My parents/wali will be involved if I have found a match",
  "I do not wish to involve my parents/wali",
] as const;

export const WALI_NO_INVOLVEMENT = WALI_INVOLVEMENT_OPTIONS[2];

export function waliInvolvementRequiresDetails(
  involvement: string | undefined
): boolean {
  return (
    involvement === WALI_INVOLVEMENT_OPTIONS[0] ||
    involvement === WALI_INVOLVEMENT_OPTIONS[1]
  );
}