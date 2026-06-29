export const YEARS_IN_HK_OPTIONS = [
  "1 year",
  "2 years",
  "3 years",
  "4 years",
  "5 years",
  "6 years",
  "Other",
] as const;

export const VISA_TYPE_OPTIONS = ["Student", "Work", "Other"] as const;

export type NonPrVerificationForm = {
  yearsInHk: string;
  yearsInHkOther: string;
  visaType: string;
  visaTypeOther: string;
  referralName: string;
  referralPhone: string;
  referralEmail: string;
  referralHkid: string;
};

export const emptyNonPrVerificationForm = (): NonPrVerificationForm => ({
  yearsInHk: "",
  yearsInHkOther: "",
  visaType: "",
  visaTypeOther: "",
  referralName: "",
  referralPhone: "",
  referralEmail: "",
  referralHkid: "",
});

export function resolveYearsInHk(form: NonPrVerificationForm) {
  if (form.yearsInHk === "Other") {
    return form.yearsInHkOther.trim();
  }
  return form.yearsInHk;
}

export function resolveVisaType(form: NonPrVerificationForm) {
  if (form.visaType === "Other") {
    return form.visaTypeOther.trim();
  }
  return form.visaType;
}

export function validateNonPrVerification(
  form: NonPrVerificationForm,
  visaFile: File | null
): string | null {
  if (!form.yearsInHk) {
    return "Please select how long you have been in Hong Kong";
  }
  if (form.yearsInHk === "Other" && !form.yearsInHkOther.trim()) {
    return "Please specify how long you have been in Hong Kong";
  }
  if (!form.visaType) {
    return "Please select your visa type";
  }
  if (form.visaType === "Other" && !form.visaTypeOther.trim()) {
    return "Please specify your visa type";
  }
  if (!visaFile) {
    return "Please upload a copy of your latest valid visa";
  }
  if (!form.referralName.trim()) {
    return "Please enter your referral's name";
  }
  if (!form.referralPhone.trim()) {
    return "Please enter your referral's phone number";
  }
  if (!form.referralEmail.trim()) {
    return "Please enter your referral's email address";
  }
  if (!form.referralHkid.trim()) {
    return "Please enter your referral's HKID number";
  }
  return null;
}