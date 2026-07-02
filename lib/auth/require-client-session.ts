import { bootstrapClientSession } from "@/lib/auth/bootstrap-session";
import { redirectToLogin } from "@/lib/auth/redirect-to-login";

export async function requireClientSession(
  loginPath = "/login"
): Promise<boolean> {
  const result = await bootstrapClientSession();

  if (!result.authenticated) {
    redirectToLogin(loginPath);
    return false;
  }

  return true;
}