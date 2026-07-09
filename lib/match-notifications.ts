import { toast } from "sonner";

const EMAIL_WARNING_MARKER = "Some notifications could not be sent";

export function showMatchResultToast(
  message: string | undefined,
  fallbackSuccess: string
) {
  if (!message) {
    toast.success(fallbackSuccess);
    return;
  }

  if (message.includes(EMAIL_WARNING_MARKER)) {
    toast.warning(message);
    return;
  }

  toast.success(message);
}