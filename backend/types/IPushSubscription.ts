import type { Types } from "mongoose";

export type PushPreferenceKey = "taskDeadlines" | "agentReplies";

export type PushNotificationKind = "due_soon" | "overdue" | "agent_reply";

export interface PushPreferences {
  taskDeadlines: boolean;
  agentReplies: boolean;
}

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface IPushSubscription {
  userId: Types.ObjectId;
  endpoint: string;
  keys: PushSubscriptionKeys;
  prefs: PushPreferences;
  userAgent?: string;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PushSubscriptionUpsertInput {
  userId: string;
  endpoint: string;
  keys: PushSubscriptionKeys;
  prefs?: Partial<PushPreferences>;
  userAgent?: string;
}

export interface PushSubscriptionStatus {
  subscribed: boolean;
  prefs: PushPreferences | null;
}

export interface PushSubscriptionTarget {
  endpoint: string;
  keys: PushSubscriptionKeys;
  prefs: PushPreferences;
}

export interface PushPayload {
  kind: PushNotificationKind;
  title: string;
  body: string;
  url: string;
  tag: string;
}
