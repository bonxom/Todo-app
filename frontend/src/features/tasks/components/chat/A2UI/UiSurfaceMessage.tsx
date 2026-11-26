import { A2uiHost } from "@/shared/A2UI/A2uiHost";
import type { ProposalEnvelope } from "@/shared/types/A2UI/taskProposal";
import {
  UI_INTERACTIVE_CATALOG_ID,
  type UiActionBinding,
  type UiActionOutcome,
} from "@/shared/types/A2UI/uiAction";
import type { UiSurfaceEnvelope } from "@/shared/types/A2UI/uiSurface";
import MarkdownText from "../MarkdownText";
import { compositionReadonlyRegistry } from "./compositionCatalog";
import { InteractiveSurfaceMessage } from "./InteractiveSurfaceMessage";
import { TaskProposalMessage } from "./TaskProposalMessage";

export interface UiSurfaceMessageProps {
  surface: UiSurfaceEnvelope;
  conversationId?: string;
  turnId?: string;
  actionBindings?: UiActionBinding[];
  uiActionOutcomes?: UiActionOutcome[];
  proposalEnvelope?: ProposalEnvelope;
  disabled?: boolean;
  onDirtyChange?: (id: string, dirty: boolean) => void;
}

export function UiSurfaceMessage({
  surface,
  conversationId,
  turnId,
  actionBindings,
  uiActionOutcomes,
  proposalEnvelope,
  disabled,
  onDirtyChange,
}: UiSurfaceMessageProps) {
  if (proposalEnvelope) {
    return (
      <TaskProposalMessage
        envelope={{
          ...proposalEnvelope,
          surface,
        }}
        disabled={disabled}
        onDirtyChange={onDirtyChange}
      />
    );
  }

  if (surface.a2ui.catalogId === UI_INTERACTIVE_CATALOG_ID) {
    if (!conversationId || !turnId || !actionBindings?.length) {
      return <MarkdownText text={surface.text} />;
    }
    return (
      <InteractiveSurfaceMessage
        surface={surface}
        location={{
          conversationId,
          turnId,
          surfaceId: surface.a2ui.surfaceId,
        }}
        bindings={actionBindings}
        outcomes={uiActionOutcomes}
        disabled={disabled}
      />
    );
  }

  return (
    <A2uiHost
      payload={surface.a2ui}
      registry={compositionReadonlyRegistry}
      fallback={<MarkdownText text={surface.text} />}
      onAction={async () => {
        throw new Error("Read-only surface does not accept actions");
      }}
    />
  );
}
