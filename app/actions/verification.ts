"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getAdminNotificationEmail,
  isResendTestModeRestriction,
  sendEmail,
} from "@/lib/email";
import { profileStatusFromRequestStatus } from "@/lib/verification";

function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

async function assertAdmin(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, message: "You must be logged in" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { ok: false as const, message: "Admin access required" };
  }

  return { ok: true as const };
}

function buildVerifiedEmailHtml(fullName: string) {
  const appUrl = getAppUrl();
  const displayName = fullName?.trim() || "there";

  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #2d1b2e;">
      <p style="font-family: Arial, sans-serif; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #8d5a7c; margin: 0 0 24px;">Finding Keepers</p>
      <h1 style="font-size: 28px; font-weight: 500; color: #6b3563; margin: 0 0 16px;">Assalamualaikum, ${displayName}</h1>
      <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #5a4a55; margin: 0 0 20px;">
        Great news — your account has been verified by our team. You now have full access to Finding Keepers.
      </p>

      <h2 style="font-family: Arial, sans-serif; font-size: 14px; letter-spacing: 0.15em; text-transform: uppercase; color: #4a2545; margin: 32px 0 16px;">Your next steps</h2>
      <ol style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.7; color: #5a4a55; padding-left: 20px; margin: 0 0 28px;">
        <li style="margin-bottom: 10px;"><strong>Complete your CV</strong> — build your marriage profile in the CV Builder so others can learn about you.</li>
        <li style="margin-bottom: 10px;"><strong>Browse profiles</strong> — once your CV is complete, explore verified members who may be your right fit.</li>
        <li style="margin-bottom: 10px;"><strong>Request a match</strong> — when you find someone of interest, submit a match request and our team will guide the process.</li>
      </ol>

      <a href="${appUrl}/dashboard" style="display: inline-block; background-color: #4a2545; color: #f7f2ec; font-family: Arial, sans-serif; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 12px; margin-bottom: 28px;">
        Go to your dashboard
      </a>

      <p style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #5a4a55; margin: 0 0 8px;">
        Or start here: <a href="${appUrl}/dashboard/cv-builder" style="color: #6b3563;">CV Builder</a>
      </p>

      <hr style="margin: 32px 0; border: none; border-top: 1px solid #e3cfa0;" />
      <p style="font-family: Arial, sans-serif; font-size: 13px; color: #9ca3af; margin: 0;">
        This is an automated email from Finding Keepers. If you have questions, please contact our team.
      </p>
    </div>
  `;
}

function buildInvalidatedEmailHtml(fullName: string) {
  const appUrl = getAppUrl();
  const displayName = fullName?.trim() || "there";

  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #2d1b2e;">
      <p style="font-family: Arial, sans-serif; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #8d5a7c; margin: 0 0 24px;">Finding Keepers</p>
      <h1 style="font-size: 28px; font-weight: 500; color: #6b3563; margin: 0 0 16px;">Assalamualaikum, ${displayName}</h1>
      <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #5a4a55; margin: 0 0 20px;">
        After reviewing your verification documents, our team was unable to approve your application at this time.
      </p>
      <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #5a4a55; margin: 0 0 20px;">
        Please sign in to your dashboard, review your HKID and payment proof, and submit your verification again when you are ready.
      </p>
      <a href="${appUrl}/dashboard" style="display: inline-block; background-color: #4a2545; color: #f7f2ec; font-family: Arial, sans-serif; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 12px; margin-bottom: 28px;">
        Resubmit verification
      </a>
      <hr style="margin: 32px 0; border: none; border-top: 1px solid #e3cfa0;" />
      <p style="font-family: Arial, sans-serif; font-size: 13px; color: #9ca3af; margin: 0;">
        If you have questions, please contact our team at findingkeepers@connecthk.org.
      </p>
    </div>
  `;
}

function buildAdminVerificationSubmittedEmailHtml({
  fullName,
  email,
  phone,
  hkidNumber,
}: {
  fullName: string;
  email: string;
  phone: string;
  hkidNumber: string;
}) {
  const appUrl = getAppUrl();

  return `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; color: #1f2937;">
      <h2 style="color: #4a2545; margin: 0 0 16px;">New verification request</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #374151;">
        A member has submitted documents for manual verification.
      </p>
      <div style="background-color: #f7f2ec; padding: 16px; border-radius: 12px; margin: 20px 0;">
        <p style="margin: 0 0 8px;"><strong>Name:</strong> ${fullName || "N/A"}</p>
        <p style="margin: 0 0 8px;"><strong>Email:</strong> ${email || "N/A"}</p>
        <p style="margin: 0 0 8px;"><strong>Phone:</strong> ${phone || "N/A"}</p>
        <p style="margin: 0;"><strong>HKID:</strong> ${hkidNumber || "N/A"}</p>
      </div>
      <a href="${appUrl}/fk-admin/verification" style="display: inline-block; background-color: #4a2545; color: #f7f2ec; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 10px;">
        Review in admin panel
      </a>
    </div>
  `;
}

