import { randomUUID } from "node:crypto";
import { isTaskProposalsEnabled } from "../../config/A2UI/a2ui.js";
import {
  isUiCompositionEnabled,
  isUiInteractiveEnabled,
} from "../../config/A2UI/composition.js";
import { chatTurnRepository } from "../../repositories/chatTurnRepository.js";
import type { ChatTurn } from "../../types/IChatTurn.js";
import type {
  ProposalEnvelope,
  ProposalView,
} from "../../types/A2UI/ITaskProposal.js";
import {
  UI_INTERACTIVE_CATALOG_ID,
  type UiActionBinding,
} from "../../types/A2UI/IUiAction.js";
import {
  UI_COMPOSITION_CATALOG_ID,
  type StoredCompositionSurface,
  type SurfaceSpec,
  type UiSurfaceEnvelope,
  type UiSurfaceMode,
} from "../../types/A2UI/IUiSurface.js";
import { proposalEnvelopeSchema } from "../../validations/A2UI/a2uiValidation.js";
import {
  parseSurfaceSpec,
  storedUiSurfaceSchema,
} from "../../validations/A2UI/uiSurfaceValidation.js";
import { interactiveUiService } from "./interactiveUiService.js";
import { taskProposalUiService } from "./taskProposalUiService.js";
import { uiSurfaceService } from "./uiSurfaceService.js";

const DEFAULT_PROPOSAL_RESPONSE =
  "Tôi đã tạo đề xuất các công việc cho bạn. Vui lòng xem lại và xác nhận.";

function extractMessagesCompanionText(
  messages: ChatTurn["messages"] | undefined,
): string | undefined {
  if (!Array.isArray(messages) || messages.length === 0) return undefined;
  const parts: string[] = [];
  for (const msg of messages) {
    if (msg.role !== "assistant" || typeof msg.content !== "string") continue;
    const trimmed = msg.content.trim();
    if (trimmed) parts.push(trimmed);
  }
  return parts.length > 0 ? parts.join("\n\n") : undefined;
}

function resolveCompanionText(
  turnResponse: string | undefined,
  excluded: Array<string | undefined>,
  turnMessages?: ChatTurn["messages"],
): string | undefined {
  const isExcluded = (candidate: string) =>
    excluded.some((fallback) => fallback && candidate === fallback.trim());

  const trimmed = turnResponse?.trim();
  if (trimmed && !isExcluded(trimmed)) {
    return trimmed;
  }

  const fromMessages = extractMessagesCompanionText(turnMessages);
  if (fromMessages && !isExcluded(fromMessages)) {
    return fromMessages;
  }

  return undefined;
}

export type TurnPresentation = {
  surface?: UiSurfaceEnvelope;
  actionBindings?: UiActionBinding[];
  proposal?: ProposalView;
  a2ui?: ProposalEnvelope["a2ui"];
  text: string;
  companionText?: string;
};

export const uiPresentationService = {
  toStoredUiSurface(
    spec: SurfaceSpec,
    mode: UiSurfaceMode,
    surfaceId = randomUUID(),
  ): StoredCompositionSurface {
    const parsed = parseSurfaceSpec(spec, mode);
    return storedUiSurfaceSchema.parse({
      catalogId: UI_COMPOSITION_CATALOG_ID,
      surfaceId,
      spec: parsed,
    });
  },

  forTurn(
    turn: Pick<ChatTurn, "response" | "uiSurface"> & {
      _id?: string;
      messages?: ChatTurn["messages"];
    },
    proposal?: ProposalView,
  ): TurnPresentation {
    if (proposal) {
      const legacy = taskProposalUiService.present(
        proposal,
        isTaskProposalsEnabled(),
      );
      if (
        turn.uiSurface &&
        turn.uiSurface.catalogId === UI_COMPOSITION_CATALOG_ID &&
        isTaskProposalsEnabled() &&
        isUiCompositionEnabled()
      ) {
        try {
          const surface = uiSurfaceService.compileSurface(
            turn.uiSurface,
            proposal,
          );
          const parsed = proposalEnvelopeSchema.parse({
            ...legacy,
            surface,
          });
          const companionText = resolveCompanionText(
            turn.response,
            [DEFAULT_PROPOSAL_RESPONSE, legacy.text, surface.text],
            turn.messages,
          );
          return {
            ...parsed,
            ...(companionText ? { companionText } : {}),
          };
        } catch (error) {
          console.warn({
            event: "stored_ui_surface_invalid",
            turnId: turn._id,
            proposalId: proposal.id,
            error:
              error instanceof Error ? error.message : "Invalid stored surface",
          });
          const companionText = resolveCompanionText(
            turn.response,
            [
              DEFAULT_PROPOSAL_RESPONSE,
              legacy.text,
              typeof turn.uiSurface.spec?.fallbackText === "string"
                ? turn.uiSurface.spec.fallbackText
                : undefined,
            ],
            turn.messages,
          );
          return {
            ...legacy,
            ...(companionText ? { companionText } : {}),
          };
        }
      }
      const companionText = resolveCompanionText(
        turn.response,
        [DEFAULT_PROPOSAL_RESPONSE, legacy.text],
        turn.messages,
      );
      return {
        ...legacy,
        ...(companionText ? { companionText } : {}),
      };
    }

    if (turn.uiSurface) {
      const uiSurface = turn.uiSurface;
      const isInteractive = uiSurface.catalogId === UI_INTERACTIVE_CATALOG_ID;
      if (
        !isUiCompositionEnabled() ||
        (isInteractive && !isUiInteractiveEnabled())
      ) {
        return {
          text:
            turn.response ||
            (typeof uiSurface.spec?.fallbackText === "string"
              ? uiSurface.spec.fallbackText
              : ""),
        };
      }
      try {
        if (uiSurface.catalogId === UI_INTERACTIVE_CATALOG_ID) {
          const surface = interactiveUiService.compile(uiSurface);
          const companionText = resolveCompanionText(
            turn.response,
            [surface.text],
            turn.messages,
          );
          return {
            surface,
            actionBindings: uiSurface.actionBindings,
            text: surface.text,
            ...(companionText ? { companionText } : {}),
          };
        }

        const surface = uiSurfaceService.compileSurface(uiSurface);
        const companionText = resolveCompanionText(
          turn.response,
          [surface.text],
          turn.messages,
        );
        return {
          surface,
          text: surface.text,
          ...(companionText ? { companionText } : {}),
        };
      } catch (error) {
        console.warn({
          event: "stored_ui_surface_invalid",
          turnId: turn._id,
          error:
            error instanceof Error ? error.message : "Invalid stored surface",
        });
        return {
          text:
            turn.response ||
            (typeof uiSurface.spec?.fallbackText === "string"
              ? uiSurface.spec.fallbackText
              : ""),
        };
      }
    }

    return { text: turn.response };
  },

  async forProposal(
    userId: string,
    proposal: ProposalView,
  ): Promise<ProposalEnvelope> {
    if (!isTaskProposalsEnabled() || !isUiCompositionEnabled()) {
      return taskProposalUiService.present(proposal, isTaskProposalsEnabled());
    }
    const turn = await chatTurnRepository.findByProposal(
      userId,
      proposal.conversationId,
      proposal.id,
    );
    if (!turn) {
      return taskProposalUiService.present(proposal, isTaskProposalsEnabled());
    }
    const presented = uiPresentationService.forTurn(turn, proposal);
    return proposalEnvelopeSchema.parse({
      proposal,
      text: presented.text,
      ...(presented.surface ? { surface: presented.surface } : {}),
      ...(presented.a2ui ? { a2ui: presented.a2ui } : {}),
    });
  },
};
