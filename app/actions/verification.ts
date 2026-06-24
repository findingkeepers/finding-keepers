"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isResendTestModeRestriction, sendEmail } from "@/lib/email";
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

async function sendVerifiedEmail({
  to,
  fullName,
}: {
  to: string;
  fullName: string;
}): Promise<{ sent: boolean; message: string }> {
  const html = buildVerifiedEmailHtml(fullName);
  const result = await sendEmail({
    to,
    subject: "You're verified — welcome to Finding Keepers",
    html,
  });

  if (result.ok) {
    return { sent: true, message: `Verification email sent to ${to}` };
  }

  if (isResendTestModeRestriction(result.message)) {
    return {
      sent: false,
      message:
        "Resend test mode only allows sending to findingkeepers@connecthk.org. Verify your domain at resend.com/domains and set RESEND_FROM_EMAIL (e.g. Finding Keepers <noreply@connecthk.org>) to email users.",
    };
  }

  return {
    sent: false,
    message: result.message || "Failed to send verification email",
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

    if (becameVerified) {
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", userId)
        .single();

      if (userProfile?.email) {
        const emailResult = await sendVerifiedEmail({
          to: userProfile.email,
          fullName: userProfile.full_name,
        });
        emailSent = emailResult.sent;
        emailMessage = emailResult.message;
      } else {
        emailMessage = "User verified but no email address found on profile";
      }
    }

    return {
      success: true,
      emailSent,
      message: becameVerified
        ? emailSent
          ? emailMessage
          : `User verified. ${emailMessage}`
        : `Status updated to ${newStatus}`,
    };
  } catch (error: unknown) {
    console.error("Verification status update error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update status";
    return { success: false, message };
  }
}