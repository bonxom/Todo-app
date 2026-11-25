import { z } from "zod";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

const isAllowedPushEndpoint = (raw: string): boolean => {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "https:") return true;
    if (parsed.protocol === "http:" && LOOPBACK_HOSTS.has(parsed.hostname)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

export const pushEndpointSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine(isAllowedPushEndpoint, {
    message: "Push endpoint must be an https URL or loopback http URL",
  });

export const pushPreferencesSchema = z
  .object({
    taskDeadlines: z.boolean().optional(),
    agentReplies: z.boolean().optional(),
  })
  .strict();

export const notificationQuerySchema = z
  .object({
    pageNo: z.coerce.number().int().positive().max(1_000_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    filter: z.enum(["all", "unread"]).default("all"),
  })
  .strict();
export const notificationParamsSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/i),
});
export const notificationBodySchema = z.object({}).strict().default({});

export const pushSubscriptionQuerySchema = z
  .object({
    endpoint: pushEndpointSchema,
  })
  .strict();

export const pushSubscriptionUpsertSchema = z
  .object({
    endpoint: pushEndpointSchema,
    keys: z
      .object({
        p256dh: z.string().trim().min(1).max(512),
        auth: z.string().trim().min(1).max(256),
      })
      .strict(),
    prefs: pushPreferencesSchema.optional(),
    userAgent: z.string().trim().max(500).optional(),
  })
  .strict();

export const pushSubscriptionUpdatePrefsSchema = z
  .object({
    endpoint: pushEndpointSchema,
    prefs: pushPreferencesSchema.refine(
      (prefs) =>
        prefs.taskDeadlines !== undefined || prefs.agentReplies !== undefined,
      { message: "At least one preference field is required" },
    ),
  })
  .strict();

export const pushSubscriptionDeleteSchema = z
  .object({
    endpoint: pushEndpointSchema,
  })
  .strict();
