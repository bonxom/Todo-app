import mongoose from "mongoose";

const statSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    totalTasks: {
        type: Number,
        required: true,
        default: 0
    },
    completedTasks: {
        type: Number,
        required: true,
        default: 0
    },
    pendingTasks: {
        type: Number,
        required: true,
        default: 0
    },
    inProgressTasks: {
        type: Number,
        required: true,
        default: 0
    },
    givenUpTasks: {
        type: Number,
        required: true,
        default: 0
    },
    // Store stats per day (number of tasks completed, given up each day)
    dailyStats: [{
        date: {
            type: Date,
            required: true
        },
        completedTasks: {
            type: Number,
            required: true,
            default: 0
        },
        completedOfEachCategory: [{
            categoryId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Category'
            },
            categoryName: {
                type: String,
                required: true
            },
            count: {
                type: Number,
                required: true,
                default: 0
            }
        }],
        givenUpTasks: {
            type: Number,
            required: true,
            default: 0
        },
        givenUpOfEachCategory: [{
            categoryId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Category'
            },
            categoryName: {
                type: String,
                required: true
            },
            count: {
                type: Number,
                required: true,
                default: 0
            }
        }]  
    }]
}, {
    timestamps: true
})

const Stat = mongoose.model("Stat", statSchema);
export default Stat;