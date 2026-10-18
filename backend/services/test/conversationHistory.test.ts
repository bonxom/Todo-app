import { expect, it } from "vitest";
import { prepareHistory } from "../conversationService.js";
it("bounds context by whole turns and restores chronological order", () => {
  const result = prepareHistory([
    { messages: [{ role: "user", content: "new" }, { role: "assistant", content: "reply" }] },
    { messages: [{ role: "user", content: "old" }] },
    { messages: [{ role: "user", content: "x".repeat(60000) }] },
  ]);
  expect(result.map((m) => m.content)).toEqual(["old", "new", "reply"]);
});
