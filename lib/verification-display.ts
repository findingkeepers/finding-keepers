export function formatVerificationChoice(
  value?: string | null,
  other?: string | null
) {
  if (!value) return null;
  if (value === "Other" && other?.trim()) return other.trim();
  return value;
}

export function isNonPrVerificationRequest(request: {
  years_in_hk?: string | null;
  visa_type?: string | null;
  referral_name?: string | null;
}) {
  return Boolean(
    request.years_in_hk || request.visa_type || request.referral_name
  );
}