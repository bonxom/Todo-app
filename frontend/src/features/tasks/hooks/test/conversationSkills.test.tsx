import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useConversationSession } from "../useConversationSession";

describe("conversation skill read metadata", () => {
  it("keeps live skill reads on both answers and pending questions", () => {
    const { result } = renderHook(() =>
      useConversationSession({ skipInitialLoad: true }),
    );
    const skillsRead = [{ id: "skill-one", name: "Writing", version: 2 }];
    act(() =>
      result.current.receive(
        { success: true, message: "ok", data: "Answer", skillsRead },
        "first",
      ),
    );
    expect(result.current.messages.at(-1)?.skillsRead).toEqual(skillsRead);
    act(() =>
      result.current.receive(
        {
          success: true,
          message: "ok",
          data: "Choose",
          skillsRead,
          interaction: {
            id: "question",
            kind: "clarification",
            question: "Choose",
            options: [],
            allowCustomAnswer: true,
            status: "pending",
          },
        },
        "second",
      ),
    );
    expect(result.current.messages.at(-1)?.interaction?.id).toBe("question");
    expect(result.current.messages.at(-1)?.skillsRead).toEqual(skillsRead);
  });
});
