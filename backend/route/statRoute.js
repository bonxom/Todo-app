import express from 'express';
import { getStats } from '../controller/statController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getStats);

export default router;