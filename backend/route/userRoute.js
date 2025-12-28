import express from 'express';
import { 
    createUser,  
    getAllUsers, 
    getUserById, 
    updateUser,
    deleteUser } 
from '../controller/userController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, authorize("ADMIN"), createUser);   
router.get('/', protect, authorize("ADMIN"), getAllUsers);
router.get('/:id', protect, authorize("ADMIN"), getUserById);
router.put('/:id', protect, authorize("ADMIN"), updateUser);
router.delete('/:id', protect, authorize("ADMIN"), deleteUser);

export default router;