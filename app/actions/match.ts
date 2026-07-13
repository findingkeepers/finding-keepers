"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAdminNotificationEmail, sendEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/app-url";
import {
  getPendingExpiryCutoffIso,
  isPendingExpired,
} from "@/lib/match-expiry";
import {
  ACTIVE_MATCH_STATUSES,
  blocksNewRequestToPair,
  countsTowardActiveQuota,
  MAX_ACTIVE_MATCH_REQUESTS,
} from "@/lib/match-limits";
import {
  hasActiveIntroduction,
  MATCH_STATUS,
  normalizeMatchStatus,
  SELECTION_WINDOW_HOURS,
} from "@/lib/match-status";
import { getMatchDirection } from "@/lib/match-request";
import { assertAdmin, assertProfileVerified } from "@/lib/auth/guards";
import { gendersAreOpposite } from "@/lib/gender";
import { escapeHtml } from "@/lib/html-escape";

async function expireStalePendingMatchRequests(
  admin: NonNullable<ReturnType<typeof createAdminSupabaseClient>>
) {
  const cutoff = getPendingExpiryCutoffIso();

  const { error } = await admin
    .from("match_requests")
    .update({ status: "expired" })
    .eq("status", "pending")
    .lt("created_at", cutoff);

  if (error) {
    console.error("Expire stale match requests error:", error);
  }
}

export async function expireStaleMatchRequests() {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    return { ok: false as const, message: "Server configuration is incomplete" };
  }

  await expireStalePendingMatchRequests(admin);
  return { ok: true as const };
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

type MatchParticipant = {
  shortId: string;
  userId: string;
  email: string | null;
  phone: string;
  cvData: Record<string, string>;
  gender: string | null;
  verificationStatus: string | null;
  browseVisible: boolean;
  activeIntroductionRequestId: string | null;
};

type AdminSupabaseClient = NonNullable<
  ReturnType<typeof createAdminSupabaseClient>
>;

async function getMatchParticipant(
  admin: AdminSupabaseClient,
  shortId: string
): Promise<MatchParticipant | null> {
  const { data: cv } = await admin
    .from("cvs")
    .select("short_id, data, user_id")
    .eq("short_id", shortId)
    .maybeSingle();

  if (!cv?.user_id) {
    return null;
  }

  const { data: profile } = await admin
    .from("profiles")
    .select(
      "email, phone, gender, verification_status, browse_visible, active_introduction_request_id"
    )
    .eq("id", cv.user_id)
    .maybeSingle();

  let email = profile?.email?.trim() || null;

  if (!email) {
    const { data: authUser } = await admin.auth.admin.getUserById(cv.user_id);
    email = authUser.user?.email?.trim() || null;
  }

  return {
    shortId: cv.short_id,
    userId: cv.user_id,
    email,
    phone: profile?.phone?.trim() || "",
    cvData: (cv.data as Record<string, string>) || {},
    gender: profile?.gender ?? null,
    verificationStatus: profile?.verification_status ?? null,
    browseVisible: profile?.browse_visible ?? true,
    activeIntroductionRequestId: profile?.active_introduction_request_id ?? null,
  };
}

function formatMessageWithEmailWarnings(
  baseMessage: string,
  warnings: string[]
) {
  if (warnings.length === 0) {
    return baseMessage;
  }

  return `${baseMessage} Some notifications could not be sent: ${warnings.join("; ")}`;
}

function buildPartySummaryBlock(party: PartyDetails, includeWaliDetails: boolean) {
  const waliSection = includeWaliDetails
    ? `
        <p><strong>Wali/Guarantor:</strong> ${escapeHtml(party.waliName)} (${escapeHtml(party.waliRelation)})</p>
        <p><strong>Wali Phone:</strong> ${escapeHtml(party.waliPhone)}</p>
        <p><strong>Wali Email:</strong> ${escapeHtml(party.waliEmail)}</p>
      `
    : "";

  return `
    <p><strong>Short ID:</strong> ${escapeHtml(party.shortId)}</p>
    <p><strong>Name:</strong> ${escapeHtml(party.name)}</p>
    <p><strong>Contact:</strong> ${escapeHtml(party.phone)}</p>
    ${waliSection}
  `;
}

