/**
 * Generates a RFC4122 v4 compliant UUID or collision-resistant identifier.
 * Works across secure contexts (HTTPS/localhost) and insecure contexts (HTTP/older browsers)
 * where `crypto.randomUUID` might not be available or exposed.
 */
export const generateUUID = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    try {
      const buffer = new Uint8Array(16);
      crypto.getRandomValues(buffer);
      // Set version (4) and variant (RFC4122) bits
      buffer[6] = (buffer[6] & 0x0f) | 0x40;
      buffer[8] = (buffer[8] & 0x3f) | 0x80;

      const hex = Array.from(buffer, (byte) => byte.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    } catch {
      // Fall through to Math.random fallback
    }
  }

  // Fallback for environments where crypto is completely unavailable or throws
  let timestamp = Date.now();
  let performanceNow =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now() * 1000
      : 0;

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    let random = Math.random() * 16;
    if (timestamp > 0) {
      random = (timestamp + random) % 16 | 0;
      timestamp = Math.floor(timestamp / 16);
    } else if (performanceNow > 0) {
      random = (performanceNow + random) % 16 | 0;
      performanceNow = Math.floor(performanceNow / 16);
    } else {
      random = random | 0;
    }

    if (char === "x") {
      return random.toString(16);
    }
    return ((random & 0x3) | 0x8).toString(16);
  });
};

/**
 * Generates an optimistic temporary entity ID with an optional prefix.
 */
export const generateOptimisticId = (prefix = "optimistic"): string => {
  return `${prefix}-${generateUUID()}`;
};
