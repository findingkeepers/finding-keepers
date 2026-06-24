import { Resend } from "resend";

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
};

type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; message: string; statusCode?: number };

function getFromAddress() {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Finding Keepers <onboarding@resend.dev>"
  );
}

export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailInput): Promise<SendEmailResult> {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, message: "RESEND_API_KEY is not configured" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject,
    html,
  });

  if (error) {
    console.error("Resend email error:", error);
    return {
      ok: false,
      message: error.message,
      statusCode: error.statusCode ?? undefined,
    };
  }

  if (!data?.id) {
    return { ok: false, message: "Resend did not return an email id" };
  }

  return { ok: true, id: data.id };
}

export function isResendTestModeRestriction(message: string) {
  return message.includes("only send testing emails to your own email address");
}