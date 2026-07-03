export type ContentSecurityPolicy = {
  nonce: string;
  value: string;
};

export function buildContentSecurityPolicy(): ContentSecurityPolicy {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  const value = [
    "default-src 'self' blob:",
    // strict-dynamic disables host allowlists and can block Next.js client chunks.
    `script-src 'self' 'nonce-${nonce}' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
    // No style nonce: it disables unsafe-inline and blocks Sonner's injected <style>.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");

  return { nonce, value };
}

export function applyCspRequestHeaders(
  request: Request,
  csp: ContentSecurityPolicy
) {
  const headers = new Headers(request.headers);
  headers.set("x-nonce", csp.nonce);
  headers.set("Content-Security-Policy", csp.value);
  return headers;
}