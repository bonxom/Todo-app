import http from "node:http";
import { randomUUID } from "node:crypto";
import { writeFileSync, unlinkSync } from "node:fs";
import jwt from "jsonwebtoken";
import User from "../../models/User.js";
import Category from "../../models/Category.js";
import {
  connectChatTestMongo,
  disconnectChatTestMongo,
  createUserAndConversations,
} from "./chatMongo.js";

const HARNESS_PORT = 3011;
const JWT_SECRET = "test-jwt-secret-for-browser-harness-123456789";

// Ensure required environment variables before importing app
process.env.PORT = String(HARNESS_PORT);
process.env.ALLOWED_ORIGINS = "http://127.0.0.1:5000,http://localhost:5000";
process.env.A2UI_TASK_PROPOSALS_ENABLED = "true";
process.env.A2UI_COMPOSITION_ENABLED = "true";
process.env.JWT_SECRET = JWT_SECRET;
process.env.JWT_REFRESH_SECRET = "test-jwt-refresh-secret-123456789";
process.env.JWT_ACCESS_EXPIRES_IN = "1d";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";
process.env.SALT_ROUNDS = "10";
process.env.AI_API_KEY = "fixture-only-key";
process.env.AI_MODEL_NAME = "fixture";

export interface HarnessState {
  backendServer: http.Server;
  providerServer: http.Server;
  token: string;
  user: {
    _id: string;
    email: string;
    name: string;
    role: string;
  };
  dbName: string;
}

