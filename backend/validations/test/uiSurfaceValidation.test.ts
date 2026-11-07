import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseSurfaceSpec } from "../A2UI/uiSurfaceValidation.js";

const fixturePath = resolve(
  process.cwd(),
  "../frontend/src/test/fixtures/ui-composition-spec.json",
);
const fixture = JSON.parse(readFileSync(fixturePath, "utf-8"));

describe("uiSurfaceValidation", () => {
  it("accepts valid readonly and proposal fixtures", () => {
    expect(parseSurfaceSpec(fixture.readonly, "readonly")).toEqual(
      fixture.readonly,
    );
    expect(parseSurfaceSpec(fixture.proposal, "proposal")).toEqual(
      fixture.proposal,
    );
  });

  it("accepts a proposal spec using a single TaskProposalForm", () => {
    const spec = {
      fallbackText: "Proposed tasks",
      components: [
        {
          id: "root",
          component: "Column",
          children: ["heading", "form"],
          gap: "md",
        },
        {
          id: "heading",
          component: "Text",
          value: { literal: "Tasks" },
          emphasis: "heading",
        },
        {
          id: "form",
          component: "TaskProposalForm",
        },
      ],
      displayData: {},
    };
    expect(parseSurfaceSpec(spec, "proposal")).toEqual(spec);
  });

  it("rejects a cycle before processing messages", () => {
    expect(() =>
      parseSurfaceSpec(
        {
          fallbackText: "Plan",
          components: [
            { id: "root", component: "Column", children: ["root"], gap: "md" },
          ],
          displayData: {},
        },
        "readonly",
      ),
    ).toThrow();

    expect(() =>
      parseSurfaceSpec(
        {
          fallbackText: "Plan",
          components: [
            { id: "root", component: "Column", children: ["a"], gap: "md" },
            { id: "a", component: "Card", children: ["b"] },
            { id: "b", component: "Card", children: ["a"] },
          ],
          displayData: {},
        },
        "readonly",
      ),
    ).toThrow();
  });

  it("rejects duplicate IDs, missing root, and missing child references", () => {
    expect(() =>
      parseSurfaceSpec(
        {
          fallbackText: "Plan",
          components: [
            { id: "root", component: "Card", children: ["child"] },
            { id: "root", component: "Card", children: [] },
          ],
          displayData: {},
        },
        "readonly",
      ),
    ).toThrow();

    expect(() =>
      parseSurfaceSpec(
        {
          fallbackText: "Plan",
          components: [{ id: "main", component: "Card", children: [] }],
          displayData: {},
        },
        "readonly",
      ),
    ).toThrow();

    expect(() =>
      parseSurfaceSpec(
        {
          fallbackText: "Plan",
          components: [
            { id: "root", component: "Card", children: ["nonexistent"] },
          ],
          displayData: {},
        },
        "readonly",
      ),
    ).toThrow();
  });

  it("rejects multiple parents and unreachable orphan nodes", () => {
    expect(() =>
      parseSurfaceSpec(
        {
          fallbackText: "Diamond",
          components: [
            {
              id: "root",
              component: "Column",
              children: ["left", "right"],
              gap: "sm",
            },
            { id: "left", component: "Card", children: ["shared"] },
            { id: "right", component: "Card", children: ["shared"] },
            {
              id: "shared",
              component: "Text",
              value: { literal: "Shared" },
              emphasis: "normal",
            },
          ],
          displayData: {},
        },
        "readonly",
      ),
    ).toThrow();

    expect(() =>
      parseSurfaceSpec(
        {
          fallbackText: "Orphan",
          components: [
            { id: "root", component: "Card", children: [] },
            {
              id: "orphan",
              component: "Text",
              value: { literal: "Unreachable" },
              emphasis: "normal",
            },
          ],
          displayData: {},
        },
        "readonly",
      ),
    ).toThrow();
  });

  it("accepts nesting depth 10 and rejects depth 11", () => {
    const makeChain = (depth: number) =>
      Array.from({ length: depth }, (_, i) => {
        const id = i === 0 ? "root" : `node_${i}`;
        const nextId = i < depth - 1 ? [`node_${i + 1}`] : [];
        return {
          id,
          component: "Card" as const,
          children: nextId,
        };
      });

    expect(
      parseSurfaceSpec(
        {
          fallbackText: "Depth 10",
          components: makeChain(10),
          displayData: {},
        },
        "readonly",
      ).components,
    ).toHaveLength(10);

    expect(() =>
      parseSurfaceSpec(
        {
          fallbackText: "Depth 11",
          components: makeChain(11),
          displayData: {},
        },
        "readonly",
      ),
    ).toThrow();
  });

  it("accepts 100 components and rejects 101 components", () => {
    const makeWide = (total: number) => {
      const childIds = Array.from(
        { length: total - 1 },
        (_, i) => `c_${i + 1}`,
      );
      return [
        {
          id: "root",
          component: "Column" as const,
          children: childIds,
          gap: "none" as const,
        },
        ...childIds.map((id) => ({
          id,
          component: "Text" as const,
          value: { literal: "item" },
          emphasis: "normal" as const,
        })),
      ];
    };

    expect(
      parseSurfaceSpec(
        {
          fallbackText: "100 nodes",
          components: makeWide(100),
          displayData: {},
        },
        "readonly",
      ).components,
    ).toHaveLength(100);

    expect(() =>
      parseSurfaceSpec(
        {
          fallbackText: "101 nodes",
          components: makeWide(101),
          displayData: {},
        },
        "readonly",
      ),
    ).toThrow();
  });

  it("rejects unknown properties, unsupported actions, and injected task bindings", () => {
    expect(() =>
      parseSurfaceSpec(
        {
          fallbackText: "Plan",
          components: [
            {
              id: "root",
              component: "Text",
              value: { literal: "Hi" },
              emphasis: "normal",
              style: "color:red",
            },
          ],
          displayData: {},
        },
        "readonly",
      ),
    ).toThrow();

    expect(() =>
      parseSurfaceSpec(
        {
          fallbackText: "Plan",
          components: [
            {
              id: "root",
              component: "TaskProposalForm",
              proposal: { path: "/proposal" },
            },
          ],
          displayData: {},
        },
        "proposal",
      ),
    ).toThrow();

    expect(() =>
      parseSurfaceSpec(
        {
          fallbackText: "Plan",
          components: [
            {
              id: "root",
              component: "TaskProposalForm",
              onClick: { endpoint: "/api/tasks" },
            },
          ],
          displayData: {},
        },
        "proposal",
      ),
    ).toThrow();
  });

  it("treats HTML strings as plain text scalars without rejecting valid text", () => {
    const spec = {
      fallbackText: "Markup literal test",
      components: [
        {
          id: "root",
          component: "Text" as const,
          value: { literal: "<script>alert(1)</script><b>bold</b>" },
          emphasis: "normal" as const,
        },
      ],
      displayData: {},
    };
    const parsed = parseSurfaceSpec(spec, "readonly");
    expect(parsed.components[0]).toEqual(spec.components[0]);
  });

  it("rejects /proposal, /requestId, arbitrary JSON pointers, and prototype keys", () => {
    for (const badPath of [
      "/proposal",
      "/proposal/items",
      "/requestId",
      "/display/nested/key",
      "/other/value",
      "display/value",
      "/display/__proto__",
      "/display/constructor",
      "/display/prototype",
      "/display/toString",
    ]) {
      expect(() =>
        parseSurfaceSpec(
          {
            fallbackText: "Bad path",
            components: [
              {
                id: "root",
                component: "Text",
                value: { path: badPath },
                emphasis: "normal",
              },
            ],
            displayData: { value: "ok" },
          },
          "readonly",
        ),
      ).toThrow();
    }

    expect(() =>
      parseSurfaceSpec(
        {
          fallbackText: "Bad display key",
          components: [{ id: "root", component: "Card", children: [] }],
          displayData: { constructor: "bad" },
        },
        "readonly",
      ),
    ).toThrow();
  });

  it("enforces Text scalar bindings and Table column/row constraints", () => {
    // Text bound to array fails
    expect(() =>
      parseSurfaceSpec(
        {
          fallbackText: "Plan",
          components: [
            {
              id: "root",
              component: "Text",
              value: { path: "/display/rows" },
              emphasis: "normal",
            },
          ],
          displayData: { rows: [{ a: 1 }] },
        },
        "readonly",
      ),
    ).toThrow();

    // Table bound to scalar fails
    expect(() =>
      parseSurfaceSpec(
        {
          fallbackText: "Plan",
          components: [
            {
              id: "root",
              component: "Table",
              columns: [{ key: "a", label: "A" }],
              rowsPath: "/display/scalar",
            },
          ],
          displayData: { scalar: "not an array" },
        },
        "readonly",
      ),
    ).toThrow();

    // Table row column mismatch (missing key or extra key)
    expect(() =>
      parseSurfaceSpec(
        {
          fallbackText: "Plan",
          components: [
            {
              id: "root",
              component: "Table",
              columns: [
                { key: "a", label: "A" },
                { key: "b", label: "B" },
              ],
              rowsPath: "/display/rows",
            },
          ],
          displayData: { rows: [{ a: "only a" }] },
        },
        "readonly",
      ),
    ).toThrow();

    expect(() =>
      parseSurfaceSpec(
        {
          fallbackText: "Plan",
          components: [
            {
              id: "root",
              component: "Table",
              columns: [{ key: "a", label: "A" }],
              rowsPath: "/display/rows",
            },
          ],
          displayData: { rows: [{ a: "ok", extra: "bad" }] },
        },
        "readonly",
      ),
    ).toThrow();

    // Duplicate column keys
    expect(() =>
      parseSurfaceSpec(
        {
          fallbackText: "Plan",
          components: [
            {
              id: "root",
              component: "Table",
              columns: [
                { key: "a", label: "A1" },
                { key: "a", label: "A2" },
              ],
              rowsPath: "/display/rows",
            },
          ],
          displayData: { rows: [] },
        },
        "readonly",
      ),
    ).toThrow();

    // 13 columns rejected, 12 columns and 50 rows accepted, 51 rows rejected
    const twelveCols = Array.from({ length: 12 }, (_, i) => ({
      key: `col_${i}`,
      label: `Col ${i}`,
    }));
    const rowObj = Object.fromEntries(
      twelveCols.map((c, i) => [c.key, i % 2 === 0 ? `val_${i}` : i]),
    );
    const fiftyRows = Array.from({ length: 50 }, () => ({ ...rowObj }));

    expect(
      parseSurfaceSpec(
        {
          fallbackText: "Max table",
          components: [
            {
              id: "root",
              component: "Table",
              columns: twelveCols,
              rowsPath: "/display/rows",
            },
          ],
          displayData: { rows: fiftyRows },
        },
        "readonly",
      ).displayData.rows,
    ).toHaveLength(50);

    expect(() =>
      parseSurfaceSpec(
        {
          fallbackText: "Too many cols",
          components: [
            {
              id: "root",
              component: "Table",
              columns: [...twelveCols, { key: "col_12", label: "Col 12" }],
              rowsPath: "/display/rows",
            },
          ],
          displayData: { rows: [] },
        },
        "readonly",
      ),
    ).toThrow();

    expect(() =>
      parseSurfaceSpec(
        {
          fallbackText: "Too many rows",
          components: [
            {
              id: "root",
              component: "Table",
              columns: twelveCols,
              rowsPath: "/display/rows",
            },
          ],
          displayData: { rows: [...fiftyRows, { ...rowObj }] },
        },
        "readonly",
      ),
    ).toThrow();
  });

  it("enforces mode rules for task components", () => {
    expect(() => parseSurfaceSpec(fixture.proposal, "readonly")).toThrow();
    expect(() => parseSurfaceSpec(fixture.readonly, "proposal")).toThrow();

    // Mixing TaskProposalForm with TaskList/TaskProposalActions is invalid
    expect(() =>
      parseSurfaceSpec(
        {
          fallbackText: "Mixed",
          components: [
            {
              id: "root",
              component: "Column",
              children: ["form", "list", "actions"],
              gap: "sm",
            },
            { id: "form", component: "TaskProposalForm" },
            { id: "list", component: "TaskList" },
            { id: "actions", component: "TaskProposalActions" },
          ],
          displayData: {},
        },
        "proposal",
      ),
    ).toThrow();

    // TaskList without TaskProposalActions is invalid
    expect(() =>
      parseSurfaceSpec(
        {
          fallbackText: "Incomplete split",
          components: [
            {
              id: "root",
              component: "Column",
              children: ["list"],
              gap: "sm",
            },
            { id: "list", component: "TaskList" },
          ],
          displayData: {},
        },
        "proposal",
      ),
    ).toThrow();
  });

  it("rejects oversized Unicode payloads exceeding 128 KiB before traversal", () => {
    // 45,000 3-byte UTF-8 characters = 135,000 bytes (> 131,072 bytes)
    const bigEmoji = "ă".repeat(70_000);
    expect(() =>
      parseSurfaceSpec(
        {
          fallbackText: "Oversized",
          components: [
            {
              id: "root",
              component: "Text",
              value: { literal: bigEmoji },
              emphasis: "normal",
            },
          ],
          displayData: {},
        },
        "readonly",
      ),
    ).toThrow(/128 KiB/);
  });
});
