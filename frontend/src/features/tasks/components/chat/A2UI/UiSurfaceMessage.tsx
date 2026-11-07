import { A2uiHost } from "@/shared/A2UI/A2uiHost";
import type { ProposalEnvelope } from "@/shared/types/A2UI/taskProposal";
import type { UiSurfaceEnvelope } from "@/shared/types/A2UI/uiSurface";
import MarkdownText from "../MarkdownText";
import { compositionReadonlyRegistry } from "./compositionCatalog";
import { TaskProposalMessage } from "./TaskProposalMessage";

export interface UiSurfaceMessageProps {
  surface: UiSurfaceEnvelope;
  proposalEnvelope?: ProposalEnvelope;
  disabled?: boolean;
  onDirtyChange?: (id: string, dirty: boolean) => void;
}

export function UiSurfaceMessage({
  surface,
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
