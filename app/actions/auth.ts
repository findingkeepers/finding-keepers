"use server";

import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isResendTestModeRestriction, sendEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/app-url";
import { normalizePhone } from "@/lib/phone";
import {
  REMEMBER_ME_COOKIE,
  REMEMBER_ME_MAX_AGE_SECONDS,
} from "@/lib/auth/constants";
import { isProduction } from "@/lib/auth/cookie-options";
import {
  checkRateLimit,
  clearRateLimit,
  recordRateLimitAttempt,
  recordRateLimitFailure,
} from "@/lib/rate-limit";
import { validatePasswordPolicy } from "@/lib/password";
import { escapeHtml } from "@/lib/html-escape";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function loginUser({
  email,
  password,
  rememberMe,
}: {
  email: string;
  password: string;
  rememberMe: boolean;
}) {
  const normalizedEmail = email.trim().toLowerCase();

  const rateLimit = await checkRateLimit("login", normalizedEmail);
  if (!rateLimit.ok) {
    return { ok: false as const, message: rateLimit.message };
  }

  const cookieStore = await cookies();
  if (rememberMe) {
    cookieStore.set(REMEMBER_ME_COOKIE, "1", {
      httpOnly: true,
      secure: isProduction(),
      sameSite: "lax",
      path: "/",
      maxAge: REMEMBER_ME_MAX_AGE_SECONDS,
    });
  } else {
    cookieStore.delete(REMEMBER_ME_COOKIE);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    await recordRateLimitFailure("login", normalizedEmail);

    const needsConfirmation =
      error.message.toLowerCase().includes("email not confirmed") ||
      error.message.toLowerCase().includes("not confirmed");

    return {
      ok: false as const,
      message: needsConfirmation
        ? "Please confirm your email before logging in."
        : error.message,
      needsConfirmation,
    };
  }

  await clearRateLimit("login", normalizedEmail);
  return { ok: true as const, rememberMe };
}

export async function logoutUser() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete(REMEMBER_ME_COOKIE);

  return { ok: true as const };
}

export async function verifyRecoveryToken(tokenHash: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  });

  if (error) {
    return { ok: false as const, message: error.message };
  }

  return { ok: true as const };
}

export async function updateUserPassword(password: string) {
  const passwordCheck = await validatePasswordPolicy(password);
  if (!passwordCheck.ok) {
    return { ok: false as const, message: passwordCheck.message };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      message: "Your reset session has expired. Request a new password reset link.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { ok: false as const, message: error.message };
  }

  await supabase.auth.signOut();
  return { ok: true as const, message: "Password updated successfully." };
}

export async function confirmEmailAuthCode(code: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return { ok: false as const, message: error.message };
  }

  await supabase.auth.signOut();
  return { ok: true as const };
}

export async function confirmEmailWithOtp({
  tokenHash,
  type,
}: {
  tokenHash: string;
  type: EmailOtpType;
}) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    return { ok: false as const, message: error.message };
  }

  await supabase.auth.signOut();
  return { ok: true as const };
}

export async function checkPhoneAvailable(phone: string) {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    return { available: false, message: "Please enter a valid phone number" };
  }

  const rateLimit = await checkRateLimit("phone_check", normalized);
  if (!rateLimit.ok) {
    return { available: false, message: rateLimit.message };
  }

  await recordRateLimitAttempt("phone_check", normalized);

  const admin = createAdminSupabaseClient();
  if (!admin) {
    return {
      available: false,
      message: "Could not verify phone number right now. Please try again.",
    };
  }

  const { data, error } = await admin.rpc("check_phone_available", {
    phone_input: normalized,
  });

  if (error) {
    console.error("Phone check error:", error);
    return {
      available: false,
      message: "Could not verify phone number right now. Please try again.",
    };
  }

  if (data === false) {
    return {
      available: false,
      message: "This phone number cannot be used for registration.",
    };
  }

  return { available: true, message: "" };
}

type AuthActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string; pendingConfirmation?: boolean };

async function sendSignupConfirmationEmail({
  email,
  password,
  fullName,
}: {
  email: string;
  password: string;
  fullName?: string;
}): Promise<AuthActionResult> {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    return {
      ok: false,
      message:
        "Server configuration is incomplete. Add SUPABASE_SERVICE_ROLE_KEY to your environment variables.",
    };
  }

  const appUrl = getAppUrl();
  const redirectTo = `${appUrl}/auth/confirm?next=/login`;

  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: { redirectTo },
    });

  if (linkError || !linkData?.properties?.action_link) {
    console.error("Generate signup link error:", linkError);

    return {
      ok: false,
      message:
        "If an account exists for this email, a confirmation link has been sent.",
    };
  }

  const displayName =
    fullName?.trim() ||
    (linkData.user?.user_metadata?.full_name as string | undefined)?.trim() ||
    "";

  const emailResult = await sendEmail({
    to: email,
    subject: "Confirm your Finding Keepers account",
    html: buildSignupConfirmationEmailHtml({
      fullName: displayName,
      confirmationUrl: linkData.properties.action_link,
    }),
  });

  if (!emailResult.ok) {
    if (isResendTestModeRestriction(emailResult.message)) {
      return {
        ok: false,
        pendingConfirmation: true,
        message:
          "Your account exists but confirmation emails can only be sent to findingkeepers@connecthk.org until connecthk.org is verified on Resend. Add the domain at resend.com/domains, set RESEND_FROM_EMAIL in Vercel, then use Resend confirmation below.",
      };
    }

    console.error("Signup confirmation email error:", emailResult.message);
    return {
      ok: false,
      pendingConfirmation: true,
      message:
        "Could not send the confirmation email. Try again below or contact support.",
    };
  }

  return { ok: true, message: "Confirmation email sent. Check your inbox." };
}

