export type CvFormData = Record<string, string>;

export type CvDraft = {
  formData: CvFormData;
  currentStep: number;
  isEditing: boolean;
  existingCVId: string | null;
  updatedAt: number;
};

const LEGACY_DRAFT_KEY = "cv_form_data";

export function createEmptyCvFormData(): CvFormData {
  return {
    fullName: "",
    gender: "",
    ageRange: "",
    hkidNumber: "",
    height: "",
    weight: "",
    photoUrl: "",
    photoBlurUrl: "",
    photoVisibility: "",
    senseOfHumor: "",
    motivation: "",
    changeAboutSelf: "",
    peopleGetAlongWith: "",
    partnerQualities: "",
    marriageVision: "",
    sharedInterestsImportance: "",
    partnershipGrowth: "",
    dealBreakers: "",
    whatSeeking: "",
    partnerAgeRange: "",
    partnerEducation: "",
    partnerEthnicBackground: "",
    partnerEthnicBackgroundOther: "",
    partnerSect: "",
    partnerReligiousHistory: "",
    partnerReligiosity: "",
    familyRole: "",
    closestFamilyMember: "",
    hobbies: "",
    favoriteBooksMovies: "",
    hangoutWithFriends: "",
    relaxMethod: "",
    longTermGoals: "",
    idealCoupleLifestyle: "",
    selfImprovement: "",
    workLifeBalance: "",
    wealthDefinition: "",
    howSpendMoney: "",
    howSaveMoney: "",
    dreamJob: "",
    houseFinancesManagement: "",
    importantValues: "",
    beliefsShapeLife: "",
    faithInDailyLife: "",
    prayerCommunityRole: "",
    faithWithSpouse: "",
    raisingChildrenIslamic: "",
    conflictResolution: "",
    handleStress: "",
    handleDisagreements: "",
    communicationRole: "",
    selfDescription: "",
    residencyStatus: "",
    residencyStatusOther: "",
    ethnicBackground: "",
    ethnicBackgroundOther: "",
    occupation: "",
    education: "",
    maritalStatus: "",
    religiousHistory: "",
    prayLevel: "",
    sect: "",
    sectOther: "",
    waliInvolvement: "",
    waliReason: "",
    waliRelationship: "",
    waliRelationshipOther: "",
    waliName: "",
    waliHKID: "",
    waliPhone: "",
    waliEmail: "",
    waliAddress: "",
    showWaliOnProfile: "no",
    shortID: "",
  };
}

function getCvDraftKey(userId: string) {
  return `cv_draft_${userId}`;
}

function parseLegacyDraft(): CvDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(LEGACY_DRAFT_KEY);
    if (!raw) {
      return null;
    }

    const formData = JSON.parse(raw) as CvFormData;
    return {
      formData,
      currentStep: 1,
      isEditing: false,
      existingCVId: null,
      updatedAt: 0,
    };
  } catch {
    return null;
  }
}

export function loadCvDraft(userId: string): CvDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(getCvDraftKey(userId));
    if (raw) {
      return JSON.parse(raw) as CvDraft;
    }
  } catch {
    // Fall through to legacy draft migration.
  }

  return parseLegacyDraft();
}

export function saveCvDraft(
  userId: string,
  draft: Omit<CvDraft, "updatedAt">
) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: CvDraft = {
    ...draft,
    updatedAt: Date.now(),
  };

  localStorage.setItem(getCvDraftKey(userId), JSON.stringify(payload));
  localStorage.removeItem(LEGACY_DRAFT_KEY);
}

export function clearCvDraft(userId: string) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(getCvDraftKey(userId));
  localStorage.removeItem(LEGACY_DRAFT_KEY);
}

export function mergeCvFormData(
  base: CvFormData,
  overrides: Partial<CvFormData>
): CvFormData {
  return {
    ...createEmptyCvFormData(),
    ...base,
    ...overrides,
  } as CvFormData;
}