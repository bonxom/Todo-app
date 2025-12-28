import jwt from 'jsonwebtoken';
import User from '../model/User.js';

// Auth for user
export const protect = async (req, res, next) => {
    let token;
    
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
            req.user = await User.findById(decoded.id).select('-password');
                        
            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            return next();
        } catch (error) {
            console.error('Error in auth middleware:', error.message);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: "Cannot find the token" });
    }
}

// Auth for role
export const authorize = (...roles) => {
    return (req, res, next) => {
        
        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const { role } = req.user;

        if (!roles.includes(role)) {
            return res
                .status(403)
                .json({ message: `User role '${role}' is not authorized to access this route` });
        }
        next();
    }
}