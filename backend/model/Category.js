import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
})

// Compound index: unique name per user
categorySchema.index({ userId: 1, name: 1 }, { unique: true });

categorySchema.statics.findByUserAndName = function(userId, name) {
    return this.findOne({ userId, name });
};

categorySchema.pre('findOneAndDelete', async function() {
    const Task = mongoose.model('Task');
    const Category = mongoose.model('Category');
    
    // Get the category being deleted
    const categoryToDelete = await this.model.findOne(this.getQuery());
    
    if (categoryToDelete) {
        // Find Uncategorized category of the same user
        const uncategorizedCategory = await Category.findOne({
            userId: categoryToDelete.userId,
            name: 'Uncategorized'
        });
        
        // Update tasks to Uncategorized or null
        await Task.updateMany(
            { categoryId: categoryToDelete._id },
            { $set: { categoryId: uncategorizedCategory?._id || null } }
        );
    }
});

const Category = mongoose.model("Category", categorySchema);
export default Category;