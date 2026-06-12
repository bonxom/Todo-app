import Task from '../model/Task.js';
import Category from '../model/Category.js';
import Project from '../model/Project.js';
import { addCompletedTasks, addGivenUpTasks, addStartTask, addInProgressTask } from './statController.js';
import { normalizeTaskDateInput } from '../utils/dateTime.js';

const TASK_POPULATE = [
    {
        path: 'categoryId',
        select: 'name userId',
        populate: {
            path: 'userId',
            select: 'name email'
        }
    },
    {
        path: 'projectId',
        select: 'name description color userId',
        populate: {
            path: 'userId',
            select: 'name email'
        }
    }
];

const populateTaskQuery = (query) => {
    let populatedQuery = query;

    for (const populateConfig of TASK_POPULATE) {
        populatedQuery = populatedQuery.populate(populateConfig);
    }

    return populatedQuery;
};

const getTaskOwnerId = (task) => {
    const categoryOwnerId = task.categoryId?.userId?._id?.toString?.() || task.categoryId?.userId?.toString?.();
    if (categoryOwnerId) {
        return categoryOwnerId;
    }

    return task.projectId?.userId?._id?.toString?.() || task.projectId?.userId?.toString?.() || null;
};

const userOwnsTask = (task, user) => {
    if (user.role === 'ADMIN') {
        return true;
    }

    const ownerId = getTaskOwnerId(task);
    return ownerId === user._id.toString();
};

const buildTaskAccessQuery = async (user) => {
    if (user.role === 'ADMIN') {
        return {};
    }

    const [userCategories, userProjects] = await Promise.all([
        Category.find({ userId: user._id }).select('_id'),
        Project.find({ userId: user._id }).select('_id')
    ]);

    const ownershipClauses = [];
    if (userCategories.length > 0) {
        ownershipClauses.push({ categoryId: { $in: userCategories.map((category) => category._id) } });
    }
    if (userProjects.length > 0) {
        ownershipClauses.push({ projectId: { $in: userProjects.map((project) => project._id) } });
    }

    if (ownershipClauses.length === 0) {
        return { _id: { $in: [] } };
    }

    if (ownershipClauses.length === 1) {
        return ownershipClauses[0];
    }

    return { $or: ownershipClauses };
};

const resolveProjectUpdate = async (projectId, userId) => {
    if (projectId === undefined) {
        return { shouldUpdate: false };
    }

    if (projectId === '' || projectId === null) {
        return {
            shouldUpdate: true,
            value: null
        };
    }

    const project = await Project.findById(projectId);
    if (!project || project.userId.toString() !== userId.toString()) {
        return { error: 'Invalid projectId' };
    }

    return {
        shouldUpdate: true,
        value: project._id
    };
};

