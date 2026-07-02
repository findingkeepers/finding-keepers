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

export const MIN_PASSWORD_LENGTH = 12;

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

async function sha1Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export async function isPasswordBreached(password: string): Promise<boolean> {
  try {
    const hash = await sha1Hex(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const response = await fetch(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      {
        headers: { "Add-Padding": "true" },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return false;
    }

    const body = await response.text();
    return body.split("\n").some((line) => {
      const [hashSuffix] = line.split(":");
      return hashSuffix?.trim().toUpperCase() === suffix;
    });
  } catch (error) {
    console.error("Breached password check failed:", error);
    return false;
  }
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

  const breached = await isPasswordBreached(password);
  if (breached) {
    return {
      ok: false,
      message:
        "This password has appeared in a known data breach. Please choose a different password.",
    };
  }

  return { ok: true, message: "" };
}