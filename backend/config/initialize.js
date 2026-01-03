import User from '../model/User.js';
import Category from '../model/Category.js';

const initCategory = ['Work', 'Personal', 'Health'];

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

export const initializeCategories = async () => {
    try {
        const users = await User.find();

        for (const user of users) {
            for (const categoryName of initCategory) {
                const existingCategory = await Category.findByUserAndName(user._id, categoryName);
                if (!existingCategory) {
                    await Category.create({
                        userId: user._id,
                        name: categoryName,
                        description: `Default ${categoryName} category`
                    });
                    console.log(`   Created default category '${categoryName}' for user ${user.email}`);
                }
            }
        }
    } catch (error) {
        console.error('   Error initializing categories:', error.message);
    }
};

export const init = async () => {
    await initializeAdmin();
    await initializeCategories();
}
