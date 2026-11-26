import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseInteractiveSpec } from "../A2UI/interactiveUiValidation.js";
import { parseSurfaceSpec } from "../A2UI/uiSurfaceValidation.js";

const fixturePath = resolve(
  process.cwd(),
  "../frontend/src/test/fixtures/a2ui-interactive-v09.json",
);
const fixture = JSON.parse(readFileSync(fixturePath, "utf-8"));

describe("interactiveUiValidation", () => {
  it("accepts a valid Card/Text/Button tree and standalone Button", () => {
    expect(parseInteractiveSpec(fixture.spec)).toEqual(fixture.spec);

    const spec = {
      fallbackText: "Complete the selected task",
      components: [
        {
          id: "root",
          component: "Button",
          label: "Hoàn thành",
          actionKey: "finishTask",
        },
      ],
      displayData: {},
      actions: {
        finishTask: {
          name: "task.complete",
          taskId: "0123456789abcdef01234567",
        },
      },
    };
    expect(parseInteractiveSpec(spec)).toEqual(spec);
  });

  it("allows multiple buttons to reference the same declared action", () => {
    const spec = {
      fallbackText: "Complete task",
      components: [
        {
          id: "root",
          component: "Column",
          children: ["btn1", "btn2"],
          gap: "sm",
        },
        {
          id: "btn1",
          component: "Button",
          label: "Hoàn thành",
          actionKey: "finishTask",
        },
        {
          id: "btn2",
          component: "Button",
          label: "Xong ngay",
          actionKey: "finishTask",
        },
      ],
      displayData: {},
      actions: {
        finishTask: {
          name: "task.complete",
          taskId: "0123456789abcdef01234567",
        },
      },
    };
    expect(parseInteractiveSpec(spec)).toEqual(spec);
  });

  it("rejects undefined action keys, redundant actions, and injected bindings/handlers", () => {
    const spec = {
      fallbackText: "Complete the selected task",
      components: [
        {
          id: "root",
          component: "Button",
          label: "Hoàn thành",
          actionKey: "finishTask",
        },
      ],
      displayData: {},
      actions: {
        finishTask: {
          name: "task.complete",
          taskId: "0123456789abcdef01234567",
        },
      },
    };

    expect(() => parseInteractiveSpec({ ...spec, actions: {} })).toThrow();
    expect(() =>
      parseInteractiveSpec({ ...spec, actionBindings: [] }),
    ).toThrow();
    expect(() =>
      parseInteractiveSpec({
        ...spec,
        actions: {
          ...spec.actions,
          unusedAction: {
            name: "task.complete",
            taskId: "0123456789abcdef01234567",
          },
        },
      }),
    ).toThrow();
    expect(() =>
      parseInteractiveSpec({
        ...spec,
        components: [
          {
            ...spec.components[0],
            onClick: "fetch('/api/tasks')",
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      parseInteractiveSpec({
        ...spec,
        components: [
          {
            ...spec.components[0],
            endpoint: "/api/tasks",
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects invalid task IDs, unknown action names, prototype action keys, and >10 actions", () => {
    expect(() =>
      parseInteractiveSpec({
        fallbackText: "Bad task ID",
        components: [
          {
            id: "root",
            component: "Button",
            label: "Done",
            actionKey: "finishTask",
          },
        ],
        displayData: {},
        actions: {
          finishTask: { name: "task.complete", taskId: "not-an-object-id" },
        },
      }),
    ).toThrow();

    expect(() =>
      parseInteractiveSpec({
        fallbackText: "Unknown action",
        components: [
          {
            id: "root",
            component: "Button",
            label: "Delete",
            actionKey: "deleteTask",
          },
        ],
        displayData: {},
        actions: {
          deleteTask: {
            name: "task.delete",
            taskId: "0123456789abcdef01234567",
          },
        },
      }),
    ).toThrow();

    expect(() =>
      parseInteractiveSpec({
        fallbackText: "Proto key",
        components: [
          {
            id: "root",
            component: "Button",
            label: "Done",
            actionKey: "constructor",
          },
        ],
        displayData: {},
        actions: {
          constructor: {
            name: "task.complete",
            taskId: "0123456789abcdef01234567",
          },
        },
      }),
    ).toThrow();

    const elevenActions = Object.fromEntries(
      Array.from({ length: 11 }, (_, i) => [
        `act_${i}`,
        { name: "task.complete", taskId: "0123456789abcdef01234567" },
      ]),
    );
    const elevenButtons = Array.from({ length: 11 }, (_, i) => ({
      id: `btn_${i}`,
      component: "Button",
      label: `Done ${i}`,
      actionKey: `act_${i}`,
    }));
    expect(() =>
      parseInteractiveSpec({
        fallbackText: "Too many actions",
        components: [
          {
            id: "root",
            component: "Column",
            children: elevenButtons.map((b) => b.id),
            gap: "sm",
          },
          ...elevenButtons,
        ],
        displayData: {},
        actions: elevenActions,
      }),
    ).toThrow();
  });

  it("rejects Task Proposal nodes inside interactive specs and rejects Button inside legacy composition specs", () => {
    expect(() =>
      parseInteractiveSpec({
        fallbackText: "No proposals here",
        components: [
          {
            id: "root",
            component: "Column",
            children: ["form", "btn"],
            gap: "sm",
          },
          { id: "form", component: "TaskProposalForm" },
          {
            id: "btn",
            component: "Button",
            label: "Done",
            actionKey: "finishTask",
          },
        ],
        displayData: {},
        actions: {
          finishTask: {
            name: "task.complete",
            taskId: "0123456789abcdef01234567",
          },
        },
      }),
    ).toThrow();

    expect(() =>
      parseSurfaceSpec(
        {
          fallbackText: "No button in readonly",
          components: [
            {
              id: "root",
              component: "Button",
              label: "Done",
              actionKey: "finishTask",
            },
          ],
          displayData: {},
        },
        "readonly",
      ),
    ).toThrow();
  });

  it("reuses shared graph limits (cycles, depth 10, 100 nodes, 128 KiB)", () => {
    const makeChain = (depth: number) =>
      Array.from({ length: depth }, (_, i) => {
        const id = i === 0 ? "root" : `node_${i}`;
        if (i === depth - 1) {
          return {
            id,
            component: "Button",
            label: "Finish",
            actionKey: "finishTask",
          };
        }
        return {
          id,
          component: "Card",
          children: [`node_${i + 1}`],
        };
      });

    const actions = {
      finishTask: {
        name: "task.complete",
        taskId: "0123456789abcdef01234567",
      },
    };

    expect(
      parseInteractiveSpec({
        fallbackText: "Depth 10",
        components: makeChain(10),
        displayData: {},
        actions,
      }).components,
    ).toHaveLength(10);

    expect(() =>
      parseInteractiveSpec({
        fallbackText: "Depth 11",
        components: makeChain(11),
        displayData: {},
        actions,
      }),
    ).toThrow();

    expect(() =>
      parseInteractiveSpec({
        fallbackText: "Oversized",
        components: [
          {
            id: "root",
            component: "Column",
            children: ["txt", "btn"],
            gap: "sm",
          },
          {
            id: "txt",
            component: "Text",
            value: { literal: "a".repeat(130 * 1024) },
            emphasis: "normal",
          },
          {
            id: "btn",
            component: "Button",
            label: "Finish",
            actionKey: "finishTask",
          },
        ],
        displayData: {},
        actions,
      }),
    ).toThrow(/128 KiB/);
  });
});
