"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAdminNotificationEmail, sendEmail } from "@/lib/email";
import { getMatchDirection } from "@/lib/match-request";

function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

type PartyDetails = {
  shortId: string;
  name: string;
  phone: string;
  waliName: string;
  waliRelation: string;
  waliPhone: string;
  waliEmail: string;
};

function buildPartyDetailsFromCv(
  shortId: string,
  cvData: Record<string, string>,
  phone: string
): PartyDetails {
  return {
    shortId,
    name: cvData.fullName || "N/A",
    phone: phone || "N/A",
    waliName: cvData.waliName || "N/A",
    waliRelation: cvData.waliRelationship || "N/A",
    waliPhone: cvData.waliPhone || "N/A",
    waliEmail: cvData.waliEmail || "N/A",
  };
}

function buildAdminMatchEmailHtml({
  heading,
  intro,
  requester,
  recipient,
}: {
  heading: string;
  intro: string;
  requester: PartyDetails;
  recipient: PartyDetails;
}) {
  const appUrl = getAppUrl();

  return `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1f2937;">${heading}</h2>
      <p style="font-size: 16px;">Assalamualaikum,</p>
      <p style="font-size: 15px; color: #374151;">${intro}</p>

      <h3 style="color: #1e40af; margin-top: 25px;">Person Who Requested</h3>
      <div style="background-color: #f0f9ff; padding: 16px; border-radius: 8px; margin-bottom: 25px;">
        <p><strong>Short ID:</strong> ${requester.shortId}</p>
        <p><strong>Name:</strong> ${requester.name}</p>
        <p><strong>Contact:</strong> ${requester.phone}</p>
        <p><strong>Wali/Guarantor:</strong> ${requester.waliName} (${requester.waliRelation})</p>
        <p><strong>Wali Phone:</strong> ${requester.waliPhone}</p>
        <p><strong>Wali Email:</strong> ${requester.waliEmail}</p>
      </div>

      <h3 style="color: #9f1239; margin-top: 20px;">Person Request Sent To</h3>
      <div style="background-color: #fef2f2; padding: 16px; border-radius: 8px; margin-bottom: 25px;">
        <p><strong>Short ID:</strong> ${recipient.shortId}</p>
        <p><strong>Name:</strong> ${recipient.name}</p>
        <p><strong>Contact:</strong> ${recipient.phone}</p>
        <p><strong>Wali/Guarantor:</strong> ${recipient.waliName} (${recipient.waliRelation})</p>
        <p><strong>Wali Phone:</strong> ${recipient.waliPhone}</p>
        <p><strong>Wali Email:</strong> ${recipient.waliEmail}</p>
      </div>

      <a href="${appUrl}/fk-admin/matches" style="display: inline-block; background-color: #4a2545; color: #f7f2ec; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 10px;">
        View in admin panel
      </a>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="font-size: 13px; color: #9ca3af;">This is an automated email from Finding Keepers.</p>
    </div>
  `;
}

function buildRecipientRequestEmailHtml({
  requesterShortId,
}: {
  requesterShortId: string;
}) {
  const appUrl = getAppUrl();
  const cvUrl = `${appUrl}/browse/${requesterShortId}`;
  const requestsUrl = `${appUrl}/dashboard/my-match-requests`;

  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #2d1b2e;">
      <p style="font-family: Arial, sans-serif; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #8d5a7c;">Finding Keepers</p>
      <h1 style="font-size: 28px; font-weight: 500; color: #6b3563; margin: 0 0 16px;">You received a match request</h1>
      <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #5a4a55; margin: 0 0 20px;">
        Assalamualaikum, someone would like to connect with you on Finding Keepers.
        Review their profile and decide whether to approve or decline — no contact details are shared at this stage.
      </p>
      <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #5a4a55; margin: 0 0 20px;">
        Profile Short ID: <strong>${requesterShortId}</strong>
      </p>
      <a href="${cvUrl}" style="display: inline-block; background-color: #4a2545; color: #f7f2ec; font-family: Arial, sans-serif; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 12px; margin: 0 12px 12px 0;">
        View their CV
      </a>
      <a href="${requestsUrl}" style="display: inline-block; background-color: #f7f2ec; color: #4a2545; font-family: Arial, sans-serif; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 12px; border: 1px solid #e3cfa0;">
        Approve or decline
      </a>
      <hr style="margin: 32px 0; border: none; border-top: 1px solid #e3cfa0;" />
      <p style="font-family: Arial, sans-serif; font-size: 13px; color: #9ca3af; margin: 0;">
        If you did not expect this request, you can safely decline it in your dashboard.
      </p>
    </div>
  `;
}

function buildRequesterDecisionEmailHtml({
  recipientShortId,
  approved,
}: {
  recipientShortId: string;
  approved: boolean;
}) {
  const appUrl = getAppUrl();

  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #2d1b2e;">
      <p style="font-family: Arial, sans-serif; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #8d5a7c;">Finding Keepers</p>
      <h1 style="font-size: 28px; font-weight: 500; color: #6b3563; margin: 0 0 16px;">
        ${approved ? "Your match request was approved" : "Update on your match request"}
      </h1>
      <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #5a4a55; margin: 0 0 20px;">
        ${
          approved
            ? `Profile <strong>${recipientShortId}</strong> has approved your match request. Our admin team will guide the next steps.`
            : `Profile <strong>${recipientShortId}</strong> has declined your match request at this time.`
        }
      </p>
      <a href="${appUrl}/dashboard/my-match-requests" style="display: inline-block; background-color: #4a2545; color: #f7f2ec; font-family: Arial, sans-serif; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 12px;">
        View my match requests
      </a>
    </div>
  `;
}

