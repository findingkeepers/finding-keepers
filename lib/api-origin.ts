import { headers } from "next/headers";
import { getAppUrl } from "@/lib/app-url";

export async function assertSameOriginRequest() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const referer = headerStore.get("referer");
  const allowedOrigin = getAppUrl().replace(/\/$/, "");

  if (origin) {
    return origin.replace(/\/$/, "") === allowedOrigin;
  }

  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin.replace(/\/$/, "");
      return refererOrigin === allowedOrigin;
    } catch {
      return false;
    }
  }

  return process.env.NODE_ENV !== "production";
}