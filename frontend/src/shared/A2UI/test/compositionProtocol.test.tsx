import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  A2uiMessageSchema,
  Catalog,
  MessageProcessor,
} from "@a2ui/web_core/v0_9";
import { A2uiHost } from "../A2uiHost";
import { CatalogRegistry, type SurfacePayload } from "../catalogRegistry";
import {
  UI_COMPOSITION_CATALOG_ID,
  type UiSurfaceEnvelope,
} from "@/shared/types/A2UI/uiSurface";
import {
  presentationComponents,
  formatDisplayScalar,
} from "../presentationComponents";
import { validateCompositionPayload } from "../compositionSchema";
import compiledFixture from "@/test/fixtures/a2ui-composition-v09.json";

const readonlyRegistry = new CatalogRegistry().register({
  catalog: new Catalog(
    UI_COMPOSITION_CATALOG_ID,
    "v0.9",
    presentationComponents,
  ),
  actions: [],
  validatePayload: (payload) => validateCompositionPayload(payload, "readonly"),
  validate: () => {},
});

const cloneReadonlyPayload = (): SurfacePayload =>
  structuredClone(
    (compiledFixture.readonly as UiSurfaceEnvelope).a2ui,
  ) as SurfacePayload;

describe("compositionProtocol & presentationComponents", () => {
  it("compiled fixture conforms to installed A2UI v0.9 schema and renders with presentation catalog", async () => {
    const payload = cloneReadonlyPayload();
    for (const message of payload.messages) {
      expect(A2uiMessageSchema.safeParse(message).success).toBe(true);
    }

    const processor = readonlyRegistry.createProcessor(payload, vi.fn());
    expect(processor).toBeInstanceOf(MessageProcessor);

    render(
      <A2uiHost
        payload={payload}
        registry={readonlyRegistry}
        onAction={vi.fn()}
        fallback={<div data-testid="fallback">Fallback rendered</div>}
      />,
    );

    expect(await screen.findByText("Weekly Study Plan")).toBeInTheDocument();
    expect(screen.getByText("Target band 7.5")).toBeInTheDocument();

    // Semantic table headers and cells
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Day" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Focus" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Hours" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Note" }),
    ).toBeInTheDocument();

    expect(screen.getByRole("cell", { name: "Monday" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Reading" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "1.5" })).toBeInTheDocument();
    expect(
      screen.getByRole("cell", { name: "Practice test 3" }),
    ).toBeInTheDocument();

    processor.dispose();
  });

  it("renders Row child order, nested Cards, readable boolean/null formatting, and treats HTML markup as literal text", async () => {
    const payload = cloneReadonlyPayload();
    payload.messages[1] = {
      version: "v0.9",
      updateComponents: {
        surfaceId: payload.surfaceId,
        components: [
          {
            id: "root",
            component: "Row",
            children: ["cardA", "cardB"],
            gap: "lg",
          },
          {
            id: "cardA",
            component: "Card",
            children: ["htmlText"],
          },
          {
            id: "htmlText",
            component: "Text",
            value: "<script>alert(1)</script><b>raw</b>",
            emphasis: "heading",
          },
          {
            id: "cardB",
            component: "Card",
            children: ["boolTable"],
          },
          {
            id: "boolTable",
            component: "Table",
            columns: [
              { key: "active", label: "Active" },
              { key: "done", label: "Done" },
              { key: "note", label: "Note" },
            ],
            rows: { path: "/display/flags" },
          },
        ],
      },
    };
    payload.messages[2] = {
      version: "v0.9",
      updateDataModel: {
        surfaceId: payload.surfaceId,
        path: "/",
        value: {
          display: {
            flags: [{ active: true, done: false, note: null }],
          },
        },
      },
    };

    const { container, unmount } = render(
      <A2uiHost
        payload={payload}
        registry={readonlyRegistry}
        onAction={vi.fn()}
        fallback={<div data-testid="fallback">Fallback</div>}
      />,
    );

    expect(
      await screen.findByText("<script>alert(1)</script><b>raw</b>"),
    ).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("b")).toBeNull();

    // Check boolean and null formatting
    expect(formatDisplayScalar(true)).toBe("Yes");
    expect(formatDisplayScalar(false)).toBe("No");
    expect(formatDisplayScalar(null)).toBe("—");
    expect(screen.getByRole("cell", { name: "Yes" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "No" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "—" })).toBeInTheDocument();

    // Check Row order: cardA appears before cardB
    const cards = container.querySelectorAll(".a2ui-card");
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain("<script>alert(1)</script>");
    expect(cards[1].textContent).toContain("Yes");

    unmount();
  });

  it.each([
    "cycle",
    "missing_child",
    "undefined_model_path",
    "extra_delete_message",
    "mismatched_surface_id",
    "unknown_catalog",
    "unknown_action",
    "table_column_mismatch",
    "multiple_parents",
    "unreachable_node",
    "depth_11",
    "count_101",
    "table_13_columns",
    "table_51_rows",
    "prototype_key",
  ])(
    "rejects invalid payload (%s) and renders fallback cleanly",
    async (invalidCase) => {
      const payload = cloneReadonlyPayload();

      if (invalidCase === "cycle") {
        (
          payload.messages[1].updateComponents as {
            components: Record<string, unknown>[];
          }
        ).components = [
          { id: "root", component: "Column", children: ["childA"], gap: "md" },
          { id: "childA", component: "Card", children: ["childB"] },
          { id: "childB", component: "Card", children: ["childA"] },
        ];
      } else if (invalidCase === "missing_child") {
        (
          payload.messages[1].updateComponents as {
            components: Record<string, unknown>[];
          }
        ).components = [{ id: "root", component: "Card", children: ["ghost"] }];
      } else if (invalidCase === "undefined_model_path") {
        (
          payload.messages[1].updateComponents as {
            components: Record<string, unknown>[];
          }
        ).components = [
          {
            id: "root",
            component: "Text",
            value: { path: "/display/missingKey" },
            emphasis: "normal",
          },
        ];
      } else if (invalidCase === "extra_delete_message") {
        payload.messages.push({
          version: "v0.9",
          deleteSurface: { surfaceId: payload.surfaceId },
        });
      } else if (invalidCase === "mismatched_surface_id") {
        (
          payload.messages[2].updateDataModel as { surfaceId: string }
        ).surfaceId = "99999999-9999-4999-8999-999999999999";
      } else if (invalidCase === "unknown_catalog") {
        payload.catalogId = "urn:orbit:a2ui:unknown:v1";
      } else if (invalidCase === "unknown_action") {
        (
          payload.messages[1].updateComponents as {
            components: Record<string, unknown>[];
          }
        ).components = [
          {
            id: "root",
            component: "Text",
            value: "Hello",
            emphasis: "normal",
            onClickAction: { event: { name: "delete_all" } },
          },
        ];
      } else if (invalidCase === "table_column_mismatch") {
        (
          payload.messages[2].updateDataModel as {
            value: { display: { schedule: Record<string, unknown>[] } };
          }
        ).value.display.schedule = [{ day: "Monday" }];
      } else if (invalidCase === "multiple_parents") {
        (
          payload.messages[1].updateComponents as {
            components: Record<string, unknown>[];
          }
        ).components = [
          {
            id: "root",
            component: "Column",
            children: ["cardA", "cardB"],
            gap: "sm",
          },
          { id: "cardA", component: "Card", children: ["sharedText"] },
          { id: "cardB", component: "Card", children: ["sharedText"] },
          {
            id: "sharedText",
            component: "Text",
            value: "Hi",
            emphasis: "normal",
          },
        ];
      } else if (invalidCase === "unreachable_node") {
        (
          payload.messages[1].updateComponents as {
            components: Record<string, unknown>[];
          }
        ).components = [
          { id: "root", component: "Text", value: "Root", emphasis: "normal" },
          {
            id: "orphan",
            component: "Text",
            value: "Orphan",
            emphasis: "muted",
          },
        ];
      } else if (invalidCase === "depth_11") {
        const chain: Record<string, unknown>[] = [];
        for (let i = 0; i < 10; i++) {
          const id = i === 0 ? "root" : `node_${i}`;
          const child = `node_${i + 1}`;
          chain.push({ id, component: "Card", children: [child] });
        }
        chain.push({
          id: "node_10",
          component: "Text",
          value: "Too deep",
          emphasis: "normal",
        });
        (
          payload.messages[1].updateComponents as {
            components: Record<string, unknown>[];
          }
        ).components = chain;
      } else if (invalidCase === "count_101") {
        const children = Array.from({ length: 100 }, (_, i) => `item_${i}`);
        (
          payload.messages[1].updateComponents as {
            components: Record<string, unknown>[];
          }
        ).components = [
          { id: "root", component: "Column", children, gap: "none" },
          ...children.map((id) => ({
            id,
            component: "Text",
            value: id,
            emphasis: "normal",
          })),
        ];
      } else if (invalidCase === "table_13_columns") {
        const columns = Array.from({ length: 13 }, (_, i) => ({
          key: `col_${i}`,
          label: `Col ${i}`,
        }));
        (
          payload.messages[1].updateComponents as {
            components: Record<string, unknown>[];
          }
        ).components = [
          {
            id: "root",
            component: "Table",
            columns,
            rows: { path: "/display/schedule" },
          },
        ];
      } else if (invalidCase === "table_51_rows") {
        (
          payload.messages[2].updateDataModel as {
            value: { display: { schedule: Record<string, unknown>[] } };
          }
        ).value.display.schedule = Array.from({ length: 51 }, () => ({
          day: "Mon",
          focus: "Reading",
          hours: 1,
          optionalNote: null,
          active: true,
        }));
      } else if (invalidCase === "prototype_key") {
        (
          payload.messages[1].updateComponents as {
            components: Record<string, unknown>[];
          }
        ).components = [
          {
            id: "root",
            component: "Text",
            value: { path: "/display/constructor" },
            emphasis: "normal",
          },
        ];
      }

      expect(() =>
        readonlyRegistry.createProcessor(payload, vi.fn()),
      ).toThrow();

      render(
        <A2uiHost
          payload={payload}
          registry={readonlyRegistry}
          onAction={vi.fn()}
          fallback={<div data-testid="fallback">Fallback rendered</div>}
        />,
      );

      expect(await screen.findByTestId("fallback")).toBeInTheDocument();
    },
  );
});