async function getEmailForShortId(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  shortId: string
) {
  const { data: cv } = await supabase
    .from("cvs")
    .select("user_id")
    .eq("short_id", shortId)
    .maybeSingle();

  if (!cv?.user_id) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", cv.user_id)
    .maybeSingle();

  return profile?.email?.trim() || null;
}

export async function requestMatch({
  profileShortId,
}: {
  profileShortId: string;
  profileName?: string;
  profileGender?: string;
}) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "You must be logged in" };
    }

    const { data: requesterCV } = await supabase
      .from("cvs")
      .select("short_id, data")
      .eq("user_id", user.id)
      .single();

    const { data: requesterProfile } = await supabase
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .single();

    const { data: requestedCV } = await supabase
      .from("cvs")
      .select("short_id, data, user_id")
      .eq("short_id", profileShortId)
      .single();

    let requestedProfile = null;
    if (requestedCV?.user_id) {
      const { data } = await supabase
        .from("profiles")
        .select("phone, email")
        .eq("id", requestedCV.user_id)
        .single();
      requestedProfile = data;
    }

    if (!requesterCV?.data || !requesterCV.short_id) {
      return { success: false, message: "Your CV not found" };
    }

    if (!requestedCV?.data || !requestedCV.short_id) {
      return { success: false, message: "Requested profile not found" };
    }

    if (requesterCV.short_id === requestedCV.short_id) {
      return { success: false, message: "You cannot send a request to yourself" };
    }

    const isRequesterMale = requesterCV.data.gender?.toLowerCase() === "male";
    const requesterShortId = requesterCV.short_id;
    const requestedShortId = requestedCV.short_id;
    const maleShortId = isRequesterMale ? requesterShortId : requestedShortId;
    const femaleShortId = isRequesterMale ? requestedShortId : requesterShortId;

    const { data: existingRequest } = await supabase
      .from("match_requests")
      .select("id, status")
      .eq("male_short_id", maleShortId)
      .eq("female_short_id", femaleShortId)
      .in("status", ["pending", "approved", "contacted"])
      .maybeSingle();

    if (existingRequest) {
      return {
        success: false,
        message:
          existingRequest.status === "pending"
            ? "A match request between these profiles is already awaiting a response"
            : "A match request between these profiles is already in progress",
      };
    }

    const requester = buildPartyDetailsFromCv(
      requesterShortId,
      requesterCV.data,
      requesterProfile?.phone || ""
    );

    const recipient = buildPartyDetailsFromCv(
      requestedShortId,
      requestedCV.data,
      requestedProfile?.phone || ""
    );

    const { error: insertError } = await supabase.from("match_requests").insert({
      male_short_id: maleShortId,
      female_short_id: femaleShortId,
      male_name: isRequesterMale ? requester.name : recipient.name,
      female_name: isRequesterMale ? recipient.name : requester.name,
      requested_by_short_id: requesterShortId,
      status: "pending",
    });

    if (insertError) {
      console.error("Match request insert error:", insertError);
      return { success: false, message: "Failed to create match request" };
    }

    const adminEmail = await sendEmail({
      to: getAdminNotificationEmail(),
      subject: `New Match Request: ${requesterShortId} → ${requestedShortId}`,
      html: buildAdminMatchEmailHtml({
        heading: "New Match Request",
        intro:
          "A new match request has been submitted and is awaiting the recipient's approval.",
        requester,
        recipient,
      }),
    });

    if (!adminEmail.ok) {
      console.error("Admin match notification failed:", adminEmail.message);
    }

    const recipientEmail = requestedProfile?.email?.trim();
    if (recipientEmail) {
      const recipientEmailResult = await sendEmail({
        to: recipientEmail,
        subject: "You received a match request on Finding Keepers",
        html: buildRecipientRequestEmailHtml({
          requesterShortId,
        }),
      });

      if (!recipientEmailResult.ok) {
        console.error(
          "Recipient match notification failed:",
          recipientEmailResult.message
        );
      }
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Match request error:", error);
    const message =
      error instanceof Error ? error.message : "Something went wrong";
    return { success: false, message };
  }
}

