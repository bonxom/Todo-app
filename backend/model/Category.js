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

categorySchema.pre('remove', async function(next) {
    try {
        const Task = mongoose.model('Task');
        await Task.updateMany(
            { categoryId: this._id },
            { $set: { categoryId: null } }
        );
        next();
    } catch (error) {
        next(error);
    }
});

const Category = mongoose.model("Category", categorySchema);
export default Category;