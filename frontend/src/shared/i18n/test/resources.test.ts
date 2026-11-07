import { describe, expect, it } from "vitest";

const bundles = import.meta.glob<{ default: Record<string, unknown> }>(
  "../locales/*/*.json",
  { eager: true },
);
function flatten(
  value: Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, entry]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof entry === "string"
        ? [[path, entry]]
        : Object.entries(flatten(entry as Record<string, unknown>, path));
    }),
  );
}

describe("translation resource contracts", () => {
  for (const namespace of ["common", "workspace", "account", "agent"]) {
    it(`${namespace} provides matching keys and interpolation variables`, () => {
      const english = flatten(
        bundles[`../locales/en/${namespace}.json`].default,
      );
      const vietnamese = flatten(
        bundles[`../locales/vi/${namespace}.json`].default,
      );
      expect(Object.keys(vietnamese).sort()).toEqual(
        Object.keys(english).sort(),
      );
      for (const [key, value] of Object.entries(english)) {
        expect(vietnamese[key].trim(), key).not.toBe("");
        const variables = (text: string) =>
          (text.match(/\{\{[^}]+\}\}/g) ?? []).sort();
        expect(variables(vietnamese[key]), key).toEqual(variables(value));
      }
    });
  }
});
