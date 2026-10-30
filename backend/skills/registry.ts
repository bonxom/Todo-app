import { createHash } from "node:crypto";
import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { MAX_DOCUMENT_CHARS, SkillError } from "./types.js";
import type { SkillDocument, SkillRegistry, SkillSummary } from "./types.js";

const documentPath = z.string().refine(
  (value) =>
    value.endsWith(".md") &&
    !isAbsolute(value) &&
    !/[\\\x00-\x1f?#%:]/.test(value) &&
    value.split("/").every((part) => part !== "" && part !== "." && part !== ".."),
  "Expected a canonical relative Markdown path",
);
const manifestSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().trim().min(1),
  entrypoint: documentPath,
  documents: z.array(documentPath).min(1),
}).refine((manifest) =>
  new Set(manifest.documents).size === manifest.documents.length &&
  manifest.documents.includes(manifest.entrypoint),
  "Documents must be unique and include the entrypoint",
);

export function contentHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function assertContained(root: string, target: string): void {
  const path = relative(root, target);
  if (!path || isAbsolute(path) || path === ".." || path.startsWith(`..${sep}`)) {
    throw new SkillError("SKILL_REGISTRY_INVALID", "Skill assets must stay inside their owning directory.");
  }
}

async function readAsset(root: string, path: string): Promise<string> {
  const resolved = await realpath(path);
  assertContained(root, resolved);
  if (!(await stat(resolved)).isFile()) {
    throw new SkillError("SKILL_REGISTRY_INVALID", "Skill assets must be regular files.");
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(await readFile(resolved));
}

/** Read once; all documents in a turn share this immutable filesystem snapshot. */
export async function loadSkillRegistry(root: URL): Promise<SkillRegistry> {
  try {
    const rootPath = await realpath(fileURLToPath(root));
    const summaries = new Map<string, SkillSummary>();
    const entrypoints = new Map<string, string>();
    const docs = new Map<string, Map<string, SkillDocument>>();
    for (const entry of (await readdir(rootPath, { withFileTypes: true })).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      const skillPath = await realpath(join(rootPath, entry.name));
      assertContained(rootPath, skillPath);
      if (!(await stat(skillPath)).isDirectory()) {
        throw new SkillError("SKILL_REGISTRY_INVALID", "Skill entries must be directories.");
      }
      const manifest = manifestSchema.parse(JSON.parse(await readAsset(skillPath, join(skillPath, "manifest.json"))));
      if (manifest.id !== entry.name || summaries.has(manifest.id)) {
        throw new SkillError("SKILL_REGISTRY_INVALID", "Skill IDs must be unique and match their directory.");
      }
      const paths = [...manifest.documents].sort();
      const pairs: [string, string][] = [];
      for (const document of paths) {
        const text = await readAsset(skillPath, join(skillPath, document));
        if (text.length > MAX_DOCUMENT_CHARS) {
          throw new SkillError("SKILL_CONTENT_TOO_LARGE", `Skill document exceeds ${MAX_DOCUMENT_CHARS} characters: ${manifest.id}/${document}`);
        }
        pairs.push([document, text]);
      }
      const version = contentHash(JSON.stringify({
        manifest: { id: manifest.id, description: manifest.description, entrypoint: manifest.entrypoint, documents: paths },
        documents: pairs,
      }));
      summaries.set(manifest.id, Object.freeze({ id: manifest.id, description: manifest.description, version }));
      entrypoints.set(manifest.id, manifest.entrypoint);
      docs.set(manifest.id, new Map(pairs.map(([document, text]) => [document, Object.freeze({
        skillId: manifest.id, document, version,
        uri: `skill://${manifest.id}/${document.split("/").map(encodeURIComponent).join("/")}`, text,
      })])));
    }
    return Object.freeze({
      list: () => [...summaries.values()],
      documents: () => [...docs.values()].flatMap((documents) => [...documents.values()]),
      read(skillId: string, document?: string): SkillDocument {
        const documents = docs.get(skillId);
        if (!documents) throw new SkillError("SKILL_NOT_FOUND", `Unknown skill: ${skillId}`);
        const selected = document ?? entrypoints.get(skillId)!;
        const result = documents.get(selected);
        if (!result) throw new SkillError("SKILL_DOCUMENT_NOT_FOUND", `Unknown skill document: ${skillId}/${selected}`);
        return result;
      },
    });
  } catch (error) {
    if (error instanceof SkillError) throw error;
    throw new SkillError("SKILL_REGISTRY_INVALID", "Unable to initialize skill registry; check repository skill assets.", { cause: error });
  }
}

let cached: Promise<SkillRegistry> | undefined;
/** Restart the process after editing deployed content; failed loads can be retried. */
export function getSkillRegistry(): Promise<SkillRegistry> {
  cached ??= loadSkillRegistry(new URL("./content/", import.meta.url)).catch((error: unknown) => {
    cached = undefined;
    throw error;
  });
  return cached;
}