function buildAdminMatchEmailHtml({
  heading,
  intro,
  requester,
  recipient,
  includeWaliDetails = false,
}: {
  heading: string;
  intro: string;
  requester: PartyDetails;
  recipient: PartyDetails;
  includeWaliDetails?: boolean;
}) {
  const appUrl = getAppUrl();

  return `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1f2937;">${heading}</h2>
      <p style="font-size: 16px;">Assalamualaikum,</p>
      <p style="font-size: 15px; color: #374151;">${intro}</p>

      <h3 style="color: #1e40af; margin-top: 25px;">Person Who Requested</h3>
      <div style="background-color: #f0f9ff; padding: 16px; border-radius: 8px; margin-bottom: 25px;">
        ${buildPartySummaryBlock(requester, includeWaliDetails)}
      </div>

      <h3 style="color: #9f1239; margin-top: 20px;">Person Request Sent To</h3>
      <div style="background-color: #fef2f2; padding: 16px; border-radius: 8px; margin-bottom: 25px;">
        ${buildPartySummaryBlock(recipient, includeWaliDetails)}
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

function buildParticipantStatusEmailHtml({
  heading,
  body,
}: {
  heading: string;
  body: string;
}) {
  const appUrl = getAppUrl();

  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #2d1b2e;">
      <p style="font-family: Arial, sans-serif; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #8d5a7c;">Finding Keepers</p>
      <h1 style="font-size: 28px; font-weight: 500; color: #6b3563; margin: 0 0 16px;">${heading}</h1>
      <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #5a4a55; margin: 0 0 20px;">
        ${body}
      </p>
      <a href="${appUrl}/dashboard/my-match-requests" style="display: inline-block; background-color: #4a2545; color: #f7f2ec; font-family: Arial, sans-serif; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 12px;">
        View my match requests
      </a>
    </div>
  `;
}