function buildSignupConfirmationEmailHtml({
  fullName,
  confirmationUrl,
}: {
  fullName: string;
  confirmationUrl: string;
}) {
  const displayName = fullName?.trim() || "there";

  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #2d1b2e;">
      <p style="font-family: Arial, sans-serif; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #8d5a7c; margin: 0 0 24px;">Finding Keepers</p>
      <h1 style="font-size: 28px; font-weight: 500; color: #6b3563; margin: 0 0 16px;">Welcome, ${escapeHtml(displayName)}</h1>
      <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #5a4a55; margin: 0 0 20px;">
        Thank you for creating your Finding Keepers account. Please confirm your email address to continue.
      </p>
      <a href="${confirmationUrl}" style="display: inline-block; background-color: #4a2545; color: #f7f2ec; font-family: Arial, sans-serif; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 12px; margin: 8px 0 28px;">
        Confirm email address
      </a>
      <p style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #5a4a55; margin: 0 0 8px;">
        If the button does not work, copy and paste this link into your browser:
      </p>
      <p style="font-family: Arial, sans-serif; font-size: 13px; line-height: 1.5; color: #6b3563; word-break: break-all; margin: 0 0 28px;">
        ${confirmationUrl}
      </p>
      <hr style="margin: 32px 0; border: none; border-top: 1px solid #e3cfa0;" />
      <p style="font-family: Arial, sans-serif; font-size: 13px; color: #9ca3af; margin: 0;">
        If you did not create this account, you can safely ignore this email.
      </p>
    </div>
  `;
}

export async function registerUser({
  email,
  password,
  full_name,
  gender,
  phone,
  is_permanent_resident,
}: {
  email: string;
  password: string;
  full_name: string;
  gender: string;
  phone: string;
  is_permanent_resident: boolean;
}) {
  const normalizedEmail = email.trim().toLowerCase();

  const rateLimit = await checkRateLimit("signup", normalizedEmail);
  if (!rateLimit.ok) {
    return { ok: false as const, message: rateLimit.message };
  }

  const passwordCheck = await validatePasswordPolicy(password);
  if (!passwordCheck.ok) {
    return { ok: false as const, message: passwordCheck.message };
  }

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return { ok: false as const, message: "Please enter a valid phone number" };
  }

  const phoneCheck = await checkPhoneAvailable(phone);
  if (!phoneCheck.available) {
    return { ok: false as const, message: phoneCheck.message };
  }

  const admin = createAdminSupabaseClient();
  if (!admin) {
    return {
      ok: false as const,
      message:
        "Server configuration is incomplete. Add SUPABASE_SERVICE_ROLE_KEY to your environment variables.",
    };
  }

  const appUrl = getAppUrl();
  const redirectTo = `${appUrl}/auth/confirm?next=/login`;
  const userMetadata = {
    full_name,
    gender,
    phone: normalizedPhone,
    is_permanent_resident,
  };

  const { data: createdUser, error: createError } =
    await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: false,
      user_metadata: userMetadata,
    });

  if (createError) {
    const alreadyRegistered =
      createError.message.includes("already been registered") ||
      createError.message.includes("already registered");

    if (!alreadyRegistered) {
      console.error("Create user error:", createError);
      await recordRateLimitFailure("signup", normalizedEmail);
      return { ok: false as const, message: createError.message };
    }
  }

  let userId = createdUser.user?.id;

  if (!userId) {
    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "signup",
        email,
        password,
        options: { redirectTo, data: userMetadata },
      });

    if (linkError || !linkData?.user?.id) {
      console.error("Resolve existing user error:", linkError);
      return {
        ok: false as const,
        message:
          "If an account exists for this email, try logging in or resetting your password.",
      };
    }

    userId = linkData.user.id;

    if (createError) {
      await admin.auth.admin.updateUserById(userId, {
        password,
        user_metadata: userMetadata,
      });
    }
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    email,
    full_name,
    gender,
    phone: normalizedPhone,
    is_permanent_resident,
    verification_status: "unverified",
  });

  if (profileError) {
    console.error("Profile upsert error:", profileError);
  }

  const emailResult = await sendSignupConfirmationEmail({
    email: normalizedEmail,
    password,
    fullName: full_name,
  });

  if (!emailResult.ok) {
    await recordRateLimitFailure("signup", normalizedEmail);
    return emailResult;
  }

  await clearRateLimit("signup", normalizedEmail);
  return { ok: true as const, message: "" };
}

export async function resendConfirmationEmail({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  if (!email?.trim() || !password) {
    return {
      ok: false as const,
      message: "Enter your email and password to resend the confirmation link.",
    };
  }

  return sendSignupConfirmationEmail({ email: email.trim(), password });
}

function buildPasswordResetEmailHtml({
  fullName,
  resetUrl,
}: {
  fullName: string;
  resetUrl: string;
}) {
  const displayName = fullName?.trim() || "there";

  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #2d1b2e;">
      <p style="font-family: Arial, sans-serif; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #8d5a7c; margin: 0 0 24px;">Finding Keepers</p>
      <h1 style="font-size: 28px; font-weight: 500; color: #6b3563; margin: 0 0 16px;">Reset your password</h1>
      <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #5a4a55; margin: 0 0 20px;">
        Assalamualaikum ${escapeHtml(displayName)}, we received a request to reset your Finding Keepers password.
      </p>
      <a href="${resetUrl}" style="display: inline-block; background-color: #4a2545; color: #f7f2ec; font-family: Arial, sans-serif; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 12px; margin: 8px 0 28px;">
        Reset password
      </a>
      <p style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #5a4a55; margin: 0 0 8px;">
        If the button does not work, copy and paste this link into your browser:
      </p>
      <p style="font-family: Arial, sans-serif; font-size: 13px; line-height: 1.5; color: #6b3563; word-break: break-all; margin: 0 0 28px;">
        ${resetUrl}
      </p>
      <hr style="margin: 32px 0; border: none; border-top: 1px solid #e3cfa0;" />
      <p style="font-family: Arial, sans-serif; font-size: 13px; color: #9ca3af; margin: 0;">
        If you did not request a password reset, you can safely ignore this email.
      </p>
    </div>
  `;
}