export const createTask = async (req, res) => {
    try {
        const { title, description, status, priority, categoryId, projectId, startDate, dueDate } = req.body;

        if (!title) {
            return res.status(400).json({ message: "Title is required" });
        }

        // Use authenticated user's ID
        const userId = req.user._id;

        let finalCategoryId = categoryId;

        //check category belongs to user if categoryId is provided
        if (categoryId) {
            const category = await Category.findById(categoryId);
            if (!category || category.userId.toString() !== userId.toString()) {
                return res.status(400).json({ message: "Invalid categoryId" });
            }
        } else {
            // If no categoryId provided, use Uncategorized
            const uncategorizedCategory = await Category.findOne({
                userId: userId,
                name: 'Uncategorized'
            });
            
            if (!uncategorizedCategory) {
                return res.status(400).json({ message: "Uncategorized category not found. Please contact support." });
            }
            
            finalCategoryId = uncategorizedCategory._id;
        }

        const projectUpdate = await resolveProjectUpdate(projectId, userId);
        if (projectUpdate.error) {
            return res.status(400).json({ message: projectUpdate.error });
        }

        const startDateUpdate = normalizeTaskDateInput(startDate);
        const dueDateUpdate = normalizeTaskDateInput(dueDate);

        if (startDateUpdate.error || dueDateUpdate.error) {
            return res.status(400).json({ message: startDateUpdate.error || dueDateUpdate.error });
        }

        const task = await Task.create({
            // userId,
            title,
            description,
            status: 'in-progress', 
            priority,
            categoryId: finalCategoryId,
            projectId: projectUpdate.shouldUpdate ? projectUpdate.value : null,
            startDate: startDateUpdate.shouldUpdate ? startDateUpdate.value : undefined,
            dueDate: dueDateUpdate.shouldUpdate ? dueDateUpdate.value : undefined
        });

        await task.populate(TASK_POPULATE);

        // Update stats: totalTasks +1, inProgressTasks +1
        await addInProgressTask(userId);

        res.status(201).json({ message: "Task created successfully", task });
    } catch (error) {
        console.error('Error creating task:', error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const getAllTasks = async (req, res) => {
    try {
        const query = await buildTaskAccessQuery(req.user);
        const tasks = await populateTaskQuery(Task.find(query));
        
        res.status(200).json(tasks);
    } catch (error) {
        console.error('Error getting all tasks:', error.message);   
        res.status(500).json({ message: "Internal server error" });
    }
}

export const getTaskById = async (req, res) => {
    try {
        const { id } = req.params;
        const task = await populateTaskQuery(Task.findById(id));
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        if (!userOwnsTask(task, req.user)) {
            return res.status(403).json({ message: "You don't have permission to access this task" });
        }
        
        res.status(200).json(task);
    } catch (error) {
        console.error('Error getting task by ID:', error.message);   
        res.status(500).json({ message: "Internal server error" });
    }
}

export const updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, status, priority, categoryId, projectId, startDate, dueDate } = req.body;

        const task = await populateTaskQuery(
            Task.findById(id)
        );
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        if (!userOwnsTask(task, req.user)) {
            return res.status(403).json({ message: "You don't have permission to update this task" });
        }

        const update = {};
        if (title !== undefined) update.title = title;
        if (description !== undefined) update.description = description;
        if (status !== undefined) update.status = status;
        if (priority !== undefined) update.priority = priority;
        if (categoryId !== undefined) {
            // If trying to set to null/empty, use Uncategorized instead
            if (categoryId === 'uncategorized' || categoryId === '' || categoryId === null) {
                const uncategorizedCategory = await Category.findOne({
                    userId: req.user._id,
                    name: 'Uncategorized'
                });
                
                if (!uncategorizedCategory) {
                    return res.status(400).json({ message: "Uncategorized category not found. Please contact support." });
                }
                
                update.categoryId = uncategorizedCategory._id;
            } else {
                // Verify the new category belongs to user
                const newCategory = await Category.findById(categoryId);
                if (!newCategory || newCategory.userId.toString() !== req.user._id.toString()) {
                    return res.status(400).json({ message: "Invalid categoryId" });
                }
                update.categoryId = categoryId;
            }
        }
        const projectUpdate = await resolveProjectUpdate(projectId, req.user._id);
        if (projectUpdate.error) {
            return res.status(400).json({ message: projectUpdate.error });
        }
        if (projectUpdate.shouldUpdate) {
            update.projectId = projectUpdate.value;
        }
        const startDateUpdate = normalizeTaskDateInput(startDate);
        const dueDateUpdate = normalizeTaskDateInput(dueDate);

        if (startDateUpdate.error || dueDateUpdate.error) {
            return res.status(400).json({ message: startDateUpdate.error || dueDateUpdate.error });
        }

        if (startDateUpdate.shouldUpdate) update.startDate = startDateUpdate.value;
        if (dueDateUpdate.shouldUpdate) update.dueDate = dueDateUpdate.value;

        if (Object.keys(update).length === 0) {
            return res.status(400).json({ message: "No fields to update" });
        }

        // const updatedTask = await Task.findByIdAndUpdate(
        //     id, 
        //     {$set: update},
        //     { new: true }
        // ).populate('categoryId', 'name').populate('userId', 'name email');
        const updatedTask = await populateTaskQuery(Task.findByIdAndUpdate(
            id, 
            {$set: update},
            { new: true }
        ));

        res.status(200).json({ message: "Task updated successfully", task: updatedTask });
    } catch (error) {
        console.error('Error updating task:', error.message);   
        res.status(500).json({ message: "Internal server error" });
    }
}

