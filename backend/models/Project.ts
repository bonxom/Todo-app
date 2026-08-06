import mongoose, { Schema } from 'mongoose';
import { IProjectDocument, IProjectModel } from '../types/IProject.js';

const projectSchema = new Schema<IProjectDocument, IProjectModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    color: {
      type: String,
      trim: true,
      default: '#E5E7EB',
      validate: {
        validator: (value: string) => /^#[0-9A-Fa-f]{6}$/.test(value),
        message: 'Project color must be a six-digit hex color',
      },
    },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
  },
  { timestamps: true }
);

projectSchema.index({ userId: 1, name: 1 }, { unique: true });
projectSchema.index({ userId: 1, status: 1 });

projectSchema.statics.findByUserAndName = function (userId: mongoose.Types.ObjectId | string, name: string) {
  return this.findOne({ userId, name });
};

projectSchema.pre('findOneAndDelete', async function () {
  const Task = mongoose.model('Task');
  const projectToDelete = await this.model.findOne(this.getQuery());

  if (projectToDelete) {
    await Task.updateMany(
      { projectId: projectToDelete._id },
      { $set: { projectId: null } }
    );
  }
});

const Project = mongoose.model<IProjectDocument, IProjectModel>('Project', projectSchema);
export default Project;
