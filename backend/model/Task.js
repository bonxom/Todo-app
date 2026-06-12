import mongoose from "mongoose";
import { getStartOfToday } from "../utils/dateTime.js";

const taskSchema = new mongoose.Schema({
    // userId: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'User',
    //     required: true
    // },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'given-up'],
        default: 'pending'
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
        default: 'Medium'
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        default: null
    },
    startDate: {
        type: Date,
        default: getStartOfToday
    },
    dueDate: {
        type: Date,
    },
    completedAt: {
        type: Date,
    },
    isOverDue: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

taskSchema.index({ categoryId: 1 });
taskSchema.index({ projectId: 1 });

const Task = mongoose.model("Task", taskSchema);
export default Task;
