import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import { isTaskProposalsEnabled } from "../../config/A2UI/a2ui.js";
import {
  UI_SKILL_IDS,
  isUiCompositionEnabled,
} from "../../config/A2UI/composition.js";
import { getSkillRegistry } from "../../skills/registry.js";
import { SkillError, type SkillRegistry } from "../../skills/types.js";
import { createAgentSkillSession } from "../agentSkillService.js";
import {
  buildUiSkillRequirements,
  formatDeveloperUiSkillContext,
  parseUiToolInput,
  presentUiTool,
  resolveUiCapability,
} from "../agentUiService.js";

describe("agentUiCapability", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("defaults A2UI_COMPOSITION_ENABLED and A2UI_TASK_PROPOSALS_ENABLED to true", () => {
    vi.stubEnv("A2UI_COMPOSITION_ENABLED", undefined);
    vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", undefined);
    expect(isUiCompositionEnabled()).toBe(true);
    expect(isTaskProposalsEnabled()).toBe(true);
    expect(UI_SKILL_IDS).toEqual(["ui-composition"]);
  });

  it("evaluates all flag combinations independently", async () => {
    const registry = await getSkillRegistry();

    for (const [compEnv, propEnv, expectedComp, expectedProp] of [
      ["false", "false", false, false],
      ["false", "true", false, true],
      ["true", "false", true, false],
      ["true", "true", true, true],
    ] as const) {
      vi.stubEnv("A2UI_COMPOSITION_ENABLED", compEnv);
      vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", propEnv);
      const capability = resolveUiCapability(registry);
      expect(capability.enabled).toBe(expectedComp);
      expect(capability.skillIds).toEqual(
        expectedComp ? ["ui-composition"] : [],
      );
      expect(isTaskProposalsEnabled()).toBe(expectedProp);
    }
  });

  it("disables UI capability and emits bounded diagnostic when configured skill is missing", () => {
    vi.stubEnv("A2UI_COMPOSITION_ENABLED", "true");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const emptyRegistry: SkillRegistry = {
      list: () => [],
      documents: () => [],
      read: (skillId: string) => {
        throw new SkillError(
          "SKILL_NOT_FOUND",
          `Unknown skill: ${skillId} at /secret/internal/path`,
        );
      },
    };

    const capability = resolveUiCapability(emptyRegistry);
    expect(capability).toEqual({ enabled: false, skillIds: [] });
    expect(warn).toHaveBeenCalledOnce();
    const diagnostic = warn.mock.calls[0][0];
    expect(diagnostic).toEqual({
      event: "ui_capability_disabled_missing_skill",
      skillId: "ui-composition",
      code: "SKILL_NOT_FOUND",
    });
    expect(JSON.stringify(diagnostic)).not.toContain("/secret/internal/path");
  });

  it("enforces provider-context evidence for present_ui and preserves existing policy", async () => {
    vi.stubEnv("A2UI_COMPOSITION_ENABLED", "true");
    const registry = await getSkillRegistry();
    const capability = resolveUiCapability(registry);
    const requirements = buildUiSkillRequirements(registry, capability);
    const session = createAgentSkillSession(registry, requirements);

    const requestIdWithoutDocument = "req-without-doc";
    const initialMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: "System" },
      { role: "user", content: "Create a study table" },
    ];
    const snapWithout = session.snapshot(
      requestIdWithoutDocument,
      initialMessages,
    );
    expect(session.canExpose("present_ui", snapWithout)).toBe(false);
    session.acceptProviderContext(snapWithout);
    expect(session.canExecute("present_ui", requestIdWithoutDocument)).toBe(
      false,
    );

    // Load the ui-composition skill and record the loader exchange in provider messages
    const doc = session.load("ui-composition");
    session.recordResult("call_ui_skill", doc);
    const messagesWithDoc: ChatCompletionMessageParam[] = [
      ...initialMessages,
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_ui_skill",
            type: "function",
            function: {
              name: "load_skill",
              arguments: JSON.stringify({ skillId: "ui-composition" }),
            },
          },
        ],
      },
      {
        role: "tool",
        tool_call_id: "call_ui_skill",
        content: JSON.stringify(doc),
      },
    ];

    const requestIdWithDocument = "req-with-doc";
    const snapWith = session.snapshot(requestIdWithDocument, messagesWithDoc);
    expect(session.canExpose("present_ui", snapWith)).toBe(true);
    session.acceptProviderContext(snapWith);

    expect(session.canExecute("present_ui", requestIdWithoutDocument)).toBe(
      false,
    );
    expect(session.canExecute("present_ui", requestIdWithDocument)).toBe(true);

    // Cannot weaken existing specialist_tool policy with empty per-session requirements
    const attemptWeaken = createAgentSkillSession(
      registry,
      new Map([["specialist_tool", []]]),
    );
    const weakenSnap = attemptWeaken.snapshot("req-weaken", initialMessages);
    attemptWeaken.acceptProviderContext(weakenSnap);
    expect(attemptWeaken.canExecute("specialist_tool", "req-weaken")).toBe(
      false,
    );
  });

  it("supplies versioned catalog schema in presentUiTool parameters and formats developer skill summary", async () => {
    vi.stubEnv("A2UI_COMPOSITION_ENABLED", "true");
    const registry = await getSkillRegistry();
    const capability = resolveUiCapability(registry);
    const contextText = formatDeveloperUiSkillContext(registry, capability);

    expect(contextText).toContain("ui-composition");
    expect(contextText).toContain("proactively consider A2UI");
    expect(contextText).toContain("statistics, a summary, a progress report");
    expect(contextText).toContain("never invent numbers");
    expect(contextText).toContain("Do not ask for permission");
    expect(presentUiTool.type).toBe("function");
    if (presentUiTool.type === "function") {
      expect(presentUiTool.function.name).toBe("present_ui");
      const schemaStr = JSON.stringify(presentUiTool.function.parameters);
      expect(schemaStr).toContain("fallbackText");
      expect(schemaStr).toContain("components");
      expect(schemaStr).toContain("displayData");
      expect(schemaStr).toContain("Column");
      expect(schemaStr).toContain("Table");
    }

    // Verify all JSON examples in SKILL.md are valid against Task 1 schemas
    const skillDoc = registry.read("ui-composition");
    expect(skillDoc.text).toContain("## 1. Choose the response mode");
    expect(skillDoc.text).toContain("## 3. How to select components");
    expect(skillDoc.text).toContain("### Common patterns");
    const jsonBlocks = [
      ...skillDoc.text.matchAll(/```json\r?\n([\s\S]*?)```/g),
    ].map((m) => JSON.parse(m[1]));
    expect(jsonBlocks).toHaveLength(3);
    expect(() => parseUiToolInput(jsonBlocks[0], "readonly")).not.toThrow();
    expect(Array.isArray(jsonBlocks[1].items)).toBe(true);
    expect(jsonBlocks[1].presentation).toBeUndefined();
    expect(() =>
      parseUiToolInput(jsonBlocks[2].presentation, "proposal"),
    ).not.toThrow();
  });
});
