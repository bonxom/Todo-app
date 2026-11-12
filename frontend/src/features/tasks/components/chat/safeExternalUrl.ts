/**
 * Validates and normalizes an external URL for safe anchor rendering.
 * Only absolute http: and https: protocols are permitted.
 * Credentials (username:password) are rejected.
 */
export function safeExternalUrl(value: string): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length > 2048) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    if (url.username || url.password) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}
