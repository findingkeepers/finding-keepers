export const CV_PDF_SECTIONS: {
  title: string;
  fields: { key: string; label: string }[];
}[] = [
  {
    title: "Personal Particulars",
    fields: [
      { key: "fullName", label: "Full name" },
      { key: "gender", label: "Gender" },
      { key: "age", label: "Age" },
      { key: "ageRange", label: "Age range (legacy)" },
      { key: "hkidNumber", label: "HKID number" },
      { key: "height", label: "Height" },
      { key: "heightUnit", label: "Height unit" },
      { key: "heightCm", label: "Height (cm)" },
      { key: "heightFt", label: "Height (ft)" },
      { key: "heightIn", label: "Height (in)" },
      { key: "photoVisibility", label: "Photo visibility" },
    ],
  },
  {
    title: "Detailed Information",
    fields: [
      { key: "selfDescription", label: "Self description" },
      { key: "residencyStatus", label: "Residency status" },
      { key: "residencyStatusOther", label: "Residency status (other)" },
      { key: "ethnicBackground", label: "Ethnic background" },
      { key: "ethnicBackgroundOther", label: "Ethnic background (other)" },
      { key: "occupation", label: "Occupation" },
      { key: "education", label: "Education" },
      { key: "maritalStatus", label: "Marital status" },
      { key: "religiousHistory", label: "Religious history" },
      { key: "prayLevel", label: "Do you pray?" },
      { key: "sect", label: "Sect / Madhab" },
      { key: "sectOther", label: "Sect / Madhab (other)" },
    ],
  },
  {
    title: "Personality & Individualism",
    fields: [
      { key: "senseOfHumor", label: "Sense of humor" },
      { key: "motivation", label: "What motivates you" },
      { key: "changeAboutSelf", label: "What you would change about yourself" },
      { key: "peopleGetAlongWith", label: "Types of people you get along with" },
    ],
  },
  {
    title: "Marriage & Partner Preferences",
    fields: [
      { key: "partnerQualities", label: "Qualities in a partner" },
      { key: "marriageVision", label: "Vision of a successful marriage" },
      { key: "sharedInterestsImportance", label: "Importance of shared interests" },
      { key: "partnershipGrowth", label: "Partnership contribution to growth" },
      { key: "dealBreakers", label: "Deal breakers" },
      { key: "whatSeeking", label: "What you are seeking" },
      { key: "partnerAgeRange", label: "Partner age range" },
      { key: "partnerEducation", label: "Partner education" },
      { key: "partnerEthnicBackground", label: "Partner ethnic background" },
      { key: "partnerEthnicBackgroundOther", label: "Partner ethnic background (other)" },
      { key: "partnerSect", label: "Partner sect" },
      { key: "partnerReligiousHistory", label: "Partner religious history" },
      { key: "partnerReligiosity", label: "Partner religiosity" },
    ],
  },
  {
    title: "Family, Lifestyle & Goals",
    fields: [
      { key: "familyRole", label: "Role of family" },
      { key: "closestFamilyMember", label: "Closest family member" },
      { key: "hobbies", label: "Hobbies" },
      { key: "favoriteBooksMovies", label: "Favorite books/movies" },
      { key: "hangoutWithFriends", label: "How often you hang out with friends" },
      { key: "relaxMethod", label: "Favorite way to relax" },
      { key: "longTermGoals", label: "Long-term goals" },
      { key: "idealCoupleLifestyle", label: "Ideal lifestyle as a couple" },
      { key: "selfImprovement", label: "Self improvement" },
      { key: "workLifeBalance", label: "Work-life balance" },
    ],
  },
  {
    title: "Work / Finances",
    fields: [
      { key: "wealthDefinition", label: "Definition of wealth" },
      { key: "howSpendMoney", label: "How you spend money" },
      { key: "howSaveMoney", label: "How you save money" },
      { key: "dreamJob", label: "Dream job" },
      { key: "houseFinancesManagement", label: "House finances management" },
    ],
  },
  {
    title: "Communication & Conflict Resolution",
    fields: [
      { key: "conflictResolution", label: "Approach to conflict resolution" },
      { key: "handleStress", label: "Handling stress" },
      { key: "handleDisagreements", label: "Handling disagreements" },
      { key: "communicationRole", label: "Role of communication" },
    ],
  },
  {
    title: "Values, Religion & Faith",
    fields: [
      { key: "importantValues", label: "Important values" },
      { key: "beliefsShapeLife", label: "How beliefs shape daily life" },
      { key: "faithInDailyLife", label: "Faith in daily life" },
      { key: "prayerCommunityRole", label: "Role of prayer and community" },
      { key: "faithWithSpouse", label: "Practicing faith with spouse" },
      { key: "raisingChildrenIslamic", label: "Raising children in Islamic values" },
    ],
  },
  {
    title: "Wali / Guarantor",
    fields: [
      { key: "waliInvolvement", label: "Involvement of wali/parents" },
      { key: "waliReason", label: "Reason for not involving wali/parents" },
      { key: "waliRelationship", label: "Wali relationship" },
      { key: "waliRelationshipOther", label: "Wali relationship (other)" },
      { key: "waliName", label: "Wali name" },
      { key: "waliHKID", label: "Wali HKID / passport" },
      { key: "waliPhone", label: "Wali phone" },
      { key: "waliEmail", label: "Wali email" },
      { key: "waliAddress", label: "Wali home address" },
      { key: "showWaliOnProfile", label: "Show wali details on public browse profile" },
    ],
  },
];

const SKIP_KEYS = new Set([
  "photoUrl",
  "photoBlurUrl",
  "shortID",
  "weight",
]);

export function formatCvPdfValue(key: string, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (key === "photoVisibility") {
    if (trimmed === "blurred") {
      return "Blurred — the photo is blurred while browsing until interest is expressed";
    }
    if (trimmed === "visible") {
      return "Visible — the photo is shown clearly while browsing";
    }
  }

  if (key === "showWaliOnProfile") {
    if (trimmed === "yes") return "Yes";
    if (trimmed === "no") return "No";
  }

  if (key === "age" && !trimmed.toLowerCase().includes("year")) {
    return `${trimmed} years`;
  }

  return trimmed;
}

export function listFilledCvPdfFields(data: Record<string, string>) {
  const known = new Set<string>();

  const sections = CV_PDF_SECTIONS.map((section) => {
    const rows = section.fields
      .map((field) => {
        known.add(field.key);
        const value = formatCvPdfValue(field.key, data[field.key] || "");
        return value ? { label: field.label, value } : null;
      })
      .filter((row): row is { label: string; value: string } => Boolean(row));

    return { title: section.title, rows };
  }).filter((section) => section.rows.length > 0);

  const extras = Object.entries(data)
    .filter(([key, value]) => {
      if (SKIP_KEYS.has(key) || known.has(key)) return false;
      return Boolean(value?.trim());
    })
    .map(([key, value]) => ({
      label: key,
      value: formatCvPdfValue(key, value),
    }));

  if (extras.length > 0) {
    sections.push({ title: "Other answers", rows: extras });
  }

  return sections;
}
