export type PasswordStrength = {
  score: number;
  label: "Weak" | "Fair" | "Good" | "Strong";
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
  suggestions: string[];
};

export const MIN_PASSWORD_LENGTH = 8;

export function evaluatePassword(password: string): PasswordStrength {
  const checks = {
    length: password.length >= MIN_PASSWORD_LENGTH,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const passed = Object.values(checks).filter(Boolean).length;
  const score = Math.min(4, Math.max(0, passed - 1));

  const suggestions: string[] = [];
  if (!checks.length) {
    suggestions.push(`Use at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  if (!checks.uppercase) suggestions.push("Add an uppercase letter");
  if (!checks.lowercase) suggestions.push("Add a lowercase letter");
  if (!checks.number) suggestions.push("Add a number");
  if (!checks.special) suggestions.push("Add a special character (!@#$...)");

  const label =
    score <= 1 ? "Weak" : score === 2 ? "Fair" : score === 3 ? "Good" : "Strong";

  return { score, label, checks, suggestions };
}

export function isPasswordStrongEnough(password: string) {
  const { checks } = evaluatePassword(password);
  return Object.values(checks).every(Boolean);
}

export async function validatePasswordPolicy(password: string): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!isPasswordStrongEnough(password)) {
    return {
      ok: false,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters and include uppercase, lowercase, a number, and a special character.`,
    };
  }

  return { ok: true, message: "" };
}