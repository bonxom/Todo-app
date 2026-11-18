import http from "node:http";

export interface FixtureOptions {
  port?: number;
  host?: string;
  delayMs?: number;
}

export interface FixtureControl {
  server: http.Server;
  port: number;
  url: string;
  close: () => Promise<void>;
  setHold: (hold: boolean) => void;
  release: () => void;
  setChunks: (chunks: string[]) => void;
}

export function startChatStreamFixture(
  options: FixtureOptions = {},
): Promise<FixtureControl> {
  const host = options.host || "127.0.0.1";
  const defaultPort =
    Number(process.env.CHAT_FIXTURE_PORT) || options.port || 4010;

  let shouldHold = false;
  let heldResolver: (() => void) | null = null;
  let customChunks: string[] | null = null;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (url.pathname === "/__control/hold" && req.method === "POST") {
      shouldHold = true;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, hold: true }));
      return;
    }

    if (url.pathname === "/__control/release" && req.method === "POST") {
      shouldHold = false;
      if (heldResolver) {
        heldResolver();
        heldResolver = null;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, released: true }));
      return;
    }

    if (
      url.pathname === "/chat/completions" ||
      url.pathname === "/v1/chat/completions"
    ) {
      let bodyStr = "";
      for await (const chunk of req) {
        bodyStr += chunk;
      }

      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(bodyStr);
      } catch {
        // empty or malformed
      }

      if (shouldHold) {
        await new Promise<void>((resolve) => {
          heldResolver = resolve;
        });
      }

      const isStream = Boolean(parsed.stream);

      if (isStream) {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });

        const chunks = customChunks || [
          "Xin chào! ",
          "Tôi đang kiểm tra ",
          "danh sách công việc của bạn.",
        ];

        for (const text of chunks) {
          const payload = {
            id: "chatcmpl-fixture",
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            choices: [
              {
                index: 0,
                delta: { content: text },
                finish_reason: null,
              },
            ],
          };
          res.write(`data: ${JSON.stringify(payload)}\n\n`);
          if (options.delayMs) {
            await new Promise((r) => setTimeout(r, options.delayMs));
          }
        }

        const terminalPayload = {
          id: "chatcmpl-fixture",
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: "stop",
            },
          ],
        };
        res.write(`data: ${JSON.stringify(terminalPayload)}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }

      // Non-streaming response
      const nonStreamPayload = {
        id: "chatcmpl-fixture",
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "Xin chào! Tôi đã xử lý xong yêu cầu.",
            },
            finish_reason: "stop",
          },
        ],
      };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(nonStreamPayload));
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  });

  return new Promise((resolve, reject) => {
    server.listen(defaultPort, host, () => {
      const addr = server.address();
      const actualPort =
        typeof addr === "object" && addr ? addr.port : defaultPort;
      resolve({
        server,
        port: actualPort,
        url: `http://${host}:${actualPort}`,
        close: () =>
          new Promise<void>((resClose) => {
            if (heldResolver) {
              heldResolver();
              heldResolver = null;
            }
            server.close(() => resClose());
          }),
        setHold: (hold: boolean) => {
          shouldHold = hold;
          if (!hold && heldResolver) {
            heldResolver();
            heldResolver = null;
          }
        },
        release: () => {
          shouldHold = false;
          if (heldResolver) {
            heldResolver();
            heldResolver = null;
          }
        },
        setChunks: (chunks: string[]) => {
          customChunks = chunks;
        },
      });
    });
    server.on("error", reject);
  });
}

// Run directly if script is executed from command line
if (process.argv[1]?.endsWith("chat-stream-fixture.ts")) {
  startChatStreamFixture()
    .then((control) => {
      console.log(`Chat stream fixture listening on ${control.url}`);
    })
    .catch((err) => {
      console.error("Failed to start chat stream fixture:", err);
      process.exit(1);
    });
}
