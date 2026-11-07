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
  const turns = [
    {
      messages: [
        {
          role: "assistant" as const,
          tool_calls: [
            {
              id: "load-old",
              type: "function" as const,
              function: {
                name: "load_skill",
                arguments: '{"skillId":"ielts"}',
              },
            },
          ],
        },
        {
          role: "tool" as const,
          tool_call_id: "load-old",
          content: JSON.stringify({
            skillId: "ielts",
            document: "SKILL.md",
            version: "old",
            text: "x".repeat(60000),
          }),
        },
      ],
    },
  ];
  const before = structuredClone(turns);
  const result = prepareHistory(turns);
  expect(result).toHaveLength(2);
  expect(JSON.parse(result[1].content as string)).toMatchObject({
    previouslyLoaded: true,
    validForCurrentTurn: false,
  });
  expect(turns).toEqual(before);
});

it("compacts old successful personal read_skill results and removes full instructions", () => {
  const turns = [
    {
      messages: [
        {
          role: "assistant" as const,
          tool_calls: [
            {
              id: "read-old",
              type: "function" as const,
              function: {
                name: "read_skill",
                arguments:
                  '{"skillId":"11111111-1111-4111-8111-111111111111","version":1}',
              },
            },
          ],
        },
        {
          role: "tool" as const,
          tool_call_id: "read-old",
          content: JSON.stringify({
            id: "11111111-1111-4111-8111-111111111111",
            name: "My Grammar",
            version: 1,
            instructions: "SUPER_SECRET_OLD_INSTRUCTIONS",
          }),
        },
      ],
      status: "completed",
    },
  ];
  const result = prepareHistory(turns);
  expect(result).toHaveLength(2);
  const toolMsg = JSON.parse(result[1].content as string);
  expect(toolMsg).toMatchObject({
    id: "11111111-1111-4111-8111-111111111111",
    name: "My Grammar",
    version: 1,
    previouslyLoaded: true,
    validForCurrentTurn: false,
  });
  expect(toolMsg.instructions).toBeUndefined();
  expect(JSON.stringify(result)).not.toContain("SUPER_SECRET_OLD_INSTRUCTIONS");
});

it("preserves task proposal turns with propose_tasks tool calls and assistant summary", () => {
  const turns = [
    {
      messages: [
        { role: "user" as const, content: "Draft 2 tasks" },
        {
          role: "assistant" as const,
          tool_calls: [
            {
              id: "prop-1",
              type: "function" as const,
              function: {
                name: "propose_tasks",
                arguments: '{"items":[{"title":"Task 1"}]}',
              },
            },
          ],
        },
        {
          role: "tool" as const,
          tool_call_id: "prop-1",
          content: JSON.stringify({ status: "proposed", count: 1 }),
        },
        { role: "assistant" as const, content: "Here is your proposal." },
      ],
      status: "completed",
    },
  ];
  const history = prepareHistory(turns);
  expect(history).toHaveLength(4);
  expect(history[0]).toEqual({ role: "user", content: "Draft 2 tasks" });
  expect(history[1]).toMatchObject({
    role: "assistant",
    tool_calls: [expect.objectContaining({ id: "prop-1" })],
  });
  expect(history[2]).toEqual({
    role: "tool",
    tool_call_id: "prop-1",
    content: JSON.stringify({ status: "proposed", count: 1 }),
  });
  expect(history[3]).toEqual({
    role: "assistant",
    content: "Here is your proposal.",
  });
});

it("includes activities in resultFor with safe DTO and preserves them when final response is empty or awaiting_user", async () => {
  const { resultFor } = await import("../../utils/conversationView.js");
  const activity = {
    id: "act-1",
    requestId: "r1",
    toolCallId: "c1",
    kind: "task_created" as const,
    status: "succeeded" as const,
    title: "Created task",
    resourceType: "task" as const,
    resourceId: "t1",
    occurredAt: "2026-11-06T00:00:00.000Z",
  };

  const completed = resultFor({
    conversationId: "conv-1",
    requestId: "r1",
    status: "completed",
    response: "Done",
    interactions: [],
    expiresAt: new Date(Date.now() + 60000),
    activities: [activity],
  });
  expect(completed.activities).toEqual([activity]);

  const awaitingUser = resultFor({
    conversationId: "conv-1",
    requestId: "r1",
    status: "awaiting_user",
    response: "",
    interactions: [],
    expiresAt: new Date(Date.now() + 60000),
    activities: [activity],
  });
  expect(awaitingUser.activities).toEqual([activity]);

  const legacy = resultFor({
    conversationId: "conv-1",
    requestId: "r1",
    status: "completed",
    response: "Old",
    interactions: [],
    expiresAt: new Date(Date.now() + 60000),
  });
  expect(legacy.activities).toEqual([]);
});

it("includes surface in resultFor and turnMessages when provided in envelope", async () => {
  const { resultFor, turnMessages } = await import(
    "../../utils/conversationView.js"
  );
  const surface = {
    text: "Study Plan",
    a2ui: {
      protocolVersion: "v0.9" as const,
      catalogId: "urn:orbit:a2ui:composition:v1",
      surfaceId: "11111111-1111-4111-8111-111111111111",
      messages: [],
    },
  };

  const res = resultFor(
    {
      conversationId: "conv-1",
      requestId: "r1",
      status: "completed",
      response: "Study Plan",
      interactions: [],
      expiresAt: new Date(Date.now() + 60000),
    },
    { surface, text: surface.text },
  );
  expect(res.surface).toEqual(surface);
  expect(res.data).toBe("Study Plan");

  const msgs = turnMessages(
    {
      _id: "turn-1",
      conversationId: "conv-1",
      userId: "507f1f77bcf86cd799439011" as never,
      requestId: "r1",
      sequence: 1,
      userInput: "Show study plan",
      status: "completed",
      mode: "auto",
      executionToken: "tok",
      interactions: [],
      response: "Study Plan",
      messages: [],
      expiresAt: new Date(Date.now() + 60000),
      createdAt: new Date("2026-11-07T00:00:00.000Z"),
      updatedAt: new Date("2026-11-07T00:00:00.000Z"),
    },
    { surface, text: surface.text },
  );
  expect(msgs.at(-1)).toMatchObject({ surface });
});