function buildRequesterDecisionEmailHtml({
  recipientShortId,
  interestReturned,
}: {
  recipientShortId: string;
  interestReturned: boolean;
}) {
  const appUrl = getAppUrl();

  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #2d1b2e;">
      <p style="font-family: Arial, sans-serif; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #8d5a7c;">Finding Keepers</p>
      <h1 style="font-size: 28px; font-weight: 500; color: #6b3563; margin: 0 0 16px;">
        ${interestReturned ? "Interest returned on your request" : "Update on your match request"}
      </h1>
      <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #5a4a55; margin: 0 0 20px;">
        ${
          interestReturned
            ? `Profile <strong>${recipientShortId}</strong> has returned your interest. If you have other returned interests, you may choose one introduction to proceed with from your dashboard. Wali details are shared only once an introduction becomes active.`
            : `Profile <strong>${recipientShortId}</strong> has declined your match request at this time.`
        }
      </p>
      <a href="${appUrl}/dashboard/my-match-requests" style="display: inline-block; background-color: #4a2545; color: #f7f2ec; font-family: Arial, sans-serif; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 12px;">
        View my match requests
      </a>
    </div>
  `;
}

async function sendAdminMatchNotification({
  subject,
  heading,
  intro,
  requester,
  recipient,
  includeWaliDetails = false,
}: {
  subject: string;
  heading: string;
  intro: string;
  requester: PartyDetails;
  recipient: PartyDetails;
  includeWaliDetails?: boolean;
}) {
  const result = await sendEmail({
    to: getAdminNotificationEmail(),
    subject,
    html: buildAdminMatchEmailHtml({
      heading,
      intro,
      requester,
      recipient,
      includeWaliDetails,
    }),
  });

  if (!result.ok) {
    console.error("Admin match notification failed:", result.message);
    return `Admin notification failed: ${result.message}`;
  }

  return null;
}

async function sendRequesterDecisionNotification({
  interestReturned,
  requesterEmail,
  recipientShortId,
}: {
  interestReturned: boolean;
  requesterEmail: string | null;
  recipientShortId: string;
}) {
  if (!requesterEmail) {
    return "Requester email not found";
  }

  const result = await sendEmail({
    to: requesterEmail,
    subject: interestReturned
      ? "Interest returned on your match request"
      : "Update on your match request",
    html: buildRequesterDecisionEmailHtml({
      recipientShortId,
      interestReturned,
    }),
  });

  if (!result.ok) {
    console.error("Requester decision notification failed:", result.message);
    return `Requester notification failed: ${result.message}`;
  }

  return null;
}

async function sendParticipantStatusNotification({
  email,
  role,
  subject,
  heading,
  body,
}: {
  email: string | null;
  role: string;
  subject: string;
  heading: string;
  body: string;
}) {
  if (!email) {
    return `${role} email not found`;
  }

  const result = await sendEmail({
    to: email,
    subject,
    html: buildParticipantStatusEmailHtml({ heading, body }),
  });

  if (!result.ok) {
    console.error(`${role} status notification failed:`, result.message);
    return `${role} notification failed: ${result.message}`;
  }

  return null;
}

async function sendNewMatchRequestEmails({
  requesterShortId,
  requestedShortId,
  requester,
  recipient,
  recipientEmail,
}: {
  requesterShortId: string;
  requestedShortId: string;
  requester: PartyDetails;
  recipient: PartyDetails;
  recipientEmail: string | null;
}) {
  const warnings: string[] = [];

  const adminWarning = await sendAdminMatchNotification({
    subject: `New Match Request: ${requesterShortId} → ${requestedShortId}`,
    heading: "New Match Request",
    intro:
      "A new match request has been submitted and is awaiting the recipient's approval.",
    requester,
    recipient,
  });
  if (adminWarning) warnings.push(adminWarning);

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
      warnings.push(
        `Recipient notification failed: ${recipientEmailResult.message}`
      );
    }
  } else {
    warnings.push("Recipient email not found");
  }

  return warnings;
}

async function sendMatchDecisionEmails({
  interestReturned,
  fromId,
  toId,
  requester,
  recipient,
  requesterEmail,
  intro,
}: {
  interestReturned: boolean;
  fromId: string;
  toId: string;
  requester: PartyDetails;
  recipient: PartyDetails;
  requesterEmail: string | null;
  intro: string;
}) {
  const warnings: string[] = [];
  const decisionLabel = interestReturned ? "interest returned" : "declined";

  const adminWarning = await sendAdminMatchNotification({
    subject: `Match request ${decisionLabel}: ${fromId} → ${toId}`,
    heading: interestReturned ? "Interest Returned" : "Match Request Declined",
    intro,
    requester,
    recipient,
    includeWaliDetails: false,
  });
  if (adminWarning) warnings.push(adminWarning);

  const requesterWarning = await sendRequesterDecisionNotification({
    interestReturned,
    requesterEmail,
    recipientShortId: toId,
  });
  if (requesterWarning) warnings.push(requesterWarning);

  return warnings;
}

const WITHDRAWN_NOTIFICATION_BODY =
  "This member is currently proceeding with another introduction, so this request has been closed.";

async function sendWithdrawnRequestNotifications({
  admin,
  withdrawnRequests,
  activeMaleShortId,
  activeFemaleShortId,
}: {
  admin: AdminSupabaseClient;
  withdrawnRequests: Array<{
    id: string;
    male_short_id: string;
    female_short_id: string;
    requested_by_short_id: string | null;
  }>;
  activeMaleShortId: string;
  activeFemaleShortId: string;
}) {
  const warnings: string[] = [];
  const activeShortIds = new Set([activeMaleShortId, activeFemaleShortId]);
  const notifiedEmails = new Set<string>();

  for (const withdrawn of withdrawnRequests) {
    const pairShortIds = [
      withdrawn.male_short_id,
      withdrawn.female_short_id,
    ] as const;

    for (const shortId of pairShortIds) {
      if (activeShortIds.has(shortId)) {
        continue;
      }

      const participant = await getMatchParticipant(admin, shortId);
      const email = participant?.email?.trim();

      if (!email || notifiedEmails.has(email)) {
        if (!email) {
          warnings.push(`Withdrawn notification email not found for ${shortId}`);
        }
        continue;
      }

      notifiedEmails.add(email);

      const warning = await sendParticipantStatusNotification({
        email,
        role: "Member",
        subject: "Update on your match request",
        heading: "Request closed",
        body: WITHDRAWN_NOTIFICATION_BODY,
      });
      if (warning) warnings.push(warning);
    }
  }

  return warnings;
}

async function sendActivationEmails({
  fromId,
  toId,
  requester,
  recipient,
  requesterEmail,
  recipientEmail,
}: {
  fromId: string;
  toId: string;
  requester: PartyDetails;
  recipient: PartyDetails;
  requesterEmail: string | null;
  recipientEmail: string | null;
}) {
  const warnings: string[] = [];

  const adminWarning = await sendAdminMatchNotification({
    subject: `Active introduction: ${fromId} ↔ ${toId}`,
    heading: "Introduction Now Active",
    intro:
      "Both members have confirmed this introduction. Wali/guarantor details are included below for facilitation.",
    requester,
    recipient,
    includeWaliDetails: true,
  });
  if (adminWarning) warnings.push(adminWarning);

  for (const [email, role, otherShortId] of [
    [requesterEmail, "Requester", toId],
    [recipientEmail, "Recipient", fromId],
  ] as const) {
    const warning = await sendParticipantStatusNotification({
      email,
      role,
      subject: "Your introduction is now active",
      heading: "Introduction started",
      body: `Your introduction with profile <strong>${otherShortId}</strong> is now active. Our admin team will guide the next steps and facilitate contact through the appropriate channels.`,
    });
    if (warning) warnings.push(warning);
  }

  return warnings;
}

async function sendAdminStatusChangeEmails({
  previousStatus,
  newStatus,
  fromId,
  toId,
  requester,
  recipient,
  requesterEmail,
  recipientEmail,
}: {
  previousStatus: string;
  newStatus: string;
  fromId: string;
  toId: string;
  requester: PartyDetails;
  recipient: PartyDetails;
  requesterEmail: string | null;
  recipientEmail: string | null;
}) {
  const warnings: string[] = [];

  const adminWarning = await sendAdminMatchNotification({
    subject: `Match status updated: ${fromId} → ${toId} (${newStatus})`,
    heading: "Match Status Updated",
    intro: `An admin updated this match request from <strong>${escapeHtml(previousStatus)}</strong> to <strong>${escapeHtml(newStatus)}</strong>.`,
    requester,
    recipient,
  });
  if (adminWarning) warnings.push(adminWarning);

  const normalizedNewStatus = normalizeMatchStatus(newStatus);

  if (
    normalizedNewStatus === MATCH_STATUS.interestReturned ||
    newStatus === "rejected"
  ) {
    const requesterWarning = await sendRequesterDecisionNotification({
      interestReturned: normalizedNewStatus === MATCH_STATUS.interestReturned,
      requesterEmail,
      recipientShortId: toId,
    });
    if (requesterWarning) warnings.push(requesterWarning);
    return warnings;
  }

  if (normalizedNewStatus === MATCH_STATUS.unmatched) {
    for (const [email, role, otherShortId] of [
      [requesterEmail, "Requester", toId],
      [recipientEmail, "Recipient", fromId],
    ] as const) {
      const warning = await sendParticipantStatusNotification({
        email,
        role,
        subject: "Your introduction has ended",
        heading: "Introduction ended",
        body: `Your introduction with profile <strong>${otherShortId}</strong> has ended. You may browse and send new requests when you are ready.`,
      });
      if (warning) warnings.push(warning);
    }
    return warnings;
  }

  if (newStatus === "contacted") {
    for (const [email, role, otherShortId] of [
      [requesterEmail, "Requester", toId],
      [recipientEmail, "Recipient", fromId],
    ] as const) {
      const warning = await sendParticipantStatusNotification({
        email,
        role,
        subject: "Update on your match request",
        heading: "Your match is being followed up",
        body: `The Finding Keepers admin team has marked your match with profile <strong>${otherShortId}</strong> as contacted and will guide the next steps.`,
      });
      if (warning) warnings.push(warning);
    }
    return warnings;
  }

  if (newStatus === "completed") {
    for (const [email, role, otherShortId] of [
      [requesterEmail, "Requester", toId],
      [recipientEmail, "Recipient", fromId],
    ] as const) {
      const warning = await sendParticipantStatusNotification({
        email,
        role,
        subject: "Your match has been completed",
        heading: "Match marked as completed",
        body: `Your match with profile <strong>${otherShortId}</strong> has been marked as completed by the admin team.`,
      });
      if (warning) warnings.push(warning);
    }
    return warnings;
  }

  if (newStatus === "expired") {
    const warning = await sendParticipantStatusNotification({
      email: requesterEmail,
      role: "Requester",
      subject: "Your match request has expired",
      heading: "Match request expired",
      body: `Your match request to profile <strong>${toId}</strong> has expired after 7 days without a response. You may request another match when you are ready.`,
    });
    if (warning) warnings.push(warning);
  }

  return warnings;
}

export async function requestMatch({
  profileShortId,
}: {
  profileShortId: string;
  profileName?: string;
  profileGender?: string;
}) {
  try {
    const auth = await assertProfileVerified();
    if (!auth.ok) {
      return { success: false, message: auth.message };
    }

    const supabase = await createServerSupabaseClient();
    const user = auth.user;

    const admin = createAdminSupabaseClient();
    if (!admin) {
      return {
        success: false,
        message:
          "Server configuration is incomplete. Add SUPABASE_SERVICE_ROLE_KEY.",
      };
    }

    await expireStalePendingMatchRequests(admin);

    const { data: requesterCV } = await supabase
      .from("cvs")
      .select("short_id, data")
      .eq("user_id", user.id)
      .single();

    const { data: requesterProfile } = await supabase
      .from("profiles")
      .select(
        "phone, gender, browse_visible, active_introduction_request_id"
      )
      .eq("id", user.id)
      .single();

    if (hasActiveIntroduction(requesterProfile ?? {})) {
      return {
        success: false,
        message:
          "You currently have an active introduction and cannot send new requests until it ends.",
      };
    }

    const requestedParticipant = await getMatchParticipant(admin, profileShortId);

    if (!requesterCV?.data || !requesterCV.short_id) {
      return { success: false, message: "Your CV not found" };
    }

    if (!requestedParticipant) {
      return { success: false, message: "Requested profile not found" };
    }

    if (requesterCV.short_id === requestedParticipant.shortId) {
      return { success: false, message: "You cannot send a request to yourself" };
    }

    if (
      !gendersAreOpposite(
        requesterProfile?.gender,
        requestedParticipant.gender
      )
    ) {
      return {
        success: false,
        message: "Match requests can only be sent to opposite-gender profiles",
      };
    }

    if (requestedParticipant.verificationStatus !== "verified") {
      return {
        success: false,
        message: "This profile is not available for match requests",
      };
    }

    if (
      hasActiveIntroduction({
        browse_visible: requestedParticipant.browseVisible,
        active_introduction_request_id:
          requestedParticipant.activeIntroductionRequestId,
      })
    ) {
      return {
        success: false,
        message: "This profile is not currently available for match requests",
      };
    }

    const isRequesterMale = requesterProfile?.gender === "male";
    const requesterShortId = requesterCV.short_id;
    const requestedShortId = requestedParticipant.shortId;
    const maleShortId = isRequesterMale ? requesterShortId : requestedShortId;
    const femaleShortId = isRequesterMale ? requestedShortId : requesterShortId;

    const { data: existingPairRequests } = await supabase
      .from("match_requests")
      .select("id, status, created_at")
      .eq("male_short_id", maleShortId)
      .eq("female_short_id", femaleShortId)
      .order("created_at", { ascending: false });

    const latestPairRequest = existingPairRequests?.[0];

    if (latestPairRequest?.status === "rejected") {
      return {
        success: false,
        message:
          "This match request was declined and cannot be sent to this profile again",
      };
    }

    const blockingPairRequest = existingPairRequests?.find((request) =>
      blocksNewRequestToPair(request.status, request.created_at)
    );

    if (blockingPairRequest) {
      return {
        success: false,
        message:
          blockingPairRequest.status === "pending"
            ? "A match request between these profiles is already awaiting a response"
            : "A match request between these profiles is already in progress",
      };
    }

    const { data: activeRequests, error: activeCountError } = await supabase
      .from("match_requests")
      .select("id, status, created_at")
      .eq("requested_by_short_id", requesterShortId)
      .in("status", [...ACTIVE_MATCH_STATUSES]);

    if (activeCountError) {
      console.error("Active match request count error:", activeCountError);
      return {
        success: false,
        message: "Could not verify your current match requests",
      };
    }

    const activeRequestCount =
      activeRequests?.filter((request) =>
        countsTowardActiveQuota(request.status, request.created_at)
      ).length ?? 0;

    if (activeRequestCount >= MAX_ACTIVE_MATCH_REQUESTS) {
      return {
        success: false,
        message: `You can only have ${MAX_ACTIVE_MATCH_REQUESTS} active match requests at a time. Wait for a response, rejection, or 7-day expiry before requesting another match.`,
      };
    }

    const requester = buildPartyDetailsFromCv(
      requesterShortId,
      requesterCV.data,
      requesterProfile?.phone || ""
    );

    const recipient = buildPartyDetailsFromCv(
      requestedShortId,
      requestedParticipant.cvData,
      requestedParticipant.phone
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

    const emailWarnings = await sendNewMatchRequestEmails({
      requesterShortId,
      requestedShortId,
      requester,
      recipient,
      recipientEmail: requestedParticipant.email,
    });

    return {
      success: true,
      message: formatMessageWithEmailWarnings(
        "Match request sent. The recipient and admin team have been notified by email.",
        emailWarnings
      ),
    };
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
    const auth = await assertProfileVerified();
    if (!auth.ok) {
      return { success: false, message: auth.message };
    }

    const supabase = await createServerSupabaseClient();
    const user = auth.user;

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

    const adminForExpiry = createAdminSupabaseClient();
    if (adminForExpiry) {
      await expireStalePendingMatchRequests(adminForExpiry);
    }

    const { data: refreshedRequest } = await supabase
      .from("match_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (!refreshedRequest) {
      return { success: false, message: "Match request not found" };
    }

    if (
      refreshedRequest.status === "expired" ||
      (refreshedRequest.status === "pending" &&
        isPendingExpired(refreshedRequest.created_at))
    ) {
      return {
        success: false,
        message:
          "This match request has expired after 7 days without a response",
      };
    }

    if (refreshedRequest.status !== "pending") {
      return {
        success: false,
        message: "This match request has already been responded to",
      };
    }

    const { fromId, toId } = getMatchDirection(refreshedRequest);

    if (toId !== myCV.short_id) {
      return {
        success: false,
        message: "Only the recipient can approve or decline this request",
      };
    }

    const newStatus =
      decision === "approve"
        ? MATCH_STATUS.interestReturned
        : MATCH_STATUS.rejected;

    const admin = createAdminSupabaseClient();
    if (!admin) {
      return {
        success: false,
        message:
          "Server configuration is incomplete. Add SUPABASE_SERVICE_ROLE_KEY.",
      };
    }

    const updatePayload =
      decision === "approve"
        ? {
            status: newStatus,
            interest_returned_at: new Date().toISOString(),
          }
        : { status: newStatus };

    const { error: updateError } = await admin
      .from("match_requests")
      .update(updatePayload)
      .eq("id", requestId);

    if (updateError) {
      console.error("Match response update error:", updateError);
      return { success: false, message: "Failed to update match request" };
    }

    const requesterParticipant = await getMatchParticipant(admin, fromId);
    const recipientParticipant = await getMatchParticipant(admin, toId);

    const requester = buildPartyDetailsFromCv(
      fromId,
      requesterParticipant?.cvData || {},
      requesterParticipant?.phone || ""
    );

    const recipient = buildPartyDetailsFromCv(
      toId,
      recipientParticipant?.cvData ||
        ((myCV.data as Record<string, string>) ?? {}),
      recipientParticipant?.phone || ""
    );

    const interestReturned = decision === "approve";
    const decisionLabel = interestReturned ? "returned interest on" : "declined";

    const emailWarnings = await sendMatchDecisionEmails({
      interestReturned,
      fromId,
      toId,
      requester,
      recipient,
      requesterEmail: requesterParticipant?.email ?? null,
      intro: `The recipient has ${decisionLabel} this match request. No wali details are shared at this stage.`,
    });

    return {
      success: true,
      message: formatMessageWithEmailWarnings(
        interestReturned
          ? "Interest returned. The requester and admin team have been notified."
          : "Match request declined. The requester and admin team have been notified.",
        emailWarnings
      ),
    };
  } catch (error: unknown) {
    console.error("Match response error:", error);
    const message =
      error instanceof Error ? error.message : "Something went wrong";
    return { success: false, message };
  }
}

const ADMIN_MATCH_STATUSES = new Set([
  MATCH_STATUS.pending,
  MATCH_STATUS.interestReturned,
  "approved",
  MATCH_STATUS.active,
  MATCH_STATUS.contacted,
  MATCH_STATUS.completed,
  MATCH_STATUS.unmatched,
  MATCH_STATUS.rejected,
  MATCH_STATUS.expired,
  MATCH_STATUS.withdrawn,
]);

type ActivateRpcResult = {
  ok: boolean;
  message?: string;
  withdrawn_count?: number;
  male_user_id?: string;
  female_user_id?: string;
};

export async function activateMatchIntroduction({
  requestId,
}: {
  requestId: string;
}) {
  try {
    const auth = await assertProfileVerified();
    if (!auth.ok) {
      return { success: false, message: auth.message };
    }

    const supabase = await createServerSupabaseClient();
    const user = auth.user;

    const { data: myCV } = await supabase
      .from("cvs")
      .select("short_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!myCV?.short_id) {
      return { success: false, message: "Your CV was not found" };
    }

    const admin = createAdminSupabaseClient();
    if (!admin) {
      return {
        success: false,
        message:
          "Server configuration is incomplete. Add SUPABASE_SERVICE_ROLE_KEY.",
      };
    }

    const { data: request, error: fetchError } = await admin
      .from("match_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (fetchError || !request) {
      return { success: false, message: "Match request not found" };
    }

    if (request.requested_by_short_id !== myCV.short_id) {
      return {
        success: false,
        message:
          "Only the member who sent the original interest can begin the introduction",
      };
    }

    if (normalizeMatchStatus(request.status) !== MATCH_STATUS.interestReturned) {
      return {
        success: false,
        message: "This interest is not ready to begin an introduction",
      };
    }

    if (request.interest_returned_at) {
      const selectionDeadline =
        new Date(request.interest_returned_at).getTime() +
        SELECTION_WINDOW_HOURS * 60 * 60 * 1000;

      if (Date.now() > selectionDeadline) {
        return {
          success: false,
          message:
            "The selection window for this returned interest has passed. Please send a fresh request if the profile is still available.",
        };
      }
    }

    const { data: toWithdraw } = await admin
      .from("match_requests")
      .select("id, male_short_id, female_short_id, requested_by_short_id")
      .neq("id", requestId)
      .in("status", [MATCH_STATUS.pending, MATCH_STATUS.interestReturned, "approved"])
      .or(
        `male_short_id.in.(${request.male_short_id},${request.female_short_id}),female_short_id.in.(${request.male_short_id},${request.female_short_id})`
      );

    const { data: rpcData, error: rpcError } = await admin.rpc(
      "activate_match_introduction",
      {
        p_request_id: requestId,
        p_activator_user_id: user.id,
      }
    );

    if (rpcError) {
      console.error("Activate introduction RPC error:", rpcError);
      return {
        success: false,
        message: "Failed to begin introduction. Please try again.",
      };
    }

    const rpcResult = rpcData as ActivateRpcResult;

    if (!rpcResult?.ok) {
      return {
        success: false,
        message:
          rpcResult?.message ||
          "Could not begin introduction. You may already have an active introduction.",
      };
    }

    const { fromId, toId } = getMatchDirection(request);
    const [requesterParticipant, recipientParticipant] = await Promise.all([
      getMatchParticipant(admin, fromId),
      getMatchParticipant(admin, toId),
    ]);

    const requester = buildPartyDetailsFromCv(
      fromId,
      requesterParticipant?.cvData || {},
      requesterParticipant?.phone || ""
    );
    const recipient = buildPartyDetailsFromCv(
      toId,
      recipientParticipant?.cvData || {},
      recipientParticipant?.phone || ""
    );

    const emailWarnings = [
      ...(await sendActivationEmails({
        fromId,
        toId,
        requester,
        recipient,
        requesterEmail: requesterParticipant?.email ?? null,
        recipientEmail: recipientParticipant?.email ?? null,
      })),
      ...(await sendWithdrawnRequestNotifications({
        admin,
        withdrawnRequests: toWithdraw ?? [],
        activeMaleShortId: request.male_short_id,
        activeFemaleShortId: request.female_short_id,
      })),
    ];

    return {
      success: true,
      message: formatMessageWithEmailWarnings(
        "Introduction started. Wali details have been shared with the admin team and both members have been notified.",
        emailWarnings
      ),
    };
  } catch (error: unknown) {
    console.error("Activate introduction error:", error);
    const message =
      error instanceof Error ? error.message : "Something went wrong";
    return { success: false, message };
  }
}

export async function updateAdminMatchStatus({
  requestId,
  newStatus,
}: {
  requestId: string;
  newStatus: string;
}) {
  const adminCheck = await assertAdmin();
  if (!adminCheck.ok) {
    return { success: false, message: adminCheck.message };
  }

  const normalizedRequestedStatus = normalizeMatchStatus(newStatus);

  if (!ADMIN_MATCH_STATUSES.has(normalizedRequestedStatus)) {
    return { success: false, message: "Invalid status" };
  }

  const admin = createAdminSupabaseClient();
  if (!admin) {
    return {
      success: false,
      message: "Server configuration is incomplete",
    };
  }

  const { data: existingRequest, error: fetchError } = await admin
    .from("match_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (fetchError || !existingRequest) {
    return { success: false, message: "Match request not found" };
  }

  const normalizedNewStatus = normalizedRequestedStatus;
  const normalizedPreviousStatus = normalizeMatchStatus(existingRequest.status);

  if (normalizedPreviousStatus === normalizedNewStatus) {
    return { success: true, message: `Status is already ${normalizedNewStatus}` };
  }

  if (
    normalizedPreviousStatus === MATCH_STATUS.active &&
    (normalizedNewStatus === MATCH_STATUS.unmatched ||
      normalizedNewStatus === MATCH_STATUS.completed)
  ) {
    const { data: rpcData, error: rpcError } = await admin.rpc(
      "end_match_introduction",
      {
        p_request_id: requestId,
        p_new_status: normalizedNewStatus,
      }
    );

    const rpcResult = rpcData as { ok?: boolean; message?: string };

    if (rpcError || !rpcResult?.ok) {
      console.error("End introduction RPC error:", rpcError ?? rpcResult);
      return {
        success: false,
        message:
          rpcResult?.message || "Failed to end active introduction",
      };
    }
  } else if (normalizedNewStatus === MATCH_STATUS.active) {
    return {
      success: false,
      message:
        "Active introductions must be started by the member who sent the original interest.",
    };
  } else {
    const updatePayload: Record<string, string> = { status: normalizedNewStatus };

    if (normalizedNewStatus === MATCH_STATUS.interestReturned) {
      updatePayload.interest_returned_at = new Date().toISOString();
    }

    const { error } = await admin
      .from("match_requests")
      .update(updatePayload)
      .eq("id", requestId);

    if (error) {
      console.error("Admin match status update error:", error);
      return { success: false, message: "Failed to update status" };
    }
  }

  const { fromId, toId } = getMatchDirection(existingRequest);
  const [requesterParticipant, recipientParticipant] = await Promise.all([
    getMatchParticipant(admin, fromId),
    getMatchParticipant(admin, toId),
  ]);

  const requester = buildPartyDetailsFromCv(
    fromId,
    requesterParticipant?.cvData || {},
    requesterParticipant?.phone || ""
  );
  const recipient = buildPartyDetailsFromCv(
    toId,
    recipientParticipant?.cvData || {},
    recipientParticipant?.phone || ""
  );

  const emailWarnings = await sendAdminStatusChangeEmails({
    previousStatus: existingRequest.status,
    newStatus: normalizedNewStatus,
    fromId,
    toId,
    requester,
    recipient,
    requesterEmail: requesterParticipant?.email ?? null,
    recipientEmail: recipientParticipant?.email ?? null,
  });

  return {
    success: true,
    message: formatMessageWithEmailWarnings(
      `Status updated to ${normalizedNewStatus}.`,
      emailWarnings
    ),
  };
}