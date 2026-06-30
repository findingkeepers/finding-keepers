export const PRODUCTION_APP_URL = "https://finding-keepers.connecthk.org";

/**
 * Canonical app origin for emails, auth redirects, and other user-facing links.
 * Prefer NEXT_PUBLIC_APP_URL in Vercel so links never point at *.vercel.app.
 */
export function getAppUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (process.env.VERCEL_ENV === "production") {
    const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
    if (productionUrl) {
      return `https://${productionUrl.replace(/\/$/, "")}`;
    }
    return PRODUCTION_APP_URL;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/$/, "")}`;
  }

  return "http://localhost:3000";
}