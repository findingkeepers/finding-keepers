import {
  multiSelectIncludesOther,
  selectionIsOther,
} from "@/lib/cv-other";

type FormData = Record<string, string>;

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function requireText(
  warnings: string[],
  value: string | undefined,
  label: string
) {
  if (!value?.trim()) {
    warnings.push(`${label} is required`);
  }
}

function requireSelection(
  warnings: string[],
  value: string | undefined,
  label: string
) {
  if (!value?.trim()) {
    warnings.push(`${label} is required`);
  }
}

function requireOtherSpecify(
  warnings: string[],
  selection: string | undefined,
  otherValue: string | undefined,
  label: string
) {
  if (selectionIsOther(selection) && !otherValue?.trim()) {
    warnings.push(`${label} is required when "Other" is selected`);
  }
}

function requireOtherInMultiSelect(
  warnings: string[],
  selections: string | undefined,
  otherValue: string | undefined,
  label: string
) {
  if (multiSelectIncludesOther(selections) && !otherValue?.trim()) {
    warnings.push(`${label} is required when "Other" is selected`);
  }
}

export function getStepWarnings(step: number, data: FormData): string[] {
  const warnings: string[] = [];

  switch (step) {
    case 1:
      requireText(warnings, data.fullName, "Full Name");
      requireSelection(warnings, data.gender, "Gender");
      requireText(warnings, data.hkidNumber, "HKID Number");
      break;

    case 2:
      if (!data.selfDescription?.trim() || wordCount(data.selfDescription) < 100) {
        warnings.push("Self description must be at least 100 words");
      }
      requireSelection(warnings, data.residencyStatus, "Residency Status");
      requireOtherSpecify(
        warnings,
        data.residencyStatus,
        data.residencyStatusOther,
        "Residency status details"
      );
      requireSelection(warnings, data.ethnicBackground, "Ethnic background");
      requireOtherSpecify(
        warnings,
        data.ethnicBackground,
        data.ethnicBackgroundOther,
        "Ethnic background details"
      );
      requireText(warnings, data.occupation, "Occupation");
      requireSelection(warnings, data.education, "Education level");
      requireSelection(warnings, data.maritalStatus, "Marital Status");
      requireSelection(warnings, data.religiousHistory, "Religious History");
      requireSelection(warnings, data.prayLevel, "How often you pray");
      requireSelection(warnings, data.sect, "Sect/Madhab");
      requireOtherSpecify(warnings, data.sect, data.sectOther, "Sect/Madhab details");
      break;

    case 3:
      requireText(warnings, data.senseOfHumor, "Sense of humor");
      requireText(warnings, data.motivation, "What motivates you");
      requireText(warnings, data.changeAboutSelf, "What you would change about yourself");
      requireText(warnings, data.peopleGetAlongWith, "Types of people you get along with");
      break;

    case 4:
      requireText(warnings, data.partnerQualities, "Partner qualities");
      requireText(warnings, data.marriageVision, "Marriage vision");
      requireText(
        warnings,
        data.sharedInterestsImportance,
        "Importance of sharing similar interests"
      );
      requireText(
        warnings,
        data.partnershipGrowth,
        "How partnership contributes to personal growth"
      );
      requireText(warnings, data.dealBreakers, "Deal breakers");
      if (!data.whatSeeking?.trim() || data.whatSeeking.trim().length < 100) {
        warnings.push("What you are seeking must be at least 100 characters");
      }
      requireSelection(warnings, data.partnerAgeRange, "Partner's age range");
      requireSelection(warnings, data.partnerEducation, "Partner's education");
      requireSelection(
        warnings,
        data.partnerEthnicBackground,
        "Partner's ethnic background"
      );
      requireOtherInMultiSelect(
        warnings,
        data.partnerEthnicBackground,
        data.partnerEthnicBackgroundOther,
        "Partner ethnic background details"
      );
      break;

    case 5:
      requireText(warnings, data.familyRole, "Role your family plays in your life");
      requireText(
        warnings,
        data.closestFamilyMember,
        "Who you are closest to in your family"
      );
      requireText(warnings, data.hobbies, "Hobbies");
      requireText(
        warnings,
        data.favoriteBooksMovies,
        "Favorite books or movies"
      );
      requireText(warnings, data.hangoutWithFriends, "How often you hang out with friends");
      requireText(warnings, data.relaxMethod, "How you relax or unwind");
      requireText(warnings, data.longTermGoals, "Long-term goals");
      requireText(
        warnings,
        data.idealCoupleLifestyle,
        "Ideal lifestyle as a couple"
      );
      requireText(warnings, data.selfImprovement, "How you improve yourself");
      requireText(warnings, data.workLifeBalance, "Work-life balance");
      break;

    case 6:
      requireText(warnings, data.importantValues, "Important values in life");
      requireText(
        warnings,
        data.beliefsShapeLife,
        "How beliefs shape daily activities"
      );
      requireText(
        warnings,
        data.faithInDailyLife,
        "How you incorporate faith into daily life"
      );
      requireText(
        warnings,
        data.prayerCommunityRole,
        "Role of prayer and community"
      );
      requireText(
        warnings,
        data.faithWithSpouse,
        "Practicing faith with your future spouse"
      );
      requireText(
        warnings,
        data.raisingChildrenIslamic,
        "Raising children with Islamic values"
      );
      break;

    case 7:
      requireText(warnings, data.conflictResolution, "Approach to conflict resolution");
      requireText(warnings, data.handleStress, "How you handle stress");
      requireText(
        warnings,
        data.handleDisagreements,
        "How you handle disagreements"
      );
      requireText(
        warnings,
        data.communicationRole,
        "Role of communication in resolving issues"
      );
      break;

    case 8:
      requireSelection(warnings, data.waliInvolvement, "Wali involvement");
      requireText(
        warnings,
        data.waliReason,
        'Wali reason (enter "N/A" if not applicable)'
      );
      requireSelection(warnings, data.waliRelationship, "Wali's relationship to you");
      requireOtherSpecify(
        warnings,
        data.waliRelationship,
        data.waliRelationshipOther,
        "Wali relationship details"
      );
      requireText(warnings, data.waliName, "Wali's name");
      requireText(warnings, data.waliHKID, "Wali's HKID / Passport number");
      requireText(warnings, data.waliPhone, "Wali's phone number");
      requireText(warnings, data.waliEmail, "Wali's email");
      requireText(warnings, data.waliAddress, "Wali's home address");
      requireSelection(
        warnings,
        data.showWaliOnProfile,
        "Public wali display preference"
      );
      break;

    default:
      break;
  }

  return warnings;
}

export function validateFullForm(data: FormData): string[] {
  return Array.from({ length: 8 }, (_, i) => getStepWarnings(i + 1, data)).flat();
}