const BROWSE_HIDDEN_FIELDS = new Set([
  "hkidNumber",
  "waliHKID",
  "waliAddress",
  "waliEmail",
  "waliPhone",
  "waliName",
  "waliRelationship",
  "showWaliOnProfile",
]);

export function redactCvDataForBrowse(
  data: Record<string, string>,
  options?: { showWali?: boolean }
): Record<string, string> {
  const showWali = options?.showWali ?? data.showWaliOnProfile === "yes";
  const redacted: Record<string, string> = {};

  for (const [key, value] of Object.entries(data)) {
    if (BROWSE_HIDDEN_FIELDS.has(key)) {
      if (
        showWali &&
        (key === "waliName" ||
          key === "waliRelationship" ||
          key === "waliPhone" ||
          key === "waliEmail")
      ) {
        redacted[key] = value;
      }
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