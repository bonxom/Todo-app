import User from '../model/User.js';
import generateToken from '../utils/generateToken.js';

export const registerUser = async (req, res) => {
    try {
        const { email, password, name, dob, nationality } = req.body;

        if (!email || !password || !name || !dob) {
            return res.status(400).json({ message: "Email, password, name, and date of birth are required" });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists" });
        }

        // Create new user
        const user = await User.create({
            email,
            password,
            name,
            dob,
            nationality: nationality || 'Vietnam',
            role: 'USER'
        });

        const token = generateToken(user._id);

        // Exclude password from response
        user.password = undefined;

        res.status(201).json({ message: "Registration successful", user, token });
    } catch (error) {
        console.error("Error registering user:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const token = generateToken(user._id);

        // Exclude password from response
        user.password = undefined;

        res.status(200).json({ message: "Login successful", user, token });
    } catch (error) {
        console.error("Error logging in user:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const logoutUser = async (req, res) => {
    try {
        // Handle in client side by deleting token
        res.status(200).json({ message: "Logout successful" });
    } catch (error) {
        console.error("Error logging out user:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const getMe = async (req, res) => {
    try {
        const { id } = req.user;
        const user = await User
                        .findById(id)
                        .populate('categories', 'name description');
                        
        console.log('User found:', user);
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error("Error getting current user:", error.message);
        console.error("Full error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const changePassword = async (req, res) => {
    try { 
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.
                status(400).
                json({ message: "Current password and new password are required" });
        }

        const user = await User.findById(req.user._id).select('+password');
        if (!user) {
            return res
                .status(404)
                .json({ message: "User not found" });
        }
        
        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res
                .status(401)
                .json({ message: "Current password is incorrect" });
        }

        // Check if new password is different
        const isSamePassword = await user.comparePassword(newPassword);
        if (isSamePassword) {
            return res
                .status(400)
                .json({ message: "New password must be different from the current password" });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
        console.error("Error changing password:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const updateInfo = async (req, res) => {
    try {
        const { id } = req.user;
        const { email, name, dob, nationality, avatarUrl } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const update = {};
        if (email !== undefined) update.email = email;
        if (name !== undefined) update.name = name;
        if (dob !== undefined) update.dob = dob;
        if (nationality !== undefined) update.nationality = nationality;
        if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;

        if (Object.keys(update).length === 0) {
            return res.status(400).json({ message: "No fields to update" });
        }

        const updatedUser = await User.findByIdAndUpdate(
            id,
            { $set: update },
            { new: true, runValidators: true }
        ).select('-password'); // Exclude password
        
        res.status(200).json({ message: "User info updated successfully", user: updatedUser });
    } catch (error) {
        console.error("Error updating user info:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const selfDelete = async (req, res) => {
    try {
        const { id } = req.user;

        const user = await User.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}