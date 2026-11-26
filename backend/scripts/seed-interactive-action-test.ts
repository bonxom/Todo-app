import http from "node:http";
import { randomUUID } from "node:crypto";
import { unlinkSync, writeFileSync } from "node:fs";
import mongoose from "mongoose";

const PORT = 4011;
const HOST = "127.0.0.1";
const SEED_METADATA_PATH = "/tmp/orbit_ui_action_live_seed.json";
const DEFAULT_TEST_CREDENTIAL = "Orbit-Local-Playwright-Only-Pass#2026";
const DB_PREFIX = "orbit_ui_actions_test_";

function validateLoopbackUri(uri: string | undefined): string {
  if (
    !uri ||
    !/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/.test(uri.trim())
  ) {
    throw new Error(
      "ORBIT_MCP_TEST_MONGO_URI must point to a loopback MongoDB instance (127.0.0.1 or localhost).",
    );
  }
  return uri.trim();
}

function buildDbName(): string {
  const dbName = `${DB_PREFIX}${process.pid}_${Date.now()}`;
  if (!dbName.startsWith(DB_PREFIX)) {
    throw new Error(`Invalid disposable database name: ${dbName}`);
  }
  return dbName;
}

async function runServe(): Promise<void> {
  const mongoUri = validateLoopbackUri(process.env.ORBIT_MCP_TEST_MONGO_URI);
  const dbName = buildDbName();

  // Configure isolated server environment before importing app/config modules.
  process.env.PORT = String(PORT);
  process.env.HOST = HOST;
  process.env.MONGO_URI = mongoUri;
  process.env.MONGO_NAME = dbName;
  process.env.ALLOWED_ORIGINS = "http://127.0.0.1:5000,http://localhost:5000";
  process.env.JWT_SECRET =
    process.env.JWT_SECRET || "orbit-ui-actions-test-jwt-secret-only";
  process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET ||
    "orbit-ui-actions-test-refresh-secret-only";
  process.env.JWT_ACCESS_EXPIRES_IN = "1h";
  process.env.JWT_REFRESH_EXPIRES_IN = "7d";
  process.env.SALT_ROUNDS = "10";
  process.env.A2UI_TASK_PROPOSALS_ENABLED = "true";
  process.env.A2UI_COMPOSITION_ENABLED = "true";
  process.env.A2UI_INTERACTIVE_ENABLED =
    process.env.A2UI_INTERACTIVE_ENABLED ?? "true";

  const [
    { default: app, ensureAppReady },
    { authService },
    { default: Category },
    { default: Task },
    { default: Stat },
    { default: Conversation },
    { default: ChatTurn },
    { McpWriteReceipt },
    { interactiveUiService },
    { UI_INTERACTIVE_CATALOG_ID },
  ] = await Promise.all([
    import("../app.js"),
    import("../services/authService.js"),
    import("../models/Category.js"),
    import("../models/Task.js"),
    import("../models/Stat.js"),
    import("../models/Conversation.js"),
    import("../models/ChatTurn.js"),
    import("../repositories/taskCommandRepository.js"),
    import("../services/A2UI/interactiveUiService.js"),
    import("../types/A2UI/IUiAction.js"),
  ]);

  await mongoose.connect(mongoUri, { dbName });
  await Promise.all([
    Category.init(),
    Task.init(),
    Stat.init(),
    Conversation.init(),
    ChatTurn.init(),
    McpWriteReceipt.init(),
  ]);
  await ensureAppReady();

  const credential =
    process.env.ORBIT_UI_ACTION_TEST_SECRET || DEFAULT_TEST_CREDENTIAL;
  const runSuffix = `${process.pid}_${Date.now()}`;
  const primaryEmail = `ui-action-primary-${runSuffix}@orbit.test`;
  const foreignEmail = `ui-action-foreign-${runSuffix}@orbit.test`;

  const [{ user: primaryUser }, { user: foreignUser }] = await Promise.all([
    authService.register({
      name: "Primary Interactive Tester",
      email: primaryEmail,
      password: credential,
    }),
    authService.register({
      name: "Foreign Interactive Tester",
      email: foreignEmail,
      password: credential,
    }),
  ]);

  let primaryCategory = await Category.findOne({
    userId: primaryUser._id,
    name: "Uncategorized",
  });
  if (!primaryCategory) {
    primaryCategory = await Category.create({
      userId: primaryUser._id,
      name: "Uncategorized",
    });
  }
  let foreignCategory = await Category.findOne({
    userId: foreignUser._id,
    name: "Uncategorized",
  });
  if (!foreignCategory) {
    foreignCategory = await Category.create({
      userId: foreignUser._id,
      name: "Uncategorized",
    });
  }

  const todayDue = new Date();
  todayDue.setHours(18, 0, 0, 0);

  const [
    inProgressTask,
    pendingTask,
    alreadyCompletedTask,
    retryTask,
    staleTask,
    switchTaskA,
    switchTaskB,
    foreignTask,
  ] = await Task.create([
    {
      title: "Chuẩn bị slide demo",
      description: "Task in-progress ready for A2UI completion",
      status: "in-progress",
      priority: "High",
      categoryId: primaryCategory._id,
      dueDate: todayDue,
    },
    {
      title: "Dọn dẹp tài liệu",
      description: "Pending task cannot jump directly to completed",
      status: "pending",
      priority: "Medium",
      categoryId: primaryCategory._id,
      dueDate: todayDue,
    },
    {
      title: "Gửi biên bản họp",
      description: "Already completed task",
      status: "completed",
      priority: "Low",
      categoryId: primaryCategory._id,
      completedAt: new Date(Date.now() - 60_000),
      dueDate: todayDue,
    },
    {
      title: "Kiểm tra bản build cuối",
      description: "In-progress task for dropped response + retry scenario",
      status: "in-progress",
      priority: "High",
      categoryId: primaryCategory._id,
      dueDate: todayDue,
    },
    {
      title: "Đổi trạng thái từ tab khác",
      description: "Task becomes stale before user clicks Button",
      status: "in-progress",
      priority: "Medium",
      categoryId: primaryCategory._id,
      dueDate: todayDue,
    },
    {
      title: "Nhiệm vụ hội thoại A",
      description: "In-flight switch test task A",
      status: "in-progress",
      priority: "Medium",
      categoryId: primaryCategory._id,
    },
    {
      title: "Nhiệm vụ hội thoại B",
      description: "Isolated target conversation B task",
      status: "in-progress",
      priority: "Medium",
      categoryId: primaryCategory._id,
    },
    {
      title: "Foreign user private task",
      description: "Owned strictly by foreignUser",
      status: "in-progress",
      priority: "High",
      categoryId: foreignCategory._id,
    },
  ]);

  await Stat.create({
    userId: primaryUser._id,
    totalTasks: 7,
    completedTasks: 1,
    inProgressTasks: 5,
    pendingTasks: 1,
    givenUpTasks: 0,
    dailyStats: [],
  });

  async function seedInteractiveConversation(params: {
    title: string;
    prompt: string;
    companionText: string;
    cards: Array<{
      id: string;
      title: string;
      subtitle: string;
      summary: string;
      buttonLabel: string;
      actionKey: string;
      taskId: string;
    }>;
    forceUncheckedBinding?: boolean;
  }) {
    const conversationId = randomUUID();
    const turnId = randomUUID();
    await Conversation.create({
      _id: conversationId,
      userId: primaryUser._id,
      title: params.title,
      sequence: 1,
      mode: "auto",
    });

    const spec = {
      fallbackText: `${params.companionText} (${params.cards.map((c) => c.title).join(", ")})`,
      components: [
        {
          id: "root",
          component: "Column" as const,
          gap: "sm" as const,
          children: params.cards.map((c) => `card_${c.id}`),
        },
        ...params.cards.flatMap((c) => [
          {
            id: `card_${c.id}`,
            component: "Card" as const,
            title: c.title,
            subtitle: c.subtitle,
            tone: "accent" as const,
            children: [`txt_${c.id}`, `btn_${c.id}`],
          },
          {
            id: `txt_${c.id}`,
            component: "Text" as const,
            value: { literal: c.summary },
            emphasis: "normal" as const,
          },
          {
            id: `btn_${c.id}`,
            component: "Button" as const,
            label: c.buttonLabel,
            actionKey: c.actionKey,
          },
        ]),
      ],
      displayData: {},
      actions: Object.fromEntries(
        params.cards.map((c) => [
          c.actionKey,
          { name: "task.complete" as const, taskId: c.taskId },
        ]),
      ),
    };

    const stored = params.forceUncheckedBinding
      ? {
          catalogId: UI_INTERACTIVE_CATALOG_ID,
          surfaceId: randomUUID(),
          spec,
          actionBindings: params.cards.map((c) => ({
            id: randomUUID(),
            key: c.actionKey,
            name: "task.complete" as const,
            taskId: c.taskId,
          })),
        }
      : await interactiveUiService.prepare(spec, primaryUser);

    await ChatTurn.create({
      _id: turnId,
      conversationId,
      userId: primaryUser._id,
      requestId: randomUUID(),
      executionToken: randomUUID(),
      sequence: 1,
      status: "completed",
      userInput: params.prompt,
      response: params.companionText,
      mode: "auto",
      uiSurface: stored,
      expiresAt: new Date(Date.now() + 60_000),
    });

    return {
      conversationId,
      turnId,
      surfaceId: stored.surfaceId,
      bindings: stored.actionBindings,
    };
  }

  const [
    convComplete,
    convStates,
    convRetry,
    convStale,
    convForeign,
    convSwitchA,
    convSwitchB,
  ] = await Promise.all([
    seedInteractiveConversation({
      title: "01 Complete Slide",
      prompt: "Show slide demo task so I can complete it",
      companionText: "Tap the button below when your demo slides are ready.",
      cards: [
        {
          id: "slide",
          title: "Chuẩn bị slide demo",
          subtitle: "In progress",
          summary: "Complete this task when the presentation is finished.",
          buttonLabel: "Complete slide deck",
          actionKey: "completeSlide",
          taskId: String(inProgressTask._id),
        },
      ],
    }),
    seedInteractiveConversation({
      title: "02 Pending & Done",
      prompt: "Show already completed and pending tasks",
      companionText: "Only in-progress tasks can be completed.",
      cards: [
        {
          id: "done",
          title: "Gửi biên bản họp",
          subtitle: "Completed",
          summary: "This task is already done.",
          buttonLabel: "Already done",
          actionKey: "completeDone",
          taskId: String(alreadyCompletedTask._id),
        },
        {
          id: "pending",
          title: "Dọn dẹp tài liệu",
          subtitle: "Pending",
          summary: "Pending tasks must be started before completion.",
          buttonLabel: "Unavailable pending",
          actionKey: "completePending",
          taskId: String(pendingTask._id),
        },
      ],
    }),
    seedInteractiveConversation({
      title: "03 Dropped Retry",
      prompt: "Show build check task",
      companionText: "Complete build verification when done.",
      cards: [
        {
          id: "build",
          title: "Kiểm tra bản build cuối",
          subtitle: "In progress",
          summary: "Click when final build check passes.",
          buttonLabel: "Complete build check",
          actionKey: "completeBuild",
          taskId: String(retryTask._id),
        },
      ],
    }),
    seedInteractiveConversation({
      title: "04 Stale Task",
      prompt: "Show stale task scenario",
      companionText: "Complete when done.",
      cards: [
        {
          id: "stale",
          title: "Đổi trạng thái từ tab khác",
          subtitle: "In progress",
          summary: "Ready until external update occurs.",
          buttonLabel: "Complete stale task",
          actionKey: "completeStale",
          taskId: String(staleTask._id),
        },
      ],
    }),
    seedInteractiveConversation({
      title: "05 Foreign Target",
      prompt: "Forged foreign task target",
      companionText: "Forged foreign surface.",
      forceUncheckedBinding: true,
      cards: [
        {
          id: "foreign",
          title: "Foreign user private task",
          subtitle: "Blocked",
          summary: "Server must reject cross-user task actions.",
          buttonLabel: "Attempt foreign complete",
          actionKey: "completeForeign",
          taskId: String(foreignTask._id),
        },
      ],
    }),
    seedInteractiveConversation({
      title: "06 Switch Source A",
      prompt: "Conversation A",
      companionText: "Task card inside Conversation A.",
      cards: [
        {
          id: "swA",
          title: "Nhiệm vụ hội thoại A",
          subtitle: "In progress",
          summary: "Conversation A action.",
          buttonLabel: "Complete task A",
          actionKey: "completeA",
          taskId: String(switchTaskA._id),
        },
      ],
    }),
    seedInteractiveConversation({
      title: "07 Switch Target B",
      prompt: "Conversation B",
      companionText: "Task card inside Conversation B.",
      cards: [
        {
          id: "swB",
          title: "Nhiệm vụ hội thoại B",
          subtitle: "In progress",
          summary: "Conversation B action.",
          buttonLabel: "Complete task B",
          actionKey: "completeB",
          taskId: String(switchTaskB._id),
        },
      ],
    }),
  ]);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(PORT, HOST, () => resolve());
  });

  const seedMetadata = {
    baseUrl: `http://${HOST}:${PORT}`,
    dbName,
    users: {
      primary: { id: String(primaryUser._id), email: primaryEmail },
      foreign: { id: String(foreignUser._id), email: foreignEmail },
    },
    categories: {
      primaryId: String(primaryCategory._id),
      foreignId: String(foreignCategory._id),
    },
    tasks: {
      inProgressId: String(inProgressTask._id),
      pendingId: String(pendingTask._id),
      alreadyCompletedId: String(alreadyCompletedTask._id),
      retryId: String(retryTask._id),
      staleId: String(staleTask._id),
      switchAId: String(switchTaskA._id),
      switchBId: String(switchTaskB._id),
      foreignId: String(foreignTask._id),
    },
    conversations: {
      complete: convComplete,
      states: convStates,
      retry: convRetry,
      stale: convStale,
      foreign: convForeign,
      switchA: convSwitchA,
      switchB: convSwitchB,
    },
  };

  writeFileSync(SEED_METADATA_PATH, JSON.stringify(seedMetadata, null, 2));
  console.log(JSON.stringify(seedMetadata));

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Shutting down interactive action test server (${signal})...`);
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    if (mongoose.connection.readyState !== 0 && dbName.startsWith(DB_PREFIX)) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
    try {
      unlinkSync(SEED_METADATA_PATH);
    } catch {
      // ignore if already removed
    }
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

const command = process.argv[2];
if (command !== "serve") {
  console.error(
    "Usage: pnpm exec tsx scripts/seed-interactive-action-test.ts serve",
  );
  process.exit(1);
}

runServe().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
