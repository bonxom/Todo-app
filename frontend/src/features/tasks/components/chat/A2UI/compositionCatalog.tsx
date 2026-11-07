import { useContext, useEffect } from "react";
import { z } from "zod";
import { Catalog, CommonSchemas } from "@a2ui/web_core/v0_9";
import {
  createBinderlessComponentImplementation,
  useSignalValue,
} from "@a2ui/react/v0_9";
import { CatalogRegistry } from "@/shared/A2UI/catalogRegistry";
import { presentationComponents } from "@/shared/A2UI/presentationComponents";
import {
  displayDataSchema,
  validateCompositionPayload,
} from "@/shared/A2UI/compositionSchema";
import { UI_COMPOSITION_CATALOG_ID } from "@/shared/types/A2UI/uiSurface";
import type {
  ProposalAction,
  ProposalView,
} from "@/shared/types/A2UI/taskProposal";
import { TaskProposalForm } from "./TaskProposalForm";
import { TaskList } from "./TaskList";
import { TaskProposalActions } from "./TaskProposalActions";
import { TaskProposalContext } from "./taskProposalContext";
import { TaskProposalEditorContext } from "./taskProposalEditorContext";
import { proposalViewSchema } from "./taskProposalSchema";

const taskProposalFormApi = {
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

const taskListApi = {
  name: "TaskList",
  schema: z
    .object({
      proposal: z.object({ path: z.literal("/proposal") }).strict(),
    })
    .strict(),
};

const taskProposalActionsApi = {
  name: "TaskProposalActions",
  schema: z
    .object({
      proposal: z.object({ path: z.literal("/proposal") }).strict(),
      saveAction: CommonSchemas.Action,
      confirmAction: CommonSchemas.Action,
      cancelAction: CommonSchemas.Action,
    })
    .strict(),
};

export const taskProposalFormComponent =
  createBinderlessComponentImplementation(
    taskProposalFormApi,
    ({ context }) => {
      const options = useContext(TaskProposalContext);
      const editor = useContext(TaskProposalEditorContext);
      const model = context.dataContext.dataModel;
      const signal = model.getSignal<ProposalView>("/proposal");
      const proposal = useSignalValue(signal);
      const activeDraft = editor?.draft ?? (options?.proposalDraft as ProposalView | undefined);

      useEffect(() => {
        if (
          activeDraft &&
          JSON.stringify(activeDraft) !== JSON.stringify(proposal)
        ) {
          model.set("/proposal", activeDraft);
        }
      }, [activeDraft, model, proposal]);

      if (!options || !proposal) throw new Error("Missing proposal context");

      const dispatchProposalAction = async (action: ProposalAction) => {
        if (editor?.draft) {
          model.set("/proposal", editor.draft);
        }
        model.set("/requestId", action.requestId);
        const property = `${action.action}Action` as
          | "saveAction"
          | "confirmAction"
          | "cancelAction";
        const parsed = taskProposalFormApi.schema.parse(
          context.componentModel.properties,
        );
        const resolved = context.dataContext.resolveAction(parsed[property], {
          userActivation: true,
        });
        await context.dispatchAction(resolved as Record<string, unknown>);
        await options.awaitPendingAction?.();
      };

      return (
        <TaskProposalForm
          proposal={options.baseline}
          draft={activeDraft || proposal}
          onChange={(value) => {
            model.set("/proposal", value);
            editor?.setDraft(value);
          }}
          onDirtyChange={options.onDirtyChange}
          disabled={options.disabled}
          onOpenTask={options.onOpenTask}
          onAction={dispatchProposalAction}
        />
      );
    },
  );

export const taskListComponent = createBinderlessComponentImplementation(
  taskListApi,
  ({ context }) => {
    taskListApi.schema.parse(context.componentModel.properties);
    const editor = useContext(TaskProposalEditorContext);
    const model = context.dataContext.dataModel;
    const signal = model.getSignal<ProposalView>("/proposal");
    const proposal = useSignalValue(signal);

    useEffect(() => {
      if (
        editor?.draft &&
        JSON.stringify(editor.draft) !== JSON.stringify(proposal)
      ) {
        model.set("/proposal", editor.draft);
      }
    }, [editor?.draft, model, proposal]);

    if (!editor || !proposal) throw new Error("Missing proposal context");
    return <TaskList />;
  },
);

export const taskProposalActionsComponent =
  createBinderlessComponentImplementation(
    taskProposalActionsApi,
    ({ context }) => {
      const options = useContext(TaskProposalContext);
      const editor = useContext(TaskProposalEditorContext);
      const model = context.dataContext.dataModel;
      const signal = model.getSignal<ProposalView>("/proposal");
      const proposal = useSignalValue(signal);

      useEffect(() => {
        if (
          editor?.draft &&
          JSON.stringify(editor.draft) !== JSON.stringify(proposal)
        ) {
          model.set("/proposal", editor.draft);
        }
      }, [editor?.draft, model, proposal]);

      if (!editor || !proposal) throw new Error("Missing proposal context");

      const dispatchProposalAction = async (action: ProposalAction) => {
        model.set("/proposal", editor.draft);
        model.set("/requestId", action.requestId);
        const property = `${action.action}Action` as
          | "saveAction"
          | "confirmAction"
          | "cancelAction";
        const parsed = taskProposalActionsApi.schema.parse(
          context.componentModel.properties,
        );
        const resolved = context.dataContext.resolveAction(parsed[property], {
          userActivation: true,
        });
        await context.dispatchAction(resolved as Record<string, unknown>);
        await options?.awaitPendingAction?.();
      };

      return <TaskProposalActions onDispatchAction={dispatchProposalAction} />;
    },
  );

export const compositionCatalog = new Catalog(
  UI_COMPOSITION_CATALOG_ID,
  "v0.9",
  [
    ...presentationComponents,
    taskProposalFormComponent,
    taskListComponent,
    taskProposalActionsComponent,
  ],
);

export const compositionProposalRegistry = new CatalogRegistry().register({
  catalog: compositionCatalog,
  actions: ["save", "confirm", "cancel"],
  validatePayload: (payload) => validateCompositionPayload(payload, "proposal"),
  validate: (data) => {
    z.object({
      display: displayDataSchema,
      proposal: proposalViewSchema,
    })
      .strict()
      .parse(data);
  },
});

export const compositionReadonlyRegistry = new CatalogRegistry().register({
  catalog: compositionCatalog,
  actions: [],
  validatePayload: (payload) => validateCompositionPayload(payload, "readonly"),
  validate: (data) => {
    z.object({
      display: displayDataSchema,
    })
      .strict()
      .parse(data);
  },
});