export async function respondToMatchRequest({
  requestId,
  decision,
}: {
  requestId: string;
  decision: "approve" | "reject";
}) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "You must be logged in" };
    }

    const { data: myCV } = await supabase
      .from("cvs")
      .select("short_id, data")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!myCV?.short_id) {
      return { success: false, message: "Your CV was not found" };
    }

    const { data: request, error: fetchError } = await supabase
      .from("match_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError || !request) {
      return { success: false, message: "Match request not found" };
    }

    if (request.status !== "pending") {
      return {
        success: false,
        message: "This match request has already been responded to",
      };
    }

    const { fromId, toId } = getMatchDirection(request);

    if (toId !== myCV.short_id) {
      return {
        success: false,
        message: "Only the recipient can approve or decline this request",
      };
    }

    const newStatus = decision === "approve" ? "approved" : "rejected";

    const { error: updateError } = await supabase
      .from("match_requests")
      .update({ status: newStatus })
      .eq("id", requestId);

    if (updateError) {
      console.error("Match response update error:", updateError);
      return { success: false, message: "Failed to update match request" };
    }

    const { data: requesterCV } = await supabase
      .from("cvs")
      .select("data, user_id")
      .eq("short_id", fromId)
      .maybeSingle();

    const [{ data: requesterProfile }, { data: recipientProfile }] =
      await Promise.all([
        requesterCV?.user_id
          ? supabase
              .from("profiles")
              .select("phone, email")
              .eq("id", requesterCV.user_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("profiles")
          .select("phone, email")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

    const requester = buildPartyDetailsFromCv(
      fromId,
      (requesterCV?.data as Record<string, string>) || {},
      requesterProfile?.phone || ""
    );

    const recipient = buildPartyDetailsFromCv(
      toId,
      (myCV.data as Record<string, string>) || {},
      recipientProfile?.phone || ""
    );

    const approved = decision === "approve";
    const decisionLabel = approved ? "approved" : "declined";

    const adminEmail = await sendEmail({
      to: getAdminNotificationEmail(),
      subject: `Match request ${decisionLabel}: ${fromId} → ${toId}`,
      html: buildAdminMatchEmailHtml({
        heading: `Match Request ${approved ? "Approved" : "Declined"}`,
        intro: `The recipient has ${decisionLabel} this match request.`,
        requester,
        recipient,
      }),
    });

    if (!adminEmail.ok) {
      console.error("Admin decision notification failed:", adminEmail.message);
    }

    const requesterEmail =
      requesterProfile?.email?.trim() ||
      (await getEmailForShortId(supabase, fromId));

    if (requesterEmail) {
      const requesterEmailResult = await sendEmail({
        to: requesterEmail,
        subject: approved
          ? "Your match request was approved"
          : "Update on your match request",
        html: buildRequesterDecisionEmailHtml({
          recipientShortId: toId,
          approved,
        }),
      });

      if (!requesterEmailResult.ok) {
        console.error(
          "Requester decision notification failed:",
          requesterEmailResult.message
        );
      }
    }

    return {
      success: true,
      message: approved
        ? "Match request approved. The requester and admin team have been notified."
        : "Match request declined. The requester and admin team have been notified.",
    };
  } catch (error: unknown) {
    console.error("Match response error:", error);
    const message =
      error instanceof Error ? error.message : "Something went wrong";
    return { success: false, message };
  }
}