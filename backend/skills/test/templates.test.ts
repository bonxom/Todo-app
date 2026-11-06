import {
  readFileSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import {
  TemplateCatalog,
  listTemplates,
  readTemplate,
} from "../templates/registry.js";
import { personalSkillService } from "../../services/personalSkillService.js";
import { userSkillRepository } from "../../repositories/userSkillRepository.js";
import { AppError } from "../../error/AppError.js";
import { SKILL_ERROR } from "../../error/definitions/skillErrors.js";
import type { IUserSkill } from "../../types/IUserSkill.js";

vi.mock("../../repositories/userSkillRepository.js", () => ({
  userSkillRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
}));

describe("Template Registry & Import Tests", () => {
  const userId = new mongoose.Types.ObjectId().toString();

  it("lists available templates with stable hash and valid metadata", () => {
    const templates = listTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(2);

    const ielts = templates.find((t) => t.id === "ielts");
    const gym = templates.find((t) => t.id === "gym");

    expect(ielts).toBeDefined();
    expect(ielts?.name).toBe("IELTS");
    expect(ielts?.version).toMatch(/^[a-f0-9]{64}$/);

    expect(gym).toBeDefined();
    expect(gym?.name).toBe("Gym Routine");
    expect(gym?.version).toMatch(/^[a-f0-9]{64}$/);
  });

  it("reads IELTS template with combined rubrics and <= 10000 characters", () => {
    const ielts = readTemplate("ielts");
    expect(ielts.instructions).toContain("Writing Feedback Reference");
    expect(ielts.instructions).toContain("Speaking Feedback Reference");
    expect(ielts.instructions.length).toBeLessThanOrEqual(10000);
  });

  it("reads Gym template with <= 10000 characters", () => {
    const gym = readTemplate("gym");
    expect(gym.instructions).toContain("Gym planning");
    expect(gym.instructions.length).toBeLessThanOrEqual(10000);
  });

  it("rejects path traversal attempts on template reading", () => {
    expect(() => readTemplate("../ielts")).toThrow();
    expect(() => readTemplate("..")).toThrow();
    expect(() => readTemplate("/etc/passwd")).toThrow();
  });

  it("throws 404 TEMPLATE_NOT_FOUND for non-existent template", () => {
    expect(() => readTemplate("non-existent-template")).toThrow(
      expect.objectContaining({
        code: SKILL_ERROR.TEMPLATE_NOT_FOUND.code,
        statusCode: 404,
      }),
    );
  });

  it("imports an independent user copy from template", async () => {
    const template = readTemplate("ielts");

    const mockCreatedSkill: IUserSkill = {
      _id: "c9b74052-1234-4567-89ab-cdef01234567",
      userId: new mongoose.Types.ObjectId(userId),
      name: template.name,
      description: template.description,
      instructions: template.instructions,
      enabled: true,
      version: 1,
      sourceTemplateId: template.id,
      sourceTemplateVersion: template.version,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(userSkillRepository.create).mockResolvedValue(mockCreatedSkill);

    const copy = await personalSkillService.importTemplate(
      userId,
      "ielts",
      template.version,
    );

    expect(copy.sourceTemplateId).toBe("ielts");
    expect(copy.sourceTemplateVersion).toBe(template.version);
    expect(copy.id).not.toBe("ielts");
    expect(copy.instructions.length).toBeLessThanOrEqual(10000);
    expect(userSkillRepository.create).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        name: template.name,
        sourceTemplateId: "ielts",
        sourceTemplateVersion: template.version,
      }),
    );
  });

  it("throws 409 TEMPLATE_VERSION_CONFLICT on stale expectedTemplateVersion", async () => {
    await expect(
      personalSkillService.importTemplate(userId, "ielts", "outdated-version"),
    ).rejects.toThrow(
      expect.objectContaining({
        code: SKILL_ERROR.TEMPLATE_VERSION_CONFLICT.code,
        statusCode: 409,
      }),
    );
  });

  it("allows duplicate explicit imports as distinct copies", async () => {
    const template = readTemplate("gym");

    const firstCopy: IUserSkill = {
      _id: "first-uuid-1111",
      userId: new mongoose.Types.ObjectId(userId),
      name: template.name,
      description: template.description,
      instructions: template.instructions,
      enabled: true,
      version: 1,
      sourceTemplateId: template.id,
      sourceTemplateVersion: template.version,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const secondCopy: IUserSkill = {
      _id: "second-uuid-2222",
      userId: new mongoose.Types.ObjectId(userId),
      name: template.name,
      description: template.description,
      instructions: template.instructions,
      enabled: true,
      version: 1,
      sourceTemplateId: template.id,
      sourceTemplateVersion: template.version,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(userSkillRepository.create)
      .mockResolvedValueOnce(firstCopy)
      .mockResolvedValueOnce(secondCopy);

    const copy1 = await personalSkillService.importTemplate(
      userId,
      "gym",
      template.version,
    );
    const copy2 = await personalSkillService.importTemplate(
      userId,
      "gym",
      template.version,
    );

    expect(copy1.id).not.toBe(copy2.id);
    expect(copy1.name).toBe(copy2.name);
  });
});

it("hashes metadata changes and rejects symlinked template documents", () => {
  const root = mkdtempSync(join(tmpdir(), "personal-template-review-"));
  try {
    mkdirSync(join(root, "sample"));
    const manifest = {
      id: "sample",
      name: "Sample",
      description: "Original description",
      entrypoint: "SKILL.md",
    };
    writeFileSync(join(root, "sample/manifest.json"), JSON.stringify(manifest));
    writeFileSync(join(root, "sample/SKILL.md"), "Instructions");
    const first = new TemplateCatalog(root).read("sample");
    writeFileSync(
      join(root, "sample/manifest.json"),
      JSON.stringify({ ...manifest, description: "New meaning" }),
    );
    expect(new TemplateCatalog(root).read("sample").version).not.toBe(
      first.version,
    );
    rmSync(join(root, "sample/SKILL.md"));
    writeFileSync(join(root, "outside.md"), "Outside the template directory");
    symlinkSync(join(root, "outside.md"), join(root, "sample/SKILL.md"));
    expect(() => new TemplateCatalog(root)).toThrow(
      "Template path traversal rejected",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

it("keeps the template rubric guidance aligned with MCP compatibility documents", () => {
  const ielts = readTemplate("ielts");
  for (const file of ["writing-rubric.md", "speaking-rubric.md"]) {
    const source = readFileSync(
      new URL(`../content/ielts/${file}`, import.meta.url),
      "utf8",
    );
    const body = source.trim().split("\n\n").slice(2).join("\n\n");
    expect(ielts.instructions).toContain(body);
  }
  expect(readTemplate("gym").instructions).toBe(
    readFileSync(
      new URL("../content/gym/SKILL.md", import.meta.url),
      "utf8",
    ).trim(),
  );
});
