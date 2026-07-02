export function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

export function sanitizePhoneInput(value: string) {
  return value.replace(/[^\d+\s-]/g, "");
}

export function isValidPhoneInput(phone: string) {
  const normalized = normalizePhone(phone);
  return normalized.length >= 8;
}