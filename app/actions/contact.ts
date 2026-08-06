"use server";

import {
  getAdminNotificationEmail,
  sendEmail,
} from "@/lib/email";
import { escapeHtml } from "@/lib/html-escape";
import {
  enforceRateLimits,
  getClientIp,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const CONTACT_TOPICS = [
  "general",
  "account_access",
  "verification",
  "matching",
  "technical",
  "privacy",
  "other",
] as const;

function formatTopic(topic: string) {
  return topic.replace(/_/g, " ");
}

export async function submitContactForm({
  name,
  email,
  phone,
  topic,
  message,
}: {
  name: string;
  email: string;
  phone?: string;
  topic: string;
  message: string;
}) {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedPhone = phone?.trim() || "";
  const trimmedTopic = topic.trim() || "general";
  const trimmedMessage = message.trim();

  if (trimmedName.length < 2) {
    return { ok: false as const, message: "Please enter your name" };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { ok: false as const, message: "Please enter a valid email address" };
  }

  if (
    !CONTACT_TOPICS.includes(
      trimmedTopic as (typeof CONTACT_TOPICS)[number]
    )
  ) {
    return { ok: false as const, message: "Please select a valid topic" };
  }

  if (trimmedMessage.length < 10) {
    return {
      ok: false as const,
      message: "Please describe your issue in a bit more detail",
    };
  }

  if (trimmedMessage.length > 3000) {
    return {
      ok: false as const,
      message: "Message is too long (max 3000 characters)",
    };
  }

  const rateLimit = await enforceRateLimits([
    {
      scope: "contact:ip",
      identifier: await getClientIp(),
      policy: RATE_LIMITS.contact.perIp,
    },
    {
      scope: "contact:email",
      identifier: trimmedEmail,
      policy: RATE_LIMITS.contact.perEmail,
    },
  ]);

  if (!rateLimit.allowed) {
    return { ok: false as const, message: rateLimit.message };
  }

  let accountUserId: string | null = null;
  let accountShortId: string | null = null;
  let accountVerified: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      accountUserId = user.id;
      const [{ data: profile }, { data: cv }] = await Promise.all([
        supabase
          .from("profiles")
          .select("verification_status, full_name")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("cvs")
          .select("short_id")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      accountVerified = profile?.verification_status ?? null;
      accountShortId = cv?.short_id ?? null;
    }
  } catch {
    // Contact form works for guests; ignore session lookup failures.
  }

  const submittedAt = new Date().toISOString();
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; color: #1f2937;">
      <h2 style="color: #4a2545; margin: 0 0 12px;">New Contact Us message</h2>
      <p style="font-size: 15px; color: #374151; margin: 0 0 20px;">
        Someone submitted the Contact Us form on Finding Keepers.
      </p>
      <div style="background: #faf6f1; border: 1px solid #e3cfa0; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
        <p style="margin: 0 0 8px;"><strong>Name:</strong> ${escapeHtml(trimmedName)}</p>
        <p style="margin: 0 0 8px;"><strong>Email:</strong> ${escapeHtml(trimmedEmail)}</p>
        <p style="margin: 0 0 8px;"><strong>Phone:</strong> ${escapeHtml(trimmedPhone || "Not provided")}</p>
        <p style="margin: 0 0 8px;"><strong>Topic:</strong> ${escapeHtml(formatTopic(trimmedTopic))}</p>
        <p style="margin: 0;"><strong>Submitted at (UTC):</strong> ${escapeHtml(submittedAt)}</p>
      </div>
      <div style="background: #f9fafb; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
        <p style="margin: 0 0 8px; font-weight: 600;">Message</p>
        <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${escapeHtml(trimmedMessage)}</p>
      </div>
      <div style="font-size: 13px; color: #6b7280;">
        <p style="margin: 0 0 4px;"><strong>Signed-in account:</strong> ${accountUserId ? "Yes" : "No (guest)"}</p>
        ${
          accountUserId
            ? `<p style="margin: 0 0 4px;"><strong>User ID:</strong> ${escapeHtml(accountUserId)}</p>
               <p style="margin: 0 0 4px;"><strong>Verification:</strong> ${escapeHtml(accountVerified || "unknown")}</p>
               <p style="margin: 0;"><strong>CV Short ID:</strong> ${escapeHtml(accountShortId || "None")}</p>`
            : ""
        }
      </div>
      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="font-size: 12px; color: #9ca3af; margin: 0;">Automated message from Finding Keepers Contact Us form.</p>
    </div>
  `;

  const result = await sendEmail({
    to: getAdminNotificationEmail(),
    subject: `[Contact Us] ${formatTopic(trimmedTopic)} — ${trimmedName}`,
    html,
  });

  if (!result.ok) {
    console.error("Contact form email failed:", result.message);
    return {
      ok: false as const,
      message:
        "Could not send your message right now. Please try again or email findingkeepers@connecthk.org.",
    };
  }

  return {
    ok: true as const,
    message:
      "Message sent. Our team will get back to you by email as soon as possible.",
  };
}
