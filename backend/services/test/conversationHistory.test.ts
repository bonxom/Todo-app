import { expect, it } from "vitest";
import { prepareHistory } from "../../utils/agentMessages.js";
it("bounds context by whole turns and restores chronological order", () => {
  const result = prepareHistory([
    {
      messages: [
        { role: "user", content: "new" },
        { role: "assistant", content: "reply" },
      ],
    },
    { messages: [{ role: "user", content: "old" }] },
    { messages: [{ role: "user", content: "x".repeat(60000) }] },
  ]);
  expect(result.map((m) => m.content)).toEqual(["old", "new", "reply"]);
});

it("compacts old successful loader results before the history limit without mutating stored turns", () => {
  const turns = [{ messages: [
    { role: "assistant" as const, tool_calls: [{ id: "load-old", type: "function" as const, function: { name: "load_skill", arguments: '{"skillId":"ielts"}' } }] },
    { role: "tool" as const, tool_call_id: "load-old", content: JSON.stringify({ skillId: "ielts", document: "SKILL.md", version: "old", text: "x".repeat(60000) }) },
  ] }];
  const before = structuredClone(turns);
  const result = prepareHistory(turns);
  expect(result).toHaveLength(2);
  expect(JSON.parse(result[1].content as string)).toMatchObject({ previouslyLoaded: true, validForCurrentTurn: false });
  expect(turns).toEqual(before);
});
