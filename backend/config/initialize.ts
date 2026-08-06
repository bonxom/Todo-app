import mongoose from 'mongoose';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Stat from '../models/Stat.js';
import Task from '../models/Task.js';

const initCategory: string[] = ['Work', 'Personal', 'Health', 'Uncategorized'];

const toLocalDateKey = (value: unknown): string => {
  const date = new Date(value as string | number | Date);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

export const createDefaultCategories = async (
  userId: mongoose.Types.ObjectId,
  userEmail: string
): Promise<void> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.error(`   User with ID ${String(userId)} not found.`);
      return;
    }
    if (user.name === 'Admin') {
      console.log(`   Skipping default categories for admin user ${userEmail}`);
      return;
    }
    for (const categoryName of initCategory) {
      const existingCategory = await Category.findByUserAndName(userId, categoryName);
      if (!existingCategory) {
        const newCategory = await Category.create({
          userId: userId,
          name: categoryName,
          description: `Default ${categoryName} category`,
        });
        user.categories.push(newCategory._id);
        console.log(`   Created default category '${categoryName}' for user ${userEmail}`);
      } else {
        if (!user.categories.includes(existingCategory._id)) {
          user.categories.push(existingCategory._id);
        }
      }
    }
    await user.save();
  } catch (error: unknown) {
    console.error(
      `   Error creating default categories for user ${userEmail}:`,
      (error as Error).message
    );
  }
};

export const initializeStats = async (): Promise<void> => {
  try {
    console.log('*** Initializing stats for all users ***');
    const users = await User.find({ role: { $ne: 'ADMIN' } });
    for (const user of users) {
      await updateStat(user._id as mongoose.Types.ObjectId);
    }
    console.log('*** Stats initialization completed ***');
  } catch (error: unknown) {
    console.error('   Error initializing stats:', (error as Error).message);
  }
};

export const updateStat = async (userId: mongoose.Types.ObjectId): Promise<void> => {
  try {
    let stats = await Stat.findOne({ userId });
    if (!stats) {
      stats = new Stat({ userId });
    }

    const userCategories = await Category.find({ userId });
    const categoryIds = userCategories.map((cat) => cat._id);

    const allTasks = await Task.find({ categoryId: { $in: categoryIds } });

    stats.totalTasks = allTasks.length;
    stats.pendingTasks = allTasks.filter((t) => t.status === 'pending').length;
    stats.inProgressTasks = allTasks.filter((t) => t.status === 'in-progress').length;
    stats.completedTasks = allTasks.filter((t) => t.status === 'completed').length;
    stats.givenUpTasks = allTasks.filter((t) => t.status === 'given-up').length;

    stats.dailyStats = [];

    const completedTasks = allTasks.filter(
      (t) => t.status === 'completed' && (t.completedAt || t.updatedAt)
    );
    const givenUpTasks = allTasks.filter((t) => t.status === 'given-up' && t.updatedAt);

    const dailyStatsMap = new Map<
      string,
      {
        date: Date;
        completedTasks: number;
        completedOfEachCategory: Array<{
          categoryId: mongoose.Types.ObjectId;
          categoryName: string;
          count: number;
        }>;
        givenUpTasks: number;
        givenUpOfEachCategory: Array<{
          categoryId: mongoose.Types.ObjectId;
          categoryName: string;
          count: number;
        }>;
      }
    >();

    for (const task of completedTasks) {
      const completedDate = task.completedAt || task.updatedAt;
      const dateStr = toLocalDateKey(completedDate);

      if (!dailyStatsMap.has(dateStr)) {
        dailyStatsMap.set(dateStr, {
          date: new Date(dateStr),
          completedTasks: 0,
          completedOfEachCategory: [],
          givenUpTasks: 0,
          givenUpOfEachCategory: [],
        });
      }

      const dailyStat = dailyStatsMap.get(dateStr)!;
      dailyStat.completedTasks += 1;

      const category = userCategories.find(
        (c) => c._id.toString() === task.categoryId!.toString()
      );
      if (category) {
        const existing = dailyStat.completedOfEachCategory.find(
          (cs) => cs.categoryId.toString() === category._id.toString()
        );
        if (existing) {
          existing.count += 1;
        } else {
          dailyStat.completedOfEachCategory.push({
            categoryId: category._id,
            categoryName: category.name,
            count: 1,
          });
        }
      }
    }

    for (const task of givenUpTasks) {
      const dateStr = toLocalDateKey(task.updatedAt);

      if (!dailyStatsMap.has(dateStr)) {
        dailyStatsMap.set(dateStr, {
          date: new Date(dateStr),
          completedTasks: 0,
          completedOfEachCategory: [],
          givenUpTasks: 0,
          givenUpOfEachCategory: [],
        });
      }

      const dailyStat = dailyStatsMap.get(dateStr)!;
      dailyStat.givenUpTasks += 1;

      const category = userCategories.find(
        (c) => c._id.toString() === task.categoryId!.toString()
      );
      if (category) {
        const existing = dailyStat.givenUpOfEachCategory.find(
          (cs) => cs.categoryId.toString() === category._id.toString()
        );
        if (existing) {
          existing.count += 1;
        } else {
          dailyStat.givenUpOfEachCategory.push({
            categoryId: category._id,
            categoryName: category.name,
            count: 1,
          });
        }
      }
    }

    stats.dailyStats = Array.from(dailyStatsMap.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    await stats.save();
    console.log(`   Stats updated for user ${String(userId)}: ${stats.totalTasks} total tasks`);
  } catch (error: unknown) {
    console.error('Error updating stats:', error);
  }
};
