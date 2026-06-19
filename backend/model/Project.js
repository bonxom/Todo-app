import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ""
    },
    color: {
        type: String,
        trim: true,
        default: "#E5E7EB",
        validate: {
            validator: (value) => /^#[0-9A-Fa-f]{6}$/.test(value),
            message: "Project color must be a six-digit hex color"
        }
    }
}, {
    timestamps: true
});

projectSchema.index({ userId: 1, name: 1 }, { unique: true });

projectSchema.statics.findByUserAndName = function(userId, name) {
    return this.findOne({ userId, name });
};

projectSchema.pre("findOneAndDelete", async function() {
    const Task = mongoose.model("Task");
    const projectToDelete = await this.model.findOne(this.getQuery());

    if (projectToDelete) {
        await Task.updateMany(
            { projectId: projectToDelete._id },
            { $set: { projectId: null } }
        );
    }
});

const Project = mongoose.model("Project", projectSchema);

export default Project;
