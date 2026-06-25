"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { normalizePhone } from "@/lib/phone";

function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export async function checkPhoneAvailable(phone: string) {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    return { available: false, message: "Please enter a valid phone number" };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("check_phone_available", {
    phone_input: normalized,
  });

  if (error) {
    console.error("Phone check error:", error);
    return {
      available: false,
      message:
        "Could not verify phone number. Please run supabase/setup.sql in your Supabase SQL Editor.",
    };
  }

  if (data === false) {
    return {
      available: false,
      message: "This phone number has already been used to register an account.",
    };
  }

  return { available: true, message: "" };
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
        <h1 style="font-size: 24px; color: #6b3563;">Assalamualaikum, ${displayName}</h1>
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