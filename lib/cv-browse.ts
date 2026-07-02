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