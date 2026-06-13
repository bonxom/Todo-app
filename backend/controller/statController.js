import Stat from "../model/Stat.js";
import Task from "../model/Task.js";
import Category from "../model/Category.js";
import Project from "../model/Project.js";

const toDateKey = (value) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
    ].join('-');
};

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const getUserStatTasks = async (user) => {
    if (user.role === 'ADMIN') {
        return Task.find({})
            .populate('categoryId', 'name userId')
            .populate('projectId', 'name userId');
    }

    const [userCategories, userProjects] = await Promise.all([
        Category.find({ userId: user._id }).select('_id name'),
        Project.find({ userId: user._id }).select('_id')
    ]);

    const ownershipClauses = [];
    if (userCategories.length > 0) {
        ownershipClauses.push({ categoryId: { $in: userCategories.map((category) => category._id) } });
    }
    if (userProjects.length > 0) {
        ownershipClauses.push({ projectId: { $in: userProjects.map((project) => project._id) } });
    }

    if (ownershipClauses.length === 0) {
        return [];
    }

    const query = ownershipClauses.length === 1 ? ownershipClauses[0] : { $or: ownershipClauses };
    return Task.find(query)
        .populate('categoryId', 'name userId')
        .populate('projectId', 'name userId');
};

const getCategoryStatPayload = (task) => {
    const categoryId = task.categoryId?._id || task.categoryId || null;

    return {
        categoryId,
        categoryName: task.categoryId?.name || 'Uncategorized'
    };
};

const buildStatsFromTasks = async (user) => {
    const userId = user._id;
    const tasks = await getUserStatTasks(user);
    let stats = await Stat.findOne({ userId });

    if (!stats) {
        stats = new Stat({ userId });
    }

    stats.totalTasks = tasks.length;
    stats.pendingTasks = tasks.filter((task) => task.status === 'pending').length;
    stats.inProgressTasks = tasks.filter((task) => task.status === 'in-progress').length;
    stats.completedTasks = tasks.filter((task) => task.status === 'completed').length;
    stats.givenUpTasks = tasks.filter((task) => task.status === 'given-up').length;

    const dailyStatsMap = new Map();
    const ensureDailyStat = (dateKey) => {
        if (!dailyStatsMap.has(dateKey)) {
            dailyStatsMap.set(dateKey, {
                date: new Date(`${dateKey}T00:00:00.000Z`),
                completedTasks: 0,
                completedOfEachCategory: [],
                givenUpTasks: 0,
                givenUpOfEachCategory: []
            });
        }

        return dailyStatsMap.get(dateKey);
    };

    const incrementCategoryStat = (collection, task) => {
        const { categoryId, categoryName } = getCategoryStatPayload(task);
        const categoryKey = categoryId?.toString?.() || 'uncategorized';
        const existingStat = collection.find((categoryStat) => {
            const existingKey = categoryStat.categoryId?.toString?.() || 'uncategorized';
            return existingKey === categoryKey;
        });

        if (existingStat) {
            existingStat.count += 1;
            return;
        }

        collection.push({
            ...(categoryId ? { categoryId } : {}),
            categoryName,
            count: 1
        });
    };

    tasks.forEach((task) => {
        if (task.status === 'completed') {
            const dateKey = toDateKey(task.completedAt || task.updatedAt || task.createdAt);

            if (dateKey) {
                const dailyStat = ensureDailyStat(dateKey);
                dailyStat.completedTasks += 1;
                incrementCategoryStat(dailyStat.completedOfEachCategory, task);
            }
        }

        if (task.status === 'given-up') {
            const dateKey = toDateKey(task.updatedAt || task.createdAt);

            if (dateKey) {
                const dailyStat = ensureDailyStat(dateKey);
                dailyStat.givenUpTasks += 1;
                incrementCategoryStat(dailyStat.givenUpOfEachCategory, task);
            }
        }
    });

    stats.dailyStats = Array.from(dailyStatsMap.values()).sort((left, right) => left.date - right.date);
    await stats.save();

    return stats;
};

// Controller to get stats for a user
export const getStats = async (req, res) => {
    try {
        const stats = await buildStatsFromTasks(req.user);
        res.status(200).json(stats);
    } catch (error) {
        console.error("Error fetching stats:", error);
        res.status(500).json({ message: "Server error while fetching stats." });
    }
};

