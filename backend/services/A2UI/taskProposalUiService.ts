import { randomUUID } from "node:crypto";
import type {
  ProposalEnvelope,
  ProposalView,
} from "../../types/A2UI/ITaskProposal.js";
import { proposalEnvelopeSchema } from "../../validations/A2UI/a2uiValidation.js";

export const taskProposalUiService = {
  present(view: ProposalView, enabled: boolean): ProposalEnvelope {
    const heading =
      view.status === "created"
        ? `Đã tạo thành công ${view.createdTasks.length} công việc.`
        : view.status === "cancelled"
          ? "Đề xuất công việc đã được hủy."
          : "Đề xuất công việc — hãy chỉnh sửa và chọn những việc muốn tạo.";
    const text = [
      heading,
      ...view.items.map(
        (item, index) =>
          `${index + 1}. ${item.title}${item.dueDate ? ` — ${item.dueDate}` : ""}`,
      ),
    ].join("\n");
    if (!enabled) return proposalEnvelopeSchema.parse({ proposal: view, text });
    const surfaceId = randomUUID();
    const event = (name: string) => ({
      event: {
        name,
        context: {
          proposal: { path: "/proposal" },
          requestId: { path: "/requestId" },
        },
      },
    });
    return proposalEnvelopeSchema.parse({
      proposal: view,
      text,
      a2ui: {
        protocolVersion: "v0.9",
        catalogId: view.catalogId,
        surfaceId,
        messages: [
          {
            version: "v0.9",
            createSurface: { surfaceId, catalogId: view.catalogId },
          },
          {
            version: "v0.9",
            updateComponents: {
              surfaceId,
              components: [
                {
                  id: "root",
                  component: "TaskProposalForm",
                  proposal: { path: "/proposal" },
                  saveAction: event("save"),
                  confirmAction: event("confirm"),
                  cancelAction: event("cancel"),
                },
              ],
            },
          },
          {
            version: "v0.9",
            updateDataModel: { surfaceId, path: "/proposal", value: view },
          },
        ],
      },
    });
  },
};
