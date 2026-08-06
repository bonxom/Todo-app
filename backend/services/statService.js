import Stat from '../models/Stat.js';
import { statRepository } from '../repositories/statRepository.js';

const toDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

const ensureStat = async (userId) => {
  let stats = await statRepository.findByUser(userId);
  if (!stats) {
    stats = new Stat({ userId });
    await stats.save();
  }
  return stats;
};

const getTodayDailyStat = (stats) => {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  let dailyStat = stats.dailyStats.find(
    (ds) => ds.date.toISOString().split('T')[0] === dateStr
  );

  if (!dailyStat) {
    dailyStat = {
      date: today,
      completedTasks: 0,
      completedOfEachCategory: [],
      givenUpTasks: 0,
      givenUpOfEachCategory: [],
    };
    stats.dailyStats.push(dailyStat);
  }

  return dailyStat;
};

const incrementCategoryCount = (collection, categoryId, categoryName) => {
  const existing = collection.find(
    (c) => c.categoryId && c.categoryId.toString() === categoryId.toString()
  );

  if (existing) {
    existing.count += 1;
  } else {
    collection.push({ categoryId, categoryName, count: 1 });
  }
};

const decrementCategoryCount = (collection, categoryId) => {
  const existing = collection.find(
    (c) => c.categoryId && c.categoryId.toString() === categoryId.toString()
  );

  if (existing) {
    existing.count = Math.max(0, existing.count - 1);
  }
};

const getCategoryStatPayload = (task) => ({
  categoryId: task.categoryId?._id || task.categoryId || null,
  categoryName: task.categoryId?.name || 'Uncategorized',
});

const getTaskCompletionDate = (task) =>
  task.completedAt || task.updatedAt || task.createdAt;

const getEntityPayload = (entity) => {
  if (!entity) return null;
  return { _id: entity._id, name: entity.name };
};

const serializeCompletedTask = (task) => ({
  _id: task._id,
  title: task.title,
  description: task.description,
  completedAt: task.completedAt || null,
  completionDate: getTaskCompletionDate(task),
  dueDate: task.dueDate || null,
  priority: task.priority,
  status: task.status,
  project: getEntityPayload(task.projectId),
  category: getEntityPayload(task.categoryId),
});

async function rebuildStats(user) {
  const tasks = await statRepository.getTasksByUser(user);
  let stats = await statRepository.findByUser(user);

  if (!stats) {
    stats = new Stat({ userId: user._id });
  }

  stats.totalTasks = tasks.length;
  stats.pendingTasks = tasks.filter((t) => t.status === 'pending').length;
  stats.inProgressTasks = tasks.filter((t) => t.status === 'in-progress').length;
  stats.completedTasks = tasks.filter((t) => t.status === 'completed').length;
  stats.givenUpTasks = tasks.filter((t) => t.status === 'given-up').length;

  const dailyStatsMap = new Map();

  const ensureDaily = (dateKey) => {
    if (!dailyStatsMap.has(dateKey)) {
      dailyStatsMap.set(dateKey, {
        date: new Date(`${dateKey}T00:00:00.000Z`),
        completedTasks: 0,
        completedOfEachCategory: [],
        givenUpTasks: 0,
        givenUpOfEachCategory: [],
      });
    }
    return dailyStatsMap.get(dateKey);
  };

  tasks.forEach((task) => {
    if (task.status === 'completed') {
      const dateKey = toDateKey(task.completedAt || task.updatedAt || task.createdAt);
      if (dateKey) {
        const ds = ensureDaily(dateKey);
        ds.completedTasks += 1;
        const { categoryId, categoryName } = getCategoryStatPayload(task);
        incrementCategoryCount(ds.completedOfEachCategory, categoryId, categoryName);
      }
    }

    if (task.status === 'given-up') {
      const dateKey = toDateKey(task.updatedAt || task.createdAt);
      if (dateKey) {
        const ds = ensureDaily(dateKey);
        ds.givenUpTasks += 1;
        const { categoryId, categoryName } = getCategoryStatPayload(task);
        incrementCategoryCount(ds.givenUpOfEachCategory, categoryId, categoryName);
      }
    }
  });

  stats.dailyStats = Array.from(dailyStatsMap.values()).sort(
    (a, b) => a.date - b.date
  );

  await stats.save();
  return stats;
}

