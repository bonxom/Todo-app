import {
  A2uiMessageSchema,
  MessageProcessor,
  type Catalog,
  type ActionPayload,
} from "@a2ui/web_core/v0_9";
import type { ReactCatalogComponent } from "@a2ui/react/v0_9";

export interface SurfacePayload {
  protocolVersion: string;
  catalogId: string;
  surfaceId: string;
  messages: Record<string, unknown>[];
}
export interface CatalogRegistration {
  catalog: Catalog<ReactCatalogComponent>;
  actions: readonly string[];
  validate: (data: unknown) => void;
}
// Registrations are application code, never loaded from a model-supplied URL.
export class CatalogRegistry {
  private readonly registrations = new Map<string, CatalogRegistration>();
  register(registration: CatalogRegistration) {
    if (this.registrations.has(registration.catalog.id))
      throw new Error("Duplicate catalog");
    this.registrations.set(registration.catalog.id, registration);
    return this;
  }
  createProcessor(
    payload: SurfacePayload,
    onAction: (action: ActionPayload) => Promise<void>,
  ) {
    if (payload.protocolVersion !== "v0.9")
      throw new Error("Unsupported protocol");
    const registration = this.registrations.get(payload.catalogId);
    if (!registration) throw new Error("Unsupported catalog");
    if (
      !payload.messages.length ||
      payload.messages.length > 16 ||
      new TextEncoder().encode(JSON.stringify(payload)).length > 128 * 1024
    )
      throw new Error("Invalid surface size");
    const processor = new MessageProcessor<ReactCatalogComponent>(
      [registration.catalog],
      async (action) => {
        if (
          action.surfaceId !== payload.surfaceId ||
          !registration.actions.includes(action.name)
        )
          throw new Error("Action not allowlisted");
        await onAction(action);
      },
      { version: "v0.9" },
    );
    try {
      const messages = payload.messages.map((message) => {
        if (message.version !== "v0.9")
          throw new Error("Unsupported message version");
        const parsed = A2uiMessageSchema.parse(message);
        const operation =
          "createSurface" in parsed
            ? parsed.createSurface
            : "updateComponents" in parsed
              ? parsed.updateComponents
              : "updateDataModel" in parsed
                ? parsed.updateDataModel
                : parsed.deleteSurface;
        if (operation.surfaceId !== payload.surfaceId)
          throw new Error("Surface identity mismatch");
        if (
          "createSurface" in parsed &&
          parsed.createSurface.catalogId !== payload.catalogId
        )
          throw new Error("Catalog identity mismatch");
        if ("updateComponents" in parsed)
          for (const component of parsed.updateComponents.components) {
            if (!registration.catalog.components.has(component.component))
              throw new Error("Unknown component");
          }
        return parsed;
      });
      processor.processMessages(messages);
      const surface = processor.getSurfaces().get(payload.surfaceId);
      if (!surface || !surface.componentsModel.get("root"))
        throw new Error("Missing root surface");
      registration.validate(surface.dataModel.get("/"));
      return processor;
    } catch (error) {
      processor.dispose();
      throw error;
    }
  }
}
