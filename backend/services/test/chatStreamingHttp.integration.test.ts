import http from "node:http";
import { randomUUID } from "node:crypto";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import TaskProposal from "../../models/A2UI/TaskProposal.js";
import {
  connectChatTestMongo,
  disconnectChatTestMongo,
  createUserAndConversations,
  hasChatTestMongo,
} from "../../test/helpers/chatMongo.js";
import aiRoutes from "../../routes/aiRoutes.js";
import { requestContext, errorHandler } from "../../error/index.js";
import { chatRunService } from "../chatRunService.js";

function listen(server: http.Server): Promise<string> {
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as import("node:net").AddressInfo;
      resolve(`http://127.0.0.1:${address.port}`);
    }),
  );
}
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe.skipIf(!hasChatTestMongo())(
  "HTTP streaming with real SDK, runner and MongoDB",
  () => {
    let backend: http.Server;
    let provider: http.Server;
    let backendUrl: string;
    let release = deferred();
    let useTool = false;
    let lastProviderRequest: any = null;

    beforeAll(async () => {
      await connectChatTestMongo("orbit_chat_http");
      provider = http.createServer(async (req, res) => {
        let body = "";
        for await (const chunk of req) body += chunk;
        const request = JSON.parse(body);
        lastProviderRequest = request;
        res.writeHead(200, { "Content-Type": "text/event-stream" });
        const send = (delta: object, finish_reason: string | null = null) =>
          res.write(
            `data: ${JSON.stringify({ id: "http-fixture", object: "chat.completion.chunk", created: 1, model: "fixture", choices: [{ index: 0, delta, finish_reason, logprobs: null }] })}\n\n`,
          );
        const answered = request.messages.some(
          (message: { role: string; tool_call_id?: string }) =>
            message.role === "tool" &&
            message.tool_call_id === "categories-call",
        );
        if (useTool && !answered) {
          send(
            {
              tool_calls: [
                {
                  index: 0,
                  id: "categories-call",
                  type: "function",
                  function: { name: "orbit_list_categories", arguments: "{}" },
                },
              ],
            },
            "tool_calls",
          );
        } else {
          send({ content: "Nội dung đầu tiên " });
          res.on("close", () => release.resolve());
          await release.promise;
          if (res.destroyed) return;
          send({ content: "và phần kết thúc." }, "stop");
        }
        res.end("data: [DONE]\n\n");
      });
      const providerUrl = await listen(provider);
      vi.stubEnv("AI_API_KEY", "fixture-only-key");
      vi.stubEnv("AI_BASE_URL", `${providerUrl}/v1`);
      vi.stubEnv("AI_MODEL_NAME", "fixture");
      vi.stubEnv("JWT_SECRET", "fixture-only-jwt-secret");
      vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", "false");
      const app = express();
      app.use(requestContext, express.json());
      app.use("/api/ai", aiRoutes);
      app.use(errorHandler);
      backend = http.createServer(app);
      backendUrl = await listen(backend);
    });
    afterAll(async () => {
      release.resolve();
      await chatRunService.shutdown();
      chatRunService._resetForTest();
      backend?.closeAllConnections();
      provider?.closeAllConnections();
      await Promise.all(
        [backend, provider]
          .filter(Boolean)
          .map(
            (server) =>
              new Promise<void>((resolve) => server.close(() => resolve())),
          ),
      );
      await disconnectChatTestMongo();
      vi.unstubAllEnvs();
    });

    it.each(["ask", "auto"])(
      "streams %s text and tool events before completion, then resumes after disconnect",
      async (mode) => {
        release = deferred();
        useTool = true;
        const { userId, conversationIds } = await createUserAndConversations(1);
        const headers = {
          Authorization: `Bearer ${jwt.sign({ id: userId }, "fixture-only-jwt-secret", { expiresIn: "1h" })}`,
          "Content-Type": "application/json",
        };
        const base = `${backendUrl}/api/ai/conversations/${conversationIds[0]}/turns`;
        const start = await fetch(base, {
          method: "POST",
          headers,
          body: JSON.stringify({
            requestId: randomUUID(),
            userInput: "List categories",
            mode,
          }),
        });
        expect(start.status).toBe(202);
        const { data: initial } = await start.json();
        const abort = new AbortController();
        const response = await fetch(
          `${base}/${initial.turnId}/events?after=0`,
          { headers, signal: abort.signal },
        );
        expect(response.headers.get("content-type")).toContain(
          "text/event-stream",
        );
        const reader = response.body!.getReader();
        let frames = "";
        const deadline = AbortSignal.timeout(5000);
        while (!frames.includes("assistant.delta")) {
          deadline.throwIfAborted();
          const next = await reader.read();
          expect(next.done).toBe(false);
          frames += new TextDecoder().decode(next.value);
        }
        expect(frames).toContain("tool.started");
        expect(frames).toContain("tool.finished");
        expect(frames).toContain("Nội dung đầu tiên");
        expect(frames).not.toContain("turn.finished");
        const live = await fetch(`${base}/${initial.turnId}`, { headers }).then(
          (r) => r.json(),
        );
        expect(live.data.status).toBe("processing");
        expect(live.data.partialResponse).toBe("Nội dung đầu tiên ");
        abort.abort();
        await reader.cancel().catch(() => {});
        release.resolve();
        await vi.waitFor(
          async () => {
            const done = await fetch(`${base}/${initial.turnId}`, {
              headers,
            }).then((r) => r.json());
            expect(done.data.status).toBe("completed");
            expect(done.data.result.response).toBe(
              "Nội dung đầu tiên và phần kết thúc.",
            );
          },
          { timeout: 5000 },
        );
        const replay = await fetch(
          `${base}/${initial.turnId}/events?after=${live.data.lastEventSeq}`,
          { headers },
        ).then((r) => r.text());
        expect(replay.match(/event: turn.finished/g)).toHaveLength(1);
        expect(replay).toContain("và phần kết thúc.");
      },
      10000,
    );

    it("cancels a real in-flight provider stream and retains the partial response", async () => {
      release = deferred();
      useTool = false;
      const { userId, conversationIds } = await createUserAndConversations(1);
      const headers = {
        Authorization: `Bearer ${jwt.sign({ id: userId }, "fixture-only-jwt-secret", { expiresIn: "1h" })}`,
        "Content-Type": "application/json",
      };
      const base = `${backendUrl}/api/ai/conversations/${conversationIds[0]}/turns`;
      const initial = await fetch(base, {
        method: "POST",
        headers,
        body: JSON.stringify({
          requestId: randomUUID(),
          userInput: "Long reply",
        }),
      }).then((r) => r.json());
      await vi.waitFor(async () => {
        const live = await fetch(`${base}/${initial.data.turnId}`, {
          headers,
        }).then((r) => r.json());
        expect(live.data.partialResponse).toBe("Nội dung đầu tiên ");
      });
      const cancel = await fetch(`${base}/${initial.data.turnId}/cancel`, {
        method: "POST",
        headers,
        body: "{}",
      });
      expect(cancel.status).toBe(202);
      await vi.waitFor(async () => {
        const done = await fetch(`${base}/${initial.data.turnId}`, {
          headers,
        }).then((r) => r.json());
        expect(done.data.status).toBe("cancelled");
        expect(done.data.result.response).toBe("Nội dung đầu tiên ");
      });
    });

    it("includes confirmed proposal context in streaming turn provider request", async () => {
      release = deferred();
      useTool = false;
      const { userId, conversationIds } = await createUserAndConversations(1);
      const headers = {
        Authorization: `Bearer ${jwt.sign({ id: userId }, "fixture-only-jwt-secret", { expiresIn: "1h" })}`,
        "Content-Type": "application/json",
      };
      await TaskProposal.create({
        userId: new mongoose.Types.ObjectId(userId),
        conversationId: conversationIds[0],
        turnId: randomUUID(),
        proposalId: "stream-prop-1",
        status: "created",
        createdTasks: [{ taskId: "stream-task-1", title: "Stream task" }],
      });
      const base = `${backendUrl}/api/ai/conversations/${conversationIds[0]}/turns`;
      const initial = await fetch(base, {
        method: "POST",
        headers,
        body: JSON.stringify({
          requestId: randomUUID(),
          userInput: "Check proposals",
        }),
      }).then((r) => r.json());
      release.resolve();
      await vi.waitFor(async () => {
        const live = await fetch(`${base}/${initial.data.turnId}`, {
          headers,
        }).then((r) => r.json());
        expect(live.data.status).toBe("completed");
      });
      const systemMessage = lastProviderRequest?.messages?.find(
        (m: { role: string }) => m.role === "system",
      )?.content;
      expect(systemMessage).toContain(
        "Confirmed task proposals (server data):",
      );
      expect(systemMessage).toContain("stream-task-1");
      expect(systemMessage).toContain("Stream task");
    });
  },
);
