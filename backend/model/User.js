import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { createDefaultCategories } from '../config/initialize.js';

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true,
            select: false, // Exclude password from query results by default
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        dob: {
            type: Date,
        }, 
        nationality: {
            type: String,
            trim: true
        },
        role: {
            type: String,
            enum: ['USER', 'ADMIN'],
            default: 'USER'
        },
        categories: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category'
        }],
        avatarUrl: {
            type: String,
            default: ''
        }
    },
    {
        timestamps: true        
    }
);


userSchema.pre('save', async function () {
    // Track if this is a new document
    this.$locals.wasNew = this.isNew;
    
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(parseInt(process.env.SALT_ROUNDS));
    this.password = await bcrypt.hash(this.password, salt);
});

// Post-save hook to create default categories for new users
userSchema.post('save', async function (doc) {
    // Only run for new users (not on updates)
    if (this.$locals.wasNew) {
        await createDefaultCategories(doc._id, doc.email);
    }
});

userSchema.methods.comparePassword = async function (plainPassword) {
    return await bcrypt.compare(plainPassword, this.password);
};

// when delete user, delete all tasks and categories belong to this user
userSchema.pre('findOneAndDelete', async function () {
    const Category = mongoose.model('Category');
    const Task = mongoose.model('Task');
    
    // Get the user being deleted
    const userToDelete = await this.model.findOne(this.getQuery());
    
    if (userToDelete) {
        // Find all categories of this user
        const categories = await Category.find({ userId: userToDelete._id });
        const categoryIds = categories.map(cat => cat._id);
        
        // Delete all tasks belonging to these categories
        await Task.deleteMany({ categoryId: { $in: categoryIds } });
        
        // Delete all categories of this user
        await Category.deleteMany({ userId: userToDelete._id });
    }
});

const User = mongoose.model("User", userSchema);

export default User;