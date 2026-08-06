import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUserDocument, IUserModel } from '../types/IUser.js';
import { createDefaultCategories } from '../config/initialize.js';

const userSchema = new Schema<IUserDocument, IUserModel>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    dob: { type: Date },
    nationality: { type: String, trim: true },
    role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    avatarUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  (this.$locals as Record<string, unknown>).wasNew = this.isNew;

  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(parseInt(process.env.SALT_ROUNDS as string, 10));
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.post('save', async function (doc: IUserDocument) {
  const wasNew = (this.$locals as Record<string, boolean | undefined>).wasNew;
  if (wasNew) {
    await createDefaultCategories(doc._id as mongoose.Types.ObjectId, doc.email);
  }
});

userSchema.methods.comparePassword = async function (plainPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, this.password);
};

userSchema.pre('findOneAndDelete', async function () {
  const Category = mongoose.model('Category');
  const Project = mongoose.model('Project');
  const Task = mongoose.model('Task');

  const userToDelete = await this.model.findOne(this.getQuery());

  if (userToDelete) {
    const categories = await Category.find({ userId: userToDelete._id });
    const categoryIds = categories.map((cat: { _id: mongoose.Types.ObjectId }) => cat._id);
    const projects = await Project.find({ userId: userToDelete._id });
    const projectIds = projects.map((project: { _id: mongoose.Types.ObjectId }) => project._id);

    const taskDeleteConditions: Array<Record<string, unknown>> = [];
    if (categoryIds.length > 0) {
      taskDeleteConditions.push({ categoryId: { $in: categoryIds } });
    }
    if (projectIds.length > 0) {
      taskDeleteConditions.push({ projectId: { $in: projectIds } });
    }

    if (taskDeleteConditions.length > 0) {
      await Task.deleteMany(
        taskDeleteConditions.length === 1 ? taskDeleteConditions[0] : { $or: taskDeleteConditions }
      );
    }

    await Project.deleteMany({ userId: userToDelete._id });
    await Category.deleteMany({ userId: userToDelete._id });
  }
});

const User = mongoose.model<IUserDocument, IUserModel>('User', userSchema);
export default User;
