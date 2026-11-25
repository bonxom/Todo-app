import {
  configureWebPush,
  getWebPushConfig,
  webPushTransport,
} from "../config/webPush.js";
import { pushSubscriptionRepository } from "../repositories/pushSubscriptionRepository.js";
import type {
  PushPayload,
  PushPreferenceKey,
} from "../types/IPushSubscription.js";
import type { NotificationType } from "../types/INotification.js";

export interface PushDispatchResult {
  sent: number;
  removed: number;
  failed: number;
}

export interface DeadlinePushInput {
  recipientId: string;
  taskId: string;
  type: NotificationType;
  taskTitle: string;
}

export interface AgentReplyPushInput {
  userId: string;
  conversationId: string;
  conversationTitle?: string | null;
}

const ZERO_RESULT: PushDispatchResult = { sent: 0, removed: 0, failed: 0 };

const extractStatusCode = (error: unknown): number | null => {
  if (!error || typeof error !== "object") return null;
  if ("statusCode" in error && typeof error.statusCode === "number") {
    return error.statusCode;
  }
  return null;
};

export const pushDispatchService = {
  async sendToUser(
    userId: string,
    category: PushPreferenceKey,
    payload: PushPayload,
  ): Promise<PushDispatchResult> {
    if (!getWebPushConfig().supported || !configureWebPush()) {
      return ZERO_RESULT;
    }

    let targets;
    try {
      targets = await pushSubscriptionRepository.findEnabledForCategory(
        userId,
        category,
      );
    } catch {
      console.warn(
        `[push] Failed to load subscriptions for category=${category}`,
      );
      return ZERO_RESULT;
    }

    if (targets.length === 0) {
      return ZERO_RESULT;
    }

    const serializedPayload = JSON.stringify(payload);
    const deliveredEndpoints: string[] = [];
    let sent = 0;
    let removed = 0;
    let failed = 0;

    await Promise.all(
      targets.map(async (target) => {
        try {
          await webPushTransport.sendNotification(
            {
              endpoint: target.endpoint,
              keys: target.keys,
            },
            serializedPayload,
            { TTL: 3600 },
          );
          sent++;
          deliveredEndpoints.push(target.endpoint);
        } catch (error) {
          const statusCode = extractStatusCode(error);
          if (statusCode === 404 || statusCode === 410) {
            try {
              const deleted =
                await pushSubscriptionRepository.deleteByUserAndEndpoint(
                  userId,
                  target.endpoint,
                );
              if (deleted) removed++;
            } catch {
              failed++;
            }
            return;
          }
          failed++;
        }
      }),
    );

    if (deliveredEndpoints.length > 0) {
      try {
        await pushSubscriptionRepository.touchLastUsed(
          userId,
          deliveredEndpoints,
        );
      } catch {
        // Best-effort timestamp update; push delivery already succeeded
      }
    }

    if (failed > 0) {
      console.warn(
        `[push] Delivery completed with warnings (category=${category}, sent=${sent}, removed=${removed}, failed=${failed})`,
      );
    }

    return { sent, removed, failed };
  },

  async notifyDeadline(input: DeadlinePushInput): Promise<PushDispatchResult> {
    const title = input.type === "overdue" ? "Task overdue" : "Task due soon";
    const trimmedTitle = input.taskTitle.trim() || "Upcoming Orbit task";

    return this.sendToUser(input.recipientId, "taskDeadlines", {
      kind: input.type,
      title,
      body: trimmedTitle,
      url: `/v2/dashboard?taskId=${encodeURIComponent(input.taskId)}`,
      tag: `orbit-deadline-${input.taskId}-${input.type}`,
    });
  },

  async notifyAgentReply(
    input: AgentReplyPushInput,
  ): Promise<PushDispatchResult> {
    const trimmedTitle = input.conversationTitle?.trim();
    const body = trimmedTitle
      ? `Response ready in "${trimmedTitle}"`
      : "Your AI assistant finished responding.";

    return this.sendToUser(input.userId, "agentReplies", {
      kind: "agent_reply",
      title: "Orbit Agent replied",
      body,
      url: `/v2/agents?conversation=${encodeURIComponent(input.conversationId)}`,
      tag: `orbit-agent-${input.conversationId}`,
    });
  },
};