const getTaskCompletionDate = (task) => task.completedAt || task.updatedAt || task.createdAt;

const getEntityPayload = (entity) => {
    if (!entity) {
        return null;
    }

    return {
        _id: entity._id,
        name: entity.name
    };
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
    category: getEntityPayload(task.categoryId)
});

export const getCompletedTasksByDate = async (req, res) => {
    try {
        const { date } = req.query;

        if (!DATE_KEY_PATTERN.test(date || '')) {
            return res.status(400).json({ message: "A valid date query in YYYY-MM-DD format is required." });
        }

        const tasks = await getUserStatTasks(req.user);
        const completedTasks = tasks
            .filter((task) => {
                if (task.status !== 'completed') {
                    return false;
                }

                return toDateKey(getTaskCompletionDate(task)) === date;
            })
            .sort((left, right) => new Date(getTaskCompletionDate(left)) - new Date(getTaskCompletionDate(right)))
            .map(serializeCompletedTask);

        return res.status(200).json({
            date,
            tasks: completedTasks
        });
    } catch (error) {
        console.error("Error fetching completed tasks by date:", error);
        return res.status(500).json({ message: "Server error while fetching completed tasks." });
    }
};

export const addCompletedTasks = async (userId, categoryId, categoryName) => {
    try {
        let stats = await Stat.findOne({ userId });

        if (!stats) {
            stats = new Stat({ userId });
            await stats.save();
        }
        // overall stat
        stats.completedTasks += 1;
        stats.inProgressTasks = Math.max(0, stats.inProgressTasks - 1);
        
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        
        // daily stat
        let dailyStat = stats.dailyStats.find(ds => ds.date.toISOString().split('T')[0] === dateStr);
        if (!dailyStat) {
            dailyStat = {
                date: today,
                completedTasks: 0,
                completedOfEachCategory: [],
                givenUpTasks: 0,
                givenUpOfEachCategory: []
            };
            stats.dailyStats.push(dailyStat);
        }
        dailyStat.completedTasks += 1;
        
        // Update category-specific stats
        let categoryStat = dailyStat.completedOfEachCategory.find(
            cat => cat.categoryId && cat.categoryId.toString() === categoryId.toString()
        );
        
        if (categoryStat) {
            categoryStat.count += 1;
        } else {
            dailyStat.completedOfEachCategory.push({
                categoryId: categoryId,
                categoryName: categoryName,
                count: 1
            });
        }
        
        await stats.save();
    } catch (error) {
        console.error("Error updating completed tasks stats:", error);
        res.status(500).json({ message: "Server error while updating stats." });
    }
};

export const addGivenUpTasks = async (userId, categoryId, categoryName) => {
    try {
        let stats = await Stat.findOne({ userId });

        if (!stats) {
            stats = new Stat({ userId });
            await stats.save();
        }
        // overall stat
        stats.givenUpTasks += 1;
        stats.inProgressTasks = Math.max(0, stats.inProgressTasks - 1);
        
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        
        // daily stat
        let dailyStat = stats.dailyStats.find(ds => ds.date.toISOString().split('T')[0] === dateStr);
        if (!dailyStat) {
            dailyStat = {
                date: today,
                completedTasks: 0,
                completedOfEachCategory: [],
                givenUpTasks: 0,
                givenUpOfEachCategory: []
            };
            stats.dailyStats.push(dailyStat);
        }
        dailyStat.givenUpTasks += 1;
        
        // Update category-specific stats
        let categoryStat = dailyStat.givenUpOfEachCategory.find(
            cat => cat.categoryId && cat.categoryId.toString() === categoryId.toString()
        );
        
        if (categoryStat) {
            categoryStat.count += 1;
        } else {
            dailyStat.givenUpOfEachCategory.push({
                categoryId: categoryId,
                categoryName: categoryName,
                count: 1
            });
        }
        
        await stats.save();
    } catch (error) {
        console.error("Error updating given up tasks stats:", error);
        res.status(500).json({ message: "Server error while updating stats." });
    }
}

export const addRawInprogressTasks = async (userId) => {
    try {
        let stats = await Stat.findOne({ userId });

        if (!stats) {
            stats = new Stat({ userId });
            await stats.save();
        }
        // overall stat
        stats.inProgressTasks += 1;
        
        await stats.save();
    } catch (error) {
        console.error("Error updating given up tasks stats:", error);
        res.status(500).json({ message: "Server error while updating stats." });
    }
};

