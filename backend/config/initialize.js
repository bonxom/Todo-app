import User from '../model/User.js';
import Category from '../model/Category.js';

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

export const init = async () => {
    await initializeAdmin();
    // await initializeCategories();
}
