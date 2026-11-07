import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { compileSurface } from "../A2UI/uiSurfaceService.js";
import {
  UI_COMPOSITION_CATALOG_ID,
  type StoredUiSurface,
} from "../../types/A2UI/IUiSurface.js";

const specFixturePath = resolve(
  process.cwd(),
  "../frontend/src/test/fixtures/ui-composition-spec.json",
);
const compiledFixturePath = resolve(
  process.cwd(),
  "../frontend/src/test/fixtures/a2ui-composition-v09.json",
);
const specFixture = JSON.parse(readFileSync(specFixturePath, "utf-8"));
const compiledFixture = JSON.parse(readFileSync(compiledFixturePath, "utf-8"));

describe("uiSurfaceService.compileSurface", () => {
  it("compiles a readonly StoredUiSurface to the exact A2UI v0.9 fixture", () => {
    const stored: StoredUiSurface = {
      catalogId: UI_COMPOSITION_CATALOG_ID,
      surfaceId: specFixture.surfaceId,
      spec: specFixture.readonly,
    };

    const envelope = compileSurface(stored);
    expect(envelope).toEqual(compiledFixture.readonly);
  });

  it("compiles a composable proposal StoredUiSurface to the exact A2UI v0.9 fixture", () => {
    const stored: StoredUiSurface = {
      catalogId: UI_COMPOSITION_CATALOG_ID,
      surfaceId: specFixture.surfaceId,
      spec: specFixture.proposal,
    };

    const envelope = compileSurface(stored, specFixture.proposalView);
    expect(envelope).toEqual(compiledFixture.proposal);
  });

  it("injects save, confirm, and cancel actions on TaskProposalForm in proposal mode", () => {
    const stored: StoredUiSurface = {
      catalogId: UI_COMPOSITION_CATALOG_ID,
      surfaceId: specFixture.surfaceId,
      spec: {
        fallbackText: "Summary",
        components: [
          {
            id: "root",
            component: "Column",
            children: ["formNode"],
            gap: "sm",
          },
          {
            id: "formNode",
            component: "TaskProposalForm",
          },
        ],
        displayData: {},
      },
    };

    const envelope = compileSurface(stored, specFixture.proposalView);
    const updateComponents = envelope.a2ui.messages[1] as {
      updateComponents: { components: Record<string, unknown>[] };
    };
    const formComp = updateComponents.updateComponents.components.find(
      (c) => c.id === "formNode",
    );
    expect(formComp).toEqual({
      id: "formNode",
      component: "TaskProposalForm",
      proposal: { path: "/proposal" },
      saveAction: {
        event: {
          name: "save",
          context: {
            proposal: { path: "/proposal" },
            requestId: { path: "/requestId" },
          },
        },
      },
      confirmAction: {
        event: {
          name: "confirm",
          context: {
            proposal: { path: "/proposal" },
            requestId: { path: "/requestId" },
          },
        },
      },
      cancelAction: {
        event: {
          name: "cancel",
          context: {
            proposal: { path: "/proposal" },
            requestId: { path: "/requestId" },
          },
        },
      },
    });
  });

  it("requires proposal data for proposal mode and rejects proposal data in readonly mode", () => {
    const readonlyStored: StoredUiSurface = {
      catalogId: UI_COMPOSITION_CATALOG_ID,
      surfaceId: specFixture.surfaceId,
      spec: specFixture.readonly,
    };
    const proposalStored: StoredUiSurface = {
      catalogId: UI_COMPOSITION_CATALOG_ID,
      surfaceId: specFixture.surfaceId,
      spec: specFixture.proposal,
    };

    expect(() =>
      compileSurface(readonlyStored, specFixture.proposalView),
    ).toThrow();
    expect(() => compileSurface(proposalStored)).toThrow();
  });

  it("compiles Card metadata, Stat, Chart, and Diagram nodes into v0.9 components", () => {
    const stored: StoredUiSurface = {
      catalogId: UI_COMPOSITION_CATALOG_ID,
      surfaceId: specFixture.surfaceId,
      spec: {
        fallbackText: "Rich summary",
        components: [
          {
            id: "root",
            component: "Card",
            title: "Weekly Focus",
            subtitle: "IELTS & Fitness",
            tone: "accent",
            children: ["stat1", "chart1", "diag1"],
          },
          {
            id: "stat1",
            component: "Stat",
            label: "Completion",
            value: { literal: "80%" },
            caption: "4 of 5 sessions",
            progress: 80,
            tone: "success",
          },
          {
            id: "chart1",
            component: "Chart",
            chartType: "line",
            title: "Trend",
            rowsPath: "/display/trend",
            labelKey: "day",
            series: [{ key: "hours", label: "Hours" }],
          },
          {
            id: "diag1",
            component: "Diagram",
            title: "Routine",
            value: { literal: "flowchart LR\n  A --> B" },
          },
        ],
        displayData: {
          trend: [
            { day: "Mon", hours: 2 },
            { day: "Tue", hours: 3 },
          ],
        },
      },
    };

    const envelope = compileSurface(stored);
    const updateComponents = envelope.a2ui.messages[1] as {
      updateComponents: { components: Record<string, unknown>[] };
    };
    expect(updateComponents.updateComponents.components).toEqual([
      {
        id: "root",
        component: "Card",
        title: "Weekly Focus",
        subtitle: "IELTS & Fitness",
        tone: "accent",
        children: ["stat1", "chart1", "diag1"],
      },
      {
        id: "stat1",
        component: "Stat",
        label: "Completion",
        value: "80%",
        caption: "4 of 5 sessions",
        progress: 80,
        tone: "success",
      },
      {
        id: "chart1",
        component: "Chart",
        chartType: "line",
        title: "Trend",
        rows: { path: "/display/trend" },
        labelKey: "day",
        series: [{ key: "hours", label: "Hours" }],
      },
      {
        id: "diag1",
        component: "Diagram",
        title: "Routine",
        value: "flowchart LR\n  A --> B",
      },
    ]);
  });
});
