import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import UserSkill from "../models/UserSkill.js";
import UserSkillQuota from "../models/UserSkillQuota.js";
import type { IUserSkill, SkillInput } from "../types/IUserSkill.js";
import { AppError } from "../error/AppError.js";
import { SKILL_ERROR } from "../error/definitions/skillErrors.js";

async function withTransaction<T>(
  fn: (session: mongoose.ClientSession) => Promise<T>,
): Promise<T> {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(() => fn(session), {
      readPreference: "primary",
      writeConcern: { w: "majority" },
    });
  } finally {
    await session.endSession();
  }
}

async function ensureQuota(userObjId: mongoose.Types.ObjectId): Promise<void> {
  try {
    await UserSkillQuota.updateOne(
      { userId: userObjId },
      { $setOnInsert: { count: 0 } },
      { upsert: true },
    );
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
  }
}

export const userSkillRepository = {
  async create(
    userId: string,
    input: SkillInput & {
      sourceTemplateId?: string | null;
      sourceTemplateVersion?: string | null;
    },
  ): Promise<IUserSkill> {
    const userObjId = new mongoose.Types.ObjectId(userId);
    await ensureQuota(userObjId);

    return withTransaction(async (session) => {
      const quotaRes = await UserSkillQuota.updateOne(
        { userId: userObjId, count: { $lt: 50 } },
        { $inc: { count: 1 } },
        { session },
      );
      if (quotaRes.matchedCount === 0) {
        throw new AppError(SKILL_ERROR.SKILL_LIMIT_REACHED);
      }

      const id = randomUUID();
      const created = new UserSkill({
        _id: id,
        userId: userObjId,
        name: input.name,
        description: input.description,
        instructions: input.instructions,
        enabled: input.enabled ?? true,
        version: 1,
        sourceTemplateId: input.sourceTemplateId ?? null,
        sourceTemplateVersion: input.sourceTemplateVersion ?? null,
      });

      await created.save({ session });
      return created.toObject();
    });
  },

  async findById(userId: string, id: string): Promise<IUserSkill | null> {
    const userObjId = new mongoose.Types.ObjectId(userId);
    return UserSkill.findOne({ _id: id, userId: userObjId }).lean();
  },

  async list(userId: string): Promise<IUserSkill[]> {
    const userObjId = new mongoose.Types.ObjectId(userId);
    return UserSkill.find({ userId: userObjId })
      .sort({ updatedAt: -1, _id: 1 })
      .lean();
  },

  async update(
    userId: string,
    id: string,
    expectedVersion: number,
    input: {
      name: string;
      description: string;
      instructions: string;
      enabled: boolean;
    },
  ): Promise<IUserSkill> {
    const userObjId = new mongoose.Types.ObjectId(userId);
    const existing = await UserSkill.findOne({ _id: id, userId: userObjId });
    if (!existing) {
      throw new AppError(SKILL_ERROR.SKILL_NOT_FOUND);
    }
    if (existing.version !== expectedVersion) {
      throw new AppError(SKILL_ERROR.SKILL_VERSION_CONFLICT);
    }

    const updated = await UserSkill.findOneAndUpdate(
      { _id: id, userId: userObjId, version: expectedVersion },
      {
        $set: {
          name: input.name,
          description: input.description,
          instructions: input.instructions,
          enabled: input.enabled,
        },
        $inc: { version: 1 },
      },
      { new: true },
    ).lean();

    if (!updated) {
      throw new AppError(SKILL_ERROR.SKILL_VERSION_CONFLICT);
    }

    return updated;
  },

  async delete(
    userId: string,
    id: string,
    expectedVersion: number,
  ): Promise<{ id: string }> {
    const userObjId = new mongoose.Types.ObjectId(userId);

    return withTransaction(async (session) => {
      const existing = await UserSkill.findOne(
        { _id: id, userId: userObjId },
        null,
        { session },
      );
      if (!existing) {
        throw new AppError(SKILL_ERROR.SKILL_NOT_FOUND);
      }
      if (existing.version !== expectedVersion) {
        throw new AppError(SKILL_ERROR.SKILL_VERSION_CONFLICT);
      }

      const delRes = await UserSkill.deleteOne(
        { _id: id, userId: userObjId, version: expectedVersion },
        { session },
      );
      if (delRes.deletedCount === 0) {
        throw new AppError(SKILL_ERROR.SKILL_VERSION_CONFLICT);
      }

      await UserSkillQuota.updateOne(
        { userId: userObjId, count: { $gt: 0 } },
        { $inc: { count: -1 } },
        { session },
      );

      return { id };
    });
  },

  async count(userId: string): Promise<number> {
    const userObjId = new mongoose.Types.ObjectId(userId);
    return UserSkill.countDocuments({ userId: userObjId });
  },

  async listEnabled(userId: string): Promise<IUserSkill[]> {
    const userObjId = new mongoose.Types.ObjectId(userId);
    return UserSkill.find({ userId: userObjId, enabled: true })
      .sort({ updatedAt: -1, _id: 1 })
      .lean();
  },
};
