import User from '../model/User.js';
import Category from '../model/Category.js';
import Stat from '../model/Stat.js';
import Task from '../model/Task.js';

const initCategory = ['Work', 'Personal', 'Health', 'Uncategorized'];

export const initializeAdmin = async () => {
    try {
        // Check if admin exists
        const adminExists = await User.findOne({ role: 'ADMIN' });
        
        if (!adminExists) {
            // Create default admin account
            const admin = await User.create({
                name: 'Admin',
                email: 'admin@todoapp.com',
                password: 'admin123',
                role: 'ADMIN'
            });
            
            console.log('   Default admin account created:');
            console.log('   Email: admin@todoapp.com');
            console.log('   Password: admin123');
            console.log('   Please change the password after first login!');
        } else {
            console.log('*** Admin account already exists ***');
        }
    } catch (error) {
        console.error('   Error initializing admin:', error.message);
    }
};

// Helper function to create default categories for a specific user
export const createDefaultCategories = async (userId, userEmail) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            console.error(`   User with ID ${userId} not found.`);
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
                    description: `Default ${categoryName} category`
                });

                user.categories.push(newCategory._id);
                console.log(`   Created default category '${categoryName}' for user ${userEmail}`);
            } else {
                // Category exists but may not be in user.categories array
                if (!user.categories.includes(existingCategory._id)) {
                    user.categories.push(existingCategory._id);
                }
            }
        }
        // Save once after all categories are added
        await user.save();
    } catch (error) {
        console.error(`   Error creating default categories for user ${userEmail}:`, error.message);
    }
};

// export const initializeCategories = async () => {
//     try {
//         const users = await User.find();

//         for (const user of users) {
//             await createDefaultCategories(user._id, user.email);
//         }
//     } catch (error) {
//         console.error('   Error initializing categories:', error.message);
//     }
// };

export const initializeStats = async () => {
    try {
        console.log('*** Initializing stats for all users ***');
        const users = await User.find({ role: { $ne: 'ADMIN' } }); // Skip admin

        for (const user of users) {
            await updateStat(user._id);
        }
        console.log('*** Stats initialization completed ***');
    } catch (error) {
        console.error('   Error initializing stats:', error.message);
    }
};

export const updateStat = async (userId) => {
    try {
        let stats = await Stat.findOne({ userId });

        if (!stats) {
            stats = new Stat({ userId });
        }
        
        // Get all categories of this user
        const userCategories = await Category.find({ userId });
        const categoryIds = userCategories.map(cat => cat._id);
        
        // Get all tasks belonging to user's categories
        const allTasks = await Task.find({ categoryId: { $in: categoryIds } });
        
        // Reset overall stats
        stats.totalTasks = allTasks.length;
        stats.pendingTasks = allTasks.filter(t => t.status === 'pending').length;
        stats.inProgressTasks = allTasks.filter(t => t.status === 'in-progress').length;
        stats.completedTasks = allTasks.filter(t => t.status === 'completed').length;
        stats.givenUpTasks = allTasks.filter(t => t.status === 'given-up').length;
        
        // Reset and rebuild dailyStats
        stats.dailyStats = [];// Cập nhật stats cho tất cả users khi khởi động
        
        // Group completed tasks by date
        const completedTasks = allTasks.filter(t => t.status === 'completed' && t.completedAt);
        const givenUpTasks = allTasks.filter(t => t.status === 'given-up' && t.updatedAt);
        
        // Create a map to store daily stats
        const dailyStatsMap = new Map();
        
        // Process completed tasks
        for (const task of completedTasks) {
            const dateStr = task.completedAt.toISOString().split('T')[0];
            
            if (!dailyStatsMap.has(dateStr)) {
                dailyStatsMap.set(dateStr, {
                    date: new Date(dateStr),
                    completedTasks: 0,
                    completedOfEachCategory: [],
                    givenUpTasks: 0,
                    givenUpOfEachCategory: []
                });
            }
            
            const dailyStat = dailyStatsMap.get(dateStr);
            dailyStat.completedTasks += 1;
            
            // Update category-specific stats
            const category = userCategories.find(c => c._id.toString() === task.categoryId.toString());
            if (category) {
                let categoryStat = dailyStat.completedOfEachCategory.find(
                    cs => cs.categoryId.toString() === category._id.toString()
                );
                
                if (categoryStat) {
                    categoryStat.count += 1;
                } else {
                    dailyStat.completedOfEachCategory.push({
                        categoryId: category._id,
                        categoryName: category.name,
                        count: 1
                    });
                }
            }
        }
        
        // Process given-up tasks
        for (const task of givenUpTasks) {
            const dateStr = task.updatedAt.toISOString().split('T')[0];
            
            if (!dailyStatsMap.has(dateStr)) {
                dailyStatsMap.set(dateStr, {
                    date: new Date(dateStr),
                    completedTasks: 0,
                    completedOfEachCategory: [],
                    givenUpTasks: 0,
                    givenUpOfEachCategory: []
                });
            }
            
            const dailyStat = dailyStatsMap.get(dateStr);
            dailyStat.givenUpTasks += 1;
            
            // Update category-specific stats
            const category = userCategories.find(c => c._id.toString() === task.categoryId.toString());
            if (category) {
                let categoryStat = dailyStat.givenUpOfEachCategory.find(
                    cs => cs.categoryId.toString() === category._id.toString()
                );
                
                if (categoryStat) {
                    categoryStat.count += 1;
                } else {
                    dailyStat.givenUpOfEachCategory.push({
                        categoryId: category._id,
                        categoryName: category.name,
                        count: 1
                    });
                }
            }
        }
        
        // Convert map to array and sort by date
        stats.dailyStats = Array.from(dailyStatsMap.values()).sort((a, b) => a.date - b.date);
        
        await stats.save();
        console.log(`   Stats updated for user ${userId}: ${stats.totalTasks} total tasks`);
    } catch (error) {
        console.error("Error updating stats:", error);
    }
}

export const init = async () => {
    await initializeAdmin();
    // await initializeCategories();
    // await initializeStats(); 
}
