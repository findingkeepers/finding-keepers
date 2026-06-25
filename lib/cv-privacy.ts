type CvData = Record<string, string | undefined>;

export function shouldShowWaliOnBrowseProfile(data: CvData) {
  return data.showWaliOnProfile === "yes";
}

export function hasWaliDetails(data: CvData) {
  return Boolean(
    data.waliName?.trim() ||
      data.waliRelationship?.trim() ||
      data.waliPhone?.trim() ||
      data.waliEmail?.trim()
  );
}