async function sendUserStatusEmail({
  to,
  fullName,
  kind,
}: {
  to: string;
  fullName: string;
  kind: "verified" | "invalidated";
}): Promise<{ sent: boolean; message: string }> {
  const html =
    kind === "verified"
      ? buildVerifiedEmailHtml(fullName)
      : buildInvalidatedEmailHtml(fullName);

  const subject =
    kind === "verified"
      ? "You're verified — welcome to Finding Keepers"
      : "Your Finding Keepers verification needs attention";

  const result = await sendEmail({ to, subject, html });

  if (result.ok) {
    return { sent: true, message: `Email sent to ${to}` };
  }

  if (isResendTestModeRestriction(result.message)) {
    return {
      sent: false,
      message:
        "Resend test mode only allows sending to findingkeepers@connecthk.org. Verify your domain at resend.com/domains and set RESEND_FROM_EMAIL.",
    };
  }

  return {
    sent: false,
    message: result.message || "Failed to send email",
  };
}

export async function notifyAdminsVerificationSubmitted({
  fullName,
  email,
  phone,
  hkidNumber,
}: {
  fullName: string;
  email: string;
  phone: string;
  hkidNumber: string;
}) {
  const result = await sendEmail({
    to: getAdminNotificationEmail(),
    subject: `New verification request: ${fullName || email}`,
    html: buildAdminVerificationSubmittedEmailHtml({
      fullName,
      email,
      phone,
      hkidNumber,
    }),
  });

  if (result.ok) {
    return { ok: true as const, message: "Admin team notified" };
  }

  console.error("Admin verification notification error:", result.message);
  return {
    ok: false as const,
    message: result.message || "Could not notify admin team",
  };
}

export async function updateVerificationStatus({
  requestId,
  userId,
  newStatus,
}: {
  requestId: string;
  userId: string;
  newStatus: string;
}) {
  try {
    const supabase = await createServerSupabaseClient();
    const adminCheck = await assertAdmin(supabase);

    if (!adminCheck.ok) {
      return { success: false, message: adminCheck.message };
    }

    const { data: existingRequest, error: fetchError } = await supabase
      .from("verification_requests")
      .select("status")
      .eq("id", requestId)
      .single();

    if (fetchError || !existingRequest) {
      return { success: false, message: "Verification request not found" };
    }

    const previousStatus = existingRequest.status;

    const { error: requestError } = await supabase
      .from("verification_requests")
      .update({ status: newStatus })
      .eq("id", requestId);

    if (requestError) throw requestError;

    const profileStatus = profileStatusFromRequestStatus(newStatus);
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ verification_status: profileStatus })
      .eq("id", userId);

    if (profileError) throw profileError;

    let emailSent = false;
    let emailMessage = "";
    const becameVerified =
      newStatus === "verified" && previousStatus !== "verified";
    const becameInvalidated =
      newStatus === "invalidated" && previousStatus !== "invalidated";
    const shouldEmailUser = becameVerified || becameInvalidated;

    if (shouldEmailUser) {
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", userId)
        .single();

      if (userProfile?.email) {
        const emailResult = await sendUserStatusEmail({
          to: userProfile.email,
          fullName: userProfile.full_name,
          kind: becameVerified ? "verified" : "invalidated",
        });
        emailSent = emailResult.sent;
        emailMessage = emailResult.message;
      } else {
        emailMessage = "Status updated but no email address found on profile";
      }
    }

    const statusLabel =
      newStatus === "verified"
        ? "verified"
        : newStatus === "invalidated"
          ? "invalidated"
          : newStatus;

    return {
      success: true,
      emailSent,
      message: shouldEmailUser
        ? emailSent
          ? emailMessage
          : `User marked ${statusLabel}. ${emailMessage}`
        : `Status updated to ${newStatus}`,
    };
  } catch (error: unknown) {
    console.error("Verification status update error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update status";
    return { success: false, message };
  }
}