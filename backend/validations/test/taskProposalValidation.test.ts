import { describe, expect, it } from "vitest";
import {
  proposalActionSchema,
  proposalItemsSchema,
  proposalParamsSchema,
} from "../A2UI/taskProposalValidation.js";

describe("taskProposalValidation", () => {
  const validItem = {
    id: "00000000-0000-4000-8000-000000000001",
    title: "Read documentation",
    description: "Read the A2UI spec",
    priority: "High" as const,
    categoryId: "507f1f77bcf86cd799439011",
    projectId: "507f1f77bcf86cd799439012",
    startDate: "2026-11-05T09:00:00.000Z",
    dueDate: "2026-11-06T17:00:00.000Z",
  };

  it("rejects duplicate items, whitespace titles and injected identity", () => {
    const item = { id: "00000000-0000-4000-8000-000000000001", title: "Read" };
    expect(proposalItemsSchema.safeParse([item, item]).success).toBe(false);
    expect(
      proposalItemsSchema.safeParse([{ ...item, title: "  " }]).success,
    ).toBe(false);
    expect(
      proposalItemsSchema.safeParse([{ ...item, userId: "other" }]).success,
    ).toBe(false);
  });

  it("validates 1 to 20 proposal items and rejects empty or oversized lists", () => {
    expect(proposalItemsSchema.safeParse([]).success).toBe(false);

    const twentyItems = Array.from({ length: 20 }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
      title: `Task ${i + 1}`,
    }));
    expect(proposalItemsSchema.safeParse(twentyItems).success).toBe(true);

    const twentyOneItems = [
      ...twentyItems,
      {
        id: "00000000-0000-4000-8000-000000000021",
        title: "Task 21",
      },
    ];
    expect(proposalItemsSchema.safeParse(twentyOneItems).success).toBe(false);
  });

  it("enforces start date cannot be after due date", () => {
    const invalidDatesItem = {
      ...validItem,
      startDate: "2026-11-10T00:00:00.000Z",
      dueDate: "2026-11-05T00:00:00.000Z",
    };
    expect(proposalItemsSchema.safeParse([invalidDatesItem]).success).toBe(
      false,
    );
  });

  it.each([
    "2026-02-30",
    "2026-13-01",
    "2026-11-04T25:70",
    "2026/02/29",
    "2026-02-30T09:00:00.000Z",
    "invalid",
  ])("rejects invalid calendar/time value %s in either date field", (date) => {
    for (const field of ["startDate", "dueDate"] as const) {
      const result = proposalItemsSchema.safeParse([
        {
          id: validItem.id,
          title: "Read",
          [field]: date,
        },
      ]);
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues[0].path).toEqual([0, field]);
    }
  });

  it.each([
    "2028-02-29",
    "2028/02/29",
    "2026-11-04T09:30",
    "2026/11/04 09:30",
    "2026-11-04T09:30:00.123Z",
    "2026-11-04T09:30:00+07:00",
    "",
  ])("preserves supported valid date format %s", (date) => {
    expect(
      proposalItemsSchema.safeParse([
        { id: validItem.id, title: "Read", dueDate: date },
      ]).success,
    ).toBe(true);
  });

  it("compares instants across timezone offsets", () => {
    expect(
      proposalItemsSchema.safeParse([
        {
          ...validItem,
          startDate: "2026-11-04T10:00:00+07:00",
          dueDate: "2026-11-04T04:00:00Z",
        },
      ]).success,
    ).toBe(true);
  });

  it("accepts null/undefined optional fields and normalizes trimmed title", () => {
    const minimalItem = {
      id: "00000000-0000-4000-8000-000000000001",
      title: "  Trimmed Title  ",
      projectId: null,
      startDate: null,
      dueDate: null,
    };
    const parsed = proposalItemsSchema.safeParse([minimalItem]);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data[0].title).toBe("Trimmed Title");
    }
  });

  describe("proposalActionSchema", () => {
    const requestId = "11111111-1111-4111-8111-111111111111";

    it("validates save action with zero or more selected items", () => {
      const result = proposalActionSchema.safeParse({
        requestId,
        revision: 1,
        action: "save",
        items: [validItem],
        selectedItemIds: [],
      });
      expect(result.success).toBe(true);
    });

    it("rejects confirm action with zero selected items", () => {
      const result = proposalActionSchema.safeParse({
        requestId,
        revision: 1,
        action: "confirm",
        items: [validItem],
        selectedItemIds: [],
      });
      expect(result.success).toBe(false);
    });

    it("validates confirm action with at least one selected item", () => {
      const result = proposalActionSchema.safeParse({
        requestId,
        revision: 1,
        action: "confirm",
        items: [validItem],
        selectedItemIds: [validItem.id],
      });
      expect(result.success).toBe(true);
    });

    it("rejects selected item IDs that are not in items", () => {
      const result = proposalActionSchema.safeParse({
        requestId,
        revision: 1,
        action: "confirm",
        items: [validItem],
        selectedItemIds: ["99999999-9999-4999-8999-999999999999"],
      });
      expect(result.success).toBe(false);
    });

    it("validates cancel action and rejects unknown fields", () => {
      const validCancel = proposalActionSchema.safeParse({
        requestId,
        revision: 2,
        action: "cancel",
      });
      expect(validCancel.success).toBe(true);

      const invalidCancel = proposalActionSchema.safeParse({
        requestId,
        revision: 2,
        action: "cancel",
        extraField: "bad",
      });
      expect(invalidCancel.success).toBe(false);
    });
  });

  describe("proposalParamsSchema", () => {
    it("validates conversationId and UUID proposalId", () => {
      expect(
        proposalParamsSchema.safeParse({
          conversationId: "11111111-1111-4111-8111-111111111111",
          proposalId: "00000000-0000-4000-8000-000000000001",
        }).success,
      ).toBe(true);

      expect(
        proposalParamsSchema.safeParse({
          conversationId: "",
          proposalId: "invalid-uuid",
        }).success,
      ).toBe(false);
    });

    it("rejects non-UUID conversation IDs", () => {
      expect(
        proposalParamsSchema.safeParse({
          conversationId: "conv-123",
          proposalId: validItem.id,
        }).success,
      ).toBe(false);
    });
  });
});
