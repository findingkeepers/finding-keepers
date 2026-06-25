type FormData = Record<string, string>;

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function getStepWarnings(step: number, data: FormData): string[] {
  const warnings: string[] = [];

  switch (step) {
    case 1:
      if (!data.fullName?.trim()) warnings.push("Full Name is required");
      if (!data.gender) warnings.push("Gender is required");
      if (!data.hkidNumber?.trim()) warnings.push("HKID Number is required");
      break;
    case 2:
      if (!data.selfDescription?.trim() || wordCount(data.selfDescription) < 100) {
        warnings.push("Self description must be at least 100 words");
      }
      if (!data.residencyStatus) warnings.push("Residency Status is required");
      if (!data.ethnicBackground) warnings.push("Ethnic background is required");
      if (!data.occupation?.trim()) warnings.push("Occupation is required");
      if (!data.education) warnings.push("Education level is required");
      if (!data.maritalStatus) warnings.push("Marital Status is required");
      if (!data.religiousHistory) warnings.push("Religious History is required");
      if (!data.prayLevel) warnings.push("Please select how often you pray");
      if (!data.sect) warnings.push("Please select your Sect/Madhab");
      break;
    case 3:
      if (!data.senseOfHumor?.trim()) warnings.push("Sense of humor is required");
      if (!data.motivation?.trim()) warnings.push("What motivates you is required");
      if (!data.changeAboutSelf?.trim()) warnings.push("What you would change about yourself is required");
      if (!data.peopleGetAlongWith?.trim()) warnings.push("Types of people you get along with is required");
      break;
    case 4:
      if (!data.partnerQualities?.trim()) warnings.push("Partner qualities are required");
      if (!data.marriageVision?.trim()) warnings.push("Marriage vision is required");
      if (!data.whatSeeking?.trim() || data.whatSeeking.length < 100) {
        warnings.push("What you are seeking must be at least 100 characters");
      }
      break;
    case 8:
      if (!data.waliInvolvement) warnings.push("Wali involvement selection is required");
      break;
    default:
      break;
  }

  return warnings;
}

export function validateFullForm(data: FormData): string[] {
  return Array.from({ length: 8 }, (_, i) => getStepWarnings(i + 1, data)).flat();
}