export const finishTask = async (req, res) => {
    try {
        const { id } = req.params;
        const currentDate = new Date();

        const task = await populateTaskQuery(Task.findById(id));
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        if (!userOwnsTask(task, req.user)) {
            return res.status(403).json({ message: "You don't have permission to update this task" });
        }

        if (task.status !== 'in-progress') {
            return res.status(400).json({ message: "Only in-progress tasks can be finished" });
        }

        task.status = 'completed';
        task.completedAt = currentDate;
        task.isOverDue = task.dueDate && currentDate > task.dueDate;

        await task.save();

        const categoryName = task.categoryId?.name || (await Category.findById(task.categoryId?._id))?.name;
        
        // Update stats: completedTasks +1, dailyStats, inProgressTasks -1
        if (task.categoryId?._id && categoryName) {
            await addCompletedTasks(req.user._id, task.categoryId._id, categoryName);
        }

        res.status(200).json({ message: "Task marked as completed", task });
    } catch (error) {
        console.error('Error finishing task:', error.message);   
        res.status(500).json({ message: "Internal server error" });
    }
}

export const startTask = async (req, res) => {
    try {
        const { id } = req.params;

        const task = await populateTaskQuery(Task.findById(id));
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        if (!userOwnsTask(task, req.user)) {
            return res.status(403).json({ message: "You don't have permission to update this task" });
        }

        if (task.status !== 'pending') {
            return res.status(400).json({ message: "Only pending tasks can be started" });
        }

        task.status = 'in-progress';
        await task.save();

        // Update stats: pendingTasks -1, inProgressTasks +1
        await addStartTask(req.user._id);

        res.status(200).json({ message: "Task started successfully", task });
    } catch (error) {
        console.error('Error starting task:', error.message);   
        res.status(500).json({ message: "Internal server error" });
    }
}

export const giveUpTask = async (req, res) => {
    try {
        const { id } = req.params;

        const task = await populateTaskQuery(Task.findById(id));
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        if (!userOwnsTask(task, req.user)) {
            return res.status(403).json({ message: "You don't have permission to update this task" });
        }

        if (task.status !== 'in-progress') {
            return res.status(400).json({ message: "Only in-progress tasks can be given up" });
        }

        task.status = 'given-up';
        await task.save();

        const categoryName = task.categoryId?.name || (await Category.findById(task.categoryId?._id))?.name;
        
        // Update stats: givenUpTasks +1, dailyStats, inProgressTasks -1
        if (task.categoryId?._id && categoryName) {
            await addGivenUpTasks(req.user._id, task.categoryId._id, categoryName);
        }

        res.status(200).json({ message: "Task marked as given-up", task });
    } catch (error) {
        console.error('Error giving up task:', error.message);   
        res.status(500).json({ message: "Internal server error" });
    }
}

export const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        const task = await populateTaskQuery(Task.findById(id));

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        if (!userOwnsTask(task, req.user)) {
            return res.status(403).json({ message: "You don't have permission to delete this task" });
        }

        await Task.findByIdAndDelete(id);
        res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
        console.error('Error deleting task:', error.message);   
        res.status(500).json({ message: "Internal server error" });
    }
}

export const getTodayDeadlines = async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setDate(endOfDay.getDate() + 1);
        endOfDay.setHours(23, 59, 59, 999);

        const baseQuery = await buildTaskAccessQuery(req.user);
        
        const tasks = await populateTaskQuery(Task.find({
            ...baseQuery,
            dueDate: { $gte: startOfDay, $lt: endOfDay },
            status: { $nin: ['completed', 'given-up'] }
        }));

        res.status(200).json(tasks);
    } catch (error) {
        console.error('Error getting today\'s deadlines:', error.message);   
        res.status(500).json({ message: "Internal server error" });
    }
}

export const getTaskByStatus = async (req, res) => {
    try {
        const { status } = req.params;
        const validStatuses = ['pending', 'in-progress', 'completed', 'given-up'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const baseQuery = await buildTaskAccessQuery(req.user);
        const tasks = await populateTaskQuery(Task.find({ ...baseQuery, status }));
        
        res.status(200).json(tasks);
    } catch (error) {
        console.error('Error getting tasks by status:', error.message);   
        res.status(500).json({ message: "Internal server error" });
    }
}

export const getTaskByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        
        const baseQuery = await buildTaskAccessQuery(req.user);
        const tasks = await populateTaskQuery(Task.find({ ...baseQuery, categoryId }));
        
        res.status(200).json(tasks);
    } catch (error) {
        console.error('Error getting tasks by category:', error.message);   
        res.status(500).json({ message: "Internal server error" });
    }
}
