import { randomUUID } from "node:crypto";
import { isTaskProposalsEnabled } from "../../config/A2UI/a2ui.js";
import { isUiCompositionEnabled } from "../../config/A2UI/composition.js";
import { chatTurnRepository } from "../../repositories/chatTurnRepository.js";
import type { ChatTurn } from "../../types/IChatTurn.js";
import type {
  ProposalEnvelope,
  ProposalView,
} from "../../types/A2UI/ITaskProposal.js";
import {
  UI_COMPOSITION_CATALOG_ID,
  type StoredUiSurface,
  type SurfaceSpec,
  type UiSurfaceEnvelope,
  type UiSurfaceMode,
} from "../../types/A2UI/IUiSurface.js";
import { proposalEnvelopeSchema } from "../../validations/A2UI/a2uiValidation.js";
import {
  parseSurfaceSpec,
  storedUiSurfaceSchema,
} from "../../validations/A2UI/uiSurfaceValidation.js";
import { taskProposalUiService } from "./taskProposalUiService.js";
import { uiSurfaceService } from "./uiSurfaceService.js";

export type TurnPresentation = {
  surface?: UiSurfaceEnvelope;
  proposal?: ProposalView;
  a2ui?: ProposalEnvelope["a2ui"];
  text: string;
};

export const uiPresentationService = {
  toStoredUiSurface(
    spec: SurfaceSpec,
    mode: UiSurfaceMode,
    surfaceId = randomUUID(),
  ): StoredUiSurface {
    const parsed = parseSurfaceSpec(spec, mode);
    return storedUiSurfaceSchema.parse({
      catalogId: UI_COMPOSITION_CATALOG_ID,
      surfaceId,
      spec: parsed,
    });
  },

  forTurn(
    turn: Pick<ChatTurn, "response" | "uiSurface"> & { _id?: string },
    proposal?: ProposalView,
  ): TurnPresentation {
    if (proposal) {
      const legacy = taskProposalUiService.present(
        proposal,
        isTaskProposalsEnabled(),
      );
      if (
        turn.uiSurface &&
        isTaskProposalsEnabled() &&
        isUiCompositionEnabled()
      ) {
        try {
          const surface = uiSurfaceService.compileSurface(
            turn.uiSurface,
            proposal,
          );
          return proposalEnvelopeSchema.parse({
            ...legacy,
            surface,
          });
        } catch (error) {
          console.warn({
            event: "stored_ui_surface_invalid",
            turnId: turn._id,
            proposalId: proposal.id,
            error:
              error instanceof Error ? error.message : "Invalid stored surface",
          });
          return legacy;
        }
      }
      return legacy;
    }

    if (turn.uiSurface) {
      if (!isUiCompositionEnabled()) {
        return {
          text:
            turn.response ||
            (typeof turn.uiSurface.spec?.fallbackText === "string"
              ? turn.uiSurface.spec.fallbackText
              : ""),
        };
      }
      try {
        const surface = uiSurfaceService.compileSurface(turn.uiSurface);
        return {
          surface,
          text: surface.text,
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
            (typeof turn.uiSurface.spec?.fallbackText === "string"
              ? turn.uiSurface.spec.fallbackText
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
