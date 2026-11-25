import PushSubscription from "../models/PushSubscription.js";
import type {
  PushPreferenceKey,
  PushPreferences,
  PushSubscriptionTarget,
  PushSubscriptionUpsertInput,
} from "../types/IPushSubscription.js";

const normalizePrefs = (
  prefs?: Partial<PushPreferences> | null,
): PushPreferences => ({
  taskDeadlines: prefs?.taskDeadlines ?? true,
  agentReplies: prefs?.agentReplies ?? true,
});

export const pushSubscriptionRepository = {
  async initIndexes(): Promise<void> {
    await PushSubscription.createIndexes();
  },

  async findByUserAndEndpoint(
    userId: string,
    endpoint: string,
  ): Promise<{ endpoint: string; prefs: PushPreferences } | null> {
    const doc = await PushSubscription.findOne({ userId, endpoint })
      .select("endpoint prefs")
      .lean();
    if (!doc) return null;
    return {
      endpoint: doc.endpoint,
      prefs: normalizePrefs(doc.prefs),
    };
  },

  async findEnabledForCategory(
    userId: string,
    category: PushPreferenceKey,
  ): Promise<PushSubscriptionTarget[]> {
    const docs = await PushSubscription.find({
      userId,
      [`prefs.${category}`]: true,
    })
      .select("endpoint keys prefs")
      .lean();

    return docs.map((doc) => ({
      endpoint: doc.endpoint,
      keys: {
        p256dh: doc.keys.p256dh,
        auth: doc.keys.auth,
      },
      prefs: normalizePrefs(doc.prefs),
    }));
  },

  async upsert(input: PushSubscriptionUpsertInput): Promise<{
    subscribed: true;
    prefs: PushPreferences;
  }> {
    const setFields: Record<string, unknown> = {
      keys: input.keys,
    };
    const setOnInsertFields: Record<string, unknown> = {
      lastUsedAt: null,
    };

    if (input.userAgent !== undefined) {
      setFields.userAgent = input.userAgent;
    }
    if (input.prefs?.taskDeadlines !== undefined) {
      setFields["prefs.taskDeadlines"] = input.prefs.taskDeadlines;
    } else {
      setOnInsertFields["prefs.taskDeadlines"] = true;
    }
    if (input.prefs?.agentReplies !== undefined) {
      setFields["prefs.agentReplies"] = input.prefs.agentReplies;
    } else {
      setOnInsertFields["prefs.agentReplies"] = true;
    }

    const doc = await PushSubscription.findOneAndUpdate(
      { userId: input.userId, endpoint: input.endpoint },
      {
        $set: setFields,
        $setOnInsert: setOnInsertFields,
      },
      { upsert: true, new: true },
    )
      .select("prefs")
      .lean();

    return {
      subscribed: true,
      prefs: normalizePrefs(doc?.prefs),
    };
  },

  async updatePrefs(
    userId: string,
    endpoint: string,
    prefs: Partial<PushPreferences>,
  ): Promise<{ subscribed: true; prefs: PushPreferences } | null> {
    const setFields: Record<string, boolean> = {};
    if (prefs.taskDeadlines !== undefined) {
      setFields["prefs.taskDeadlines"] = prefs.taskDeadlines;
    }
    if (prefs.agentReplies !== undefined) {
      setFields["prefs.agentReplies"] = prefs.agentReplies;
    }

    const doc = await PushSubscription.findOneAndUpdate(
      { userId, endpoint },
      { $set: setFields },
      { new: true },
    )
      .select("prefs")
      .lean();

    if (!doc) return null;
    return {
      subscribed: true,
      prefs: normalizePrefs(doc.prefs),
    };
  },

  async deleteByUserAndEndpoint(
    userId: string,
    endpoint: string,
  ): Promise<boolean> {
    const result = await PushSubscription.deleteOne({ userId, endpoint });
    return result.deletedCount > 0;
  },

  async touchLastUsed(userId: string, endpoints: string[]): Promise<void> {
    if (endpoints.length === 0) return;
    await PushSubscription.updateMany(
      { userId, endpoint: { $in: endpoints } },
      { $set: { lastUsedAt: new Date() } },
    );
  },
};
