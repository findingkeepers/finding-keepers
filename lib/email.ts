import { Resend } from "resend";

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
};

type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; message: string; statusCode?: number };

/** Resend allows 2 requests/second — stay safely under that across burst sends. */
const MIN_SEND_INTERVAL_MS = 550;
const RATE_LIMIT_MAX_RETRIES = 4;
const RATE_LIMIT_BASE_DELAY_MS = 1000;

let lastSendAt = 0;
let sendChain: Promise<void> = Promise.resolve();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(message: string, statusCode?: number) {
  return (
    statusCode === 429 ||
    message.toLowerCase().includes("too many requests") ||
    message.toLowerCase().includes("rate limit")
  );
}

async function waitForSendSlot() {
  let release!: () => void;
  const slot = new Promise<void>((resolve) => {
    release = resolve;
  });

  const previous = sendChain;
  sendChain = previous.then(async () => {
    const now = Date.now();
    const waitMs = Math.max(0, MIN_SEND_INTERVAL_MS - (now - lastSendAt));
    if (waitMs > 0) {
      await sleep(waitMs);
    }
    lastSendAt = Date.now();
    release();
  });

  await previous;
  await slot;
}

function getFromAddress() {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Finding Keepers <onboarding@resend.dev>"
  );
}

export function getAdminNotificationEmail() {
  return (
    process.env.ADMIN_NOTIFICATION_EMAIL?.trim() ||
    "findingkeepers@connecthk.org"
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

  for (let attempt = 0; attempt < RATE_LIMIT_MAX_RETRIES; attempt++) {
    await waitForSendSlot();

    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to,
      subject,
      html,
    });

    if (!error) {
      if (!data?.id) {
        return { ok: false, message: "Resend did not return an email id" };
      }

      return { ok: true, id: data.id };
    }

    const shouldRetry =
      isRateLimitError(error.message, error.statusCode ?? undefined) &&
      attempt < RATE_LIMIT_MAX_RETRIES - 1;

    if (shouldRetry) {
      const retryDelay = RATE_LIMIT_BASE_DELAY_MS * (attempt + 1);
      console.warn(
        `Resend rate limit hit for "${subject}". Retrying in ${retryDelay}ms (attempt ${attempt + 1}).`
      );
      await sleep(retryDelay);
      continue;
    }

    console.error("Resend email error:", error);
    return {
      ok: false,
      message: error.message,
      statusCode: error.statusCode ?? undefined,
    };
  }

  return { ok: false, message: "Failed to send email after retries" };
}

export function isResendTestModeRestriction(message: string) {
  return message.includes("only send testing emails to your own email address");
}