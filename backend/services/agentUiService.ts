import { z } from "zod";
import type { ChatCompletionTool } from "openai/resources/chat/completions.js";
import { A2UI_CONFIG } from "../config/A2UI/a2ui.js";
import {
  UI_SKILL_IDS,
  isUiCompositionEnabled,
  isUiInteractiveEnabled,
} from "../config/A2UI/composition.js";
import type { RequiredSkillDocument } from "../skills/policy.js";
import { SkillError, type SkillRegistry } from "../skills/types.js";
import type { InteractiveSurfaceSpec } from "../types/A2UI/IUiAction.js";
import type { SurfaceSpec, UiSurfaceMode } from "../types/A2UI/IUiSurface.js";
import {
  interactiveSurfaceSpecBaseSchema,
  parseInteractiveSpec,
} from "../validations/A2UI/interactiveUiValidation.js";
import {
  parseSurfaceSpec,
  surfaceSpecBaseSchema,
} from "../validations/A2UI/uiSurfaceValidation.js";

export const MAX_UI_TOOL_ARGUMENT_BYTES = A2UI_CONFIG.MAX_PAYLOAD_BYTES;

export type UiCapability = Readonly<{
  enabled: boolean;
  skillIds: readonly string[];
}>;

const DISABLED_CAPABILITY: UiCapability = Object.freeze({
  enabled: false,
  skillIds: Object.freeze([]),
});

export function resolveUiCapability(registry: SkillRegistry): UiCapability {
  if (!isUiCompositionEnabled()) {
    return DISABLED_CAPABILITY;
  }

  for (const skillId of UI_SKILL_IDS) {
    try {
      registry.read(skillId);
    } catch (error) {
      console.warn({
        event: "ui_capability_disabled_missing_skill",
        skillId,
        code: error instanceof SkillError ? error.code : "SKILL_NOT_FOUND",
      });
      return DISABLED_CAPABILITY;
    }
  }

  return Object.freeze({
    enabled: true,
    skillIds: Object.freeze([...UI_SKILL_IDS]),
  });
}

export function buildUiSkillRequirements(
  registry: SkillRegistry,
  capability: UiCapability,
): ReadonlyMap<string, readonly RequiredSkillDocument[]> {
  if (!capability.enabled || capability.skillIds.length === 0) {
    return new Map();
  }

  const requiredDocs = Object.freeze(
    capability.skillIds.map((skillId) =>
      Object.freeze({
        skillId,
        document: registry.read(skillId).document,
      }),
    ),
  );

  return new Map<string, readonly RequiredSkillDocument[]>([
    ["present_ui", requiredDocs],
    ["present_interactive_ui", requiredDocs],
    ["propose_tasks_presentation", requiredDocs],
  ]);
}

export function formatDeveloperUiSkillContext(
  registry: SkillRegistry,
  capability: UiCapability,
): string {
  if (!capability.enabled || capability.skillIds.length === 0) {
    return "";
  }
  const byId = new Map(registry.list().map((s) => [s.id, s]));
  const summaries = capability.skillIds
    .map((id) => byId.get(id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .map((s) => ({ id: s.id, description: s.description }));

  const interactiveGuidance = isUiInteractiveEnabled()
    ? `\nInteractive task action surfaces (present_interactive_ui) are also enabled for existing owned tasks (currently action "task.complete"). Only use present_interactive_ui when showing or acting on existing tasks—never during task proposals or proposal continuations. Resolve task IDs first via read tools, load the ui-composition skill, and never call task write tools merely to render an interactive Button.`
    : "";

  return `Developer UI composition guidance is enabled. Available code-owned developer UI skills: ${JSON.stringify(summaries)}.
When the user asks for statistics, a summary, a progress report, comparisons, a schedule, or an explanation of a process, proactively consider A2UI if a visual layout makes the answer easier to understand. Do not wait for an explicit request for a chart or dashboard.
When a visual response is useful, call load_skill for the available developer UI skill and read its guidance before calling present_ui or passing presentation to propose_tasks.
Write the user-facing answer in the tool's top-level companionText field. Explain the key takeaway in the user's language and let the visual carry the detail.
Gather the required data before presenting; never invent numbers to create a chart. Use plain text for brief answers or when the user requests text only. Do not ask for permission merely to choose a visual format.${interactiveGuidance}`;
}

const uiCompanionTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(600)
  .describe(
    "One or two natural sentences in the user's language. Answer their question or explain why these tasks fit their request. This appears as chat text above the component. Leave table rows, task lists, and raw dates to the component.",
  );

export const uiCompanionTextParameter = z.toJSONSchema(uiCompanionTextSchema, {
  target: "openapi-3.0",
});

export function readUiCompanionText(input: unknown): string | undefined {
  const parsed = uiCompanionTextSchema.safeParse(input);
  return parsed.success ? parsed.data : undefined;
}

const surfaceSpecJsonSchema = z.toJSONSchema(surfaceSpecBaseSchema) as Record<
  string,
  unknown
>;

export const presentUiTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "present_ui",
    description:
      "Answer in companionText, then present a validated read-only A2UI surface that supports the answer. Ends the turn.",
    parameters: z.toJSONSchema(
      surfaceSpecBaseSchema.extend({ companionText: uiCompanionTextSchema }),
    ),
  },
};

export const presentInteractiveUiTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "present_interactive_ui",
    description:
      "Answer in companionText, then present a validated interactive A2UI surface with bounded task.complete Button controls for existing owned tasks. Does not mutate tasks during generation; ends the turn.",
    parameters: z.toJSONSchema(
      interactiveSurfaceSpecBaseSchema.extend({
        companionText: uiCompanionTextSchema,
      }),
      { unrepresentable: "any" },
    ),
  },
};

export function buildProposeTasksTool(
  baseTool: ChatCompletionTool,
  includePresentation: boolean,
): ChatCompletionTool {
  if (!includePresentation || baseTool.type !== "function") {
    return baseTool;
  }
  const baseParams = (baseTool.function.parameters ?? {}) as {
    type?: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
  return {
    type: "function",
    function: {
      ...baseTool.function,
      parameters: {
        ...baseParams,
        properties: {
          ...(baseParams.properties ?? {}),
          presentation: {
            ...surfaceSpecJsonSchema,
            description:
              "Optional composable A2UI presentation layout containing either TaskProposalForm or TaskList + TaskProposalActions.",
          },
        },
      },
    },
  };
}

export function parseUiToolInput(
  input: unknown,
  mode: UiSurfaceMode,
): SurfaceSpec {
  return parseSurfaceSpec(input, mode);
}

export function parseInteractiveUiToolInput(
  input: unknown,
): InteractiveSurfaceSpec {
  return parseInteractiveSpec(input);
}

export function formatUiValidationIssues(
  error: unknown,
): { path: string; message: string }[] {
  if (error instanceof z.ZodError) {
    return error.issues.slice(0, 10).map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
  }
  return [
    {
      path: "",
      message:
        error instanceof Error ? error.message : "Invalid UI specification",
    },
  ];
}
