import { Catalog } from "@a2ui/web_core/v0_9";
import { UI_INTERACTIVE_CATALOG_ID } from "@/shared/types/A2UI/uiAction";
import { CatalogRegistry } from "./catalogRegistry";
import { interactiveComponents } from "./interactiveComponents";
import {
  interactiveDataModelSchema,
  validateInteractivePayload,
} from "./interactiveSchema";

export const interactiveCatalog = new Catalog(
  UI_INTERACTIVE_CATALOG_ID,
  "v0.9",
  interactiveComponents,
);

export const interactiveRegistry = new CatalogRegistry().register({
  catalog: interactiveCatalog,
  actions: ["dispatch"],
  validatePayload: validateInteractivePayload,
  validate: (data) => {
    interactiveDataModelSchema.parse(data);
  },
});
