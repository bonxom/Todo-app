import { useEffect, useState } from "react";
import { useTaskProposal } from "../../../hooks/A2UI/useTaskProposal";
import type { ProposalEnvelope } from "@/shared/types/A2UI/taskProposal";
import { TaskProposalSurface } from "./TaskProposalSurface";
import { taskService } from "@/shared/services/taskService";
import TaskDetailForm from "../../Form/TaskDetailForm";
import type { Task } from "@/shared/types/domain";

type Props = {
  envelope: ProposalEnvelope;
  onDirtyChange?: (id: string, dirty: boolean) => void;
  disabled?: boolean;
};
export function TaskProposalMessage({
  envelope: initialEnvelope,
  onDirtyChange,
  disabled,
}: Props) {
  const proposal = useTaskProposal({
    conversationId: initialEnvelope.proposal.conversationId,
    initialEnvelope,
  });
  const id = initialEnvelope.proposal.id;
  const [detail, setDetail] = useState<Task | null>(null);
  const [detailError, setDetailError] = useState("");
  const locked =
    proposal.isSubmitting ||
    Boolean(proposal.pendingAction) ||
    proposal.conflict ||
    disabled;
  const onDirty = proposal.setDirty;
  useEffect(() => {
    onDirtyChange?.(id, proposal.dirty || Boolean(proposal.pendingAction));
  }, [id, proposal.dirty, proposal.pendingAction, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(id, false), [id, onDirtyChange]);
  const [confirmReload, setConfirmReload] = useState(false);
  return (
    <div>
      <TaskProposalSurface
        envelope={proposal.envelope}
        onAction={proposal.submit}
        onDirtyChange={onDirty}
        disabled={locked}
        onOpenTask={async (taskId) => {
          try {
            setDetail(await taskService.getTaskById(taskId));
          } catch {
            setDetailError("Không thể mở công việc.");
          }
        }}
        onReload={() =>
          proposal.dirty ? setConfirmReload(true) : void proposal.reload()
        }
      />
      {(proposal.error || detailError) && (
        <p role="alert">{proposal.error || detailError}</p>
      )}
      {proposal.pendingAction && !proposal.isSubmitting && (
        <button
          type="button"
          onClick={() =>
            void proposal.submit(proposal.pendingAction!).catch(() => undefined)
          }
        >
          Thử lại yêu cầu
        </button>
      )}
      {(proposal.conflict || proposal.error) && (
        <button
          type="button"
          disabled={proposal.isSubmitting}
          onClick={() =>
            proposal.dirty ? setConfirmReload(true) : void proposal.reload()
          }
        >
          Tải lại đề xuất
        </button>
      )}
      {confirmReload && (
        <div role="alertdialog" aria-label="Bỏ thay đổi chưa lưu?">
          <p>Tải lại sẽ bỏ các thay đổi chưa lưu.</p>
          <button onClick={() => setConfirmReload(false)}>
            Tiếp tục chỉnh sửa
          </button>
          <button
            onClick={() => {
              setConfirmReload(false);
              void proposal.reload();
            }}
          >
            Bỏ thay đổi và tải lại
          </button>
        </div>
      )}
      {detail && (
        <TaskDetailForm
          task={detail}
          onClose={() => setDetail(null)}
          onTaskUpdated={() => void proposal.reload()}
          onProjectCreated={() => undefined}
        />
      )}
    </div>
  );
}
