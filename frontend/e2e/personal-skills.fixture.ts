import type { Page } from "@playwright/test";
import { dashboardFixture } from "./dashboard.fixture";
import type {
  SkillSummary,
  SkillDetail,
  TemplateSummary,
  TemplateDetail,
} from "../src/shared/types/skill";

export interface PersonalSkillsFixtureOptions {
  initialSkills?: SkillDetail[];
  initialTemplates?: TemplateDetail[];
}

export async function personalSkillsFixture(
  page: Page,
  options: PersonalSkillsFixtureOptions = {},
) {
  await dashboardFixture(page);

  const skills: Map<string, SkillDetail> = new Map(
    (options.initialSkills || []).map((s) => [s.id, { ...s }]),
  );

  const templates: Map<string, TemplateDetail> = new Map(
    (
      options.initialTemplates || [
        {
          id: "ielts",
          name: "IELTS",
          description: "Preparation guide for IELTS Speaking and Writing",
          version: "hash-ielts-v1",
          instructions:
            "## IELTS Exam Preparation Guide\n\n1. Coherence & Cohesion\n2. Lexical Resource",
        },
        {
          id: "gym",
          name: "Gym",
          description: "Gym workout routine and nutrition plan",
          version: "hash-gym-v1",
          instructions:
            "## Gym Workout Routine\n\n- Monday: Chest & Triceps\n- Wednesday: Back & Biceps",
        },
      ]
    ).map((t) => [t.id, { ...t }]),
  );

  await page.route("**/api/ai/skill-templates**", async (route) => {
    const url = new URL(route.request().url());
    const pathParts = url.pathname.split("/").filter(Boolean);
    const templateId = pathParts[3]; // /api/ai/skill-templates/:id

    if (templateId && templates.has(templateId)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: templates.get(templateId) }),
      });
      return;
    }

    const summaryList: TemplateSummary[] = Array.from(templates.values()).map(
      (t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        version: t.version,
      }),
    );
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: summaryList }),
    });
  });

  await page.route("**/api/ai/skills/**", async (route) => {
    const url = new URL(route.request().url());
    const pathParts = url.pathname.split("/").filter(Boolean);
    const method = route.request().method();

    if (pathParts[3] === "from-template" && method === "POST") {
      const body = route.request().postDataJSON();
      const template = templates.get(body.templateId);
      if (!template) {
        await route.fulfill({ status: 404 });
        return;
      }

      const newId = `imported-${Date.now()}`;
      const newSkill: SkillDetail = {
        id: newId,
        name: template.name,
        description: template.description,
        instructions: template.instructions,
        enabled: true,
        version: 1,
        sourceTemplateId: template.id,
        sourceTemplateVersion: template.version,
        updatedAt: new Date().toISOString(),
      };
      skills.set(newId, newSkill);
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ data: newSkill }),
      });
      return;
    }

    const skillId = pathParts[3];
    if (skillId) {
      if (method === "GET") {
        const found = skills.get(skillId);
        if (!found) {
          await route.fulfill({ status: 404 });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: found }),
        });
        return;
      }

      if (method === "PUT") {
        const body = route.request().postDataJSON();
        const found = skills.get(skillId);
        if (!found) {
          await route.fulfill({ status: 404 });
          return;
        }

        if (body.expectedVersion !== found.version) {
          await route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({
              error: { code: "SKILL_VERSION_CONFLICT" },
            }),
          });
          return;
        }

        const updated: SkillDetail = {
          ...found,
          name: body.name,
          description: body.description,
          instructions: body.instructions,
          enabled: body.enabled ?? found.enabled,
          version: found.version + 1,
          updatedAt: new Date().toISOString(),
        };
        skills.set(skillId, updated);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: updated }),
        });
        return;
      }

      if (method === "DELETE") {
        const expectedVersion = Number(url.searchParams.get("expectedVersion"));
        const found = skills.get(skillId);
        if (!found) {
          await route.fulfill({ status: 404 });
          return;
        }
        if (expectedVersion !== found.version) {
          await route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({
              error: { code: "SKILL_VERSION_CONFLICT" },
            }),
          });
          return;
        }
        skills.delete(skillId);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: { id: skillId } }),
        });
        return;
      }
    }

    await route.continue();
  });

  await page.route("**/api/ai/skills", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      const summaryList: SkillSummary[] = Array.from(skills.values()).map(
        (s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          enabled: s.enabled,
          version: s.version,
          updatedAt: s.updatedAt,
          sourceTemplateId: s.sourceTemplateId,
          sourceTemplateVersion: s.sourceTemplateVersion,
        }),
      );
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: summaryList }),
      });
      return;
    }

    if (method === "POST") {
      const body = route.request().postDataJSON();
      const newId = `skill-${Date.now()}`;
      const newSkill: SkillDetail = {
        id: newId,
        name: body.name,
        description: body.description,
        instructions: body.instructions,
        enabled: body.enabled ?? true,
        version: 1,
        updatedAt: new Date().toISOString(),
      };
      skills.set(newId, newSkill);
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ data: newSkill }),
      });
      return;
    }

    await route.continue();
  });
  return { skills, templates };
}
