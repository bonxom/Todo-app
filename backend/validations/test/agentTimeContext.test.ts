import { describe, it, expect } from "vitest";
import { conversationChatSchema } from "../aiValidation.js";
import { randomUUID } from "node:crypto";

describe("conversationChatSchema timeZone field", () => {
  const validBase = {
    userInput: "Hôm nay?",
    conversationId: randomUUID(),
    requestId: randomUUID(),
  };

  it("accepts a valid IANA timezone", () => {
    const result = conversationChatSchema.safeParse({
      ...validBase,
      timeZone: "Asia/Ho_Chi_Minh",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.timeZone).toBe("Asia/Ho_Chi_Minh");
    }
  });

  it("accepts UTC", () => {
    const result = conversationChatSchema.safeParse({
      ...validBase,
      timeZone: "UTC",
    });
    expect(result.success).toBe(true);
  });

  it("rejects pure offset timezone (+07:00)", () => {
    const result = conversationChatSchema.safeParse({
      ...validBase,
      timeZone: "+07:00",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid timezone string", () => {
    const result = conversationChatSchema.safeParse({
      ...validBase,
      timeZone: "Not/A/Zone",
    });
    expect(result.success).toBe(false);
  });

  it("accepts missing timeZone (optional)", () => {
    const result = conversationChatSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.timeZone).toBeUndefined();
    }
  });

  it("rejects timezone longer than 100 characters", () => {
    const result = conversationChatSchema.safeParse({
      ...validBase,
      timeZone: "A".repeat(101),
    });
    expect(result.success).toBe(false);
  });
});
