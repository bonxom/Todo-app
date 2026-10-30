import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
const completion = vi.hoisted(() => vi.fn());
vi.mock("../../libs/aiClient.js", () => ({ getAiClient: () => ({ chat: { completions: { create: completion } } }) }));
vi.mock("../../config/env.js", () => ({ getAiModel: () => "test" }));
import { agentService } from "../agentService.js";
import { categoryService } from "../categoryService.js";
import * as policy from "../../skills/policy.js";
import type { McpContext } from "../../mcp/context.js";
const context = { user: { _id: "507f1f77bcf86cd799439011", role: "USER" }, requestId: "skills-test" } as unknown as McpContext;
const call = (id: string, name: string, args: unknown = {}) => ({ id, type: "function", function: { name, arguments: JSON.stringify(args) } });
const response = (...calls: unknown[]) => ({ choices: [{ message: { role: "assistant", content: null, tool_calls: calls } }] });
const load = () => response(call("load", "load_skill", { skillId: "ielts" }));
const done = { choices: [{ message: { role: "assistant", content: "Done" } }] };
const toolNames = (payload: { tools: { function: { name: string } }[] }) => payload.tools.map(t => t.function.name);
const results = (messages: ChatCompletionMessageParam[]) => messages.filter(m => m.role === "tool").map(m => JSON.parse(m.content as string));
afterEach(() => { completion.mockReset(); vi.restoreAllMocks(); });
describe("request-bound skill gate", () => {
  it("exposes core tools immediately and executes direct business calls without requiring load_skill", async () => {
    const read = vi.spyOn(categoryService, "getAll").mockResolvedValue([]);
    completion.mockImplementationOnce(async payload => {
      expect(toolNames(payload)).toContain("load_skill");
      expect(toolNames(payload)).toContain("read_skill_document");
      expect(toolNames(payload)).toContain("orbit_list_categories");
      return response(call("read", "orbit_list_categories"));
    }).mockResolvedValueOnce(done);
    expect(await agentService.chatWithMcp("List", context)).toBe("Done");
    expect(read).toHaveBeenCalledOnce();
    expect(completion.mock.calls[0][0].messages).toHaveLength(2);
    expect(completion.mock.calls[1][0].messages).toHaveLength(4);
  });
  it("exposes specialist tools only after their required skill is loaded", async () => {
    vi.spyOn(policy, "requiredSkillDocuments").mockImplementation(name => name === "orbit_list_categories" ? [{ skillId: "ielts", document: "SKILL.md" }] : undefined);
    const read = vi.spyOn(categoryService, "getAll").mockResolvedValue([]);
    completion.mockImplementationOnce(async payload => {
      expect(toolNames(payload)).toEqual(["load_skill", "read_skill_document"]);
      return load();
    }).mockImplementationOnce(async payload => {
      expect(read).not.toHaveBeenCalled();
      expect(toolNames(payload)).toContain("orbit_list_categories");
      expect(results(payload.messages).some(r => r.text?.includes("IELTS practice"))).toBe(true);
      return response(call("read", "orbit_list_categories"));
    }).mockResolvedValueOnce(done);
    expect(await agentService.chatWithMcp("List", context)).toBe("Done");
    expect(read).toHaveBeenCalledOnce();
  });
  it("blocks fabricated/direct and same-batch calls for tools requiring a skill, permitting a new call next response", async () => {
    vi.spyOn(policy, "requiredSkillDocuments").mockImplementation(name => name === "orbit_list_categories" ? [{ skillId: "ielts", document: "SKILL.md" }] : undefined);
    const read = vi.spyOn(categoryService, "getAll").mockResolvedValue([]);
    completion.mockResolvedValueOnce(response(call("early", "orbit_list_categories"), call("load", "load_skill", { skillId: "ielts" }), call("same", "orbit_list_categories")))
      .mockImplementationOnce(async payload => {
        expect(read).not.toHaveBeenCalled();
        expect(results(payload.messages).filter(r => r.code === "SKILL_REQUIRED")).toHaveLength(2);
        return response(call("allowed", "orbit_list_categories"));
      }).mockResolvedValueOnce(done);
    await agentService.chatWithMcp("List", context);
    expect(read).toHaveBeenCalledOnce();
  });
  it("does not trust prior-turn loader history for tools requiring a skill", async () => {
    vi.spyOn(policy, "requiredSkillDocuments").mockImplementation(name => name === "orbit_list_categories" ? [{ skillId: "ielts", document: "SKILL.md" }] : undefined);
    let history: ChatCompletionMessageParam[] = [];
    completion.mockResolvedValueOnce(load()).mockResolvedValueOnce(done);
    await agentService.chatWithMcp("Load", context, { checkpoint: async m => { history = structuredClone(m); } });
    completion.mockResolvedValueOnce(response(call("read", "orbit_list_categories"))).mockImplementationOnce(async payload => {
      expect(results(payload.messages).at(-1)).toMatchObject({ code: "SKILL_REQUIRED", executed: false });
      return done;
    });
    const read = vi.spyOn(categoryService, "getAll").mockResolvedValue([]);
    await agentService.chatWithMcp("Again", context, { history });
    expect(read).not.toHaveBeenCalled();
  });
  it("does not dispatch if assistant checkpoint fails", async () => {
    const read = vi.spyOn(categoryService, "getAll").mockResolvedValue([]);
    completion.mockResolvedValueOnce(response(call("read", "orbit_list_categories")));
    await expect(agentService.chatWithMcp("List", context, { checkpoint: async m => {
      if (m.some(x => x.role === "assistant" && x.tool_calls?.some(t => t.id === "read"))) throw new Error("checkpoint failed");
    } })).rejects.toThrow("checkpoint failed");
    expect(read).not.toHaveBeenCalled();
  });
  it.each(["orbit_not_real", "orbit_create_task"])("blocks unknown or ungranted %s", async name => {
    completion.mockResolvedValueOnce(response(call("denied", name))).mockImplementationOnce(async payload => {
      expect(results(payload.messages).at(-1)).toMatchObject({ code: "TOOL_NOT_ALLOWED", executed: false });
      return done;
    });
    await agentService.chatWithMcp("Act", context);
  });
  it("counts each attempt and produces a result for the entire oversized batch", async () => {
    const read = vi.spyOn(categoryService, "getAll").mockResolvedValue([]);
    completion.mockResolvedValueOnce(response(...Array.from({ length: 42 }, (_, i) => call(`read-${i}`, "orbit_list_categories")))).mockImplementationOnce(async payload => {
      expect(payload.tool_choice).toBe("none");
      expect(results(payload.messages)).toHaveLength(42);
      expect(results(payload.messages).filter(r => r.code === "TOOL_CALL_LIMIT_EXCEEDED")).toHaveLength(2);
      return done;
    });
    await agentService.chatWithMcp("List", context);
    expect(read).toHaveBeenCalledTimes(40);
  });
  it("rejects duplicate IDs before any dispatch", async () => {
    const read = vi.spyOn(categoryService, "getAll").mockResolvedValue([]);
    completion.mockResolvedValueOnce(response(call("duplicate", "orbit_list_categories"), call("duplicate", "orbit_list_categories")));
    await expect(agentService.chatWithMcp("List", context)).rejects.toThrow();
    expect(read).not.toHaveBeenCalled();
  });
  it("records metrics once even when provider fails", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    completion.mockRejectedValueOnce(new Error("provider down"));
    await expect(agentService.chatWithMcp("Hi", context)).rejects.toThrow();
    expect(log.mock.calls.filter(([entry]) => entry.event === "agent_turn_metrics")).toHaveLength(1);
  });
});
