import Project from "../model/Project.js";
import Task from "../model/Task.js";

const createEmptySummary = () => ({
    totalTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
    givenUpTasks: 0,
    completionRate: 0
});

const addCompletionRate = (summary) => {
    const { _id, ...rest } = summary;
    const totalTasks = rest.totalTasks || 0;
    return {
        ...rest,
        completionRate: totalTasks > 0
            ? Math.round((rest.completedTasks / totalTasks) * 100)
            : 0
    };
};

const getProjectSummaryMap = async (projectIds) => {
    if (projectIds.length === 0) {
        return new Map();
    }

    const summaries = await Task.aggregate([
        {
            $match: {
                projectId: { $in: projectIds }
            }
        },
        {
            $group: {
                _id: "$projectId",
                totalTasks: { $sum: 1 },
                pendingTasks: {
                    $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
                },
                inProgressTasks: {
                    $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] }
                },
                completedTasks: {
                    $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
                },
                givenUpTasks: {
                    $sum: { $cond: [{ $eq: ["$status", "given-up"] }, 1, 0] }
                }
            }
        }
    ]);

    return new Map(
        summaries.map((summary) => [
            summary._id.toString(),
            addCompletionRate(summary)
        ])
    );
};

const getSingleProjectSummary = async (projectId) => {
    const summaryMap = await getProjectSummaryMap([projectId]);
    return summaryMap.get(projectId.toString()) || createEmptySummary();
};

const getProjectOwnerId = (project) => project.userId?._id?.toString?.() || project.userId?.toString?.() || null;

const canAccessProject = (project, user) => {
    return user.role === "ADMIN" || getProjectOwnerId(project) === user._id.toString();
};

const withSummary = (project, summary) => ({
    ...project.toObject(),
    summary
});

export const createProject = async (req, res) => {
    try {
        const { name, description, color } = req.body;

        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ message: "Name is required" });
        }

        const userId = req.user._id;
        const existingProject = await Project.findByUserAndName(userId, name.trim());
        if (existingProject) {
            return res.status(400).json({ message: "Project name already exists for this user" });
        }

        const project = await Project.create({
            userId,
            name: name.trim(),
            description,
            color
        });

        res.status(201).json({
            message: "Project created successfully",
            project: withSummary(project, createEmptySummary())
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Project name already exists for this user" });
        }

        console.error("Error creating project:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getAllProjects = async (req, res) => {
    try {
        const query = req.user.role === "ADMIN" ? {} : { userId: req.user._id };
        const projects = await Project.find(query)
            .populate("userId", "name email")
            .sort({ createdAt: -1 });

        const summaryMap = await getProjectSummaryMap(projects.map((project) => project._id));

        res.status(200).json(
            projects.map((project) => withSummary(
                project,
                summaryMap.get(project._id.toString()) || createEmptySummary()
            ))
        );
    } catch (error) {
        console.error("Error getting all projects:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getProjectById = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await Project.findById(id).populate("userId", "name email");

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        if (!canAccessProject(project, req.user)) {
            return res.status(403).json({ message: "You don't have permission to access this project" });
        }

        const summary = await getSingleProjectSummary(project._id);
        res.status(200).json(withSummary(project, summary));
    } catch (error) {
        console.error("Error getting project by ID:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, color } = req.body;

        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        if (!canAccessProject(project, req.user)) {
            return res.status(403).json({ message: "You don't have permission to update this project" });
        }

        const update = {};
        if (name !== undefined) {
            if (typeof name !== "string" || !name.trim()) {
                return res.status(400).json({ message: "Project name cannot be empty" });
            }
            update.name = name.trim();
        }
        if (description !== undefined) update.description = description;
        if (color !== undefined) update.color = color;

        if (Object.keys(update).length === 0) {
            return res.status(400).json({ message: "No fields to update" });
        }

        const updatedProject = await Project.findByIdAndUpdate(
            id,
            { $set: update },
            { new: true, runValidators: true }
        ).populate("userId", "name email");

        const summary = await getSingleProjectSummary(updatedProject._id);
        res.status(200).json({
            message: "Project updated successfully",
            project: withSummary(updatedProject, summary)
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Project name already exists for this user" });
        }

        console.error("Error updating project:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const deleteProject = async (req, res) => {
    try {
        const { id } = req.params;

        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        if (!canAccessProject(project, req.user)) {
            return res.status(403).json({ message: "You don't have permission to delete this project" });
        }

        await Project.findByIdAndDelete(id);

        res.status(200).json({
            message: "Project deleted successfully. Related tasks were kept and unassigned from the project."
        });
    } catch (error) {
        console.error("Error deleting project:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getProjectTasks = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await Project.findById(id).populate("userId", "name email");

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        if (!canAccessProject(project, req.user)) {
            return res.status(403).json({ message: "You don't have permission to access this project" });
        }

        const tasks = await Task.find({ projectId: project._id })
            .populate({
                path: "categoryId",
                select: "name userId",
                populate: {
                    path: "userId",
                    select: "name email"
                }
            })
            .populate({
                path: "projectId",
                select: "name color description userId",
                populate: {
                    path: "userId",
                    select: "name email"
                }
            })
            .sort({ dueDate: 1, createdAt: -1 });

        const summary = await getSingleProjectSummary(project._id);

        res.status(200).json({
            project: withSummary(project, summary),
            summary,
            tasks
        });
    } catch (error) {
        console.error("Error getting project tasks:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};
