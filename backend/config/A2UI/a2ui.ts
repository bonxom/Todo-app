export const A2UI_CONFIG = {
  PROTOCOL_VERSION: "v0.9" as const,
  CATALOG_ID: "urn:orbit:a2ui:task-proposals:v1" as const,
  MIN_ITEMS: 1,
  MAX_ITEMS: 20,
  MAX_PAYLOAD_BYTES: 128 * 1024,
  MAX_MESSAGES_PER_ENVELOPE: 16,
};

export const isTaskProposalsEnabled = (): boolean =>
  process.env.A2UI_TASK_PROPOSALS_ENABLED === "true";
