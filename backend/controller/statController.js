import Stat from "../model/Stat.js";
import mongoose from "mongoose";

// Controller to get stats for a user
export const getStats = async (req, res) => {
    try {
        const userId = req.user._id;

        let stats = await Stat.findOne({ userId });

        // If stats do not exist for the user, create a new stats document
        if (!stats) {
            stats = new Stat({ userId });
            await stats.save();
        }

        res.status(200).json(stats);
    } catch (error) {
        console.error("Error fetching stats:", error);
        res.status(500).json({ message: "Server error while fetching stats." });
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