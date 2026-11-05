import { useContext } from "react";
import { z } from "zod";
import { Catalog, CommonSchemas } from "@a2ui/web_core/v0_9";
import {
  createBinderlessComponentImplementation,
  useSignalValue,
} from "@a2ui/react/v0_9";
import { CatalogRegistry } from "@/shared/A2UI/catalogRegistry";
import { TaskProposalForm } from "./TaskProposalForm";
import { TaskProposalContext } from "./taskProposalContext";
import {
  proposalViewSchema,
  TASK_PROPOSAL_CATALOG_ID,
} from "./taskProposalSchema";
import type { ProposalView } from "@/shared/types/A2UI/taskProposal";

const api = {
  name: "TaskProposalForm",
  schema: z
    .object({
      proposal: z.object({ path: z.literal("/proposal") }).strict(),
      saveAction: CommonSchemas.Action,
      confirmAction: CommonSchemas.Action,
      cancelAction: CommonSchemas.Action,
    })
    .strict(),
};
const form = createBinderlessComponentImplementation(api, ({ context }) => {
  const options = useContext(TaskProposalContext);
  const model = context.dataContext.dataModel;
  const proposal = useSignalValue(model.getSignal<ProposalView>("/proposal"));
  if (!options || !proposal) throw new Error("Missing proposal context");
  return (
    <TaskProposalForm
      proposal={options.baseline}
      draft={proposal}
      onChange={(value) => model.set("/proposal", value)}
      onDirtyChange={options.onDirtyChange}
      disabled={options.disabled}
      onOpenTask={options.onOpenTask}
      onAction={async (action) => {
        model.set("/requestId", action.requestId);
        const property = `${action.action}Action`;
        const schema = api.schema.parse(context.componentModel.properties);
        const resolved = context.dataContext.resolveAction(
          schema[property as "saveAction" | "confirmAction" | "cancelAction"],
          { userActivation: true },
        );
        await context.dispatchAction(resolved as Record<string, unknown>);
      }}
    />
  );
});
export const taskProposalCatalog = new Catalog(
  TASK_PROPOSAL_CATALOG_ID,
  "v0.9",
  [form],
);
export const taskProposalRegistry = new CatalogRegistry().register({
  catalog: taskProposalCatalog,
  actions: ["save", "confirm", "cancel"],
  validate: (data) => {
    z.object({ proposal: proposalViewSchema }).parse(data);
  },
});
