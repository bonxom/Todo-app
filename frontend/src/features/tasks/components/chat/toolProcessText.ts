import type { TFunction } from "i18next";
import type { ToolProgress } from "@/shared/types/chatStream";

const KNOWN_TOOL_KEY_MAP: Record<string, string> = {
  orbit_list_tasks: "orbit_list_tasks",
  orbit_get_task: "orbit_get_task",
  orbit_create_task: "orbit_create_task",
  orbit_update_task: "orbit_update_task",
  orbit_delete_task: "orbit_delete_task",
  orbit_list_categories: "orbit_list_categories",
  orbit_list_projects: "orbit_list_projects",
  orbit_get_me: "orbit_get_me",
  orbit_web_search: "orbit_web_search",
  propose_tasks: "propose_tasks",
  present_ui: "present_ui",
  analyze_image: "analyze_image",
  load_skill: "skill",
  read_skill_document: "skill",
  list_skills: "skill",
  read_skill: "skill",
  grill_user: "grill_user",
};

export interface FormattedToolStep {
  primary: string;
  detail?: string;
}

export function formatToolProcessStep(
  tool: ToolProgress,
  t: TFunction<"agent">,
): FormattedToolStep {
  const toolKey = tool.toolName
    ? (KNOWN_TOOL_KEY_MAP[tool.toolName] ?? "default")
    : undefined;

  if (toolKey) {
    if (tool.status === "started") {
      return {
        primary: t(`toolSteps.${toolKey}.running`, {
          defaultValue: t("toolSteps.default.running"),
        }),
      };
    }
    if (tool.status === "succeeded") {
      return {
        primary: t(`toolSteps.${toolKey}.succeeded`, {
          defaultValue: t("toolSteps.default.succeeded"),
        }),
      };
    }
    if (tool.status === "failed") {
      return {
        primary: t(`toolSteps.${toolKey}.failed`, {
          defaultValue: t("toolSteps.default.failed"),
        }),
      };
    }
    return {
      primary: t("toolSteps.default.unknown"),
    };
  }

  return {
    primary: tool.label || t("processingTask"),
    ...(tool.summary ? { detail: tool.summary } : {}),
  };
}
