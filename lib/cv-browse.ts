const BROWSE_ALWAYS_HIDDEN_FIELDS = new Set([
  "hkidNumber",
  "waliHKID",
  "waliAddress",
]);

const WALI_CONTACT_FIELDS = new Set([
  "waliName",
  "waliRelationship",
  "waliRelationshipOther",
  "waliPhone",
  "waliEmail",
]);

export function redactCvDataForBrowse(
  data: Record<string, string>,
  options?: { showWali?: boolean }
): Record<string, string> {
  const showWali = options?.showWali ?? data.showWaliOnProfile === "yes";
  const redacted: Record<string, string> = {};

  for (const [key, value] of Object.entries(data)) {
    if (BROWSE_ALWAYS_HIDDEN_FIELDS.has(key)) {
      continue;
    }

    if (WALI_CONTACT_FIELDS.has(key) && !showWali) {
      continue;
    }

    redacted[key] = value;
  }

  return redacted;
}

export type BrowseListFields = {
  occupation?: string;
  education?: string;
  ethnicBackground?: string;
  residencyStatus?: string;
};

export function pickBrowseListData(
  data: Record<string, string>
): BrowseListFields {
  const redacted = redactCvDataForBrowse(data);

  return {
    occupation: redacted.occupation,
    education: redacted.education,
    ethnicBackground: redacted.ethnicBackground,
    residencyStatus: redacted.residencyStatus,
  };
}