export async function startBrowserHarness(): Promise<HarnessState> {
  const dbName = await connectChatTestMongo("orbit_browser_harness");
  process.env.MONGO_URI =
    process.env.CHAT_TEST_MONGO_URI ||
    process.env.ORBIT_MCP_TEST_MONGO_URI ||
    "mongodb://127.0.0.1:27034/";
  process.env.MONGO_NAME = dbName;

  let providerServer!: http.Server;
  const providerPortPromise = new Promise<number>((resolve) => {
    providerServer = http.createServer(async (req, res) => {
      let body = "";
      for await (const chunk of req) body += chunk;
      const request = JSON.parse(body);

      const messages: Array<{
        role: string;
        content?: string | null;
        tool_call_id?: string;
        tool_calls?: Array<{
          id: string;
          type: string;
          function: { name: string; arguments: string };
        }>;
      }> = request.messages || [];

      const tools: Array<{
        type: string;
        function: { name: string; description?: string };
      }> = request.tools || [];

      const isStream = Boolean(request.stream);
      const systemMessage = messages[0]?.content ?? "";

      // Helper to send streaming chunks or json
      const sendToolCall = (
        name: string,
        args: Record<string, unknown>,
        callId = `call_${Date.now()}`,
      ) => {
        if (isStream) {
          res.writeHead(200, { "Content-Type": "text/event-stream" });
          const chunk = {
            id: "chatcmpl-fixture",
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model: "fixture",
            choices: [
              {
                index: 0,
                delta: {
                  role: "assistant",
                  tool_calls: [
                    {
                      index: 0,
                      id: callId,
                      type: "function",
                      function: {
                        name,
                        arguments: JSON.stringify(args),
                      },
                    },
                  ],
                },
                finish_reason: "tool_calls",
              },
            ],
          };
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          res.write("data: [DONE]\n\n");
          res.end();
        } else {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              id: "chatcmpl-fixture",
              object: "chat.completion",
              created: Math.floor(Date.now() / 1000),
              model: "fixture",
              choices: [
                {
                  index: 0,
                  message: {
                    role: "assistant",
                    content: null,
                    tool_calls: [
                      {
                        id: callId,
                        type: "function",
                        function: {
                          name,
                          arguments: JSON.stringify(args),
                        },
                      },
                    ],
                  },
                  finish_reason: "tool_calls",
                },
              ],
            }),
          );
        }
      };

      const sendContent = (content: string) => {
        if (isStream) {
          res.writeHead(200, { "Content-Type": "text/event-stream" });
          const chunk = {
            id: "chatcmpl-fixture",
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model: "fixture",
            choices: [
              {
                index: 0,
                delta: {
                  role: "assistant",
                  content,
                },
                finish_reason: "stop",
              },
            ],
          };
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          res.write("data: [DONE]\n\n");
          res.end();
        } else {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              id: "chatcmpl-fixture",
              object: "chat.completion",
              created: Math.floor(Date.now() / 1000),
              model: "fixture",
              choices: [
                {
                  index: 0,
                  message: {
                    role: "assistant",
                    content,
                  },
                  finish_reason: "stop",
                },
              ],
            }),
          );
        }
      };

      // Track called tools from assistant messages in CURRENT turn only
      let lastUserIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i]?.role === "user") {
          lastUserIndex = i;
          break;
        }
      }
      const messagesInCurrentTurn =
        lastUserIndex >= 0 ? messages.slice(lastUserIndex) : messages;

      const calledTools = messagesInCurrentTurn
        .flatMap((m) => (m.role === "assistant" ? m.tool_calls || [] : []))
        .map((c) => c.function?.name)
        .filter((name) => Boolean(name) && name !== "list_skills");

      const lastCalledTool = calledTools[calledTools.length - 1];

      // If a business tool was called in this turn, return its completion text
      if (lastCalledTool === "orbit_create_task") {
        return sendContent("Đã tạo công việc thành công.");
      }
      if (lastCalledTool === "propose_tasks") {
        return sendContent(
          "Tôi đã lập kế hoạch gồm 3 công việc bên dưới. Bạn có thể chỉnh sửa trước khi xác nhận.",
        );
      }
      if (lastCalledTool === "grill_user") {
        return sendContent("Vui lòng chọn thời gian bạn muốn tập.");
      }

      // Check user prompt from the last user message
      let lastUserMessage: (typeof messagesInCurrentTurn)[number] | undefined;
      for (let i = messagesInCurrentTurn.length - 1; i >= 0; i--) {
        if (messagesInCurrentTurn[i]?.role === "user") {
          lastUserMessage = messagesInCurrentTurn[i];
          break;
        }
      }
      const userText =
        typeof lastUserMessage?.content === "string"
          ? lastUserMessage.content
          : "";

      // 1. Scenario 1: Auto direct creation
      if (
        userText.includes("gửi báo cáo") ||
        userText.includes("send the report") ||
        userText.includes("Create a task")
      ) {
        // Assert tools: must include orbit_create_task AND propose_tasks
        const toolNames = tools.map((t) => t.function.name);
        if (
          !toolNames.includes("orbit_create_task") ||
          !toolNames.includes("propose_tasks")
        ) {
          return sendContent(
            "Lỗi: Auto mode phải cung cấp cả orbit_create_task và propose_tasks.",
          );
        }
        return sendToolCall("orbit_create_task", {
          idempotencyKey: randomUUID(),
          title: "Gửi báo cáo",
          dueDate: "2026-11-27T17:00:00.000Z",
        });
      }

      // 2. Scenario 2: Clarification question
      if (
        userText === "Tập thể dục" ||
        userText.includes("clarify") ||
        userText === "Workout"
      ) {
        return sendToolCall("grill_user", {
          question: "Bạn muốn tập vào lúc nào?",
          options: [
            {
              id: "morning",
              label: "Buổi sáng",
              description: "Bắt đầu ngày mới sảng khoái.",
            },
            {
              id: "evening",
              label: "Buổi tối",
              description: "Sau giờ làm việc.",
            },
          ],
          allowCustomAnswer: true,
        });
      }

      // 2b. Clarification answer in Auto mode
      if (
        userText.includes("Buổi sáng") ||
        userText.includes("morning") ||
        userText.includes("Buổi tối")
      ) {
        return sendToolCall("orbit_create_task", {
          idempotencyKey: randomUUID(),
          title: "Tập thể dục buổi sáng",
        });
      }

      // 3. Scenario 3: Ask proposal
      if (
        userText.includes("Lên kế hoạch") ||
        userText.includes("Plan project") ||
        userText.includes("kế hoạch dự án")
      ) {
        // In Ask mode: orbit_create_task must NOT be offered
        const toolNames = tools.map((t) => t.function.name);
        if (toolNames.includes("orbit_create_task")) {
          return sendContent(
            "Lỗi: Ask mode có proposals enabled không được cung cấp orbit_create_task.",
          );
        }
        return sendToolCall("propose_tasks", {
          companionText:
            "Mình bắt đầu bằng khảo sát yêu cầu vì kết quả đó sẽ giúp chốt kiến trúc và dự toán.",
          items: [
            { title: "Khảo sát yêu cầu khách hàng", priority: "High" },
            { title: "Thiết kế kiến trúc hệ thống", priority: "High" },
            { title: "Lập ngân sách dự án", priority: "Medium" },
          ],
        });
      }

      if (userText === "What happened to the cancelled proposal?") {
        return sendContent(
          systemMessage.includes("Cancelled task proposals (server data):")
            ? "You cancelled the testing proposal before creating any tasks."
            : "Missing cancelled proposal in model context.",
        );
      }

      // 4. Scenario 4: Follow-up asking which tasks were confirmed
      if (
        userText.includes("xác nhận") ||
        userText.includes("Which tasks did I just confirm") ||
        userText.includes("confirmed")
      ) {
        // Assert that systemMessage contains Confirmed task proposals (server data):
        if (
          !systemMessage.includes("Confirmed task proposals (server data):")
        ) {
          return sendContent(
            "Lỗi: Không tìm thấy Confirmed task proposals (server data) trong model context.",
          );
        }

        // Check which titles were included
        const includesSurvey = systemMessage.includes(
          "Khảo sát yêu cầu khách hàng",
        );
        const includesDesignV2 = systemMessage.includes(
          "Thiết kế kiến trúc hệ thống",
        );
        const includesBudget = systemMessage.includes("Lập ngân sách dự án");

        if (!includesSurvey || !includesDesignV2) {
          return sendContent("Lỗi: Thiếu confirmed tasks trong model context.");
        }

        if (includesBudget) {
          return sendContent(
            "Lỗi: Task bị bỏ chọn (Lập ngân sách dự án) không được xuất hiện trong confirmed proposals.",
          );
        }

        return sendContent(
          `Bạn vừa xác nhận 2 công việc: Khảo sát yêu cầu khách hàng và Thiết kế kiến trúc hệ thống.`,
        );
      }

      if (userText === "Hỏi thêm rồi đề xuất bước tiếp theo") {
        return sendToolCall("grill_user", {
          question: "Bạn muốn ưu tiên bước nào tiếp theo?",
          options: [
            {
              id: "testing",
              label: "Kiểm thử nghiệm thu",
              description: "Lập kịch bản kiểm thử theo kiến trúc đã có.",
            },
            { id: "handoff", label: "Bàn giao" },
          ],
        });
      }
      if (userText === "Kiểm thử nghiệm thu") {
        if (
          !systemMessage.includes("Answered clarification (server data):") ||
          !systemMessage.includes(
            "Lập kịch bản kiểm thử theo kiến trúc đã có.",
          ) ||
          !systemMessage.includes("Thiết kế kiến trúc hệ thống") ||
          !systemMessage.includes(
            "Use confirmed tasks as existing work when drafting follow-up plans",
          )
        ) {
          return sendContent("Thiếu ngữ cảnh cho bước tiếp theo.");
        }
        return sendToolCall("propose_tasks", {
          items: [{ title: "Viết kịch bản kiểm thử nghiệm thu" }],
        });
      }

      if (userText === "Compare my study hours by skill") {
        if (!tools.some((tool) => tool.function.name === "present_ui")) {
          return sendToolCall("load_skill", { skillId: "ui-composition" });
        }
        return sendToolCall("present_ui", {
          companionText:
            "You spent twice as much time on reading as on listening this week.",
          fallbackText: "Reading: 2 hours\nListening: 1 hour",
          components: [
            {
              id: "root",
              component: "Column",
              children: ["studyChart"],
              gap: "sm",
            },
            {
              id: "studyChart",
              component: "Chart",
              title: "Study hours by skill",
              chartType: "bar",
              rowsPath: "/display/hours",
              labelKey: "skill",
              series: [{ key: "hours", label: "Hours" }],
            },
          ],
          displayData: {
            hours: [
              { skill: "Reading", hours: 2 },
              { skill: "Listening", hours: 1 },
            ],
          },
        });
      }

      return sendContent("Xin chào, tôi là Orbit Agent.");
    });

    providerServer.listen(0, "127.0.0.1", () => {
      const addr = providerServer.address() as import("node:net").AddressInfo;
      resolve(addr.port);
    });
  });

  const providerPort = await providerPortPromise;
  process.env.AI_BASE_URL = `http://127.0.0.1:${providerPort}/v1`;

  // Import app after env is configured
  const { default: app, ensureAppReady } = await import("../../app.js");
  await ensureAppReady();

  // Seed user and category
  const { userId, userObjectId } = await createUserAndConversations(0);
  const seededUser = await User.findById(userObjectId);
  if (!seededUser) throw new Error("Failed to seed user");

  // Ensure Uncategorized category exists for this user
  const uncategorized = await Category.findOne({
    userId: userObjectId,
    name: "Uncategorized",
  });
  if (!uncategorized) {
    await Category.create({ userId: userObjectId, name: "Uncategorized" });
  }

  const token = jwt.sign(
    { id: userId, email: seededUser.email, role: "USER" },
    JWT_SECRET,
    { expiresIn: "1d" },
  );

  const user = {
    _id: userId,
    email: seededUser.email,
    name: seededUser.name,
    role: "USER",
  };

  const backendServer = http.createServer(app);
  await new Promise<void>((resolve) => {
    backendServer.listen(HARNESS_PORT, "127.0.0.1", () => {
      resolve();
    });
  });

  return {
    backendServer,
    providerServer,
    token,
    user,
    dbName,
  };
}

