import User from '../model/User.js';

export const createUser = async (req, res) => {
    try {
        const { email, password, name, dob, nationality, role } = req.body;

        if (!email || !password || !name || !dob || !nationality) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const user = await User.create({
            email,
            password,
            name,
            dob,
            nationality,
            role
        });

        res.status(201).json({ message: "User created successfully", user });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Email already exists" });
        }
        console.error("Error creating user:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .populate('categories', 'name description');
        res.status(200).json(users);
    } catch (error) {
        console.error("Error get all users:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id)
            .select('-password')
            .populate('categories', 'name description');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error("Error get user by ID:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const updateUser = async (req, res) => {
    try {
        const {id} = req.params;
        const { email, name, dob,  nationality } = req.body;

        const update = {}
        if (email !== undefined) update.email = email;
        if (name !== undefined) update.name = name;
        if (dob !== undefined) update.dob = dob;
        if (nationality !== undefined) update.nationality = nationality;

        if (Object.keys(update).length === 0) {
            return res.status(400).json({ message: "No fields to update" });
        }

        const user = await User.findByIdAndUpdate(
            id,
            {$set: update},
            { new: true, runValidators: true }
        ).select('-password'); // Exclude password

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }   
        res.status(200).json({ message: "User updated successfully", user });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Email already exists" });
        }
        console.error("Error update user:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const deleteUser = async (req, res) => {
    try {
        const {id} = req.params;

        const user = await User.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }   
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error delete user:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }   
}

export const uploadAvatar = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const avatarUrl = `/uploads/avatars/${req.file.filename}`;

        const user = await User.findByIdAndUpdate(
            id,
            { avatarUrl },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "Avatar uploaded successfully", avatarUrl });
    } catch (error) {
        console.error("Error uploading avatar:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}