export const skillKeys = {
  all: (sessionKey: string) => ["skills", sessionKey] as const,
  detail: (sessionKey: string, id: string) =>
    ["skills", sessionKey, id] as const,
  templates: () => ["skill-templates"] as const,
  templateDetail: (id: string) => ["skill-templates", id] as const,
};