export async function requestPasswordReset({ email }: { email: string }) {
  const normalizedEmail = email.trim().toLowerCase();

  const rateLimit = await checkRateLimit("password_reset", normalizedEmail);
  if (!rateLimit.ok) {
    return { ok: false as const, message: rateLimit.message };
  }

  await recordRateLimitAttempt("password_reset", normalizedEmail);

  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    return { ok: false as const, message: "Please enter your email address." };
  }

  const admin = createAdminSupabaseClient();
  if (!admin) {
    return {
      ok: false as const,
      message:
        "Server configuration is incomplete. Add SUPABASE_SERVICE_ROLE_KEY to your environment variables.",
    };
  }

  const appUrl = getAppUrl();
  const redirectTo = `${appUrl}/reset-password`;

  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "recovery",
      email: trimmedEmail,
      options: { redirectTo },
    });

  if (linkError || !linkData?.properties?.action_link) {
    console.error("Password reset link error:", linkError);
    return {
      ok: true as const,
      message:
        "If an account exists for that email, we sent a password reset link.",
    };
  }

  const fullName =
    (linkData.user?.user_metadata?.full_name as string | undefined) || "";

  const emailResult = await sendEmail({
    to: trimmedEmail,
    subject: "Reset your Finding Keepers password",
    html: buildPasswordResetEmailHtml({
      fullName,
      resetUrl: linkData.properties.action_link,
    }),
  });

  if (!emailResult.ok) {
    if (isResendTestModeRestriction(emailResult.message)) {
      return {
        ok: false as const,
        message:
          "Could not send the reset email. Check RESEND_FROM_EMAIL is set to your verified domain.",
      };
    }

    console.error("Password reset email error:", emailResult.message);
    return {
      ok: false as const,
      message: "Could not send the password reset email. Please try again shortly.",
    };
  }

  return {
    ok: true as const,
    message: "If an account exists for that email, we sent a password reset link.",
  };
}

export async function sendVerificationPendingEmail({
  email,
  fullName,
}: {
  email: string;
  fullName: string;
}) {
  const displayName = fullName?.trim() || "there";
  const appUrl = getAppUrl();

  const result = await sendEmail({
    to: email,
    subject: "Your Finding Keepers verification is under review",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #2d1b2e;">
        <p style="font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #8d5a7c;">Finding Keepers</p>
        <h1 style="font-size: 24px; color: #6b3563;">Assalamualaikum, ${escapeHtml(displayName)}</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #5a4a55;">
          Thank you for submitting your verification documents. Our admin team is reviewing your application.
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #5a4a55;">
          You will receive another email once your account has been approved. Reviews typically take 24–48 hours.
        </p>
        <a href="${appUrl}/dashboard" style="display: inline-block; margin-top: 20px; background: #4a2545; color: #f7f2ec; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600;">
          View dashboard
        </a>
      </div>
    `,
  });

  return result;
}