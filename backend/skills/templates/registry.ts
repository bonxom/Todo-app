import { createHash } from "node:crypto";
import { readFileSync, readdirSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { AppError } from "../../error/AppError.js";
import { SKILL_ERROR } from "../../error/definitions/skillErrors.js";

export interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  version: string;
}

export interface TemplateDetail extends TemplateSummary {
  instructions: string;
}

const templateIdSchema = z.string().regex(/^[a-z0-9-]+$/);

const templateManifestSchema = z.strictObject({
  id: templateIdSchema,
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(500),
  entrypoint: z
    .string()
    .refine((p) => p.endsWith(".md") && !p.includes("..") && !isAbsolute(p)),
});

function contentHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function assertContained(root: string, target: string): void {
  const rel = relative(root, target);
  if (!rel || isAbsolute(rel) || rel === ".." || rel.startsWith(`..${sep}`)) {
    throw new Error("Template path traversal rejected");
  }
}

export class TemplateCatalog {
  private summaries = new Map<string, TemplateSummary>();
  private details = new Map<string, TemplateDetail>();

  constructor(root = fileURLToPath(new URL("./", import.meta.url))) {
    this.load(root);
  }

  private load(root: string): void {
    const rootPath = realpathSync(root);
    const entries = readdirSync(rootPath, { withFileTypes: true });

    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory()) continue;
      const templateDir = realpathSync(join(rootPath, entry.name));
      assertContained(rootPath, templateDir);

      const manifestPath = join(templateDir, "manifest.json");
      let manifestRaw: string;
      try {
        const resolvedManifest = realpathSync(manifestPath);
        assertContained(templateDir, resolvedManifest);
        manifestRaw = readFileSync(resolvedManifest, "utf-8");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
        throw error;
      }

      const manifest = templateManifestSchema.parse(JSON.parse(manifestRaw));
      if (manifest.id !== entry.name) {
        throw new Error(
          `Template directory ${entry.name} does not match ID ${manifest.id}`,
        );
      }

      const entrypointPath = realpathSync(
        join(templateDir, manifest.entrypoint),
      );
      assertContained(templateDir, entrypointPath);
      const instructions = readFileSync(entrypointPath, "utf-8").trim();

      if (!instructions.length || instructions.length > 10000) {
        throw new AppError(SKILL_ERROR.SKILL_CONTENT_TOO_LARGE, {
          message: `Template ${manifest.id} instructions exceed 10000 characters.`,
        });
      }

      const version = contentHash(
        JSON.stringify({ ...manifest, instructions }),
      );

      const summary: TemplateSummary = {
        id: manifest.id,
        name: manifest.name,
        description: manifest.description,
        version,
      };

      const detail: TemplateDetail = {
        ...summary,
        instructions,
      };

      this.summaries.set(manifest.id, summary);
      this.details.set(manifest.id, detail);
    }
  }

  list(): TemplateSummary[] {
    return Array.from(this.summaries.values(), (summary) => ({ ...summary }));
  }

  read(templateId: string): TemplateDetail {
    if (!templateIdSchema.safeParse(templateId).success) {
      throw new AppError(SKILL_ERROR.TEMPLATE_NOT_FOUND);
    }
    const detail = this.details.get(templateId);
    if (!detail) {
      throw new AppError(SKILL_ERROR.TEMPLATE_NOT_FOUND);
    }
    return { ...detail };
  }
}

let catalogInstance: TemplateCatalog | undefined;

function getCatalog(): TemplateCatalog {
  if (!catalogInstance) {
    catalogInstance = new TemplateCatalog();
  }
  return catalogInstance;
}

export function listTemplates(): TemplateSummary[] {
  return getCatalog().list();
}

export function readTemplate(templateId: string): TemplateDetail {
  return getCatalog().read(templateId);
}
