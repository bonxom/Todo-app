import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import {
  beforeAll,
  afterAll,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import aiRoutes from "../../routes/aiRoutes.js";
import { errorHandler } from "../../error/errorHandler.js";
import { requestContext } from "../../error/requestContext.js";
import User from "../../models/User.js";
import UserSkill from "../../models/UserSkill.js";
import UserSkillQuota from "../../models/UserSkillQuota.js";
import { userSkillRepository } from "../../repositories/userSkillRepository.js";
import { personalSkillService } from "../personalSkillService.js";

const uri = process.env.ORBIT_MCP_TEST_MONGO_URI;
if (uri && !/^mongodb:\/\/(localhost|127\.0\.0\.1):\d+\/$/.test(uri))
  throw new Error("Use an isolated localhost MongoDB test server");
const secret = "personal-skill-test-secret";
const ownerId = new mongoose.Types.ObjectId();
const otherUserId = new mongoose.Types.ObjectId();
const adminId = new mongoose.Types.ObjectId();

const app = express();
app.use(requestContext);
app.use(express.json({ limit: "128kb" }));
app.use("/api/ai", aiRoutes);
app.use(errorHandler);

const tokenFor = (id: mongoose.Types.ObjectId) =>
  `Bearer ${jwt.sign({ id: String(id) }, secret, { expiresIn: "1h" })}`;

describe("Personal Skills API Integration Tests", () => {
  beforeAll(() => {
    vi.stubEnv("JWT_SECRET", secret);
    {
      vi.spyOn(User, "findById").mockImplementation(
        (id: string) =>
          ({
            select: vi.fn().mockResolvedValue({
              _id: new mongoose.Types.ObjectId(id),
              role: String(id) === String(adminId) ? "ADMIN" : "USER",
            }),
          }) as unknown as ReturnType<typeof User.findById>,
      );
    }
  });

  describe("Authentication and Authorization", () => {
    it("returns 401 for unauthenticated requests", async () => {
      const res = await request(app).get("/api/ai/skills");
      expect(res.status).toBe(401);
    });

    it("returns 401 when creating skill without auth", async () => {
      const res = await request(app).post("/api/ai/skills").send({
        name: "Test",
        description: "Test description",
        instructions: "Test instructions",
      });
      expect(res.status).toBe(401);
    });
  });

  describe("Validation", () => {
    it("rejects unknown extra fields (strict schema)", async () => {
      const res = await request(app)
        .post("/api/ai/skills")
        .set("Authorization", tokenFor(ownerId))
        .send({
          name: "Test",
          description: "Test description",
          instructions: "Test instructions",
          userId: "hacked",
          extraField: "not allowed",
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("COMMON_0005");
    });

    it("rejects invalid UUID in skillId param", async () => {
      const res = await request(app)
        .get("/api/ai/skills/not-a-valid-uuid")
        .set("Authorization", tokenFor(ownerId));

      expect(res.status).toBe(400);
    });

    it("rejects empty name or name > 80 chars", async () => {
      const resEmpty = await request(app)
        .post("/api/ai/skills")
        .set("Authorization", tokenFor(ownerId))
        .send({
          name: "   ",
          description: "Desc",
          instructions: "Inst",
        });
      expect(resEmpty.status).toBe(400);

      const resTooLong = await request(app)
        .post("/api/ai/skills")
        .set("Authorization", tokenFor(ownerId))
        .send({
          name: "a".repeat(81),
          description: "Desc",
          instructions: "Inst",
        });
      expect(resTooLong.status).toBe(400);
    });

    it("rejects description > 500 chars", async () => {
      const res = await request(app)
        .post("/api/ai/skills")
        .set("Authorization", tokenFor(ownerId))
        .send({
          name: "Name",
          description: "d".repeat(501),
          instructions: "Inst",
        });
      expect(res.status).toBe(400);
    });

    it("rejects instructions > 10000 chars", async () => {
      const res = await request(app)
        .post("/api/ai/skills")
        .set("Authorization", tokenFor(ownerId))
        .send({
          name: "Name",
          description: "Desc",
          instructions: "i".repeat(10001),
        });
      expect(res.status).toBe(400);
    });

    it("rejects PUT without expectedVersion", async () => {
      const id = randomUUID();
      const res = await request(app)
        .put(`/api/ai/skills/${id}`)
        .set("Authorization", tokenFor(ownerId))
        .send({
          name: "Name",
          description: "Desc",
          instructions: "Inst",
          enabled: true,
        });
      expect(res.status).toBe(400);
    });

    it("rejects DELETE without expectedVersion query", async () => {
      const id = randomUUID();
      const res = await request(app)
        .delete(`/api/ai/skills/${id}`)
        .set("Authorization", tokenFor(ownerId));
      expect(res.status).toBe(400);
    });
  });

  describe.skipIf(!uri)("Real MongoDB quota & concurrency", () => {
    beforeAll(async () => {
      await mongoose.connect(uri!, {
        dbName: `personal_skills_review_${randomUUID()}`,
      });
      await Promise.all([UserSkill.init(), UserSkillQuota.init()]);
    });

    afterAll(async () => {
      await UserSkill.deleteMany({ userId: ownerId });
      await UserSkillQuota.deleteMany({ userId: ownerId });
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    });

    afterEach(async () => {
      await UserSkill.deleteMany({ userId: ownerId });
      await UserSkillQuota.deleteMany({ userId: ownerId });
    });

    it("rolls back the quota when the skill insert fails", async () => {
      await expect(
        userSkillRepository.create(String(ownerId), {
          name: "",
          description: "Desc",
          instructions: "Inst",
        }),
      ).rejects.toThrow();
      expect(await UserSkill.countDocuments({ userId: ownerId })).toBe(0);
      expect((await UserSkillQuota.findOne({ userId: ownerId }))?.count).toBe(
        0,
      );
    });

    it("rolls back deletion when quota persistence fails", async () => {
      const created = await personalSkillService.create(String(ownerId), {
        name: "Keep",
        description: "Desc",
        instructions: "Inst",
      });
      const update = vi
        .spyOn(UserSkillQuota, "updateOne")
        .mockRejectedValueOnce(new Error("quota unavailable"));
      try {
        await expect(
          personalSkillService.remove(String(ownerId), created.id, 1),
        ).rejects.toThrow("quota unavailable");
      } finally {
        update.mockRestore();
      }
      expect(await UserSkill.countDocuments({ userId: ownerId })).toBe(1);
      expect((await UserSkillQuota.findOne({ userId: ownerId }))?.count).toBe(
        1,
      );
    });

    it("does not write skills when a transaction cannot be opened", async () => {
      const start = vi
        .spyOn(mongoose, "startSession")
        .mockRejectedValueOnce(new Error("session unavailable"));
      try {
        await expect(
          personalSkillService.create(String(ownerId), {
            name: "No fallback",
            description: "Desc",
            instructions: "Inst",
          }),
        ).rejects.toThrow("session unavailable");
      } finally {
        start.mockRestore();
      }
      expect(await UserSkill.countDocuments({ userId: ownerId })).toBe(0);
      expect((await UserSkillQuota.findOne({ userId: ownerId }))?.count).toBe(
        0,
      );
    });

    it("keeps counter and documents consistent during delete/create at quota", async () => {
      const seeded = Array.from({ length: 50 }, (_, i) => ({
        _id: randomUUID(),
        userId: ownerId,
        name: `Skill ${i}`,
        description: "Desc",
        instructions: "Inst",
        version: 1,
        enabled: false,
      }));
      await UserSkill.insertMany(seeded);
      await UserSkillQuota.create({ userId: ownerId, count: 50 });
      const outcomes = await Promise.allSettled([
        personalSkillService.remove(String(ownerId), seeded[0]!._id, 1),
        personalSkillService.create(String(ownerId), {
          name: "Replacement",
          description: "Desc",
          instructions: "Inst",
        }),
      ]);
      expect(outcomes[0]!.status).toBe("fulfilled");
      const count = await UserSkill.countDocuments({ userId: ownerId });
      expect(count).toBeGreaterThanOrEqual(49);
      expect(count).toBeLessThanOrEqual(50);
      expect((await UserSkillQuota.findOne({ userId: ownerId }))?.count).toBe(
        count,
      );
    });

    it("does not let an admin read personal skills owned by another user", async () => {
      const created = await personalSkillService.create(String(ownerId), {
        name: "Private",
        description: "Desc",
        instructions: "Secret",
      });
      for (const method of ["get", "put", "delete"] as const) {
        const api = request(app);
        const req = api[method](
          `/api/ai/skills/${created.id}?expectedVersion=1`,
        ).set("Authorization", tokenFor(adminId));
        if (method === "put")
          req.send({
            expectedVersion: 1,
            name: "Override",
            description: "Desc",
            instructions: "Override",
            enabled: true,
          });
        expect((await req).status).toBe(404);
      }
      const listed = await request(app)
        .get("/api/ai/skills")
        .set("Authorization", tokenFor(ownerId));
      expect(listed.headers["cache-control"]).toBe("no-store");
      expect(listed.body.data[0].instructions).toBeUndefined();
    });

    it("allows duplicate names because identity is UUID", async () => {
      const skill1 = await personalSkillService.create(String(ownerId), {
        name: "Identical Name",
        description: "Desc 1",
        instructions: "Inst 1",
        enabled: true,
      });

      const skill2 = await personalSkillService.create(String(ownerId), {
        name: "Identical Name",
        description: "Desc 2",
        instructions: "Inst 2",
        enabled: true,
      });

      expect(skill1.id).not.toBe(skill2.id);
      expect(skill1.name).toBe(skill2.name);
    });

    it("enforces 50 skill quota and atomic race on concurrent creates", async () => {
      // Seed 49 skills
      const initialSkills = Array.from({ length: 49 }, (_, i) => ({
        _id: randomUUID(),
        userId: ownerId,
        name: `Skill ${i + 1}`,
        description: `Desc ${i + 1}`,
        instructions: `Inst ${i + 1}`,
        enabled: true,
        version: 1,
      }));
      await UserSkill.insertMany(initialSkills);
      await UserSkillQuota.create({ userId: ownerId, count: 49 });

      // Run 2 concurrent creates: only 1 must succeed
      const validSkill = {
        name: "Race Skill",
        description: "Race description",
        instructions: "Race instructions",
        enabled: true,
      };

      const results = await Promise.allSettled([
        personalSkillService.create(String(ownerId), validSkill),
        personalSkillService.create(String(ownerId), validSkill),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0]?.reason).toMatchObject({
        statusCode: 409,
        code: "SKILL_0003",
      });
      expect(await userSkillRepository.count(String(ownerId))).toBe(50);
    });

    it("prevents other user from reading, updating, or deleting owner skill (returns 404)", async () => {
      const created = await personalSkillService.create(String(ownerId), {
        name: "Owner Private Skill",
        description: "Owner Desc",
        instructions: "Owner Inst",
        enabled: true,
      });

      // Other user GET -> 404
      const getRes = await request(app)
        .get(`/api/ai/skills/${created.id}`)
        .set("Authorization", tokenFor(otherUserId));
      expect(getRes.status).toBe(404);

      // Other user PUT -> 404
      const putRes = await request(app)
        .put(`/api/ai/skills/${created.id}`)
        .set("Authorization", tokenFor(otherUserId))
        .send({
          expectedVersion: 1,
          name: "Hijack",
          description: "Desc",
          instructions: "Inst",
          enabled: true,
        });
      expect(putRes.status).toBe(404);

      // Other user DELETE -> 404
      const deleteRes = await request(app)
        .delete(`/api/ai/skills/${created.id}?expectedVersion=1`)
        .set("Authorization", tokenFor(otherUserId));
      expect(deleteRes.status).toBe(404);
    });

    it("enforces optimistic concurrency on update and delete", async () => {
      const created = await personalSkillService.create(String(ownerId), {
        name: "Versioned Skill",
        description: "Desc",
        instructions: "Inst",
        enabled: true,
      });
      expect(created.version).toBe(1);

      // PUT with wrong version -> 409
      const putRes = await request(app)
        .put(`/api/ai/skills/${created.id}`)
        .set("Authorization", tokenFor(ownerId))
        .send({
          expectedVersion: 99,
          name: "Updated",
          description: "Desc",
          instructions: "Inst",
          enabled: true,
        });
      expect(putRes.status).toBe(409);

      // DELETE with wrong version -> 409
      const delRes = await request(app)
        .delete(`/api/ai/skills/${created.id}?expectedVersion=99`)
        .set("Authorization", tokenFor(ownerId));
      expect(delRes.status).toBe(409);

      // Successful update bumps version to 2
      const goodPut = await request(app)
        .put(`/api/ai/skills/${created.id}`)
        .set("Authorization", tokenFor(ownerId))
        .send({
          expectedVersion: 1,
          name: "Updated Valid",
          description: "Desc",
          instructions: "Inst",
          enabled: true,
        });
      expect(goodPut.status).toBe(200);
      expect(goodPut.body.data.version).toBe(2);

      // Successful delete decrements count
      const goodDel = await request(app)
        .delete(`/api/ai/skills/${created.id}?expectedVersion=2`)
        .set("Authorization", tokenFor(ownerId));
      expect(goodDel.status).toBe(200);
      expect(await userSkillRepository.count(String(ownerId))).toBe(0);
    });
  });
});
