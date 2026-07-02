const ALLOWED_REDIRECT =
  /^\/[a-zA-Z0-9][a-zA-Z0-9/_-]*$/;

export function getSafeRedirectPath(
  next: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!next) {
    return fallback;
  }

  const trimmed = next.trim();

  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\") ||
    trimmed.includes("%2f") ||
    trimmed.includes("%5c")
  ) {
    return fallback;
  }

  if (!ALLOWED_REDIRECT.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}