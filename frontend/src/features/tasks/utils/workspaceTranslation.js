import i18n from "@/shared/i18n";
export const workspaceTranslate = (key, options) =>
  i18n.t(key, { ns: "workspace", ...options });
export const workspaceKey = (text) =>
  String(text)
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .map((word, index) =>
      index
        ? word[0]?.toUpperCase() + word.slice(1).toLowerCase()
        : word.toLowerCase(),
    )
    .join("");
