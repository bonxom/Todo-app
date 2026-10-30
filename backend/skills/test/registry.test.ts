import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { getSkillRegistry, loadSkillRegistry } from "../registry.js";

const roots: string[] = [];
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "orbit-skills-"));
  roots.push(root);
  return root;
}
async function skill(root: string, id = "demo", documents: Record<string, string> = { "SKILL.md": "# Demo" }, overrides: Record<string, unknown> = {}) {
  const dir = join(root, id);
  await mkdir(dir, { recursive: true });
  for (const [path, text] of Object.entries(documents)) {
    await mkdir(join(dir, path, ".."), { recursive: true });
    await writeFile(join(dir, path), text);
  }
  await writeFile(join(dir, "manifest.json"), JSON.stringify({ id, description: "Demo skill", entrypoint: "SKILL.md", documents: Object.keys(documents), ...overrides }));
  return dir;
}
const load = (root: string) => loadSkillRegistry(pathToFileURL(`${root}/`));
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe("skill registry", () => {
  it("discovers skills and returns complete immutable snapshots", async () => {
    const root = await fixture();
    await skill(root);
    const registry = await load(root);
    expect(registry.list()).toEqual([{ id: "demo", description: "Demo skill", version: expect.stringMatching(/^[a-f0-9]{64}$/) }]);
    const doc = registry.read("demo");
    expect(doc).toMatchObject({ skillId: "demo", document: "SKILL.md", text: "# Demo", uri: "skill://demo/SKILL.md" });
    expect(Object.isFrozen(doc)).toBe(true);
    registry.list().pop();
    registry.documents().pop();
    expect(registry.documents()).toHaveLength(1);
    await writeFile(join(root, "demo", "SKILL.md"), "Changed");
    expect(registry.read("demo").text).toBe("# Demo");
  });
  it("distinguishes unknown skills and documents without allowing arbitrary paths", async () => {
    const root = await fixture(); await skill(root); const registry = await load(root);
    expect(() => registry.read("missing")).toThrow(expect.objectContaining({ code: "SKILL_NOT_FOUND" }));
    for (const name of ["missing.md", "../../.env", "/etc/passwd", "../demo/SKILL.md"]) {
      expect(() => registry.read("demo", name)).toThrow(expect.objectContaining({ code: "SKILL_DOCUMENT_NOT_FOUND" }));
    }
  });
  it("hashes normalized manifests and reference contents deterministically", async () => {
    const root = await fixture();
    await skill(root, "demo", { "SKILL.md": "Main", "reference.md": "Ref" });
    const original = (await load(root)).read("demo").version;
    await skill(root, "demo", { "reference.md": "Ref", "SKILL.md": "Main" });
    expect((await load(root)).read("demo").version).toBe(original);
    await skill(root, "demo", { "reference.md": "Changed", "SKILL.md": "Main" });
    expect((await load(root)).read("demo").version).not.toBe(original);
    await skill(root, "demo", { "other.md": "Ref", "SKILL.md": "Main" });
    expect((await load(root)).read("demo").version).not.toBe(original);
  });
  it.each([
    { id: "different" }, { description: " " }, { extra: true },
    { documents: ["SKILL.md", "SKILL.md"] }, { entrypoint: "other.md" },
    { documents: ["../outside.md", "SKILL.md"] }, { documents: ["/outside.md", "SKILL.md"] },
    { documents: ["nested/../SKILL.md", "SKILL.md"] }, { documents: ["a\\b.md", "SKILL.md"] },
    { documents: ["./SKILL.md", "SKILL.md"] }, { documents: ["a//b.md", "SKILL.md"] },
    { documents: ["code.ts", "SKILL.md"] },
  ])("fails closed for invalid manifest %j", async (overrides) => {
    const root = await fixture(); await skill(root, "demo", undefined, overrides);
    await expect(load(root)).rejects.toThrow(expect.objectContaining({ code: "SKILL_REGISTRY_INVALID" }));
  });
  it("rejects duplicate manifest IDs and missing files", async () => {
    const root = await fixture(); await skill(root); await skill(root, "other", undefined, { id: "demo" });
    await expect(load(root)).rejects.toThrow();
    await rm(join(root, "other"), { recursive: true });
    await rm(join(root, "demo", "SKILL.md"));
    await expect(load(root)).rejects.toThrow(expect.objectContaining({ code: "SKILL_REGISTRY_INVALID" }));
  });
  it("rejects skill directory symlinks outside root", async () => {
    const root = await fixture(); const outside = await fixture(); await skill(outside);
    await symlink(join(outside, "demo"), join(root, "demo"));
    await expect(load(root)).rejects.toThrow();
  });
  it("rejects document symlinks outside the skill, including cross-skill targets", async () => {
    const root = await fixture(); await skill(root); await skill(root, "other");
    await rm(join(root, "demo", "SKILL.md"));
    await symlink(join(root, "other", "SKILL.md"), join(root, "demo", "SKILL.md"));
    await expect(load(root)).rejects.toThrow();
  });
  it("enforces exact document length boundary without imposing turn limits on the catalog", async () => {
    const root = await fixture(); await skill(root, "demo", { "SKILL.md": "x".repeat(10_000), "a.md": "a".repeat(10_000), "b.md": "b".repeat(10_000), "c.md": "c".repeat(10_000) });
    expect((await load(root)).documents()).toHaveLength(4);
    await writeFile(join(root, "demo", "SKILL.md"), "x".repeat(10_001));
    await expect(load(root)).rejects.toThrow(expect.objectContaining({ code: "SKILL_CONTENT_TOO_LARGE" }));
  });
  it("loads repository content independently of cwd and covers advisory references", async () => {
    const before = process.cwd();
    try {
      process.chdir(tmpdir());
      const registry = await getSkillRegistry();
      expect(registry.list().map((s) => s.id)).toEqual(["gym", "ielts"]);
      expect(registry.read("gym").text).toContain("Gym planning");
      expect(registry.read("ielts").text).toContain("writing-rubric.md");
      expect(registry.read("ielts", "speaking-rubric.md").text).toContain("https://ielts.org/");
      expect(registry.documents()).toHaveLength(4);
    } finally { process.chdir(before); }
  });
});
