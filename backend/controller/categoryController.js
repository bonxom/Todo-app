import Category from "../model/Category.js";
import User from "../model/User.js";

export const createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Name is required" });
        }

        // Use authenticated user's ID
        const userId = req.user._id;

        // Check if category name already exists for this user
        const existingCategory = await Category.findByUserAndName(userId, name);
        if (existingCategory) {
            return res.status(400).json({ message: "Category name already exists for this user" });
        }

        const category = await Category.create({
            userId,
            name,
            description
        });

        // Add category to user's categories array
        await User.findByIdAndUpdate(
            userId,
            { $push: { categories: category._id } }
        );

        res.status(201).json({ message: "Category created successfully", category });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Category name already exists for this user" });
        }
        console.error("Error creating category:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const getAllCategories = async (req, res) => {
    try {
        const { role, _id } = req.user;
        // Users can only see their own categories, unless they are ADMIN
        const query = role === 'ADMIN' ? {} : { userId: _id };
        const categories = await Category.find(query).populate('userId', 'name email');
        
        res.status(200).json(categories);
    } catch (error) {
        console.error("Error getting all categories:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Category.findById(id).populate('userId', 'name email');

        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        // Check ownership (unless ADMIN)
        if (req.user.role !== 'ADMIN' && category.userId._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "You don't have permission to access this category" });
        }

        res.status(200).json(category);
    } catch (error) {
        console.error("Error getting category by ID:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        // Check ownership (unless ADMIN)
        if (req.user.role !== 'ADMIN' && category.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "You don't have permission to update this category" });
        }

        const update = {};
        if (name !== undefined) update.name = name;
        if (description !== undefined) update.description = description;

        const updatedCategory = await Category.findByIdAndUpdate(
            id, 
            {$set: update}, 
            { new: true }
        );

        res.status(200).json({ message: "Category updated successfully", category: updatedCategory });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Category name already exists" });
        }
        console.error("Error updating category:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        // Check ownership (unless ADMIN)
        if (req.user.role !== 'ADMIN' && category.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "You don't have permission to delete this category" });
        }

        // Remove category from user's categories array
        await User.findByIdAndUpdate(
            category.userId,
            { $pull: { categories: id } }
        );

        // Delete the category
        await Category.findByIdAndDelete(id);

        res.status(200).json({ message: "Category deleted successfully" });
    } catch (error) {
        console.error("Error deleting category:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }   
}