const incrementInProgress = async (userId) => {
  const stats = await ensureStat(userId);
  stats.totalTasks += 1;
  stats.inProgressTasks += 1;
  await stats.save();
};

const incrementCompleted = async (userId, categoryId, categoryName) => {
  const stats = await ensureStat(userId);
  stats.completedTasks += 1;
  stats.inProgressTasks = Math.max(0, stats.inProgressTasks - 1);

  const dailyStat = getTodayDailyStat(stats);
  dailyStat.completedTasks += 1;
  incrementCategoryCount(dailyStat.completedOfEachCategory, categoryId, categoryName);

  await stats.save();
};

const incrementGivenUp = async (userId, categoryId, categoryName) => {
  const stats = await ensureStat(userId);
  stats.givenUpTasks += 1;
  stats.inProgressTasks = Math.max(0, stats.inProgressTasks - 1);

  const dailyStat = getTodayDailyStat(stats);
  dailyStat.givenUpTasks += 1;
  incrementCategoryCount(dailyStat.givenUpOfEachCategory, categoryId, categoryName);

  await stats.save();
};

const incrementStart = async (userId) => {
  const stats = await ensureStat(userId);
  stats.inProgressTasks += 1;
  stats.pendingTasks = Math.max(0, stats.pendingTasks - 1);
  await stats.save();
};

const incrementPending = async (userId) => {
  const stats = await ensureStat(userId);
  stats.totalTasks += 1;
  stats.pendingTasks += 1;
  await stats.save();
};

const incrementRawInProgress = async (userId) => {
  const stats = await ensureStat(userId);
  stats.inProgressTasks += 1;
  await stats.save();
};

const incrementFinish = async (userId) => {
  const stats = await ensureStat(userId);
  stats.completedTasks += 1;
  stats.inProgressTasks = Math.max(0, stats.inProgressTasks - 1);
  await stats.save();
};

const incrementGiveUp = async (userId) => {
  const stats = await ensureStat(userId);
  stats.givenUpTasks += 1;
  stats.inProgressTasks = Math.max(0, stats.inProgressTasks - 1);
  await stats.save();
};

const decrementCompleted = async (userId, categoryId) => {
  const stats = await statRepository.findByUser(userId);
  if (!stats) return;

  stats.completedTasks = Math.max(0, stats.completedTasks - 1);

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const dailyStat = stats.dailyStats.find(
    (ds) => ds.date.toISOString().split('T')[0] === dateStr
  );

  if (dailyStat) {
    dailyStat.completedTasks = Math.max(0, dailyStat.completedTasks - 1);
    decrementCategoryCount(dailyStat.completedOfEachCategory, categoryId);
  }

  await stats.save();
};

const decrementGivenUp = async (userId, categoryId) => {
  const stats = await statRepository.findByUser(userId);
  if (!stats) return;

  stats.givenUpTasks = Math.max(0, stats.givenUpTasks - 1);

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const dailyStat = stats.dailyStats.find(
    (ds) => ds.date.toISOString().split('T')[0] === dateStr
  );

  if (dailyStat) {
    dailyStat.givenUpTasks = Math.max(0, dailyStat.givenUpTasks - 1);
    decrementCategoryCount(dailyStat.givenUpOfEachCategory, categoryId);
  }

  await stats.save();
};

export const statService = {
  getStats: (user) => rebuildStats(user),

  async getCompletedTasksByDate(user, date) {
    const tasks = await statRepository.getTasksByUser(user);
    return tasks
      .filter((task) => task.status === 'completed' && toDateKey(getTaskCompletionDate(task)) === date)
      .sort((a, b) => new Date(getTaskCompletionDate(a)) - new Date(getTaskCompletionDate(b)))
      .map(serializeCompletedTask);
  },

  incrementInProgress,
  incrementCompleted,
  incrementGivenUp,
  incrementStart,
  incrementPending,
  incrementRawInProgress,
  incrementFinish,
  incrementGiveUp,
  decrementCompleted,
  decrementGivenUp,
};
