import { AGE_RANGE_OPTIONS } from "@/lib/cv-constants";

export const MIN_REGISTRATION_AGE = 21;

export function parseDateOfBirth(value: string): Date | null {
  const trimmed = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  const [year, month, day] = trimmed.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function getAge(
  dateOfBirth: Date,
  now: Date = new Date()
): number {
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = now.getMonth() - dateOfBirth.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getDate() < dateOfBirth.getDate())
  ) {
    age -= 1;
  }

  return age;
}

export function getLatestAllowedDateOfBirth(
  minAge: number = MIN_REGISTRATION_AGE,
  now: Date = new Date()
) {
  const cutoff = new Date(now);
  cutoff.setFullYear(cutoff.getFullYear() - minAge);
  return cutoff;
}

export function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function validateRegistrationDateOfBirth(
  value: string,
  minAge: number = MIN_REGISTRATION_AGE,
  now: Date = new Date()
):
  | { ok: true; dateOfBirth: string; date: Date }
  | { ok: false; message: string } {
  const date = parseDateOfBirth(value);

  if (!date) {
    return { ok: false, message: "Please enter a valid date of birth" };
  }

  if (date > now) {
    return { ok: false, message: "Date of birth cannot be in the future" };
  }

  const age = getAge(date, now);

  if (age < minAge) {
    return {
      ok: false,
      message: `You must be at least ${minAge} years old to create an account`,
    };
  }

  if (age > 120) {
    return { ok: false, message: "Please enter a valid date of birth" };
  }

  return { ok: true, dateOfBirth: formatDateInputValue(date), date };
}

export function getAgeRangeFromAge(age: number): (typeof AGE_RANGE_OPTIONS)[number] {
  if (age <= 25) {
    return AGE_RANGE_OPTIONS[0];
  }

  if (age <= 30) {
    return AGE_RANGE_OPTIONS[1];
  }

  if (age <= 35) {
    return AGE_RANGE_OPTIONS[2];
  }

  return AGE_RANGE_OPTIONS[3];
}

export function getAgeRangeFromDateOfBirth(
  dateOfBirth: string,
  now: Date = new Date()
): (typeof AGE_RANGE_OPTIONS)[number] | null {
  const parsed = parseDateOfBirth(dateOfBirth);

  if (!parsed) {
    return null;
  }

  return getAgeRangeFromAge(getAge(parsed, now));
}