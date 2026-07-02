type CookieOptions = {
  maxAge?: number;
  expires?: Date | number;
  path?: string;
  domain?: string;
  sameSite?: boolean | "lax" | "strict" | "none";
  secure?: boolean;
  httpOnly?: boolean;
};
import { REMEMBER_ME_COOKIE, REMEMBER_ME_MAX_AGE_SECONDS } from "@/lib/auth/constants";

type CookieLike = { name: string; value: string };

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function getRememberMeFromCookies(
  cookies: CookieLike[]
): boolean {
  return cookies.some(
    (cookie) => cookie.name === REMEMBER_ME_COOKIE && cookie.value === "1"
  );
}

export function applySecureAuthCookieOptions(
  options: CookieOptions | undefined,
  rememberMe: boolean
): CookieOptions {
  const base: CookieOptions = {
    ...options,
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
  };

  if (rememberMe) {
    return {
      ...base,
      maxAge: options?.maxAge ?? REMEMBER_ME_MAX_AGE_SECONDS,
    };
  }

  return {
    ...base,
    maxAge: undefined,
    expires: undefined,
  };
}