import { randomUUID } from "node:crypto";
import {
  UI_INTERACTIVE_CATALOG_ID,
  type InteractiveSurfaceSpec,
  type InteractiveUiNode,
  type StoredInteractiveSurface,
  type UiActionBinding,
} from "../../types/A2UI/IUiAction.js";
import type { UiSurfaceEnvelope } from "../../types/A2UI/IUiSurface.js";
import type { IUserDocument } from "../../types/IUser.js";
import {
  parseInteractiveSpec,
  parseInteractiveSurfaceEnvelope,
  storedInteractiveSurfaceSchema,
} from "../../validations/A2UI/interactiveUiValidation.js";
import { taskService } from "../taskService.js";
import { compilePresentationNode } from "./uiSurfaceService.js";

function compileInteractiveNode(
  node: InteractiveUiNode,
  bindingByKey: ReadonlyMap<string, UiActionBinding>,
): Record<string, unknown> {
  if (node.component === "Button") {
    const binding = bindingByKey.get(node.actionKey);
    if (!binding) {
      throw new Error(`Missing action binding for '${node.actionKey}'`);
    }
    return {
      id: node.id,
      component: "Button",
      label: node.label,
      action: {
        event: {
          name: "dispatch",
          context: {
            actionId: binding.id,
          },
        },
      },
      actionState: {
        path: `/actionState/${node.actionKey}`,
      },
    };
  }
  return compilePresentationNode(node);
}

export const interactiveUiService = {
  async prepare(
    spec: InteractiveSurfaceSpec,
    user: IUserDocument,
    surfaceId = randomUUID(),
  ): Promise<StoredInteractiveSurface> {
    const parsed = parseInteractiveSpec(spec);
    const uniqueTaskIds = [
      ...new Set(Object.values(parsed.actions).map((a) => a.taskId)),
    ];

    await Promise.all(
      uniqueTaskIds.map((taskId) => taskService.getReadableById(taskId, user)),
    );

    const actionBindings: UiActionBinding[] = Object.entries(
      parsed.actions,
    ).map(([key, action]) => ({
      id: randomUUID(),
      key,
      name: action.name,
      taskId: action.taskId,
    }));

    return storedInteractiveSurfaceSchema.parse({
      catalogId: UI_INTERACTIVE_CATALOG_ID,
      surfaceId,
      spec: parsed,
      actionBindings,
    });
  },

  compile(stored: StoredInteractiveSurface): UiSurfaceEnvelope {
    const validated = storedInteractiveSurfaceSchema.parse(stored);
    const bindingByKey = new Map(
      validated.actionBindings.map((binding) => [binding.key, binding]),
    );
    const compiledComponents = validated.spec.components.map((node) =>
      compileInteractiveNode(node, bindingByKey),
    );
    const actionState = Object.fromEntries(
      validated.actionBindings.map((binding) => [
        binding.key,
        {
          status: "loading" as const,
          disabled: true,
        },
      ]),
    );

    const envelope: UiSurfaceEnvelope = {
      text: validated.spec.fallbackText,
      a2ui: {
        protocolVersion: "v0.9",
        catalogId: UI_INTERACTIVE_CATALOG_ID,
        surfaceId: validated.surfaceId,
        messages: [
          {
            version: "v0.9",
            createSurface: {
              surfaceId: validated.surfaceId,
              catalogId: UI_INTERACTIVE_CATALOG_ID,
            },
          },
          {
            version: "v0.9",
            updateComponents: {
              surfaceId: validated.surfaceId,
              components: compiledComponents,
            },
          },
          {
            version: "v0.9",
            updateDataModel: {
              surfaceId: validated.surfaceId,
              path: "/",
              value: {
                display: validated.spec.displayData,
                actionState,
              },
            },
          },
        ],
      },
    };

    return parseInteractiveSurfaceEnvelope(envelope);
  },
};
