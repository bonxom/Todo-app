import mongoose, { Schema } from 'mongoose';
import { ICategoryDocument, ICategoryModel } from '../types/ICategory.js';

const categorySchema = new Schema<ICategoryDocument, ICategoryModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

categorySchema.index({ userId: 1, name: 1 }, { unique: true });

categorySchema.statics.findByUserAndName = function (userId: mongoose.Types.ObjectId | string, name: string) {
  return this.findOne({ userId, name });
};

categorySchema.pre('findOneAndDelete', async function () {
  const Task = mongoose.model('Task');
  const Category = mongoose.model<ICategoryDocument, ICategoryModel>('Category');
  const categoryToDelete = await this.model.findOne(this.getQuery());

  if (categoryToDelete) {
    const uncategorizedCategory = await Category.findOne({
      userId: categoryToDelete.userId,
      name: 'Uncategorized',
    });
    await Task.updateMany(
      { categoryId: categoryToDelete._id },
      { $set: { categoryId: uncategorizedCategory?._id || null } }
    );
  }
});

const Category = mongoose.model<ICategoryDocument, ICategoryModel>('Category', categorySchema);
export default Category;
