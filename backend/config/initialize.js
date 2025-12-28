import User from '../model/User.js';

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
            
            console.log('✅ Default admin account created:');
            console.log('   Email: admin@todoapp.com');
            console.log('   Password: admin123');
            console.log('   ⚠️  Please change the password after first login!');
        } else {
            console.log('✅ Admin account already exists');
        }
    } catch (error) {
        console.error('❌ Error initializing admin:', error.message);
    }
};
