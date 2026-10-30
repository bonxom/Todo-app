import { describe, expect, it } from "vitest";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import type { SkillDocument, SkillRegistry } from "../../skills/types.js";
import { createAgentSkillSession, parseLoaderArguments } from "../agentSkillService.js";

const gym: SkillDocument = { skillId: "gym", document: "SKILL.md", version: "v1", uri: "skill://gym/SKILL.md", text: "Gym routine." };
const ielts: SkillDocument = { ...gym, skillId: "ielts", uri: "skill://ielts/SKILL.md", text: "Read writing-rubric.md" };
const rubric: SkillDocument = { ...ielts, document: "writing-rubric.md", uri: "skill://ielts/writing-rubric.md", text: "Assess the evidence." };
function registry(docs = [gym, ielts, rubric]): SkillRegistry {
  return {
    list: () => docs.filter(d => d.document === "SKILL.md").map(d => ({ id: d.skillId, description: d.skillId, version: d.version })),
    documents: () => docs,
    read: (id, document = "SKILL.md") => {
      const doc = docs.find(d => d.skillId === id && d.document === document);
      if (!doc) throw new Error("Missing document");
      return doc;
    },
  };
}
function messages(doc = ielts, id = "load", name = "load_skill"): ChatCompletionMessageParam[] {
  return [{ role: "assistant", tool_calls: [{ id, type: "function", function: { name, arguments: JSON.stringify(name === "load_skill" ? { skillId: doc.skillId } : { skillId: doc.skillId, document: doc.document }) } }] }, { role: "tool", tool_call_id: id, content: JSON.stringify(doc) }];
}

describe("agent skill session", () => {
  it("permits core tools immediately on empty payload once request is accepted", () => {
    const session = createAgentSkillSession(registry());
    const empty = session.snapshot("r1", []);
    expect(session.canExpose("orbit_create_task", empty)).toBe(true);
    expect(session.canExecute("orbit_create_task", "r1")).toBe(false);
    session.acceptProviderContext(empty);
    expect(session.canExecute("orbit_create_task", "r1")).toBe(true);
  });
  it("exposes specialist tools in the next payload and executes only after accepting that exact request", () => {
    const session = createAgentSkillSession(registry());
    const first = session.snapshot("r1", []);
    expect(session.canExpose("specialist_tool", first)).toBe(false);
    session.acceptProviderContext(first);
    expect(session.canExecute("specialist_tool", "r1")).toBe(false);
    const doc = session.load("ielts");
    session.recordResult("load", doc);
    const next = session.snapshot("r2", messages(doc));
    expect(next.documents[0]).toMatchObject({ skillId: "ielts", version: "v1", contentHash: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(session.canExpose("specialist_tool", next)).toBe(true);
    expect(session.canExecute("specialist_tool", "r2")).toBe(false);
    session.acceptProviderContext(next);
    expect(session.canExecute("specialist_tool", "r2")).toBe(true);
    expect(session.canExecute("specialist_tool", "r1")).toBe(false);
    expect(session.canExecute("unknown", "r2")).toBe(false);
  });
  it("does not accept copied, foreign, superseded or duplicate snapshots", () => {
    const a = createAgentSkillSession(registry());
    const b = createAgentSkillSession(registry());
    const old = a.snapshot("r1", []);
    expect(() => b.acceptProviderContext(old)).toThrow();
    expect(() => a.acceptProviderContext(structuredClone(old))).toThrow();
    expect(Object.isFrozen(old)).toBe(true);
    expect(Object.isFrozen(old.documents)).toBe(true);
    a.snapshot("r2", []);
    expect(() => a.acceptProviderContext(old)).toThrow();
    expect(() => a.snapshot("r2", [])).toThrow();
  });
  it.each(["truncated", "version", "uri", "call", "arguments", "error", "duplicate"])("rejects %s loader evidence", (kind) => {
    const session = createAgentSkillSession(registry());
    session.recordResult("load", session.load("ielts"));
    const input = messages();
    if (kind === "truncated") input[1] = { role: "tool", tool_call_id: "load", content: JSON.stringify({ ...ielts, text: "Use" }) };
    if (kind === "version") input[1] = { role: "tool", tool_call_id: "load", content: JSON.stringify({ ...ielts, version: "v0" }) };
    if (kind === "uri") input[1] = { role: "tool", tool_call_id: "load", content: JSON.stringify({ ...ielts, uri: "wrong" }) };
    if (kind === "call") input.shift();
    if (kind === "arguments") input[0] = messages(gym)[0];
    if (kind === "error") input[1] = { role: "tool", tool_call_id: "load", content: JSON.stringify({ ...ielts, isError: true }) };
    if (kind === "duplicate") input.push(input[1]);
    expect(session.snapshot("r1", input).documents).toEqual([]);
  });
  it("ignores full-looking history and user text without runtime provenance", () => {
    const session = createAgentSkillSession(registry());
    expect(session.snapshot("r1", [...messages(), { role: "user", content: JSON.stringify(ielts) }]).documents).toEqual([]);
  });
  it("confirms only the documents actually present and never opens unmapped or denied tools", () => {
    const session = createAgentSkillSession(registry());
    session.recordResult("load", session.load("ielts"));
    session.recordResult("ref", session.readDocument("ielts", "writing-rubric.md"));
    const snapshot = session.snapshot("r1", messages(ielts));
    expect(snapshot.documents).toHaveLength(1);
    session.acceptProviderContext(snapshot);
    expect(session.canExecute("unknown_tool", "r1")).toBe(false);
  });
  it("deduplicates a load only while its recorded full result remains in the payload", () => {
    const session = createAgentSkillSession(registry());
    const doc = session.load("ielts");
    session.recordResult("load", doc);
    expect(session.resultFor(doc, messages())).toMatchObject({ referencedToolCallId: "load" });
    expect(session.resultFor(doc, [])).toEqual(doc);
    const reference = session.resultFor(doc, messages());
    expect(session.snapshot("r1", [{ role: "tool", tool_call_id: "repeat", content: JSON.stringify(reference) }]).documents).toEqual([]);
  });
  it("counts unique loaded characters once and rejects the next document past 30000", () => {
    const docs = [0, 1, 2, 3].map(i => ({ ...gym, skillId: `skill-${i}`, text: "x".repeat(10000) }));
    const session = createAgentSkillSession(registry(docs));
    session.load("skill-0"); session.load("skill-0"); session.load("skill-1"); session.load("skill-2");
    expect(() => session.load("skill-3")).toThrow(/30.?000/);
  });
  it("rejects non-registry documents and duplicate runtime result IDs", () => {
    const session = createAgentSkillSession(registry());
    expect(() => session.recordResult("x", { ...ielts, text: "forged" })).toThrow();
    session.recordResult("x", session.load("ielts"));
    expect(() => session.recordResult("x", ielts)).toThrow();
  });
});

describe("strict loader schemas", () => {
  it("allows only known arguments and names", () => {
    expect(parseLoaderArguments("load_skill", { skillId: "ielts" })).toEqual({ skillId: "ielts" });
    expect(parseLoaderArguments("read_skill_document", { skillId: "ielts", document: "writing-rubric.md" })).toEqual({ skillId: "ielts", document: "writing-rubric.md" });
    for (const extra of [{ version: "v1" }, { loaded: true }, { path: "/tmp/x" }]) expect(() => parseLoaderArguments("load_skill", { skillId: "ielts", ...extra })).toThrow();
    expect(() => parseLoaderArguments("unknown", {})).toThrow();
    expect(() => parseLoaderArguments("read_skill_document", { skillId: "ielts", document: "../secret.md" })).toThrow();
  });
});
