import Task from '../model/Task.js';
import Category from '../model/Category.js';

export const createTask = async (req, res) => {
    try {
        const { title, description, status, priority, categoryId, startDate, dueDate } = req.body;

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

        const task = await Task.create({
            // userId,
            title,
            description,
            status,
            priority,
            categoryId: finalCategoryId,
            startDate,
            dueDate
        });

        res.status(201).json({ message: "Task created successfully", task });
    } catch (error) {
        console.error('Error creating task:', error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const getAllTasks = async (req, res) => {
    try {
        let query = {};
        
        // Users can only see their own tasks, unless they are ADMIN
        if (req.user.role !== 'ADMIN') {
            // Find all categories belonging to the user
            const userCategories = await Category.find({ userId: req.user._id });
            const categoryIds = userCategories.map(cat => cat._id);
            query = { categoryId: { $in: categoryIds } };
        }
        
        const tasks = await Task.find(query).populate({ 
            path: 'categoryId',
            select: 'name userId',
            populate: {
                path: 'userId',
                select: 'name email'
            }
        });
        
        res.status(200).json(tasks);
    } catch (error) {
        console.error('Error getting all tasks:', error.message);   
        res.status(500).json({ message: "Internal server error" });
    }
}

export const getTaskById = async (req, res) => {
    try {
        const { id } = req.params;
        const task = await Task.findById(id).populate({
            path: 'categoryId',
            select: 'name userId',
            populate: {
                path: 'userId',
                select: 'name email'
            }
        });
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // Check ownership (unless ADMIN)
        if (req.user.role !== 'ADMIN' && task.categoryId?.userId?._id.toString() !== req.user._id.toString()) {
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
        const { title, description, status, priority, categoryId, startDate, dueDate } = req.body;

        const task = await Task.findById(id).populate('categoryId', 'userId');
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // Check ownership (unless ADMIN)
        if (req.user.role !== 'ADMIN' && task.categoryId?.userId?.toString() !== req.user._id.toString()) {
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
        if (startDate !== undefined) update.startDate = startDate;
        if (dueDate !== undefined) update.dueDate = dueDate;

        if (Object.keys(update).length === 0) {
            return res.status(400).json({ message: "No fields to update" });
        }

        // const updatedTask = await Task.findByIdAndUpdate(
        //     id, 
        //     {$set: update},
        //     { new: true }
        // ).populate('categoryId', 'name').populate('userId', 'name email');
        const updatedTask = await Task.findByIdAndUpdate(
            id, 
            {$set: update},
            { new: true }
        ).populate({
            path: 'categoryId',
            select: 'name userId',
            populate: {
                path: 'userId',
                select: 'name email'
            }
        });

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

        const task = await Task.findById(id).populate('categoryId', 'userId');
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // Check ownership (unless ADMIN)
        if (req.user.role !== 'ADMIN' && task.categoryId?.userId?.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "You don't have permission to update this task" });
        }

        if (task.status !== 'in-progress') {
            return res.status(400).json({ message: "Only in-progress tasks can be finished" });
        }

        task.status = 'completed';
        task.completedAt = currentDate;
        task.isOverDue = task.dueDate && currentDate > task.dueDate;

        await task.save();

        res.status(200).json({ message: "Task marked as completed", task });
    } catch (error) {
        console.error('Error finishing task:', error.message);   
        res.status(500).json({ message: "Internal server error" });
    }
}

export const startTask = async (req, res) => {
    try {
        const { id } = req.params;

        const task = await Task.findById(id).populate('categoryId', 'userId');
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // Check ownership (unless ADMIN)
        if (req.user.role !== 'ADMIN' && task.categoryId?.userId?.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "You don't have permission to update this task" });
        }

        if (task.status !== 'pending') {
            return res.status(400).json({ message: "Only pending tasks can be started" });
        }

        task.status = 'in-progress';
        await task.save();

        res.status(200).json({ message: "Task started successfully", task });
    } catch (error) {
        console.error('Error starting task:', error.message);   
        res.status(500).json({ message: "Internal server error" });
    }
}

export const giveUpTask = async (req, res) => {
    try {
        const { id } = req.params;

        const task = await Task.findById(id).populate('categoryId', 'userId');
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // Check ownership (unless ADMIN)
        if (req.user.role !== 'ADMIN' && task.categoryId?.userId?.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "You don't have permission to update this task" });
        }

        if (task.status !== 'in-progress') {
            return res.status(400).json({ message: "Only in-progress tasks can be given up" });
        }

        task.status = 'given-up';
        await task.save();

        res.status(200).json({ message: "Task marked as given-up", task });
    } catch (error) {
        console.error('Error giving up task:', error.message);   
        res.status(500).json({ message: "Internal server error" });
    }
}

export const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        const task = await Task.findById(id).populate('categoryId', 'userId');

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // Check ownership (unless ADMIN)
        if (req.user.role !== 'ADMIN' && task.categoryId?.userId?.toString() !== req.user._id.toString()) {
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

        let baseQuery = {};
        // Users can only see their own tasks, unless they are ADMIN
        if (req.user.role !== 'ADMIN') {
            const userCategories = await Category.find({ userId: req.user._id });
            const categoryIds = userCategories.map(cat => cat._id);
            baseQuery = { categoryId: { $in: categoryIds } };
        }
        
        const tasks = await Task.find({
            ...baseQuery,
            dueDate: { $gte: startOfDay, $lt: endOfDay },
            status: { $nin: ['completed', 'given-up'] }
        }).populate({
            path: 'categoryId',
            select: 'name userId',
            populate: {
                path: 'userId',
                select: 'name email'
            }
        });

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

        let baseQuery = {};
        // Users can only see their own tasks, unless they are ADMIN
        if (req.user.role !== 'ADMIN') {
            const userCategories = await Category.find({ userId: req.user._id });
            const categoryIds = userCategories.map(cat => cat._id);
            baseQuery = { categoryId: { $in: categoryIds } };
        }
        const tasks = await Task.find({ ...baseQuery, status }).populate({
            path: 'categoryId',
            select: 'name userId',
            populate: {
                path: 'userId',
                select: 'name email'
            }
        });
        
        res.status(200).json(tasks);
    } catch (error) {
        console.error('Error getting tasks by status:', error.message);   
        res.status(500).json({ message: "Internal server error" });
    }
}

export const getTaskByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        
        let baseQuery = {};
        // Users can only see their own tasks, unless they are ADMIN
        if (req.user.role !== 'ADMIN') {
            const userCategories = await Category.find({ userId: req.user._id });
            const categoryIds = userCategories.map(cat => cat._id);
            baseQuery = { categoryId: { $in: categoryIds } };
        }
        const tasks = await Task.find({ ...baseQuery, categoryId }).populate({
            path: 'categoryId',
            select: 'name userId',
            populate: {
                path: 'userId',
                select: 'name email'
            }
        });
        
        res.status(200).json(tasks);
    } catch (error) {
        console.error('Error getting tasks by category:', error.message);   
        res.status(500).json({ message: "Internal server error" });
    }
}