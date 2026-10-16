import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Task from "../../models/Task.js";
import Category from "../../models/Category.js";
import Project from "../../models/Project.js";
import "../../models/User.js";
import type { IUserDocument } from "../../types/IUser.js";
import { taskService } from "../taskService.js";

const uri = process.env.ORBIT_MCP_TEST_MONGO_URI;
const dbName = `orbit_mcp_phase1_test_${process.pid}_${Date.now()}`;
const makeUser = (role = "USER") => ({
  _id: new mongoose.Types.ObjectId(), role,
}) as IUserDocument;

describe.skipIf(!uri)("getAll MongoDB authorization", () => {
  const a = makeUser();
  const b = makeUser();
  const categoryOnly = makeUser();
  const projectOnly = makeUser();
  const empty = makeUser();
  const admin = makeUser("ADMIN");
  const ca = new mongoose.Types.ObjectId();
  const cb = new mongoose.Types.ObjectId();
  const cc = new mongoose.Types.ObjectId();
  const pa = new mongoose.Types.ObjectId();
  const pb = new mongoose.Types.ObjectId();
  const pp = new mongoose.Types.ObjectId();
  const at = new Date("2026-10-16T12:00:00.000Z");

  beforeAll(async () => {
    if (!uri || !/^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\//.test(uri)) {
      throw new Error("Use an explicit loopback disposable MongoDB URI");
    }
    await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 5000 });
    // Insert through collections to avoid signup hooks; IDs are fixture-only.
    await mongoose.connection.collection("users").insertMany(
      [a, b, categoryOnly, projectOnly, empty, admin].map((user, index) => ({
        _id: user._id, role: user.role, name: `Fixture ${index}`,
        email: `fixture-${index}@example.invalid`,
      })),
    );
    await Category.collection.insertMany([
      { _id: ca, userId: a._id, name: "A" },
      { _id: cb, userId: b._id, name: "B" },
      { _id: cc, userId: categoryOnly._id, name: "Category only" },
    ]);
    await Project.collection.insertMany([
      { _id: pa, userId: a._id, name: "A", status: "active" },
      { _id: pb, userId: b._id, name: "B", status: "active" },
      { _id: pp, userId: projectOnly._id, name: "Project only", status: "active" },
    ]);
    await Task.create([
      { title: "A report", categoryId: ca, projectId: pa, dueDate: at },
      { title: "A standalone report", categoryId: ca },
      { title: "A project report", projectId: pa, dueDate: at },
      { title: "B report", categoryId: cb, projectId: pb, dueDate: at },
      { title: "B standalone report", categoryId: cb },
      { title: "C report", categoryId: cc },
      { title: "P report", projectId: pp },
      { title: "Literal", description: "A+B", categoryId: ca },
      { title: "Regex decoy", description: "aaab", categoryId: ca },
      { title: "Completed report", categoryId: ca, projectId: pa,
        status: "completed", dueDate: at },
    ]);
  }, 30000);

  afterAll(async () => {
    try {
      if (mongoose.connection.name === dbName && mongoose.connection.db) {
        await mongoose.connection.db.dropDatabase();
      }
    } finally {
      await mongoose.disconnect();
    }
  });

  async function expectTitles(
    user: IUserDocument, filters: Record<string, unknown>, titles: string[],
  ) {
    const result = await taskService.getAll(user, filters);
    expect(result.data.map((task) => task.title).sort()).toEqual([...titles].sort());
    expect(result.pageInfo.totalCount).toBe(titles.length);
  }

  it("A1/A5: search preserves both access branches", async () => {
    await expectTitles(a, { search: "report" }, [
      "A report", "A standalone report", "A project report", "Completed report",
    ]);
  });
  it("A2/A3: project-only user cannot override ownership", async () => {
    await expectTitles(projectOnly, { projectId: pb.toString() }, []);
    await expectTitles(projectOnly, { projectId: "standalone" }, []);
    await expectTitles(projectOnly, { projectId: pp.toString() }, ["P report"]);
  });
  it("A4: category-only and empty users stay isolated", async () => {
    await expectTitles(categoryOnly, { search: "report" }, ["C report"]);
    await expectTitles(empty, {}, []);
    await expectTitles(empty, { search: "report", projectId: pb.toString() }, []);
  });
  it("A6: combines filters including inclusive date bounds", async () => {
    await expectTitles(a, {
      search: "report", status: "pending", projectId: pa.toString(),
      startDate: at.toISOString(), endDate: at.toISOString(),
    }, ["A report", "A project report"]);
    await expectTitles(a, { search: "report", projectId: "standalone" }, [
      "A standalone report",
    ]);
    await expectTitles(a, {
      search: "report", status: "pending", projectId: pa.toString(),
      startDate: "2026-10-17T00:00:00.000Z",
      endDate: "2026-10-18T00:00:00.000Z",
    }, []);
  });
  it("A7: treats search literally, trims and searches description", async () => {
    await expectTitles(a, { search: " a+b " }, ["Literal"]);
    const unfiltered = await taskService.getAll(a, {});
    const whitespace = await taskService.getAll(a, { search: "   " });
    expect(whitespace.data.map((t) => t._id.toString()).sort())
      .toEqual(unfiltered.data.map((t) => t._id.toString()).sort());
    expect(whitespace.pageInfo.totalCount).toBe(6);
  });
  it("A8: admin keeps global access but honors filters", async () => {
    expect((await taskService.getAll(admin, {})).pageInfo.totalCount).toBe(10);
    await expectTitles(admin, { search: "report", projectId: pb.toString() }, [
      "B report",
    ]);
  });
  it("A9: count and pagination apply after authorization", async () => {
    const result = await taskService.getAll(a, {
      search: "report", pageNo: 2, pageSize: 1, sort: "title:asc",
    });
    expect(result.data.map((t) => t.title)).toEqual(["A report"]);
    expect(result.pageInfo).toEqual({
      pageNo: 2, pageSize: 1, totalCount: 4, totalPage: 4,
    });
    expect((await taskService.getAll(a, {})).pageInfo.totalCount).toBe(6);
  });
});