export const addFinishTasks = async (userId) => {
    try {
        let stats = await Stat.findOne({ userId });

        if (!stats) {
            stats = new Stat({ userId });
            await stats.save();
        }
        // overall stat
        stats.completedTasks += 1;
        stats.inProgressTasks = Math.max(0, stats.inProgressTasks - 1);
        
        await stats.save();
    } catch (error) {
        console.error("Error updating given up tasks stats:", error);
        res.status(500).json({ message: "Server error while updating stats." });
    }
}

export const addGiveUpTasks = async (userId) => {
    try {
        let stats = await Stat.findOne({ userId });

        if (!stats) {
            stats = new Stat({ userId });
            await stats.save();
        }
        // overall stat
        stats.givenUpTasks += 1;
        stats.inProgressTasks = Math.max(0, stats.inProgressTasks - 1);
        
        await stats.save();
    } catch (error) {
        console.error("Error updating given up tasks stats:", error);
        res.status(500).json({ message: "Server error while updating stats." });
    }
}

export const addStartTask = async (userId) => {
    try {
        let stats = await Stat.findOne({ userId });

        if (!stats) {
            stats = new Stat({ userId });
            await stats.save();
        }
        // overall stat
        stats.inProgressTasks += 1;
        stats.pendingTasks = Math.max(0, stats.pendingTasks - 1);
        
        await stats.save();
    } catch (error) {
        console.error("Error updating start task stats:", error);
    }
};

export const addPendingTask = async (userId) => {
    try {
        let stats = await Stat.findOne({ userId });

        if (!stats) {
            stats = new Stat({ userId });
            await stats.save();
        }
        // overall stat
        stats.totalTasks += 1;
        stats.pendingTasks += 1;
        
        await stats.save();
    } catch (error) {
        console.error("Error updating pending task stats:", error);
    }
};

export const addInProgressTask = async (userId) => {
    try {
        let stats = await Stat.findOne({ userId });

        if (!stats) {
            stats = new Stat({ userId });
            await stats.save();
        }
        // overall stat - task được tạo trực tiếp bởi user
        stats.totalTasks += 1;
        stats.inProgressTasks += 1;
        
        await stats.save();
    } catch (error) {
        console.error("Error updating in-progress task stats:", error);
    }
}

export const removeCompletedTasks = async (userId, categoryId) => {
    try {
        let stats = await Stat.findOne({ userId });

        if (!stats) {
            return res.status(404).json({ message: "Stats not found for user" });
        }
        // overall stat
        stats.completedTasks = Math.max(0, stats.completedTasks - 1);
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];

        // daily stat
        let dailyStat = stats.dailyStats.find(ds => ds.date.toISOString().split('T')[0] === dateStr);
        if (dailyStat) {
            dailyStat.completedTasks = Math.max(0, dailyStat.completedTasks - 1);

            // Update category-specific stats
            let categoryStat = dailyStat.completedOfEachCategory.find(
                cat => cat.categoryId && cat.categoryId.toString() === categoryId.toString()
            );

            if (categoryStat) {
                categoryStat.count = Math.max(0, categoryStat.count - 1);
            }
        }

        await stats.save();
    } catch (error) {
        console.error("Error removing completed tasks stats:", error);
        res.status(500).json({ message: "Server error while updating stats." });
    }
} 

export const removeGivenUpTasks = async (userId, categoryId) => {
    try {
        let stats = await Stat.findOne({ userId });

        if (!stats) {
            return res.status(404).json({ message: "Stats not found for user" });
        }
        // overall stat
        stats.givenUpTasks = Math.max(0, stats.givenUpTasks - 1);
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];

        // daily stat
        let dailyStat = stats.dailyStats.find(ds => ds.date.toISOString().split('T')[0] === dateStr);
        if (dailyStat) {
            dailyStat.givenUpTasks = Math.max(0, dailyStat.givenUpTasks - 1);

            // Update category-specific stats
            let categoryStat = dailyStat.givenUpOfEachCategory.find(
                cat => cat.categoryId && cat.categoryId.toString() === categoryId.toString()
            );

            if (categoryStat) {
                categoryStat.count = Math.max(0, categoryStat.count - 1);
            }
        }

        await stats.save();
    } catch (error) {
        console.error("Error removing given up tasks stats:", error);
        res.status(500).json({ message: "Server error while updating stats." });
    }
}
