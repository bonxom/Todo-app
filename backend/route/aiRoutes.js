import { generateTasks } from "../controller/aiController.js";
import { protect, authorize } from '../middleware/auth.js';
import express from 'express';

const router = express.Router();

router.post("/", protect, generateTasks);

export default router;