export async function stopBrowserHarness(state: HarnessState): Promise<void> {
  await new Promise<void>((resolve) => {
    state.backendServer.close(() => resolve());
  });
  await new Promise<void>((resolve) => {
    state.providerServer.close(() => resolve());
  });
  await disconnectChatTestMongo();
}

// Standalone execution support
if (
  process.argv[1]?.endsWith("agentTaskCreationBrowserHarness.ts") ||
  process.argv[1]?.endsWith("agentTaskCreationBrowserHarness.js")
) {
  startBrowserHarness()
    .then((state) => {
      console.log(`ORBIT_AGENT_BROWSER_TOKEN=${state.token}`);
      console.log(`ORBIT_AGENT_BROWSER_USER=${JSON.stringify(state.user)}`);
      console.log(`HARNESS_READY PORT=${HARNESS_PORT} DB=${state.dbName}`);

      try {
        writeFileSync(
          "/tmp/orbit_agent_browser_harness.json",
          JSON.stringify({
            token: state.token,
            user: state.user,
            port: HARNESS_PORT,
            dbName: state.dbName,
          }),
        );
      } catch {
        // ignore tmp write errors
      }

      const cleanup = async () => {
        try {
          unlinkSync("/tmp/orbit_agent_browser_harness.json");
        } catch {
          // ignore
        }
        await stopBrowserHarness(state);
        process.exit(0);
      };

      process.on("SIGINT", cleanup);
      process.on("SIGTERM", cleanup);
    })
    .catch((err) => {
      console.error("Harness failed to start:", err);
      process.exit(1);
    });
}
