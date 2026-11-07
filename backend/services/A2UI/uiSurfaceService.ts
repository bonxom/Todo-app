import type { ProposalView } from "../../types/A2UI/ITaskProposal.js";
import {
  UI_COMPOSITION_CATALOG_ID,
  type StoredUiSurface,
  type UiNode,
  type UiSurfaceEnvelope,
} from "../../types/A2UI/IUiSurface.js";
import { proposalViewSchema } from "../../validations/A2UI/a2uiValidation.js";
import {
  parseSurfaceSpec,
  parseUiSurfaceEnvelope,
  storedUiSurfaceSchema,
} from "../../validations/A2UI/uiSurfaceValidation.js";

const buildProposalEvent = (name: "save" | "confirm" | "cancel") => ({
  event: {
    name,
    context: {
      proposal: { path: "/proposal" as const },
      requestId: { path: "/requestId" as const },
    },
  },
});

function compileNode(node: UiNode): Record<string, unknown> {
  switch (node.component) {
    case "Column":
    case "Row":
      return {
        id: node.id,
        component: node.component,
        children: node.children,
        gap: node.gap,
      };
    case "Card":
      return {
        id: node.id,
        component: "Card",
        children: node.children,
      };
    case "Text":
      return {
        id: node.id,
        component: "Text",
        value:
          "literal" in node.value
            ? node.value.literal
            : { path: node.value.path },
        emphasis: node.emphasis,
      };
    case "Table":
      return {
        id: node.id,
        component: "Table",
        columns: node.columns,
        rows: { path: node.rowsPath },
      };
    case "TaskProposalForm":
      return {
        id: node.id,
        component: "TaskProposalForm",
        proposal: { path: "/proposal" },
        saveAction: buildProposalEvent("save"),
        confirmAction: buildProposalEvent("confirm"),
        cancelAction: buildProposalEvent("cancel"),
      };
    case "TaskList":
      return {
        id: node.id,
        component: "TaskList",
        proposal: { path: "/proposal" },
      };
    case "TaskProposalActions":
      return {
        id: node.id,
        component: "TaskProposalActions",
        proposal: { path: "/proposal" },
        saveAction: buildProposalEvent("save"),
        confirmAction: buildProposalEvent("confirm"),
        cancelAction: buildProposalEvent("cancel"),
      };
  }
}

export function compileSurface(
  stored: StoredUiSurface,
  proposal?: ProposalView,
): UiSurfaceEnvelope {
  const validatedStored = storedUiSurfaceSchema.parse(stored);
  const mode = proposal ? "proposal" : "readonly";
  const spec = parseSurfaceSpec(validatedStored.spec, mode);
  const validatedProposal = proposal
    ? proposalViewSchema.parse(proposal)
    : undefined;

  const surfaceId = validatedStored.surfaceId;
  const compiledComponents = spec.components.map(compileNode);
  const dataModelValue = validatedProposal
    ? { display: spec.displayData, proposal: validatedProposal }
    : { display: spec.displayData };

  const envelope: UiSurfaceEnvelope = {
    text: spec.fallbackText,
    a2ui: {
      protocolVersion: "v0.9",
      catalogId: UI_COMPOSITION_CATALOG_ID,
      surfaceId,
      messages: [
        {
          version: "v0.9",
          createSurface: {
            surfaceId,
            catalogId: UI_COMPOSITION_CATALOG_ID,
          },
        },
        {
          version: "v0.9",
          updateComponents: {
            surfaceId,
            components: compiledComponents,
          },
        },
        {
          version: "v0.9",
          updateDataModel: {
            surfaceId,
            path: "/",
            value: dataModelValue,
          },
        },
      ],
    },
  };

  return parseUiSurfaceEnvelope(envelope);
}

export const uiSurfaceService = {
  compileSurface,
};
